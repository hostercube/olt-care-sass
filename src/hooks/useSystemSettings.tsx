import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface SystemSettings {
  // General
  systemName: string;
  timezone: string;
  autoRefresh: boolean;
  showOfflineFirst: boolean;

  // Polling
  oltPollInterval: number;
  onuPollInterval: number;
  backgroundPolling: boolean;
  storePowerHistory: boolean;
  historyRetention: number;
  apiServerUrl: string;

  // Alerts
  rxPowerThreshold: number;
  offlineThreshold: number;
  onuOfflineAlerts: boolean;
  powerDropAlerts: boolean;
  oltUnreachableAlerts: boolean;
  emailNotifications: boolean;
  notificationEmail: string;
  webhookNotifications: boolean;
  webhookUrl: string;

  // Integrations (MikroTik)
  mikrotikMatchExactMac: boolean;
  mikrotikMatchLast6Mac: boolean;
  mikrotikMatchSerialOrComment: boolean;

  // Security
  twoFactorAuth: boolean;
  sessionTimeout: number;
  allowUserRegistration: boolean;
}

const defaultSettings: SystemSettings = {
  systemName: 'OLTCARE',
  timezone: 'asia_dhaka',
  autoRefresh: true,
  showOfflineFirst: true,
  oltPollInterval: 5,
  onuPollInterval: 5,
  backgroundPolling: true,
  storePowerHistory: true,
  historyRetention: 30,
  apiServerUrl: '',
  rxPowerThreshold: -25,
  offlineThreshold: 5,
  onuOfflineAlerts: true,
  powerDropAlerts: true,
  oltUnreachableAlerts: true,
  emailNotifications: false,
  notificationEmail: '',
  webhookNotifications: false,
  webhookUrl: '',
  mikrotikMatchExactMac: true,
  mikrotikMatchLast6Mac: true,
  mikrotikMatchSerialOrComment: true,
  twoFactorAuth: false,
  sessionTimeout: 30,
  allowUserRegistration: true,
};

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsFromDb: Partial<SystemSettings> = {};
        data.forEach(({ key, value }) => {
          if (key in defaultSettings) {
            // Handle JSON values properly
            const typedValue = value as Json;
            if (typeof typedValue === 'object' && typedValue !== null && 'value' in typedValue) {
              settingsFromDb[key as keyof SystemSettings] = (typedValue as { value: unknown }).value as never;
            } else {
              settingsFromDb[key as keyof SystemSettings] = typedValue as never;
            }
          }
        });
        setSettings({ ...defaultSettings, ...settingsFromDb });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Upsert all settings
      const upserts = Object.entries(settings).map(([key, value]) => ({
        key,
        value: { value } as Json,
        updated_at: new Date().toISOString(),
      }));

      for (const upsert of upserts) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(upsert, { onConflict: 'key' });

        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Your settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. You may not have permission.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateSetting,
    saveSettings,
    resetSettings: () => setSettings(defaultSettings),
  };
}

// Hook to check if registration is allowed (used in Auth page)
export function useRegistrationStatus() {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistrationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'allowUserRegistration')
          .maybeSingle();

        if (error) throw error;

        if (data?.value) {
          const typedValue = data.value as { value?: boolean };
          setAllowRegistration(typedValue.value !== false);
        }
      } catch (error) {
        console.error('Error fetching registration status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrationStatus();
  }, []);

  return { allowRegistration, loading };
}
