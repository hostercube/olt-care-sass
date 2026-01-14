import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { ReferralConfig, CustomerReferral } from '@/types/referral';

export function useReferralSystem() {
  const { tenantId } = useTenantContext();
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [referrals, setReferrals] = useState<CustomerReferral[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('referral_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching referral config:', error);
    }
  }, [tenantId]);

  const fetchReferrals = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('customer_referrals')
        .select(`
          *,
          referrer:customers!customer_referrals_referrer_customer_id_fkey(name, customer_code),
          referred:customers!customer_referrals_referred_customer_id_fkey(name, customer_code)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchReferrals()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchConfig, fetchReferrals]);

  const saveConfig = async (data: Partial<ReferralConfig>) => {
    if (!tenantId) return;

    try {
      if (config?.id) {
        const { error } = await supabase
          .from('referral_configs')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('referral_configs')
          .insert({ ...data, tenant_id: tenantId });
        if (error) throw error;
      }
      toast.success('Referral configuration saved');
      await fetchConfig();
    } catch (error: any) {
      toast.error('Failed to save configuration');
      console.error('Error saving config:', error);
    }
  };

  const updateReferralStatus = async (referralId: string, status: string, bonusPaid?: boolean) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (bonusPaid) {
        updateData.bonus_paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('customer_referrals')
        .update(updateData)
        .eq('id', referralId);

      if (error) throw error;
      toast.success('Referral status updated');
      await fetchReferrals();
    } catch (error: any) {
      toast.error('Failed to update referral');
      console.error('Error updating referral:', error);
    }
  };

  return {
    config,
    referrals,
    loading,
    saveConfig,
    updateReferralStatus,
    refetch: () => Promise.all([fetchConfig(), fetchReferrals()]),
  };
}
