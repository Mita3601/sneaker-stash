import { createFileRoute, Link } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/app/about")({
  head: () => ({
    meta: [
      { title: "À propos — Nike" },
      { name: "description", content: "Présentation rapide de la plateforme Nike." },
      { property: "og:title", content: "À propos — Nike" },
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
              <p className="font-bold">Nike</p>
              <p className="text-xs opacity-90">
                Investissement en paires de sneakers, revenus quotidiens et bonus de bienvenue.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Investir dans les sneakers : une stratégie d'avenir</p>
          <p className="text-sm text-muted-foreground">
            Nike offre une nouvelle façon de générer des rendements stables grâce à des
            investissements en paires de sneakers premium. Que vous soyez collectionneur passionné,
            investisseur avisé ou simplement intéressé par les actifs alternatifs, notre plateforme
            vous permet de capitaliser sur la croissance du marché des baskets rares et exclusives.
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Pourquoi les sneakers ?</p>
          <p className="text-sm text-muted-foreground">
            Le marché des sneakers a explosé ces dernières années. Les collections limitées, les
            collaborations prestigieuses et les éditions exclusives Nike ne cessent de prendre de la
            valeur. Notre expertise réside dans la sélection rigoureuse des modèles les plus
            prometteurs, offrant à nos utilisateurs des opportunités d'investissement authentiques
            et lucratives.
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Une plateforme fiable et innovante</p>
          <p className="text-sm text-muted-foreground">
            Sécurité, transparence et facilité d'utilisation sont les piliers de notre écosystème.
            Chaque transaction est protégée par les normes de sécurité les plus strictes du secteur.
            Notre infrastructure cloud propriétaire vous permet de suivre vos investissements en
            temps réel, analyser l'évolution de vos rendements, gérer un portefeuille diversifié de
            sneakers et accéder à des opportunités exclusives. Nous prenons en charge tous les modes
            de paiement populaires et garantissons des retraits rapides et sécurisés.
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Croissance mondiale et innovation</p>
          <p className="text-sm text-muted-foreground">
            Face à la demande croissante des investisseurs alternatifs en Europe, Afrique et
            au-delà, Nike intensifie son expansion internationale. Nous ne cessons d'innover pour
            vous offrir de nouveaux produits, des rendements améliorés et des services premium.
          </p>
        </Card>

        <Card className="space-y-3 bg-gradient-primary text-primary-foreground">
          <p className="text-sm font-bold">Commencez dès aujourd'hui</p>
          <p className="text-sm">
            Rejoignez des milliers d'investisseurs qui font croître leur patrimoine avec Nike.
            Accédez à des rendements quotidiens, profitez de nos bonus de bienvenue attractifs et
            construisez progressivement votre portefeuille de sneakers d'exception.
          </p>
        </Card>

        <Link to="/app" className="block">
          <Btn full>Retour à l’accueil</Btn>
        </Link>
      </div>
    </>
  );
}
