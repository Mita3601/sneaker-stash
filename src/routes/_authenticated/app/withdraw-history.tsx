import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, Empty, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/withdraw-history")({
  head: () => ({
    meta: [
      { title: "Registres de retrait — NikeStake" },
      {
        name: "description",
        content: "Historique de vos demandes de retrait, frais et montants nets.",
      },
      { property: "og:title", content: "Registres de retrait — NikeStake" },
      { property: "og:description", content: "Suivez le traitement de chaque retrait." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WithdrawHistory,
});

function WithdrawHistory() {
  const { data: rows = [] } = useQuery({
    queryKey: ["transactions", "withdrawal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "withdraw")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <SubHeader title="Registres de retrait" />
      <div className="p-4">
        {rows.length === 0 ? (
          <Empty title="Pas encore de données" text="Vos retraits apparaîtront ici." />
        ) : (
          <Card className="divide-y divide-border p-0">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">{fcfa(r.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Frais {fcfa(r.fee)} · Net {fcfa(r.net_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{shortDate(r.created_at)}</p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
