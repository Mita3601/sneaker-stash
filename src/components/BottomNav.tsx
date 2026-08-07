import { Link } from "@tanstack/react-router";
import { Home, ShoppingCart, Sparkles, User } from "lucide-react";

const items = [
  { to: "/app", label: "Produit", icon: Home },
  { to: "/app/my-products", label: "Mes produits", icon: ShoppingCart },
  { to: "/app/team", label: "Mon équipe", icon: Sparkles },
  { to: "/app/me", label: "Le mien", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-card/95 backdrop-blur">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/app" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? "grid size-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
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
