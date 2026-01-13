import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wifi } from 'lucide-react';

// List of known platform domains that should NOT trigger custom domain detection
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
  slug: string;
  landing_page_enabled: boolean;
  company_name: string;
  logo_url: string | null;
}

export default function CustomDomainRouter({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const detectCustomDomain = async () => {
      try {
        const hostname = window.location.hostname.toLowerCase();
        
        // Check if this is a platform domain - skip detection
        const isPlatformDomain = PLATFORM_DOMAINS.some(domain => 
          hostname.includes(domain) || hostname === domain
        );

        if (isPlatformDomain) {
          setLoading(false);
          return;
        }

        // This might be a custom domain - check the database
        const { data: domainData, error: domainError } = await supabase
          .from('tenant_custom_domains')
          .select('tenant_id, domain, is_verified')
          .eq('domain', hostname)
          .eq('is_verified', true)
          .maybeSingle();

        if (domainError || !domainData || !domainData.is_verified) {
          setLoading(false);
          return;
        }

        // Found a verified custom domain - get tenant details
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('slug, landing_page_enabled, company_name, logo_url')
          .eq('id', domainData.tenant_id)
          .single();

        if (tenantData && tenantData.slug) {
          setTenantInfo({
            slug: tenantData.slug,
            landing_page_enabled: tenantData.landing_page_enabled === true,
            company_name: tenantData.company_name || 'Loading...',
            logo_url: tenantData.logo_url,
          });

          // Determine redirect based on current path
          const currentPath = window.location.pathname;
          
          if (currentPath === '/' || currentPath === '') {
            // Root path - redirect to landing page or login
            if (tenantData.landing_page_enabled) {
              setRedirectPath(`/p/${tenantData.slug}`);
            } else {
              setRedirectPath(`/t/${tenantData.slug}`);
            }
          } else if (currentPath === '/login' || currentPath === '/t') {
            // Login path - redirect to tenant login
            setRedirectPath(`/t/${tenantData.slug}`);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Custom domain detection error:', err);
        setLoading(false);
      }
    };

    detectCustomDomain();
  }, [location.pathname]);

  // Handle redirect
  useEffect(() => {
    if (redirectPath && !loading) {
      navigate(redirectPath, { replace: true });
    }
  }, [redirectPath, loading, navigate]);

  // Show loading while detecting custom domain
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="text-center">
          {tenantInfo?.logo_url ? (
            <img 
              src={tenantInfo.logo_url} 
              alt="Logo" 
              className="h-16 w-auto mx-auto mb-4 animate-pulse" 
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Wifi className="h-8 w-8 text-white" />
            </div>
          )}
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-white/70 text-sm">
            {tenantInfo?.company_name || 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If we have a redirect path, show loading while navigating
  if (redirectPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-white/70 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Not a custom domain or already on a specific path - render children
  return <>{children}</>;
}
