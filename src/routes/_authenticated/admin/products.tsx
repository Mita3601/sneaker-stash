import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase.from("products").update({ price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prix mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEditingId(null);
      setEditingPrice("");
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
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  {editingId === p.id ? (
                    <input
                      className="mt-1 w-40 rounded border border-border bg-background px-2 py-1 text-sm"
                      value={editingPrice}
                      onChange={(e) => setEditingPrice(e.target.value)}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">{fcfa(p.price)}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {p.is_active ? "Actif" : "Gelé"}
                  </span>
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <Btn
                        variant="primary"
                        disabled={updatePrice.isPending}
                        onClick={() => {
                          const val = Number(editingPrice.replace(/[^0-9.-]+/g, ""));
                          if (isNaN(val)) return toast.error("Prix invalide");
                          updatePrice.mutate({ id: p.id, price: Math.round(val) });
                        }}
                      >
                        {updatePrice.isPending ? "En cours..." : "Sauvegarder"}
                      </Btn>
                      <Btn
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditingPrice("");
                        }}
                      >
                        Annuler
                      </Btn>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Btn
                        variant="secondary"
                        onClick={() => {
                          setEditingId(p.id);
                          setEditingPrice(String(p.price ?? ""));
                        }}
                      >
                        Modifier
                      </Btn>
                      <Btn
                        variant={p.is_active ? "danger" : "primary"}
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })}
                      >
                        {toggleActive.isPending ? "En cours..." : p.is_active ? "Geler" : "Activer"}
                      </Btn>
                    </div>
                  )}
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
