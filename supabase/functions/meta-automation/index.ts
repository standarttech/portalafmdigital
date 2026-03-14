import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_VERSION = "v21.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    // Get Meta access token from platform_integrations
    const accessToken = await getMetaToken(supabase);
    if (!accessToken) {
      throw new Error("Meta Ads Management not connected. Go to Integrations to set up.");
    }

    // Get ad account ID
    const adAccountId = body.ad_account_id || await getDefaultAdAccountId(supabase);

    let result: any;

    switch (action) {
      case "list_ad_accounts":
        result = await listAdAccounts(accessToken);
        break;
      case "list_pixels":
        result = await listPixels(accessToken, adAccountId);
        break;
      case "create_pixel":
        result = await createPixel(accessToken, adAccountId, body);
        break;
      case "create_audience":
        result = await createAudience(accessToken, adAccountId, body);
        break;
      case "create_lead_form":
        result = await createLeadForm(accessToken, body);
        break;
      case "create_campaign":
        result = await createCampaign(accessToken, adAccountId, body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Audit log
    await supabase.from("audit_log").insert({
      action: `meta_automation_${action}`,
      entity_type: "meta_automation",
      entity_id: result?.pixel_id || result?.audience_id || result?.form_id || result?.campaign_id || "unknown",
      user_id: user.id,
      details: { action, result_id: result?.pixel_id || result?.audience_id || result?.form_id || result?.campaign_id },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-automation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getMetaToken(supabase: any): Promise<string | null> {
  const { data } = await supabase.rpc("get_platform_integration_secret", {
    _integration_type: "meta_ads_management",
  });
  return data || null;
}

async function getDefaultAdAccountId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("platform_integrations")
    .select("config")
    .eq("integration_type", "meta_ads_management")
    .maybeSingle();
  const cfg = data?.config as any;
  if (cfg?.default_ad_account_id) return cfg.default_ad_account_id;
  throw new Error("Ad Account ID is required. Provide ad_account_id or set default in integration config.");
}

async function metaFetch(url: string, token: string, method = "GET", body?: any) {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  
  if (method === "POST" && body) {
    const params = new URLSearchParams();
    params.set("access_token", token);
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    }
    opts.body = params.toString();
    opts.headers = { "Content-Type": "application/x-www-form-urlencoded" };
  } else {
    url += (url.includes("?") ? "&" : "?") + `access_token=${token}`;
  }

  const res = await fetch(url, opts);
  const data = await res.json();

  if (!res.ok || data.error) {
    const errMsg = data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error);
    throw new Error(`Meta API error: ${errMsg}`);
  }

  return data;
}

// ─── List Ad Accounts from Meta API ───
async function listAdAccounts(token: string) {
  const data = await metaFetch(
    `${META_BASE}/me/adaccounts?fields=name,account_id,account_status,currency,timezone_name,business_name&limit=100`,
    token
  );
  const accounts = (data.data || []).map((a: any) => ({
    account_id: a.account_id,
    act_id: a.id,
    name: a.name || a.account_id,
    status: a.account_status,
    currency: a.currency,
    timezone: a.timezone_name,
    business_name: a.business_name,
  }));
  return { accounts };
}

// ─── List Pixels for Account ───
async function listPixels(token: string, adAccountId: string) {
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await metaFetch(
    `${META_BASE}/${actId}/adspixels?fields=name,id,creation_time,is_unavailable&limit=50`,
    token
  );
  const pixels = (data.data || []).map((p: any) => ({
    pixel_id: p.id,
    name: p.name,
    created: p.creation_time,
    unavailable: p.is_unavailable,
  }));
  return { pixels };
}

// ─── Create Pixel ───
async function createPixel(token: string, adAccountId: string, body: any) {
  const { name, events } = body;
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const result = await metaFetch(`${META_BASE}/${actId}/adspixels`, token, "POST", { name });

  return {
    pixel_id: result.id,
    name,
    events: events || [],
    install_code: `<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;\nn.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,\ndocument,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${result.id}');\nfbq('track', 'PageView');\n</script>`,
  };
}

// ─── Create Audience ───
async function createAudience(token: string, adAccountId: string, body: any) {
  const { type, name, description } = body;
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  if (type === "custom") {
    const { customer_data, retention_days } = body;
    // Create custom audience
    const audience = await metaFetch(`${META_BASE}/${actId}/customaudiences`, token, "POST", {
      name,
      description: description || "",
      subtype: "CUSTOM",
      customer_file_source: "USER_PROVIDED_ONLY",
      retention_days: retention_days || 30,
    });

    // If customer data provided, hash and upload
    if (customer_data) {
      const lines = customer_data.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const schema = lines[0]?.includes("@") ? ["EMAIL"] : ["PHONE"];
      
      // Hash data
      const hashedData = [];
      for (const line of lines) {
        const normalized = line.toLowerCase().trim();
        const encoder = new TextEncoder();
        const data = encoder.encode(normalized);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        hashedData.push([hashHex]);
      }

      await metaFetch(`${META_BASE}/${audience.id}/users`, token, "POST", {
        payload: { schema, data: hashedData },
      });
    }

    return { audience_id: audience.id, type: "custom", name, records_count: customer_data ? customer_data.split("\n").filter(Boolean).length : 0 };
  }

  if (type === "lookalike") {
    const { source_audience_id, ratio, countries } = body;
    const result = await metaFetch(`${META_BASE}/${actId}/customaudiences`, token, "POST", {
      name,
      subtype: "LOOKALIKE",
      origin_audience_id: source_audience_id,
      lookalike_spec: JSON.stringify({
        type: "similarity",
        country: countries?.[0] || "US",
        ratio: (ratio || 1) / 100,
      }),
    });
    return { audience_id: result.id, type: "lookalike", name, ratio };
  }

  if (type === "saved") {
    const result = await metaFetch(`${META_BASE}/${actId}/saved_audiences`, token, "POST", {
      name,
      description: description || "",
      targeting: JSON.stringify({ geo_locations: { countries: ["US"] } }),
    });
    return { audience_id: result.id, type: "saved", name };
  }

  throw new Error("Invalid audience type");
}

// ─── Create Lead Form ───
async function createLeadForm(token: string, body: any) {
  const { page_id, name, fields, privacy_url, headline, description, thank_you_title, thank_you_description, button_text } = body;

  if (!page_id) throw new Error("page_id is required for lead form creation");

  const questions = (fields || ["full_name", "email", "phone_number"]).map((f: string) => ({
    type: f.toUpperCase(),
    key: f,
  }));

  const formPayload: any = {
    name,
    questions: JSON.stringify(questions),
    privacy_policy: JSON.stringify({ url: privacy_url || "https://example.com/privacy" }),
    follow_up_action_url: privacy_url || "https://example.com",
  };

  if (headline) formPayload.context_card = JSON.stringify({
    title: headline,
    content: [description || ""],
    style: "PARAGRAPH_STYLE",
  });

  if (thank_you_title) formPayload.thank_you_page = JSON.stringify({
    title: thank_you_title,
    body: thank_you_description || "",
  });

  if (button_text) formPayload.button_text = button_text;

  const result = await metaFetch(`${META_BASE}/${page_id}/leadgen_forms`, token, "POST", formPayload);

  return { form_id: result.id, name, fields_count: questions.length };
}

// ─── Create Campaign ───
async function createCampaign(token: string, adAccountId: string, body: any) {
  const { name, objective, daily_budget, lifetime_budget, status } = body;
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const payload: any = {
    name,
    objective: objective || "OUTCOME_LEADS",
    status: status || "PAUSED",
    special_ad_categories: "[]",
  };

  if (daily_budget) payload.daily_budget = daily_budget;
  if (lifetime_budget) payload.lifetime_budget = lifetime_budget;

  const result = await metaFetch(`${META_BASE}/${actId}/campaigns`, token, "POST", payload);

  return { campaign_id: result.id, name, objective, status: payload.status };
}
