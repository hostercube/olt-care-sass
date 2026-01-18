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

  /**
   * Initialize gateways for a tenant by calling the RPC function
   * This copies global gateway settings to tenant_payment_gateways table
   */
  const initializeGateways = async (targetTenantId: string): Promise<boolean> => {
    try {
      console.log('Initializing gateways for tenant:', targetTenantId);
      
      // Call the RPC function to initialize gateways from global settings
      const { error: rpcError } = await supabase.rpc('initialize_tenant_gateways', {
        _tenant_id: targetTenantId
      });

      if (rpcError) {
        console.error('RPC initialize_tenant_gateways error:', rpcError);
        // Fallback: manually insert gateways from global settings
        await manualInitializeGateways(targetTenantId);
      }
      
      await fetchGateways(targetTenantId);
      return true;
    } catch (err) {
      console.error('Error initializing gateways:', err);
      // Try manual fallback
      try {
        await manualInitializeGateways(targetTenantId);
        await fetchGateways(targetTenantId);
        return true;
      } catch (fallbackErr) {
        console.error('Fallback gateway initialization failed:', fallbackErr);
        return false;
      }
    }
  };

  /**
   * Manual fallback to initialize gateways when RPC fails
   */
  const manualInitializeGateways = async (targetTenantId: string) => {
    // Get global gateway settings
    const { data: globalGateways, error: globalError } = await supabase
      .from('payment_gateway_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    if (globalError) throw globalError;

    // Get existing tenant gateways
    const { data: existingGateways } = await supabase
      .from('tenant_payment_gateways')
      .select('gateway')
      .eq('tenant_id', targetTenantId);

    const existingGatewayIds = (existingGateways || []).map(g => g.gateway);

    // Filter out already existing gateways
    const toInsert = (globalGateways || [])
      .filter(gw => !existingGatewayIds.includes(gw.gateway))
      .map(gw => ({
        tenant_id: targetTenantId,
        gateway: gw.gateway,
        display_name: gw.display_name,
        is_enabled: gw.is_enabled,
        sandbox_mode: gw.sandbox_mode,
        config: gw.config || {},
        instructions: gw.instructions,
        transaction_fee_percent: gw.transaction_fee_percent || 0,
        bkash_mode: gw.bkash_mode,
        sort_order: gw.sort_order,
      }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('tenant_payment_gateways')
        .insert(toInsert);

      if (insertError) throw insertError;
      console.log(`Inserted ${toInsert.length} gateways for tenant ${targetTenantId}`);
    }

    // Also insert default gateways that might not exist in global settings
    const defaultGateways: Array<'sslcommerz' | 'bkash' | 'rocket' | 'nagad' | 'uddoktapay' | 'shurjopay' | 'aamarpay' | 'piprapay' | 'portwallet' | 'manual'> = 
      ['sslcommerz', 'bkash', 'rocket', 'nagad', 'uddoktapay', 'shurjopay', 'aamarpay', 'piprapay', 'manual'];
    const allExisting = [...existingGatewayIds, ...toInsert.map(g => g.gateway)];
    const missingDefaults = defaultGateways.filter(gw => !allExisting.includes(gw));

    if (missingDefaults.length > 0) {
      const defaultInserts = missingDefaults.map((gw, idx) => ({
        tenant_id: targetTenantId,
        gateway: gw as 'sslcommerz' | 'bkash' | 'rocket' | 'nagad' | 'uddoktapay' | 'shurjopay' | 'aamarpay' | 'piprapay' | 'portwallet' | 'manual',
        display_name: gw.charAt(0).toUpperCase() + gw.slice(1),
        is_enabled: false,
        sandbox_mode: true,
        config: {},
        sort_order: 100 + idx,
      }));

      await supabase.from('tenant_payment_gateways').insert(defaultInserts);
    }
  };

  /**
   * Sync credentials from global settings for gateways that have empty config
   */
  const syncFromGlobal = async (targetTenantId?: string): Promise<number> => {
    const tid = targetTenantId || tenantId;
    if (!tid) return 0;

    try {
      // Get global settings with credentials
      const { data: globalGateways } = await supabase
        .from('payment_gateway_settings')
        .select('*')
        .order('sort_order');

      if (!globalGateways || globalGateways.length === 0) return 0;

      // Get tenant gateways with empty config
      const { data: tenantGws } = await supabase
        .from('tenant_payment_gateways')
        .select('*')
        .eq('tenant_id', tid);

      if (!tenantGws) return 0;

      let updatedCount = 0;

      for (const tenantGw of tenantGws) {
        const globalGw = globalGateways.find(g => g.gateway === tenantGw.gateway);
        if (!globalGw) continue;

        // Check if tenant has empty config but global has credentials
        const tenantConfig = tenantGw.config || {};
        const globalConfig = globalGw.config || {};
        
        // Exclude bkash_mode from credential check
        const tenantCredentials = Object.entries(tenantConfig)
          .filter(([k]) => k !== 'bkash_mode')
          .filter(([, v]) => v && String(v).trim() !== '');
        
        const globalCredentials = Object.entries(globalConfig)
          .filter(([k]) => k !== 'bkash_mode')
          .filter(([, v]) => v && String(v).trim() !== '');

        // If tenant has no credentials but global does, sync them
        if (tenantCredentials.length === 0 && globalCredentials.length > 0) {
          const { error } = await supabase
            .from('tenant_payment_gateways')
            .update({
              config: globalConfig,
              sandbox_mode: globalGw.sandbox_mode,
              instructions: tenantGw.instructions || globalGw.instructions,
            })
            .eq('id', tenantGw.id);

          if (!error) {
            updatedCount++;
            console.log(`Synced credentials for ${tenantGw.gateway}`);
          }
        }
      }

      if (updatedCount > 0) {
        toast.success(`Synced credentials for ${updatedCount} gateway(s)`);
        await fetchGateways(tid);
      }

      return updatedCount;
    } catch (err) {
      console.error('Error syncing from global:', err);
      return 0;
    }
  };

  return {
    gateways,
    loading,
    fetchGateways,
    updateGateway,
    initializeGateways,
    syncFromGlobal,
  };
}
