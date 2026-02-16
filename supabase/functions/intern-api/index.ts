import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Sheets API helper
async function getAccessToken() {
  const email = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const key = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (!email || !key) throw new Error("Google credentials not configured");

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claimSet = btoa(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const signInput = `${header}.${claimSet}`;
  const keyData = key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${header}.${claimSet}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get access token");
  return tokenData.access_token;
}

async function sheetsRequest(method: string, range: string, body?: unknown) {
  const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID not configured");

  const token = await getAccessToken();
  const encodedRange = encodeURIComponent(range);
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

  const opts: RequestInit = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (method === "GET") {
    opts.method = "GET";
  } else if (method === "APPEND") {
    url += "?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";
    opts.method = "POST";
    opts.body = JSON.stringify(body);
  } else if (method === "UPDATE") {
    url += "?valueInputOption=USER_ENTERED";
    opts.method = "PUT";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    if (action === "check") {
      // Check if intern exists by fingerprint
      const result = await sheetsRequest("GET", "Intern Logs!A:L");
      const rows = result.values || [];
      const idx = rows.findIndex(
        (r: string[]) => r[4] === data.fingerprint && r[11] === today
      );

      if (idx >= 0) {
        const row = rows[idx];
        return new Response(
          JSON.stringify({
            found: true,
            data: {
              name: row[0],
              contact: row[1],
              college: row[2],
              domain: row[3],
              checkedIn: !!row[9] && !row[10],
              checkInTime: row[9] || null,
            },
            rowIndex: idx + 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check previous days for returning intern (autofill)
      const prevIdx = rows.findIndex((r: string[]) => r[4] === data.fingerprint);
      if (prevIdx >= 0) {
        const row = rows[prevIdx];
        return new Response(
          JSON.stringify({
            found: true,
            data: {
              name: row[0],
              contact: row[1],
              college: row[2],
              domain: row[3],
              checkedIn: false,
              checkInTime: null,
            },
            rowIndex: -1, // needs new row for today
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      // Check duplicate for today
      const existing = await sheetsRequest("GET", "Intern Logs!A:L");
      const rows = existing.values || [];
      const dup = rows.find(
        (r: string[]) => r[4] === data.fingerprint && r[11] === today
      );
      if (dup) {
        return new Response(
          JSON.stringify({ success: false, error: "Already registered today" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      await sheetsRequest("APPEND", "Intern Logs!A:L", {
        values: [[
          data.name, data.contact, data.college, data.domain,
          data.fingerprint, ip, data.browser, data.os, data.deviceType,
          "", "", today,
        ]],
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const existing = await sheetsRequest("GET", "Intern Logs!A:L");
      const rows = existing.values || [];
      const idx = rows.findIndex(
        (r: string[]) => r[4] === data.fingerprint && r[11] === today
      );

      if (idx < 0) {
        // Register new row for today with updated details
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        await sheetsRequest("APPEND", "Intern Logs!A:L", {
          values: [[
            data.name, data.contact, data.college, data.domain,
            data.fingerprint, ip, data.browser, data.os, data.deviceType,
            "", "", today,
          ]],
        });
      } else {
        const row = rows[idx];
        await sheetsRequest("UPDATE", `Intern Logs!A${idx + 1}:D${idx + 1}`, {
          values: [[data.name, data.contact, data.college, data.domain]],
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "checkin") {
      const existing = await sheetsRequest("GET", "Intern Logs!A:L");
      const rows = existing.values || [];
      let idx = rows.findIndex(
        (r: string[]) => r[4] === data.fingerprint && r[11] === today
      );

      if (idx < 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Please register first" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (rows[idx][9]) {
        return new Response(
          JSON.stringify({ success: false, error: "Already checked in today" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await sheetsRequest("UPDATE", `Intern Logs!J${idx + 1}:J${idx + 1}`, {
        values: [[now]],
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "checkout") {
      const existing = await sheetsRequest("GET", "Intern Logs!A:L");
      const rows = existing.values || [];
      const idx = rows.findIndex(
        (r: string[]) => r[4] === data.fingerprint && r[11] === today
      );

      if (idx < 0 || !rows[idx][9]) {
        return new Response(
          JSON.stringify({ success: false, error: "Not checked in" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await sheetsRequest("UPDATE", `Intern Logs!K${idx + 1}:K${idx + 1}`, {
        values: [[now]],
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Intern API error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
