import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/types/saas';
import type { Json } from '@/integrations/supabase/types';

export interface PaymentGatewaySettings {
  id: string;
  gateway: PaymentMethod;
  display_name: string;
  is_enabled: boolean;
  sandbox_mode: boolean;
  instructions: string | null;
  config: Record<string, unknown> | null;
  sort_order: number;
  bkash_mode?: string;
  transaction_fee_percent?: number; // Added for fee handling
  created_at: string;
  updated_at: string;
}

export function usePaymentGateways() {
  const [gateways, setGateways] = useState<PaymentGatewaySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGateways = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_gateway_settings')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setGateways((data || []) as PaymentGatewaySettings[]);
    } catch (error: any) {
      console.error('Error fetching payment gateways:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const updateGateway = async (id: string, updates: Partial<PaymentGatewaySettings>): Promise<boolean> => {
    try {
      // Build update data, ensuring config is properly formatted
      const updateData: Record<string, any> = {};
      
      // Copy simple fields
      if (updates.is_enabled !== undefined) updateData.is_enabled = updates.is_enabled;
      if (updates.sandbox_mode !== undefined) updateData.sandbox_mode = updates.sandbox_mode;
      if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
      if (updates.bkash_mode !== undefined) updateData.bkash_mode = updates.bkash_mode;
      if (updates.transaction_fee_percent !== undefined) {
        updateData.transaction_fee_percent = Number(updates.transaction_fee_percent) || 0;
      }
      
      // Handle config - ensure it's a valid JSON object
      if (updates.config !== undefined) {
        // Make a clean copy of the config object
        const cleanConfig: Record<string, any> = {};
        if (updates.config && typeof updates.config === 'object') {
          Object.entries(updates.config).forEach(([key, value]) => {
            // Keep all values including empty strings (user might want to clear a field)
            if (value !== undefined) {
              cleanConfig[key] = value;
            }
          });
        }
        updateData.config = cleanConfig;
      }

      console.log('Updating gateway:', { id, updateData });

      const { data, error } = await supabase
        .from('payment_gateway_settings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Gateway updated successfully:', data);

      toast({
        title: 'Gateway Updated',
        description: 'Payment gateway settings have been saved successfully',
      });

      await fetchGateways();
      return true;
    } catch (error: any) {
      console.error('Error updating payment gateway:', error);
      toast({
        title: 'Error Saving Gateway',
        description: error.message || 'Failed to update gateway. Check console for details.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const createGateway = async (gateway: Omit<PaymentGatewaySettings, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('payment_gateway_settings')
        .insert({
          gateway: gateway.gateway,
          display_name: gateway.display_name,
          is_enabled: gateway.is_enabled,
          sandbox_mode: gateway.sandbox_mode,
          instructions: gateway.instructions,
          config: (gateway.config || {}) as Json,
          sort_order: gateway.sort_order,
        });

      if (error) throw error;

      toast({
        title: 'Gateway Created',
        description: 'Payment gateway has been added',
      });

      await fetchGateways();
    } catch (error: any) {
      console.error('Error creating payment gateway:', error);
      toast({
        title: 'Error',
        description: 'Failed to create gateway',
        variant: 'destructive',
      });
    }
  };

  const deleteGateway = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_gateway_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Gateway Deleted',
        description: 'Payment gateway has been removed',
      });

      await fetchGateways();
    } catch (error: any) {
      console.error('Error deleting payment gateway:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete gateway',
        variant: 'destructive',
      });
    }
  };

  return {
    gateways,
    loading,
    fetchGateways,
    updateGateway,
    createGateway,
    deleteGateway,
  };
}
