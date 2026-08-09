import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://leekpay.fr";

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function getBaseUrl() {
  const configured = readEnv("LEEKPAY_API_URL");
  return configured || DEFAULT_BASE_URL;
}

function getHeaders(extra: Record<string, string> = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };

  return headers;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text } as Record<string, unknown>;
  }
}

export async function createCheckout(payload: Record<string, unknown>) {
  const secretKey = readEnv("LEEKPAY_SECRET_KEY");
  if (!secretKey) {
    throw new Error("LEEKPAY_SECRET_KEY not configured");
  }

  const publicKey = readEnv("LEEKPAY_PUBLIC_KEY");
  const url = `${getBaseUrl().replace(/\/$/, "")}/api/v1/checkout`;

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders({
      Authorization: `Bearer ${secretKey}`,
      ...(publicKey ? { "X-LeekPay-Public-Key": publicKey } : {}),
    }),
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    body: await parseJsonResponse(response),
  };
}

export async function getCheckout(checkoutId: string) {
  const secretKey = readEnv("LEEKPAY_SECRET_KEY");
  if (!secretKey) {
    throw new Error("LEEKPAY_SECRET_KEY not configured");
  }

  const url = `${getBaseUrl().replace(/\/$/, "")}/api/v1/checkout/${encodeURIComponent(checkoutId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders({
      Authorization: `Bearer ${secretKey}`,
    }),
  });

  return {
    status: response.status,
    body: await parseJsonResponse(response),
  };
}

export function verifySignature(raw: string, signature: string, key: string) {
  const message = raw ?? "";
  const submitted = (signature ?? "").trim();
  const signingKey = (key ?? "").trim();

  if (!message || !submitted || !signingKey) {
    return false;
  }

  const normalizedSignature = submitted.replace(/^sha256=/i, "").trim();

  if (signingKey.includes("BEGIN")) {
    try {
      const publicKey = crypto.createPublicKey({
        key: signingKey,
        format: "pem",
        type: "spki",
      });
      const verify = crypto.createVerify("sha256");
      verify.update(message);
      return verify.verify(publicKey, normalizedSignature, "base64");
    } catch {
      return false;
    }
  }

  const expected = crypto.createHmac("sha256", signingKey).update(message).digest("hex");
  const actual = normalizedSignature.toLowerCase();

  if (actual.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  } catch {
    return actual === expected;
  }
}
