import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — NikeStake" },
      {
        name: "description",
        content: "Gestion complète de l'administration de NikeStake.",
      },
      { property: "og:title", content: "Administration — NikeStake" },
      { property: "og:description", content: "Tableau de bord d'administration NikeStake." },
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
