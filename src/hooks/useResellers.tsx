import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { Reseller, ResellerTransaction } from '@/types/isp';
import { toast } from 'sonner';

export function useResellers() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResellers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('resellers')
        .select(`
          *,
          area:areas(*)
        `)
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setResellers((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching resellers:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchResellers();
  }, [fetchResellers]);

  const createReseller = async (data: Partial<Reseller>) => {
    try {
      const resellerData: any = { ...data };
      
      // Only add tenant_id if available
      if (tenantId) {
        resellerData.tenant_id = tenantId;
      } else if (!isSuperAdmin) {
        throw new Error('No tenant context available');
      }
      
      const { data: newReseller, error } = await supabase
        .from('resellers')
        .insert(resellerData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Reseller created successfully');
      fetchResellers();
      return newReseller;
    } catch (err) {
      console.error('Error creating reseller:', err);
      toast.error('Failed to create reseller');
      throw err;
    }
  };

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

  const deleteReseller = async (id: string) => {
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Reseller deactivated successfully');
      fetchResellers();
    } catch (err) {
      console.error('Error deleting reseller:', err);
      toast.error('Failed to delete reseller');
      throw err;
    }
  };

  const rechargeBalance = async (resellerId: string, amount: number, description: string) => {
    try {
      // Get current balance
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

  return {
    resellers,
    loading,
    refetch: fetchResellers,
    createReseller,
    updateReseller,
    deleteReseller,
    rechargeBalance,
  };
}
