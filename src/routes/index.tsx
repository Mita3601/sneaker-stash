import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import hero from "@/assets/dior-hero.jpg";
import fragranceCollection from "@/assets/dior-auth.jpg";
import { Btn } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Dior Parfums — L’élégance qui fructifie" },
      {
        name: "description",
        content:
          "Découvrez une collection de parfums Dior et percevez des revenus quotidiens. Bonus de bienvenue de 1 500 FCFA.",
      },
      { property: "og:title", content: "Dior Parfums — L’élégance qui fructifie" },
      {
        property: "og:description",
        content: "Une collection de parfums d’exception associée à des revenus quotidiens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const benefits = [
  {
    icon: TrendingUp,
    title: "Revenus quotidiens",
    text: "Votre sélection génère des revenus toutes les 24 heures.",
  },
  {
    icon: Sparkles,
    title: "Cercle privé",
    text: "Invitez vos proches et recevez des commissions sur trois niveaux.",
  },
  {
    icon: ShieldCheck,
    title: "Retraits 24/7",
    text: "Retirez dès 1 000 FCFA avec un suivi clair de chaque opération.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-primary py-0 text-foreground sm:py-8">
      <div className="mx-auto max-w-[430px] overflow-hidden bg-background shadow-[0_30px_100px_color-mix(in_oklab,var(--primary-deep)_55%,transparent)]">
        <section className="relative min-h-[650px] overflow-hidden">
          <img
            src={hero}
            alt="Flacon de parfum dans une mise en scène nocturne et dorée"
            width={1024}
            height={1536}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary-deep)_30%,transparent)_0%,transparent_40%,var(--background)_100%)]" />
          <div className="absolute inset-x-0 top-10 text-center text-primary-foreground">
            <p className="font-display text-5xl font-medium">DIOR</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.32em] text-primary-foreground/70">
              Parfums · Collection privée
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-10 px-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-accent-foreground/70">
              L’art de la matière
            </p>
            <h1 className="mt-4 text-5xl font-medium italic leading-[0.9]">
              L’élégance
              <br />
              <span className="pl-10 text-4xl text-accent-foreground">qui fructifie</span>
            </h1>
            <p className="mt-6 max-w-[290px] text-sm leading-6 text-muted-foreground">
              Sélectionnez un parfum d’exception, percevez un revenu quotidien et retirez quand
              vous le souhaitez.
            </p>
          </div>
        </section>

        <section className="bg-card px-6 py-16">
          <div className="relative min-h-[390px]">
            <img
              src={fragranceCollection}
              alt="Collection de flacons de parfums précieux"
              loading="lazy"
              width={1536}
              height={1024}
              className="ml-auto aspect-[3/4] w-3/4 object-cover"
            />
            <div className="absolute left-0 top-16 w-[72%] bg-card p-6 shadow-card ring-1 ring-border">
              <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
                La collection privée
              </p>
              <h2 className="mt-3 text-4xl font-medium leading-none">Une essence, un rendement</h2>
              <div className="my-5 h-px w-12 bg-accent" />
              <p className="text-xs leading-5 text-muted-foreground">
                Chaque niveau révèle une fragrance, une durée et un revenu soigneusement définis.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-background px-6 py-14">
          <p className="text-center text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            Les privilèges de la maison
          </p>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {benefits.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="grid grid-cols-[2rem_1fr] gap-4 py-6">
                <span className="font-display text-2xl text-accent">0{index + 1}</span>
                <div>
                  <Icon className="mb-3 size-4 text-accent" strokeWidth={1.5} />
                  <h2 className="text-2xl font-medium">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-primary px-7 py-14 text-center text-primary-foreground">
          <p className="text-[9px] uppercase tracking-[0.28em] text-primary-foreground/60">
            Votre collection commence ici
          </p>
          <h2 className="mt-4 text-4xl font-medium italic">Entrez dans la maison</h2>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-5 text-primary-foreground/70">
            1 500 FCFA offerts à l’inscription pour découvrir votre première fragrance.
          </p>
          <div className="mt-8 space-y-3">
            <Link to="/auth/register" className="block">
              <Btn full className="bg-accent text-accent-foreground hover:bg-accent/90">
                Créer mon compte <ArrowRight className="size-4" />
              </Btn>
            </Link>
            <Link to="/auth/login" className="block">
              <Btn variant="outline" full className="border-primary-foreground/30 bg-transparent text-primary-foreground ring-primary-foreground/25">
                J’ai déjà un compte
              </Btn>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}