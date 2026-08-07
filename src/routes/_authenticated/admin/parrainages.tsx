import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/parrainages")({
  head: () => ({
    meta: [
      { title: "Admin - Parrainages — NikeStake" },
      { name: "description", content: "Voir les filleuls et leurs investissements par niveau." },
    ],
  }),
  component: AdminParrainages,
});

function AdminParrainages() {
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

    return safeProfiles.map((profile) => {
      const level1 = safeProfiles
        .filter((item) => item.referred_by === profile.id)
        .map((item) => item.id);
      const level2 = safeProfiles
        .filter((item) => item.referred_by !== null && level1.includes(item.referred_by))
        .map((item) => item.id);
      const level3 = safeProfiles
        .filter((item) => item.referred_by !== null && level2.includes(item.referred_by))
        .map((item) => item.id);
      const invested = safePurchases.filter((purchase) =>
        [profile.id, ...level1, ...level2, ...level3].includes(purchase.user_id),
      ).length;
      return {
        id: profile.id,
        phone: profile.phone,
        level1: level1.length,
        level2: level2.length,
        level3: level3.length,
        invested,
      };
    });
  }, [profiles, purchases]);

  return (
    <div>
      <SubHeader title="Parrainages" to="/admin" />
      <div className="space-y-4 p-4">
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
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-2xl bg-secondary/70 p-2 text-center">
                    Niveau 1 : {item.level1}
                  </div>
                  <div className="rounded-2xl bg-secondary/70 p-2 text-center">
                    Niveau 2 : {item.level2}
                  </div>
                  <div className="rounded-2xl bg-secondary/70 p-2 text-center">
                    Niveau 3 : {item.level3}
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
