import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { TenantFeatures, ModuleName } from '@/types/saas';

interface ModuleAccessResult {
  hasAccess: (module: ModuleName) => boolean;
  features: TenantFeatures;
  loading: boolean;
  isActive: boolean;
  maxOlts: number;
  maxUsers: number;
}

export function useModuleAccess(): ModuleAccessResult {
  const { tenantId, tenant, loading: tenantLoading } = useTenantContext();
  const [features, setFeatures] = useState<TenantFeatures>({});
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [maxOlts, setMaxOlts] = useState(1);
  const [maxUsers, setMaxUsers] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionFeatures = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      // Get active subscription with package details
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          packages:package_id (
            features,
            max_olts,
            max_users,
            max_onus
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        // Fall back to tenant features
        if (tenant) {
          setFeatures((tenant.features as TenantFeatures) || {});
          setMaxOlts(tenant.max_olts || 1);
          setMaxUsers(tenant.max_users || 1);
        }
        return;
      }

      if (subscription && subscription.packages) {
        const pkg = subscription.packages as any;
        setFeatures((pkg.features as TenantFeatures) || {});
        setMaxOlts(pkg.max_olts || 1);
        setMaxUsers(pkg.max_users || 1);
        setSubscriptionActive(true);
      } else if (tenant) {
        // No active subscription, use tenant defaults (trial mode)
        setFeatures((tenant.features as TenantFeatures) || {});
        setMaxOlts(tenant.max_olts || 1);
        setMaxUsers(tenant.max_users || 1);
        setSubscriptionActive(tenant.status === 'trial' || tenant.status === 'active');
      }
    } catch (error) {
      console.error('Error checking module access:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenant]);

  useEffect(() => {
    if (!tenantLoading) {
      fetchSubscriptionFeatures();
    }
  }, [tenantLoading, fetchSubscriptionFeatures]);

  const hasAccess = useCallback((module: ModuleName): boolean => {
    // OLT Care is always enabled for all tenants
    if (module === 'olt_care') {
      return true;
    }

    // Super admins have access to everything
    // Note: This is checked at a higher level, but we ensure modules are accessible
    
    // Check if the feature is enabled in the subscription/package
    return features[module] === true;
  }, [features]);

  return {
    hasAccess,
    features,
    loading: loading || tenantLoading,
    isActive: subscriptionActive,
    maxOlts,
    maxUsers,
  };
}
