import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface SMSGatewaySettings {
  id: string;
  provider: string;
  api_key: string | null;
  api_url: string | null;
  sender_id: string | null;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SMSLog {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  tenant_id: string | null;
  provider_response: Record<string, unknown> | null;
  created_at: string;
}

// SMS NOC API configuration
// API Endpoint: https://app.smsnoc.com/api/v3/sms/send
// Headers: Authorization: Bearer {api_token}, Accept: application/json
// Body: { recipient: string, sender_id: string, type: "plain", message: string }

export function useSMSGateway() {
  const [settings, setSettings] = useState<SMSGatewaySettings | null>(null);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_gateway_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setSettings(data as SMSGatewaySettings | null);
    } catch (error: any) {
      console.error('Error fetching SMS gateway settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as SMSLog[]);
    } catch (error: any) {
      console.error('Error fetching SMS logs:', error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, [fetchSettings, fetchLogs]);

  const updateSettings = async (updates: Partial<SMSGatewaySettings>) => {
    try {
      const updateData: any = { ...updates };
      if (updates.config) {
        updateData.config = updates.config as Json;
      }

      if (settings?.id) {
        const { error } = await supabase
          .from('sms_gateway_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_gateway_settings')
          .insert({
            provider: updates.provider || 'smsnoc',
            api_key: updates.api_key || null,
            api_url: updates.api_url || null,
            sender_id: updates.sender_id || null,
            is_enabled: updates.is_enabled ?? false,
            config: (updates.config || {}) as Json,
          });

        if (error) throw error;
      }

      toast({
        title: 'Settings Updated',
        description: 'SMS gateway settings have been saved',
      });

      await fetchSettings();
    } catch (error: any) {
      console.error('Error updating SMS gateway settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  const sendTestSMS = async (phoneNumber: string, message: string) => {
    try {
      // Send SMS instantly via edge function
      const response = await supabase.functions.invoke('send-sms', {
        body: { phone: phoneNumber, message }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to send SMS');
      }

      toast({
        title: 'SMS Sent',
        description: `Test SMS sent to ${phoneNumber} successfully.`,
      });

      await fetchLogs();
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test SMS',
        variant: 'destructive',
      });
    }
  };

  return {
    settings,
    logs,
    loading,
    fetchSettings,
    fetchLogs,
    updateSettings,
    sendTestSMS,
  };
}
