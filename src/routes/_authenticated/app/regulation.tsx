import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";

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

function Regulation() {
  return (
    <>
      <SubHeader title="Réglementation" />
      <div className="space-y-3 p-4">
        <Card className="bg-gradient-deep text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-bold">Règles de fonctionnement</p>
              <p className="text-xs opacity-90">
                Les comptes doivent respecter les limites de sécurité et les règles de retrait.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-bold">Points essentiels</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Un seul compte par utilisateur est autorisé.</li>
            <li>• Les retraits passent par les comptes enregistrés dans l’application.</li>
            <li>• Les informations de sécurité ne doivent jamais être partagées.</li>
            <li>• En cas de doute, contactez le support avant toute action.</li>
          </ul>
        </Card>

        <Link to="/app/support" className="block">
          <Btn full variant="outline">
            Contacter le support
          </Btn>
        </Link>
      </div>
    </>
  );
}
