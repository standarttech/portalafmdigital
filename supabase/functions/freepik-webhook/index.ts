import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const webhookId = req.headers.get("webhook-id");
    const webhookTimestamp = req.headers.get("webhook-timestamp");
    const webhookSignature = req.headers.get("webhook-signature");
    const rawBody = await req.text();

    // Verify webhook signature
    const webhookSecret = Deno.env.get("FREEPIK_WEBHOOK_SECRET");
    if (webhookSecret && webhookId && webhookTimestamp && webhookSignature) {
      const contentToSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(contentToSign));
      const computedSig = base64Encode(signatureBytes);

      // Check if any version matches
      const signatures = webhookSignature.split(" ");
      const isValid = signatures.some((sig: string) => {
        const [, expectedSig] = sig.split(",");
        return expectedSig === computedSig;
      });

      if (!isValid) {
        console.error("Webhook signature verification failed");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("Freepik webhook received:", JSON.stringify(payload).substring(0, 500));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Extract task info from webhook
    const taskId = payload.data?.task_id || payload.task_id;
    const status = payload.data?.status || payload.status;
    const images = payload.data?.generated || payload.data?.result?.images || [];
    const videoUrl = payload.data?.video?.url || payload.data?.result?.video_url;

    if (!taskId) {
      console.log("No task_id in webhook payload, ignoring");
      return new Response("OK", { status: 200 });
    }

    // Find the creative_plan_item with this task in metadata
    const { data: items } = await supabase
      .from("creative_plan_items")
      .select("id, plan_id, format")
      .filter("metadata->>freepik_task_id", "eq", taskId);

    if (!items || items.length === 0) {
      console.log("No matching item for task_id:", taskId);
      return new Response("OK", { status: 200 });
    }

    const item = items[0];

    if (status === "COMPLETED" || status === "completed") {
      let resultUrl = "";

      // Get first image URL or video URL
      if (images.length > 0) {
        resultUrl = images[0].url || images[0];
      } else if (videoUrl) {
        resultUrl = videoUrl;
      }

      if (resultUrl) {
        // Download and upload to our storage
        const response = await fetch(resultUrl);
        if (response.ok) {
          const blob = await response.arrayBuffer();
          const ext = item.format === "video" ? "mp4" : "png";
          const storagePath = `freepik/${item.id}_${Date.now()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("creative-assets")
            .upload(storagePath, new Uint8Array(blob), {
              contentType: item.format === "video" ? "video/mp4" : "image/png",
            });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(storagePath);
            resultUrl = urlData.publicUrl;
          }
        }
      }

      await supabase
        .from("creative_plan_items")
        .update({
          status: "review",
          generated_url: resultUrl,
          metadata: { freepik_task_id: taskId, completed_at: new Date().toISOString() },
        })
        .eq("id", item.id);

      console.log("Item updated to review:", item.id);
    } else if (status === "FAILED" || status === "failed") {
      await supabase
        .from("creative_plan_items")
        .update({
          status: "pending",
          metadata: { freepik_task_id: taskId, error: payload.data?.error || "Generation failed" },
        })
        .eq("id", item.id);
      console.log("Item generation failed:", item.id);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Internal error", { status: 500 });
  }
});
