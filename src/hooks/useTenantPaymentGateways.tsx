import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantPaymentGateway {
  id: string;
  tenant_id: string;
  gateway: string;
  display_name: string;
  is_enabled: boolean;
  sandbox_mode: boolean;
  config: Record<string, any>;
  instructions: string | null;
  sort_order: number;
  transaction_fee_percent: number;
  bkash_mode?: string; // 'tokenized' | 'checkout_js'
  created_at: string;
  updated_at: string;
}

export function useTenantPaymentGateways() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [gateways, setGateways] = useState<TenantPaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGateways = useCallback(async (forTenantId?: string) => {
    const targetTenantId = forTenantId || tenantId;
    if (!targetTenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_payment_gateways')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setGateways((data as TenantPaymentGateway[]) || []);
    } catch (err) {
      console.error('Error fetching tenant payment gateways:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchGateways();
    }
  }, [tenantId, fetchGateways]);

  const updateGateway = async (id: string, updates: Partial<TenantPaymentGateway>) => {
    try {
      const { error } = await supabase
        .from('tenant_payment_gateways')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Payment gateway updated');
      await fetchGateways();
    } catch (err) {
      console.error('Error updating payment gateway:', err);
      toast.error('Failed to update payment gateway');
      throw err;
    }
  };

  const initializeGateways = async (targetTenantId: string) => {
    try {
      const { error } = await supabase.rpc('initialize_tenant_gateways', {
        _tenant_id: targetTenantId
      });

      if (error) throw error;
      await fetchGateways(targetTenantId);
      return true;
    } catch (err) {
      console.error('Error initializing gateways:', err);
      return false;
    }
  };

  return {
    gateways,
    loading,
    fetchGateways,
    updateGateway,
    initializeGateways,
  };
}
