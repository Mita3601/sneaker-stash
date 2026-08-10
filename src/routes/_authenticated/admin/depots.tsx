import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate, TX_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/depots")({
  head: () => ({
    meta: [
      { title: "Admin - Dépôts — Nike" },
      { name: "description", content: "Validez et gérez les dépôts." },
    ],
  }),
  component: AdminDepots,
});

function AdminDepots() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data: deposits = [] } = useQuery({
    queryKey: ["admin-depots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles(phone)")
        .eq("type", "deposit")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredDeposits = deposits.filter((tx) => {
    const value = [
      tx.profiles?.phone,
      tx.reference,
      (tx.metadata as Record<string, unknown> | null)?.['gateway_transaction_id'],
      (tx.metadata as Record<string, unknown> | null)?.['local_reference'],
      tx.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return value.includes(query.trim().toLowerCase());
  });

  const sortedDeposits = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...filteredDeposits].sort((a, b) => {
      if (sortKey === "amount") {
        return (Number(a.amount) - Number(b.amount)) * direction;
      }
      if (sortKey === "status") {
        return a.status.localeCompare(b.status) * direction;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    });
  }, [filteredDeposits, sortKey, sortOrder]);

  const counts = {
    total: filteredDeposits.length,
    pending: filteredDeposits.filter((tx) => tx.status === "pending").length,
    approved: filteredDeposits.filter((tx) => tx.status === "approved").length,
    rejected: filteredDeposits.filter((tx) => tx.status === "rejected").length,
  };

  const review = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("admin_review_transaction", {
        _tx_id: id,
        _approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dépôt mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-depots"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <SubHeader title="Dépôts" to="/admin" />
      <div className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Card className="p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un dépôt, un téléphone, une référence..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Card>
          <Card className="flex flex-wrap items-center justify-end gap-2 p-3">
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as typeof sortKey)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="date">Trier par date</option>
              <option value="amount">Trier par montant</option>
              <option value="status">Trier par statut</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center p-4">
            <p className="text-xs opacity-90">Total</p>
            <p className="text-2xl font-black">{counts.total}</p>
            <p className="text-xs text-muted-foreground">Tous</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs opacity-90">Validés</p>
            <p className="text-2xl font-black">{counts.approved}</p>
            <p className="text-xs text-muted-foreground">Réussis</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs opacity-90">En attente</p>
            <p className="text-2xl font-black">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </Card>
        </div>

        {sortedDeposits.length === 0 ? (
          <Card className="text-center">Aucun dépôt trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {sortedDeposits.map((tx) => (
              <Card key={tx.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{TX_LABELS[tx.type] ?? tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.profiles?.phone} · {shortDate(tx.created_at)}
                    </p>
                  </div>
                  <StatusPill status={tx.status} />
                </div>
                <p className="text-sm">Montant : {fcfa(tx.amount)}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {tx.reference ? <p>Référence : {tx.reference}</p> : null}
                  {tx.metadata && typeof tx.metadata === "object" ? (
                    <>
                      {(() => {
                        const metadata = tx.metadata as Record<string, unknown>;
                        const gatewayTxId =
                          typeof metadata['gateway_transaction_id'] === "string"
                            ? metadata['gateway_transaction_id']
                            : undefined;
                        const localRef =
                          typeof metadata['local_reference'] === "string"
                            ? metadata['local_reference']
                            : undefined;
                        const paymentUrl =
                          typeof metadata['payment_url'] === "string"
                            ? metadata['payment_url']
                            : undefined;

                        return (
                          <>
                            {gatewayTxId ? <p>Transaction gateway : {gatewayTxId}</p> : null}
                            {localRef ? <p>Référence locale : {localRef}</p> : null}
                            {paymentUrl ? (
                              <a
                                className="block break-all text-primary underline"
                                href={paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Ouvrir le lien de dépôt
                              </a>
                            ) : null}
                          </>
                        );
                      })()}
                    </>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Btn
                    className="flex-1 text-xs"
                    disabled={review.isPending || tx.status !== "pending"}
                    onClick={() => review.mutate({ id: tx.id, approve: true })}
                  >
                    Valider
                  </Btn>
                  <Btn
                    variant="outline"
                    className="flex-1 text-xs"
                    disabled={review.isPending || tx.status !== "pending"}
                    onClick={() => review.mutate({ id: tx.id, approve: false })}
                  >
                    Rejeter
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
