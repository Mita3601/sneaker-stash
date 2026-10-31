import { Link } from "@tanstack/react-router";

const actions = [
  { to: "/app/recharge", label: "Recharger", icon: "deposit" },
  { to: "/app/withdraw", label: "Retirer", icon: "wallet" },
  { to: "/app/support", label: "Conciergerie", icon: "people" },
] as const;

function ActionIcon({ kind }: { kind: (typeof actions)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-6 shrink-0 text-action-icon" fill="currentColor">
      {kind === "deposit" ? <>
        <path d="M4 5h24a2 2 0 0 1 2 2v4H2V7a2 2 0 0 1 2-2ZM2 15h28v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
        <path d="m7 22 4-4 4 4m-4-4v8" fill="none" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </> : kind === "wallet" ? <>
        <path d="m8 6 13-4a3 3 0 0 1 4 3l1 3H8ZM4 9h24a2 2 0 0 1 2 2v5H20a5 5 0 0 0 0 10h10v3H4a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" />
        <path d="M20 18h11v6H20a3 3 0 0 1 0-6Z" /><circle cx="21" cy="21" r="1" fill="var(--primary-deep)" />
      </> : <>
        <circle cx="12" cy="9" r="7" /><path d="M1 29c0-8 4-13 11-13s11 5 11 13ZM22 2a7 7 0 0 1 0 14c5 2 9 6 9 13h-5c0-7-3-11-6-13a9 9 0 0 0 2-14Z" />
      </>}
    </svg>
  );
}

export function HomeActions() {
  return <section className="grid grid-cols-3 gap-1.5 px-5 py-2">
    {actions.map(({ to, label, icon }) => <Link key={to} to={to} className="flex aspect-[1.68] min-w-0 flex-col items-center justify-center gap-2 rounded-md bg-gradient-actions px-1 text-primary-foreground transition hover:opacity-90">
      <ActionIcon kind={icon} />
      <span className="text-[11px] font-bold leading-4">{label}</span>
    </Link>)}
  </section>;
}