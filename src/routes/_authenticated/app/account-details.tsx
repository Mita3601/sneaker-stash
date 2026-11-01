import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Btn } from "@/components/ui-kit";
import { FinanceHeader } from "@/components/FinanceLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSession";
import { CREDIT_TYPES, TX_LABELS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/account-details")({
  head: () => ({
    meta: [
      { title: "Détails du financement — Dior Parfums" },
      {
        name: "description",
        content: "Consultez vos recharges, retraits et mouvements du compte Dior.",
      },
      { property: "og:title", content: "Détails du financement — Dior Parfums" },
      { property: "og:description", content: "Tous vos mouvements de compte au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDetails,
});

function AccountDetails() {
  const { data: authUser } = useCurrentUser();
  const userId = authUser?.id ?? null;

  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [tab, setTab] = useState("account");
  const visible = txs.filter((t) => tab === "deposit" ? t.type === "deposit" : tab === "withdraw" ? t.type === "withdraw" : t.type !== "deposit" && t.type !== "withdraw");
  return (
    <div className="finance-page bg-muted">
      <FinanceHeader title="Détails du financement" />
      <div role="tablist" aria-label="Mouvements financiers" className="grid h-16 grid-cols-3 bg-gradient-actions text-primary-foreground">
        {[{id:"deposit",label:"Recharger"},{id:"withdraw",label:"Retirer"},{id:"account",label:"Compte"}].map(({id,label}) => <Btn key={id} role="tab" aria-selected={tab === id} variant="outline" onClick={() => setTab(id)} className={`rounded-none bg-transparent text-base normal-case tracking-normal text-primary-foreground shadow-none ring-0 ${tab === id ? "font-bold" : "font-normal opacity-80"}`}>{label}</Btn>)}
      </div>
      <div role="tabpanel" className="min-h-[65vh] bg-muted">
        {visible.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Aucun mouvement</p> : visible.map((t) => <div key={t.id} className="flex min-h-24 items-center justify-between gap-4 bg-card px-8 py-5">
          <div className="min-w-0"><p className={`text-base ${CREDIT_TYPES.includes(t.type) ? "text-success" : "text-foreground"}`}>{TX_LABELS[t.type] ?? t.type}</p><p className="mt-2 text-sm text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</p></div>
          <p className="shrink-0 text-base text-muted-foreground">FCFA {new Intl.NumberFormat("fr-FR").format(Number(t.amount))}</p>
        </div>)}
      </div>
    </div>
  );
}
