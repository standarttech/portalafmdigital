import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WebPushPayload {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  title: string;
  message: string;
  link?: string;
  tag?: string;
}

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Import ECDSA P-256 private key from raw base64url
async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = urlBase64ToUint8Array(base64url);
  // Build JWK from raw 32-byte private key
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64url,
    // We need x and y from public key, but for signing JWT we only need d
    // We'll derive them from the public key
  };
  // Use PKCS8 or JWK import - for Web Push we need to sign JWT
  return await crypto.subtle.importKey(
    "jwk",
    { ...jwk, x: "", y: "" }, // placeholder
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

// Base64url encode
function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Create VAPID JWT
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64url: string,
  publicKeyBase64url: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key as JWK
  const rawPrivate = urlBase64ToUint8Array(privateKeyBase64url);
  const rawPublic = urlBase64ToUint8Array(publicKeyBase64url);

  // Extract x and y from uncompressed public key (65 bytes: 0x04 || x || y)
  const x = base64urlEncode(rawPublic.slice(1, 33));
  const y = base64urlEncode(rawPublic.slice(33, 65));
  const d = privateKeyBase64url;

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (already raw from WebCrypto)
  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyBase64url}`,
    cryptoKey: publicKeyBase64url,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: only allow service_role calls
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload: WebPushPayload = await req.json();
    const { subscription, title, message, link, tag } = payload;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response(JSON.stringify({ error: "Invalid subscription" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build the push payload
    const pushPayload = JSON.stringify({
      title,
      message,
      link,
      tag: tag || "afm-notification",
    });

    // Get audience from endpoint URL
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // Create VAPID authorization
    const vapid = await createVapidJwt(
      audience,
      "mailto:no-reply@afmdigital.com",
      vapidPrivateKey,
      vapidPublicKey
    );

    // Send push notification via Web Push protocol
    const pushResponse = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: vapid.authorization,
        TTL: "86400",
      },
      body: new TextEncoder().encode(pushPayload),
    });

    const responseText = await pushResponse.text();

    if (pushResponse.status === 201 || pushResponse.status === 200) {
      console.log("Web push sent successfully");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else if (pushResponse.status === 410 || pushResponse.status === 404) {
      // Subscription expired
      console.warn("Push subscription expired:", pushResponse.status);
      return new Response(
        JSON.stringify({ success: false, expired: true, status: pushResponse.status }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      console.error("Push send failed:", pushResponse.status, responseText);
      return new Response(
        JSON.stringify({ success: false, status: pushResponse.status, error: responseText }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("send-webpush error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
