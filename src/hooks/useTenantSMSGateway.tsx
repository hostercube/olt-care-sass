import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantSMSGateway {
  id: string;
  tenant_id: string;
  provider: string;
  api_key: string | null;
  api_url: string | null;
  sender_id: string | null;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useTenantSMSGateway() {
  const { tenantId } = useTenantContext();
  const [settings, setSettings] = useState<TenantSMSGateway | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async (forTenantId?: string) => {
    const targetTenantId = forTenantId || tenantId;
    if (!targetTenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_sms_gateways')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data as TenantSMSGateway | null);
    } catch (err) {
      console.error('Error fetching tenant SMS gateway:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [tenantId, fetchSettings]);

  const updateSettings = async (updates: Partial<TenantSMSGateway>) => {
    if (!tenantId) return;

    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('tenant_sms_gateways')
          .update(updates as any)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_sms_gateways')
          .insert({ ...updates, tenant_id: tenantId } as any);

        if (error) throw error;
      }

      toast.success('SMS gateway settings updated');
      await fetchSettings();
    } catch (err) {
      console.error('Error updating SMS gateway:', err);
      toast.error('Failed to update SMS gateway');
      throw err;
    }
  };

  const sendTestSMS = async (phoneNumber: string, message: string) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase.from('sms_logs').insert({
        tenant_id: tenantId,
        phone_number: phoneNumber,
        message: message,
        status: 'pending',
      });

      if (error) throw error;
      toast.success('Test SMS queued for delivery');
    } catch (err) {
      console.error('Error sending test SMS:', err);
      toast.error('Failed to queue test SMS');
    }
  };

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    sendTestSMS,
  };
}
