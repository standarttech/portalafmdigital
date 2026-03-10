import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeToken(raw: string): string {
  let token = raw.trim();
  while (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }
  return token;
}

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
  tags?: string[];
  pipeline_stage_id?: string;
  [key: string]: unknown;
}

interface ExternalPipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; position: number }[];
}

function applyFieldMapping(raw: Record<string, unknown>, mapping: Record<string, string>): ExternalLead {
  const result: Record<string, unknown> = {};
  for (const [targetField, sourceExpr] of Object.entries(mapping)) {
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

async function fetchPipelines(
  provider: string,
  apiKey: string,
  baseUrl: string | null,
): Promise<ExternalPipeline[]> {
  const token = normalizeToken(apiKey);

  switch (provider) {
    case "gohighlevel": {
      const locationId = baseUrl?.trim() || "";
      const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
      const resp = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      });
      const text = await resp.text();
      if (!resp.ok) {
        console.error(`GHL pipelines error ${resp.status}: ${text.slice(0, 300)}`);
        return [];
      }
      const data = JSON.parse(text);
      return (data.pipelines || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s: any, i: number) => ({
          id: s.id,
          name: s.name,
          position: i,
        })),
      }));
    }
    case "hubspot": {
      const resp = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) { await resp.text(); return []; }
      const data = await resp.json();
      return (data.results || []).map((p: any) => ({
        id: p.id,
        name: p.label,
        stages: (p.stages || []).map((s: any, i: number) => ({
          id: s.id,
          name: s.label,
          position: s.displayOrder ?? i,
        })),
      }));
    }
    case "pipedrive": {
      const resp = await fetch(`${baseUrl || "https://api.pipedrive.com/v1"}/pipelines?api_token=${token}`, {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) { await resp.text(); return []; }
      const data = await resp.json();
      const pipelines: ExternalPipeline[] = [];
      for (const p of data.data || []) {
        const stagesResp = await fetch(
          `${baseUrl || "https://api.pipedrive.com/v1"}/stages?pipeline_id=${p.id}&api_token=${token}`,
          { headers: { Accept: "application/json" } },
        );
        const stagesData = stagesResp.ok ? await stagesResp.json() : { data: [] };
        if (!stagesResp.ok) await stagesResp.text();
        pipelines.push({
          id: String(p.id),
          name: p.name,
          stages: (stagesData.data || []).map((s: any) => ({
            id: String(s.id),
            name: s.name,
            position: s.order_nr ?? 0,
          })),
        });
      }
      return pipelines;
    }
    default:
      return [];
  }
}

// For GHL: fetch opportunities (deals) with pipeline/stage info
async function fetchGhlOpportunities(
  apiKey: string,
  locationId: string,
): Promise<{ pipelineId: string; pipelineStageId: string; contact: any; value: number; status: string; name: string; id: string }[]> {
  const token = normalizeToken(apiKey);
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}&limit=100` : "?limit=100";
  const resp = await fetch(`https://services.leadconnectorhq.com/opportunities/search${qs}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locationId, limit: 100 }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`GHL opportunities error ${resp.status}: ${text.slice(0, 300)}`);
    return [];
  }
  const data = await resp.json();
  return (data.opportunities || []).map((o: any) => ({
    id: o.id,
    pipelineId: o.pipelineId,
    pipelineStageId: o.pipelineStageId,
    contact: o.contact || {},
    value: o.monetaryValue || 0,
    status: o.status || "open",
    name: o.name || o.contact?.name || "",
  }));
}

async function fetchFromProvider(
  provider: string,
  rawKey: string,
  baseUrl: string | null,
  fieldMapping: Record<string, string>,
): Promise<ExternalLead[]> {
  const apiKey = normalizeToken(rawKey);
  let url: string;
  let headers: Record<string, string> = { "Content-Type": "application/json" };

  switch (provider) {
    case "amocrm":
      url = `${baseUrl}/api/v4/leads?limit=50&with=contacts`;
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "hubspot":
      url = "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company";
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "gohighlevel": {
      const locationId = baseUrl?.trim() || "";
      const qs = locationId
        ? `?locationId=${encodeURIComponent(locationId)}&limit=100`
        : "?limit=100";
      url = `https://services.leadconnectorhq.com/contacts/${qs}`;
      headers = {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      break;
    }
    case "bitrix24":
      url = `${baseUrl || rawKey}/crm.contact.list?start=0`;
      headers = {};
      break;
    case "salesforce":
      url = `${baseUrl}/services/data/v59.0/query?q=${encodeURIComponent("SELECT Id,FirstName,LastName,Email,Phone,Company FROM Lead ORDER BY CreatedDate DESC LIMIT 50")}`;
      headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
      break;
    case "zoho":
      url = `${baseUrl || "https://www.zohoapis.com"}/crm/v2/Leads?per_page=50`;
      headers = { Authorization: `Zoho-oauthtoken ${apiKey}`, Accept: "application/json" };
      break;
    case "pipedrive":
      url = `${baseUrl || "https://api.pipedrive.com/v1"}/persons?limit=50&api_token=${apiKey}`;
      headers = { Accept: "application/json" };
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
      rawItems = data._embedded?.leads || [];
      break;
    case "salesforce":
      rawItems = data.records || [];
      break;
    case "zoho":
      rawItems = data.data || [];
      break;
    case "pipedrive":
      rawItems = data.data || [];
      break;
    default:
      rawItems = Array.isArray(data) ? data : data.data || data.results || data.items || [];
  }

  if (Object.keys(fieldMapping).length > 0) {
    return rawItems.map((item) => applyFieldMapping(item, fieldMapping));
  }

  return rawItems.map((item: any) => ({
    external_id: String(item.id || item.ID || ""),
    first_name: item.first_name || item.firstname || item.NAME || item.firstName || item.FirstName || item.First_Name || "",
    last_name: item.last_name || item.lastname || item.LAST_NAME || item.lastName || item.LastName || item.Last_Name || "",
    email: item.email || item.EMAIL || item.Email || "",
    phone: item.phone || item.PHONE || item.Phone || item.mobile_number || "",
    company: item.company || item.COMPANY_TITLE || item.Company || item.companyName || item.company_name || item.org_name || "",
    source: provider,
    tags: item.tags || [],
  }));
}

const STAGE_COLORS = [
  "#6366f1", "#3b82f6", "#8b5cf6", "#06b6d4", "#14b8a6",
  "#22c55e", "#f59e0b", "#f97316", "#ef4444", "#ec4899",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCron = Deno.env.get("CRON_SECRET");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isServiceRole = authHeader.includes(serviceKey);
    const isCron = cronSecret && expectedCron && cronSecret === expectedCron;

    if (!isServiceRole && !isCron) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    let singleConnectionId: string | null = null;
    let isFirstSync = false;
    try {
      const body = await req.json();
      singleConnectionId = body.connection_id || null;
      isFirstSync = body.first_sync === true;
    } catch { /* no body = sync all */ }

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

    const results: Record<string, { success: boolean; leads_synced?: number; pipelines_created?: number; stages_created?: number; error?: string }> = {};

    for (const conn of connections || []) {
      try {
        let apiKey = "";
        if (conn.api_key_ref) {
          const { data: key } = await adminClient.rpc("get_crm_connection_secret", {
            _secret_ref: conn.api_key_ref,
          });
          apiKey = key || "";
        }
        if (!apiKey) throw new Error("No API key found");

        let pipelinesCreated = 0;
        let stagesCreated = 0;

        // Build a map of external stage IDs to internal stage IDs
        const externalToInternalStage: Record<string, string> = {};

        // Auto-create pipelines on first sync (or if none exist for this client)
        const { count: existingPipelines } = await adminClient
          .from("crm_pipelines")
          .select("id", { count: "exact", head: true })
          .eq("client_id", conn.client_id);

        const shouldImportPipelines = isFirstSync || (existingPipelines ?? 0) === 0;

        if (shouldImportPipelines) {
          try {
            const extPipelines = await fetchPipelines(conn.provider, apiKey, conn.base_url);
            console.log(`Fetched ${extPipelines.length} pipelines from ${conn.provider}`);

            for (const ep of extPipelines) {
              // NOTE: crm_pipeline_stages does NOT have a client_id column
              const { data: newPipeline, error: pipeErr } = await adminClient
                .from("crm_pipelines")
                .insert({
                  client_id: conn.client_id,
                  name: ep.name,
                  is_default: pipelinesCreated === 0,
                })
                .select("id")
                .single();

              if (pipeErr) {
                console.error(`Pipeline insert error: ${pipeErr.message}`);
                continue;
              }

              if (newPipeline) {
                for (const stage of ep.stages) {
                  const color = STAGE_COLORS[stage.position % STAGE_COLORS.length];
                  const isLast = stage.position === ep.stages.length - 1;
                  const isSecondLast = stage.position === ep.stages.length - 2;
                  const stageName = stage.name.toLowerCase();

                  const { data: newStage, error: stageErr } = await adminClient.from("crm_pipeline_stages").insert({
                    pipeline_id: newPipeline.id,
                    name: stage.name,
                    position: stage.position,
                    color,
                    is_won_stage: stageName.includes("won") || stageName.includes("closed won") || stageName.includes("выиграна"),
                    is_lost_stage: stageName.includes("lost") || stageName.includes("closed lost") || stageName.includes("проиграна"),
                    is_qualified_stage: stageName.includes("qualif") || stageName.includes("квалиф"),
                    is_booked_stage: stageName.includes("book") || stageName.includes("appointment") || stageName.includes("встреча"),
                    is_closed_stage: stageName.includes("won") || stageName.includes("lost") || stageName.includes("closed"),
                  }).select("id").single();

                  if (stageErr) {
                    console.error(`Stage insert error: ${stageErr.message}`);
                  } else if (newStage) {
                    externalToInternalStage[stage.id] = newStage.id;
                    stagesCreated++;
                  }
                }
                pipelinesCreated++;
              }
            }

            // If no pipelines from CRM, create a default one
            if (pipelinesCreated === 0 && (existingPipelines ?? 0) === 0) {
              const { data: defPipeline } = await adminClient
                .from("crm_pipelines")
                .insert({ client_id: conn.client_id, name: "Default Pipeline", is_default: true })
                .select("id")
                .single();
              if (defPipeline) {
                const defaultStages = [
                  { name: "New", won: false, lost: false, qual: false, booked: false },
                  { name: "Contacted", won: false, lost: false, qual: false, booked: false },
                  { name: "Qualified", won: false, lost: false, qual: true, booked: false },
                  { name: "Proposal", won: false, lost: false, qual: false, booked: true },
                  { name: "Won", won: true, lost: false, qual: false, booked: false },
                  { name: "Lost", won: false, lost: true, qual: false, booked: false },
                ];
                for (let i = 0; i < defaultStages.length; i++) {
                  await adminClient.from("crm_pipeline_stages").insert({
                    pipeline_id: defPipeline.id,
                    name: defaultStages[i].name,
                    position: i,
                    color: STAGE_COLORS[i % STAGE_COLORS.length],
                    is_won_stage: defaultStages[i].won,
                    is_lost_stage: defaultStages[i].lost,
                    is_qualified_stage: defaultStages[i].qual,
                    is_booked_stage: defaultStages[i].booked,
                    is_closed_stage: defaultStages[i].won || defaultStages[i].lost,
                  });
                }
                stagesCreated += defaultStages.length;
              }
            }
          } catch (pipeErr) {
            console.error(`Pipeline import error for ${conn.id}:`, pipeErr);
          }
        }

        // Get the first pipeline for this client to assign leads
        const { data: clientPipeline } = await adminClient
          .from("crm_pipelines")
          .select("id")
          .eq("client_id", conn.client_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!clientPipeline) {
          throw new Error("No pipeline found for client after import attempt");
        }

        // Get default stage (first by position)
        const { data: defaultStage } = await adminClient
          .from("crm_pipeline_stages")
          .select("id")
          .eq("pipeline_id", clientPipeline.id)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!defaultStage) {
          throw new Error("No stages found in pipeline — cannot assign leads");
        }

        // Fetch leads
        const leads = await fetchFromProvider(conn.provider, apiKey, conn.base_url, conn.field_mapping || {});
        console.log(`Fetched ${leads.length} leads from ${conn.provider}`);

        let syncedCount = 0;
        for (const lead of leads) {
          const fullName = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";

          const dedupKey = lead.external_id || lead.email || lead.phone;
          if (!dedupKey) continue;

          // Determine stage: try mapped external stage, or use default
          let stageId = defaultStage.id;
          if (lead.pipeline_stage_id && externalToInternalStage[lead.pipeline_stage_id]) {
            stageId = externalToInternalStage[lead.pipeline_stage_id];
          }

          // Check for existing lead by external_id first, then email/phone
          let existingId: string | null = null;
          if (lead.external_id) {
            const { data: byExtId } = await adminClient
              .from("crm_leads")
              .select("id")
              .eq("client_id", conn.client_id)
              .eq("external_lead_id", lead.external_id)
              .maybeSingle();
            if (byExtId) existingId = byExtId.id;
          }
          if (!existingId && (lead.email || lead.phone)) {
            const filters: string[] = [];
            if (lead.email) filters.push(`email.eq.${lead.email}`);
            if (lead.phone) filters.push(`phone.eq.${lead.phone}`);
            const { data: byContact } = await adminClient
              .from("crm_leads")
              .select("id")
              .eq("client_id", conn.client_id)
              .or(filters.join(","))
              .maybeSingle();
            if (byContact) existingId = byContact.id;
          }

          if (existingId) {
            await adminClient
              .from("crm_leads")
              .update({
                full_name: fullName,
                first_name: lead.first_name || "",
                last_name: lead.last_name || "",
                company: lead.company || "",
                value: lead.value || 0,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingId);
          } else {
            const { error: insertErr } = await adminClient.from("crm_leads").insert({
              client_id: conn.client_id,
              pipeline_id: clientPipeline.id,
              stage_id: stageId,
              full_name: fullName,
              first_name: lead.first_name || "",
              last_name: lead.last_name || "",
              email: lead.email || "",
              phone: lead.phone || "",
              company: lead.company || "",
              source: lead.source || conn.provider,
              value: lead.value || 0,
              external_lead_id: lead.external_id || null,
              status: "new",
              priority: "medium",
              tags: lead.tags || [],
              notes_summary: "",
            });
            if (insertErr) {
              console.error(`Lead insert error: ${insertErr.message}`);
              continue;
            }
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

        results[conn.id] = { success: true, leads_synced: syncedCount, pipelines_created: pipelinesCreated, stages_created: stagesCreated };
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
