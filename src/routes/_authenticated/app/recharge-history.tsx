import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, Empty, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSession";
import { fcfa, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/recharge-history")({
  head: () => ({
    meta: [
      { title: "Enregistrements de recharge — NikeStake" },
      {
        name: "description",
        content: "Historique complet de vos dépôts et de leur statut de validation.",
      },
      { property: "og:title", content: "Enregistrements de recharge — NikeStake" },
      { property: "og:description", content: "Suivez la validation de chaque dépôt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RechargeHistory,
});

function RechargeHistory() {
  const { data: authUser } = useCurrentUser();
  const userId = authUser?.id ?? null;

  const { data: rows = [] } = useQuery({
    queryKey: ["transactions", "deposit", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "deposit")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <SubHeader title="Enregistrements de recharge" />
      <div className="p-4">
        {rows.length === 0 ? (
          <Empty title="Pas encore de données" text="Vos recharges apparaîtront ici." />
        ) : (
          <Card className="divide-y divide-border p-0">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">{fcfa(r.amount)}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(r.created_at)}</p>
                  {r.reference ? (
                    <p className="text-xs text-muted-foreground">Réf. {r.reference}</p>
                  ) : null}
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
