import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isMember } = await adminClient.rpc("is_agency_member", { _user_id: user.id });
    if (!isMember) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const { token_ref } = await req.json();
    if (!token_ref) {
      return new Response(JSON.stringify({ error: "Missing token_ref" }), { status: 400, headers: corsHeaders });
    }

    const { data: token, error } = await adminClient.rpc("get_social_token", { _token_reference: token_ref });
    if (error || !token) {
      return new Response(JSON.stringify({ error: "Токен не найден в хранилище" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Test the bot via Telegram API
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = await res.json();

    return new Response(JSON.stringify(json), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
