import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-robotpay-signature",
};

function timingSafeEqual(a: string, b: string) {
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  if (aBuf.length !== bBuf.length) return false;
  let diff = 0;
  for (let i = 0; i < aBuf.length; i += 1) {
    diff |= aBuf[i] ^ bBuf[i];
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const rawBody = await req.text();
  const signature = (req.headers.get("x-robotpay-signature") ?? "").trim().toLowerCase();
  const secret = Deno.env.get("ROBOTPAY_WEBHOOK_SECRET") ?? "";

  if (!secret || !signature) {
    return new Response(JSON.stringify({ error: "Signature invalide" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const expected = await hmacSha256Hex(secret, rawBody);
  if (expected.length !== signature.length || !timingSafeEqual(expected, signature)) {
    return new Response(JSON.stringify({ error: "Signature invalide" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ received: true, ignored: "invalid_json" }), {
      headers: jsonHeaders,
    });
  }

  const event = String(payload.event ?? "");
  if (event !== "payment.confirmed") {
    return new Response(JSON.stringify({ received: true, ignored: event || "ignored_event" }), {
      headers: jsonHeaders,
    });
  }

  const merchantSlug = String(payload.merchantSlug ?? "");
  const txId = String(payload.txId ?? "");
  const amount = Number(payload.amount ?? 0);

  if (!merchantSlug || !txId || !Number.isFinite(amount) || amount <= 0) {
    return new Response(JSON.stringify({ received: true, ignored: "invalid_payload" }), {
      headers: jsonHeaders,
    });
  }

  const expectedSlug = Deno.env.get("ROBOTPAY_MERCHANT_SLUG") ?? "";
  if (expectedSlug && merchantSlug !== expectedSlug) {
    console.warn("RobotPay webhook merchant mismatch", { merchantSlug, expectedSlug, txId });
    return new Response(JSON.stringify({ received: true, ignored: "merchant_mismatch" }), {
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl && supabaseServiceRole) {
    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.from("robotpay_payments").upsert(
      {
        tx_id: txId,
        amount,
        currency: String(payload.currency ?? ""),
        country: String(payload.country ?? ""),
        payer: String(payload.payer ?? ""),
        merchant_slug: merchantSlug,
        provider: String(payload.provider ?? ""),
        raw_payload: payload,
        status: "received",
        created_at: new Date().toISOString(),
      },
      { onConflict: "tx_id" },
    );

    if (error) {
      console.error("RobotPay webhook DB insert failed", error);
    }
  }

  return new Response(
    JSON.stringify({
      received: true,
      event,
      txId,
      amount,
      merchantSlug,
    }),
    {
      headers: jsonHeaders,
    },
  );
});
