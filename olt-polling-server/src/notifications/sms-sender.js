/**
 * SMS Sender Module - Handles sending SMS via various providers
 * Supports: SMS NOC, MIM SMS, SSL Wireless
 */

import { logger } from '../utils/logger.js';

const SMS_SETTINGS_CACHE_MS = 30_000;
let cachedSettings = { ts: 0, settings: null };

/**
 * Get SMS gateway settings from database
 */
export async function getSMSGatewaySettings(supabase) {
  if (cachedSettings.settings && Date.now() - cachedSettings.ts < SMS_SETTINGS_CACHE_MS) {
    return cachedSettings.settings;
  }

  const { data, error } = await supabase
    .from('sms_gateway_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    logger.warn(`Failed to load SMS gateway settings: ${error.message}`);
    return null;
  }

  cachedSettings = { ts: Date.now(), settings: data };
  return data;
}

/**
 * Send SMS via SMS NOC API
 * API: https://app.smsnoc.com/api/v3/sms/send
 */
async function sendSMSNOC(settings, phone, message) {
  try {
    const apiUrl = settings.api_url || 'https://app.smsnoc.com/api/v3/sms/send';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: phone,
        sender_id: settings.sender_id || 'ISPPOINT',
        type: 'plain',
        message,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      logger.info(`SMS NOC: Sent to ${phone}`);
      return { success: true, response: data };
    }
    
    logger.warn(`SMS NOC error: ${data.message || 'Unknown error'}`);
    return { success: false, error: data.message || 'SMS NOC API error', response: data };
  } catch (e) {
    logger.error(`SMS NOC exception: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Send SMS via MIM SMS API
 * API: https://esms.mimsms.com/smsapi
 */
async function sendMIMSMS(settings, phone, message) {
  try {
    const apiUrl = settings.api_url || 'https://esms.mimsms.com/smsapi';
    const params = new URLSearchParams({
      api_key: settings.api_key,
      type: 'text',
      contacts: phone,
      senderid: settings.sender_id || 'ISPPOINT',
      msg: message,
    });

    const response = await fetch(`${apiUrl}?${params}`);
    const text = await response.text();
    
    if (text.includes('SMS SUBMITTED')) {
      logger.info(`MIM SMS: Sent to ${phone}`);
      return { success: true, response: { message: text } };
    }
    
    logger.warn(`MIM SMS error: ${text}`);
    return { success: false, error: text };
  } catch (e) {
    logger.error(`MIM SMS exception: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Send SMS via SSL Wireless API
 * API: https://sms.sslwireless.com/api/v3/send-sms
 */
async function sendSSLWireless(settings, phone, message) {
  try {
    const apiUrl = settings.api_url || 'https://sms.sslwireless.com/api/v3/send-sms';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_token: settings.api_key,
        sid: settings.sender_id,
        msisdn: phone,
        sms: message,
        csms_id: Date.now().toString(),
      }),
    });

    const data = await response.json();
    
    if (data.status === 'SUCCESS') {
      logger.info(`SSL Wireless: Sent to ${phone}`);
      return { success: true, response: data };
    }
    
    logger.warn(`SSL Wireless error: ${data.status_message || 'Unknown error'}`);
    return { success: false, error: data.status_message || 'SSL Wireless API error', response: data };
  } catch (e) {
    logger.error(`SSL Wireless exception: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Send SMS using configured provider
 */
export async function sendSMS(settings, phone, message) {
  if (!settings || !settings.is_enabled) {
    return { success: false, error: 'SMS gateway not configured or disabled' };
  }

  if (!phone || !message) {
    return { success: false, error: 'Phone and message are required' };
  }

  switch (settings.provider) {
    case 'smsnoc':
      return sendSMSNOC(settings, phone, message);
    case 'mimsms':
      return sendMIMSMS(settings, phone, message);
    case 'sslwireless':
      return sendSSLWireless(settings, phone, message);
    default:
      return { success: false, error: `Unsupported provider: ${settings.provider}` };
  }
}

/**
 * Process pending SMS from sms_logs table
 */
export async function processPendingSMS(supabase) {
  try {
    // Get pending SMS from sms_logs
    const { data: pendingSMS, error: fetchError } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      logger.error(`Failed to fetch pending SMS: ${fetchError.message}`);
      return;
    }

    if (!pendingSMS || pendingSMS.length === 0) {
      // Also check sms_queue for tenant SMS
      await processSMSQueue(supabase);
      return;
    }

    logger.info(`Processing ${pendingSMS.length} pending SMS from sms_logs`);

    // Get SMS gateway settings
    const settings = await getSMSGatewaySettings(supabase);
    if (!settings || !settings.is_enabled) {
      logger.warn('SMS gateway not configured or disabled, skipping...');
      return;
    }

    // Process each SMS
    for (const sms of pendingSMS) {
      try {
        const result = await sendSMS(settings, sms.phone_number, sms.message);
        
        // Update status in database
        const { error: updateError } = await supabase
          .from('sms_logs')
          .update({
            status: result.success ? 'sent' : 'failed',
            error_message: result.error || null,
            provider_response: result.response || null,
            sent_at: result.success ? new Date().toISOString() : null,
          })
          .eq('id', sms.id);

        if (updateError) {
          logger.error(`Failed to update SMS log ${sms.id}: ${updateError.message}`);
        }
      } catch (e) {
        logger.error(`Error processing SMS ${sms.id}: ${e.message}`);
        
        // Mark as failed
        await supabase
          .from('sms_logs')
          .update({
            status: 'failed',
            error_message: e.message,
          })
          .eq('id', sms.id);
      }
    }

    logger.info(`Finished processing sms_logs`);

    // Also process sms_queue
    await processSMSQueue(supabase);
  } catch (e) {
    logger.error(`processPendingSMS error: ${e.message}`);
  }
}

/**
 * Process pending SMS from sms_queue table (tenant SMS)
 */
async function processSMSQueue(supabase) {
  try {
    // Get pending SMS queue items
    const { data: queueItems, error: fetchError } = await supabase
      .from('sms_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      logger.error(`Failed to fetch SMS queue: ${fetchError.message}`);
      return;
    }

    if (!queueItems || queueItems.length === 0) {
      return; // No pending items
    }

    logger.info(`Processing ${queueItems.length} items from sms_queue`);

    for (const item of queueItems) {
      try {
        // Get tenant-specific SMS settings first, fallback to global
        let settings = null;
        
        if (item.tenant_id) {
          const { data: tenantSettings } = await supabase
            .from('tenant_sms_gateways')
            .select('*')
            .eq('tenant_id', item.tenant_id)
            .maybeSingle();
          
          if (tenantSettings && tenantSettings.is_enabled) {
            settings = tenantSettings;
          }
        }
        
        // Fallback to global settings
        if (!settings) {
          settings = await getSMSGatewaySettings(supabase);
        }

        if (!settings || !settings.is_enabled) {
          // Mark as failed - no gateway configured
          await supabase
            .from('sms_queue')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          continue;
        }

        // Get recipients
        let recipients = item.recipients || [];
        
        // For group SMS, fetch customers based on filter
        if (item.send_type === 'group' && item.group_filter && item.tenant_id) {
          const filter = item.group_filter;
          let query = supabase
            .from('customers')
            .select('phone')
            .eq('tenant_id', item.tenant_id)
            .not('phone', 'is', null);
          
          if (filter.area_id) query = query.eq('area_id', filter.area_id);
          if (filter.status) query = query.eq('status', filter.status);
          
          const { data: customers } = await query;
          recipients = (customers || []).map(c => c.phone).filter(Boolean);
        }

        if (recipients.length === 0) {
          await supabase
            .from('sms_queue')
            .update({
              status: 'completed',
              sent_count: 0,
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          continue;
        }

        // Send to each recipient
        let sentCount = 0;
        let failedCount = 0;

        for (const phone of recipients) {
          try {
            const result = await sendSMS(settings, phone, item.message);
            if (result.success) {
              sentCount++;
            } else {
              failedCount++;
            }
            
            // Log each SMS
            await supabase.from('sms_logs').insert({
              tenant_id: item.tenant_id,
              phone_number: phone,
              message: item.message,
              status: result.success ? 'sent' : 'failed',
              error_message: result.error || null,
              sent_at: result.success ? new Date().toISOString() : null,
            });
          } catch (e) {
            failedCount++;
            logger.warn(`Failed to send to ${phone}: ${e.message}`);
          }
        }

        // Update queue item
        await supabase
          .from('sms_queue')
          .update({
            status: 'completed',
            sent_count: sentCount,
            failed_count: failedCount,
            total_count: recipients.length,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        logger.info(`Queue item ${item.id}: ${sentCount} sent, ${failedCount} failed`);
      } catch (e) {
        logger.error(`Error processing queue item ${item.id}: ${e.message}`);
        
        await supabase
          .from('sms_queue')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
    }

    logger.info(`Finished processing sms_queue`);
  } catch (e) {
    logger.error(`processSMSQueue error: ${e.message}`);
  }
}

/**
 * Clear settings cache (call when settings are updated)
 */
export function clearSMSSettingsCache() {
  cachedSettings = { ts: 0, settings: null };
}
