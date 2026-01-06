import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface PlatformSettings {
  platformName?: string;
  platformEmail?: string;
  platformPhone?: string;
  supportEmail?: string;
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  dateFormat?: string;
  enableSignup?: boolean;
  requireEmailVerification?: boolean;
  enableCaptcha?: boolean;
  captchaSiteKey?: string;
  captchaSecretKey?: string;
  defaultTrialDays?: number;
  autoSuspendDays?: number;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  pollingServerUrl?: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'ISP Point',
  currency: 'BDT',
  currencySymbol: '৳',
  timezone: 'Asia/Dhaka',
  enableSignup: true,
  defaultTrialDays: 14,
  autoSuspendDays: 7,
  maintenanceMode: false,
  pollingServerUrl: '',
};

// Parse value from system_settings table format
const parseSettingValue = (value: Json): unknown => {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return (value as { value: unknown }).value;
  }
  return value;
};

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch from system_settings table - works without auth for public settings
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching platform settings:', error);
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      if (data && data.length > 0) {
        const parsed: Partial<PlatformSettings> = {};
        
        // Map system_settings keys to PlatformSettings
        const keyMap: Record<string, keyof PlatformSettings> = {
          platformName: 'platformName',
          platformEmail: 'platformEmail',
          platformPhone: 'platformPhone',
          supportEmail: 'supportEmail',
          currency: 'currency',
          currencySymbol: 'currencySymbol',
          timezone: 'timezone',
          dateFormat: 'dateFormat',
          enableSignup: 'enableSignup',
          requireEmailVerification: 'requireEmailVerification',
          enableCaptcha: 'enableCaptcha',
          captchaSiteKey: 'captchaSiteKey',
          captchaSecretKey: 'captchaSecretKey',
          defaultTrialDays: 'defaultTrialDays',
          autoSuspendDays: 'autoSuspendDays',
          maintenanceMode: 'maintenanceMode',
          maintenanceMessage: 'maintenanceMessage',
          pollingServerUrl: 'pollingServerUrl',
        };

        data.forEach(({ key, value }) => {
          if (key in keyMap) {
            const settingKey = keyMap[key];
            const parsedValue = parseSettingValue(value);
            (parsed as Record<string, unknown>)[settingKey] = parsedValue;
          }
        });

        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

// Convenience hook for just the polling server URL
export function usePollingServerUrl() {
  const { settings, loading } = usePlatformSettings();
  return { pollingServerUrl: settings.pollingServerUrl || '', loading };
}

// Hook to save platform settings (for Super Admin)
export function useSavePlatformSettings() {
  const [saving, setSaving] = useState(false);

  const saveSettings = async (settings: PlatformSettings): Promise<{ success: boolean; error?: string }> => {
    setSaving(true);
    try {
      // Save each setting to system_settings table
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          const { error } = await supabase
            .from('system_settings')
            .upsert({
              key,
              value: { value } as Json,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });

          if (error) throw error;
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error saving platform settings:', error);
      return { success: false, error: error.message || 'Failed to save settings' };
    } finally {
      setSaving(false);
    }
  };

  return { saveSettings, saving };
}
