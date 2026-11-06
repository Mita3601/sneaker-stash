import { createHmac, timingSafeEqual } from "node:crypto";

export const ROBOTPAY_COUNTRY_BY_CODE = {
  "+225": { country: "Cote d'Ivoire", currency: "XOF" },
  "+226": { country: "Burkina Faso", currency: "XOF" },
  "+237": { country: "Cameroun", currency: "XAF" },
} as const;

const ROBOTPAY_CHECKOUT_BASE = "https://checkout1.westpay.cfd/pay";

export function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function normalizeRobotpayCountryCode(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^[A-Z]{2,3}$/.test(raw)) {
    const map: Record<string, string> = {
      BF: "+226",
      CI: "+225",
      CMR: "+237",
    };
    return map[raw.toUpperCase()] ?? null;
  }
  const digits = raw.replace(/\D/g, "");
  return (
    Object.keys(ROBOTPAY_COUNTRY_BY_CODE).find((code) => code.replace(/\D/g, "") === digits) ?? null
  );
}

export function getRobotpayCountry(countryCode: string) {
  const normalized = normalizeRobotpayCountryCode(countryCode);
  if (!normalized) return null;
  return ROBOTPAY_COUNTRY_BY_CODE[normalized as keyof typeof ROBOTPAY_COUNTRY_BY_CODE] ?? null;
}

export function isRobotpayConfigured() {
  return Boolean(env("ROBOTPAY_MERCHANT_SLUG") && env("ROBOTPAY_WEBHOOK_SECRET"));
}

export function buildRobotpayCheckoutUrl({
  amount,
  country,
  redirect,
}: {
  amount: number;
  country: string;
  redirect: string;
}) {
  const merchant = env("ROBOTPAY_MERCHANT_SLUG");
  if (!merchant)
    throw new Error("ROBOTPAY_MERCHANT_SLUG manque dans les variables d'environnement.");

  const url = new URL(env("ROBOTPAY_CHECKOUT_URL") || ROBOTPAY_CHECKOUT_BASE);
  url.searchParams.set("merchant", merchant);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("country", country);
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

export function verifyRobotpayWebhook(rawBody: string, signature: string | null) {
  const secret = env("ROBOTPAY_WEBHOOK_SECRET");
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!signature) return { ok: false, reason: "missing_signature" };

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.trim().toLowerCase();
  if (received.length !== expected.length) return { ok: false, reason: "length" };

  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return {
    ok: a.length === b.length && timingSafeEqual(a, b),
    reason: a.length === b.length && timingSafeEqual(a, b) ? "" : "signature",
  };
}
