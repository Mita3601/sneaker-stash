import type { Json } from "@/integrations/supabase/types";

import { getCheckout } from "@/lib/leek.server";

const PAID = ["paid", "completed", "succeeded", "successful", "success"];
const DEAD = ["failed", "cancelled", "canceled", "expired", "refunded"];

function readStatus(body: Record<string, unknown>) {
  const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
  return String(data["status"] ?? body["status"] ?? "").toLowerCase();
}

/**
 * Source de vérité : LeekPay. On interroge l'API pour chaque dépôt en attente
 * et on ne crédite le solde que si la passerelle confirme le paiement.
 */
export async function syncLeekDeposits(opts: {
  userId?: string;
  reference?: string;
  limit?: number;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("transactions")
    .select("id, reference, user_id, metadata")
    .eq("type", "deposit")
    .eq("status", "pending")
    .eq("metadata->>gateway", "leekpay")
    .gte("created_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.userId) query = query.eq("user_id", opts.userId);
  if (opts.reference) {
    const ref = opts.reference;
    query = query.or(
      `reference.eq.${ref},metadata->>local_reference.eq.${ref},metadata->>gateway_transaction_id.eq.${ref}`,
    );
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  let approved = 0;
  let rejected = 0;
  let stillPending = 0;

  for (const row of rows ?? []) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const checkoutId = String(meta["gateway_transaction_id"] ?? row.reference ?? "");
    if (!checkoutId) continue;

    let status = "";
    try {
      const res = await getCheckout(checkoutId);
      if (res.status >= 400) continue;
      status = readStatus(res.body);
    } catch {
      continue;
    }

    const success = PAID.includes(status);
    const failed = DEAD.includes(status);
    if (!success && !failed) {
      stillPending += 1;
      continue;
    }

    const { error: rpcError } = await supabaseAdmin.rpc("gateway_confirm_deposit", {
      _reference: row.reference ?? checkoutId,
      _success: success,
      _metadata: {
        gateway: "leekpay",
        gateway_event: "server_sync",
        gateway_status: status,
        gateway_transaction_id: checkoutId,
      } as unknown as Json,
    });
    if (rpcError) continue;

    if (success) approved += 1;
    else rejected += 1;
  }

  return { checked: rows?.length ?? 0, approved, rejected, pending: stillPending };
}
