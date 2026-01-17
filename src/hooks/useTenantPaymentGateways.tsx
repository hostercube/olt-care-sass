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

  const updateGateway = async (id: string, updates: Partial<TenantPaymentGateway>): Promise<boolean> => {
    try {
      // Build clean update data
      const updateData: Record<string, any> = {};
      
      if (updates.is_enabled !== undefined) updateData.is_enabled = updates.is_enabled;
      if (updates.sandbox_mode !== undefined) updateData.sandbox_mode = updates.sandbox_mode;
      if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
      if (updates.bkash_mode !== undefined) updateData.bkash_mode = updates.bkash_mode;
      if (updates.transaction_fee_percent !== undefined) {
        updateData.transaction_fee_percent = Number(updates.transaction_fee_percent) || 0;
      }
      
      // Handle config - ensure it's a valid JSON object
      if (updates.config !== undefined) {
        const cleanConfig: Record<string, any> = {};
        if (updates.config && typeof updates.config === 'object') {
          Object.entries(updates.config).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              cleanConfig[key] = value;
            }
          });
        }
        updateData.config = cleanConfig;
      }

      console.log('Updating tenant gateway:', { id, updateData });

      const { data, error } = await supabase
        .from('tenant_payment_gateways')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Tenant gateway updated successfully:', data);
      toast.success('Payment gateway updated successfully');
      await fetchGateways();
      return true;
    } catch (err: any) {
      console.error('Error updating payment gateway:', err);
      toast.error(err.message || 'Failed to update payment gateway');
      return false;
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
