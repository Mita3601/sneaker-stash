import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, TrendingUp, Users } from "lucide-react";

import hero from "@/assets/hero-banner.jpg";
import { Btn, Card } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "NikeStake — Staking de sneakers, revenus quotidiens" },
      {
        name: "description",
        content:
          "Investissez dans des paires de sneakers et percevez des revenus quotidiens. Bonus de bienvenue de 1 500 FCFA et commissions de parrainage sur 3 niveaux.",
      },
      { property: "og:title", content: "NikeStake — Revenus quotidiens en sneakers" },
      {
        property: "og:description",
        content:
          "Plateforme de staking sneakers : revenus quotidiens, retraits 24/7 et parrainage sur 3 niveaux.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="mx-auto min-h-screen max-w-[430px] bg-background">
      <section className="relative">
        <img
          src={hero}
          alt="Sneakers premium sur fond bleu électrique"
          width={1088}
          height={608}
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-deep/40" />
      </section>

      <div className="space-y-5 p-5">
        <h1 className="text-3xl font-extrabold leading-tight">
          Faites travailler vos <span className="text-gradient-primary">sneakers</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Achetez une paire, percevez un revenu chaque jour et retirez quand vous voulez.
          1 500 FCFA offerts à l&apos;inscription.
        </p>

        <div className="grid gap-3">
          {[
            { icon: TrendingUp, t: "Revenus quotidiens", d: "Réclamez vos gains toutes les 24 h." },
            { icon: Users, t: "Parrainage 3 niveaux", d: "27 % / 2 % / 1 % de commission." },
            { icon: ShieldCheck, t: "Retraits 24/7", d: "Dès 1 000 FCFA, frais de 15 %." },
          ].map(({ icon: Icon, t, d }) => (
            <Card key={t} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">{t}</span>
                <span className="block text-xs text-muted-foreground">{d}</span>
              </span>
            </Card>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <Link to="/auth/register" className="block">
            <Btn full>
              Créer mon compte <ArrowRight className="size-4" />
            </Btn>
          </Link>
          <Link to="/auth/login" className="block">
            <Btn variant="outline" full>
              J&apos;ai déjà un compte
            </Btn>
          </Link>
        </div>
      </div>
    </main>
  );
}
