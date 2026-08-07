import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, Empty, StatTile, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate, TX_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — NikeStake" },
      { name: "description", content: "Validez les dépôts et retraits et surveillez les alertes de fraude." },
      { property: "og:title", content: "Administration — NikeStake" },
      { property: "og:description", content: "Panneau de gestion des transactions NikeStake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles(phone)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fraud_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("admin_review_transaction", {
        _tx_id: id,
        _approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaction traitée");
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background">
      <SubHeader title="Administration" to="/app/me" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="En attente" value={pending.length} />
          <StatTile label="Alertes fraude" value={alerts.length} />
        </div>

        {pending.length === 0 ? (
          <Empty title="Aucune transaction en attente" />
        ) : (
          <Card className="divide-y divide-border p-0">
            {pending.map((t) => (
              <div key={t.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">
                      {TX_LABELS[t.type] ?? t.type} · {fcfa(t.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.profiles?.phone} · {shortDate(t.created_at)}
                    </p>
                    {t.reference ? (
                      <p className="text-xs text-muted-foreground">Réf. {t.reference}</p>
                    ) : null}
                  </div>
                  <StatusPill status={t.status} />
                </div>
                <div className="flex gap-2">
                  <Btn
                    className="flex-1 px-3 py-2 text-xs"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: t.id, approve: true })}
                  >
                    Approuver
                  </Btn>
                  <Btn
                    variant="outline"
                    className="flex-1 px-3 py-2 text-xs"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: t.id, approve: false })}
                  >
                    Rejeter
                  </Btn>
                </div>
              </div>
            ))}
          </Card>
        )}

        {alerts.length > 0 ? (
          <Card className="divide-y divide-border p-0">
            {alerts.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <p className="text-sm font-semibold">{a.reason ?? "Écart de solde"} · {fcfa(a.difference)}</p>
                <p className="text-xs text-muted-foreground">{shortDate(a.created_at)}</p>
              </div>
            ))}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
