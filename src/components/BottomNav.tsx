import { Link } from "@tanstack/react-router";
import { House, ShoppingCart, Users, User } from "lucide-react";

const items = [
  { to: "/app", label: "Collection", icon: House },
  { to: "/app/my-products", label: "Mes parfums", icon: ShoppingCart },
  { to: "/app/team", label: "Mon cercle", icon: Users },
  { to: "/app/me", label: "Mon compte", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-primary-foreground/15 bg-gradient-deep">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/app" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-primary-foreground/65"
              activeProps={{ className: "text-accent" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? "grid size-9 place-items-center text-accent"
                        : "grid size-9 place-items-center"
                    }
                  >
                    <Icon className="size-6" fill={isActive && (to === "/app" || to === "/app/me") ? "currentColor" : "none"} strokeWidth={1.8} />
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
