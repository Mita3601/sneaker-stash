import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COUNTRIES, PROVIDERS } from "@/lib/app";
import { MIN_DEPOSIT, type DepositInit, type PayCountry, DIAL_CODES } from "@/lib/payments";

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
  const countryCode = String(data.countryCode ?? "").toUpperCase();
  const currency = String(data.currency ?? "").toUpperCase();
  const operator = String(data.operator ?? "").trim();
  if (!/^\+?\d{2,4}$/.test(countryCode) && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error("Pays invalide.");
  }
  if (!/^[A-Z]{3,4}$/.test(currency)) throw new Error("Devise invalide.");
  if (!operator || operator.length > 40) throw new Error("Opérateur invalide.");
  const phone = String(data.phone ?? "").replace(/\D/g, "");
  if (phone.length > 20) throw new Error("Numéro invalide.");
  const otp = data.otp ? String(data.otp).replace(/\D/g, "").slice(0, 10) : undefined;
  return {
    amount: Math.round(amount),
    countryCode,
    currency,
    operator,
    phone,
    ...(otp ? { otp } : {}),
  };
}

function newReference() {
  return `DEP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
}

/** Pays et opérateurs autorisés sur le formulaire de recharge. */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    countries: PayCountry[];
    fixedAmount: number | null;
    leekConfigured: boolean;
  }> => {
    return {
      leekConfigured: Boolean(process.env["LEEKPAY_SECRET_KEY"]),
      fixedAmount: null,
      countries: COUNTRIES.map((c) => ({
        code: c.code,
        name: c.label,
        flag: c.flag,
        currency: "XOF",
        dial: DIAL_CODES[c.code] ?? "+",
        operators: PROVIDERS.map((name) => ({
          name,
          otp: name.toLowerCase().startsWith("wave"),
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
  .handler(async ({ data, context }): Promise<DepositInit> => {
    const requestData = data as Input | undefined;
    if (!requestData) throw new Error("Données invalides");

    // Validate explicitly here so we can return the original validation message
    let validated: Input;
    try {
      validated = validate(requestData);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        throw new Error((err as { message: string }).message);
      }
      throw new Error("Données invalides");
    }
    const { createCheckout } = await import("@/lib/leek.server");

    const localRef = newReference();

    const appUrl = (process.env["APP_PUBLIC_URL"] ?? "").replace(/\/$/, "") || undefined;
    if (!appUrl && process.env["NODE_ENV"] === "production") {
      throw new Error(
        "APP_PUBLIC_URL est requis en production pour que LeekPay puisse confirmer le dépôt via webhook.",
      );
    }
    const webhookUrl = appUrl ? `${appUrl}/api/public/webhooks/leekpay` : undefined;
    const returnUrl = appUrl
      ? `${appUrl}/merci?reference=${encodeURIComponent(localRef)}`
      : undefined;

    const payload: Record<string, unknown> = {
      amount: validated.amount,
      currency: validated.currency,
      description: `Dépôt ${localRef}`,
      customer_email: `${localRef.toLowerCase()}@nike.app`,
      metadata: {
        local_reference: localRef,
        operator: validated.operator,
        phone: validated.phone,
        country_code: validated.countryCode,
      },
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
      return_url: returnUrl,
    };

    const { status, body } = await createCheckout(payload);

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

    const bodyData = (body["data"] as Record<string, unknown> | undefined) ?? {};
    const gatewayRef =
      String(bodyData["id"] ?? "") ||
      pick(body, ["reference", "transactionReference", "orderId", "order_id"]);
    const gatewayTxId =
      String(
        bodyData["transaction_id"] ??
          bodyData["transactionId"] ??
          pick(body, ["transactionId", "transaction_id", "id", "paymentId"]),
      ) || gatewayRef;
    const reference = gatewayRef || localRef;
    const redirectUrl =
      String(
        bodyData["payment_url"] ??
          bodyData["paymentUrl"] ??
          pick(body, ["paymentUrl", "payment_url", "redirectUrl", "redirect_url", "url"]),
      ) || "";

    const { error } = await context.supabase.rpc("create_gateway_deposit", {
      _amount: validated.amount,
      _reference: reference,
      _metadata: {
        gateway: "leekpay",
        local_reference: localRef,
        gateway_transaction_id: gatewayTxId || reference,
        country_code: validated.countryCode,
        currency: validated.currency,
        operator: validated.operator,
        phone: validated.phone,
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
  .validator((data: { reference: string }) => ({
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

export const confirmSuccessfulDeposit = createServerFn({ method: "POST" })
  .validator((data: { reference?: string }) => ({
    reference: String(data.reference ?? "")
      .trim()
      .slice(0, 60),
  }))
  .handler(async ({ data }) => {
    const reference = data.reference;
    if (!reference) {
      return { ok: false, reason: "missing_reference" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rpc, error } = await supabaseAdmin.rpc("gateway_confirm_deposit", {
      _reference: reference,
      _success: true,
      _metadata: {
        gateway: "return_redirect",
        gateway_event: "payment_success_redirect",
        source: "success_page",
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: Boolean((rpc as { ok?: boolean } | null)?.ok),
      ...(rpc ?? {}),
    };
  });
