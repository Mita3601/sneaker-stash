import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, PROVIDERS, TELEGRAM } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/recharge")({
  head: () => ({
    meta: [
      { title: "Recharge — NikeStake" },
      { name: "description", content: "Rechargez votre compte par mobile money et validez votre dépôt." },
      { property: "og:title", content: "Recharge — NikeStake" },
      { property: "og:description", content: "Dépôts mobile money validés rapidement par notre équipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recharge,
});

const PRESETS = [3000, 5000, 10000, 20000, 50000, 100000];

function Recharge() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_deposit", {
        _amount: Number(amount),
        _reference: reference.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dépôt enregistré — en attente de validation");
      setAmount("");
      setReference("");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < 1000) {
      toast.error("Montant minimum : 1 000 FCFA");
      return;
    }
    if (reference.trim().length < 4) {
      toast.error("Renseignez l'ID de la transaction mobile money");
      return;
    }
    submit.mutate();
  }

  return (
    <>
      <SubHeader title="Recharger" />
      <div className="space-y-3 p-4">
        <Card>
          <p className="text-sm font-bold">Comment recharger</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Contactez le support pour obtenir le numéro de dépôt.</li>
            <li>Envoyez le montant par {PROVIDERS.join(", ")}.</li>
            <li>Renseignez le montant et l&apos;ID de transaction ci-dessous.</li>
          </ol>
          <a
            href={TELEGRAM.support}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-sm font-bold text-primary"
          >
            Obtenir le numéro de dépôt →
          </a>
        </Card>

        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Montant">
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="5000"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className="rounded-xl bg-secondary py-2 text-xs font-bold text-primary"
                >
                  {fcfa(p)}
                </button>
              ))}
            </div>

            <Field label="ID de transaction" hint="Référence reçue par SMS après le paiement">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="EX: PP240715.1234.A56789"
                className={inputClass}
              />
            </Field>

            <Btn full disabled={submit.isPending}>
              {submit.isPending ? "Envoi..." : "Valider mon dépôt"}
            </Btn>
          </form>
        </Card>
      </div>
    </>
  );
}
