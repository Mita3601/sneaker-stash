import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Admin - Produits — Nike" },
      { name: "description", content: "Gérez la visibilité des produits disponibles." },
    ],
  }),
  component: AdminProducts,
});

function AdminProducts() {
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, is_active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("État du produit mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <SubHeader title="Produits" to="/admin" />
      <div className="space-y-4 p-4">
        {products.length === 0 ? (
          <Card className="text-center">Aucun produit trouvé.</Card>
        ) : (
          <div className="space-y-3">
            {products.map((p: any) => (
              <Card key={p.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{fcfa(p.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {p.is_active ? "Actif" : "Gelé"}
                  </span>
                  <Btn
                    variant={p.is_active ? "destructive" : "primary"}
                    disabled={toggleActive.isPending}
                    onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })}
                  >
                    {toggleActive.isPending ? "En cours..." : p.is_active ? "Geler" : "Activer"}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProducts;
