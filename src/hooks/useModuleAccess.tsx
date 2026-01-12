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
        const pkgFeatures = (pkg.features as TenantFeatures) || {};
        
        // Check if tenant has manual features enabled
        const manualFeaturesEnabled = (tenant as any)?.manual_features_enabled === true;
        const manualFeatures = ((tenant as any)?.manual_features as TenantFeatures) || {};
        const manualLimits = ((tenant as any)?.manual_limits as any) || {};
        
        // Determine final features: if manual_features_enabled, use manual features, otherwise use package features
        let finalFeatures: TenantFeatures;
        if (manualFeaturesEnabled && Object.keys(manualFeatures).length > 0) {
          finalFeatures = { ...pkgFeatures, ...manualFeatures };
        } else {
          finalFeatures = pkgFeatures;
        }
        
        // Determine final limits: manual limits override package limits if set
        const finalLimits = {
          maxOlts: manualLimits.max_olts ?? (tenant as any)?.max_olts ?? pkg.max_olts ?? 1,
          maxUsers: manualLimits.max_users ?? (tenant as any)?.max_users ?? pkg.max_users ?? 1,
          maxOnus: manualLimits.max_onus ?? (tenant as any)?.max_onus ?? pkg.max_onus ?? null,
          maxMikrotiks: manualLimits.max_mikrotiks ?? (tenant as any)?.max_mikrotiks ?? pkg.max_mikrotiks ?? null,
          maxCustomers: manualLimits.max_customers ?? (tenant as any)?.max_customers ?? pkg.max_customers ?? null,
          maxAreas: manualLimits.max_areas ?? (tenant as any)?.max_areas ?? pkg.max_areas ?? null,
          maxResellers: manualLimits.max_resellers ?? (tenant as any)?.max_resellers ?? pkg.max_resellers ?? null,
        };
        
        setFeatures(finalFeatures);
        setLimits(finalLimits);
        setSubscriptionActive(true);
      } else if (tenant) {
        // No active subscription, use tenant defaults (trial or active mode)
        const manualFeaturesEnabled = (tenant as any)?.manual_features_enabled === true;
        const manualFeatures = ((tenant as any)?.manual_features as TenantFeatures) || {};
        const tenantFeatures = (tenant.features as TenantFeatures) || {};
        
        // Default features for trial/active tenants without subscription
        // Enable all core ISP modules by default
        const defaultFeatures: TenantFeatures = {
          olt_care: true,
          isp_billing: true,
          isp_customers: true,
          isp_resellers: true,
          isp_mikrotik: true,
          isp_areas: true,
          isp_crm: true,
          isp_inventory: true,
          isp_salary_payroll: true,
          isp_btrc_reports: true,
          isp_tickets: true,
          sms_alerts: true,
          email_alerts: true,
          multi_user: true,
          reports_export: true,
          ...(manualFeaturesEnabled ? manualFeatures : tenantFeatures), // Override with tenant-specific features
        };
        
        setFeatures(defaultFeatures);
        setLimits({
          maxOlts: (tenant as any).max_olts || 10,
          maxUsers: (tenant as any).max_users || 10,
          maxOnus: (tenant as any).max_onus || 1000,
          maxMikrotiks: (tenant as any).max_mikrotiks || 5,
          maxCustomers: (tenant as any).max_customers || null,
          maxAreas: (tenant as any).max_areas || null,
          maxResellers: (tenant as any).max_resellers || null,
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

      // If features is empty or undefined, allow access (trial mode defaults)
      // This allows trial tenants to access all modules
      if (!features || Object.keys(features).length === 0) {
        return true; // Default to allowing access for trial/new tenants
      }

      return features[module] === true;
    },
    [features, superAdminUnscoped],
  );

  const hasPaymentGatewayAccess = useCallback(
    (gateway: PaymentGatewayType): boolean => {
      if (superAdminUnscoped) return true;

      const paymentGateways = features.payment_gateways as PaymentGatewayPermissions | undefined;
      
      // If payment_gateways is not defined or empty, check if we're in trial/active mode
      // Trial tenants and tenants without specific restrictions should have access to all gateways
      if (!paymentGateways || Object.keys(paymentGateways).length === 0) {
        // Allow all gateways for trial/active tenants without specific gateway restrictions
        return true;
      }
      
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
