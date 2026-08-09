/** Client HTTP serveur pour l'API Ashtech Pay. */
const BASE_URL = "https://ashtechpay.top/v1";

const PROJECT_PUBLIC_URL = "https://project--5cc3893b-065f-4419-97d4-7b075c596ee9.lovable.app";

export type CollectPayload = {
  amount: number;
  currency: string;
  phone: string;
  operator: string;
  country_code: string;
  reference?: string;
  otp?: string;
  notify_url?: string;
};

export type CollectResult = {
  status: number;
  body: Record<string, unknown>;
};

function apiKey() {
  const key = process.env["ASHTECHPAY_API_KEY"]?.trim();
  if (!key) throw new Error("Paiement indisponible : clé API manquante.");
  if (/^https?:\/\//i.test(key)) {
    throw new Error(
      "Paiement mal configuré : la valeur enregistrée est une URL et non la clé API Ashtech Pay.",
    );
  }
  return key;
}

export function webhookUrl() {
  const base = process.env["APP_PUBLIC_URL"] ?? PROJECT_PUBLIC_URL;
  const token = process.env["ASHTECHPAY_WEBHOOK_TOKEN"] ?? "";
  return `${base.replace(/\/$/, "")}/api/public/webhooks/ashtechpay?token=${encodeURIComponent(token)}`;
}

export async function collect(payload: CollectPayload): Promise<CollectResult> {
  const res = await fetch(`${BASE_URL}/collect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { status: res.status, body };
}

export async function getTransaction(id: string): Promise<CollectResult> {
  const res = await fetch(`${BASE_URL}/transaction/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { status: res.status, body };
}

export function newReference() {
  return `DEP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
}
