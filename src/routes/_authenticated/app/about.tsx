import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, ShieldCheck, Sparkles } from "lucide-react";

import hero from "@/assets/dior-auth.jpg";
import { Btn, Card, SubHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/app/about")({
  head: () => ({
    meta: [
      { title: "À propos — Dior Parfums" },
      { name: "description", content: "Découvrez l’univers de la plateforme Dior Parfums." },
      { property: "og:title", content: "À propos — Dior Parfums" },
      {
        property: "og:description",
        content: "Une collection de parfums d’exception associée à des revenus quotidiens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const pillars = [
  {
    icon: Gem,
    title: "Une collection d’exception",
    text: "Chaque fragrance représente un niveau de collection avec une durée et un rendement clairement définis.",
  },
  {
    icon: Sparkles,
    title: "Le parfum comme inspiration",
    text: "Notre univers s’inspire du savoir-faire de la haute parfumerie : sélection, rareté et exigence dans chaque détail.",
  },
  {
    icon: ShieldCheck,
    title: "Clarté et confiance",
    text: "Suivez votre portefeuille, vos revenus et vos opérations depuis un espace conçu pour rester simple et lisible.",
  },
];

function About() {
  return (
    <>
      <SubHeader title="À propos" />
      <section className="relative overflow-hidden bg-primary px-6 py-12 text-primary-foreground">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${hero})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,17,29,0.6),rgba(4,17,29,0.85))]" />
        <div className="relative">
          <p className="text-[9px] uppercase tracking-[0.3em] text-accent">La maison</p>
          <h1 className="mt-3 text-5xl font-medium italic">Dior Parfums</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-primary-foreground/70">
            Une expérience de collection inspirée de la haute parfumerie et pensée pour vos revenus
            quotidiens.
          </p>
        </div>
      </section>
      <div className="space-y-4 p-4">
        {pillars.map(({ icon: Icon, title, text }, index) => (
          <Card key={title} className="relative overflow-hidden p-6">
            <span className="absolute right-4 top-2 font-display text-6xl text-secondary">
              0{index + 1}
            </span>
            <Icon className="size-5 text-accent" strokeWidth={1.5} />
            <h2 className="relative mt-5 text-2xl font-medium">{title}</h2>
            <p className="relative mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </Card>
        ))}
        <Card className="bg-gradient-primary p-6 text-primary-foreground">
          <p className="text-[9px] uppercase tracking-[0.25em] text-accent">
            Votre première essence
          </p>
          <h2 className="mt-3 text-3xl font-medium">Commencez votre collection</h2>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
            Explorez les fragrances disponibles et composez progressivement votre portefeuille.
          </p>
        </Card>
        <Link to="/app" className="block">
          <Btn full>Retour à la collection</Btn>
        </Link>
      </div>
    </>
  );
}
