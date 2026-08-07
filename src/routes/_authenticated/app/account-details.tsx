import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, Empty, StatTile, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_TYPES, fcfa, shortDate, TX_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/account-details")({
  head: () => ({
    meta: [
      { title: "Détails du compte — NikeStake" },
      { name: "description", content: "Consultez vos revenus du jour, sur 7 jours et sur 30 jours." },
      { property: "og:title", content: "Détails du compte — NikeStake" },
      { property: "og:description", content: "Tous vos mouvements de compte au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDetails,
});

function AccountDetails() {
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approved = txs.filter((t) => t.status === "approved");
  const sumSince = (days: number) => {
    const from = Date.now() - days * 86_400_000;
    return approved
      .filter((t) => CREDIT_TYPES.includes(t.type) && new Date(t.created_at).getTime() >= from)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };
  const credited = approved
    .filter((t) => CREDIT_TYPES.includes(t.type))
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const debited = approved
    .filter((t) => !CREDIT_TYPES.includes(t.type))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <>
      <SubHeader title="Détails du compte" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Aujourd'hui" value={fcfa(sumSince(1))} />
          <StatTile label="7 jours" value={fcfa(sumSince(7))} />
          <StatTile label="30 jours" value={fcfa(sumSince(30))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Total crédité" value={fcfa(credited)} />
          <StatTile label="Total débité" value={fcfa(debited)} />
        </div>

        {txs.length === 0 ? (
          <Empty title="Aucun mouvement" text="Vos transactions apparaîtront ici." />
        ) : (
          <Card className="divide-y divide-border p-0">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{TX_LABELS[t.type] ?? t.type}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(t.created_at)}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      CREDIT_TYPES.includes(t.type) ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {CREDIT_TYPES.includes(t.type) ? "+" : "-"}
                    {fcfa(t.amount)}
                  </p>
                  <StatusPill status={t.status} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
