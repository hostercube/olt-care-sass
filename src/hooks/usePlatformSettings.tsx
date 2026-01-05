import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Use public backend function so tenant users (and login page) can read safe platform settings
      const { data, error } = await supabase.functions.invoke('public-platform-settings');
      if (error) throw error;

      const s = ((data as any)?.settings ?? null) as PlatformSettings | null;
      if (s) {
        setSettings({ ...DEFAULT_SETTINGS, ...s });
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
