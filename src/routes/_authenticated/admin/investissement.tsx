import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/investissement")({
  head: () => ({
    meta: [
      { title: "Admin - Investissements — NikeStake" },
      { name: "description", content: "Voir tous les produits achetés par les utilisateurs." },
    ],
  }),
  component: AdminInvestissement,
});

function AdminInvestissement() {
  const { data: purchases = [] } = useQuery({
    queryKey: ["admin-investissements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_products")
        .select("id, user_id, purchase_date, status, products(name, price), profiles(phone)")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <SubHeader title="Investissements" to="/admin" />
      <div className="space-y-4 p-4">
        {purchases.length === 0 ? (
          <Card className="text-center">Aucun investissement trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {purchases.map((item) => (
              <Card key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.products?.name}</p>
                    <p className="text-xs text-muted-foreground">{item.profiles?.phone}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{shortDate(item.purchase_date)}</p>
                    <p>{item.status}</p>
                  </div>
                </div>
                <p className="text-sm">Prix : {fcfa(item.products?.price ?? 0)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
