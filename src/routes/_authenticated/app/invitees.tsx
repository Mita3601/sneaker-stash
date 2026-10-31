import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, UserRound } from "lucide-react";
import { Btn } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { TEAM_LEVELS, teamQueryOptions } from "@/lib/team";

export const Route = createFileRoute("/_authenticated/app/invitees")({
  head: () => ({ meta: [
    { title: "Mes invités — Dior Parfums" },
    { name: "description", content: "Les filleuls de votre équipe Dior, regroupés sur trois niveaux de parrainage." },
    { property: "og:title", content: "Mes invités — Dior Parfums" },
    { property: "og:description", content: "Consultez vos invités et leurs achats par niveau de parrainage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Invitees,
});

function maskedNumber(phone: string) {
  const local = phone.replace(/^\+(225|226|229|237)/, "").replace(/\D/g, "");
  return local.length > 5 ? `${local.slice(0, 2)}****${local.slice(-3)}` : "*****";
}

function Invitees() {
  const { data: profile } = useProfile();
  const { data: levels = [[], [], []], isLoading, error, refetch } = useQuery(teamQueryOptions(profile?.id));
  const [expanded, setExpanded] = useState<number[]>([1]);
  return <div className="min-h-screen bg-card">
    <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border px-3 py-4">
      <Link to="/app/team" aria-label="Retour à mon équipe" className="p-1 text-primary"><ChevronLeft className="size-5" /></Link>
      <h1 className="font-sans text-lg font-bold">Mes invités</h1>
    </header>
    {error ? <div className="space-y-3 p-4"><p role="alert" className="text-sm text-destructive">Impossible de charger vos invités.</p><Btn onClick={() => refetch()}>Réessayer</Btn></div> : TEAM_LEVELS.map(({ level }, index) => {
      const open = expanded.includes(level);
      const members = levels[index] ?? [];
      return <section key={level}>
        <Btn variant="ghost" aria-expanded={open} aria-controls={`invitees-level-${level}`} onClick={() => setExpanded((current) => open ? current.filter((value) => value !== level) : [...current, level])} className="w-full justify-between rounded-none border-b border-border px-4 py-3 text-sm font-semibold normal-case tracking-normal">
          <span>Niveau {level} <span className="ml-2 font-normal text-muted-foreground">({isLoading ? "…" : members.length})</span></span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Btn>
        {open ? <div id={`invitees-level-${level}`}>
          {isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Chargement…</p> : members.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Aucun invité de niveau {level}</p> : members.map((member) => <article key={member.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-4 py-3.5">
            <UserRound aria-hidden="true" className="size-7 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{maskedNumber(member.phone)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(member.created_at).toLocaleString("en-US")}</p>
            </div>
            <p className="self-start text-base font-bold">{Number(member.firstPurchasePrice ?? 0).toLocaleString("en-US")}</p>
          </article>)}
        </div> : null}
      </section>;
    })}
  </div>;
}