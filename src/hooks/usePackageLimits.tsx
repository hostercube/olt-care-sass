import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';

export interface PackageLimits {
  max_olts: number | null;
  max_onus: number | null;
  max_mikrotiks: number | null;
  max_customers: number | null;
  max_areas: number | null;
  max_resellers: number | null;
  max_users: number | null;
}

export interface CurrentUsage {
  olts: number;
  onus: number;
  mikrotiks: number;
  customers: number;
  areas: number;
  resellers: number;
  users: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number | null;
  remaining: number | null;
  message?: string;
}

const UNLIMITED = null;

export function usePackageLimits() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [limits, setLimits] = useState<PackageLimits | null>(null);
  const [usage, setUsage] = useState<CurrentUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLimitsAndUsage = useCallback(async () => {
    // Super admins have no limits
    if (isSuperAdmin) {
      setLimits({
        max_olts: UNLIMITED,
        max_onus: UNLIMITED,
        max_mikrotiks: UNLIMITED,
        max_customers: UNLIMITED,
        max_areas: UNLIMITED,
        max_resellers: UNLIMITED,
        max_users: UNLIMITED,
      });
      setUsage({ olts: 0, onus: 0, mikrotiks: 0, customers: 0, areas: 0, resellers: 0, users: 0 });
      setLoading(false);
      return;
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get package limits from subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          package:packages(
            max_olts,
            max_onus,
            max_mikrotiks,
            max_customers,
            max_areas,
            max_resellers,
            max_users
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.package) {
        const pkg = subscription.package as any;
        setLimits({
          max_olts: pkg.max_olts,
          max_onus: pkg.max_onus,
          max_mikrotiks: pkg.max_mikrotiks,
          max_customers: pkg.max_customers,
          max_areas: pkg.max_areas,
          max_resellers: pkg.max_resellers,
          max_users: pkg.max_users,
        });
      } else {
        // Default limits if no package found
        setLimits({
          max_olts: 1,
          max_onus: 100,
          max_mikrotiks: 1,
          max_customers: 100,
          max_areas: 5,
          max_resellers: 5,
          max_users: 1,
        });
      }

      // Get current usage counts in parallel
      const [oltsRes, mikrotikRes, customersRes, areasRes, resellersRes, usersRes] = await Promise.all([
        supabase.from('olts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('mikrotik_routers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('areas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('resellers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('tenant_users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);

      // Get ONU count through OLTs
      let onuCount = 0;
      const { data: oltIds } = await supabase.from('olts').select('id').eq('tenant_id', tenantId);
      if (oltIds && oltIds.length > 0) {
        const { count } = await supabase
          .from('onus')
          .select('id', { count: 'exact', head: true })
          .in('olt_id', oltIds.map(o => o.id));
        onuCount = count || 0;
      }

      setUsage({
        olts: oltsRes.count || 0,
        onus: onuCount,
        mikrotiks: mikrotikRes.count || 0,
        customers: customersRes.count || 0,
        areas: areasRes.count || 0,
        resellers: resellersRes.count || 0,
        users: usersRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching package limits:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchLimitsAndUsage();
  }, [fetchLimitsAndUsage]);

  const checkLimit = useCallback((
    resource: keyof CurrentUsage,
    addCount: number = 1
  ): LimitCheckResult => {
    if (!limits || !usage) {
      return { allowed: true, currentCount: 0, maxLimit: null, remaining: null };
    }

    const limitKey = `max_${resource}` as keyof PackageLimits;
    const maxLimit = limits[limitKey];
    const currentCount = usage[resource];

    // Unlimited
    if (maxLimit === null) {
      return { allowed: true, currentCount, maxLimit: null, remaining: null };
    }

    const remaining = maxLimit - currentCount;
    const allowed = currentCount + addCount <= maxLimit;

    return {
      allowed,
      currentCount,
      maxLimit,
      remaining,
      message: allowed 
        ? undefined 
        : `Package limit reached: ${currentCount}/${maxLimit} ${resource}. Please upgrade your package.`,
    };
  }, [limits, usage]);

  return {
    limits,
    usage,
    loading,
    checkLimit,
    refetch: fetchLimitsAndUsage,
  };
}

// Helper function to check a specific limit (for use outside React components)
export async function checkPackageLimit(
  tenantId: string,
  resource: 'olts' | 'onus' | 'mikrotiks' | 'customers' | 'areas' | 'resellers' | 'users',
  addCount: number = 1
): Promise<LimitCheckResult> {
  try {
    // Get package limits
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        package:packages(
          max_olts,
          max_onus,
          max_mikrotiks,
          max_customers,
          max_areas,
          max_resellers,
          max_users
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    // If no subscription or error, allow the operation (don't block on subscription issues)
    if (subError) {
      console.warn('Error checking subscription:', subError);
      return { allowed: true, currentCount: 0, maxLimit: null, remaining: null };
    }

    const pkg = subscription?.package as any;
    if (!pkg) {
      // No active subscription - allow with default high limits for trial/demo
      console.warn('No active subscription found for tenant, allowing operation');
      return { allowed: true, currentCount: 0, maxLimit: null, remaining: null };
    }

    const limitKey = `max_${resource}`;
    const maxLimit = pkg[limitKey];

    // Unlimited
    if (maxLimit === null || maxLimit === undefined) {
      return { allowed: true, currentCount: 0, maxLimit: null, remaining: null };
    }

    // Get current count
    let currentCount = 0;
    if (resource === 'onus') {
      // ONUs are counted through OLTs
      const { data: oltIds } = await supabase.from('olts').select('id').eq('tenant_id', tenantId);
      if (oltIds && oltIds.length > 0) {
        const { count } = await supabase
          .from('onus')
          .select('id', { count: 'exact', head: true })
          .in('olt_id', oltIds.map(o => o.id));
        currentCount = count || 0;
      }
    } else {
      const tableMap: Record<string, string> = {
        olts: 'olts',
        mikrotiks: 'mikrotik_routers',
        customers: 'customers',
        areas: 'areas',
        resellers: 'resellers',
        users: 'tenant_users',
      };
      const { count } = await supabase
        .from(tableMap[resource] as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      currentCount = count || 0;
    }

    const remaining = maxLimit - currentCount;
    const allowed = currentCount + addCount <= maxLimit;

    const resourceLabels: Record<string, string> = {
      olts: 'OLT',
      onus: 'ONU',
      mikrotiks: 'MikroTik',
      customers: 'Customer',
      areas: 'Area',
      resellers: 'Reseller',
      users: 'User',
    };

    return {
      allowed,
      currentCount,
      maxLimit,
      remaining,
      message: allowed 
        ? undefined 
        : `${resourceLabels[resource]} limit reached: ${currentCount}/${maxLimit}. Please upgrade your package.`,
    };
  } catch (error) {
    console.error('Error checking package limit:', error);
    // On any error, allow the operation to proceed
    return { allowed: true, currentCount: 0, maxLimit: null, remaining: null };
  }
}
