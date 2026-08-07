import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate, TX_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/depots")({
  head: () => ({
    meta: [
      { title: "Admin - Dépôts — NikeStake" },
      { name: "description", content: "Validez et gérez les dépôts." },
    ],
  }),
  component: AdminDepots,
});

function AdminDepots() {
  const qc = useQueryClient();

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

  const counts = {
    total: deposits.length,
    pending: deposits.filter((tx) => tx.status === "pending").length,
    approved: deposits.filter((tx) => tx.status === "approved").length,
    rejected: deposits.filter((tx) => tx.status === "rejected").length,
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

        {deposits.length === 0 ? (
          <Card className="text-center">Aucun dépôt trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {deposits.map((tx) => (
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
