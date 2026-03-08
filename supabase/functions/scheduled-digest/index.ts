import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTAL_URL = "https://portalafmdigital.lovable.app";

// ─── Helpers ───────────────────────────────────────────────

function fmt(n: number | null, decimals = 0): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2) + "%";
}

function currency(n: number | null, cur = "$"): string {
  if (n === null || n === undefined) return "—";
  return cur + fmt(n, 2);
}

function changeArrow(current: number, previous: number): string {
  if (!previous) return '<span style="color:#94a3b8;">N/A</span>';
  const change = ((current - previous) / previous) * 100;
  const color = change >= 0 ? "#22c55e" : "#ef4444";
  const arrow = change >= 0 ? "↑" : "↓";
  return `<span style="color:${color};">${arrow} ${Math.abs(change).toFixed(1)}%</span>`;
}

// ─── Email HTML Templates ──────────────────────────────────

function emailWrapper(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0b10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b10;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- Header -->
  <tr><td style="text-align:center;padding:0 0 24px;">
    <h1 style="margin:0;font-size:22px;color:#d4a843;letter-spacing:1px;">AFM DIGITAL</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#64748b;">${title}</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="background:#131520;border-radius:16px;border:1px solid #1e2030;padding:28px;">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="text-align:center;padding:24px 0 0;">
    <a href="${PORTAL_URL}/dashboard" style="display:inline-block;background:#d4a843;color:#0a0b10;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open Portal</a>
    <p style="margin:16px 0 0;font-size:11px;color:#475569;">This is an automated report from AFM DIGITAL Platform.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function metricRow(label: string, value: string, change?: string): string {
  return `<tr>
    <td style="padding:10px 12px;color:#cbd5e1;font-size:14px;border-bottom:1px solid #1e2030;">${label}</td>
    <td style="padding:10px 12px;color:#f1f5f9;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #1e2030;">${value}</td>
    ${change !== undefined ? `<td style="padding:10px 12px;font-size:13px;text-align:right;border-bottom:1px solid #1e2030;">${change}</td>` : ""}
  </tr>`;
}

function sectionHeader(title: string): string {
  return `<tr><td colspan="3" style="padding:18px 12px 8px;font-size:15px;font-weight:700;color:#d4a843;border-bottom:2px solid #d4a843;">${title}</td></tr>`;
}

function clientMetricsTable(
  clientName: string,
  metrics: { spend: number; impressions: number; clicks: number; leads: number; purchases: number; revenue: number },
  prev: { spend: number; impressions: number; clicks: number; leads: number; purchases: number; revenue: number } | null,
  category: string
): string {
  const cpl = metrics.leads > 0 ? metrics.spend / metrics.leads : null;
  const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : null;
  const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : null;

  let rows = `
    ${sectionHeader(clientName)}
    ${metricRow("Spend", currency(metrics.spend), prev ? changeArrow(metrics.spend, prev.spend) : undefined)}
    ${metricRow("Impressions", fmt(metrics.impressions), prev ? changeArrow(metrics.impressions, prev.impressions) : undefined)}
    ${metricRow("Link Clicks", fmt(metrics.clicks), prev ? changeArrow(metrics.clicks, prev.clicks) : undefined)}
    ${metricRow("CTR", pct(ctr))}
  `;

  if (category === "ecom" || category === "ecommerce") {
    rows += `
      ${metricRow("Purchases", fmt(metrics.purchases), prev ? changeArrow(metrics.purchases, prev.purchases) : undefined)}
      ${metricRow("Revenue", currency(metrics.revenue), prev ? changeArrow(metrics.revenue, prev.revenue) : undefined)}
      ${metricRow("ROAS", roas !== null ? roas.toFixed(2) + "x" : "—")}
    `;
  } else {
    rows += `
      ${metricRow("Leads", fmt(metrics.leads), prev ? changeArrow(metrics.leads, prev.leads) : undefined)}
      ${metricRow("CPL", cpl !== null ? currency(cpl) : "—")}
    `;
  }

  return rows;
}

// ─── Data Fetching ─────────────────────────────────────────

async function getMetricsForPeriod(
  supabase: any,
  clientId: string,
  dateFrom: string,
  dateTo: string
) {
  const { data } = await supabase
    .from("daily_metrics")
    .select("spend, impressions, link_clicks, leads, purchases, revenue")
    .eq("client_id", clientId)
    .gte("date", dateFrom)
    .lte("date", dateTo);

  const agg = { spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0 };
  if (data) {
    for (const row of data) {
      agg.spend += Number(row.spend) || 0;
      agg.impressions += Number(row.impressions) || 0;
      agg.clicks += Number(row.link_clicks) || 0;
      agg.leads += Number(row.leads) || 0;
      agg.purchases += Number(row.purchases) || 0;
      agg.revenue += Number(row.revenue) || 0;
    }
  }
  return agg;
}

function getDateRange(type: "weekly" | "monthly"): { current: { from: string; to: string }; previous: { from: string; to: string } } {
  const now = new Date();

  if (type === "weekly") {
    // Last 7 days vs previous 7 days
    const curTo = new Date(now);
    curTo.setDate(curTo.getDate() - 1); // yesterday
    const curFrom = new Date(curTo);
    curFrom.setDate(curFrom.getDate() - 6);

    const prevTo = new Date(curFrom);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 6);

    return {
      current: { from: curFrom.toISOString().split("T")[0], to: curTo.toISOString().split("T")[0] },
      previous: { from: prevFrom.toISOString().split("T")[0], to: prevTo.toISOString().split("T")[0] },
    };
  } else {
    // Last month vs month before
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    return {
      current: { from: lastMonth.toISOString().split("T")[0], to: lastMonthEnd.toISOString().split("T")[0] },
      previous: { from: prevMonth.toISOString().split("T")[0], to: prevMonthEnd.toISOString().split("T")[0] },
    };
  }
}

// ─── Main Handler ──────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Auth: service_role or cron secret
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceKey && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));
    const digestType: "weekly" | "monthly" = body.type || "weekly";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const resend = new Resend(resendApiKey);
    const dateRange = getDateRange(digestType);

    // Fetch all active clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, category, status")
      .eq("status", "active");

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ message: "No active clients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── WEEKLY: Team Digest ───────────────────────────────

    if (digestType === "weekly") {
      // Gather metrics for all clients
      let allClientsHtml = "";
      let totalSpend = 0;
      let totalLeads = 0;
      let totalRevenue = 0;

      for (const client of clients) {
        const current = await getMetricsForPeriod(supabase, client.id, dateRange.current.from, dateRange.current.to);
        const previous = await getMetricsForPeriod(supabase, client.id, dateRange.previous.from, dateRange.previous.to);

        totalSpend += current.spend;
        totalLeads += current.leads;
        totalRevenue += current.revenue;

        allClientsHtml += clientMetricsTable(client.name, current, previous, client.category);
      }

      // Summary row
      const summaryHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td style="background:#d4a843;border-radius:10px;padding:16px 18px;width:33%;text-align:center;">
              <div style="font-size:11px;color:#0a0b10;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Total Spend</div>
              <div style="font-size:20px;color:#0a0b10;font-weight:800;margin-top:4px;">${currency(totalSpend)}</div>
            </td>
            <td style="width:8px;"></td>
            <td style="background:#1e2030;border-radius:10px;padding:16px 18px;width:33%;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Total Leads</div>
              <div style="font-size:20px;color:#f1f5f9;font-weight:800;margin-top:4px;">${fmt(totalLeads)}</div>
            </td>
            <td style="width:8px;"></td>
            <td style="background:#1e2030;border-radius:10px;padding:16px 18px;width:33%;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Total Revenue</div>
              <div style="font-size:20px;color:#22c55e;font-weight:800;margin-top:4px;">${currency(totalRevenue)}</div>
            </td>
          </tr>
        </table>
      `;

      const detailsHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
          ${allClientsHtml}
        </table>
      `;

      const periodLabel = `${dateRange.current.from} — ${dateRange.current.to}`;
      const fullHtml = emailWrapper(
        `Weekly Performance Digest · ${periodLabel}`,
        `
          <h2 style="margin:0 0 16px;font-size:17px;color:#f1f5f9;">📊 Weekly Summary</h2>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">${periodLabel} · ${clients.length} active clients · Changes vs previous week</p>
          ${summaryHtml}
          ${detailsHtml}
        `
      );

      // Send to all agency admins and media buyers
      const { data: agencyUsers } = await supabase
        .from("agency_users")
        .select("user_id, agency_role")
        .in("agency_role", ["AgencyAdmin", "MediaBuyer"]);

      let sent = 0;
      if (agencyUsers) {
        for (const au of agencyUsers) {
          const { data: userData } = await supabase.auth.admin.getUserById(au.user_id);
          const email = userData?.user?.email;
          if (email) {
            const { error } = await resend.emails.send({
              from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
              to: [email],
              subject: `📊 Weekly Digest — ${periodLabel}`,
              html: fullHtml,
            });
            if (!error) sent++;
            else console.error(`Failed to send to ${email}:`, error);
          }
        }
      }

      console.log(`Weekly digest sent to ${sent} team members`);
      return new Response(JSON.stringify({ success: true, type: "weekly", sent }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── MONTHLY: Client Reports ───────────────────────────

    if (digestType === "monthly") {
      let sent = 0;
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const reportMonth = new Date(dateRange.current.from);
      const monthLabel = `${monthNames[reportMonth.getMonth()]} ${reportMonth.getFullYear()}`;

      for (const client of clients) {
        // Get client users with email
        const { data: clientUsers } = await supabase
          .from("client_users")
          .select("user_id")
          .eq("client_id", client.id);

        if (!clientUsers || clientUsers.length === 0) continue;

        // Filter to Client role users
        const { data: clientRoleUsers } = await supabase
          .from("agency_users")
          .select("user_id")
          .in("user_id", clientUsers.map((cu: any) => cu.user_id))
          .eq("agency_role", "Client");

        if (!clientRoleUsers || clientRoleUsers.length === 0) continue;

        const current = await getMetricsForPeriod(supabase, client.id, dateRange.current.from, dateRange.current.to);
        const previous = await getMetricsForPeriod(supabase, client.id, dateRange.previous.from, dateRange.previous.to);

        // Build budget progress
        const { data: budget } = await supabase
          .from("budget_plans")
          .select("planned_spend, planned_leads")
          .eq("client_id", client.id)
          .eq("month", dateRange.current.from)
          .maybeSingle();

        const budgetProgress = budget
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
              <tr>
                <td style="background:#1e2030;border-radius:10px;padding:14px 18px;width:50%;">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Budget Used</div>
                  <div style="font-size:18px;color:#f1f5f9;font-weight:700;margin-top:4px;">${currency(current.spend)} / ${currency(budget.planned_spend)}</div>
                  <div style="background:#2d2f3d;border-radius:4px;height:6px;margin-top:8px;overflow:hidden;">
                    <div style="background:#d4a843;height:6px;border-radius:4px;width:${Math.min((current.spend / (budget.planned_spend || 1)) * 100, 100)}%;"></div>
                  </div>
                </td>
                <td style="width:12px;"></td>
                <td style="background:#1e2030;border-radius:10px;padding:14px 18px;width:50%;">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Leads Target</div>
                  <div style="font-size:18px;color:#f1f5f9;font-weight:700;margin-top:4px;">${fmt(current.leads)} / ${fmt(budget.planned_leads)}</div>
                  <div style="background:#2d2f3d;border-radius:4px;height:6px;margin-top:8px;overflow:hidden;">
                    <div style="background:#22c55e;height:6px;border-radius:4px;width:${Math.min((current.leads / (budget.planned_leads || 1)) * 100, 100)}%;"></div>
                  </div>
                </td>
              </tr>
            </table>`
          : "";

        const metricsHtml = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${clientMetricsTable(client.name, current, previous, client.category)}
          </table>
        `;

        const fullHtml = emailWrapper(
          `Monthly Report · ${monthLabel}`,
          `
            <h2 style="margin:0 0 8px;font-size:17px;color:#f1f5f9;">📈 Monthly Report for ${client.name}</h2>
            <p style="margin:0 0 20px;font-size:13px;color:#64748b;">${monthLabel} · Changes vs previous month</p>
            ${budgetProgress}
            ${metricsHtml}
            <div style="margin-top:24px;padding:16px;background:#1e2030;border-radius:10px;text-align:center;">
              <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">View detailed analytics and daily breakdowns in your portal</p>
              <a href="${PORTAL_URL}/client/${client.id}" style="display:inline-block;background:#d4a843;color:#0a0b10;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">View Full Report →</a>
            </div>
          `
        );

        for (const cu of clientRoleUsers) {
          const { data: userData } = await supabase.auth.admin.getUserById(cu.user_id);
          const email = userData?.user?.email;
          if (email) {
            const { error } = await resend.emails.send({
              from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
              to: [email],
              subject: `📈 ${client.name} — Monthly Report · ${monthLabel}`,
              html: fullHtml,
            });
            if (!error) sent++;
            else console.error(`Failed to send to ${email}:`, error);
          }
        }
      }

      console.log(`Monthly reports sent to ${sent} client users`);
      return new Response(JSON.stringify({ success: true, type: "monthly", sent }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("scheduled-digest error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
