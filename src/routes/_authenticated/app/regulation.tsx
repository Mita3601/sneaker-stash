import { createFileRoute } from "@tanstack/react-router";

import { SubHeader } from "@/components/ui-kit";
import hero from "@/assets/image1.jpg";

export const Route = createFileRoute("/_authenticated/app/regulation")({
  head: () => ({
    meta: [
      { title: "Règles de la plateforme — Dior Parfums" },
      {
        name: "description",
        content: "Règles d’utilisation et conditions en vigueur de Dior Parfums.",
      },
      { property: "og:title", content: "Règles de la plateforme — Dior Parfums" },
      {
        property: "og:description",
        content: "Lisez les règles de fonctionnement de la plateforme.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Regulation,
});

const rules = [
  "Dépôt minimum : 4 000 FCFA, crédité après approbation du paiement.",
  "Bonus d'inscription : 1 500 FCFA pour les nouveaux comptes.",
  "Le revenu quotidien, le montant total et la durée sont affichés avant l’achat et enregistrés lors de sa confirmation.",
  "Commissions : 27 % au niveau 1, 2 % au niveau 2 et 1 % au niveau 3, uniquement sur les achats réglés avec de l'argent réel.",
  "Chaque achat dispose de son propre cycle. Les revenus de plusieurs parfums achetés peuvent se cumuler.",
  "Les revenus dus sont automatiquement crédités sur le solde interne toutes les 24 heures, à partir de l’heure d’achat. Les demandes de retrait restent soumises aux conditions indiquées sur la page Retrait.",
  "Retrait minimum : 1 000 FCFA, frais de 15 %, 2 retraits maximum par jour.",
  "Rejoignez notre groupe Telegram pour en savoir plus sur les opportunités de gains !",
];

function Regulation() {
  return (
    <div className="bg-background pb-10">
      <SubHeader title="Règles de la plateforme" />

      <div className="space-y-5 px-5 pt-6 text-[17px] leading-relaxed text-foreground">
        <img src={hero} alt="Tableau des parfums" className="h-auto w-full" />

        <p>Conditions en vigueur</p>
        <p className="font-bold">Bienvenue : 1 500 FCFA · Dépôt minimum : 200 FCFA</p>
        <p>
          Parrainage sur les achats réglés : <strong>27 % · 2 % · 1 %</strong>.
        </p>
        <p>
          Cette plateforme mobile propose une collection de parfums Dior, un espace client et des
          fonctionnalités dédiées au suivi des produits, à l’équipe et aux informations de
          financement.
        </p>
        <p className="pt-2">Bienvenue sur votre espace Dior Parfums.</p>

        <ol className="list-decimal space-y-5 pl-8">
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>

        <p className="pt-2">Récompenses de parrainage</p>
        <p>
          Les commissions portent uniquement sur les achats réglés avec de l’argent réel. Aucun
          versement sur les fonds crédités par l’administration ni sur le bonus de bienvenue. Les
          fractions de FCFA sont arrondies à l’entier inférieur.
        </p>

        <p className="pt-4 text-[13px] leading-relaxed text-muted-foreground">
          Les revenus des parfums achetés sont crédités sur le solde interne toutes les 24 heures,
          dans les limites de leur montant total et de leur durée. Les parfums offerts par
          l’administration ne génèrent pas de commission. Les retraits suivent les conditions de la
          page Retrait.
        </p>
      </div>
    </div>
  );
}
