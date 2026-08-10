import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, SubHeader, inputClass, StatusPill } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin - Utilisateurs — Nike" },
      { name: "description", content: "Gérez les utilisateurs de la plateforme." },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, balance, is_frozen, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const adjustBalance = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_adjust_balance", {
        _user_id: userId,
        _amount: amount,
        _reason: "Ajustement administrateur",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solde mis à jour");
      setAmount(0);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleFreeze = useMutation({
    mutationFn: async ({ userId, freeze }: { userId: string; freeze: boolean }) => {
      const { error } = await supabase.rpc("admin_toggle_freeze", {
        _user_id: userId,
        _frozen: freeze,
        _reason: freeze ? "Gelé par l'administration" : "Dégelé par l'administration",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut du compte mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const grantAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_set_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte promu administrateur");
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const profileRoles = roles.reduce<Record<string, string>>((acc, item) => {
    if (item.user_id) acc[item.user_id] = item.role;
    return acc;
  }, {});

  const filteredProfiles = profiles.filter((profile) =>
    profile.phone.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div>
      <SubHeader title="Utilisateurs" to="/admin" />
      <div className="space-y-4 p-4">
        <Card className="p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total utilisateurs</p>
              <p className="mt-1 text-2xl font-black">{profiles.length}</p>
            </div>
            <Link to="/admin" className="text-sm font-semibold text-primary">
              Retour
            </Link>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-bold">Modifier le solde</p>
            <p className="text-xs text-muted-foreground">
              Sélectionnez un utilisateur, saisissez un montant et validez.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Utilisateur">
              <select
                className={inputClass}
                value={selected ?? ""}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Choisir un utilisateur</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.phone}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Montant à ajouter (FCFA)">
              <input
                type="number"
                className={inputClass}
                value={amount === 0 ? "" : amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </Field>
          </div>
          <Btn
            className="w-full"
            disabled={!selected || amount === 0 || adjustBalance.isPending}
            onClick={() => adjustBalance.mutate(selected!)}
          >
            {adjustBalance.isPending ? "En cours..." : "Mettre à jour le solde"}
          </Btn>
        </Card>

        <div className="space-y-2">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{profile.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Role : {profileRoles[profile.id] ?? "user"}
                  </p>
                </div>
                <StatusPill status={profile.is_frozen ? "rejected" : "approved"} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Solde</p>
                  <p className="font-semibold">{Number(profile.balance).toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Créé</p>
                  <p className="font-semibold">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Btn
                  variant={profile.is_frozen ? "success" : "danger"}
                  className="w-full"
                  disabled={toggleFreeze.isPending}
                  onClick={() =>
                    toggleFreeze.mutate({ userId: profile.id, freeze: !profile.is_frozen })
                  }
                >
                  {profile.is_frozen ? "Dégeler le compte" : "Geler le compte"}
                </Btn>
                <Btn
                  variant={profileRoles[profile.id] === "admin" ? "success" : "outline"}
                  className="w-full"
                  disabled={grantAdmin.isPending || profileRoles[profile.id] === "admin"}
                  onClick={() => grantAdmin.mutate(profile.id)}
                >
                  {profileRoles[profile.id] === "admin" ? "Compte admin" : "Nommer admin"}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
