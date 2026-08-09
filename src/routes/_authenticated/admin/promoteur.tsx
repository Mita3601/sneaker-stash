import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, SubHeader, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/promoteur")({
  head: () => ({
    meta: [
      { title: "Admin - Promoteurs — Nike" },
      { name: "description", content: "Gérez les promoteurs et leurs produits." },
    ],
  }),
  component: AdminPromoteur,
});

function AdminPromoteur() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-promoteur-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, phone").order("phone");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-promoteur-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-promoteur-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: userProducts = [] } = useQuery({
    queryKey: ["admin-promoteur-user-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_products")
        .select("id, user_id, product_id, products(name, price), profiles(phone)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const promoters = useMemo(
    () => roles.filter((role) => role.role === "promoter").map((role) => role.user_id),
    [roles],
  );

  const selectedAssigned = userProducts.filter((item) => item.user_id === selectedUser);

  const assignProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_grant_product", {
        _user_id: selectedUser,
        _product_id: selectedProduct,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit attribué");
      qc.invalidateQueries({ queryKey: ["admin-promoteur-user-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const promote = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_set_role", {
        _user_id: userId,
        _role: "promoter",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Utilisateur nommé promoteur");
      qc.invalidateQueries({ queryKey: ["admin-promoteur-roles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit retiré");
      qc.invalidateQueries({ queryKey: ["admin-promoteur-user-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <SubHeader title="Promoteurs" to="/admin" />
      <div className="space-y-4 p-4">
        <Card className="space-y-3">
          <p className="text-sm font-bold">Nommer un promoteur</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Utilisateur">
              <select
                className={inputClass}
                onChange={(event) => setSelectedUser(event.target.value)}
                value={selectedUser}
              >
                <option value="">Sélectionner</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.phone}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <Btn
                className="w-full"
                disabled={!selectedUser || promote.isPending}
                onClick={() => promote.mutate(selectedUser)}
              >
                {promote.isPending ? "En cours..." : "Nommer promoteur"}
              </Btn>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Produits du promoteur</p>
          <Field label="Promoteur">
            <select
              className={inputClass}
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
            >
              <option value="">Sélectionner un promoteur</option>
              {profiles
                .filter((profile) => promoters.includes(profile.id))
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.phone}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Produit à attribuer">
            <select
              className={inputClass}
              value={selectedProduct}
              onChange={(event) => setSelectedProduct(event.target.value)}
            >
              <option value="">Sélectionner un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {Number(product.price).toLocaleString()} FCFA
                </option>
              ))}
            </select>
          </Field>
          <Btn
            className="w-full"
            disabled={!selectedUser || !selectedProduct || assignProduct.isPending}
            onClick={() => assignProduct.mutate()}
          >
            {assignProduct.isPending ? "Attribution..." : "Attribuer le produit"}
          </Btn>
        </Card>

        <div className="space-y-3">
          <p className="text-sm font-bold">Promoteurs existants</p>
          {profiles.filter((profile) => promoters.includes(profile.id)).length === 0 ? (
            <Card className="text-center">Aucun promoteur trouvé.</Card>
          ) : (
            profiles
              .filter((profile) => promoters.includes(profile.id))
              .map((profile) => (
                <Card key={profile.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{profile.phone}</p>
                    <span className="text-xs text-muted-foreground">Promoteur</span>
                  </div>
                  <div className="space-y-2">
                    {selectedAssigned.length > 0 && selectedUser === profile.id ? (
                      selectedAssigned.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold">{item.products?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(item.products?.price ?? 0).toLocaleString()} FCFA
                            </p>
                          </div>
                          <Btn
                            variant="outline"
                            className="text-xs"
                            onClick={() => removeProduct.mutate(item.id)}
                          >
                            Retirer
                          </Btn>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sélectionnez ce promoteur pour voir ses produits.
                      </p>
                    )}
                  </div>
                </Card>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
