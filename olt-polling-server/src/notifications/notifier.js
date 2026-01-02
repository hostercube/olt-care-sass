/**
 * Notification System - Handles Email (SMTP), Telegram, WhatsApp notifications
 * All settings are fetched from system_settings table in Supabase
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const SETTINGS_CACHE_MS = 30_000;
let cached = { ts: 0, settings: null };

function unwrapSettingRow(row) {
  const v = row?.value;
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return v;
}

/**
 * Get all notification settings from database
 */
export async function getNotificationSettings(supabase) {
  if (cached.settings && Date.now() - cached.ts < SETTINGS_CACHE_MS) return cached.settings;

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [
      // Alert thresholds
      'rxPowerThreshold',
      'offlineThreshold',
      'onuOfflineAlerts',
      'powerDropAlerts',
      'oltUnreachableAlerts',
      // Email SMTP settings
      'emailNotifications',
      'notificationEmail',
      'smtpHost',
      'smtpPort',
      'smtpUser',
      'smtpPassword',
      'smtpFromEmail',
      'smtpFromName',
      // Telegram settings
      'telegramNotifications',
      'telegramBotToken',
      'telegramChatId',
      // WhatsApp settings (using WhatsApp Business API or third-party like Twilio)
      'whatsappNotifications',
      'whatsappApiUrl',
      'whatsappApiKey',
      'whatsappPhoneNumber',
      // Webhook settings
      'webhookNotifications',
      'webhookUrl',
      // Mail template
      'mailFromName',
    ]);

  if (error) {
    logger.warn(`Failed to load notification settings: ${error.message}`);
    return getDefaultSettings();
  }

  const map = {};
  for (const row of data || []) {
    map[row.key] = unwrapSettingRow(row);
  }

  const settings = {
    // Alert thresholds
    rxPowerThreshold: Number.isFinite(Number(map.rxPowerThreshold)) ? Number(map.rxPowerThreshold) : -28,
    offlineThreshold: Number.isFinite(Number(map.offlineThreshold)) ? Number(map.offlineThreshold) : 5,
    onuOfflineAlerts: map.onuOfflineAlerts !== false,
    powerDropAlerts: map.powerDropAlerts !== false,
    oltUnreachableAlerts: map.oltUnreachableAlerts !== false,
    // Email SMTP
    emailNotifications: map.emailNotifications === true,
    notificationEmail: typeof map.notificationEmail === 'string' ? map.notificationEmail : '',
    smtpHost: typeof map.smtpHost === 'string' ? map.smtpHost : '',
    smtpPort: Number.isFinite(Number(map.smtpPort)) ? Number(map.smtpPort) : 587,
    smtpUser: typeof map.smtpUser === 'string' ? map.smtpUser : '',
    smtpPassword: typeof map.smtpPassword === 'string' ? map.smtpPassword : '',
    smtpFromEmail: typeof map.smtpFromEmail === 'string' ? map.smtpFromEmail : '',
    smtpFromName: typeof map.smtpFromName === 'string' ? map.smtpFromName : 'OLTCARE',
    // Telegram
    telegramNotifications: map.telegramNotifications === true,
    telegramBotToken: typeof map.telegramBotToken === 'string' ? map.telegramBotToken : '',
    telegramChatId: typeof map.telegramChatId === 'string' ? map.telegramChatId : '',
    // WhatsApp
    whatsappNotifications: map.whatsappNotifications === true,
    whatsappApiUrl: typeof map.whatsappApiUrl === 'string' ? map.whatsappApiUrl : '',
    whatsappApiKey: typeof map.whatsappApiKey === 'string' ? map.whatsappApiKey : '',
    whatsappPhoneNumber: typeof map.whatsappPhoneNumber === 'string' ? map.whatsappPhoneNumber : '',
    // Webhook
    webhookNotifications: map.webhookNotifications === true,
    webhookUrl: typeof map.webhookUrl === 'string' ? map.webhookUrl : '',
    // Mail template
    mailFromName: typeof map.mailFromName === 'string' ? map.mailFromName : 'OLTCARE',
  };

  cached = { ts: Date.now(), settings };
  return settings;
}

function getDefaultSettings() {
  return {
    rxPowerThreshold: -28,
    offlineThreshold: 5,
    onuOfflineAlerts: true,
    powerDropAlerts: true,
    oltUnreachableAlerts: true,
    emailNotifications: false,
    notificationEmail: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: 'OLTCARE',
    telegramNotifications: false,
    telegramBotToken: '',
    telegramChatId: '',
    whatsappNotifications: false,
    whatsappApiUrl: '',
    whatsappApiKey: '',
    whatsappPhoneNumber: '',
    webhookNotifications: false,
    webhookUrl: '',
    mailFromName: 'OLTCARE',
  };
}

/**
 * Create SMTP transporter
 */
function createSmtpTransporter(settings) {
  if (!settings.smtpHost || !settings.smtpUser) {
    return null;
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
  });
}

/**
 * Generate HTML email template
 */
function generateEmailHtml(alert, settings) {
  const severityColor = {
    critical: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  const fromName = settings.mailFromName || settings.smtpFromName || 'OLTCARE';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fromName} Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 24px 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${fromName}</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Network Monitoring System</p>
            </td>
          </tr>
          
          <!-- Alert Badge -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <span style="display: inline-block; background-color: ${severityColor[alert.severity] || '#64748b'}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${alert.severity.toUpperCase()} ALERT
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 30px;">
              <h2 style="margin: 0 0 16px 0; color: #f1f5f9; font-size: 20px; font-weight: 600;">
                ${alert.type === 'onu_offline' ? '🔴 ONU Offline' : 
                  alert.type === 'power_drop' ? '⚡ Power Drop Detected' : 
                  alert.type === 'olt_unreachable' ? '🚫 OLT Unreachable' : '⚠️ Alert'}
              </h2>
              <p style="margin: 0; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                ${alert.message}
              </p>
            </td>
          </tr>
          
          <!-- Details Card -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #334155;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Device</span><br>
                          <span style="color: #e2e8f0; font-size: 16px; font-weight: 500;">${alert.device_name || 'Unknown'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #334155;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Alert Type</span><br>
                          <span style="color: #e2e8f0; font-size: 16px; font-weight: 500;">${alert.type.replace(/_/g, ' ').toUpperCase()}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time</span><br>
                          <span style="color: #e2e8f0; font-size: 16px; font-weight: 500;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated alert from ${fromName}.<br>
                You can configure notification settings in the admin panel.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send email notification via SMTP
 */
async function sendEmailNotification(settings, alert) {
  if (!settings.emailNotifications || !settings.notificationEmail) {
    return { success: false, reason: 'Email notifications disabled' };
  }

  const transporter = createSmtpTransporter(settings);
  if (!transporter) {
    return { success: false, reason: 'SMTP not configured' };
  }

  try {
    const fromName = settings.mailFromName || settings.smtpFromName || 'OLTCARE';
    const fromEmail = settings.smtpFromEmail || settings.smtpUser;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: settings.notificationEmail,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type.replace(/_/g, ' ')} - ${alert.device_name || 'Alert'}`,
      html: generateEmailHtml(alert, settings),
    });

    logger.info(`Email notification sent to ${settings.notificationEmail}`);
    return { success: true };
  } catch (error) {
    logger.error(`Email notification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send Telegram notification
 */
async function sendTelegramNotification(settings, alert) {
  if (!settings.telegramNotifications || !settings.telegramBotToken || !settings.telegramChatId) {
    return { success: false, reason: 'Telegram notifications disabled' };
  }

  try {
    const emoji = {
      critical: '🔴',
      warning: '🟠',
      info: '🔵',
    };

    const message = `
${emoji[alert.severity] || '⚠️'} *${alert.severity.toUpperCase()} ALERT*

📍 *Device:* ${alert.device_name || 'Unknown'}
📋 *Type:* ${alert.type.replace(/_/g, ' ')}
📝 *Message:* ${alert.message}
🕐 *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}

_${settings.mailFromName || 'OLTCARE'} Monitoring System_
    `.trim();

    const response = await fetch(
      `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.description || 'Telegram API error');
    }

    logger.info(`Telegram notification sent to chat ${settings.telegramChatId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Telegram notification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp notification (using third-party API like Twilio, WATI, etc.)
 */
async function sendWhatsAppNotification(settings, alert) {
  if (!settings.whatsappNotifications || !settings.whatsappApiUrl || !settings.whatsappPhoneNumber) {
    return { success: false, reason: 'WhatsApp notifications disabled' };
  }

  try {
    const message = `
⚠️ *${settings.mailFromName || 'OLTCARE'} Alert*

Type: ${alert.type.replace(/_/g, ' ')}
Severity: ${alert.severity.toUpperCase()}
Device: ${alert.device_name || 'Unknown'}
Message: ${alert.message}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
    `.trim();

    const response = await fetch(settings.whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.whatsappApiKey ? { 'Authorization': `Bearer ${settings.whatsappApiKey}` } : {}),
      },
      body: JSON.stringify({
        phone: settings.whatsappPhoneNumber,
        message: message,
        // Common fields for various WhatsApp APIs
        to: settings.whatsappPhoneNumber,
        body: message,
        text: message,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${text}`);
    }

    logger.info(`WhatsApp notification sent to ${settings.whatsappPhoneNumber}`);
    return { success: true };
  } catch (error) {
    logger.error(`WhatsApp notification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(settings, alert) {
  if (!settings.webhookNotifications || !settings.webhookUrl) {
    return { success: false, reason: 'Webhook notifications disabled' };
  }

  try {
    const response = await fetch(settings.webhookUrl, {
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
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook error: ${response.status} ${text}`);
    }

    logger.info(`Webhook notification sent to ${settings.webhookUrl}`);
    return { success: true };
  } catch (error) {
    logger.error(`Webhook notification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send alert notification via all enabled channels
 */
export async function notifyAlert(supabase, settings, alert) {
  const tasks = [];

  if (settings.emailNotifications) {
    tasks.push(sendEmailNotification(settings, alert).catch(e => ({ success: false, error: e.message })));
  }

  if (settings.telegramNotifications) {
    tasks.push(sendTelegramNotification(settings, alert).catch(e => ({ success: false, error: e.message })));
  }

  if (settings.whatsappNotifications) {
    tasks.push(sendWhatsAppNotification(settings, alert).catch(e => ({ success: false, error: e.message })));
  }

  if (settings.webhookNotifications) {
    tasks.push(sendWebhookNotification(settings, alert).catch(e => ({ success: false, error: e.message })));
  }

  const results = await Promise.all(tasks);
  return results;
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(settings) {
  const transporter = createSmtpTransporter(settings);
  if (!transporter) {
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(settings, toEmail) {
  const testAlert = {
    type: 'test_notification',
    severity: 'info',
    device_name: 'Test Device',
    message: 'This is a test notification from your OLTCARE system. If you received this, your email notifications are working correctly.',
  };

  const modifiedSettings = { ...settings, notificationEmail: toEmail };
  return sendEmailNotification(modifiedSettings, testAlert);
}

/**
 * Send test Telegram message
 */
export async function sendTestTelegram(settings) {
  const testAlert = {
    type: 'test_notification',
    severity: 'info',
    device_name: 'Test Device',
    message: 'This is a test notification from your OLTCARE system. If you received this, your Telegram notifications are working correctly.',
  };

  return sendTelegramNotification(settings, testAlert);
}

/**
 * Send test WhatsApp message
 */
export async function sendTestWhatsApp(settings) {
  const testAlert = {
    type: 'test_notification',
    severity: 'info',
    device_name: 'Test Device',
    message: 'This is a test notification from your OLTCARE system. If you received this, your WhatsApp notifications are working correctly.',
  };

  return sendWhatsAppNotification(settings, testAlert);
}

export { sendEmailNotification, sendTelegramNotification, sendWhatsAppNotification, sendWebhookNotification };
