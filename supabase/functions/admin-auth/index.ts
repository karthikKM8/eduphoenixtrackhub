import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const superAdminEmail = Deno.env.get("SUPERADMIN_EMAIL");
    const superAdminPassword = Deno.env.get("SUPERADMIN_PASSWORD");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    const jwtSecret = Deno.env.get("JWT_SECRET") || "default-secret-change-me";

    let role: string | null = null;

    if (email === superAdminEmail && superAdminPassword) {
      const valid = await bcrypt.compare(password, superAdminPassword);
      if (valid) role = "superadmin";
    } else if (email === adminEmail && adminPassword) {
      const valid = await bcrypt.compare(password, adminPassword);
      if (valid) role = "admin";
    }

    if (!role) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create JWT
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      { email, role, exp: getNumericDate(8 * 60 * 60) },
      key
    );

    return new Response(
      JSON.stringify({ success: true, token, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Auth error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
