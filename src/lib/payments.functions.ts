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
      gatewayConfigured: ["GENIUSPAY_API_KEY", "GENIUSPAY_API_SECRET"].every((k) =>
        Boolean((process.env[k] ?? "").trim()),
      ),
    };
  },
);

/** Crée un paiement GeniusPay (mode checkout) et enregistre le dépôt en attente. */
export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => validate(raw))
  .handler(async ({ data, context }): Promise<DepositInit> => {
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

    const created = await createPayment({
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
