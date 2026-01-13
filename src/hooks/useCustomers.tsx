import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { Customer, CustomerStatus } from '@/types/isp';
import { toast } from 'sonner';

export function useCustomers() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomers = useCallback(async () => {
    // Always require tenant context for ISP users
    if (!isSuperAdmin && !tenantId) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('customers')
        .select(`
          *,
          area:areas(*),
          reseller:resellers(*),
          package:isp_packages(*)
        `)
        .order('created_at', { ascending: false });

      // CRITICAL: Always filter by tenant_id for non-super-admins  
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err as Error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchCustomers();

    // Real-time subscription
    const channel = supabase
      .channel('customers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCustomers]);

  const createCustomer = async (data: Partial<Customer>) => {
    try {
      // Super admins must select a tenant context or we skip tenant_id
      const customerData: any = {
        ...data,
      };
      
      // Only add tenant_id if available (not super admin without tenant context)
      if (tenantId) {
        customerData.tenant_id = tenantId;
        
        // Check package limit before adding new customer (but don't block on errors)
        if (!isSuperAdmin) {
          try {
            const { checkPackageLimit } = await import('@/hooks/usePackageLimits');
            const limitCheck = await checkPackageLimit(tenantId, 'customers', 1);
            if (!limitCheck.allowed) {
              toast.error(limitCheck.message || 'Customer limit reached. Please upgrade your package.');
              throw new Error(limitCheck.message);
            }
          } catch (limitError: any) {
            // If limit check fails due to no subscription, allow customer creation
            if (limitError?.message?.includes('No active subscription')) {
              console.warn('No active subscription found, allowing customer creation');
            } else if (limitError?.message?.includes('limit reached')) {
              throw limitError;
            } else {
              console.warn('Package limit check failed, allowing customer creation:', limitError);
            }
          }
        }
      } else if (!isSuperAdmin) {
        throw new Error('No tenant context available');
      }

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) {
        // Workaround: if PostgREST schema cache is temporarily out of sync for nid_number,
        // retry without sending that field so customer creation doesn't block.
        if (error.message?.includes("nid_number") && 'nid_number' in customerData) {
          console.warn('Retrying customer creation without nid_number due to schema cache error');
          const retryPayload = { ...customerData };
          delete retryPayload.nid_number;

          const { data: retryCustomer, error: retryError } = await supabase
            .from('customers')
            .insert(retryPayload)
            .select()
            .single();

          if (retryError) {
            console.error('Supabase error creating customer (retry):', retryError);
            throw new Error(retryError.message || 'Database error while creating customer');
          }

          toast.success('Customer created successfully');
          return retryCustomer;
        }

        console.error('Supabase error creating customer:', error);
        throw new Error(error.message || 'Database error while creating customer');
      }

      toast.success('Customer created successfully');
      return newCustomer;
    } catch (err: any) {
      console.error('Error creating customer:', err);
      const message = err?.message || 'Failed to create customer';
      // Only show toast if not already shown
      if (!message.includes('limit reached')) {
        toast.error(message);
      }
      throw err;
    }
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    try {
      const { data: updated, error } = await supabase
        .from('customers')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Customer updated successfully');
      return updated;
    } catch (err) {
      console.error('Error updating customer:', err);
      toast.error('Failed to update customer');
      throw err;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer deleted successfully');
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Failed to delete customer');
      throw err;
    }
  };

  const updateStatus = async (id: string, status: CustomerStatus) => {
    return updateCustomer(id, { status });
  };

  // Statistics
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    expired: customers.filter(c => c.status === 'expired').length,
    suspended: customers.filter(c => c.status === 'suspended').length,
    pending: customers.filter(c => c.status === 'pending').length,
    totalDue: customers.reduce((sum, c) => sum + (c.due_amount || 0), 0),
  };

  return {
    customers,
    loading,
    error,
    stats,
    refetch: fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    updateStatus,
  };
}
