import { createFileRoute } from "@tanstack/react-router";
import { Headphones, Send, Users } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";
import { TELEGRAM } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/support")({
  head: () => ({
    meta: [
      { title: "Service client — NikeStake" },
      { name: "description", content: "Contactez le support NikeStake par Telegram, 7 jours sur 7." },
      { property: "og:title", content: "Service client — NikeStake" },
      { property: "og:description", content: "Assistance rapide pour vos dépôts et retraits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Support,
});

const items = [
  { icon: Users, label: "Groupe Telegram", href: TELEGRAM.group },
  { icon: Send, label: "Canal Telegram", href: TELEGRAM.channel },
  { icon: Headphones, label: "Support direct", href: TELEGRAM.support },
];

function Support() {
  return (
    <>
      <SubHeader title="Service client" />
      <div className="space-y-3 p-4">
        <Card className="bg-gradient-deep text-primary-foreground">
          <p className="text-sm font-bold">Nous sommes là pour vous</p>
          <p className="mt-1 text-xs opacity-90">
            Notre équipe répond de 8 h à 22 h, tous les jours. Ne communiquez jamais votre mot de
            passe.
          </p>
        </Card>

        {items.map(({ icon: Icon, label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="block">
            <Btn full variant="outline">
              <Icon className="size-4" /> {label}
            </Btn>
          </a>
        ))}
      </div>
    </>
  );
}
