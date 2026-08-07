import { createFileRoute, Link } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/app/about")({
  head: () => ({
    meta: [
      { title: "À propos — NikeStake" },
      { name: "description", content: "Présentation rapide de la plateforme NikeStake." },
      { property: "og:title", content: "À propos — NikeStake" },
      {
        property: "og:description",
        content: "Découvrez le fonctionnement de la plateforme et ses points clés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <SubHeader title="À propos" />
      <div className="space-y-3 p-4">
        <Card className="bg-gradient-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <Info className="size-5" />
            </span>
            <div>
              <p className="font-bold">NikeStake</p>
              <p className="text-xs opacity-90">
                Investissement en paires de sneakers, revenus quotidiens et bonus de bienvenue.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-bold">Ce que fait la plateforme</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Achat de paires virtuelles avec rendement quotidien.</li>
            <li>• Bonus de bienvenue à l’inscription.</li>
            <li>• Retraits et gestion des comptes mobile money.</li>
            <li>• Historique des opérations et suivi du compte.</li>
          </ul>
        </Card>

        <Link to="/app" className="block">
          <Btn full>Retour à l’accueil</Btn>
        </Link>
      </div>
    </>
  );
}
