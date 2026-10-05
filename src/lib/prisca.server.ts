// PRISCA — API de recouvrement mobile money (server only).
import { createHash, timingSafeEqual } from "crypto";

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function isPriscaConfigured() {
  return Boolean(env("PRISCA_API_HOST") && env("PRISCA_MERCHANT_CODE") && env("PRISCA_MERCHANT_SECRET"));
}

export function getAppUrl() {
  return (env("APP_URL") || env("APP_PUBLIC_URL") || "https://diorparfum.lovable.app").replace(/\/$/, "");
}

/** sha256(corps JSON + clé marchand) en hexadécimal. */
export function sign(body: string) {
  return createHash("sha256").update(body + env("PRISCA_MERCHANT_SECRET")).digest("hex");
}

/** Vérifie l'en-tête "Authorization: {CODE} {signature}" d'une notification entrante. */
export function verifyNotification(rawBody: string, authorization: string | null) {
  const [code, signature] = (authorization ?? "").trim().split(/\s+/);
  if (!code || !signature || code !== env("PRISCA_MERCHANT_CODE")) return false;
  const expected = Buffer.from(sign(rawBody));
  const given = Buffer.from(signature.toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

async function call(path: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  const res = await fetch(`${env("PRISCA_API_HOST").replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${env("PRISCA_MERCHANT_CODE")} ${sign(body)}`,
    },
    body,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

export type PriscaCreated = { refId: string; method: string; account: string; url: string; operator: string };

export async function createCollection(input: {
  refId: string;
  amount: number;
  customerName: string;
  payPhone: string;
}): Promise<PriscaCreated> {
  const { status, body } = await call("/api/open/collection/create", {
    refId: input.refId,
    amount: String(input.amount),
    customerName: input.customerName,
    payPhone: input.payPhone,
    notifyUrl: `${getAppUrl()}/api/public/webhooks/prisca`,
    method: "URL",
  });
  if (status >= 400 || body["code"] !== "SUCCESS") {
    console.error("PRISCA collection/create failed", status, body);
    throw new Error(String(body["message"] ?? "") || "Impossible de créer le paiement. Réessayez.");
  }
  const d = (body["data"] as Record<string, unknown> | undefined) ?? {};
  return {
    refId: String(d["refId"] ?? input.refId),
    method: String(d["method"] ?? ""),
    account: String(d["account"] ?? ""),
    url: String(d["url"] ?? ""),
    operator: String(d["operator"] ?? ""),
  };
}

export type PriscaQuery = { status: "NONE" | "SUCCESS" | "FAILED" | ""; amount: number; collectedAmount: number; raw: Record<string, unknown> };

export async function queryCollection(refId: string): Promise<PriscaQuery | null> {
  const { status, body } = await call("/api/open/collection/query", { refId });
  if (status >= 400 || body["code"] !== "SUCCESS") return null;
  const d = (body["data"] as Record<string, unknown> | undefined) ?? {};
  return {
    status: String(d["status"] ?? "").toUpperCase() as PriscaQuery["status"],
    amount: Number(d["amount"] ?? 0),
    collectedAmount: Number(d["collectedAmount"] ?? 0),
    raw: d,
  };
}
