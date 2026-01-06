// Edge function to save platform settings (requires super admin)
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user token to verify identity
    const supabaseAuth = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for checking super admin status
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check if user is super admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const { data: tenantRoleData } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData && !tenantRoleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Super Admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse settings from request body
    const { settings } = await req.json();

    if (!settings || typeof settings !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid settings data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowIso = new Date().toISOString();

    // Save settings using service role (bypasses RLS)
    // NOTE: We do NOT use upsert(onConflict=key) because `system_settings.key` may not be uniquely constrained.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("system_settings")
      .select("id")
      .eq("key", "platform_settings")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Lookup error:", existingError);
      throw existingError;
    }

    if (existing?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("system_settings")
        .update({
          value: settings,
          updated_at: nowIso,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("system_settings")
        .insert({
          key: "platform_settings",
          value: settings,
          updated_at: nowIso,
        } as any);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("save-platform-settings error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
