import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomDomainResult {
  isCustomDomain: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  loading: boolean;
  error: string | null;
}

// List of known platform domains that should NOT trigger custom domain detection
const PLATFORM_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovableproject.com',
  'lovable.dev',
  'preview--',
  'gptengineer.app',
  'oltapp.isppoint.com', // Main platform domain
];

export function useCustomDomainDetection(): CustomDomainResult {
  const [result, setResult] = useState<CustomDomainResult>({
    isCustomDomain: false,
    tenantId: null,
    tenantSlug: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const detectCustomDomain = async () => {
      try {
        const hostname = window.location.hostname.toLowerCase();
        
        // Check if this is a platform domain - skip detection
        const isPlatformDomain = PLATFORM_DOMAINS.some(domain => 
          hostname.includes(domain) || hostname === domain
        );

        if (isPlatformDomain) {
          setResult({
            isCustomDomain: false,
            tenantId: null,
            tenantSlug: null,
            loading: false,
            error: null,
          });
          return;
        }

        // This might be a custom domain - check the database
        const { data: domainData, error: domainError } = await supabase
          .from('tenant_custom_domains')
          .select('tenant_id, domain, is_verified')
          .eq('domain', hostname)
          .eq('is_verified', true)
          .maybeSingle();

        if (domainError) {
          console.error('Custom domain lookup error:', domainError);
          setResult({
            isCustomDomain: false,
            tenantId: null,
            tenantSlug: null,
            loading: false,
            error: 'Failed to check custom domain',
          });
          return;
        }

        if (domainData && domainData.is_verified) {
          // Found a verified custom domain - get tenant slug
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('slug, landing_page_enabled')
            .eq('id', domainData.tenant_id)
            .single();

          if (tenantData) {
            setResult({
              isCustomDomain: true,
              tenantId: domainData.tenant_id,
              tenantSlug: tenantData.slug,
              loading: false,
              error: null,
            });
            return;
          }
        }

        // Not a custom domain
        setResult({
          isCustomDomain: false,
          tenantId: null,
          tenantSlug: null,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Custom domain detection error:', err);
        setResult({
          isCustomDomain: false,
          tenantId: null,
          tenantSlug: null,
          loading: false,
          error: 'Detection failed',
        });
      }
    };

    detectCustomDomain();
  }, []);

  return result;
}
