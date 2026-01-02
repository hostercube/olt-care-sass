import { useState, useCallback, useEffect } from 'react';
import { useSystemSettings } from './useSystemSettings';
import { useToast } from './use-toast';

/**
 * Hook to trigger on-demand real-time status polling from VPS
 * This only hits MikroTik for PPPoE session status - doesn't overload OLT
 */
export function useRealtimePolling() {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const { settings } = useSystemSettings();
  const { toast } = useToast();

  const triggerRealtimePoll = useCallback(async () => {
    if (isPolling) return;
    if (!settings.apiServerUrl) {
      console.warn('No polling server URL configured');
      return;
    }

    setIsPolling(true);

    try {
      // Build the base URL properly
      let baseUrl = settings.apiServerUrl;
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
      }
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const response = await fetch(`${baseUrl}/api/realtime-status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const result = await response.json();
      setLastPolled(new Date());

      if (result.onus_updated > 0) {
        toast({
          title: 'Status Updated',
          description: `${result.onus_updated} ONU(s) status refreshed in ${result.duration_ms}ms`,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Realtime poll error:', error);
      // Don't show error toast - silent fail is better for auto-polling
      return null;
    } finally {
      setIsPolling(false);
    }
  }, [isPolling, settings.apiServerUrl, toast]);

  return {
    triggerRealtimePoll,
    isPolling,
    lastPolled,
    hasApiServer: !!settings.apiServerUrl,
  };
}

/**
 * Hook that auto-triggers realtime poll when component mounts
 * and optionally on interval (only if cron mode is enabled)
 */
export function useAutoRealtimePolling(enabled: boolean = true) {
  const { triggerRealtimePoll, isPolling, lastPolled, hasApiServer } = useRealtimePolling();
  const { settings } = useSystemSettings();

  useEffect(() => {
    if (!enabled || !hasApiServer) return;

    // Trigger once on mount (when user views the page)
    triggerRealtimePoll();

    // Only set up interval if light_cron mode and auto-refresh enabled
    if (settings.pollingMode !== 'on_demand' && settings.autoRefresh) {
      const intervalMs = (settings.cronIntervalMinutes || 10) * 60 * 1000;
      const interval = setInterval(triggerRealtimePoll, intervalMs);
      return () => clearInterval(interval);
    }
  }, [enabled, hasApiServer, settings.pollingMode, settings.cronIntervalMinutes, settings.autoRefresh]);

  return { isPolling, lastPolled, hasApiServer, triggerRealtimePoll };
}
