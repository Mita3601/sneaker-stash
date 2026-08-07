import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, StatTile, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord admin — NikeStake" },
      { name: "description", content: "Accueil du tableau de bord administrateur." },
      { property: "og:title", content: "Tableau de bord admin — NikeStake" },
      {
        property: "og:description",
        content: "Gestion des utilisateurs, dépôts, retraits et promotions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <SubHeader title="Tableau de bord admin" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Utilisateurs" value={users.length} />
          <StatTile label="Pages" value={7} />
        </div>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Gestion</p>
          <div className="grid gap-2">
            <Link
              to="/admin/users"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Utilisateurs
            </Link>
            <Link
              to="/admin/depots"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Dépôts
            </Link>
            <Link
              to="/admin/retrait"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Retraits
            </Link>
            <Link
              to="/admin/promoteur"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Promoteurs
            </Link>
            <Link
              to="/admin/cadeau"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Cadeaux
            </Link>
            <Link
              to="/admin/parrainages"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Parrainages
            </Link>
            <Link
              to="/admin/investissement"
              className="block rounded-2xl border border-border px-4 py-4 text-sm font-semibold transition hover:bg-secondary/50"
            >
              Investissements
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
