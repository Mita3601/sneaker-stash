import { createFileRoute, Outlet } from "@tanstack/react-router";

import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
