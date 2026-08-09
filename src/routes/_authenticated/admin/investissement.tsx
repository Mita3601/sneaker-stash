import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Btn, Card, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/investissement")({
  head: () => ({
    meta: [
      { title: "Admin - Investissements — Nike" },
      { name: "description", content: "Voir tous les produits achetés par les utilisateurs." },
    ],
  }),
  component: AdminInvestissement,
});

function AdminInvestissement() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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

  const removeInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Investissement retiré");
      qc.invalidateQueries({ queryKey: ["admin-investissements"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const groupedInvestments = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        phone: string;
        items: typeof purchases;
        totalAmount: number;
        latestPurchase: number;
      }
    >();

    for (const item of purchases) {
      const key = item.user_id;
      if (!map.has(key)) {
        map.set(key, {
          userId: key,
          phone: item.profiles?.phone ?? "Inconnu",
          items: [],
          totalAmount: 0,
          latestPurchase: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(item);
      group.totalAmount += Number(item.products?.price ?? 0);
      const timestamp = new Date(item.purchase_date).getTime();
      group.latestPurchase = Math.max(group.latestPurchase, timestamp);
    }

    const result = Array.from(map.values())
      .map((user) => ({
        ...user,
        items: [...user.items].sort(
          (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime(),
        ),
      }))
      .filter((user) => {
        const haystack = [user.phone, ...user.items.map((item) => item.products?.name ?? "")]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      });

    const direction = sortOrder === "asc" ? 1 : -1;
    return result.sort((a, b) => {
      if (sortKey === "amount") {
        return (a.totalAmount - b.totalAmount) * direction;
      }
      if (sortKey === "status") {
        const statusA = a.items[0]?.status ?? "";
        const statusB = b.items[0]?.status ?? "";
        return statusA.localeCompare(statusB) * direction;
      }
      return (a.latestPurchase - b.latestPurchase) * direction;
    });
  }, [purchases, query, sortKey, sortOrder]);

  return (
    <div>
      <SubHeader title="Investissements" to="/admin" />
      <div className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Card className="p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un utilisateur ou un produit..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Card>
          <Card className="flex flex-wrap items-center justify-end gap-2 p-3">
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as typeof sortKey)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="date">Trier par date</option>
              <option value="amount">Trier par montant</option>
              <option value="status">Trier par statut</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </Card>
        </div>

        {groupedInvestments.length === 0 ? (
          <Card className="text-center">Aucun investissement trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {groupedInvestments.map((user) => (
              <Card key={user.userId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{user.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.items.length} investissement(s) · {fcfa(user.totalAmount)} total
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Dernière date : {shortDate(new Date(user.latestPurchase).toISOString())}</p>
                    <p>Statut principal : {user.items[0]?.status ?? "-"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {user.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border bg-secondary/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.products?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {shortDate(item.purchase_date)} · {item.status}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{fcfa(item.products?.price ?? 0)}</p>
                        </div>
                      </div>
                      <Btn
                        variant="outline"
                        className="mt-2 w-full text-xs"
                        disabled={removeInvestment.isPending}
                        onClick={() => removeInvestment.mutate(item.id)}
                      >
                        Retirer le produit
                      </Btn>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
