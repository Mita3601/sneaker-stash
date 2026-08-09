import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { confirmSuccessfulDeposit } from "@/lib/payments.functions";

export const Route = createFileRoute("/merci")({
  component: MerciPage,
});

function MerciPage() {
  const confirmDeposit = useServerFn(confirmSuccessfulDeposit);
  const [statusMessage, setStatusMessage] = useState(
    "Votre dépôt a bien été reçu et votre compte est en cours de crédit automatique…",
  );

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) return;

    void confirmDeposit({ data: { reference } })
      .then((result) => {
        if (result?.ok) {
          setStatusMessage(
            "Votre dépôt a bien été confirmé et votre solde a été crédité automatiquement.",
          );
          return;
        }
        setStatusMessage(
          "Votre paiement a été reçu. La confirmation est en cours et votre solde sera crédité automatiquement.",
        );
      })
      .catch(() => {
        setStatusMessage(
          "Votre paiement a été reçu. La confirmation est en cours et votre solde sera crédité automatiquement.",
        );
      });
  }, [confirmDeposit]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background px-4">
      <div className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-black text-foreground">Paiement confirmé</h1>
        <p className="mt-3 text-sm text-muted-foreground">{statusMessage}</p>

        <div className="mt-6 space-y-3">
          <Link
            to="/app"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Revenir à l&apos;app
          </Link>
          <Link
            to="/app/recharge"
            className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Recharger encore
          </Link>
        </div>
      </div>
    </main>
  );
}
