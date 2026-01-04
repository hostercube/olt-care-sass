import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
  tenant_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, message, tenant_id } = await req.json() as SMSRequest;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch SMS gateway settings (global)
    const { data: settings } = await supabase
      .from('sms_gateway_settings')
      .select('*')
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      // Log as failed
      await supabase.from('sms_logs').insert({
        phone_number: phone,
        message,
        status: 'failed',
        error_message: 'SMS gateway not configured or disabled',
        tenant_id,
      });

      return new Response(
        JSON.stringify({ success: false, error: 'SMS gateway not configured or disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: { success: boolean; error?: string; response?: any } = { success: false };

    // Send SMS based on provider
    if (settings.provider === 'smsnoc') {
      result = await sendSMSNOC(settings, phone, message);
    } else if (settings.provider === 'mimsms') {
      result = await sendMIMSMS(settings, phone, message);
    } else if (settings.provider === 'sslwireless') {
      result = await sendSSLWireless(settings, phone, message);
    } else {
      result = { success: false, error: `Unsupported provider: ${settings.provider}` };
    }

    // Log the result
    await supabase.from('sms_logs').insert({
      phone_number: phone,
      message,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
      provider_response: result.response || null,
      sent_at: result.success ? new Date().toISOString() : null,
      tenant_id,
    });

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('SMS send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// SMS NOC API
async function sendSMSNOC(settings: any, phone: string, message: string) {
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
      return { success: true, response: data };
    }
    return { success: false, error: data.message || 'SMS NOC API error', response: data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// MIM SMS API
async function sendMIMSMS(settings: any, phone: string, message: string) {
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
      return { success: true, response: { message: text } };
    }
    return { success: false, error: text };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// SSL Wireless API
async function sendSSLWireless(settings: any, phone: string, message: string) {
  try {
    const config = settings.config || {};
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
      return { success: true, response: data };
    }
    return { success: false, error: data.status_message || 'SSL Wireless API error', response: data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
