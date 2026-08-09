import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Smartphone } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/app/download")({
  head: () => ({
    meta: [
      { title: "Télécharger l’app — Nike" },
      {
        name: "description",
        content: "Installez Nike sur votre téléphone pour un accès plus rapide.",
      },
      { property: "og:title", content: "Télécharger l’app — Nike" },
      {
        property: "og:description",
        content: "Ajoutez Nike à l’écran d’accueil de votre téléphone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DownloadApp,
});

function DownloadApp() {
  return (
    <>
      <SubHeader title="Télécharger l’app" />
      <div className="space-y-3 p-4">
        <Card className="bg-gradient-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <Smartphone className="size-5" />
            </span>
            <div>
              <p className="font-bold">Accès rapide sur mobile</p>
              <p className="text-xs opacity-90">
                Ouvrez l’application dans votre navigateur puis ajoutez-la à l’écran d’accueil.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-bold">Étapes</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Ouvrez Nike dans votre navigateur mobile.</li>
            <li>• Utilisez le menu du navigateur pour ajouter à l’écran d’accueil.</li>
            <li>• Lancez ensuite l’app depuis l’icône créée.</li>
          </ul>
        </Card>

        <Link to="/app" className="block">
          <Btn full>
            <Download className="size-4" /> Retour à la page compte
          </Btn>
        </Link>
      </div>
    </>
  );
}
