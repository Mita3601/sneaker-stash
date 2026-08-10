import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Card, Empty, StatusPill, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSession";
import { fcfa, shortDate, COUNTRIES } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/withdraw-history")({
  head: () => ({
    meta: [
      { title: "Registres de retrait — Nike" },
      {
        name: "description",
        content: "Historique de vos demandes de retrait, frais et montants nets.",
      },
      { property: "og:title", content: "Registres de retrait — Nike" },
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

  const { data: rows = [] } = useQuery({
    queryKey: ["transactions", "withdrawal", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles(phone, country_code)")
        .eq("type", "withdraw")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const getCountryFlag = (code: string) => {
    return COUNTRIES.find((c) => c.code === code)?.flag ?? "🌍";
  };

  const getStatusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="size-5 text-green-500" />;
    if (status === "rejected") return <XCircle className="size-5 text-red-500" />;
    return <Clock className="size-5 text-yellow-500" />;
  };

  return (
    <>
      <SubHeader title="Registres de retrait" />
      <div className="p-4">
        {rows.length === 0 ? (
          <Empty title="Pas encore de données" text="Vos retraits apparaîtront ici." />
        ) : (
          <div className="space-y-4">
            {rows.map((r) => {
              const metadata = (r.metadata as Record<string, unknown> | null) ?? {};
              const provider = typeof metadata.provider === "string" ? metadata.provider : "-";
              const accountNumber =
                typeof metadata.account_number === "string" ? metadata.account_number : "-";
              const accountName =
                typeof metadata.account_name === "string" ? metadata.account_name : "-";
              const countryCode =
                typeof r.profiles?.country_code === "string" ? r.profiles.country_code : "-";
              const phone = typeof r.profiles?.phone === "string" ? r.profiles.phone : "-";
              const fee = Number(r.fee ?? 0);
              const net = Number(r.net_amount ?? Math.max(0, Number(r.amount ?? 0) - fee));

              return (
                <Card key={r.id} className="space-y-4 p-5 border-l-4 border-l-primary">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-2xl font-black text-foreground">{fcfa(r.amount)}</p>
                        <div>{getStatusIcon(r.status)}</div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {shortDate(r.created_at)}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          ID du retrait
                        </p>
                        <p className="font-mono text-xs text-foreground">{r.id.slice(0, 12)}...</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          Pays
                        </p>
                        <p className="font-medium text-foreground">
                          {getCountryFlag(countryCode)} {countryCode}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          Mobile du client
                        </p>
                        <p className="font-medium text-foreground">{phone}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          Opérateur
                        </p>
                        <p className="font-medium text-foreground">{provider}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        Compte destinataire
                      </p>
                      <p className="font-mono font-medium text-foreground">{accountNumber}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        Bénéficiaire
                      </p>
                      <p className="font-medium text-foreground">{accountName}</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Montant demandé</span>
                      <span className="font-semibold">{fcfa(r.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frais de transfert (15%)</span>
                      <span className="font-semibold text-red-600">-{fcfa(fee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base border-t border-border pt-2">
                      <span className="font-semibold">Montant transféré</span>
                      <span className="font-black text-lg text-primary">{fcfa(net)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
