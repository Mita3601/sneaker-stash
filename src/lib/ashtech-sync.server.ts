import {
  FAILED_STATUSES,
  getHostedPayment,
  isAshtechConfigured,
  readRemoteStatus,
  SUCCESS_STATUSES,
} from "@/lib/ashtech.server";

/** Fenêtre métier : au-delà, le dépôt est marqué échoué même si la passerelle reste ouverte. */
export const DEPOSIT_TIMEOUT_MS = 15 * 60 * 1000;

export type DepositStatus = {
  status: "pending" | "approved" | "rejected" | "unknown";
  amount: number;
  reference: string;
};

type TxRow = {
  id: string;
  status: string;
  amount: number;
  reference: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normalize(status: string): DepositStatus["status"] {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "pending") return "pending";
  return "unknown";
}

export async function findDeposit(reference: string): Promise<TxRow | null> {
  const db = await admin();
  const ref = reference.trim();
  if (!ref) return null;

  const direct = await db
    .from("transactions")
    .select("id, status, amount, reference, created_at, metadata")
    .eq("type", "deposit")
    .eq("reference", ref)
    .order("created_at", { ascending: false })
    .limit(1);

  if (direct.data?.[0]) return direct.data[0] as unknown as TxRow;

  const byMeta = await db
    .from("transactions")
    .select("id, status, amount, reference, created_at, metadata")
    .eq("type", "deposit")
    .or(
      `metadata->>payment_id.eq.${ref},metadata->>local_reference.eq.${ref},metadata->>gateway_transaction_id.eq.${ref},metadata->>slug.eq.${ref}`,
    )
    .order("created_at", { ascending: false })
    .limit(1);

  return (byMeta.data?.[0] as unknown as TxRow) ?? null;
}

async function settle(tx: TxRow, success: boolean, event: string) {
  const db = await admin();
  await db.rpc("gateway_confirm_deposit", {
    _reference: tx.reference ?? "",
    _success: success,
    _metadata: {
      gateway: "ashtechpay",
      gateway_event: event,
      credited_at: success ? new Date().toISOString() : null,
    },
  });
}

/**
 * Vérifie un dépôt en attente auprès d'Ashtech Pay, crédite le solde si le paiement
 * est confirmé, et force l'échec passé 15 minutes.
 */
export async function syncDeposit(reference: string): Promise<DepositStatus> {
  const tx = await findDeposit(reference);
  if (!tx) return { status: "unknown", amount: 0, reference };

  const result = (status: DepositStatus["status"]): DepositStatus => ({
    status,
    amount: Number(tx.amount ?? 0),
    reference: tx.reference ?? reference,
  });

  if (tx.status !== "pending") return result(normalize(tx.status));

  const meta = tx.metadata ?? {};
  const paymentId = String(meta["payment_id"] ?? meta["gateway_transaction_id"] ?? "");

  if (paymentId && isAshtechConfigured()) {
    try {
      const remote = readRemoteStatus((await getHostedPayment(paymentId)).body);
      if (SUCCESS_STATUSES.includes(remote)) {
        await settle(tx, true, "verified_success");
        return result("approved");
      }
      if (FAILED_STATUSES.includes(remote)) {
        await settle(tx, false, `verified_${remote}`);
        return result("rejected");
      }
    } catch {
      // réseau/API indisponible : on retombe sur la règle de délai ci-dessous
    }
  }

  const created = new Date(tx.created_at).getTime();
  if (Number.isFinite(created) && Date.now() - created > DEPOSIT_TIMEOUT_MS) {
    await settle(tx, false, "expired_after_15min");
    return result("rejected");
  }

  return result("pending");
}
