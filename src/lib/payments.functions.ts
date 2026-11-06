import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MIN_DEPOSIT,
  PAYMENT_PROVIDER_BY_COUNTRY,
  type DepositInit,
  type DepositStatusResult,
} from "@/lib/payments";
import {
  buildRobotpayCheckoutUrl,
  getRobotpayCountry,
  normalizeRobotpayCountryCode,
} from "@/lib/robotpay.server";

type Input = {
  amount: number;
  phone: string;
  name: string;
  country_code?: string;
  country?: string;
};

function validate(raw: unknown): Input {
  const data = (raw ?? {}) as Partial<Input>;
  const amount = Math.round(Number(data.amount));
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT || amount > 5_000_000) {
    throw new Error(`Montant invalide (minimum ${MIN_DEPOSIT} FCFA).`);
  }

  const countryCode = String(data.country_code ?? data.country ?? "").trim();
  const provider = countryCode
    ? (PAYMENT_PROVIDER_BY_COUNTRY[countryCode] ??
      PAYMENT_PROVIDER_BY_COUNTRY[normalizeRobotpayCountryCode(countryCode) ?? ""] ??
      "geniuspay")
    : "geniuspay";

  const phone = String(data.phone ?? "").replace(/[^\d+]/g, "");
  if (provider !== "robotpay" && phone.replace(/\D/g, "").length < 8) {
    throw new Error("Numéro mobile money invalide.");
  }

  const name = String(data.name ?? "")
    .trim()
    .slice(0, 80);
  if (provider !== "robotpay" && name.length < 2) {
    throw new Error("Nom du titulaire requis.");
  }

  return {
    amount,
    phone,
    name,
    country_code: countryCode,
    country: String(data.country ?? countryCode),
  };
}

function newReference() {
  return `DEP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now()
    .toString(36)
    .toUpperCase()}`;
}

/** Disponibilité de la passerelle et montant minimum. */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ minDeposit: number; gatewayConfigured: boolean }> => {
    const geniuspayReady = ["GENIUSPAY_API_KEY", "GENIUSPAY_API_SECRET"].every((k) =>
      Boolean((process.env[k] ?? "").trim()),
    );
    const robotpayReady = ["ROBOTPAY_MERCHANT_SLUG", "ROBOTPAY_WEBHOOK_SECRET"].every((k) =>
      Boolean((process.env[k] ?? "").trim()),
    );

    return {
      minDeposit: MIN_DEPOSIT,
      gatewayConfigured: geniuspayReady || robotpayReady,
    };
  },
);

/** Crée un paiement et enregistre le dépôt en attente. RobotPay est activé par défaut pour les pays pris en charge. */
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => validate(raw))
  .handler(async ({ data, context }): Promise<DepositInit> => {
    const provider =
      PAYMENT_PROVIDER_BY_COUNTRY[data.country_code ?? data.country ?? ""] ??
      PAYMENT_PROVIDER_BY_COUNTRY[
        normalizeRobotpayCountryCode(data.country_code ?? data.country ?? "") ?? ""
      ] ??
      "geniuspay";

    if (provider === "robotpay") {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const url = req?.headers.get("origin") || req?.headers.get("referer") || "";
      let returnBase = "";
      try {
        const parsed = new URL(url);
        if (parsed.protocol === "https:" || parsed.hostname === "localhost")
          returnBase = parsed.origin;
      } catch {
        returnBase = "";
      }

      const countryCode =
        normalizeRobotpayCountryCode(data.country_code ?? data.country ?? "") ?? "+226";
      const country = getRobotpayCountry(countryCode);
      if (!country) {
        throw new Error("Pays non pris en charge par RobotPay.");
      }
      const redirectBase =
        returnBase ||
        process.env["APP_URL"] ||
        process.env["APP_PUBLIC_URL"] ||
        "https://example.com";
      const redirect = `${redirectBase.replace(/\/$/, "")}/payment/robotpay/return?status=success&deposit=${encodeURIComponent(
        `robotpay-${Date.now()}`,
      )}`;
      const paymentLink = buildRobotpayCheckoutUrl({
        amount: data.amount,
        country: country.country,
        redirect,
      });
      const reference = `OP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

      const { error } = await context.supabase.rpc("create_gateway_deposit", {
        _amount: data.amount,
        _reference: reference,
        _metadata: {
          gateway: "robotpay",
          country_code: countryCode,
          country: country.country,
          currency: country.currency,
          checkout_url: paymentLink,
          redirect,
          status: "pending",
        },
      });
      if (error) throw new Error(error.message);

      return {
        reference,
        paymentLink,
        amount: data.amount,
        message: "Finalisez le paiement sur la page RobotPay qui s'ouvre.",
      };
    }

    const { createPayment } = await import("@/lib/geniuspay.server");
    const orderId = newReference();

    // Numéro au format international (+225… par défaut, selon le profil).
    let phone = data.phone;
    if (!phone.startsWith("+")) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("country_code")
        .eq("id", context.userId)
        .maybeSingle();
      const cc = String(prof?.country_code ?? "+225").replace(/[^\d+]/g, "") || "+225";
      const digits = phone.replace(/\D/g, "");
      const ccDigits = cc.replace(/\D/g, "");
      phone = digits.startsWith(ccDigits) && digits.length > 10 ? `+${digits}` : `${cc}${digits}`;
    }

    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    let returnBase: string | undefined;
    try {
      const raw = req?.headers.get("origin") || req?.headers.get("referer") || "";
      const u = new URL(raw);
      if (u.protocol === "https:" || u.hostname === "localhost") returnBase = u.origin;
    } catch {
      returnBase = undefined;
    }

    const created = await createPayment({
      ...(returnBase ? { returnBase } : {}),
      amount: data.amount,
      orderId,
      userId: context.userId,
      name: data.name,
      phone,
    });

    const { error } = await context.supabase.rpc("create_gateway_deposit", {
      _amount: data.amount,
      _reference: created.reference,
      _metadata: {
        gateway: "geniuspay",
        ref_id: orderId,
        order_id: orderId,
        statut: "pending",
        checkout_url: created.checkoutUrl,
        numero_send: phone,
        nom_client: data.name,
      },
    });
    if (error) throw new Error(error.message);

    return {
      reference: created.reference,
      paymentLink: created.checkoutUrl,
      amount: data.amount,
      message: "Finalisez le paiement sur la page qui s'ouvre.",
    };
  });

/** Statut interne du dépôt : vérifie la passerelle et applique la règle des 15 minutes. */
export const checkDepositStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ({
    reference: String((raw as { reference?: string })?.reference ?? "")
      .trim()
      .slice(0, 120),
  }))
  .handler(async ({ data, context }): Promise<DepositStatusResult> => {
    const { data: rows, error } = await context.supabase
      .from("transactions")
      .select("reference")
      .eq("type", "deposit")
      .eq("user_id", context.userId)
      .eq("reference", data.reference)
      .limit(1);
    if (error) throw new Error(error.message);
    if (!rows?.[0]) return { status: "unknown", amount: 0, reference: data.reference };

    const { syncDeposit } = await import("@/lib/geniuspay-sync.server");
    return syncDeposit(data.reference);
  });

/** Appelé au retour de la page de paiement : vérifie côté passerelle avant de créditer. */
export const confirmSuccessfulDeposit = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ({
    reference: String((raw as { reference?: string })?.reference ?? "")
      .trim()
      .slice(0, 120),
  }))
  .handler(async ({ data }) => {
    if (!data.reference) return { ok: false, status: "unknown" as const };
    const { syncDeposit } = await import("@/lib/geniuspay-sync.server");
    const result = await syncDeposit(data.reference);
    return { ok: result.status === "approved", ...result };
  });
