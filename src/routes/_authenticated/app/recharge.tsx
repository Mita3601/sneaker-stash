import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { fcfa } from "@/lib/app";
import { checkDepositStatus, getPaymentOptions, initiateDeposit } from "@/lib/payments.functions";
import {
  CURRENCIES,
  DEPOSIT_TIMEOUT_MINUTES,
  MIN_DEPOSIT,
  type DepositInit,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/app/recharge")({
  head: () => ({
    meta: [
      { title: "Recharge — Dior Parfums" },
      {
        name: "description",
        content:
          "Rechargez votre solde par mobile money (Orange, MTN, Moov, Wave). Crédit automatique dès confirmation.",
      },
      { property: "og:title", content: "Recharge — Dior Parfums" },
      {
        property: "og:description",
        content: "Dépôt mobile money sécurisé, solde crédité automatiquement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recharge,
});

const PRESETS = [1000, 4000, 8000, 12000, 20000, 50000];
const POLL_MS = 5000;
const TIMEOUT_MS = DEPOSIT_TIMEOUT_MINUTES * 60 * 1000;

type Phase = "idle" | "pending" | "success" | "failed";

function Recharge() {
  const qc = useQueryClient();
  const loadOptions = useServerFn(getPaymentOptions);
  const initiate = useServerFn(initiateDeposit);
  const checkStatus = useServerFn(checkDepositStatus);

  const options = useQuery({
    queryKey: ["payment-options"],
    queryFn: () => loadOptions(),
    staleTime: 5 * 60 * 1000,
  });

  const currencies = options.data?.currencies ?? CURRENCIES;
  const gatewayReady = options.data ? options.data.gatewayConfigured : true;

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [deposit, setDeposit] = useState<DepositInit | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const startedAt = useRef<number>(0);

  const pay = useMutation({
    mutationFn: () => initiate({ data: { amount: Number(amount), currency } }),
    onSuccess: (result) => {
      setDeposit(result);
      setPhase("pending");
      startedAt.current = Date.now();
      qc.invalidateQueries({ queryKey: ["transactions"] });
      window.open(result.paymentLink, "_blank", "noopener,noreferrer");
      toast.success("La page de paiement s'ouvre dans un nouvel onglet.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Polling du statut interne toutes les 5 s, arrêté au bout de 15 minutes.
  useEffect(() => {
    if (phase !== "pending" || !deposit) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt.current > TIMEOUT_MS) {
        clearInterval(timer);
        setPhase("failed");
        return;
      }
      try {
        const result = await checkStatus({ data: { reference: deposit.reference } });
        if (cancelled) return;
        if (result.status === "approved") {
          setPhase("success");
          qc.invalidateQueries({ queryKey: ["profile"] });
          qc.invalidateQueries({ queryKey: ["transactions"] });
          toast.success(`Recharge validée : ${fcfa(result.amount)}`);
        } else if (result.status === "rejected") {
          setPhase("failed");
          qc.invalidateQueries({ queryKey: ["transactions"] });
        }
      } catch {
        // on retentera au prochain cycle
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, deposit, checkStatus, qc]);

  function reset() {
    setDeposit(null);
    setPhase("idle");
    setAmount("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < MIN_DEPOSIT) {
      toast.error(`Montant minimum : ${MIN_DEPOSIT} FCFA`);
      return;
    }
    pay.mutate();
  }

  return (
    <>
      <SubHeader title="Recharger" />
      <div className="space-y-3 p-4">
        <Card>
          <p className="text-sm font-bold">Recharge par lien de paiement sécurisé</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Indiquez un montant (minimum {fcfa(MIN_DEPOSIT)}), puis payez avec Orange Money, MTN,
            Moov ou Wave sur la page sécurisée. Votre solde est crédité automatiquement dès la
            confirmation. Sans confirmation sous {DEPOSIT_TIMEOUT_MINUTES} minutes, la demande est
            annulée.
          </p>
        </Card>

        {!gatewayReady ? (
          <Card>
            <p className="text-sm font-bold">Paiement momentanément indisponible</p>
            <p className="mt-1 text-xs text-muted-foreground">
              La passerelle de paiement n&apos;est pas encore activée. Réessayez plus tard ou
              contactez le service client.
            </p>
          </Card>
        ) : null}

        {phase === "idle" ? (
          <Card>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Montant">
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder={String(MIN_DEPOSIT)}
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

              <Field label="Devise">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Btn full disabled={pay.isPending || !gatewayReady}>
                {pay.isPending
                  ? "Création du paiement..."
                  : `Recharger ${amount ? fcfa(Number(amount)) : ""}`}
              </Btn>
            </form>
          </Card>
        ) : null}

        {phase === "pending" && deposit ? (
          <Card className="space-y-3">
            <p className="text-sm font-bold">En attente de confirmation…</p>
            <p className="text-xs text-muted-foreground">
              Référence : {deposit.reference}
              <br />
              Montant : {fcfa(deposit.amount)} {deposit.currency}
              <br />
              Ne fermez pas cette page : votre solde sera crédité automatiquement.
            </p>
            <a
              href={deposit.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-secondary p-3 text-center text-xs font-bold text-primary"
            >
              Réouvrir la page de paiement
            </a>
            <Btn full variant="ghost" onClick={reset}>
              Annuler
            </Btn>
          </Card>
        ) : null}

        {phase === "success" ? (
          <Card className="space-y-3">
            <p className="text-sm font-bold">Recharge confirmée</p>
            <p className="text-xs text-muted-foreground">
              Votre solde a été crédité. Vous pouvez maintenant choisir votre parfum.
            </p>
            <Btn full onClick={reset}>
              Nouvelle recharge
            </Btn>
          </Card>
        ) : null}

        {phase === "failed" ? (
          <Card className="space-y-3">
            <p className="text-sm font-bold">Paiement non confirmé</p>
            <p className="text-xs text-muted-foreground">
              Aucune confirmation reçue dans le délai de {DEPOSIT_TIMEOUT_MINUTES} minutes. Aucun
              montant n&apos;a été débité de votre solde.
            </p>
            <Btn full onClick={reset}>
              Réessayer
            </Btn>
          </Card>
        ) : null}
      </div>
    </>
  );
}
