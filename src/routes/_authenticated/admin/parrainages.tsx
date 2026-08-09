import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/parrainages")({
  head: () => ({
    meta: [
      { title: "Admin - Parrainages — Nike" },
      { name: "description", content: "Voir les filleuls et leurs investissements par niveau." },
    ],
  }),
  component: AdminParrainages,
});

function AdminParrainages() {
  const [query, setQuery] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-parrainages-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, referred_by, balance");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["admin-parrainages-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_products")
        .select("user_id, product_id, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const referrals = useMemo(() => {
    const safeProfiles =
      (profiles as Array<{
        id: string;
        phone: string;
        referred_by: string | null;
        balance: number;
      }>) ?? [];
    const safePurchases = (purchases as Array<{ user_id: string }>) ?? [];

    return safeProfiles
      .map((profile) => {
        const level1 = safeProfiles
          .filter((item) => item.referred_by === profile.id)
          .map((item) => item.phone);
        const level2 = safeProfiles
          .filter(
            (item) =>
              item.referred_by !== null &&
              level1.length > 0 &&
              safeProfiles.some(
                (ref) => ref.id === item.referred_by && ref.referred_by === profile.id,
              ),
          )
          .map((item) => item.phone);
        const level3 = safeProfiles
          .filter(
            (item) =>
              item.referred_by !== null &&
              safeProfiles.some((ref) => ref.id === item.referred_by && level2.includes(ref.phone)),
          )
          .map((item) => item.phone);
        const invested = safePurchases.filter((purchase) =>
          [
            profile.id,
            ...safeProfiles
              .filter((item) => item.referred_by === profile.id)
              .map((item) => item.id),
            ...safeProfiles
              .filter(
                (item) =>
                  item.referred_by !== null &&
                  safeProfiles.some(
                    (ref) => ref.id === item.referred_by && ref.referred_by === profile.id,
                  ),
              )
              .map((item) => item.id),
            ...safeProfiles
              .filter(
                (item) =>
                  item.referred_by !== null &&
                  safeProfiles.some(
                    (ref) => ref.id === item.referred_by && level2.includes(ref.phone),
                  ),
              )
              .map((item) => item.id),
          ].includes(purchase.user_id),
        ).length;

        return {
          id: profile.id,
          phone: profile.phone,
          level1,
          level2,
          level3,
          invested,
        };
      })
      .filter((item) => {
        const haystack = [item.phone, ...item.level1, ...item.level2, ...item.level3]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      });
  }, [profiles, purchases, query]);

  return (
    <div>
      <SubHeader title="Parrainages" to="/admin" />
      <div className="space-y-4 p-4">
        <Card className="p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un parrain ou un filleul..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Card>

        {referrals.length === 0 ? (
          <Card className="text-center">Aucun parrainage trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {referrals.map((item) => (
              <Card key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.phone}</p>
                  <span className="text-xs text-muted-foreground">
                    Investissements : {item.invested}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="rounded-2xl bg-secondary/70 p-2">
                    <span className="font-semibold text-foreground">
                      A{`{`}lvl1:{item.level1.length ? item.level1.join(", ") : "0"}; lvl2:
                      {item.level2.length ? item.level2.join(", ") : "0"}; lvl3:
                      {item.level3.length ? item.level3.join(", ") : "0"}
                      {`}`}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
