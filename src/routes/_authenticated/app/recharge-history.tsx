import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Empty, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSession";
import { fcfa, STATUS_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/recharge-history")({
  head: () => ({
    meta: [
      { title: "Enregistrements de recharge — Dior Parfums" },
      {
        name: "description",
        content: "Historique complet de vos dépôts et de leur statut de validation.",
      },
      { property: "og:title", content: "Enregistrements de recharge — Dior Parfums" },
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

  const { data: rows = [], isLoading, isError } = useQuery({
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
      <SubHeader title="Historique de recharge" />
      <div className="space-y-3 p-3">
        {isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p> : isError ? <Empty title="Historique indisponible" text="Veuillez réessayer dans quelques instants." /> : rows.length === 0 ? (
          <Empty title="Pas encore de données" text="Vos recharges apparaîtront ici." />
        ) : (
          <>
            {rows.map((r) => (
              <article key={r.id} className="min-w-0 rounded-md border border-border bg-card px-3 py-1">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-border py-2 text-sm font-bold">
                  <h2 className="font-sans text-sm font-bold">Ordre de dépôt</h2><span>{fcfa(r.amount)}</span>
                </div>
                <dl className="text-xs">
                  <div className="flex items-start justify-between gap-3 border-b border-border py-2"><dt className="shrink-0">Réf. commande</dt><dd className="min-w-0 break-all text-right">{r.reference ?? r.id}</dd></div>
                  <div className="flex justify-between gap-3 border-b border-border py-2"><dt>Canal</dt><dd className="text-right">Paiement en ligne</dd></div>
                  <div className="flex justify-between gap-3 border-b border-border py-2"><dt>État</dt><dd className={r.status === "approved" || r.status === "paid" ? "text-success" : r.status === "rejected" || r.status === "failed" ? "text-destructive" : "text-warning-foreground"}>{r.status === "pending" ? "Recharge en cours" : r.status === "paid" ? "Validé" : r.status === "failed" ? "Échec" : STATUS_LABELS[r.status] ?? r.status}</dd></div>
                  <div className="flex justify-between gap-3 py-2"><dt>Temps</dt><dd className="text-right">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</dd></div>
                </dl>
              </article>
            ))}
            <p className="py-1 text-center text-sm text-muted-foreground">Plus aucune donnée</p>
          </>
        )}
      </div>
    </>
  );
}
