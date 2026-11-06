import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/server-env";

export {
  ROBOTPAY_COUNTRY_BY_CODE,
  buildRobotpayCheckoutUrl,
  getRobotpayCountry,
  isRobotpayConfigured,
  normalizeRobotpayCountryCode,
} from "@/lib/robotpay.config";

export function env(name: string) {
  return getServerEnv(name);
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
