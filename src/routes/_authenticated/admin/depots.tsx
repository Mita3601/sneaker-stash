import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate, TX_LABELS } from "@/lib/app";
import { inZone, ZoneSummary, ZoneTabs, type AdminZone } from "@/components/AdminZones";

export const Route = createFileRoute("/_authenticated/admin/depots")({
  head: () => ({
    meta: [
      { title: "Admin - Dépôts — Dior Parfums" },
      { name: "description", content: "Validez et gérez les dépôts." },
    ],
  }),
  component: AdminDepots,
});

function AdminDepots() {
  const qc = useQueryClient();
  const [zone, setZone] = useState<AdminZone>("bfci");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "approved" | "pending" | "rejected">(
    "all",
  );

  const { data: deposits = [] } = useQuery({
    queryKey: ["admin-depots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles(phone, country_code)")
        .eq("type", "deposit")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const zoneDeposits = deposits.filter((tx) => inZone(tx.profiles?.country_code, zone));

  const filteredDeposits = zoneDeposits.filter((tx) => {
    const matchesQuery = [
      tx.profiles?.phone,
      tx.reference,
      (tx.metadata as Record<string, unknown> | null)?.["gateway_transaction_id"],
      (tx.metadata as Record<string, unknown> | null)?.["local_reference"],
      tx.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());

    const matchesStatus = selectedStatus === "all" || tx.status === selectedStatus;
    return matchesQuery && matchesStatus;
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
    total: zoneDeposits.filter((tx) => tx.status !== "rejected").length,
    approved: zoneDeposits.filter((tx) => tx.status === "approved").length,
    pending: zoneDeposits.filter((tx) => tx.status === "pending").length,
    rejected: zoneDeposits.filter((tx) => tx.status === "rejected").length,
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
      qc.invalidateQueries({ queryKey: ["admin-zone-summary"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <SubHeader title="Dépôts" to="/admin" />
      <div className="space-y-4 p-4">
        <ZoneTabs zone={zone} onChange={setZone} />
        <ZoneSummary zone={zone} />

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
                          typeof metadata["gateway_transaction_id"] === "string"
                            ? metadata["gateway_transaction_id"]
                            : undefined;
                        const localRef =
                          typeof metadata["local_reference"] === "string"
                            ? metadata["local_reference"]
                            : undefined;
                        const paymentUrl =
                          typeof metadata["payment_url"] === "string"
                            ? metadata["payment_url"]
                            : undefined;

                        const payer = typeof metadata["payer_phone"] === "string" ? metadata["payer_phone"] : undefined;
                        const sms = typeof metadata["sms"] === "string" ? metadata["sms"] : undefined;
                        return (
                          <>
                            {payer ? <p>Numéro du client : <b className="text-foreground">{payer}</b></p> : null}
                            {sms ? <p className="whitespace-pre-wrap rounded-lg bg-secondary p-2 text-foreground">SMS : {sms}</p> : /_manual$/.test(String(metadata["gateway"] ?? "")) ? <p>SMS non encore envoyé</p> : null}
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
