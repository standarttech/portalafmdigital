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
  pipeline_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  landing_page?: string;
  raw_payload?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ExternalPipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; position: number }[];
}

const STAGE_COLORS = [
  "#6366f1", "#3b82f6", "#8b5cf6", "#06b6d4", "#14b8a6",
  "#22c55e", "#f59e0b", "#f97316", "#ef4444", "#ec4899",
];

// ── GHL: fetch pipelines ────────────────────────────────────
async function fetchGhlPipelines(token: string, locationId: string): Promise<ExternalPipeline[]> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
  const resp = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", Accept: "application/json" },
  });
  if (!resp.ok) { console.error(`GHL pipelines ${resp.status}: ${(await resp.text()).slice(0, 300)}`); return []; }
  const data = await resp.json();
  return (data.pipelines || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    stages: (p.stages || []).map((s: any, i: number) => ({ id: s.id, name: s.name, position: i })),
  }));
}

// ── GHL: fetch ALL opportunities (paginated) with contact details ──
async function fetchGhlLeads(token: string, locationId: string): Promise<ExternalLead[]> {
  const results: ExternalLead[] = [];
  let searchAfter: string[] = [];
  let page = 1;
  const maxPages = 10;

  while (page <= maxPages) {
    const body: Record<string, unknown> = {
      locationId,
      query: "",
      limit: 100,
      page,
      searchAfter,
    };

    const resp = await fetch(
      `https://services.leadconnectorhq.com/opportunities/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`GHL opportunities error ${resp.status}: ${errText.slice(0, 500)}`);
      break;
    }

    const data = await resp.json();
    const opps = data.opportunities || [];
    console.log(`GHL page ${page}: ${opps.length} opportunities`);
    if (opps.length === 0) break;

    for (const o of opps) {
      const contact = o.contact || {};
      // Extract UTM / attribution from customFields or source
      const customFields: Record<string, string> = {};
      if (Array.isArray(contact.customFields)) {
        for (const cf of contact.customFields) {
          if (cf.id && cf.value) customFields[cf.id] = String(cf.value);
          if (cf.key && cf.value) customFields[cf.key] = String(cf.value);
        }
      }

      // GHL stores attribution in contact.attributionSource or custom fields
      const attribution = contact.attributionSource || {};

      results.push({
        external_id: o.id,
        first_name: contact.firstName || contact.first_name || "",
        last_name: contact.lastName || contact.last_name || "",
        full_name: o.name || contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "",
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.companyName || contact.company || o.companyName || "",
        source: contact.source || attribution.medium || "gohighlevel",
        value: o.monetaryValue || 0,
        status: o.status || "open",
        tags: Array.isArray(contact.tags) ? contact.tags.map((t: any) => typeof t === "string" ? t : t.name || "") : [],
        pipeline_id: o.pipelineId || "",
        pipeline_stage_id: o.pipelineStageId || "",
        utm_source: attribution.utmSource || customFields["utm_source"] || "",
        utm_medium: attribution.utmMedium || attribution.medium || customFields["utm_medium"] || "",
        utm_campaign: attribution.utmCampaign || customFields["utm_campaign"] || "",
        utm_content: attribution.utmContent || customFields["utm_content"] || "",
        utm_term: attribution.utmTerm || customFields["utm_term"] || "",
        campaign_name: attribution.campaignName || attribution.campaign || customFields["campaign_name"] || "",
        adset_name: attribution.adgroupName || customFields["adset_name"] || customFields["ad_group_name"] || "",
        ad_name: attribution.adName || customFields["ad_name"] || "",
        landing_page: attribution.url || contact.website || "",
        raw_payload: o,
      });
    }

    // GHL pagination: use meta or last item id
    if (data.meta?.nextPageUrl || opps.length === 100) {
      startAfterId = opps[opps.length - 1].id;
      page++;
    } else {
      break;
    }
  }

  return results;
}

// ── Generic provider fetch (HubSpot, Pipedrive, etc.) ───────
async function fetchGenericLeads(
  provider: string,
  rawKey: string,
  baseUrl: string | null,
  fieldMapping: Record<string, string>,
): Promise<ExternalLead[]> {
  const apiKey = normalizeToken(rawKey);
  let url: string;
  let headers: Record<string, string> = { "Content-Type": "application/json" };

  switch (provider) {
    case "hubspot":
      url = "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company,hs_analytics_source,hs_analytics_source_data_1,hs_analytics_source_data_2";
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "pipedrive":
      url = `${baseUrl || "https://api.pipedrive.com/v1"}/persons?limit=100&api_token=${apiKey}`;
      headers = { Accept: "application/json" };
      break;
    case "amocrm":
      url = `${baseUrl}/api/v4/leads?limit=50&with=contacts`;
      headers.Authorization = `Bearer ${apiKey}`;
      break;
    case "salesforce":
      url = `${baseUrl}/services/data/v59.0/query?q=${encodeURIComponent("SELECT Id,FirstName,LastName,Email,Phone,Company FROM Lead ORDER BY CreatedDate DESC LIMIT 200")}`;
      headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
      break;
    case "zoho":
      url = `${baseUrl || "https://www.zohoapis.com"}/crm/v2/Leads?per_page=100`;
      headers = { Authorization: `Zoho-oauthtoken ${apiKey}`, Accept: "application/json" };
      break;
    case "bitrix24":
      url = `${baseUrl || rawKey}/crm.contact.list?start=0`;
      headers = {};
      break;
    default:
      url = baseUrl || "";
      headers.Authorization = `Bearer ${apiKey}`;
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`${provider} API error ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();

  let rawItems: Record<string, unknown>[] = [];
  switch (provider) {
    case "hubspot": rawItems = (data.results || []).map((r: any) => ({ id: r.id, ...r.properties })); break;
    case "bitrix24": rawItems = data.result || []; break;
    case "amocrm": rawItems = data._embedded?.leads || []; break;
    case "salesforce": rawItems = data.records || []; break;
    case "zoho": rawItems = data.data || []; break;
    case "pipedrive": rawItems = data.data || []; break;
    default: rawItems = Array.isArray(data) ? data : data.data || data.results || data.items || []; break;
  }

  if (fieldMapping && Object.keys(fieldMapping).length > 0) {
    return rawItems.map((item) => {
      const result: Record<string, unknown> = {};
      for (const [targetField, sourceExpr] of Object.entries(fieldMapping)) {
        const keys = sourceExpr.replace(/[{}]/g, "").split(".");
        let value: unknown = item;
        for (const k of keys) {
          if (value && typeof value === "object") value = (value as any)[k];
          else { value = undefined; break; }
        }
        if (value !== undefined) result[targetField] = value;
      }
      return result as ExternalLead;
    });
  }

  return rawItems.map((item: any) => ({
    external_id: String(item.id || item.ID || ""),
    first_name: item.first_name || item.firstname || item.NAME || item.firstName || item.FirstName || "",
    last_name: item.last_name || item.lastname || item.LAST_NAME || item.lastName || item.LastName || "",
    email: item.email || item.EMAIL || item.Email || "",
    phone: item.phone || item.PHONE || item.Phone || item.mobile_number || "",
    company: item.company || item.COMPANY_TITLE || item.Company || item.companyName || item.company_name || item.org_name || "",
    source: item.hs_analytics_source || provider,
    tags: item.tags || [],
    raw_payload: item,
  }));
}

// ── Fetch pipelines (non-GHL providers) ─────────────────────
async function fetchPipelines(provider: string, apiKey: string, baseUrl: string | null): Promise<ExternalPipeline[]> {
  const token = normalizeToken(apiKey);
  switch (provider) {
    case "hubspot": {
      const resp = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.results || []).map((p: any) => ({
        id: p.id, name: p.label,
        stages: (p.stages || []).map((s: any, i: number) => ({ id: s.id, name: s.label, position: s.displayOrder ?? i })),
      }));
    }
    case "pipedrive": {
      const resp = await fetch(`${baseUrl || "https://api.pipedrive.com/v1"}/pipelines?api_token=${token}`);
      if (!resp.ok) return [];
      const data = await resp.json();
      const pipelines: ExternalPipeline[] = [];
      for (const p of data.data || []) {
        const sr = await fetch(`${baseUrl || "https://api.pipedrive.com/v1"}/stages?pipeline_id=${p.id}&api_token=${token}`);
        const sd = sr.ok ? await sr.json() : { data: [] };
        pipelines.push({
          id: String(p.id), name: p.name,
          stages: (sd.data || []).map((s: any) => ({ id: String(s.id), name: s.name, position: s.order_nr ?? 0 })),
        });
      }
      return pipelines;
    }
    default: return [];
  }
}

// ════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isServiceRole = authHeader.includes(serviceKey);
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCron = Deno.env.get("CRON_SECRET");
    const isCron = cronSecret && expectedCron && cronSecret === expectedCron;

    if (!isServiceRole && !isCron) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const uc = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await uc.auth.getUser();
      if (!user) throw new Error("Unauthorized");
    }

    const admin = createClient(supabaseUrl, serviceKey);

    let singleConnectionId: string | null = null;
    let isFirstSync = false;
    try { const b = await req.json(); singleConnectionId = b.connection_id || null; isFirstSync = b.first_sync === true; } catch {}

    let query = admin.from("crm_external_connections").select("*").eq("is_active", true).eq("sync_enabled", true);
    if (singleConnectionId) query = query.eq("id", singleConnectionId);

    const { data: connections, error: connErr } = await query;
    if (connErr) throw connErr;

    const results: Record<string, any> = {};

    for (const conn of connections || []) {
      try {
        let apiKey = "";
        if (conn.api_key_ref) {
          const { data: key } = await admin.rpc("get_crm_connection_secret", { _secret_ref: conn.api_key_ref });
          apiKey = key || "";
        }
        if (!apiKey) throw new Error("No API key found");
        const token = normalizeToken(apiKey);

        // ── 1. IMPORT PIPELINES & STAGES ─────────────────────
        const externalToInternalStage: Record<string, string> = {};
        const externalToInternalPipeline: Record<string, string> = {};

        const { count: existingPipelines } = await admin
          .from("crm_pipelines").select("id", { count: "exact", head: true }).eq("client_id", conn.client_id);

        const shouldImportPipelines = isFirstSync || (existingPipelines ?? 0) === 0;

        if (shouldImportPipelines) {
          const extPipelines = conn.provider === "gohighlevel"
            ? await fetchGhlPipelines(token, conn.base_url?.trim() || "")
            : await fetchPipelines(conn.provider, apiKey, conn.base_url);

          console.log(`Fetched ${extPipelines.length} pipelines from ${conn.provider}`);

          let pCount = 0;
          for (const ep of extPipelines) {
            const { data: np, error: pe } = await admin
              .from("crm_pipelines")
              .insert({ client_id: conn.client_id, name: ep.name, is_default: pCount === 0 })
              .select("id").single();
            if (pe || !np) { console.error(`Pipeline insert: ${pe?.message}`); continue; }
            externalToInternalPipeline[ep.id] = np.id;

            for (const s of ep.stages) {
              const sn = s.name.toLowerCase();
              const { data: ns, error: se } = await admin.from("crm_pipeline_stages").insert({
                pipeline_id: np.id, name: s.name, position: s.position,
                color: STAGE_COLORS[s.position % STAGE_COLORS.length],
                is_won_stage: sn.includes("won") || sn.includes("closed won"),
                is_lost_stage: sn.includes("lost") || sn.includes("closed lost"),
                is_qualified_stage: sn.includes("qualif"),
                is_booked_stage: sn.includes("book") || sn.includes("appointment") || sn.includes("meeting"),
                is_closed_stage: sn.includes("won") || sn.includes("lost") || sn.includes("closed"),
              }).select("id").single();
              if (se) console.error(`Stage insert: ${se.message}`);
              else if (ns) externalToInternalStage[s.id] = ns.id;
            }
            pCount++;
          }

          // fallback default pipeline
          if (pCount === 0 && (existingPipelines ?? 0) === 0) {
            const { data: dp } = await admin.from("crm_pipelines")
              .insert({ client_id: conn.client_id, name: "Default Pipeline", is_default: true }).select("id").single();
            if (dp) {
              for (const [i, s] of ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"].entries()) {
                await admin.from("crm_pipeline_stages").insert({
                  pipeline_id: dp.id, name: s, position: i,
                  color: STAGE_COLORS[i],
                  is_won_stage: s === "Won", is_lost_stage: s === "Lost",
                  is_qualified_stage: s === "Qualified", is_booked_stage: s === "Proposal",
                  is_closed_stage: s === "Won" || s === "Lost",
                });
              }
            }
          }
        } else {
          // Build existing mappings from DB (for incremental syncs)
          // We need external→internal stage map for GHL stage matching
          // Load all stages for this client's pipelines
          const { data: existingStages } = await admin
            .from("crm_pipeline_stages")
            .select("id, name, pipeline_id, position")
            .in("pipeline_id", (
              await admin.from("crm_pipelines").select("id").eq("client_id", conn.client_id)
            ).data?.map((p: any) => p.id) || []);

          // For GHL, we need to re-fetch pipeline structure to map external stage IDs
          if (conn.provider === "gohighlevel" && existingStages?.length) {
            const extPipelines = await fetchGhlPipelines(token, conn.base_url?.trim() || "");
            // Match by name
            for (const ep of extPipelines) {
              for (const es of ep.stages) {
                const match = existingStages.find(
                  (is: any) => is.name.toLowerCase() === es.name.toLowerCase()
                );
                if (match) externalToInternalStage[es.id] = match.id;
              }
            }
          }
        }

        // ── 2. GET DEFAULT PIPELINE & STAGE ──────────────────
        const { data: clientPipeline } = await admin
          .from("crm_pipelines").select("id").eq("client_id", conn.client_id)
          .order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (!clientPipeline) throw new Error("No pipeline found for client");

        const { data: defaultStage } = await admin
          .from("crm_pipeline_stages").select("id").eq("pipeline_id", clientPipeline.id)
          .order("position", { ascending: true }).limit(1).maybeSingle();
        if (!defaultStage) throw new Error("No stages found in pipeline");

        // ── 3. FETCH LEADS ───────────────────────────────────
        let leads: ExternalLead[];
        if (conn.provider === "gohighlevel") {
          leads = await fetchGhlLeads(token, conn.base_url?.trim() || "");
        } else {
          leads = await fetchGenericLeads(conn.provider, apiKey, conn.base_url, conn.field_mapping || {});
        }
        console.log(`Fetched ${leads.length} leads from ${conn.provider}`);

        // ── 4. UPSERT LEADS ──────────────────────────────────
        let syncedCount = 0;
        for (const lead of leads) {
          const fullName = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "";
          const dedupKey = lead.external_id || lead.email || lead.phone;
          if (!dedupKey) continue;

          // Resolve stage: external stage → internal stage, else default
          let stageId = defaultStage.id;
          let pipelineId = clientPipeline.id;
          if (lead.pipeline_stage_id && externalToInternalStage[lead.pipeline_stage_id]) {
            stageId = externalToInternalStage[lead.pipeline_stage_id];
          }
          if (lead.pipeline_id && externalToInternalPipeline[lead.pipeline_id]) {
            pipelineId = externalToInternalPipeline[lead.pipeline_id];
          }

          const leadData = {
            full_name: fullName || "Unknown",
            first_name: lead.first_name || "",
            last_name: lead.last_name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            company: lead.company || "",
            source: lead.source || conn.provider,
            value: lead.value || 0,
            tags: lead.tags || [],
            stage_id: stageId,
            pipeline_id: pipelineId,
            utm_source: lead.utm_source || "",
            utm_medium: lead.utm_medium || "",
            utm_campaign: lead.utm_campaign || "",
            utm_content: lead.utm_content || "",
            utm_term: lead.utm_term || "",
            campaign_name: lead.campaign_name || "",
            adset_name: lead.adset_name || "",
            ad_name: lead.ad_name || "",
            landing_page: lead.landing_page || "",
            raw_payload: lead.raw_payload || null,
            updated_at: new Date().toISOString(),
          };

          // Find existing lead
          let existingId: string | null = null;
          if (lead.external_id) {
            const { data: byExt } = await admin.from("crm_leads").select("id")
              .eq("client_id", conn.client_id).eq("external_lead_id", lead.external_id).maybeSingle();
            if (byExt) existingId = byExt.id;
          }
          if (!existingId && (lead.email || lead.phone)) {
            const filters: string[] = [];
            if (lead.email) filters.push(`email.eq.${lead.email}`);
            if (lead.phone) filters.push(`phone.eq.${lead.phone}`);
            const { data: byC } = await admin.from("crm_leads").select("id")
              .eq("client_id", conn.client_id).or(filters.join(",")).maybeSingle();
            if (byC) existingId = byC.id;
          }

          if (existingId) {
            // Update existing — including stage changes
            await admin.from("crm_leads").update(leadData).eq("id", existingId);
          } else {
            const { error: ie } = await admin.from("crm_leads").insert({
              client_id: conn.client_id,
              external_lead_id: lead.external_id || null,
              status: lead.status === "won" ? "won" : lead.status === "lost" ? "lost" : "new",
              priority: "medium",
              notes_summary: "",
              ...leadData,
            });
            if (ie) { console.error(`Lead insert: ${ie.message}`); continue; }
          }
          syncedCount++;
        }

        // ── 5. UPDATE CONNECTION STATUS ──────────────────────
        await admin.from("crm_external_connections").update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        }).eq("id", conn.id);

        results[conn.id] = { success: true, leads_synced: syncedCount };
      } catch (e) {
        console.error(`Sync error for ${conn.id}:`, e);
        await admin.from("crm_external_connections").update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: e.message?.slice(0, 500),
        }).eq("id", conn.id);
        results[conn.id] = { success: false, error: e.message };
      }
    }

    return new Response(JSON.stringify({ synced: Object.keys(results).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-external-sync error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
