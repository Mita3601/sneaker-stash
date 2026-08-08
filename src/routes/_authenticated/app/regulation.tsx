import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";
import hero from "@/assets/image.jpg";

export const Route = createFileRoute("/_authenticated/app/regulation")({
  head: () => ({
    meta: [
      { title: "Réglementation — NikeStake" },
      {
        name: "description",
        content: "Règles d’utilisation et informations importantes de NikeStake.",
      },
      { property: "og:title", content: "Réglementation — NikeStake" },
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

const PRODUCTS = [
  { vip: "VIP1", name: "Air Force 1", price: 4000, daily: 750, total: 45000, days: 60 },
  { vip: "VIP2", name: "Air Max 90", price: 8000, daily: 1500, total: 90000, days: 60 },
  { vip: "VIP3", name: "Dunk Low", price: 15000, daily: 2700, total: 162000, days: 60 },
  { vip: "VIP4", name: "Jordan 1", price: 20000, daily: 4500, total: 270000, days: 60 },
  { vip: "VIP5", name: "Jordan 4", price: 50000, daily: 10000, total: 600000, days: 60 },
  { vip: "VIP6", name: "Air Max 270", price: 120000, daily: 22000, total: 1320000, days: 60 },
  { vip: "VIP7", name: "Vaporfly 3", price: 250000, daily: 45000, total: 2700000, days: 60 },
  { vip: "VIP8", name: "Air Zoom Alphafly", price: 500000, daily: 90000, total: 5400000, days: 60 },
  {
    vip: "VIP9",
    name: "Nike Mag Limited",
    price: 1000000,
    daily: 120000,
    total: 7200000,
    days: 60,
  },
];

function formatFCFA(n: number) {
  return `FCFA ${new Intl.NumberFormat("fr-FR").format(n)}`;
}

function Regulation() {
  return (
    <>
      <SubHeader title="Règlementation" />

      <div className="p-4 space-y-4">
        <Card className="overflow-hidden">
          <img src={hero} alt="Plan de revenus" className="w-full h-auto rounded-md" />
        </Card>

        <Card>
          <p className="text-base font-bold">Présentation</p>
          <p className="text-sm text-muted-foreground">
            Investissez intelligemment et recevez des revenus quotidiens automatiquement. Les
            produits listés ci-dessous correspondent exactement aux offres disponibles sur la
            plateforme — prix, revenu quotidien et rendement total.
          </p>
        </Card>

        <Card>
          <div className="overflow-auto">
            <table className="w-full text-sm table-auto border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Produit</th>
                  <th className="p-2">Prix</th>
                  <th className="p-2">Revenu quotidien</th>
                  <th className="p-2">Revenu total</th>
                  <th className="p-2">Temps</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p) => (
                  <tr key={p.vip} className="border-t">
                    <td className="p-2">
                      {p.vip} — {p.name}
                    </td>
                    <td className="p-2">{formatFCFA(p.price)}</td>
                    <td className="p-2">{formatFCFA(p.daily)}</td>
                    <td className="p-2">{formatFCFA(p.total)}</td>
                    <td className="p-2">{p.days} jours</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-bold">Règles essentielles</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Un seul compte par utilisateur est autorisé.</li>
            <li>• Les retraits sont traités via les comptes bancaires enregistrés.</li>
            <li>
              • Les revenus sont versés automatiquement et peuvent être retirés selon les règles.
            </li>
            <li>• Les comptes suspects peuvent être gelés après vérification.</li>
          </ul>
        </Card>

        <div className="flex gap-2">
          <Link to="/app/support" className="flex-1">
            <Btn full variant="outline">
              Contacter le support
            </Btn>
          </Link>
        </div>
      </div>
    </>
  );
}
