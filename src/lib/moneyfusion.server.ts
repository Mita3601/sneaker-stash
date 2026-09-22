// MoneyFusion — API de paiement mobile money (server only).
const STATUS_URL = "https://www.pay.moneyfusion.net/paiementNotif";

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function isMoneyFusionConfigured() {
  return Boolean(readEnv("MONEYFUSION_API_URL"));
}

function getApiUrl() {
  const url = readEnv("MONEYFUSION_API_URL");
  if (!url) throw new Error("MONEYFUSION_API_URL not configured");
  return url;
}

export function getAppUrl() {
  return (readEnv("APP_PUBLIC_URL") || "https://dior-parfums.lovable.app").replace(/\/$/, "");
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

export type CreatePaymentInput = {
  amount: number;
  reference: string;
  userId: string;
  phone: string;
  clientName: string;
  description: string;
};

/** Crée une session de paiement MoneyFusion et renvoie le token + l'URL de paiement. */
export async function createMoneyFusionPayment(input: CreatePaymentInput) {
  const appUrl = getAppUrl();
  const payload = {
    totalPrice: input.amount,
    article: [{ [input.description]: input.amount }],
    personal_Info: [{ userId: input.userId, orderId: input.reference }],
    numeroSend: input.phone,
    nomclient: input.clientName,
    return_url: `${appUrl}/merci?reference={token}`,
    webhook_url: `${appUrl}/api/public/webhooks/moneyfusion`,
  };

  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await parseJson(response);
  return { status: response.status, body };
}

/** Vérifie le statut réel d'un paiement auprès de MoneyFusion. */
export async function getMoneyFusionStatus(token: string) {
  const response = await fetch(`${STATUS_URL}/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return { status: response.status, body: await parseJson(response) };
}

/** MoneyFusion renvoie le statut dans `data.statut` : pending | paid | failure | no paid. */
export function readRemoteStatus(body: Record<string, unknown>): string {
  const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
  return String(data["statut"] ?? body["statut"] ?? "").toLowerCase();
}

export const SUCCESS_STATUSES = ["paid", "success", "successful", "completed"];
export const FAILED_STATUSES = ["failure", "no paid", "cancelled", "canceled", "expired", "failed"];

export function pickField(body: Record<string, unknown>, keys: string[]): string {
  const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
  for (const key of keys) {
    const value = body[key] ?? data[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}
