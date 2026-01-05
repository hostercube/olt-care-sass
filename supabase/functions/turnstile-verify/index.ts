// Lovable Cloud function: verify Cloudflare Turnstile token using secret stored in platform_settings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json().catch(() => ({ token: null }));
    if (!token) {
      return Response.json(
        { success: false, error: "Missing token" },
        { status: 400, headers: corsHeaders },
      );
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!url || !serviceKey) {
      return Response.json(
        { success: false, error: "Server misconfigured" },
        { status: 500, headers: corsHeaders },
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: row, error: sErr } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "platform_settings")
      .maybeSingle();

    if (sErr) throw sErr;

    const settings = (row?.value ?? {}) as any;
    const enabled = !!settings?.enableCaptcha;

    if (!enabled) {
      return Response.json(
        { success: true, skipped: true },
        { status: 200, headers: corsHeaders },
      );
    }

    const secret = String(settings?.captchaSecretKey || "").trim();
    if (!secret) {
      return Response.json(
        { success: false, error: "Turnstile secret key not configured" },
        { status: 500, headers: corsHeaders },
      );
    }

    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      },
    );

    const verifyJson = await verifyRes.json().catch(() => ({}));
    const ok = !!verifyJson?.success;

    return Response.json(
      {
        success: ok,
        error: ok ? null : (verifyJson?.["error-codes"]?.[0] ?? "Verification failed"),
      },
      { status: ok ? 200 : 400, headers: corsHeaders },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
    return Response.json(
      { success: false, error: msg },
      { status: 500, headers: corsHeaders },
    );
  }
});

