import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Btn } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";
import { TEAM_LEVELS, teamQueryOptions } from "@/lib/team";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({
    meta: [
      { title: "Mon cercle — Dior" },
      {
        name: "description",
        content: "Partagez votre code de parrainage et gagnez 27 %, 2 % et 1 % sur 3 niveaux.",
      },
      { property: "og:title", content: "Mon cercle — Dior" },
      {
        property: "og:description",
        content: "Commissions instantanées sur 3 niveaux de parrainage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Team,
});

function Team() {
  const { data: profile } = useProfile();
  const { data: team, isLoading: teamLoading, error: teamError } = useQuery(teamQueryOptions(profile?.id));
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const { data: commissionByLevel = [0, 0, 0] } = useQuery({
    queryKey: ["commissions-by-level", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const userId = profile?.id;
      if (!userId) return [0, 0, 0];
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, description")
        .eq("type", "commission")
        .eq("status", "approved")
        .eq("user_id", userId);
      if (error) throw error;
      const totals = [0, 0, 0];
      (data ?? []).forEach((t) => {
        const m = /niveau\s*([123])/i.exec(String(t.description ?? ""));
        const idx = m ? Number(m[1]) - 1 : 0;
        totals[idx] = (totals[idx] ?? 0) + Number(t.amount ?? 0);
      });
      return totals;
    },
  });
  const commissions = commissionByLevel.reduce((a, b) => a + b, 0);

  const referralCode = profile?.referral_code?.trim();
  const link = origin ? `${origin}/auth/register${referralCode ? `?ref=${referralCode}` : ""}` : "";

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Impossible de copier pour le moment");
    }
  }

  const valid = (team ?? [[], [], []]).map(
    (list) => list.filter((m) => m.firstPurchasePrice != null).length,
  );
  const validTotal = valid.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-full space-y-3 bg-secondary px-1 py-2">
      <section className="space-y-2 rounded-md bg-card p-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-foreground">
              {profile?.referral_code ?? "—"}
            </p>
            <p className="text-sm text-primary">Code d&apos;invitation</p>
          </div>
          <Btn className="min-h-7 w-28 shrink-0 rounded-md py-1.5 text-xs font-medium normal-case tracking-normal" onClick={() => copy(profile?.referral_code ?? "", "Code")}>
            Copie
          </Btn>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border-2 border-primary p-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{link}</p>
            <p className="mt-1 text-sm text-primary">Lien d&apos;invitation</p>
          </div>
          <Btn className="min-h-7 w-28 shrink-0 rounded-md py-1.5 text-xs font-medium normal-case tracking-normal" onClick={() => copy(link, "Lien")}>
            Copie
          </Btn>
        </div>
      </section>

      <section className="overflow-hidden border border-border bg-gradient-actions text-primary-foreground">
        <div className="grid grid-cols-[1.65fr_1.1fr_0.6fr] gap-1 border-b border-primary-foreground/30 px-1 py-2.5 text-[11px] sm:text-xs">
          <span className="text-center">Taux de commission</span>
          <span className="text-center">Utilisateurs valides</span>
          <span className="text-center">Revenu</span>
        </div>
        {TEAM_LEVELS.map((l, i) => (
          <div
            key={l.level}
            className="grid grid-cols-[1.65fr_1.1fr_0.6fr] gap-1 border-b border-primary-foreground/30 px-1 py-2.5 text-[11px] last:border-b-0 sm:text-xs"
          >
            <span className="text-center">
              Équipe de niveau {l.level} : {l.rate}
            </span>
            <span className="text-center">{teamLoading ? "…" : valid[i]}</span>
            <span className="text-center">{Math.round(commissionByLevel[i] ?? 0).toLocaleString("en-US")}</span>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link to="/app/invitees" aria-label="Voir les utilisateurs valides et les invités" className="relative flex min-h-14 flex-col justify-center rounded-md bg-gradient-team-stat px-5 py-2 text-center text-primary-foreground hover:opacity-90">
          <p className="text-sm">{teamLoading ? "…" : validTotal}</p>
          <p className="text-xs">Utilisateurs valides</p>
          <ChevronRight className="absolute right-1 top-1/2 size-4 -translate-y-1/2" />
        </Link>
        <div className="flex min-h-14 flex-col justify-center rounded-md bg-gradient-team-stat px-1 py-2 text-center text-primary-foreground">
          <p className="text-sm">{fcfa(commissions)}</p>
          <p className="text-xs">Récompenses de parrainage</p>
        </div>
      </section>

      <section className="space-y-3 rounded-md bg-gradient-team-stat p-3 text-xs leading-[1.35] text-primary-foreground/85">
        <h2 className="border-l-4 border-primary-foreground pl-2 font-sans text-base text-primary-foreground">
          Bonus d&apos;invitation
        </h2>
        <p>
          Lorsqu&apos;un ami que vous avez invité s&apos;inscrit et effectue un investissement, vous
          recevez immédiatement une récompense en espèces équivalente à 27 % du montant de son
          investissement.
        </p>
        <p>
          Lorsque des membres de votre équipe de niveau 2 investissent, vous percevez une prime en
          espèces de 2 %.
        </p>
        <p>
          Lorsque des membres de votre équipe de niveau 3 investissent, vous percevez une prime en
          espèces de 1 %.
        </p>
        <p>
          Dès qu&apos;un membre de votre équipe effectue un investissement, la prime en espèces est
          instantanément créditée sur votre compte et vous pouvez la retirer immédiatement.
        </p>
      </section>

      {teamError ? <p role="alert" className="px-2 text-sm text-destructive">Impossible de charger votre équipe. Veuillez réessayer.</p> : null}
    </div>
  );
}
