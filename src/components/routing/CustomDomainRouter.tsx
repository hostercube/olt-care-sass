import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
 * Architecture:
 * 1. Request comes to any domain
 * 2. Router reads Host header (hostname)
 * 3. Queries DB: SELECT * FROM tenant_custom_domains WHERE domain = hostname AND is_verified = true
 * 4. If found → load tenant landing/login page
 * 5. If not found → show default page or error
 */

// Platform domains where the main SaaS runs (never trigger custom domain detection)
const PLATFORM_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovableproject.com',
  'lovable.dev',
  'preview--',
  'gptengineer.app',
  'oltapp.isppoint.com',
  'webcontainer.io',
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
    return PLATFORM_DOMAINS.some(domain => 
      hostname.includes(domain) || hostname === domain
    );
  }, [hostname]);

  useEffect(() => {
    // If platform domain, skip detection immediately
    if (isPlatform) {
      setState('platform');
      return;
    }

    const detectAndRoute = async () => {
      try {
        // Normalize hostname variations (with/without www)
        const hostnameWithoutWww = hostname.replace(/^www\./, '');
        const hostnameWithWww = hostname.startsWith('www.') ? hostname : `www.${hostname}`;

        // Query for verified domain that matches the hostname
        // This supports multiple domains per tenant - any can be used
        const { data: domainData, error: domainError } = await supabase
          .from('tenant_custom_domains')
          .select('tenant_id, domain, subdomain, is_verified')
          .eq('is_verified', true)
          .or(`domain.eq.${hostname},domain.eq.${hostnameWithoutWww},domain.eq.${hostnameWithWww}`)
          .limit(1)
          .maybeSingle();

        if (domainError) {
          console.error('Custom domain DB error:', domainError);
          setState('error');
          setErrorMessage('Database connection failed');
          return;
        }

        if (!domainData) {
          // Domain not registered in our system
          setState('not_found');
          return;
        }

        // Found verified domain - get tenant details
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, slug, company_name, logo_url, landing_page_enabled, status')
          .eq('id', domainData.tenant_id)
          .single();

        if (tenantError || !tenantData) {
          console.error('Tenant lookup error:', tenantError);
          setState('error');
          setErrorMessage('Tenant configuration not found');
          return;
        }

        // Check tenant status
        if (tenantData.status !== 'active' && tenantData.status !== 'trial') {
          setState('error');
          setErrorMessage('This ISP account is currently suspended');
          return;
        }

        // Success! We have a valid tenant
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

  // Handle navigation for custom domains
  useEffect(() => {
    if (state !== 'custom_domain' || !tenant) return;

    const currentPath = location.pathname;
    
    // Determine where to redirect based on current path
    // Custom domain should act as an alias to the tenant's pages
    if (currentPath === '/' || currentPath === '') {
      // Root path - show landing page or login
      if (tenant.landing_page_enabled && tenant.slug) {
        navigate(`/p/${tenant.slug}`, { replace: true });
      } else if (tenant.slug) {
        navigate(`/t/${tenant.slug}`, { replace: true });
      }
    } else if (currentPath === '/login' || currentPath === '/t' || currentPath === '/auth') {
      // Login paths - redirect to tenant login
      if (tenant.slug) {
        navigate(`/t/${tenant.slug}`, { replace: true });
      }
    }
    // For other paths like /p/slug, /t/slug, /customer, etc. - let them through
    // The custom domain effectively becomes an alias
  }, [state, tenant, location.pathname, navigate]);

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
      // Platform domain - render children normally
      return <>{children}</>;

    case 'custom_domain':
      // Custom domain detected and tenant found
      // Show loading while navigating
      if (location.pathname === '/' || location.pathname === '') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
            <div className="text-center">
              {tenant?.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.company_name} 
                  className="h-16 w-auto mx-auto mb-4 animate-pulse" 
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Wifi className="h-8 w-8 text-white" />
                </div>
              )}
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-3" />
              <p className="text-white/70 text-sm">{tenant?.company_name || 'Loading...'}</p>
            </div>
          </div>
        );
      }
      // Already on a specific path - render children
      return <>{children}</>;

    case 'not_found':
      // Domain not registered in our system
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
