import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollText, ArrowRightLeft } from "lucide-react";

import { Btn, Card, SubHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/app/history")({
  head: () => ({
    meta: [
      { title: "Historique — Nike" },
      {
        name: "description",
        content: "Accédez à l’historique de vos recharges et de vos retraits.",
      },
      { property: "og:title", content: "Historique — Nike" },
      {
        property: "og:description",
        content: "Consultez vos mouvements de compte et vos opérations financières.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  return (
    <>
      <SubHeader title="Historique" />
      <div className="space-y-3 p-4">
        <Card className="space-y-2">
          <p className="text-sm font-bold">Suivi des opérations</p>
          <p className="text-sm text-muted-foreground">
            Retrouvez ici les détails de vos recharges et de vos retraits.
          </p>
        </Card>

        <Link to="/app/recharge-history" className="block">
          <Btn full variant="outline">
            <ScrollText className="size-4" /> Historique des recharges
          </Btn>
        </Link>

        <Link to="/app/withdraw-history" className="block">
          <Btn full variant="outline">
            <ArrowRightLeft className="size-4" /> Historique des retraits
          </Btn>
        </Link>
      </div>
    </>
  );
}
