import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate, TX_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/retrait")({
  head: () => ({
    meta: [
      { title: "Admin - Retraits — Nike" },
      { name: "description", content: "Validez et gérez les retraits." },
    ],
  }),
  component: AdminRetrait,
});

function AdminRetrait() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "approved" | "pending" | "rejected">(
    "all",
  );

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-retrait"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles(phone, country_code)")
        .eq("type", "withdraw")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredWithdrawals = withdrawals.filter((tx) => {
    const metadata = (tx.metadata as Record<string, unknown> | null) ?? {};
    const matchesQuery = [
      tx.profiles?.phone,
      tx.profiles?.country_code,
      metadata.provider,
      metadata.account_number,
      metadata.account_name,
      tx.id,
      tx.reference,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());

    const matchesStatus = selectedStatus === "all" || tx.status === selectedStatus;
    return matchesQuery && matchesStatus;
  });

  const sortedWithdrawals = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...filteredWithdrawals].sort((a, b) => {
      if (sortKey === "amount") {
        return (Number(a.amount) - Number(b.amount)) * direction;
      }
      if (sortKey === "status") {
        return a.status.localeCompare(b.status) * direction;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    });
  }, [filteredWithdrawals, sortKey, sortOrder]);

  const counts = {
    total: filteredWithdrawals.length,
    pending: filteredWithdrawals.filter((tx) => tx.status === "pending").length,
    approved: filteredWithdrawals.filter((tx) => tx.status === "approved").length,
    rejected: filteredWithdrawals.filter((tx) => tx.status === "rejected").length,
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
      toast.success("Retrait mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-retrait"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <SubHeader title="Retraits" to="/admin" />
      <div className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Card className="p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un retrait, un téléphone, un compte..."
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
            <p className="text-xs text-muted-foreground">Validés</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs opacity-90">En attente</p>
            <p className="text-2xl font-black">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: `Tous (${counts.total})` },
            { value: "approved", label: `Réussis (${counts.approved})` },
            { value: "pending", label: `En cours (${counts.pending})` },
            { value: "rejected", label: `Échoués (${counts.rejected})` },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value as typeof selectedStatus)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                selectedStatus === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sortedWithdrawals.length === 0 ? (
          <Card className="text-center">Aucun retrait trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {sortedWithdrawals.map((tx) => {
              const metadata = (tx.metadata ?? {}) as Record<string, unknown>;
              const provider = typeof metadata.provider === "string" ? metadata.provider : "-";
              const accountNumber =
                typeof metadata.account_number === "string" ? metadata.account_number : "-";
              const accountName =
                typeof metadata.account_name === "string" ? metadata.account_name : "-";
              const countryCode =
                typeof tx.profiles?.country_code === "string" ? tx.profiles.country_code : "-";

              const fee = Number(tx.fee ?? 0);
              const net = Number(tx.net_amount ?? Math.max(0, Number(tx.amount ?? 0) - fee));

              return (
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

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Pays : {countryCode}</p>
                    <p>Mobile Money / opérateur : {provider}</p>
                    <p>Compte destinataire : {accountNumber}</p>
                    <p>Nom du bénéficiaire : {accountName}</p>
                    <p>Numéro du client : {tx.profiles?.phone ?? "-"}</p>
                    <p>ID du retrait : {tx.id}</p>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p>Montant demandé : {fcfa(tx.amount)}</p>
                    <p>Frais de transfert (15%) : {fcfa(fee)}</p>
                    <p className="font-semibold text-foreground">À transférer : {fcfa(net)}</p>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
