/**
 * Client serveur pour le lien de paiement Ashtech Pay.
 * Aucune clé API n'est nécessaire : on utilise les endpoints publics du lien
 * (les mêmes que la page https://ashtechpay.top/pay/<slug>).
 */
const ORIGIN = "https://ashtechpay.top";

const PROJECT_PUBLIC_URL = "https://project--5cc3893b-065f-4419-97d4-7b075c596ee9.lovable.app";

export function linkSlug() {
  return (process.env["ASHTECHPAY_LINK_SLUG"] ?? "vf3wc70u").trim();
}

export function paymentLinkUrl() {
  return `${ORIGIN}/pay/${linkSlug()}`;
}

function browserHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    Referer: paymentLinkUrl(),
    Origin: ORIGIN,
  };
}

export type LinkOperator = {
  name: string;
  paymentProvider: string;
  pixpayOperatorType: string | null;
};

export type LinkCountry = {
  id: string;
  code: string;
  name: string;
  flag: string;
  currency: string;
  operators: LinkOperator[];
};

type PublicLink = {
  link?: {
    title?: string;
    amount?: string;
    isFixedAmount?: boolean;
    allowedCountries?: string[];
  };
  merchant?: { fullName?: string };
};

/** Pays/opérateurs réellement autorisés sur le lien de paiement. */
export async function fetchLinkConfig(): Promise<{
  title: string;
  fixedAmount: number | null;
  countries: LinkCountry[];
}> {
  try {
    const [linkRes, cfgRes] = await Promise.all([
      fetch(`${ORIGIN}/api/payment-links/public/${linkSlug()}`, { headers: browserHeaders() }),
      fetch(`${ORIGIN}/api/public/deposit-config`, { headers: browserHeaders() }),
    ]);

    if (!linkRes.ok) {
      // upstream service rejected the request (403/429/5xx). Return empty config so
      // the UI can show a friendly message instead of crashing.
      return { title: "Recharge", fixedAmount: null, countries: [] };
    }

    const link = (await linkRes.json()) as PublicLink;
    const cfg = (await cfgRes.json().catch(() => ({}))) as { countries?: LinkCountry[] };

    const allowed = new Set(link.link?.allowedCountries ?? []);
    const all = cfg.countries ?? [];
    const countries = (allowed.size ? all.filter((c) => allowed.has(c.id)) : all).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      flag: c.flag,
      currency: c.currency,
      operators: (c.operators ?? []).map((o) => ({
        name: o.name,
        paymentProvider: o.paymentProvider,
        pixpayOperatorType: o.pixpayOperatorType ?? null,
      })),
    }));

    const fixed = link.link?.isFixedAmount ? Number(link.link?.amount ?? 0) : null;

    return {
      title: link.link?.title ?? "Recharge",
      fixedAmount: fixed && fixed > 0 ? fixed : null,
      countries,
    };
  } catch (err) {
    // Network error or JSON parse error — degrade gracefully.
    return { title: "Recharge", fixedAmount: null, countries: [] };
  }
}

export type LinkPayPayload = {
  fullName: string;
  email: string;
  country: string;
  phone: string;
  amount: string;
  currency: string;
  paymentMethod: "mobile_money";
  operator: string;
  pixpayOtp?: string;
};

export async function payViaLink(payload: LinkPayPayload) {
  const res = await fetch(`${ORIGIN}/api/payment-links/${linkSlug()}/pay`, {
    method: "POST",
    headers: { ...browserHeaders(), "Content-Type": "application/json" },
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

export function webhookUrl() {
  const base = process.env["APP_PUBLIC_URL"] ?? PROJECT_PUBLIC_URL;
  const token = process.env["ASHTECHPAY_WEBHOOK_TOKEN"] ?? "";
  return `${base.replace(/\/$/, "")}/api/public/webhooks/ashtechpay?token=${encodeURIComponent(token)}`;
}

export function newReference() {
  return `DEP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
}
