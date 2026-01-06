// Public backend function to fetch non-sensitive platform settings for login/signup and status widgets.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "platform_settings")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const raw = (data?.value ?? {}) as Record<string, unknown>;

    // IMPORTANT: Return ONLY non-sensitive settings. Never include captchaSecretKey.
    const safeSettings = {
      platformName: raw.platformName,
      platformEmail: raw.platformEmail,
      platformPhone: raw.platformPhone,
      supportEmail: raw.supportEmail,

      currency: raw.currency,
      currencySymbol: raw.currencySymbol,
      timezone: raw.timezone,
      dateFormat: raw.dateFormat,

      enableSignup: raw.enableSignup,
      requireEmailVerification: raw.requireEmailVerification,

      enableCaptcha: raw.enableCaptcha,
      captchaSiteKey: raw.captchaSiteKey,

      defaultTrialDays: raw.defaultTrialDays,
      autoSuspendDays: raw.autoSuspendDays,

      maintenanceMode: raw.maintenanceMode,
      maintenanceMessage: raw.maintenanceMessage,

      pollingServerUrl: raw.pollingServerUrl,
    };

    return new Response(JSON.stringify({ settings: safeSettings }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (e: any) {
    console.error("public-platform-settings error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
