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

  const updateGateway = async (id: string, updates: Partial<PaymentGatewaySettings>) => {
    try {
      const updateData: any = { ...updates };
      if (updates.config) {
        updateData.config = updates.config as Json;
      }

      const { error } = await supabase
        .from('payment_gateway_settings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Gateway Updated',
        description: 'Payment gateway settings have been saved',
      });

      await fetchGateways();
    } catch (error: any) {
      console.error('Error updating payment gateway:', error);
      toast({
        title: 'Error',
        description: 'Failed to update gateway',
        variant: 'destructive',
      });
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
