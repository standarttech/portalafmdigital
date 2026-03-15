import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    if (action === "generate_plan") {
      return await handleGeneratePlan(supabase, user.id, body, LOVABLE_API_KEY);
    }

    if (action === "generate_creative") {
      return await handleGenerateCreative(supabase, user.id, body, LOVABLE_API_KEY);
    }

    if (action === "generate_copies") {
      return await handleGenerateCopies(supabase, user.id, body, LOVABLE_API_KEY);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("generate-content-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleGeneratePlan(supabase: any, userId: string, body: any, apiKey: string) {
  const { client_id, brief, period_days, formats, language } = body;
  if (!client_id) throw new Error("client_id is required");

  // Fetch client info for context
  const { data: clientInfo } = await supabase
    .from("client_info")
    .select("*")
    .eq("client_id", client_id)
    .maybeSingle();

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", client_id)
    .single();

  const lang = language === "ru" ? "Russian" : "English";
  const formatList = (formats || ["image", "carousel", "story", "text_copy"]).join(", ");
  const days = period_days || 14;

  const systemPrompt = `You are an expert creative strategist for digital advertising. Generate a content plan for ad creatives.
Respond ONLY with valid JSON, no markdown or extra text.`;

  const userPrompt = `Create a creative content plan for the client "${client?.name || "Unknown"}" for the next ${days} days.

Client brief/context:
${brief || "No specific brief provided."}

Additional client info:
- Niche: ${clientInfo?.business_niche || "Not specified"}
- Target audience: ${clientInfo?.target_audience || "Not specified"}
- Competitors: ${clientInfo?.key_competitors || "Not specified"}
- Monthly budget: ${clientInfo?.monthly_budget || "Not specified"}

Required formats: ${formatList}

Language for all content: ${lang}

Generate 8-15 creative items. For each item provide:
{
  "title": "short descriptive title",
  "description": "what this creative shows/communicates",
  "format": "image|video|carousel|story|text_copy|logo_product",
  "prompt": "detailed image/video generation prompt in English for AI generation",
  "copy_headline": "ad headline text in ${lang}",
  "copy_body": "ad body text in ${lang}",
  "copy_cta": "call-to-action text in ${lang}",
  "scheduled_day_offset": number (0 = today, 1 = tomorrow, etc.),
  "ai_notes": "strategic reasoning for this creative"
}

Return JSON: { "plan_title": "...", "plan_description": "...", "items": [...] }`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (status === 402) throw new Error("AI credits exhausted. Please add funds.");
    throw new Error("AI gateway error: " + status);
  }

  const aiData = await aiResponse.json();
  let content = aiData.choices?.[0]?.message?.content || "";
  
  // Clean markdown fences if present
  content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let plan: any;
  try {
    plan = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Create the plan in DB
  const today = new Date();
  const periodEnd = new Date(today);
  periodEnd.setDate(periodEnd.getDate() + days);

  const { data: planRow, error: planErr } = await supabase
    .from("creative_content_plans")
    .insert({
      client_id,
      title: plan.plan_title || `Content Plan ${today.toLocaleDateString()}`,
      description: plan.plan_description || "",
      period_start: today.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      status: "draft",
      ai_prompt: brief || "",
      ai_model: "gemini-2.5-flash",
      created_by: userId,
    })
    .select()
    .single();

  if (planErr) throw new Error("Failed to create plan: " + planErr.message);

  // Insert items
  const items = (plan.items || []).map((item: any, idx: number) => {
    const scheduledDate = new Date(today);
    scheduledDate.setDate(scheduledDate.getDate() + (item.scheduled_day_offset || idx));
    return {
      plan_id: planRow.id,
      title: item.title || `Creative ${idx + 1}`,
      description: item.description || "",
      format: item.format || "image",
      prompt: item.prompt || "",
      status: "pending",
      sort_order: idx,
      scheduled_date: scheduledDate.toISOString().split("T")[0],
      copy_headline: item.copy_headline || "",
      copy_body: item.copy_body || "",
      copy_cta: item.copy_cta || "",
      ai_notes: item.ai_notes || "",
    };
  });

  if (items.length > 0) {
    const { error: itemsErr } = await supabase
      .from("creative_plan_items")
      .insert(items);
    if (itemsErr) console.error("Items insert error:", itemsErr);
  }

  return new Response(
    JSON.stringify({ plan_id: planRow.id, items_count: items.length, plan }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGenerateCreative(supabase: any, userId: string, body: any, apiKey: string) {
  const { item_id } = body;
  if (!item_id) throw new Error("item_id is required");

  const { data: item, error: itemErr } = await supabase
    .from("creative_plan_items")
    .select("*, plan:creative_content_plans(*)")
    .eq("id", item_id)
    .single();
  if (itemErr || !item) throw new Error("Item not found");

  // Get Freepik API key
  const { data: freepikKey } = await supabase.rpc("get_platform_integration_secret", {
    _integration_type: "freepik",
  });

  if (freepikKey) {
    // Use Freepik API for image generation
    return await generateWithFreepik(supabase, item, freepikKey);
  }

  // Fallback: use Gemini image generation
  return await generateWithGemini(supabase, item, apiKey);
}

async function generateWithFreepik(supabase: any, item: any, freepikKey: string) {
  await supabase.from("creative_plan_items").update({ status: "generating" }).eq("id", item.id);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const webhookUrl = `${supabaseUrl}/functions/v1/freepik-webhook`;

  try {
    const aspectMap: Record<string, string> = {
      story: "social_story_9_16",
      carousel: "square_1_1",
      image: "widescreen_16_9",
      logo_product: "square_1_1",
    };

    const endpoint = "https://api.freepik.com/v1/ai/text-to-image/flux-kontext-pro";

    const payload: any = {
      prompt: item.prompt || `Professional ad creative: ${item.title}. ${item.description}`,
      aspect_ratio: aspectMap[item.format] || "square_1_1",
      guidance: 3,
      steps: 50,
      webhook_url: webhookUrl,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-freepik-api-key": freepikKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
      const status = response.status;
      if (status === 429) throw new Error("Freepik rate limit. Try again later.");
      if (status === 402) throw new Error("Freepik credits exhausted.");
      throw new Error("Freepik generation failed: " + status);
    }

    const data = await response.json();
    const taskId = data.data?.task_id;

    // Store task_id in metadata for webhook matching
    await supabase.from("creative_plan_items").update({
      metadata: { freepik_task_id: taskId, model: "flux-kontext-pro" },
    }).eq("id", item.id);

    // Poll for result (Freepik tasks complete in 10-60s)
    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const checkRes = await fetch(
        `https://api.freepik.com/v1/ai/text-to-image/flux-kontext-pro/${taskId}`,
        { headers: { "x-freepik-api-key": freepikKey } }
      );

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const taskStatus = checkData.data?.status;

        if (taskStatus === "COMPLETED") {
          result = checkData;
          break;
        } else if (taskStatus === "FAILED") {
          throw new Error("Freepik generation failed: " + (checkData.data?.error || "Unknown"));
        }
      }
    }

    if (!result) {
      // Task is still processing, webhook will handle it
      return new Response(
        JSON.stringify({ success: true, status: "processing", task_id: taskId, message: "Generation in progress. Will update automatically." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the generated image URL
    const images = result.data?.generated || result.data?.result?.images || [];
    const imageUrl = images[0]?.url || images[0];

    if (!imageUrl) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
      throw new Error("No image returned from Freepik");
    }

    // Download and upload to storage
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to download generated image");
    const imgBlob = await imgRes.arrayBuffer();
    const storagePath = `freepik/${item.plan.client_id}/${item.id}_${Date.now()}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("creative-assets")
      .upload(storagePath, new Uint8Array(imgBlob), { contentType: "image/png" });

    if (uploadErr) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
      throw new Error("Upload failed: " + uploadErr.message);
    }

    const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(storagePath);

    await supabase.from("creative_plan_items").update({
      status: "review",
      generated_url: urlData.publicUrl,
      storage_path: storagePath,
      metadata: { freepik_task_id: taskId, model: "flux-kontext-pro", completed_at: new Date().toISOString() },
    }).eq("id", item.id);

    return new Response(
      JSON.stringify({ success: true, url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
    throw e;
  }
}

async function generateWithGemini(supabase: any, item: any, apiKey: string) {
  await supabase.from("creative_plan_items").update({ status: "generating" }).eq("id", item.id);

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: item.prompt || `Create a professional ad creative: ${item.title}. ${item.description}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
      const status = aiResponse.status;
      if (status === 429) throw new Error("Rate limit exceeded.");
      if (status === 402) throw new Error("AI credits exhausted.");
      throw new Error("Image generation failed: " + status);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
      throw new Error("No image returned from AI");
    }

    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const storagePath = `${item.plan.client_id}/${item.id}_${Date.now()}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("creative-assets")
      .upload(storagePath, binaryData, { contentType: "image/png" });

    if (uploadErr) {
      await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
      throw new Error("Upload failed: " + uploadErr.message);
    }

    const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(storagePath);

    await supabase.from("creative_plan_items").update({
      status: "review",
      generated_url: urlData.publicUrl,
      storage_path: storagePath,
    }).eq("id", item.id);

    return new Response(
      JSON.stringify({ success: true, url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    await supabase.from("creative_plan_items").update({ status: "pending" }).eq("id", item.id);
    throw e;
  }
}

async function handleGenerateCopies(supabase: any, userId: string, body: any, apiKey: string) {
  const { item_id, language } = body;
  if (!item_id) throw new Error("item_id is required");

  const { data: item, error } = await supabase
    .from("creative_plan_items")
    .select("*, plan:creative_content_plans(*, client:clients(name))")
    .eq("id", item_id)
    .single();
  if (error || !item) throw new Error("Item not found");

  const lang = language === "ru" ? "Russian" : "English";

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are an expert ad copywriter. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: `Write 3 ad copy variations in ${lang} for this creative:
Title: ${item.title}
Description: ${item.description}
Format: ${item.format}

Return JSON: { "variations": [{ "headline": "...", "body": "...", "cta": "..." }] }`,
        },
      ],
    }),
  });

  if (!aiResponse.ok) throw new Error("AI error: " + aiResponse.status);

  const aiData = await aiResponse.json();
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const parsed = JSON.parse(content);

  return new Response(
    JSON.stringify(parsed),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
