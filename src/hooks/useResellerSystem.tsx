import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { Reseller, ResellerTransaction, ResellerBranch, ResellerCustomRole } from '@/types/reseller';
import { toast } from 'sonner';

export function useResellerSystem() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [branches, setBranches] = useState<ResellerBranch[]>([]);
  const [customRoles, setCustomRoles] = useState<ResellerCustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResellers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('resellers')
        .select(`
          *,
          area:areas(id, name),
          parent:resellers!resellers_parent_id_fkey(id, name)
        `)
        .order('level', { ascending: true })
        .order('created_at', { ascending: false });

      // Filter by tenant_id for non-super-admins
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching resellers:', error);
        throw error;
      }
      console.log('Fetched resellers:', data?.length || 0, 'items');
      setResellers((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching resellers:', err);
      setResellers([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  const fetchBranches = useCallback(async () => {
    try {
      let query = supabase
        .from('reseller_branches')
        .select(`
          *,
          manager:resellers(id, name)
        `)
        .order('name');

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBranches((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  }, [tenantId, isSuperAdmin]);

  const fetchCustomRoles = useCallback(async () => {
    try {
      let query = supabase
        .from('reseller_custom_roles')
        .select('*')
        .order('name');

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomRoles((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching custom roles:', err);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchResellers();
    fetchBranches();
    fetchCustomRoles();
  }, [fetchResellers, fetchBranches, fetchCustomRoles]);

  // Create reseller
  const createReseller = async (data: Partial<Reseller>) => {
    try {
      const resellerData: any = { ...data };
      
      // Set tenant_id - required for insert
      if (tenantId) {
        resellerData.tenant_id = tenantId;
        
        // Check package limit before adding new reseller
        if (!isSuperAdmin) {
          const { checkPackageLimit } = await import('@/hooks/usePackageLimits');
          const limitCheck = await checkPackageLimit(tenantId, 'resellers', 1);
          if (!limitCheck.allowed) {
            toast.error(limitCheck.message || 'Reseller limit reached. Please upgrade your package.');
            throw new Error(limitCheck.message);
          }
        }
      } else {
        // Try to get tenant_id from current user's tenant
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .single();
        
        if (tenantUser?.tenant_id) {
          resellerData.tenant_id = tenantUser.tenant_id;
        } else {
          throw new Error('No tenant context available');
        }
      }
      
      // Set level based on parent
      if (data.parent_id) {
        const parent = resellers.find(r => r.id === data.parent_id);
        if (parent) {
          resellerData.level = parent.level + 1;
          resellerData.role = parent.level === 1 ? 'sub_reseller' : 'sub_sub_reseller';
        }
      } else {
        resellerData.level = 1;
        resellerData.role = 'reseller';
      }
      
      console.log('Creating reseller with data:', resellerData);
      
      const { data: newReseller, error } = await supabase
        .from('resellers')
        .insert(resellerData)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      console.log('Created reseller:', newReseller);
      toast.success('Reseller created successfully');
      await fetchResellers();
      return newReseller;
    } catch (err: any) {
      console.error('Error creating reseller:', err);
      toast.error(err?.message || 'Failed to create reseller');
      throw err;
    }
  };

  // Update reseller
  const updateReseller = async (id: string, data: Partial<Reseller>) => {
    try {
      const { error } = await supabase
        .from('resellers')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Reseller updated successfully');
      fetchResellers();
    } catch (err) {
      console.error('Error updating reseller:', err);
      toast.error('Failed to update reseller');
      throw err;
    }
  };

  // Delete (deactivate) reseller
  const deleteReseller = async (id: string) => {
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Reseller deactivated');
      fetchResellers();
    } catch (err) {
      console.error('Error deactivating reseller:', err);
      toast.error('Failed to deactivate reseller');
      throw err;
    }
  };

  // Recharge balance (ISP -> Reseller)
  const rechargeBalance = async (resellerId: string, amount: number, description: string) => {
    try {
      const reseller = resellers.find(r => r.id === resellerId);
      if (!reseller) throw new Error('Reseller not found');

      const newBalance = reseller.balance + amount;

      // Create transaction
      const { error: txError } = await supabase
        .from('reseller_transactions')
        .insert({
          tenant_id: tenantId,
          reseller_id: resellerId,
          type: 'recharge',
          amount,
          balance_before: reseller.balance,
          balance_after: newBalance,
          description,
        } as any);

      if (txError) throw txError;

      // Update balance
      const { error: updateError } = await supabase
        .from('resellers')
        .update({ balance: newBalance })
        .eq('id', resellerId);

      if (updateError) throw updateError;

      toast.success('Balance recharged successfully');
      fetchResellers();
    } catch (err) {
      console.error('Error recharging balance:', err);
      toast.error('Failed to recharge balance');
      throw err;
    }
  };

  // Transfer balance between resellers
  const transferBalance = async (fromId: string, toId: string, amount: number, description: string) => {
    try {
      const { data, error } = await supabase.rpc('transfer_reseller_balance', {
        p_from_reseller_id: fromId,
        p_to_reseller_id: toId,
        p_amount: amount,
        p_description: description,
      });

      if (error) throw error;
      
      const result = data as any;
      if (result && !result.success) throw new Error(result.error);

      toast.success('Balance transferred successfully');
      fetchResellers();
      return data;
    } catch (err: any) {
      console.error('Error transferring balance:', err);
      toast.error(err.message || 'Failed to transfer balance');
      throw err;
    }
  };

  // Pay customer from reseller wallet
  const payCustomer = async (resellerId: string, customerId: string, amount: number, months: number = 1) => {
    try {
      const { data, error } = await supabase.rpc('reseller_pay_customer', {
        p_reseller_id: resellerId,
        p_customer_id: customerId,
        p_amount: amount,
        p_months: months,
      });

      if (error) throw error;
      
      const result = data as any;
      if (result && !result.success) throw new Error(result.error);

      toast.success('Customer recharged successfully');
      fetchResellers();
      return data;
    } catch (err: any) {
      console.error('Error paying customer:', err);
      toast.error(err.message || 'Failed to recharge customer');
      throw err;
    }
  };

  // Get reseller transactions
  const getTransactions = async (resellerId: string): Promise<ResellerTransaction[]> => {
    try {
      const { data, error } = await supabase
        .from('reseller_transactions')
        .select(`
          *,
          from_reseller:resellers!reseller_transactions_from_reseller_id_fkey(id, name),
          to_reseller:resellers!reseller_transactions_to_reseller_id_fkey(id, name),
          customer:customers(id, name, customer_code)
        `)
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return [];
    }
  };

  // Get sub-resellers of a reseller
  const getSubResellers = (parentId: string): Reseller[] => {
    return resellers.filter(r => r.parent_id === parentId && r.is_active);
  };

  // Get reseller hierarchy (descendants)
  const getDescendants = (resellerId: string): Reseller[] => {
    const descendants: Reseller[] = [];
    const findDescendants = (parentId: string) => {
      const children = resellers.filter(r => r.parent_id === parentId && r.is_active);
      children.forEach(child => {
        descendants.push(child);
        findDescendants(child.id);
      });
    };
    findDescendants(resellerId);
    return descendants;
  };

  // Branch management
  const createBranch = async (data: Partial<ResellerBranch>) => {
    try {
      if (!tenantId) {
        throw new Error('No tenant context available');
      }
      
      // Fix: Set manager_reseller_id to null if empty string to avoid UUID error
      const branchData = { 
        ...data, 
        tenant_id: tenantId,
        manager_reseller_id: data.manager_reseller_id || null,
      };
      
      const { error } = await supabase
        .from('reseller_branches')
        .insert(branchData as any);

      if (error) throw error;
      toast.success('Branch created');
      fetchBranches();
    } catch (err: any) {
      console.error('Error creating branch:', err);
      toast.error(err?.message || 'Failed to create branch');
      throw err;
    }
  };

  const updateBranch = async (id: string, data: Partial<ResellerBranch>) => {
    try {
      const { error } = await supabase
        .from('reseller_branches')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Branch updated');
      fetchBranches();
    } catch (err) {
      console.error('Error updating branch:', err);
      toast.error('Failed to update branch');
      throw err;
    }
  };

  // Custom role management
  const createCustomRole = async (data: Partial<ResellerCustomRole>) => {
    try {
      const roleData = { ...data, tenant_id: tenantId };
      const { error } = await supabase
        .from('reseller_custom_roles')
        .insert(roleData as any);

      if (error) throw error;
      toast.success('Custom role created');
      fetchCustomRoles();
    } catch (err) {
      console.error('Error creating custom role:', err);
      toast.error('Failed to create custom role');
      throw err;
    }
  };

  const updateCustomRole = async (id: string, data: Partial<ResellerCustomRole>) => {
    try {
      const { error } = await supabase
        .from('reseller_custom_roles')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Custom role updated');
      fetchCustomRoles();
    } catch (err) {
      console.error('Error updating custom role:', err);
      toast.error('Failed to update custom role');
      throw err;
    }
  };

  return {
    resellers,
    branches,
    customRoles,
    loading,
    refetch: fetchResellers,
    refetchBranches: fetchBranches,
    refetchRoles: fetchCustomRoles,
    createReseller,
    updateReseller,
    deleteReseller,
    rechargeBalance,
    transferBalance,
    payCustomer,
    getTransactions,
    getSubResellers,
    getDescendants,
    createBranch,
    updateBranch,
    createCustomRole,
    updateCustomRole,
  };
}
