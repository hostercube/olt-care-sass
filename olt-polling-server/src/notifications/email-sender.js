/**
 * Email Sender Module - Handles sending emails via SMTP
 * Processes pending emails from email_logs table
 * 
 * IMPORTANT: Only SMTP is supported. PHP Mail option will also use SMTP if configured,
 * otherwise emails will fail with a clear error message.
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const EMAIL_SETTINGS_CACHE_MS = 30_000;
let cachedSettings = { ts: 0, settings: null };

/**
 * Get email gateway settings from database
 */
export async function getEmailGatewaySettings(supabase) {
  if (cachedSettings.settings && Date.now() - cachedSettings.ts < EMAIL_SETTINGS_CACHE_MS) {
    return cachedSettings.settings;
  }

  const { data, error } = await supabase
    .from('email_gateway_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    logger.warn(`Failed to load email gateway settings: ${error.message}`);
    return null;
  }

  cachedSettings = { ts: Date.now(), settings: data };
  return data;
}

/**
 * Clear settings cache
 */
export function clearEmailSettingsCache() {
  cachedSettings = { ts: 0, settings: null };
}

/**
 * Create SMTP transporter
 * PHP Mail mode is NOT supported on VPS - must use SMTP
 */
function createSmtpTransporter(settings) {
  // Require SMTP configuration for all providers
  if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
    logger.error('SMTP not configured. Please configure SMTP settings in Email Gateway.');
    return null;
  }

  const port = settings.smtp_port || 587;
  const secure = port === 465;

  logger.info(`Creating SMTP transporter: ${settings.smtp_host}:${port} (secure: ${secure})`);

  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: port,
    secure: secure,
    auth: {
      user: settings.smtp_username,
      pass: settings.smtp_password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Generate HTML email template for general emails
 */
function generateEmailHtml(subject, message, senderName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 24px 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${senderName || 'ISP Point'}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px 0; color: #f1f5f9; font-size: 20px; font-weight: 600;">
                ${subject}
              </h2>
              <div style="color: #94a3b8; font-size: 16px; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This email was sent by ${senderName || 'ISP Point'}.
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
 * Send a single email
 */
async function sendEmail(settings, recipientEmail, subject, message) {
  if (!settings.is_enabled) {
    return { success: false, error: 'Email gateway is disabled' };
  }

  const transporter = createSmtpTransporter(settings);
  if (!transporter) {
    return { success: false, error: 'SMTP not configured. Please configure SMTP host, username, and password in Email Gateway settings.' };
  }

  try {
    const fromName = settings.sender_name || 'ISP Point';
    const fromEmail = settings.sender_email || settings.smtp_username || 'noreply@example.com';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
      html: generateEmailHtml(subject, message, fromName),
      text: message,
    });

    logger.info(`Email sent successfully to ${recipientEmail}: ${subject}`);
    return { success: true };
  } catch (error) {
    logger.error(`Email send failed to ${recipientEmail}: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    transporter.close();
  }
}

/**
 * Process pending emails from email_logs table
 */
export async function processPendingEmails(supabase) {
  // Get email gateway settings
  const settings = await getEmailGatewaySettings(supabase);
  
  if (!settings || !settings.is_enabled) {
    logger.debug('Email gateway not enabled, skipping email processing');
    return { processed: 0, sent: 0, failed: 0 };
  }

  // Get pending emails (limit to 50 per batch)
  const { data: pendingEmails, error: fetchError } = await supabase
    .from('email_logs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (fetchError) {
    logger.error(`Failed to fetch pending emails: ${fetchError.message}`);
    return { processed: 0, sent: 0, failed: 0 };
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  logger.info(`Processing ${pendingEmails.length} pending emails...`);

  let sent = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    const result = await sendEmail(
      settings,
      email.recipient_email,
      email.subject,
      email.message
    );

    if (result.success) {
      sent++;
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', email.id);
    } else {
      failed++;
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: result.error || 'Unknown error',
        })
        .eq('id', email.id);
    }

    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  logger.info(`Email processing complete: ${sent} sent, ${failed} failed`);
  return { processed: pendingEmails.length, sent, failed };
}

/**
 * Get tenant email gateway settings
 */
export async function getTenantEmailGatewaySettings(supabase, tenantId) {
  const { data, error } = await supabase
    .from('tenant_email_gateways')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    logger.warn(`Failed to load tenant email gateway for ${tenantId}: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Process tenant-specific pending emails (for tenant email gateways)
 */
export async function processTenantPendingEmails(supabase, tenantId) {
  // Get tenant-specific email gateway settings
  const settings = await getTenantEmailGatewaySettings(supabase, tenantId);
  
  // Fall back to global settings if tenant doesn't have their own
  const effectiveSettings = settings?.is_enabled 
    ? settings 
    : await getEmailGatewaySettings(supabase);
  
  if (!effectiveSettings || !effectiveSettings.is_enabled) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  // Get pending emails for this tenant
  const { data: pendingEmails, error: fetchError } = await supabase
    .from('email_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (fetchError || !pendingEmails || pendingEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    const result = await sendEmail(
      effectiveSettings,
      email.recipient_email,
      email.subject,
      email.message
    );

    if (result.success) {
      sent++;
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', email.id);
    } else {
      failed++;
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: result.error || 'Unknown error',
        })
        .eq('id', email.id);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return { processed: pendingEmails.length, sent, failed };
}
