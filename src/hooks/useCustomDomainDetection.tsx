import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TenantData {
  id: string;
  slug: string;
  company_name: string;
  logo_url: string | null;
  landing_page_enabled: boolean;
  status: string;
}

interface CustomDomainResult {
  isCustomDomain: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  tenant: TenantData | null;
  loading: boolean;
  error: string | null;
}

// List of known platform domains that should NOT trigger custom domain detection
// These are the domains where the main SaaS platform runs
const PLATFORM_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovableproject.com',
  'lovable.dev',
  'preview--',
  'gptengineer.app',
  'oltapp.isppoint.com', // Main platform domain
  'webcontainer.io',
];

/**
 * Enterprise-grade dynamic host-based tenant resolution hook
 * 
 * This implements the SaaS white-label custom domain pattern used by 
 * Shopify, Vercel, Netlify, etc.
 * 
 * Architecture:
 * - Single Nginx catch-all config (server_name _;)
 * - Backend resolves tenant dynamically from Host header
 * - Each tenant can have multiple custom domains
 * - No per-domain Nginx/SSL configuration needed
 */
export function useCustomDomainDetection(): CustomDomainResult {
  const [result, setResult] = useState<CustomDomainResult>({
    isCustomDomain: false,
    tenantId: null,
    tenantSlug: null,
    tenant: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const detectCustomDomain = async () => {
      try {
        // Get the Host header value (hostname from browser)
        const hostname = window.location.hostname.toLowerCase().trim();
        
        // Also check with/without www prefix
        const hostnameWithoutWww = hostname.replace(/^www\./, '');
        const hostnameWithWww = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
        
        // Check if this is a platform domain - skip detection
        const isPlatformDomain = PLATFORM_DOMAINS.some(domain => 
          hostname.includes(domain) || hostname === domain
        );

        if (isPlatformDomain) {
          setResult({
            isCustomDomain: false,
            tenantId: null,
            tenantSlug: null,
            tenant: null,
            loading: false,
            error: null,
          });
          return;
        }

        // This is a potential custom domain - check the database
        // Query for any verified domain that matches the hostname
        // This supports multiple domains per tenant
        const { data: domainData, error: domainError } = await supabase
          .from('tenant_custom_domains')
          .select(`
            tenant_id,
            domain,
            subdomain,
            is_verified
          `)
          .eq('is_verified', true)
          .or(`domain.eq.${hostname},domain.eq.${hostnameWithoutWww},domain.eq.${hostnameWithWww}`)
          .limit(1)
          .maybeSingle();

        if (domainError) {
          console.error('Custom domain lookup error:', domainError);
          setResult({
            isCustomDomain: false,
            tenantId: null,
            tenantSlug: null,
            tenant: null,
            loading: false,
            error: 'Failed to check custom domain',
          });
          return;
        }

        if (domainData && domainData.is_verified) {
          // Found a verified custom domain - get full tenant details
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('id, slug, company_name, logo_url, landing_page_enabled, status')
            .eq('id', domainData.tenant_id)
            .single();

          if (tenantError) {
            console.error('Tenant lookup error:', tenantError);
            setResult({
              isCustomDomain: false,
              tenantId: null,
              tenantSlug: null,
              tenant: null,
              loading: false,
              error: 'Tenant not found',
            });
            return;
          }

          if (tenantData && tenantData.status === 'active') {
            setResult({
              isCustomDomain: true,
              tenantId: tenantData.id,
              tenantSlug: tenantData.slug,
              tenant: {
                id: tenantData.id,
                slug: tenantData.slug,
                company_name: tenantData.company_name || 'ISP Portal',
                logo_url: tenantData.logo_url,
                landing_page_enabled: tenantData.landing_page_enabled === true,
                status: tenantData.status,
              },
              loading: false,
              error: null,
            });
            return;
          }

          // Tenant exists but not active
          setResult({
            isCustomDomain: true,
            tenantId: domainData.tenant_id,
            tenantSlug: null,
            tenant: null,
            loading: false,
            error: 'Domain linked to inactive tenant',
          });
          return;
        }

        // Not a registered custom domain
        setResult({
          isCustomDomain: false,
          tenantId: null,
          tenantSlug: null,
          tenant: null,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Custom domain detection error:', err);
        setResult({
          isCustomDomain: false,
          tenantId: null,
          tenantSlug: null,
          tenant: null,
          loading: false,
          error: 'Detection failed',
        });
      }
    };

    detectCustomDomain();
  }, []);

  return result;
}

/**
 * Utility function to check if current hostname is a platform domain
 */
export function isPlatformDomain(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return PLATFORM_DOMAINS.some(domain => 
    hostname.includes(domain) || hostname === domain
  );
}

/**
 * Get the current hostname for display
 */
export function getCurrentHostname(): string {
  return window.location.hostname.toLowerCase();
}
