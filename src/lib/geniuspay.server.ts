// GeniusPay — API marchand (server only). Mode checkout : pas de payment_method.
import { createHmac, timingSafeEqual } from "crypto";

const BASE_URL = "https://geniuspay.ci/api/v1/merchant";

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function isGeniusPayConfigured() {
  return Boolean(env("GENIUSPAY_API_KEY") && env("GENIUSPAY_API_SECRET"));
}

export function getAppUrl() {
  return (env("APP_URL") || env("APP_PUBLIC_URL") || "https://diorparfum.lovable.app").replace(/\/$/, "");
}

function headers() {
  return {
    "X-API-Key": env("GENIUSPAY_API_KEY"),
    "X-API-Secret": env("GENIUSPAY_API_SECRET"),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function parse(res: Response) {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as Record<string, unknown>;
  } catch {
    return { raw: text } as Record<string, unknown>;
  }
}

export type GeniusCreated = { reference: string; checkoutUrl: string; amount: number };

export async function createPayment(input: {
  amount: number;
  orderId: string;
  userId: string;
  name: string;
  phone: string;
  returnBase?: string;
}): Promise<GeniusCreated> {
  const appUrl = (input.returnBase || getAppUrl()).replace(/\/$/, "");
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      amount: input.amount,
      description: `Dépôt commande #${input.orderId}`,
      customer: { name: input.name, phone: input.phone },
      success_url: `${appUrl}/app/recharge?paiement=success`,
      error_url: `${appUrl}/app/recharge?paiement=error`,
      metadata: { order_id: input.orderId, user_id: input.userId },
    }),
  });
  const body = await parse(res);
  const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
  if (!res.ok || body["success"] !== true) {
    console.error("GeniusPay create failed", res.status, body);
    const err = (body["error"] as Record<string, unknown> | undefined) ?? {};
    throw new Error(String(err["message"] ?? body["message"] ?? "") || "Impossible de créer le paiement. Réessayez.");
  }
  const reference = String(data["reference"] ?? "");
  const checkoutUrl = String(data["checkout_url"] ?? data["payment_url"] ?? "");
  if (!reference || !checkoutUrl) throw new Error("La passerelle n'a pas renvoyé de lien de paiement.");
  return { reference, checkoutUrl, amount: Number(data["amount"] ?? input.amount) };
}

export type GeniusPayment = {
  status: string;
  amount: number;
  fees: number;
  netAmount: number;
  paymentMethod: string;
  raw: Record<string, unknown>;
};

export async function getPayment(reference: string): Promise<GeniusPayment | null> {
  const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(reference)}`, { headers: headers() });
  const body = await parse(res);
  if (!res.ok || body["success"] !== true) return null;
  const d = (body["data"] as Record<string, unknown> | undefined) ?? {};
  return {
    status: String(d["status"] ?? "").toLowerCase(),
    amount: Number(d["amount"] ?? 0),
    fees: Number(d["fees"] ?? 0),
    netAmount: Number(d["net_amount"] ?? 0),
    paymentMethod: String(d["payment_method"] ?? d["payment_provider"] ?? ""),
    raw: d,
  };
}

export const SUCCESS_STATUSES = ["completed", "success", "succeeded", "paid"];
export const FAILED_STATUSES = ["failed", "cancelled", "canceled", "expired"];

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** HMAC-SHA256(timestamp + "." + payload, secret) + fenêtre anti-rejeu de 5 minutes. */
export function verifyWebhook(rawBody: string, signature: string | null, timestamp: string | null) {
  const secret = env("GENIUSPAY_WEBHOOK_SECRET");
  if (!secret || !signature || !timestamp) return { ok: false, reason: "missing" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return { ok: false, reason: "timestamp" };
  const sig = signature.trim().toLowerCase().replace(/^sha256=/, "");
  // Le corps brut est prioritaire ; variantes JSON (Node / PHP json_encode) en secours.
  const candidates = [rawBody];
  try {
    const compact = JSON.stringify(JSON.parse(rawBody));
    candidates.push(compact, compact.replace(/\//g, "\\/"));
  } catch {
    // corps non JSON
  }
  for (const c of candidates) {
    const expected = createHmac("sha256", secret).update(`${timestamp}.${c}`).digest("hex");
    if (safeEqual(expected, sig)) return { ok: true, reason: "" };
  }
  return { ok: false, reason: "signature" };
}
