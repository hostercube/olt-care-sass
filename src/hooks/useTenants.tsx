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
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tenant Deleted',
        description: 'The tenant has been permanently deleted',
      });

      await fetchTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tenant',
        variant: 'destructive',
      });
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
  };
}
