import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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
              const provider = typeof metadata["provider"] === "string" ? metadata["provider"] : "-";
              const accountNumber =
                typeof metadata["account_number"] === "string" ? metadata["account_number"] : "-";
              const accountName =
                typeof metadata["account_name"] === "string" ? metadata["account_name"] : "-";
              const countryCode =
                typeof r.profiles?.country_code === "string" ? r.profiles.country_code : "-";
              const phone = typeof r.profiles?.phone === "string" ? r.profiles.phone : "-";
              const fee = Number(r.fee ?? 0);
              const net = Number(r.net_amount ?? Math.max(0, Number(r.amount ?? 0) - fee));

              return (
                <Card key={r.id} className="space-y-3 p-4 border-l-4 border-l-primary">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-black text-foreground">{fcfa(r.amount)}</p>
                      <p className="text-xs text-muted-foreground">{shortDate(r.created_at)}</p>
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className="grid gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-semibold uppercase text-muted-foreground">
                          ID du retrait
                        </p>
                        <p className="font-mono text-foreground break-all">{r.id}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase text-muted-foreground">Pays</p>
                        <p className="font-medium text-foreground">
                          {getCountryFlag(countryCode)} {countryCode}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-semibold uppercase text-muted-foreground">Mobile</p>
                        <p className="font-medium text-foreground">{phone}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase text-muted-foreground">Opérateur</p>
                        <p className="font-medium text-foreground">{provider}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-semibold uppercase text-muted-foreground">Compte</p>
                        <p className="font-mono text-foreground">{accountNumber}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase text-muted-foreground">
                          Bénéficiaire
                        </p>
                        <p className="font-medium text-foreground">{accountName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Montant demandé</span>
                      <span className="font-semibold">{fcfa(r.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frais (15%)</span>
                      <span className="font-semibold text-red-600">-{fcfa(fee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="font-semibold">Transféré</span>
                      <span className="font-bold text-primary">{fcfa(net)}</span>
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
