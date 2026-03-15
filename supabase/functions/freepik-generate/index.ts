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

    // Get Freepik API key from platform_integrations vault
    const { data: apiKey } = await supabase.rpc("get_platform_integration_secret", {
      _integration_type: "freepik",
    });
    if (!apiKey) throw new Error("Freepik API key not configured. Go to Integrations to set it up.");

    const body = await req.json();
    const { action } = body;

    if (action === "generate_image") {
      return await handleGenerateImage(apiKey, body, supabase);
    }
    if (action === "check_image") {
      return await handleCheckTask(apiKey, body, "text-to-image");
    }
    if (action === "generate_video") {
      return await handleGenerateVideo(apiKey, body, supabase);
    }
    if (action === "check_video") {
      return await handleCheckTask(apiKey, body, "image-to-video");
    }
    if (action === "upscale") {
      return await handleUpscale(apiKey, body);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("freepik-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Text-to-Image via Flux Kontext Pro ──
async function handleGenerateImage(apiKey: string, body: any, supabase: any) {
  const {
    prompt,
    aspect_ratio = "square_1_1",
    model = "flux-kontext-pro",
    guidance = 3,
    steps = 50,
    webhook_url,
    item_id,
  } = body;

  if (!prompt) throw new Error("prompt is required");

  // Update item status if provided
  if (item_id) {
    await supabase.from("creative_plan_items").update({ status: "generating" }).eq("id", item_id);
  }

  const endpoint = `${FREEPIK_BASE}/text-to-image/${model}`;

  const payload: any = {
    prompt,
    aspect_ratio,
    guidance,
    steps,
  };

  if (webhook_url) {
    payload.webhook_url = webhook_url;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-freepik-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (item_id) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item_id);
    }
    if (response.status === 429) throw new Error("Freepik rate limit. Please wait and retry.");
    if (response.status === 402) throw new Error("Freepik credits exhausted. Please top up.");
    throw new Error(`Freepik image error ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();
  // Returns { data: { task_id, status: "CREATED" } }

  return new Response(
    JSON.stringify({
      task_id: data.data?.task_id,
      status: data.data?.status || "CREATED",
      item_id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Check task status (polling) ──
async function handleCheckTask(apiKey: string, body: any, taskType: string) {
  const { task_id } = body;
  if (!task_id) throw new Error("task_id is required");

  // Determine the correct GET endpoint based on model
  const model = body.model || (taskType === "text-to-image" ? "flux-kontext-pro" : "kling-v2");
  const endpoint = `${FREEPIK_BASE}/${taskType}/${model}/${task_id}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "x-freepik-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Freepik check error ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Image-to-Video via Kling v2 ──
async function handleGenerateVideo(apiKey: string, body: any, supabase: any) {
  const {
    image_url,
    prompt,
    model = "kling-v2",
    duration = 5,
    aspect_ratio = "16:9",
    webhook_url,
    item_id,
  } = body;

  if (!image_url) throw new Error("image_url is required for video generation");

  if (item_id) {
    await supabase.from("creative_plan_items").update({ status: "generating" }).eq("id", item_id);
  }

  const endpoint = `${FREEPIK_BASE}/image-to-video/${model}`;

  const payload: any = {
    image: image_url,
    duration,
    aspect_ratio,
  };
  if (prompt) payload.prompt = prompt;
  if (webhook_url) payload.webhook_url = webhook_url;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-freepik-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (item_id) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item_id);
    }
    if (response.status === 429) throw new Error("Freepik rate limit. Please wait and retry.");
    if (response.status === 402) throw new Error("Freepik credits exhausted.");
    throw new Error(`Freepik video error ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();

  return new Response(
    JSON.stringify({
      task_id: data.data?.task_id,
      status: data.data?.status || "CREATED",
      item_id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Upscale ──
async function handleUpscale(apiKey: string, body: any) {
  const { image_url, scale = 2 } = body;
  if (!image_url) throw new Error("image_url is required");

  const response = await fetch(`${FREEPIK_BASE}/image-upscaler`, {
    method: "POST",
    headers: {
      "x-freepik-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: image_url, scale }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Upscale error ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
