import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Btn } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { TEAM_LEVELS, teamQueryOptions } from "@/lib/team";

export const Route = createFileRoute("/_authenticated/app/invitees")({
  head: () => ({
    meta: [
      { title: "Mes invités — Dior Parfums" },
      {
        name: "description",
        content: "Les filleuls de votre équipe Dior, regroupés sur trois niveaux de parrainage.",
      },
      { property: "og:title", content: "Mes invités — Dior Parfums" },
      {
        property: "og:description",
        content: "Consultez vos invités et leurs achats par niveau de parrainage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invitees,
});

function maskedNumber(phone: string) {
  const local = phone.replace(/^\+(225|226|229|237)/, "").replace(/\D/g, "");
  return local.length > 5 ? `${local.slice(0, 2)}****${local.slice(-3)}` : "*****";
}

function Invitees() {
  const { data: profile } = useProfile();
  const {
    data: levels = [[], [], []],
    isLoading,
    error,
    refetch,
  } = useQuery(teamQueryOptions(profile?.id));
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const activeMembers = levels[activeLevel - 1] ?? [];

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-black/5 bg-[#f5f1ea] px-3 py-4">
        <Link to="/app/team" aria-label="Retour à mon équipe" className="p-1 text-[#1f1f1f]">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-sans text-[21px] font-bold text-[#1f1f1f]">Mes invités</h1>
      </header>

      {error ? (
        <div className="space-y-3 p-4">
          <p role="alert" className="text-sm text-destructive">
            Impossible de charger vos invités.
          </p>
          <Btn onClick={() => refetch()}>Réessayer</Btn>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Niveaux de parrainage"
            className="grid h-14 grid-cols-3 border-b border-black/5 bg-[#e5dfd8] text-[#1f1f1f]"
          >
            {TEAM_LEVELS.map(({ level }) => {
              const selected = activeLevel === level;
              const levelMembers = levels[level - 1] ?? [];

              return (
                <button
                  key={level}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveLevel(level)}
                  className={`flex items-center justify-center text-base font-bold transition-colors ${
                    selected ? "bg-[#e5dfd8] text-[#1f1f1f]" : "bg-[#f5f1ea] text-[#3a3a3a]"
                  }`}
                >
                  Niveau {level} ({isLoading ? "…" : levelMembers.length})
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="bg-[#f5f1ea]">
            {isLoading ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">Chargement…</p>
            ) : activeMembers.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                Aucun invité de niveau {activeLevel}
              </p>
            ) : (
              activeMembers.map((member) => (
                <article
                  key={member.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/5 px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-bold tracking-[-0.02em] text-[#1f1f1f]">
                      {maskedNumber(member.phone)}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {new Date(member.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <p className="self-start text-[18px] font-bold text-[#1f1f1f]">
                    {Number(member.firstPurchasePrice ?? 0).toLocaleString("fr-FR")}
                  </p>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
