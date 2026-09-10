import { Link } from "@tanstack/react-router";
import { House, PackageOpen, Users, User } from "lucide-react";

const items = [
  { to: "/app", label: "Collection", icon: House },
  { to: "/app/my-products", label: "Mes parfums", icon: PackageOpen },
  { to: "/app/team", label: "Mon cercle", icon: Users },
  { to: "/app/me", label: "Mon compte", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/app" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-muted-foreground"
              activeProps={{ className: "text-accent-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? "grid size-9 place-items-center rounded-sm bg-primary text-primary-foreground shadow-glow"
                        : "grid size-9 place-items-center"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
