import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
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
