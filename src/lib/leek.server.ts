const API_ORIGIN = "https://leekpay.fr/api/v1";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function createCheckout(payload: Record<string, unknown>) {
  const sk = process.env["LEEKPAY_SECRET_KEY"];
  if (!sk) throw new Error("LeekPay secret key not configured");

  const res = await fetch(`${API_ORIGIN}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await safeJson(res as unknown as Response);
  return { status: res.status, body };
}

export async function getCheckout(id: string) {
  const sk = process.env["LEEKPAY_SECRET_KEY"];
  if (!sk) throw new Error("LeekPay secret key not configured");

  const res = await fetch(`${API_ORIGIN}/checkout/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${sk}` },
  });
  const body = await safeJson(res as unknown as Response);
  return { status: res.status, body };
}

// Best-effort signature verification. LeekPay docs say to use the public key,
// but providers vary. We attempt a verification using Node's crypto if a
// PEM-formatted key is provided; otherwise callers should validate via the
// server-side API (getCheckout) as a fallback.
export function verifySignature(raw: string, signature: string, publicKey?: string) {
  if (!signature) return false;
  if (!publicKey) return false;
  try {
    // If publicKey looks like a PEM, use RSA verify (sha256)
    if (publicKey.includes("-----BEGIN")) {
      // dynamic import to keep runtime small in non-node environments
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require("crypto");
      const verifier = crypto.createVerify("sha256");
      verifier.update(raw);
      verifier.end();
      // signature may be base64
      return verifier.verify(publicKey, signature, "base64");
    }
  } catch {
    // ignore and fallthrough to false
  }
  return false;
}
