import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { fcfa } from "@/lib/app";
import { checkDepositStatus, initiateDeposit } from "@/lib/payments.functions";
import { isWave, PAY_COUNTRIES, payCountry, type DepositInit } from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/app/recharge")({
  head: () => ({
    meta: [
      { title: "Recharge — NikeStake" },
      {
        name: "description",
        content: "Rechargez votre compte en mobile money : Orange, MTN, Moov, Wave. Validation instantanée.",
      },
      { property: "og:title", content: "Recharge — NikeStake" },
      { property: "og:description", content: "Dépôt mobile money instantané, sans quitter l'application." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recharge,
});

const PRESETS = [3000, 5000, 10000, 20000, 50000, 100000];

function Recharge() {
  const qc = useQueryClient();
  const initiate = useServerFn(initiateDeposit);
  const checkStatus = useServerFn(checkDepositStatus);

  const [amount, setAmount] = useState("");
  const [countryCode, setCountryCode] = useState(PAY_COUNTRIES[0]!.code);
  const [operator, setOperator] = useState(PAY_COUNTRIES[0]!.operators[0]!);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<DepositInit | null>(null);

  const country = payCountry(countryCode);
  const wave = isWave(operator);

  function onCountryChange(code: string) {
    setCountryCode(code);
    setOperator(payCountry(code).operators[0]!);
    setStep(null);
  }

  const pay = useMutation({
    mutationFn: async (withOtp: boolean) => {
      const digits = phone.replace(/\D/g, "");
      const fullPhone = digits.startsWith(country.dial.replace("+", ""))
        ? digits
        : `${country.dial.replace("+", "")}${digits}`;

      return initiate({
        data: {
          amount: Number(amount),
          countryCode: country.code,
          currency: country.currency,
          operator,
          phone: fullPhone,
          ...(withOtp && step ? { otp, reference: step.reference } : {}),
        },
      });
    },
    onSuccess: (result) => {
      setStep(result);
      setOtp("");
      if (result.type === "otp_ussd" || result.type === "otp_sms") {
        toast.info("Confirmation requise");
        return;
      }
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (result.type === "wave") {
        toast.success("Ouvrez Wave pour confirmer le paiement");
        window.open(result.waveUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.success("Demande envoyée — validez sur votre téléphone");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!step) return { status: "unknown", amount: 0 };
      return checkStatus({ data: { reference: step.reference } });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (result.status === "approved") {
        toast.success(`Recharge validée : ${fcfa(result.amount)}`);
        setStep(null);
        setAmount("");
        setPhone("");
      } else if (result.status === "rejected") {
        toast.error("Paiement refusé par l'opérateur");
        setStep(null);
      } else {
        toast.info("Paiement toujours en attente de confirmation");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < 1000) {
      toast.error("Montant minimum : 1 000 FCFA");
      return;
    }
    if (!wave && phone.replace(/\D/g, "").length < 8) {
      toast.error("Numéro mobile money invalide");
      return;
    }
    pay.mutate(false);
  }

  function onConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.replace(/\D/g, "").length < 4) {
      toast.error("Entrez le code de confirmation");
      return;
    }
    pay.mutate(true);
  }

  const awaitingOtp = step?.type === "otp_ussd" || step?.type === "otp_sms";
  const pendingPayment = step?.type === "ussd_push" || step?.type === "wave";

  return (
    <>
      <SubHeader title="Recharger" />
      <div className="space-y-3 p-4">
        <Card>
          <p className="text-sm font-bold">Paiement mobile money instantané</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisissez votre pays et votre opérateur, entrez le montant puis validez la demande
            reçue sur votre téléphone. Votre solde est crédité automatiquement dès la confirmation
            de l&apos;opérateur.
          </p>
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

            <Field label="Pays">
              <select
                value={countryCode}
                onChange={(e) => onCountryChange(e.target.value)}
                className={inputClass}
              >
                {PAY_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Opérateur">
              <select
                value={operator}
                onChange={(e) => {
                  setOperator(e.target.value);
                  setStep(null);
                }}
                className={inputClass}
              >
                {country.operators.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>

            {wave ? (
              <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                Avec Wave, un lien de paiement s&apos;ouvre pour confirmer le montant. Le numéro de
                téléphone est facultatif.
              </p>
            ) : null}

            <Field
              label={wave ? "Numéro (facultatif)" : "Numéro mobile money"}
              hint={`Indicatif ${country.dial}`}
            >
              <input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="07 00 00 00 00"
                className={inputClass}
              />
            </Field>

            <Btn full disabled={pay.isPending}>
              {pay.isPending ? "Traitement..." : `Payer ${amount ? fcfa(Number(amount)) : ""}`}
            </Btn>
          </form>
        </Card>

        {awaitingOtp && step ? (
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-bold">Confirmation requise</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {step.type === "otp_ussd"
                  ? `Composez ${step.ussdCode} sur votre téléphone, le code de confirmation s'affiche dans le menu.`
                  : "Un code de confirmation vous a été envoyé par SMS."}
              </p>
              {step.type === "otp_ussd" ? (
                <p className="mt-2 rounded-xl bg-secondary p-3 text-center text-lg font-black text-primary">
                  {step.ussdCode}
                </p>
              ) : null}
            </div>
            <form onSubmit={onConfirmOtp} className="space-y-3">
              <Field label="Code de confirmation" hint="Valable 15 minutes">
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className={inputClass}
                />
              </Field>
              <Btn full disabled={pay.isPending}>
                {pay.isPending ? "Vérification..." : "Confirmer le paiement"}
              </Btn>
            </form>
          </Card>
        ) : null}

        {pendingPayment && step ? (
          <Card className="space-y-3">
            <p className="text-sm font-bold">Paiement en attente</p>
            <p className="text-xs text-muted-foreground">
              Référence : {step.reference}
              <br />
              {step.type === "wave"
                ? "Confirmez le paiement dans l'application Wave."
                : "Validez la demande reçue sur votre téléphone avec votre code secret."}
            </p>
            {step.type === "wave" ? (
              <a
                href={step.waveUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
              >
                Payer avec Wave
              </a>
            ) : null}
            <Btn variant="outline" full disabled={refresh.isPending} onClick={() => refresh.mutate()}>
              {refresh.isPending ? "Vérification..." : "J'ai payé — vérifier le statut"}
            </Btn>
          </Card>
        ) : null}
      </div>
    </>
  );
}
