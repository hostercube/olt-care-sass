import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  alertType: 'olt_offline' | 'onu_offline' | 'power_drop' | 'high_latency';
  deviceName: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - email notifications disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get notification email from system settings
    const { data: emailSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "notificationEmail")
      .maybeSingle();

    const notificationEmail = emailSetting?.value?.value || Deno.env.get("NOTIFICATION_EMAIL");

    if (!notificationEmail) {
      console.log("No notification email configured");
      return new Response(
        JSON.stringify({ success: false, message: "No notification email configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { alertType, deviceName, message, severity }: AlertEmailRequest = await req.json();

    const severityColors: Record<string, string> = {
      critical: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };

    const alertTypeLabels: Record<string, string> = {
      olt_offline: 'OLT Offline',
      onu_offline: 'ONU Offline',
      power_drop: 'Power Drop',
      high_latency: 'High Latency',
    };

    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OLTCARE <alerts@resend.dev>",
        to: [notificationEmail],
        subject: `[${severity.toUpperCase()}] ${alertTypeLabels[alertType]} - ${deviceName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
              <div style="background: linear-gradient(135deg, ${severityColors[severity]} 0%, ${severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#d97706' : '#2563eb'} 100%); padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: white;">⚠️ OLTCARE Alert</h1>
              </div>
              <div style="padding: 30px;">
                <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #94a3b8;">Alert Type</p>
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${severityColors[severity]};">${alertTypeLabels[alertType]}</p>
                </div>
                <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #94a3b8;">Device</p>
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #e2e8f0;">${deviceName}</p>
                </div>
                <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #94a3b8;">Message</p>
                  <p style="margin: 0; font-size: 16px; color: #e2e8f0;">${message}</p>
                </div>
                <div style="background-color: #0f172a; border-radius: 8px; padding: 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #94a3b8;">Time</p>
                  <p style="margin: 0; font-size: 16px; color: #e2e8f0;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} (GMT+6)</p>
                </div>
              </div>
              <div style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                  This is an automated alert from OLTCARE - OLT Management System
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Alert email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending alert email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
