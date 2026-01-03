import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantEmailGateway {
  id: string;
  tenant_id: string;
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null;
  use_tls: boolean;
  sender_name: string | null;
  sender_email: string | null;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useTenantEmailGateway() {
  const { tenantId } = useTenantContext();
  const [settings, setSettings] = useState<TenantEmailGateway | null>(null);
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
        .from('tenant_email_gateways')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data as TenantEmailGateway | null);
    } catch (err) {
      console.error('Error fetching tenant email gateway:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [tenantId, fetchSettings]);

  const updateSettings = async (updates: Partial<TenantEmailGateway>) => {
    if (!tenantId) return;

    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('tenant_email_gateways')
          .update(updates as any)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_email_gateways')
          .insert({ ...updates, tenant_id: tenantId } as any);

        if (error) throw error;
      }

      toast.success('Email gateway settings updated');
      await fetchSettings();
    } catch (err) {
      console.error('Error updating email gateway:', err);
      toast.error('Failed to update email gateway');
      throw err;
    }
  };

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
  };
}
