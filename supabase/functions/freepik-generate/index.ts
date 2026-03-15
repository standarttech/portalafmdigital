import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREEPIK_BASE = "https://api.freepik.com/v1/ai";

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

    const { data: apiKey } = await supabase.rpc("get_platform_integration_secret", {
      _integration_type: "freepik",
    });
    if (!apiKey) throw new Error("Freepik API key not configured. Go to Integrations to set it up.");

    const body = await req.json();
    const { action } = body;

    const handlers: Record<string, () => Promise<Response>> = {
      // Image Generation
      generate_mystic: () => handleMystic(apiKey, body, supabase),
      check_mystic: () => handleCheckTask(apiKey, body.task_id, "mystic"),
      generate_image: () => handleMystic(apiKey, body, supabase), // alias
      // Video Generation
      generate_video: () => handleVideo(apiKey, body, supabase),
      check_video: () => handleCheckTask(apiKey, body.task_id, body.endpoint || "image-to-video/kling-v2.1-pro"),
      // Music
      generate_music: () => handleMusic(apiKey, body),
      check_music: () => handleCheckTask(apiKey, body.task_id, "music-generation"),
      // Sound Effects
      generate_sfx: () => handleSfx(apiKey, body),
      check_sfx: () => handleCheckTask(apiKey, body.task_id, "sound-effects"),
      // Image Editing
      upscale: () => handleUpscale(apiKey, body),
      check_upscale: () => handleCheckTask(apiKey, body.task_id, body.endpoint || "image-upscaler"),
      remove_background: () => handleRemoveBg(apiKey, body),
      reimagine: () => handleReimagine(apiKey, body),
      // Stock Search
      search_stock: () => handleStockSearch(apiKey, body),
    };

    const handler = handlers[action];
    if (!handler) throw new Error(`Unknown action: ${action}`);
    return await handler();
  } catch (e) {
    console.error("freepik-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function freepikPost(apiKey: string, path: string, payload: any) {
  const response = await fetch(`${FREEPIK_BASE}/${path}`, {
    method: "POST",
    headers: { "x-freepik-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 429) throw new Error("Freepik rate limit. Please wait and retry.");
    if (response.status === 402) throw new Error("Freepik credits exhausted. Please top up.");
    throw new Error(`Freepik error ${response.status}: ${JSON.stringify(errData)}`);
  }
  return response.json();
}

async function freepikGet(apiKey: string, path: string) {
  const response = await fetch(`${FREEPIK_BASE}/${path}`, {
    headers: { "x-freepik-api-key": apiKey },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Freepik check error ${response.status}: ${JSON.stringify(errData)}`);
  }
  return response.json();
}

// ── Mystic (Recommended Image Generation) ──
async function handleMystic(apiKey: string, body: any, supabase: any) {
  const {
    prompt,
    aspect_ratio = "square_1_1",
    model = "realism",
    resolution = "2k",
    creative_detailing = 33,
    negative_prompt,
    structure_reference,
    style_reference,
    webhook_url,
    item_id,
  } = body;

  if (!prompt) throw new Error("prompt is required");

  if (item_id) {
    await supabase.from("creative_plan_items").update({ status: "generating" }).eq("id", item_id);
  }

  const payload: any = { prompt, aspect_ratio, model, resolution, creative_detailing };
  if (negative_prompt) payload.negative_prompt = negative_prompt;
  if (structure_reference) payload.structure_reference = structure_reference;
  if (style_reference) payload.style_reference = style_reference;
  if (webhook_url) payload.webhook_url = webhook_url;

  try {
    const data = await freepikPost(apiKey, "mystic", payload);
    return json({
      task_id: data.data?.task_id,
      status: data.data?.status || "IN_PROGRESS",
      item_id,
    });
  } catch (e) {
    if (item_id) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item_id);
    }
    throw e;
  }
}

// ── Check any task status (polling) ──
async function handleCheckTask(apiKey: string, taskId: string, endpoint: string) {
  if (!taskId) throw new Error("task_id is required");
  const data = await freepikGet(apiKey, `${endpoint}/${taskId}`);
  return json(data);
}

// ── Video Generation (multiple models) ──
async function handleVideo(apiKey: string, body: any, supabase: any) {
  const {
    image_url,
    prompt,
    model = "kling-v2.1-pro",
    duration = 5,
    aspect_ratio = "16:9",
    webhook_url,
    item_id,
  } = body;

  if (!image_url && !prompt) throw new Error("image_url or prompt is required");

  if (item_id) {
    await supabase.from("creative_plan_items").update({ status: "generating" }).eq("id", item_id);
  }

  // Determine endpoint based on model
  const videoModels: Record<string, { endpoint: string; type: "i2v" | "t2v" }> = {
    "kling-v2.1-pro": { endpoint: "image-to-video/kling-v2.1-pro", type: "i2v" },
    "kling-v2.5-pro": { endpoint: "image-to-video/kling-v2.5-pro", type: "i2v" },
    "kling-v2.6-pro": { endpoint: "image-to-video/kling-v2-6-pro", type: "i2v" },
    "hailuo-02": { endpoint: "image-to-video/minimax-hailuo-02-1080p", type: "i2v" },
    "wan-2.5-i2v": { endpoint: "image-to-video/wan-2-5-i2v-1080p", type: "i2v" },
    "wan-2.5-t2v": { endpoint: "text-to-video/wan-2-5-t2v-1080p", type: "t2v" },
    "runway-gen4": { endpoint: "image-to-video/runway-gen4-turbo", type: "i2v" },
    "seedance-pro": { endpoint: "image-to-video/seedance-pro-1080p", type: "i2v" },
  };

  const modelInfo = videoModels[model] || videoModels["kling-v2.1-pro"];

  const payload: any = { duration, aspect_ratio };
  if (modelInfo.type === "i2v") {
    if (!image_url) throw new Error("image_url is required for image-to-video models");
    payload.image = image_url;
  }
  if (prompt) payload.prompt = prompt;
  if (webhook_url) payload.webhook_url = webhook_url;

  try {
    const data = await freepikPost(apiKey, modelInfo.endpoint, payload);
    return json({
      task_id: data.data?.task_id,
      status: data.data?.status || "IN_PROGRESS",
      endpoint: modelInfo.endpoint,
      item_id,
    });
  } catch (e) {
    if (item_id) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item_id);
    }
    throw e;
  }
}

// ── Music Generation ──
async function handleMusic(apiKey: string, body: any) {
  const { prompt, duration = 30 } = body;
  if (!prompt) throw new Error("prompt is required");
  const data = await freepikPost(apiKey, "music-generation", { prompt, duration_seconds: duration });
  return json({ task_id: data.data?.task_id, status: data.data?.status || "IN_PROGRESS" });
}

// ── Sound Effects ──
async function handleSfx(apiKey: string, body: any) {
  const { prompt, duration = 5 } = body;
  if (!prompt) throw new Error("prompt is required");
  const data = await freepikPost(apiKey, "sound-effects", { text: prompt, duration_seconds: duration });
  return json({ task_id: data.data?.task_id, status: data.data?.status || "IN_PROGRESS" });
}

// ── Upscale (Magnific) ──
async function handleUpscale(apiKey: string, body: any) {
  const { image_url, scale = 2, type = "creative" } = body;
  if (!image_url) throw new Error("image_url is required");
  const endpoint = type === "precision" ? "image-upscaler-precision" : "image-upscaler";
  const data = await freepikPost(apiKey, endpoint, { image: image_url, scale });
  return json(data);
}

// ── Remove Background ──
async function handleRemoveBg(apiKey: string, body: any) {
  const { image_url } = body;
  if (!image_url) throw new Error("image_url is required");
  const data = await freepikPost(apiKey, "beta/remove-background", { image_url });
  return json(data);
}

// ── Reimagine ──
async function handleReimagine(apiKey: string, body: any) {
  const { image_url, prompt } = body;
  if (!image_url) throw new Error("image_url is required");
  const payload: any = { image: image_url };
  if (prompt) payload.prompt = prompt;
  const data = await freepikPost(apiKey, "beta/text-to-image/reimagine-flux", payload);
  return json(data);
}

// ── Stock Search ──
async function handleStockSearch(apiKey: string, body: any) {
  const { query, page = 1, per_page = 20, order = "relevance" } = body;
  if (!query) throw new Error("query is required");

  const params = new URLSearchParams({
    term: query,
    page: String(page),
    per_page: String(per_page),
    order,
  });

  const response = await fetch(`https://api.freepik.com/v1/resources?${params}`, {
    headers: { "x-freepik-api-key": apiKey },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Stock search error ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();
  return json(data);
}
