import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * AI Ads Analysis — now routes through ai-router when a route exists,
 * falls back to direct Lovable AI call for backward compatibility.
 */
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

    const { run_id } = await req.json();
    if (!run_id) throw new Error("run_id is required");

    // Fetch the analysis run
    const { data: run, error: runError } = await supabase
      .from("ai_analysis_runs")
      .select("*")
      .eq("id", run_id)
      .single();
    if (runError || !run) throw new Error("Analysis run not found");
    if (run.status !== "queued") throw new Error("Run is not in queued status");

    // Mark as running
    await supabase.from("ai_analysis_runs").update({ status: "running" }).eq("id", run_id);

    // Fetch client info
    const { data: client } = await supabase.from("clients").select("name, category").eq("id", run.client_id).single();

    const analysisType = run.analysis_type || "performance_summary";
    const systemPrompt = buildSystemPrompt(client?.name, client?.category, analysisType);
    const toolsDef = buildToolsDef();

    const aiMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: run.prompt || `Please perform a ${analysisType} analysis.` },
    ];

    // Try routing through ai-router first
    let aiOutput: any = null;
    let usedRouter = false;

    try {
      const routerRes = await fetch(`${supabaseUrl}/functions/v1/ai-router`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_type: "ai_ads_analysis",
          client_id: run.client_id,
          source_module: "ai_ads",
          source_entity_type: "ai_analysis_run",
          source_entity_id: run_id,
          input_payload: {
            messages: aiMessages,
            tools: toolsDef.tools,
            tool_choice: toolsDef.tool_choice,
            // Do NOT hardcode model here — let ai-router use the route's model_override
          },
        }),
      });

      if (routerRes.ok) {
        const routerData = await routerRes.json();
        if (routerData.success && routerData.output) {
          aiOutput = routerData.output;
          usedRouter = true;
        }
      }
    } catch (routerErr) {
      console.warn("Router unavailable, falling back to direct call:", routerErr);
    }

    // Direct fallback if router didn't work
    if (!aiOutput) {
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          ...toolsDef,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);

        const failStatus = response.status === 429 ? "Rate limit exceeded. Please try again later."
          : response.status === 402 ? "AI credits exhausted. Please top up."
          : "AI analysis failed";

        await supabase.from("ai_analysis_runs").update({
          status: "failed", result_summary: failStatus, completed_at: new Date().toISOString(),
        }).eq("id", run_id);

        return new Response(JSON.stringify({ error: failStatus }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      aiOutput = await response.json();
    }

    // Parse result
    const toolCall = aiOutput?.choices?.[0]?.message?.tool_calls?.[0];
    let structuredResult: any = null;

    if (toolCall?.function?.arguments) {
      try { structuredResult = JSON.parse(toolCall.function.arguments); } catch { /* */ }
    }

    if (!structuredResult) {
      const content = aiOutput?.choices?.[0]?.message?.content || "";
      await supabase.from("ai_analysis_runs").update({
        status: "completed",
        result_summary: content.slice(0, 500),
        result_data: { raw_content: content },
        model_used: usedRouter ? "routed" : "google/gemini-3-flash-preview",
        completed_at: new Date().toISOString(),
      }).eq("id", run_id);
      return new Response(JSON.stringify({ success: true, fallback: true, routed: usedRouter }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save structured result
    await supabase.from("ai_analysis_runs").update({
      status: "completed",
      result_summary: structuredResult.executive_summary || "",
      result_data: structuredResult,
      model_used: usedRouter ? "routed" : "google/gemini-3-flash-preview",
      completed_at: new Date().toISOString(),
    }).eq("id", run_id);

    // Auto-create recommendations
    const actions = structuredResult.recommended_actions || [];
    if (actions.length > 0) {
      const recs = actions.map((a: any) => ({
        client_id: run.client_id,
        session_id: run.session_id,
        analysis_run_id: run_id,
        title: a.title,
        description: `${a.description}\n\nRationale: ${a.rationale}`,
        recommendation_type: a.recommendation_type || "test_new_angle",
        priority: a.priority || "medium",
        status: "new",
        metadata: { source: "ai_analysis", analysis_type: analysisType, routed: usedRouter },
      }));
      await supabase.from("ai_recommendations").insert(recs);
    }

    return new Response(JSON.stringify({ success: true, recommendations_created: actions.length, routed: usedRouter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-ads-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt(clientName?: string, category?: string, analysisType?: string): string {
  return `You are an expert digital advertising analyst working for a performance marketing agency.
You are analyzing advertising data for client "${clientName || "Unknown"}" (category: ${category || "unknown"}).
Analysis type: ${analysisType}

Respond with a structured JSON analysis using this exact schema:
{
  "executive_summary": "2-3 sentence overview",
  "key_findings": [{"title": "string", "detail": "string", "impact": "high|medium|low"}],
  "risks": [{"title": "string", "detail": "string", "severity": "critical|high|medium|low"}],
  "opportunities": [{"title": "string", "detail": "string", "potential_impact": "string"}],
  "recommended_actions": [{"title": "string", "description": "string", "priority": "high|medium|low", "recommendation_type": "string", "rationale": "string"}],
  "next_tests": [{"title": "string", "description": "string"}],
  "notes": "any additional context"
}

recommendation_type must be one of: restructure_campaign, test_new_angle, kill_underperformer, duplicate_winner, adjust_budget, change_audience, improve_creative, improve_landing, launch_new_test

Be specific, actionable, and honest. If you lack data, say so clearly. Do not fabricate metrics.`;
}

function buildToolsDef() {
  return {
    tools: [{
      type: "function",
      function: {
        name: "submit_analysis",
        description: "Submit the structured analysis result",
        parameters: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            key_findings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, impact: { type: "string", enum: ["high", "medium", "low"] } }, required: ["title", "detail", "impact"], additionalProperties: false } },
            risks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, severity: { type: "string", enum: ["critical", "high", "medium", "low"] } }, required: ["title", "detail", "severity"], additionalProperties: false } },
            opportunities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, potential_impact: { type: "string" } }, required: ["title", "detail", "potential_impact"], additionalProperties: false } },
            recommended_actions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] }, recommendation_type: { type: "string" }, rationale: { type: "string" } }, required: ["title", "description", "priority", "recommendation_type", "rationale"], additionalProperties: false } },
            next_tests: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"], additionalProperties: false } },
            notes: { type: "string" },
          },
          required: ["executive_summary", "key_findings", "risks", "opportunities", "recommended_actions", "next_tests"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "submit_analysis" } },
  };
}
