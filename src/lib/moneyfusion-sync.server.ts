import {
  FAILED_STATUSES,
  getMoneyFusionStatus,
  isMoneyFusionConfigured,
  readRemoteStatus,
  SUCCESS_STATUSES,
} from "@/lib/moneyfusion.server";

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

/** Retrouve un dépôt par sa référence (token MoneyFusion) ou par ses métadonnées. */
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
      `metadata->>token.eq.${ref},metadata->>local_reference.eq.${ref},metadata->>gateway_transaction_id.eq.${ref}`,
    )
    .order("created_at", { ascending: false })
    .limit(1);

  return (byMeta.data?.[0] as unknown as TxRow) ?? null;
}

async function settle(tx: TxRow, success: boolean, event: string, extra?: Record<string, unknown>) {
  const db = await admin();
  // Idempotent : gateway_confirm_deposit ignore un dépôt déjà traité.
  await db.rpc("gateway_confirm_deposit", {
    _reference: tx.reference ?? "",
    _success: success,
    _metadata: {
      gateway: "moneyfusion",
      gateway_event: event,
      credited_at: success ? new Date().toISOString() : null,
      ...(extra ?? {}),
    },
  });
}

/**
 * Vérifie un dépôt en attente auprès de MoneyFusion, crédite le solde automatiquement
 * si le paiement est confirmé, et force l'échec passé 15 minutes.
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
  const token = String(meta["token"] ?? meta["gateway_transaction_id"] ?? tx.reference ?? "");

  if (token && isMoneyFusionConfigured()) {
    try {
      const remote = await getMoneyFusionStatus(token);
      const status = readRemoteStatus(remote.body);
      if (SUCCESS_STATUSES.includes(status)) {
        await settle(tx, true, "verified_paid", {
          numero_transaction:
            ((remote.body["data"] as Record<string, unknown> | undefined) ?? {})[
              "numeroTransaction"
            ] ?? null,
        });
        return result("approved");
      }
      if (FAILED_STATUSES.includes(status)) {
        await settle(tx, false, `verified_${status.replace(/\s+/g, "_")}`);
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
