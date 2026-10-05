import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MIN_DEPOSIT,
  type DepositInit,
  type DepositStatusResult,
} from "@/lib/payments";

type Input = {
  amount: number;
  phone: string;
  name: string;
};

function validate(raw: unknown): Input {
  const data = (raw ?? {}) as Partial<Input>;
  const amount = Math.round(Number(data.amount));
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT || amount > 5_000_000) {
    throw new Error(`Montant invalide (minimum ${MIN_DEPOSIT} FCFA).`);
  }
  const phone = String(data.phone ?? "").replace(/[^\d+]/g, "");
  if (phone.replace(/\D/g, "").length < 8) {
    throw new Error("Numéro mobile money invalide.");
  }
  const name = String(data.name ?? "").trim().slice(0, 80);
  if (name.length < 2) {
    throw new Error("Nom du titulaire requis.");
  }
  return { amount, phone, name };
}

function newReference() {
  return `DEP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now()
    .toString(36)
    .toUpperCase()}`;
}

/** Disponibilité de la passerelle et montant minimum. */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ minDeposit: number; gatewayConfigured: boolean }> => {
    return {
      minDeposit: MIN_DEPOSIT,
      gatewayConfigured: ["PRISCA_API_HOST", "PRISCA_MERCHANT_CODE", "PRISCA_MERCHANT_SECRET"].every(
        (k) => Boolean((process.env[k] ?? "").trim()),
      ),
    };
  },
);

/** Crée un paiement MoneyFusion et enregistre le dépôt en attente. */
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => validate(raw))
  .handler(async ({ data, context }): Promise<DepositInit> => {
    const { createCollection } = await import("@/lib/prisca.server");
    const refId = newReference();

    // Enregistrement immédiat en attente, avant l'appel à PRISCA.
    const { error } = await context.supabase.rpc("create_gateway_deposit", {
      _amount: data.amount,
      _reference: refId,
      _metadata: { gateway: "prisca", ref_id: refId, statut: "pending", pay_phone: data.phone, customer_name: data.name },
    });
    if (error) throw new Error(error.message);

    let created;
    try {
      created = await createCollection({ refId, amount: data.amount, customerName: data.name, payPhone: data.phone });
    } catch (e) {
      const { settle } = await import("@/lib/prisca-sync.server");
      await settle(refId, false, 0, { gateway_event: "create_failed" }).catch(() => null);
      throw e;
    }
    if (!created.url && !created.account) {
      throw new Error("La passerelle n'a pas renvoyé de lien de paiement.");
    }

    return {
      reference: refId,
      paymentLink: created.url,
      account: created.account,
      amount: data.amount,
      message: created.url
        ? "Finalisez le paiement sur la page qui s'ouvre."
        : `Envoyez ${data.amount} FCFA au numéro ${created.account}.`,
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

    const { syncDeposit } = await import("@/lib/prisca-sync.server");
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
    const { syncDeposit } = await import("@/lib/prisca-sync.server");
    const result = await syncDeposit(data.reference);
    return { ok: result.status === "approved", ...result };
  });
