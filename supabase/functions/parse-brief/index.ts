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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { brief_text } = await req.json();
    if (!brief_text || typeof brief_text !== "string" || brief_text.trim().length < 20) {
      throw new Error("Brief text is too short. Provide at least 20 characters.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a marketing data extraction specialist. Given a client brief, extract structured information to fill a client card. Return ONLY a JSON object with the following fields (use null for fields not found in the brief):

{
  "business_niche": "string - business niche/industry",
  "target_audience": "string - target audience description",
  "geo_targeting": "string - geographic targeting",
  "key_competitors": "string - key competitors",
  "website_url": "string - website URL",
  "instagram_url": "string - Instagram URL",
  "facebook_url": "string - Facebook URL",
  "tiktok_url": "string - TikTok URL",
  "linkedin_url": "string - LinkedIn URL",
  "youtube_url": "string - YouTube URL",
  "twitter_url": "string - Twitter/X URL",
  "telegram_url": "string - Telegram URL",
  "landing_pages": "string - landing page URLs, comma separated",
  "monthly_budget": "number - monthly advertising budget in USD (number only)",
  "contact_person": "string - main contact person name",
  "contact_phone": "string - phone number",
  "contact_email": "string - email",
  "crm_system": "string - CRM system used",
  "brand_guidelines_url": "string - brand guidelines URL",
  "payment_terms": "string - payment terms",
  "additional_notes": "string - any other important notes from the brief"
}

Rules:
- Extract as much information as possible
- For URLs, include full URLs with https://
- For budget, extract numeric value only
- For social media, extract direct profile URLs
- Return valid JSON only, no markdown, no explanations`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract client information from this brief:\n\n${brief_text.slice(0, 15000)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify({ extracted: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
