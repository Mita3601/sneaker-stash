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
          <p className="text-sm font-bold">À propos de Nike</p>
          <p className="text-sm text-muted-foreground">
            Nike s'engage à fournir des solutions d'investissement en sneakers premium sur le marché
            mondial. Nos principaux produits comprennent des collections Nike exclusives et
            limitées, des éditions spéciales et des modèles collaboratifs recherchés. Largement
            appréciés par les collectionneurs, les investisseurs, les passionnés de sneakers et les
            portefeuilles numériques de particuliers et d'entreprises, ils répondent aux besoins
            d'investissement d'une clientèle diversifiée.
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Technologie et sécurité</p>
          <p className="text-sm text-muted-foreground">
            Sur le plan technologique, Nike privilégie la sécurité, la stabilité et l'intelligence
            de sa plateforme. Tous les investissements sont protégés par les meilleures normes de
            certification internationales et prennent en charge de multiples modes de paiement et
            protocoles de retrait. Parallèlement, notre plateforme cloud intelligente, développée en
            interne, permet la surveillance à distance, l'analyse des rendements, la gestion des
            portefeuilles et l'optimisation des stratégies d'investissement, aidant ainsi nos
            clients à améliorer l'efficacité de leurs placements et la rentabilité de leurs
            opérations.
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-bold">Notre vision</p>
          <p className="text-sm text-muted-foreground">
            Face au développement rapide du marché mondial des sneakers et des investissements
            alternatifs, Nike accroît continuellement ses investissements en innovation et se
            développe activement à l'international, en établissant un réseau de support et de
            service complet en Europe et en Afrique. À l'avenir, l'entreprise continuera de
            promouvoir les opportunités d'investissement dans les actifs numériques et les
            collections premium, contribuant ainsi à la réalisation des objectifs mondiaux de
            croissance financière et de développement durable.
          </p>
        </Card>

        <Card className="space-y-3 bg-gradient-primary text-primary-foreground">
          <p className="text-sm font-bold">Rejoignez Nike dès maintenant</p>
          <p className="text-sm">
            Saisissez de nouvelles opportunités de croissance ! Une plateforme performante, offrant
            des rendements stables et transparents, vous permet d'accroître facilement vos revenus.
            Rejoignez notre communauté et bâtissons ensemble un avenir prometteur !
          </p>
        </Card>

        <Link to="/app" className="block">
          <Btn full>Retour à l’accueil</Btn>
        </Link>
      </div>
    </>
  );
}
