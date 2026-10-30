import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Empty, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSession";
import { fcfa } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/withdraw-history")({
  head: () => ({
    meta: [
      { title: "Registres de retrait — Dior Parfums" },
      {
        name: "description",
        content: "Historique de vos demandes de retrait, frais et montants nets.",
      },
      { property: "og:title", content: "Registres de retrait — Dior Parfums" },
      { property: "og:description", content: "Suivez le traitement de chaque retrait." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WithdrawHistory,
});

function WithdrawHistory() {
  const { data: authUser } = useCurrentUser();
  const userId = authUser?.id ?? null;

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["transactions", "withdrawal", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "withdraw")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <SubHeader title="Registres des retraits" />
      <div className="space-y-3 p-3">
        {isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p> : isError ? <Empty title="Historique indisponible" text="Veuillez réessayer dans quelques instants." /> : rows.length === 0 ? (
          <Empty title="Pas encore de données" text="Vos retraits apparaîtront ici." />
        ) : (
          <>
            {rows.map((r) => {
              const fee = Number(r.fee ?? 0);
              const net = Number(r.net_amount ?? Math.max(0, Number(r.amount ?? 0) - fee));

              return (
                <article key={r.id} className="min-w-0 rounded-md border border-border bg-card px-4 py-1 text-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-dotted border-muted-foreground/60 py-2.5 font-bold">
                    <h2 className="font-sans text-sm font-bold">Ordre de retrait</h2>
                    <span className="shrink-0">{fcfa(r.amount)}</span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2 border-b border-border py-2.5 text-muted-foreground">
                    <span>Réf. commande</span>
                    <span>Montant reçu</span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2 border-b border-border py-2.5">
                    <span className="min-w-0 break-all">{r.reference ?? r.id}</span>
                    <span className="text-right font-semibold">{fcfa(net)}</span>
                  </div>
                  <dl className="px-3">
                    <div className="flex justify-between gap-3 py-2.5"><dt>État</dt><dd className={r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-warning-foreground"}>{r.status === "approved" ? "Succès" : r.status === "rejected" ? "Rejeté" : "En attente"}</dd></div>
                    <div className="flex justify-between gap-3 py-2.5"><dt>Temps</dt><dd className="text-right">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</dd></div>
                  </dl>
                </article>
              );
            })}
            <p className="py-1 text-center text-sm text-muted-foreground">Plus de données</p>
          </>
        )}
      </div>
    </>
  );
}
