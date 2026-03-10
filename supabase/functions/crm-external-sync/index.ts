import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExternalLead {
  external_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  value?: number;
  status?: string;
  [key: string]: unknown;
}

function applyFieldMapping(raw: Record<string, unknown>, mapping: Record<string, string>): ExternalLead {
  const result: Record<string, unknown> = {};
  for (const [targetField, sourceExpr] of Object.entries(mapping)) {
    // Support dot notation: contact.email, lead.name
    const keys = sourceExpr.replace(/[{}]/g, "").split(".");
    let value: unknown = raw;
    for (const k of keys) {
      if (value && typeof value === "object") value = (value as Record<string, unknown>)[k];
      else { value = undefined; break; }
    }
    if (value !== undefined) result[targetField] = value;
  }
  return result as ExternalLead;
}

async function fetchFromProvider(
  provider: string,
  apiKey: string,
  baseUrl: string | null,
  fieldMapping: Record<string, string>,
): Promise<ExternalLead[]> {
  let url: string;
  let headers: Record<string, string> = { "Content-Type": "application/json" };

  switch (provider) {
    case "amocrm":
      url = `${baseUrl}/api/v4/leads?limit=50&with=contacts`;
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "hubspot":
      url = "https://api.hubapi.com/crm/v3/objects/contacts?limit=50&properties=firstname,lastname,email,phone,company";
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "gohighlevel":
      url = "https://rest.gohighlevel.com/v1/contacts/?limit=50";
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "bitrix24":
      url = `${baseUrl || apiKey}/crm.contact.list?start=0`;
      headers = {};
      break;
    default:
      url = baseUrl || "";
      headers.Authorization = `Bearer ${apiKey}`;
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${provider} API error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();

  // Normalize response based on provider
  let rawItems: Record<string, unknown>[] = [];
  switch (provider) {
    case "hubspot":
      rawItems = (data.results || []).map((r: any) => ({ id: r.id, ...r.properties }));
      break;
    case "gohighlevel":
      rawItems = data.contacts || [];
      break;
    case "bitrix24":
      rawItems = data.result || [];
      break;
    case "amocrm":
      rawItems = (data._embedded?.leads || []);
      break;
    default:
      rawItems = Array.isArray(data) ? data : data.data || data.results || data.items || [];
  }

  // Apply field mapping if provided, otherwise use defaults
  if (Object.keys(fieldMapping).length > 0) {
    return rawItems.map((item) => applyFieldMapping(item, fieldMapping));
  }

  // Default mapping by provider
  return rawItems.map((item: any) => ({
    external_id: String(item.id || item.ID || ""),
    first_name: item.first_name || item.firstname || item.NAME || item.firstName || "",
    last_name: item.last_name || item.lastname || item.LAST_NAME || item.lastName || "",
    email: item.email || item.EMAIL || "",
    phone: item.phone || item.PHONE || "",
    company: item.company || item.COMPANY_TITLE || "",
    source: provider,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: either service role or cron secret
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCron = Deno.env.get("CRON_SECRET");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isServiceRole = authHeader.includes(serviceKey);
    const isCron = cronSecret && expectedCron && cronSecret === expectedCron;

    if (!isServiceRole && !isCron) {
      // Verify JWT
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get body for optional single connection_id
    let singleConnectionId: string | null = null;
    try {
      const body = await req.json();
      singleConnectionId = body.connection_id || null;
    } catch { /* no body = sync all */ }

    // Fetch connections to sync
    let query = adminClient
      .from("crm_external_connections")
      .select("*")
      .eq("is_active", true)
      .eq("sync_enabled", true);

    if (singleConnectionId) {
      query = query.eq("id", singleConnectionId);
    }

    const { data: connections, error: connErr } = await query;
    if (connErr) throw connErr;

    const results: Record<string, { success: boolean; leads_synced?: number; error?: string }> = {};

    for (const conn of connections || []) {
      try {
        // Get API key from vault
        let apiKey = "";
        if (conn.api_key_ref) {
          const { data: key } = await adminClient.rpc("get_crm_connection_secret", {
            _secret_ref: conn.api_key_ref,
          });
          apiKey = key || "";
        }
        if (!apiKey) throw new Error("No API key found");

        const leads = await fetchFromProvider(conn.provider, apiKey, conn.base_url, conn.field_mapping || {});

        let syncedCount = 0;
        for (const lead of leads) {
          const fullName = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";

          // Get default pipeline stage
          const { data: defaultStage } = await adminClient
            .from("crm_pipeline_stages")
            .select("id")
            .eq("client_id", conn.client_id)
            .order("position", { ascending: true })
            .limit(1)
            .maybeSingle();

          // Upsert by source + external_id or email
          const dedupKey = lead.external_id || lead.email || lead.phone;
          if (!dedupKey) continue;

          const { data: existing } = await adminClient
            .from("crm_leads")
            .select("id")
            .eq("client_id", conn.client_id)
            .eq("source", lead.source || conn.provider)
            .or(`email.eq.${lead.email || "NONE"},phone.eq.${lead.phone || "NONE"}`)
            .maybeSingle();

          if (existing) {
            // Update
            await adminClient
              .from("crm_leads")
              .update({
                full_name: fullName,
                company: lead.company || "",
                value: lead.value || 0,
              })
              .eq("id", existing.id);
          } else {
            // Insert
            await adminClient.from("crm_leads").insert({
              client_id: conn.client_id,
              full_name: fullName,
              email: lead.email || "",
              phone: lead.phone || "",
              company: lead.company || "",
              source: lead.source || conn.provider,
              stage_id: defaultStage?.id || null,
              value: lead.value || 0,
            });
          }
          syncedCount++;
        }

        await adminClient
          .from("crm_external_connections")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "success",
            last_sync_error: null,
          })
          .eq("id", conn.id);

        results[conn.id] = { success: true, leads_synced: syncedCount };
      } catch (e) {
        console.error(`Sync error for connection ${conn.id}:`, e);
        await adminClient
          .from("crm_external_connections")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: e.message?.slice(0, 500),
          })
          .eq("id", conn.id);

        results[conn.id] = { success: false, error: e.message };
      }
    }

    return new Response(JSON.stringify({ synced: Object.keys(results).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-external-sync error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
