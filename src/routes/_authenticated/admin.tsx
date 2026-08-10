import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    const { data: adminRows, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      throw redirect({ to: "/app" });
    }

    const hasAdmin = (adminRows ?? []).length > 0;
    if (!hasAdmin) {
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Administration — Nike" },
      {
        name: "description",
        content: "Gestion complète de l'administration de Nike.",
      },
      { property: "og:title", content: "Administration — Nike" },
      { property: "og:description", content: "Tableau de bord d'administration Nike." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
      <Outlet />
    </div>
  );
}
