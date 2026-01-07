import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface CustomerType {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useCustomerTypes() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomerTypes = useCallback(async () => {
    if (!isSuperAdmin && !tenantId) {
      setCustomerTypes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('customer_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomerTypes((data as CustomerType[]) || []);
    } catch (err) {
      console.error('Error fetching customer types:', err);
      setCustomerTypes([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchCustomerTypes();
  }, [fetchCustomerTypes]);

  const createCustomerType = async (data: { name: string; description?: string }) => {
    try {
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const { data: newType, error } = await supabase
        .from('customer_types')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Customer type created successfully');
      fetchCustomerTypes();
      return newType;
    } catch (err: any) {
      console.error('Error creating customer type:', err);
      if (err.message?.includes('duplicate')) {
        toast.error('This customer type already exists');
      } else {
        toast.error('Failed to create customer type');
      }
      throw err;
    }
  };

  const updateCustomerType = async (id: string, data: Partial<CustomerType>) => {
    try {
      const { error } = await supabase
        .from('customer_types')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer type updated');
      fetchCustomerTypes();
    } catch (err) {
      console.error('Error updating customer type:', err);
      toast.error('Failed to update customer type');
      throw err;
    }
  };

  const deleteCustomerType = async (id: string) => {
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('customer_types')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer type deleted');
      fetchCustomerTypes();
    } catch (err) {
      console.error('Error deleting customer type:', err);
      toast.error('Failed to delete customer type');
      throw err;
    }
  };

  return {
    customerTypes,
    loading,
    refetch: fetchCustomerTypes,
    createCustomerType,
    updateCustomerType,
    deleteCustomerType,
  };
}
