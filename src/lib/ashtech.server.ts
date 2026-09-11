// Ashtech Pay — Hosted Payment API (server only).
const DEFAULT_BASE_URL = "https://ashtechpay.top/api/v1";

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function getBaseUrl() {
  return (readEnv("ASHTECHPAY_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getKey() {
  const key = readEnv("ASHTECHPAY_HP_LIVE_KEY");
  if (!key) throw new Error("ASHTECHPAY_HP_LIVE_KEY not configured");
  return key;
}

export function isAshtechConfigured() {
  return Boolean(readEnv("ASHTECHPAY_HP_LIVE_KEY"));
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text } as Record<string, unknown>;
  }
}

export async function createHostedPayment(payload: Record<string, unknown>) {
  const response = await fetch(`${getBaseUrl()}/hosted-payment/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return { status: response.status, body: await parseJson(response) };
}

export async function getHostedPayment(paymentId: string) {
  const response = await fetch(
    `${getBaseUrl()}/hosted-payment/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getKey()}`,
        Accept: "application/json",
      },
    },
  );

  return { status: response.status, body: await parseJson(response) };
}

/** Ashtech Pay renvoie le statut soit à la racine, soit dans `data`. */
export function readRemoteStatus(body: Record<string, unknown>): string {
  const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
  const raw =
    body["status"] ?? body["payment_status"] ?? data["status"] ?? data["payment_status"] ?? "";
  return String(raw ?? "").toLowerCase();
}

export const SUCCESS_STATUSES = ["success", "successful", "completed", "paid"];
export const FAILED_STATUSES = ["failed", "cancelled", "canceled", "expired", "rejected"];

export function pickField(body: Record<string, unknown>, keys: string[]): string {
  const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
  for (const key of keys) {
    const value = body[key] ?? data[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}
