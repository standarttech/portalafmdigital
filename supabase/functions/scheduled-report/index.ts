import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const reportType = body.report_type as string; // 'weekly' | 'monthly'
    const forceClientId = body.client_id as string | undefined;

    // Determine date range
    const now = new Date();
    let dateFrom: string, dateTo: string, periodLabel: string;

    if (reportType === "monthly") {
      // Previous month
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFrom = prevMonth.toISOString().split("T")[0];
      dateTo = lastDay.toISOString().split("T")[0];
      periodLabel = prevMonth.toLocaleString("ru-RU", { month: "long", year: "numeric" });
    } else {
      // Previous week (Mon-Sun)
      const dayOfWeek = now.getDay() || 7; // 1=Mon..7=Sun
      const lastSun = new Date(now);
      lastSun.setDate(now.getDate() - dayOfWeek);
      const lastMon = new Date(lastSun);
      lastMon.setDate(lastSun.getDate() - 6);
      dateFrom = lastMon.toISOString().split("T")[0];
      dateTo = lastSun.toISOString().split("T")[0];
      periodLabel = `${dateFrom} — ${dateTo}`;
    }

    // Get active schedules
    let query = supabase
      .from("client_report_schedules")
      .select("*, clients:client_id(id, name, category)")
      .eq("report_type", reportType || "weekly")
      .eq("is_active", true);

    if (forceClientId) {
      query = query.eq("client_id", forceClientId);
    }

    const { data: schedules } = await query;
    if (!schedules?.length) {
      return new Response(JSON.stringify({ message: "No active schedules", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const schedule of schedules) {
      const client = (schedule as any).clients;
      if (!client) continue;

      const chatId = schedule.telegram_chat_id;
      if (!chatId || !telegramBotToken) {
        errors.push(`${client.name}: no telegram_chat_id or bot token`);
        continue;
      }

      try {
        // Fetch AFM campaigns
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, campaign_name, status")
          .eq("client_id", client.id)
          .ilike("campaign_name", "%AFM%");

        const campaignIds = (campaigns || []).map((c: any) => c.id);

        // Fetch metrics
        let metrics: any[] = [];
        if (campaignIds.length > 0) {
          const { data } = await supabase
            .from("daily_metrics")
            .select("date, spend, impressions, link_clicks, leads, purchases, revenue, add_to_cart, checkouts")
            .eq("client_id", client.id)
            .in("campaign_id", campaignIds)
            .gte("date", dateFrom)
            .lte("date", dateTo)
            .order("date");
          metrics = data || [];
        }

        // Calculate totals
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

        // Save report to DB
        const reportTitle = `${client.name} — ${reportType === "monthly" ? periodLabel : periodLabel}`;
        const content = {
          sections: schedule.sections || ["kpi_summary", "daily_table", "campaigns_list"],
          totals,
          daily: metrics,
          campaigns: campaigns || [],
          clientName: client.name,
          category: client.category || "other",
          auto_generated: true,
          period: periodLabel,
        };

        const { data: savedReport } = await supabase.from("reports").insert({
          client_id: client.id,
          title: reportTitle,
          date_from: dateFrom,
          date_to: dateTo,
          status: "published",
          content,
          created_by: schedule.created_by,
        }).select("id").single();

        // Build report URL
        const reportUrl = `https://portalafmdigital.lovable.app/reports${savedReport ? `?preview=${savedReport.id}` : ""}`;

        // Build Telegram message
        const isEcom = ["ecom", "e-commerce", "ecommerce"].includes((client.category || "").toLowerCase());
        let msg = `📊 *${reportType === "monthly" ? "Ежемесячный" : "Еженедельный"} отчёт*\n`;
        msg += `🏢 ${client.name}\n`;
        msg += `📅 ${periodLabel}\n\n`;
        msg += `💰 Расход: $${totals.spend.toFixed(0)}\n`;
        msg += `👁 Показы: ${totals.impressions.toLocaleString()}\n`;
        msg += `🖱 Клики: ${totals.clicks.toLocaleString()}\n`;
        msg += `📋 Лиды: ${totals.leads}\n`;
        msg += `💵 CPL: $${cpl}\n`;
        msg += `📈 CTR: ${ctr}%\n`;
        if (isEcom && totals.purchases > 0) {
          msg += `🛒 Покупки: ${totals.purchases}\n`;
          msg += `💎 Выручка: $${totals.revenue.toFixed(0)}\n`;
          msg += `🔥 ROAS: ${roas}x\n`;
        }
        msg += `\n🔗 [Открыть полный отчёт](${reportUrl})`;
        msg += `\n📥 Доступны PDF и CSV в отчёте`;

        // Send to Telegram
        const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
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
          sentCount++;
        }
      } catch (e: any) {
        errors.push(`${client.name}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, errors, period: periodLabel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("scheduled-report error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
