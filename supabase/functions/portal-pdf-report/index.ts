import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, period_label, date_from, date_to } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify access: portal user or agency member
    const { data: portalUser } = await supabase
      .from("client_portal_users")
      .select("id, client_id")
      .eq("user_id", user.id)
      .eq("client_id", client_id)
      .eq("status", "active")
      .maybeSingle();

    const { data: agencyUser } = await supabase
      .from("agency_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!portalUser && !agencyUser) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client info
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .maybeSingle();

    // Fetch snapshots
    let snapQ = supabase
      .from("campaign_performance_snapshots")
      .select("*")
      .eq("client_id", client_id)
      .eq("entity_level", "campaign")
      .order("synced_at", { ascending: false })
      .limit(300);

    if (date_from) snapQ = snapQ.gte("synced_at", date_from);
    if (date_to) snapQ = snapQ.lte("synced_at", date_to);

    const { data: snapshots } = await snapQ;
    const snaps = snapshots || [];

    // Fetch launches, recs, actions
    const [launchRes, recRes, actRes] = await Promise.all([
      supabase
        .from("launch_requests")
        .select("id, platform, executed_at, metadata, external_campaign_id")
        .eq("client_id", client_id)
        .not("external_campaign_id", "is", null)
        .order("executed_at", { ascending: false })
        .limit(20),
      supabase
        .from("ai_recommendations")
        .select("id, title, priority, status")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("optimization_actions")
        .select("id, action_type, status")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Dedup snapshots
    const dedupMap = new Map<string, typeof snaps[0]>();
    for (const s of snaps) {
      const key = s.external_campaign_id || s.id;
      const existing = dedupMap.get(key);
      if (!existing || new Date(s.synced_at) > new Date(existing.synced_at)) {
        dedupMap.set(key, s);
      }
    }
    const latest = Array.from(dedupMap.values());

    // Calculate totals
    const totalSpend = latest.reduce((s, x) => s + Number(x.spend || 0), 0);
    const totalClicks = latest.reduce((s, x) => s + Number(x.clicks || 0), 0);
    const totalLeads = latest.reduce((s, x) => s + Number(x.leads || 0), 0);
    const totalRevenue = latest.reduce((s, x) => s + Number(x.revenue || 0), 0);
    const avgCTR = latest.length > 0 ? latest.reduce((s, x) => s + Number(x.ctr || 0), 0) / latest.length : 0;

    const launches = launchRes.data || [];
    const recs = recRes.data || [];
    const actions = actRes.data || [];

    const activeLaunches = launches.filter((l: any) => l.metadata?.campaign_status === "ACTIVE").length;
    const executedActions = actions.filter((a: any) => a.status === "executed").length;
    const activeRecs = recs.filter((r: any) => ["new", "reviewed"].includes(r.status)).length;

    const now = new Date().toISOString();
    const clientName = client?.name || "Client";
    const period = period_label || "All Time";

    // Generate PDF-like HTML content that can be printed/saved as PDF
    // Using a clean, minimal layout suitable for conversion
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Performance Report — ${clientName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid #D4A843; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 24px; font-weight: 700; color: #1a1a2e; }
  .header .meta { font-size: 12px; color: #666; margin-top: 6px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; border-left: 4px solid #D4A843; padding-left: 10px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .kpi { text-align: center; background: #f8f8fa; border-radius: 8px; padding: 16px 8px; }
  .kpi .value { font-size: 22px; font-weight: 700; color: #1a1a2e; }
  .kpi .label { font-size: 11px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #e0e0e0; color: #666; font-weight: 600; }
  td { padding: 7px 6px; border-bottom: 1px solid #f0f0f0; }
  .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
  .summary-row .label { color: #666; }
  .summary-row .val { font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>Performance Report</h1>
  <div class="meta">${clientName} · Period: ${period} · Generated: ${new Date(now).toLocaleDateString()}</div>
</div>

<div class="section">
  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value">$${totalSpend.toFixed(0)}</div><div class="label">Total Spend</div></div>
    <div class="kpi"><div class="value">${totalClicks.toLocaleString()}</div><div class="label">Clicks</div></div>
    <div class="kpi"><div class="value">${totalLeads}</div><div class="label">Leads</div></div>
    <div class="kpi"><div class="value">$${totalRevenue.toFixed(0)}</div><div class="label">Revenue</div></div>
  </div>
</div>

${latest.length > 0 ? `<div class="section">
  <h2>Campaign Performance</h2>
  <table>
    <tr><th>Campaign</th><th>Platform</th><th>Spend</th><th>Clicks</th><th>Leads</th><th>CTR</th></tr>
    ${latest.slice(0, 20).map((s: any) => `<tr>
      <td>${(s.entity_name || "Campaign").replace(/</g, "&lt;")}</td>
      <td>${s.platform || "Meta"}</td>
      <td>$${Number(s.spend || 0).toFixed(0)}</td>
      <td>${s.clicks || 0}</td>
      <td>${s.leads || 0}</td>
      <td>${Number(s.ctr || 0).toFixed(2)}%</td>
    </tr>`).join("")}
  </table>
</div>` : ""}

<div class="section">
  <h2>Delivery Summary</h2>
  <div class="summary-row"><span class="label">Campaigns Launched</span><span class="val">${launches.length}</span></div>
  <div class="summary-row"><span class="label">Active Campaigns</span><span class="val">${activeLaunches}</span></div>
  <div class="summary-row"><span class="label">Average CTR</span><span class="val">${avgCTR.toFixed(2)}%</span></div>
</div>

<div class="section">
  <h2>Optimization Activity</h2>
  <div class="summary-row"><span class="label">Total Actions</span><span class="val">${actions.length}</span></div>
  <div class="summary-row"><span class="label">Completed</span><span class="val">${executedActions}</span></div>
  <div class="summary-row"><span class="label">Active Insights</span><span class="val">${activeRecs}</span></div>
  <div class="summary-row"><span class="label">Resolved Insights</span><span class="val">${recs.length - activeRecs}</span></div>
</div>

<div class="footer">
  This report was generated automatically. Data reflects the latest available information as of the report generation date.
</div>
</body></html>`;

    // Audit log
    await supabase.from("audit_log").insert({
      action: "portal_pdf_report_generated",
      entity_type: "portal_export",
      entity_id: client_id,
      user_id: user.id,
      details: { period: period_label, campaigns: latest.length },
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${clientName.replace(/[^a-zA-Z0-9]/g, "-")}-${period.replace(/\s/g, "-")}.html"`,
      },
    });
  } catch (err) {
    console.error("PDF report error:", err);
    return new Response(JSON.stringify({ error: "generation_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
