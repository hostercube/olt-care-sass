import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
];

interface Props {
  children: React.ReactNode;
}

export default function CustomDomainRouter({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [hasLandingPage, setHasLandingPage] = useState(false);

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
          .select('slug, landing_page_enabled')
          .eq('id', domainData.tenant_id)
          .single();

        if (tenantData && tenantData.slug) {
          setTenantSlug(tenantData.slug);
          setHasLandingPage(tenantData.landing_page_enabled === true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Custom domain detection error:', err);
        setLoading(false);
      }
    };

    detectCustomDomain();
  }, []);

  // Show loading while detecting custom domain
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If custom domain detected, redirect to appropriate tenant page
  if (tenantSlug) {
    // Check if we're on the root path
    if (window.location.pathname === '/' || window.location.pathname === '') {
      if (hasLandingPage) {
        return <Navigate to={`/p/${tenantSlug}`} replace />;
      } else {
        return <Navigate to={`/t/${tenantSlug}`} replace />;
      }
    }
  }

  // Not a custom domain or already on a specific path - render children
  return <>{children}</>;
}
