import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import {
  SUPER_ADMIN_FEATURES,
  SUPER_ADMIN_LIMITS,
  type TenantFeatures,
  type ModuleName,
  type PaymentGatewayType,
  type SMSGatewayType,
  type PaymentGatewayPermissions,
  type SMSGatewayPermissions,
} from '@/types/saas';

interface PackageLimits {
  maxOlts: number;
  maxUsers: number;
  maxOnus: number | null;
  maxMikrotiks: number | null;
  maxCustomers: number | null;
  maxAreas: number | null;
  maxResellers: number | null;
}

interface ModuleAccessResult {
  hasAccess: (module: ModuleName) => boolean;
  hasPaymentGatewayAccess: (gateway: PaymentGatewayType) => boolean;
  hasSMSGatewayAccess: (gateway: SMSGatewayType) => boolean;
  features: TenantFeatures;
  limits: PackageLimits;
  loading: boolean;
  isActive: boolean;
  isSuperAdmin: boolean;
  // Legacy support
  maxOlts: number;
  maxUsers: number;
}

const DEFAULT_LIMITS: PackageLimits = {
  maxOlts: 1,
  maxUsers: 1,
  maxOnus: 100,
  maxMikrotiks: 1,
  maxCustomers: null,
  maxAreas: null,
  maxResellers: null,
};

export function useModuleAccess(): ModuleAccessResult {
  const { tenantId, tenant, loading: tenantLoading, isSuperAdmin, isImpersonating } = useTenantContext() as any;
  const [features, setFeatures] = useState<TenantFeatures>({});
  const [limits, setLimits] = useState<PackageLimits>(DEFAULT_LIMITS);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const superAdminUnscoped = !!isSuperAdmin && !isImpersonating;

  const fetchSubscriptionFeatures = useCallback(async () => {
    // Super admins (not impersonating) have full access - no need to fetch subscription
    if (superAdminUnscoped) {
      setFeatures(SUPER_ADMIN_FEATURES);
      setLimits({
        maxOlts: SUPER_ADMIN_LIMITS.max_olts,
        maxUsers: SUPER_ADMIN_LIMITS.max_users,
        maxOnus: SUPER_ADMIN_LIMITS.max_onus,
        maxMikrotiks: SUPER_ADMIN_LIMITS.max_mikrotiks,
        maxCustomers: SUPER_ADMIN_LIMITS.max_customers,
        maxAreas: SUPER_ADMIN_LIMITS.max_areas,
        maxResellers: SUPER_ADMIN_LIMITS.max_resellers,
      });
      setSubscriptionActive(true);
      setLoading(false);
      return;
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      // Get active or trial subscription with package details
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select(
          `
          *,
          packages:package_id (
            features,
            max_olts,
            max_users,
            max_onus,
            max_mikrotiks,
            max_customers,
            max_areas,
            max_resellers
          )
        `,
        )
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'trial'] as any[])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        // Fall back to tenant features
        if (tenant) {
          setFeatures((tenant.features as TenantFeatures) || {});
          setLimits({
            maxOlts: tenant.max_olts || 1,
            maxUsers: tenant.max_users || 1,
            maxOnus: 100,
            maxMikrotiks: 1,
            maxCustomers: null,
            maxAreas: null,
            maxResellers: null,
          });
        }
        return;
      }

      if (subscription && subscription.packages) {
        const pkg = subscription.packages as any;
        setFeatures((pkg.features as TenantFeatures) || {});
        setLimits({
          maxOlts: pkg.max_olts || 1,
          maxUsers: pkg.max_users || 1,
          maxOnus: pkg.max_onus,
          maxMikrotiks: pkg.max_mikrotiks,
          maxCustomers: pkg.max_customers,
          maxAreas: pkg.max_areas,
          maxResellers: pkg.max_resellers,
        });
        setSubscriptionActive(true);
      } else if (tenant) {
        // No active subscription, use tenant defaults (trial mode)
        setFeatures((tenant.features as TenantFeatures) || {});
        setLimits({
          maxOlts: tenant.max_olts || 1,
          maxUsers: tenant.max_users || 1,
          maxOnus: 100,
          maxMikrotiks: 1,
          maxCustomers: null,
          maxAreas: null,
          maxResellers: null,
        });
        setSubscriptionActive(tenant.status === 'trial' || tenant.status === 'active');
      }
    } catch (error) {
      console.error('Error checking module access:', error);
    } finally {
      setLoading(false);
    }
  }, [superAdminUnscoped, tenantId, tenant]);

  useEffect(() => {
    if (!tenantLoading) {
      fetchSubscriptionFeatures();
    }
  }, [tenantLoading, fetchSubscriptionFeatures]);

  const hasAccess = useCallback(
    (module: ModuleName): boolean => {
      if (superAdminUnscoped) return true;

      // OLT Care is always enabled for all tenants
      if (module === 'olt_care') return true;

      return features[module] === true;
    },
    [features, superAdminUnscoped],
  );

  const hasPaymentGatewayAccess = useCallback(
    (gateway: PaymentGatewayType): boolean => {
      if (superAdminUnscoped) return true;

      const paymentGateways = features.payment_gateways as PaymentGatewayPermissions | undefined;
      if (!paymentGateways) return gateway === 'manual';
      return paymentGateways[gateway] === true;
    },
    [features, superAdminUnscoped],
  );

  const hasSMSGatewayAccess = useCallback(
    (gateway: SMSGatewayType): boolean => {
      if (superAdminUnscoped) return true;

      const smsGateways = features.sms_gateways as SMSGatewayPermissions | undefined;
      if (!smsGateways) return false;
      return smsGateways[gateway] === true;
    },
    [features, superAdminUnscoped],
  );

  return {
    hasAccess,
    hasPaymentGatewayAccess,
    hasSMSGatewayAccess,
    features,
    limits,
    loading: loading || tenantLoading,
    isActive: subscriptionActive || superAdminUnscoped,
    isSuperAdmin: !!isSuperAdmin,
    maxOlts: limits.maxOlts,
    maxUsers: limits.maxUsers,
  };
}
