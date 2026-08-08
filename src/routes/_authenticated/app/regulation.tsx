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
          <p className="text-sm text-muted-foreground mb-3">
            Nike se spécialise dans la fourniture de solutions d'investissement en sneakers premium
            sur le marché mondial. Investissez dans des collections Nike exclusives pour participer
            à l'exploitation de la plateforme, générez facilement un revenu quotidien stable,
            saisissez les opportunités offertes par le développement du marché des sneakers et
            obtenez des rendements continus.
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            Lorsqu'un ami que vous invitez s'inscrit et investit, vous recevez immédiatement une
            prime de 27 % sur son investissement.
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            Lorsque les membres de votre équipe de deuxième niveau investissent, vous recevez une
            prime de 2 %.
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            Lorsque les membres de votre équipe de troisième niveau investissent, vous recevez une
            prime de 1 %.
          </p>
          <p className="text-sm text-muted-foreground">
            Une fois que les membres de votre équipe ont investi, la prime est immédiatement
            créditée sur votre compte et vous pouvez la retirer immédiatement.
          </p>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-bold">Règles essentielles</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. Investissez 4 000 FCFA et retirez 1500 FCFA immédiatement.</li>
            <li>2. Bonus d'inscription : 1500 FCFA</li>
            <li>3. Bonus de connexion quotidienne : 100 FCFA</li>
            <li>4. Taux de rendement quotidien : 18,75%</li>
            <li>
              5. Invitez vos filleuls à investir et vous recevez immédiatement une prime de 27 % sur
              leur investissement.
            </li>
            <li>
              6. Vos revenus sont automatiquement versés sur votre compte 24 h/24 et peuvent être
              retirés à tout moment de 08h a 18h.
            </li>
            <li>
              7. Rejoignez le groupe Telegram pour en savoir plus sur les opportunités de gains.
            </li>
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
