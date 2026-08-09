import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MIN_DEPOSIT, type DepositInit, type PayCountry } from "@/lib/payments";

type Input = {
  amount: number;
  countryCode: string;
  currency: string;
  operator: string;
  phone: string;
  otp?: string;
};

function validate(data: Input): Input {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT || amount > 5_000_000) {
    throw new Error(`Montant invalide (minimum ${MIN_DEPOSIT} FCFA).`);
  }
  if (!/^[A-Z]{2}$/.test(data.countryCode)) throw new Error("Pays invalide.");
  if (!/^[A-Z]{3,4}$/.test(data.currency)) throw new Error("Devise invalide.");
  if (!data.operator || data.operator.length > 40) throw new Error("Opérateur invalide.");
  const phone = String(data.phone ?? "").replace(/\D/g, "");
  if (phone.length > 20) throw new Error("Numéro invalide.");
  const otp = data.otp ? String(data.otp).replace(/\D/g, "").slice(0, 10) : undefined;
  return {
    amount: Math.round(amount),
    countryCode: data.countryCode,
    currency: data.currency,
    operator: data.operator,
    phone,
    ...(otp ? { otp } : {}),
  };
}

/** Pays et opérateurs autorisés sur le lien de paiement. */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ countries: PayCountry[]; fixedAmount: number | null; linkUrl: string }> => {
    const { fetchLinkConfig, paymentLinkUrl } = await import("@/lib/ashtech.server");
    const { DIAL_CODES } = await import("@/lib/payments");
    const cfg = await fetchLinkConfig();

    return {
      linkUrl: paymentLinkUrl(),
      fixedAmount: cfg.fixedAmount,
      countries: cfg.countries.map((c) => ({
        code: c.code,
        name: c.name,
        flag: c.flag,
        currency: c.currency,
        dial: DIAL_CODES[c.code] ?? "+",
        operators: c.operators.map((o) => ({
          name: o.name,
          otp: o.paymentProvider === "pixpay" && o.pixpayOperatorType === "otp",
        })),
      })),
    };
  },
);

function pick(body: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const k of keys) {
        const v = nested[k];
        if (typeof v === "string" && v) return v;
      }
    }
  }
  return "";
}

export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<DepositInit> => {
    const { payViaLink, newReference } = await import("@/lib/ashtech.server");

    const localRef = newReference();

    const { status, body } = await payViaLink({
      // La référence voyage dans le nom du client : elle revient dans le webhook.
      fullName: `NikeStake ${localRef}`,
      email: `${localRef.toLowerCase()}@nikestake.app`,
      country: data.countryCode,
      phone: data.phone,
      amount: String(data.amount),
      currency: data.currency,
      paymentMethod: "mobile_money",
      operator: data.operator,
      ...(data.otp ? { pixpayOtp: data.otp } : {}),
    });

    const message = String(body["message"] ?? "");

    if (status >= 400) {
      if (/otp|code de confirmation/i.test(message)) {
        return {
          type: "otp",
          reference: localRef,
          ussdCode: pick(body, ["ussdCode", "ussd_code", "otpUssdCode"]),
          message: message || "Code de confirmation requis.",
        };
      }
      throw new Error(message || "Le paiement a été refusé par l'opérateur.");
    }

    const gatewayRef = pick(body, ["reference", "transactionReference", "orderId", "order_id"]);
    const gatewayTxId = pick(body, ["transactionId", "transaction_id", "id", "paymentId"]);
    const reference = gatewayRef || localRef;
    const redirectUrl = pick(body, [
      "paymentUrl",
      "payment_url",
      "redirectUrl",
      "redirect_url",
      "waveUrl",
      "wave_url",
      "url",
    ]);

    const { error } = await context.supabase.rpc("create_gateway_deposit", {
      _amount: data.amount,
      _reference: reference,
      _metadata: {
        gateway: "ashtechpay_link",
        local_reference: localRef,
        gateway_transaction_id: gatewayTxId || reference,
        country_code: data.countryCode,
        currency: data.currency,
        operator: data.operator,
        phone: data.phone,
      },
    });
    if (error) throw new Error(error.message);

    if (redirectUrl) {
      return {
        type: "redirect",
        reference,
        url: redirectUrl,
        message: message || "Confirmez le paiement sur la page qui s'ouvre.",
      };
    }

    return {
      type: "pending",
      reference,
      message: message || "Validez la demande reçue sur votre téléphone.",
    };
  });

export const checkDepositStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => ({
    reference: String(data.reference ?? "").slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("transactions")
      .select("status, amount")
      .eq("reference", data.reference)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    return { status: row?.status ?? "unknown", amount: Number(row?.amount ?? 0) };
  });
