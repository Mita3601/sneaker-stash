import { FAILED_STATUSES, getPayment, isGeniusPayConfigured, SUCCESS_STATUSES } from "@/lib/geniuspay.server";

export const DEPOSIT_TIMEOUT_MS = 15 * 60 * 1000;
const GATEWAY = "geniuspay";

export type DepositStatus = {
  status: "pending" | "approved" | "rejected" | "unknown";
  amount: number;
  reference: string;
};

type TxRow = { status: string; amount: number; reference: string | null; created_at: string };

async function db() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

function normalize(s: string): DepositStatus["status"] {
  return s === "approved" || s === "rejected" || s === "pending" ? s : "unknown";
}

export async function findDeposit(reference: string): Promise<TxRow | null> {
  const ref = reference.trim();
  if (!ref) return null;
  const { data, error } = await (await db()).rpc("find_gateway_deposit", { p_ref: ref });
  if (error) {
    console.error("find_gateway_deposit error", error);
    return null;
  }
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (!row) return null;
  return {
    status: String(row["status"] ?? ""),
    amount: Number(row["amount"] ?? 0),
    reference: (row["reference"] as string | null) ?? null,
    created_at: String(row["created_at"] ?? ""),
  };
}

/** Règlement idempotent (un statut final n'est jamais écrasé). */
export async function settle(reference: string, success: boolean, creditAmount: number, meta: Record<string, unknown>) {
  const { data, error } = await (await db()).rpc("gateway_settle_deposit", {
    _key: (process.env["DEPOSIT_SETTLE_KEY"] ?? "").trim(),
    _gateway: GATEWAY,
    _reference: reference,
    _success: success,
    _credit_amount: creditAmount,
    _metadata: { gateway: GATEWAY, ...meta } as never,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; status?: string; reason?: string } | null;
}

/**
 * Vérifie le statut réel auprès de GeniusPay, crédite le montant payé par le client
 * si "completed", marque échoué si failed/cancelled/expired ou après 15 minutes.
 */
export async function syncDeposit(reference: string): Promise<DepositStatus> {
  const tx = await findDeposit(reference);
  if (!tx) return { status: "unknown", amount: 0, reference };
  const ref = tx.reference ?? reference;
  const out = (status: DepositStatus["status"], amount = Number(tx.amount)): DepositStatus => ({ status, amount, reference: ref });
  if (tx.status !== "pending") return out(normalize(tx.status));

  if (isGeniusPayConfigured()) {
    try {
      const remote = await getPayment(ref);
      if (remote && SUCCESS_STATUSES.includes(remote.status)) {
        const credit = remote.amount > 0 ? remote.amount : Number(tx.amount);
        const r = await settle(ref, true, credit, {
          gateway_event: "verified_completed",
          fees: remote.fees,
          net_amount_gateway: remote.netAmount,
          payment_method: remote.paymentMethod,
        });
        if (r?.ok) return out("approved", credit);
      } else if (remote && FAILED_STATUSES.includes(remote.status)) {
        await settle(ref, false, 0, { gateway_event: `verified_${remote.status}` });
        return out("rejected");
      }
    } catch (e) {
      console.error("GeniusPay verification failed", e);
    }
  }

  const created = new Date(tx.created_at).getTime();
  if (Number.isFinite(created) && Date.now() - created > DEPOSIT_TIMEOUT_MS) {
    await settle(ref, false, 0, { gateway_event: "expired_after_15min" });
    return out("rejected");
  }
  return out("pending");
}
