import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const AFM_PREFIX = "AFM";
const PUBLIC_DOMAIN = "https://app.afmdigital.com";

type ClientSummary = {
  id: string;
  name: string;
  category: string | null;
};

type ScheduleRow = {
  id?: string;
  client_id: string;
  report_type: string;
  telegram_chat_id: string | null;
  telegram_bot_profile_id: string | null;
  is_active?: boolean;
  sections?: string[];
  created_by?: string | null;
  clients?: ClientSummary | null;
};

async function requireAgencyMember(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader || !anonKey) return false;

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return false;

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: isMember } = await adminClient.rpc("is_agency_member", { _user_id: user.id });
  return Boolean(isMember);
}

async function resolveTelegramToken(
  supabase: ReturnType<typeof createClient>,
  botProfileId: string | null | undefined,
  fallbackToken: string | null,
) {
  if (!botProfileId) return fallbackToken;

  const { data: botProfile } = await supabase
    .from("crm_bot_profiles")
    .select("bot_token_ref")
    .eq("id", botProfileId)
    .maybeSingle();

  if (!botProfile?.bot_token_ref) return fallbackToken;

  const { data: decryptedToken } = await supabase.rpc("get_social_token", {
    _token_reference: botProfile.bot_token_ref,
  });

  return decryptedToken || fallbackToken;
}

/**
 * Get AFM campaign IDs for a client, applying API-over-sheets dedup
 * (mirrors src/lib/afmCampaignFilter.ts logic exactly)
 */
async function getAfmCampaignIds(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("campaigns")
    .select("id, campaign_name, platform_campaign_id")
    .eq("client_id", clientId);

  if (!data) return [];

  const afmCampaigns = data.filter(
    (c: any) => c.campaign_name.toUpperCase().includes(AFM_PREFIX),
  );

  // If there are API-sourced AFM campaigns, exclude sheets-sourced ones to prevent duplication
  const apiCampaigns = afmCampaigns.filter(
    (c: any) => !c.platform_campaign_id.startsWith("sheets-"),
  );
  if (apiCampaigns.length > 0) {
    return apiCampaigns.map((c: any) => c.id);
  }

  // Fallback: use sheets campaigns if no API campaigns exist
  return afmCampaigns.map((c: any) => c.id);
}

/**
 * Fetch all daily_metrics for given campaign IDs and date range,
 * handling the 1000-row Supabase limit by paginating.
 */
async function fetchAllMetrics(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  campaignIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from("daily_metrics")
      .select("date, spend, impressions, link_clicks, leads, purchases, revenue, add_to_cart, checkouts")
      .eq("client_id", clientId)
      .in("campaign_id", campaignIds)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date")
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = data || [];
    allRows = allRows.concat(rows);
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allRows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const defaultTelegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const reportType = (body.report_type as string) || "weekly";
    const forceClientId = body.client_id as string | undefined;
    const testMode = body.test_mode === true;
    const overrideChatId = typeof body.telegram_chat_id === "string" ? body.telegram_chat_id.trim() : "";
    const overrideBotProfileId = typeof body.telegram_bot_profile_id === "string" ? body.telegram_bot_profile_id : undefined;
    const usesManualOverrides = testMode || Boolean(overrideChatId) || Boolean(overrideBotProfileId);

    if (usesManualOverrides) {
      const isAllowed = await requireAgencyMember(req, supabaseUrl, serviceKey);
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Determine date range
    const now = new Date();
    let dateFrom: string, dateTo: string, periodLabel: string;

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    if (reportType === "monthly") {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFrom = prevMonth.toISOString().split("T")[0];
      dateTo = lastDay.toISOString().split("T")[0];
      periodLabel = `${monthNames[prevMonth.getMonth()]} ${prevMonth.getFullYear()}`;
    } else {
      const dayOfWeek = now.getDay() || 7;
      const lastSun = new Date(now);
      lastSun.setDate(now.getDate() - dayOfWeek);
      const lastMon = new Date(lastSun);
      lastMon.setDate(lastSun.getDate() - 6);
      dateFrom = lastMon.toISOString().split("T")[0];
      dateTo = lastSun.toISOString().split("T")[0];
      periodLabel = `${dateFrom} — ${dateTo}`;
    }

    let schedules: ScheduleRow[] = [];

    if (forceClientId && usesManualOverrides) {
      const [{ data: client }, { data: existingSchedule }] = await Promise.all([
        supabase.from("clients").select("id, name, category").eq("id", forceClientId).maybeSingle(),
        supabase
          .from("client_report_schedules")
          .select("*")
          .eq("client_id", forceClientId)
          .eq("report_type", reportType)
          .maybeSingle(),
      ]);

      if (!client) {
        return new Response(JSON.stringify({ error: "Client not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      schedules = [{
        id: existingSchedule?.id,
        client_id: forceClientId,
        report_type: reportType,
        telegram_chat_id: overrideChatId || existingSchedule?.telegram_chat_id || null,
        telegram_bot_profile_id: overrideBotProfileId || existingSchedule?.telegram_bot_profile_id || null,
        is_active: true,
        sections: Array.isArray(existingSchedule?.sections)
          ? existingSchedule.sections
          : ["kpi_summary", "daily_table", "campaigns_list"],
        created_by: existingSchedule?.created_by || null,
        clients: client as ClientSummary,
      }];
    } else {
      let query = supabase
        .from("client_report_schedules")
        .select("*, clients:client_id(id, name, category)")
        .eq("report_type", reportType)
        .eq("is_active", true);

      if (forceClientId) {
        query = query.eq("client_id", forceClientId);
      }

      const { data } = await query;
      schedules = (data || []) as unknown as ScheduleRow[];
    }

    if (!schedules.length) {
      return new Response(JSON.stringify({ message: "No active schedules", sent: 0, errors: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const errors: string[] = [];
    const reportIds: string[] = [];

    for (const schedule of schedules) {
      const client = schedule.clients;
      if (!client) continue;

      const chatId = overrideChatId || schedule.telegram_chat_id;
      const telegramToken = await resolveTelegramToken(
        supabase,
        overrideBotProfileId || schedule.telegram_bot_profile_id,
        defaultTelegramBotToken,
      );

      if (!chatId || !telegramToken) {
        errors.push(`${client.name}: missing telegram chat or bot token`);
        continue;
      }

      try {
        // Use the same AFM filter + API-over-sheets dedup as dashboard
        const campaignIds = await getAfmCampaignIds(supabase, client.id);

        // Also fetch campaign details for the report
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, campaign_name, status")
          .in("id", campaignIds.length > 0 ? campaignIds : ["__none__"]);

        let metrics: any[] = [];
        if (campaignIds.length > 0) {
          metrics = await fetchAllMetrics(supabase, client.id, campaignIds, dateFrom, dateTo);
        }

        const totals = metrics.reduce((acc, m) => ({
          spend: acc.spend + Number(m.spend || 0),
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.link_clicks || 0),
          leads: acc.leads + (m.leads || 0),
          purchases: acc.purchases + Number(m.purchases || 0),
          revenue: acc.revenue + Number(m.revenue || 0),
        }), { spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0 });

        const cpl = totals.leads > 0 ? (totals.spend / totals.leads).toFixed(2) : "—";
        const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0";
        const roas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : "—";

        const reportTitle = `${client.name} — ${periodLabel}`;
        const content = {
          sections: Array.isArray(schedule.sections) ? schedule.sections : ["kpi_summary", "daily_table", "campaigns_list"],
          totals,
          daily: metrics,
          campaigns: campaigns || [],
          clientName: client.name,
          category: client.category || "other",
          auto_generated: true,
          period: periodLabel,
        };

        const { data: savedReport, error: reportError } = await supabase
          .from("reports")
          .insert({
            client_id: client.id,
            title: reportTitle,
            date_from: dateFrom,
            date_to: dateTo,
            status: "published",
            content,
            created_by: schedule.created_by,
          })
          .select("id")
          .single();

        if (reportError) throw reportError;
        if (savedReport?.id) reportIds.push(savedReport.id);

        const reportUrl = `${PUBLIC_DOMAIN}/r/${savedReport?.id || ""}`;
        const isEcom = ["ecom", "e-commerce", "ecommerce"].includes((client.category || "").toLowerCase());

        let msg = `📊 *${reportType === "monthly" ? "Monthly" : "Weekly"} Report*\n`;
        msg += `🏢 ${client.name}\n`;
        msg += `📅 ${periodLabel}\n\n`;
        msg += `💰 Spend: $${totals.spend.toFixed(0)}\n`;
        msg += `👁 Impressions: ${totals.impressions.toLocaleString()}\n`;
        msg += `🖱 Clicks: ${totals.clicks.toLocaleString()}\n`;
        msg += `📋 Leads: ${totals.leads}\n`;
        msg += `💵 CPL: $${cpl}\n`;
        msg += `📈 CTR: ${ctr}%\n`;
        if (isEcom && totals.purchases > 0) {
          msg += `🛒 Purchases: ${totals.purchases}\n`;
          msg += `💎 Revenue: $${totals.revenue.toFixed(0)}\n`;
          msg += `🔥 ROAS: ${roas}x\n`;
        }
        msg += `\n🔗 [View Full Report](${reportUrl})`;
        msg += `\n📥 CSV download available in the report`;

        const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "Markdown",
            disable_web_page_preview: false,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`${client.name}: Telegram ${res.status} — ${errText.substring(0, 200)}`);
        } else {
          await res.text(); // consume body
          sentCount++;
        }
      } catch (e: any) {
        errors.push(`${client.name}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, errors, period: periodLabel, report_ids: reportIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("scheduled-report error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
