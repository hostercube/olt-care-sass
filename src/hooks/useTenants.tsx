import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tenant, TenantStatus, TenantFeatures } from '@/types/saas';

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our Tenant type
      const transformedData = (data || []).map(item => ({
        ...item,
        features: (item.features || {}) as TenantFeatures
      })) as Tenant[];
      
      setTenants(transformedData);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tenants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const createTenant = async (tenantData: { name: string; email: string } & Partial<Tenant>) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([tenantData as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tenant created successfully',
      });

      await fetchTenants();
      return data;
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tenant',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>) => {
    try {
      // Cast features to any to avoid Json type conflicts
      const dbUpdates = { ...updates, features: updates.features as any };
      const { error } = await supabase
        .from('tenants')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tenant updated successfully',
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tenant',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const suspendTenant = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'suspended' as TenantStatus,
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tenant Suspended',
        description: 'The tenant has been suspended',
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error suspending tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend tenant',
        variant: 'destructive',
      });
    }
  };

  const activateTenant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'active' as TenantStatus,
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tenant Activated',
        description: 'The tenant is now active',
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error activating tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate tenant',
        variant: 'destructive',
      });
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      // First, get all users associated with this tenant
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', id);

      // Delete subscriptions
      await supabase
        .from('subscriptions')
        .delete()
        .eq('tenant_id', id);

      // Delete tenant_users entries
      await supabase
        .from('tenant_users')
        .delete()
        .eq('tenant_id', id);

      // Delete the tenant
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tenant Deleted',
        description: 'The tenant and all associated data have been permanently deleted. Users will be logged out on their next page refresh.',
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tenant',
        variant: 'destructive',
      });
    }
  };

  // Update tenant manual permissions
  const updateTenantManualPermissions = async (
    id: string, 
    manualFeatures: TenantFeatures | null, 
    manualLimits: Record<string, number | null> | null,
    enabled: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          manual_features: manualFeatures as any,
          manual_limits: manualLimits as any,
          manual_features_enabled: enabled,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: enabled 
          ? 'Manual permissions enabled for this tenant' 
          : 'Manual permissions disabled - using package defaults',
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error updating tenant permissions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tenant permissions',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Change tenant's subscription package
  const changeTenantPackage = async (tenantId: string, packageId: string) => {
    try {
      // Get the package details
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (pkgError) throw pkgError;

      // Check if tenant has an active subscription
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (existingSub) {
        // Update the existing subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            package_id: packageId,
            amount: pkg.price_monthly,
          })
          .eq('id', existingSub.id);

        if (updateError) throw updateError;
      } else {
        // Create a new subscription
        const now = new Date();
        const endsAt = new Date(now);
        endsAt.setMonth(endsAt.getMonth() + 1);

        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            package_id: packageId,
            billing_cycle: 'monthly',
            status: 'active',
            amount: pkg.price_monthly,
            starts_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            auto_renew: true,
          });

        if (insertError) throw insertError;
      }

      // If manual permissions are not enabled, clear them so package takes effect
      const { data: tenant } = await supabase
        .from('tenants')
        .select('manual_features_enabled')
        .eq('id', tenantId)
        .single();

      if (!(tenant as any)?.manual_features_enabled) {
        // Reset tenant features to empty so package features take over
        await supabase
          .from('tenants')
          .update({ features: {} })
          .eq('id', tenantId);
      }

      toast({
        title: 'Package Changed',
        description: `Tenant has been assigned to the ${pkg.name} package`,
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error changing tenant package:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change package',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    tenants,
    loading,
    fetchTenants,
    createTenant,
    updateTenant,
    suspendTenant,
    activateTenant,
    deleteTenant,
    updateTenantManualPermissions,
    changeTenantPackage,
  };
}
