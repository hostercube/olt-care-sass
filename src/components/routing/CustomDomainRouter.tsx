import { useEffect, useState, useMemo, createContext, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchJsonSafe, normalizePollingServerUrl } from '@/lib/polling-server';
import { Loader2, Wifi, AlertCircle } from 'lucide-react';

/**
 * Enterprise-grade Custom Domain Router
 * 
 * This implements the SaaS white-label custom domain pattern:
 * - Single Nginx catch-all config (server_name _;)
 * - Backend resolves tenant dynamically from Host header
 * - Each tenant can have multiple custom domains
 * - No per-domain Nginx/SSL configuration needed
 * 
 * KEY FEATURE: Clean URLs
 * - Custom domain root (/) shows landing page WITHOUT redirecting to /p/slug
 * - URL stays clean, content is rendered directly
 */

// Platform domains where the main SaaS runs (never trigger custom domain detection)
const PLATFORM_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovableproject.com',
  'lovable.dev',
  'gptengineer.app',
  'webcontainer.io',
];

// Specific platform subdomains that should NOT trigger custom domain detection
const PLATFORM_EXACT_HOSTS = [
  'oltapp.isppoint.com',
  'www.oltapp.isppoint.com',
];

interface Props {
  children: React.ReactNode;
}

interface TenantInfo {
  id: string;
  slug: string;
  company_name: string;
  logo_url: string | null;
  landing_page_enabled: boolean;
  status: string;
}

type DetectionState = 'loading' | 'platform' | 'custom_domain' | 'not_found' | 'error';

// Context to share custom domain tenant info with child components
interface CustomDomainContextValue {
  isCustomDomain: boolean;
  tenant: TenantInfo | null;
  effectiveSlug: string | null;
}

const CustomDomainContext = createContext<CustomDomainContextValue>({
  isCustomDomain: false,
  tenant: null,
  effectiveSlug: null,
});

export const useCustomDomainContext = () => useContext(CustomDomainContext);

export default function CustomDomainRouter({ children }: Props) {
  const [state, setState] = useState<DetectionState>('loading');
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get hostname once
  const hostname = useMemo(() => {
    return window.location.hostname.toLowerCase().trim();
  }, []);

  // Check if platform domain
  const isPlatform = useMemo(() => {
    if (PLATFORM_EXACT_HOSTS.includes(hostname)) return true;
    return PLATFORM_DOMAINS.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`) ||
      hostname.includes('preview--')
    );
  }, [hostname]);

  useEffect(() => {
    if (isPlatform) {
      setState('platform');
      return;
    }

    const detectAndRoute = async () => {
      try {
        const hostnameWithoutWww = hostname.replace(/^www\./, '');
        const candidates = Array.from(
          new Set([hostname, hostnameWithoutWww, `www.${hostnameWithoutWww}`])
        );

        console.log('[CustomDomainRouter] Checking hostname:', hostname);

        // 1) Primary: direct database lookup
        let domainData: any | null = null;

        const { data: directMatch, error: directErr } = await supabase
          .from('tenant_custom_domains')
          .select('tenant_id, domain, subdomain, is_verified, ssl_status, ssl_provisioning_status')
          .in('domain', candidates)
          .limit(1)
          .maybeSingle();

        if (!directErr && directMatch) {
          domainData = directMatch;
          console.log('[CustomDomainRouter] Found domain match:', directMatch);
        } else if (directErr) {
          console.warn('[CustomDomainRouter] Domain lookup error (direct):', directErr);
        }

        // 2) Subdomain pattern check
        if (!domainData) {
          const parts = hostnameWithoutWww.split('.').filter(Boolean);
          if (parts.length >= 3) {
            const sub = parts[0];
            const root = parts.slice(1).join('.');
            const { data: subdomainMatch, error: subdomainErr } = await supabase
              .from('tenant_custom_domains')
              .select('tenant_id, domain, subdomain, is_verified, ssl_status, ssl_provisioning_status')
              .eq('domain', root)
              .eq('subdomain', sub)
              .limit(1)
              .maybeSingle();

            if (!subdomainErr && subdomainMatch) {
              domainData = subdomainMatch;
              console.log('[CustomDomainRouter] Found subdomain match:', subdomainMatch);
            }
          }
        }

        // 3) Fallback: resolve via backend API
        if (!domainData) {
          const candidateBases = [
            normalizePollingServerUrl(`${window.location.origin}/olt-polling-server`),
            normalizePollingServerUrl(import.meta.env.VITE_POLLING_SERVER_URL || ''),
            normalizePollingServerUrl(import.meta.env.VITE_VPS_URL || ''),
          ].filter(Boolean);

          for (const base of candidateBases) {
            const { ok, data } = await fetchJsonSafe<any>(
              `${base}/api/domains/resolve?host=${encodeURIComponent(hostname)}`,
              undefined,
              8000
            );

            if (ok && data?.found && data?.domain?.tenant_id) {
              domainData = data.domain;
              if (data.tenant) {
                const tenantData = data.tenant as any;
                if (tenantData.status !== 'active' && tenantData.status !== 'trial') {
                  setState('error');
                  setErrorMessage('This ISP account is currently suspended');
                  return;
                }

                setTenant({
                  id: tenantData.id,
                  slug: tenantData.slug,
                  company_name: tenantData.company_name || 'ISP Portal',
                  logo_url: tenantData.logo_url,
                  landing_page_enabled: tenantData.landing_page_enabled === true,
                  status: tenantData.status,
                });
                setState('custom_domain');
                return;
              }
              break;
            }
          }
        }

        if (!domainData) {
          console.log('[CustomDomainRouter] Domain not found in database:', hostname);
          setState('not_found');
          return;
        }

        // Found domain - get tenant details
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, slug, company_name, logo_url, landing_page_enabled, status')
          .eq('id', domainData.tenant_id)
          .maybeSingle();

        if (tenantError || !tenantData) {
          console.error('Tenant lookup error:', tenantError);
          setState('error');
          setErrorMessage('Tenant configuration not found');
          return;
        }

        if (tenantData.status !== 'active' && tenantData.status !== 'trial') {
          setState('error');
          setErrorMessage('This ISP account is currently suspended');
          return;
        }

        setTenant({
          id: tenantData.id,
          slug: tenantData.slug,
          company_name: tenantData.company_name || 'ISP Portal',
          logo_url: tenantData.logo_url,
          landing_page_enabled: tenantData.landing_page_enabled === true,
          status: tenantData.status,
        });
        setState('custom_domain');
      } catch (err) {
        console.error('Custom domain detection error:', err);
        setState('error');
        setErrorMessage('An unexpected error occurred');
      }
    };

    detectAndRoute();
  }, [hostname, isPlatform]);

  // IMPORTANT: For custom domains, DO NOT redirect - handle path mapping internally
  // This keeps the URL clean (no /p/slug visible in browser)
  useEffect(() => {
    if (state !== 'custom_domain' || !tenant) return;

    const currentPath = location.pathname;
    
    // For custom domains:
    // - Root path (/) → internally render landing page (no redirect, URL stays as /)
    // - /login → internally render tenant login (no redirect)
    // - /customer/* paths → let them through for customer portal
    // - Other paths like /p/slug, /t/slug → let them work but clean up if coming from custom domain
    
    // Only redirect if user explicitly goes to /t or /p paths that don't match
    // Otherwise, let the path passthrough and handle via context
    
    if (currentPath.startsWith('/t/') || currentPath.startsWith('/p/')) {
      // If they're on /p/some-other-slug, redirect to clean URL
      const pathSlug = currentPath.split('/')[2];
      if (pathSlug && pathSlug !== tenant.slug) {
        // Different tenant slug in URL - this shouldn't happen on custom domain
        // Could be a navigation issue, let it pass
      }
      // If same slug, replace with clean path
      if (pathSlug === tenant.slug) {
        if (currentPath.startsWith('/p/')) {
          // Replace /p/slug with / to keep URL clean
          navigate('/', { replace: true });
        } else if (currentPath.startsWith('/t/')) {
          // Replace /t/slug with /login
          navigate('/login', { replace: true });
        }
      }
    }
  }, [state, tenant, location.pathname, navigate]);

  // Compute effective slug for context
  const effectiveSlug = useMemo(() => {
    if (state === 'custom_domain' && tenant) {
      return tenant.slug;
    }
    return null;
  }, [state, tenant]);

  // Context value for children
  const contextValue: CustomDomainContextValue = {
    isCustomDomain: state === 'custom_domain',
    tenant,
    effectiveSlug,
  };

  // Render based on state
  switch (state) {
    case 'loading':
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Wifi className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-3" />
            <p className="text-white/70 text-sm">Loading...</p>
          </div>
        </div>
      );

    case 'platform':
      return <>{children}</>;

    case 'custom_domain':
      // Provide context and render children - let App.tsx routes handle content
      // But for root path, we need to inject the tenant slug so TenantLanding can load
      return (
        <CustomDomainContext.Provider value={contextValue}>
          {children}
        </CustomDomainContext.Provider>
      );

    case 'not_found':
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-4">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Domain Not Configured</h1>
            <p className="text-white/70 mb-6">
              The domain <span className="text-cyan-400 font-mono">{hostname}</span> is not linked to any ISP account.
            </p>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-left">
              <p className="text-sm text-white/60 mb-2">If you own this domain:</p>
              <ol className="text-sm text-white/50 list-decimal pl-4 space-y-1">
                <li>Go to your ISP dashboard</li>
                <li>Navigate to Website → Custom Domain</li>
                <li>Add this domain and complete verification</li>
              </ol>
            </div>
          </div>
        </div>
      );

    case 'error':
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-4">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Service Unavailable</h1>
            <p className="text-white/70 mb-4">
              {errorMessage || 'Unable to load this page. Please try again later.'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );

    default:
      return <>{children}</>;
  }
}
