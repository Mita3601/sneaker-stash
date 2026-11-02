import { Link } from "@tanstack/react-router";

const HOME_PATH =
  "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z";
const CART_PATH =
  "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.67h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zM17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z";
const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const PERSON_PATH =
  "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={STAR_PATH} transform="translate(4.8 0.6) scale(0.6)" />
      <path d={STAR_PATH} transform="translate(1.2 11.4) scale(0.42)" />
      <path d={STAR_PATH} transform="translate(14.4 11.4) scale(0.42)" />
    </svg>
  );
}

const items = [
  { to: "/app", label: "Maison", path: HOME_PATH },
  { to: "/app/my-products", label: "Projet", path: CART_PATH },
  { to: "/app/team", label: "Équipe", icon: TeamIcon },
  { to: "/app/me", label: "Le mien", path: PERSON_PATH },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-primary-foreground/15 bg-gradient-deep">
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/app" }}
              className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-primary-foreground/60"
              activeProps={{ className: "text-accent" }}
            >
              {({ isActive }) => (
                <>
                  <span className="grid size-9 place-items-center">
                    {"icon" in item && item.icon ? (
                      <item.icon className="size-7" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
                        <path d={item.path} />
                      </svg>
                    )}
                  </span>
                  {item.label}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
