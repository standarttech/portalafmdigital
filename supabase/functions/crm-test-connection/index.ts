import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Strip "Bearer " prefix if user accidentally pasted it */
function normalizeToken(raw: string): string {
  let token = raw.trim();
  while (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }
  return token;
}

interface ProviderTestConfig {
  url: string;
  headers: Record<string, string>;
}

function getProviderTestConfig(
  provider: string,
  rawKey: string,
  baseUrl?: string,
): ProviderTestConfig {
  const apiKey = normalizeToken(rawKey);

  switch (provider) {
    case "amocrm":
      return {
        url: `${baseUrl || "https://your-domain.amocrm.ru"}/api/v4/account`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
    case "hubspot":
      return {
        url: "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      };
    case "gohighlevel": {
      // GHL v2 API — requires Version header
      // baseUrl is used to pass locationId
      const locationId = baseUrl?.trim() || "";
      const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}&limit=1` : "?limit=1";
      return {
        url: `https://services.leadconnectorhq.com/contacts/${qs}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      };
    }
    case "bitrix24":
      return {
        url: `${baseUrl || rawKey}/crm.contact.list?start=0&limit=1`,
        headers: { "Content-Type": "application/json" },
      };
    case "salesforce":
      return {
        url: `${baseUrl}/services/data/v59.0/sobjects`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      };
    case "zoho":
      return {
        url: `${baseUrl || "https://www.zohoapis.com"}/crm/v2/Leads?per_page=1`,
        headers: {
          Authorization: `Zoho-oauthtoken ${apiKey}`,
          Accept: "application/json",
        },
      };
    case "pipedrive":
      return {
        url: `${baseUrl || "https://api.pipedrive.com/v1"}/persons?limit=1&api_token=${apiKey}`,
        headers: { Accept: "application/json" },
      };
    default:
      return {
        url: baseUrl || rawKey,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
  }
}

/** Return a human-readable diagnostic for common GHL / API errors */
function diagnoseError(
  provider: string,
  status: number,
  body: string,
): string {
  const lower = body.toLowerCase();

  if (status === 401) {
    if (lower.includes("invalid") && lower.includes("token"))
      return "Invalid token — the API key may have been revoked or is incorrect.";
    if (lower.includes("invalid") && lower.includes("key"))
      return "Invalid API key — check that the key is correct and has not expired.";
    if (lower.includes("version"))
      return "Missing or wrong Version header — ensure GHL v2 API Version header is set.";
    if (lower.includes("scope"))
      return "Missing required scope — the API key does not have the required permissions.";
    if (lower.includes("location"))
      return "Wrong account/location context — check the Location ID.";
    return `Authentication failed (401). Possible causes: invalid token, expired key, missing scope, or wrong location context.`;
  }
  if (status === 403) {
    return `Access denied (403). The token is valid but lacks permissions for this resource. Check scopes/roles.`;
  }
  if (status === 404) {
    return `Endpoint not found (404). Verify the Base URL and that the API version is correct.`;
  }
  if (status === 422) {
    if (provider === "gohighlevel" && lower.includes("locationid"))
      return "Missing locationId — for GHL v2 API, you must provide the Location ID.";
    return `Validation error (422): ${body.slice(0, 200)}`;
  }
  if (status === 429) {
    return `Rate limited (429). Too many requests — try again in a few minutes.`;
  }

  return `API returned ${status}: ${body.slice(0, 200)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { connection_id, provider, api_key, base_url } = body;

    let testProvider = provider;
    let testApiKey = api_key;
    let testBaseUrl = base_url;

    // If testing existing connection, fetch details from DB
    if (connection_id && !api_key) {
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: conn } = await adminClient
        .from("crm_external_connections")
        .select("provider, api_key_ref, base_url")
        .eq("id", connection_id)
        .single();
      if (!conn) throw new Error("Connection not found");

      testProvider = conn.provider;
      testBaseUrl = conn.base_url;

      if (conn.api_key_ref) {
        const { data: key } = await adminClient.rpc(
          "get_crm_connection_secret",
          { _secret_ref: conn.api_key_ref },
        );
        testApiKey = key;
      }
    }

    if (!testProvider || !testApiKey)
      throw new Error("provider and api_key required");

    const config = getProviderTestConfig(testProvider, testApiKey, testBaseUrl);

    // Log outgoing request details for debugging
    console.log("Test connection outgoing request:", {
      provider: testProvider,
      url: config.url,
      method: "GET",
      headers: Object.fromEntries(
        Object.entries(config.headers).map(([k, v]) =>
          k.toLowerCase() === "authorization"
            ? [k, v.slice(0, 15) + "..."]
            : [k, v],
        ),
      ),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(config.url, {
        method: "GET",
        headers: config.headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await resp.text();

      if (resp.ok) {
        return new Response(
          JSON.stringify({
            ok: true,
            status: resp.status,
            message: "Connection successful",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } else {
        const diagnostic = diagnoseError(testProvider, resp.status, text);
        return new Response(
          JSON.stringify({
            ok: false,
            status: resp.status,
            message: diagnostic,
            raw: text.slice(0, 300),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      return new Response(
        JSON.stringify({
          ok: false,
          message:
            fetchErr.name === "AbortError"
              ? "Connection timeout (10s) — check the URL and network."
              : `Network error: ${fetchErr.message}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (e) {
    console.error("crm-test-connection error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
