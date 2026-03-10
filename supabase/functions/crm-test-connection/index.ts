import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderTestConfig {
  url: string;
  headers: Record<string, string>;
}

function getProviderTestConfig(provider: string, apiKey: string, baseUrl?: string): ProviderTestConfig {
  switch (provider) {
    case "amocrm":
      return {
        url: `${baseUrl || "https://your-domain.amocrm.ru"}/api/v4/account`,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      };
    case "hubspot":
      return {
        url: "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      };
    case "gohighlevel":
      return {
        url: "https://rest.gohighlevel.com/v1/contacts/?limit=1",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      };
    case "bitrix24":
      // Bitrix uses webhook URLs like https://domain.bitrix24.ru/rest/1/abc123/crm.contact.list
      return {
        url: `${baseUrl || apiKey}/crm.contact.list?start=0&limit=1`,
        headers: { "Content-Type": "application/json" },
      };
    default:
      // Custom — try a GET to the base_url
      return {
        url: baseUrl || apiKey,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
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
        const { data: key } = await adminClient.rpc("get_crm_connection_secret", {
          _secret_ref: conn.api_key_ref,
        });
        testApiKey = key;
      }
    }

    if (!testProvider || !testApiKey) throw new Error("provider and api_key required");

    const config = getProviderTestConfig(testProvider, testApiKey, testBaseUrl);

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
        return new Response(JSON.stringify({ ok: true, status: resp.status, message: "Connection successful" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({
          ok: false,
          status: resp.status,
          message: `API returned ${resp.status}: ${text.slice(0, 200)}`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      return new Response(JSON.stringify({
        ok: false,
        message: fetchErr.name === "AbortError" ? "Connection timeout (10s)" : fetchErr.message,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("crm-test-connection error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
