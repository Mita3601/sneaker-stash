import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CURRENCIES,
  MIN_DEPOSIT,
  type DepositInit,
  type DepositStatusResult,
  type PayCurrency,
} from "@/lib/payments";

type Input = {
  amount: number;
  currency: string;
};

function validate(raw: unknown): Input {
  const data = (raw ?? {}) as Partial<Input>;
  const amount = Math.round(Number(data.amount));
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT || amount > 5_000_000) {
    throw new Error(`Montant invalide (minimum ${MIN_DEPOSIT} FCFA).`);
  }
  const currency = String(data.currency ?? "XOF").toUpperCase();
  if (!CURRENCIES.some((c) => c.code === currency)) {
    throw new Error("Devise invalide.");
  }
  return { amount, currency };
}

function newReference() {
  return `DEP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now()
    .toString(36)
    .toUpperCase()}`;
}

/** Devises disponibles et disponibilité de la passerelle. */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    currencies: PayCurrency[];
    minDeposit: number;
    gatewayConfigured: boolean;
  }> => {
    return {
      currencies: CURRENCIES,
      minDeposit: MIN_DEPOSIT,
      gatewayConfigured: Boolean((process.env["ASHTECHPAY_HP_LIVE_KEY"] ?? "").trim()),
    };
  },
);

/** Crée un lien de paiement Ashtech Pay et enregistre le dépôt en attente. */
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => validate(raw))
  .handler(async ({ data, context }): Promise<DepositInit> => {
    const { createHostedPayment, pickField } = await import("@/lib/ashtech.server");

    const localRef = newReference();
    const { status, body } = await createHostedPayment({
      currency: data.currency,
      amount: data.amount,
      description: `Rechargement wallet ${localRef} - user ${context.userId}`,
      is_fixed_amount: true,
      reference: localRef,
      metadata: { local_reference: localRef, user_id: context.userId },
    });

    const message = String(body["message"] ?? "");
    if (status >= 400) {
      throw new Error(message || "Impossible de créer le lien de paiement. Réessayez.");
    }

    const paymentId = pickField(body, ["payment_id", "paymentId", "id"]);
    const paymentLink = pickField(body, ["payment_link", "paymentLink", "url", "checkout_url"]);
    const slug = pickField(body, ["slug"]);
    const expiresAt = pickField(body, ["expires_at", "expiresAt"]) || null;

    if (!paymentLink) {
      throw new Error("La passerelle n'a pas renvoyé de lien de paiement.");
    }

    const reference = paymentId || localRef;

    const { error } = await context.supabase.rpc("create_gateway_deposit", {
      _amount: data.amount,
      _reference: reference,
      _metadata: {
        gateway: "ashtechpay",
        local_reference: localRef,
        payment_id: paymentId || null,
        gateway_transaction_id: paymentId || reference,
        slug: slug || null,
        payment_link: paymentLink,
        currency: data.currency,
        expires_at: expiresAt,
      },
    });
    if (error) throw new Error(error.message);

    return {
      reference,
      paymentLink,
      amount: data.amount,
      currency: data.currency,
      expiresAt,
      message: message || "Finalisez le paiement sur la page qui s'ouvre.",
    };
  });

/** Statut interne du dépôt : vérifie la passerelle et applique la règle des 15 minutes. */
export const checkDepositStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ({
    reference: String((raw as { reference?: string })?.reference ?? "")
      .trim()
      .slice(0, 80),
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

    const { syncDeposit } = await import("@/lib/ashtech-sync.server");
    return syncDeposit(data.reference);
  });

/** Appelé au retour de la page de paiement : vérifie côté passerelle avant de créditer. */
export const confirmSuccessfulDeposit = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ({
    reference: String((raw as { reference?: string })?.reference ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }) => {
    if (!data.reference) return { ok: false, status: "unknown" as const };
    const { syncDeposit } = await import("@/lib/ashtech-sync.server");
    const result = await syncDeposit(data.reference);
    return { ok: result.status === "approved", ...result };
  });
