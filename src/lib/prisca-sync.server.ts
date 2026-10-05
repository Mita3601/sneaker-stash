import { isPriscaConfigured, queryCollection } from "@/lib/prisca.server";

export const DEPOSIT_TIMEOUT_MS = 15 * 60 * 1000;

export type DepositStatus = {
  status: "pending" | "approved" | "rejected" | "unknown";
  amount: number;
  reference: string;
};

type TxRow = { id: string; status: string; amount: number; reference: string | null; created_at: string; metadata: Record<string, unknown> | null };

async function db() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

function normalize(s: string): DepositStatus["status"] {
  return s === "approved" || s === "rejected" || s === "pending" ? s : "unknown";
}

export async function findDeposit(refId: string): Promise<TxRow | null> {
  const ref = refId.trim();
  if (!ref) return null;
  const { data, error } = await (await db()).rpc("find_gateway_deposit", { p_ref: ref });
  if (error) {
    console.error("find_gateway_deposit error", error);
    return null;
  }
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (!row) return null;
  return {
    id: String(row["id"]),
    status: String(row["status"] ?? ""),
    amount: Number(row["amount"] ?? 0),
    reference: (row["reference"] as string | null) ?? null,
    created_at: String(row["created_at"] ?? ""),
    metadata: (row["metadata"] as Record<string, unknown> | null) ?? null,
  };
}

/** Règlement idempotent : crédite collectedAmount (montant réellement reçu). */
export async function settle(refId: string, success: boolean, collectedAmount: number, meta: Record<string, unknown>) {
  const { data, error } = await (await db()).rpc("prisca_settle_deposit", {
    _key: (process.env["PRISCA_SETTLE_KEY"] ?? "").trim(),
    _ref_id: refId,
    _success: success,
    _collected_amount: collectedAmount,
    _metadata: { gateway: "prisca", ...meta } as never,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; status?: string; reason?: string } | null;
}

/** Vérifie auprès de PRISCA, crédite si payé, échoue après 15 min. */
export async function syncDeposit(refId: string): Promise<DepositStatus> {
  const tx = await findDeposit(refId);
  if (!tx) return { status: "unknown", amount: 0, reference: refId };
  const ref = tx.reference ?? refId;
  const out = (status: DepositStatus["status"], amount = Number(tx.amount)): DepositStatus => ({ status, amount, reference: ref });
  if (tx.status !== "pending") return out(normalize(tx.status));

  if (isPriscaConfigured()) {
    try {
      const remote = await queryCollection(ref);
      if (remote?.status === "SUCCESS") {
        const credit = remote.collectedAmount > 0 ? remote.collectedAmount : remote.amount;
        const r = await settle(ref, true, credit, { gateway_event: "query_success", prisca: remote.raw });
        if (r?.ok) return out("approved", credit);
      } else if (remote?.status === "FAILED") {
        await settle(ref, false, 0, { gateway_event: "query_failed", prisca: remote.raw });
        return out("rejected");
      }
    } catch (e) {
      console.error("PRISCA query failed", e);
    }
  }

  const created = new Date(tx.created_at).getTime();
  if (Number.isFinite(created) && Date.now() - created > DEPOSIT_TIMEOUT_MS) {
    await settle(ref, false, 0, { gateway_event: "expired_after_15min" });
    return out("rejected");
  }
  return out("pending");
}
