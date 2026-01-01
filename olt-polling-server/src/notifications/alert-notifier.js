import { logger } from '../utils/logger.js';

const SETTINGS_CACHE_MS = 30_000;
let cached = { ts: 0, settings: null };

function unwrapSettingRow(row) {
  // system_settings.value is jsonb like { value: ... }
  const v = row?.value;
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return v;
}

export async function getAlertNotificationSettings(supabase) {
  if (cached.settings && Date.now() - cached.ts < SETTINGS_CACHE_MS) return cached.settings;

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [
      'rxPowerThreshold',
      'offlineThreshold',
      'onuOfflineAlerts',
      'powerDropAlerts',
      'oltUnreachableAlerts',
      'emailNotifications',
      'notificationEmail',
      'webhookNotifications',
      'webhookUrl',
    ]);

  if (error) {
    logger.warn(`Failed to load system settings for notifications: ${error.message}`);
    // Safe defaults
    return {
      rxPowerThreshold: -28,
      offlineThreshold: 5,
      onuOfflineAlerts: true,
      powerDropAlerts: true,
      emailNotifications: false,
      notificationEmail: '',
      webhookNotifications: false,
      webhookUrl: '',
    };
  }

  const map = {};
  for (const row of data || []) {
    map[row.key] = unwrapSettingRow(row);
  }

  const settings = {
    rxPowerThreshold: Number.isFinite(Number(map.rxPowerThreshold)) ? Number(map.rxPowerThreshold) : -28,
    offlineThreshold: Number.isFinite(Number(map.offlineThreshold)) ? Number(map.offlineThreshold) : 5,
    onuOfflineAlerts: map.onuOfflineAlerts !== false,
    powerDropAlerts: map.powerDropAlerts !== false,
    emailNotifications: map.emailNotifications === true,
    notificationEmail: typeof map.notificationEmail === 'string' ? map.notificationEmail : '',
    webhookNotifications: map.webhookNotifications === true,
    webhookUrl: typeof map.webhookUrl === 'string' ? map.webhookUrl : '',
  };

  cached = { ts: Date.now(), settings };
  return settings;
}

export async function notifyAlert(supabase, settings, alert) {
  // alert: { type, severity, device_name, message }
  const tasks = [];

  if (settings.emailNotifications && settings.notificationEmail) {
    tasks.push(
      supabase.functions
        .invoke('send-alert-email', {
          body: {
            alertType: alert.type,
            deviceName: alert.device_name || 'Device',
            message: alert.message,
            severity: alert.severity,
          },
        })
        .then(({ error }) => {
          if (error) logger.warn(`Email notify failed: ${error.message}`);
        })
        .catch((e) => logger.warn(`Email notify exception: ${e.message}`))
    );
  }

  if (settings.webhookNotifications && settings.webhookUrl) {
    tasks.push(
      fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'alert',
          alertType: alert.type,
          severity: alert.severity,
          deviceName: alert.device_name,
          message: alert.message,
          createdAt: new Date().toISOString(),
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const t = await res.text().catch(() => '');
            logger.warn(`Webhook notify failed: HTTP ${res.status} ${t}`);
          }
        })
        .catch((e) => logger.warn(`Webhook notify exception: ${e.message}`))
    );
  }

  await Promise.all(tasks);
}
