import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { fcfa } from "@/lib/app";
import { checkDepositStatus, getPaymentOptions, initiateDeposit } from "@/lib/payments.functions";
import { isWave, MIN_DEPOSIT, payCountry, type DepositInit } from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/app/recharge")({
  head: () => ({
    meta: [
      { title: "Recharge — NikeStake" },
      {
        name: "description",
        content:
          "Rechargez votre compte en mobile money : Orange, MTN, Moov, Wave. Validation instantanée.",
      },
      { property: "og:title", content: "Recharge — NikeStake" },
      {
        property: "og:description",
        content: "Dépôt mobile money instantané, sans quitter l'application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recharge,
});

const PRESETS = [200, 1000, 3000, 5000, 10000, 20000];

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

  const countries = options.data?.countries ?? [];
  const popupRef = useRef<Window | null>(null);
  const [countryCode, setCountryCode] = useState("");
  const [operator, setOperator] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<DepositInit | null>(null);
  const [leekError, setLeekError] = useState<string | null>(null);

  const country = payCountry(countries, countryCode || countries[0]?.code || "");
  const operators = country?.operators ?? [];
  const activeOperator = operator || operators[0]?.name || "";
  const wave = isWave(activeOperator);
  const dial = country?.dial.replace("+", "") ?? "";

  function onCountryChange(code: string) {
    setCountryCode(code);
    setOperator("");
    setStep(null);
  }

  function openPaymentPopup(url?: string) {
    const targetUrl = url ?? "about:blank";

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.location.href = targetUrl;
      return popupRef.current;
    }

    const popup = window.open(targetUrl, "_blank");
    if (!popup) {
      toast.error("Pop-up bloqué. Autorisez les pop-ups puis réessayez.");
      return null;
    }

    popupRef.current = popup;
    return popup;
  }

  const pay = useMutation({
    mutationFn: async (withOtp: boolean) => {
      const digits = phone.replace(/\D/g, "");
      const fullPhone = digits.startsWith(dial) ? digits : `${dial}${digits}`;

      return initiate({
        data: {
          amount: Number(amount),
          countryCode: country!.code,
          currency: country!.currency,
          operator: activeOperator,
          phone: fullPhone,
          ...(withOtp ? { otp } : {}),
        },
      });
    },
    onSuccess: (result) => {
      setStep(result);
      setOtp("");
      setLeekError(null);
      if (result.type === "otp") {
        toast.info(result.message);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
          popupRef.current = null;
        }
        return;
      }
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (result.type === "redirect") {
        toast.success("La page de paiement s'ouvre maintenant.");
        openPaymentPopup(result.url);
      } else {
        toast.success("Demande envoyée — validez la demande reçue sur votre téléphone");
      }
    },
    onError: (error: Error) => {
      // If LeekPay secret key missing, surface explicit UI message
      if (error.message && /leekpay secret key not configured/i.test(error.message)) {
        setLeekError("LeekPay non configuré sur le serveur. Définissez LEEKPAY_SECRET_KEY.");
      } else {
        toast.error(error.message);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
        popupRef.current = null;
      }
    },
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
    if (!country) {
      toast.error("Paiement momentanément indisponible");
      return;
    }
    if (Number(amount) < MIN_DEPOSIT) {
      toast.error(`Montant minimum : ${MIN_DEPOSIT} FCFA`);
      return;
    }
    if (!wave && phone.replace(/\D/g, "").length < 8) {
      toast.error("Numéro mobile money invalide");
      return;
    }

    if (!popupRef.current || popupRef.current.closed) {
      const popup = openPaymentPopup(); // open a blank popup before redirecting to the payment page
      if (!popup) return;
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

  return (
    <>
      <SubHeader title="Recharger" />
      <div className="space-y-3 p-4">
        <Card>
          <p className="text-sm font-bold">Paiement mobile money instantané</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisissez votre pays et votre opérateur, entrez le montant (minimum {fcfa(MIN_DEPOSIT)}
            ) puis validez la demande reçue sur votre téléphone. Votre solde est crédité
            automatiquement dès la confirmation du paiement.
          </p>
        </Card>

        {options.isLoading ? (
          <Card>
            <p className="text-xs text-muted-foreground">Chargement des moyens de paiement…</p>
          </Card>
        ) : null}

        {leekError ? (
          <Card>
            <p className="text-sm font-bold">LeekPay non configuré</p>
            <p className="mt-1 text-xs text-muted-foreground">{leekError}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Contactez l'administrateur ou définissez la variable d'environnement{" "}
              <strong>LEEKPAY_SECRET_KEY</strong>.
            </p>
          </Card>
        ) : null}

        {options.isError ? (
          <Card>
            <p className="text-xs text-destructive">
              Impossible de charger les moyens de paiement. Réessayez dans un instant.
            </p>
          </Card>
        ) : null}

        {country ? (
          <Card>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Montant">
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="200"
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
                  value={country.code}
                  onChange={(e) => onCountryChange(e.target.value)}
                  className={inputClass}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Opérateur">
                <select
                  value={activeOperator}
                  onChange={(e) => {
                    setOperator(e.target.value);
                    setStep(null);
                  }}
                  className={inputClass}
                >
                  {operators.map((o) => (
                    <option key={o.name} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>

              {wave ? (
                <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                  Avec Wave, un lien de paiement s&apos;ouvre pour confirmer le montant.
                </p>
              ) : null}

              <Field label="Numéro mobile money" hint={`Indicatif ${country.dial}`}>
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
        ) : null}

        {step?.type === "otp" ? (
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-bold">Confirmation requise</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.message}</p>
              {step.ussdCode ? (
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

        {step && (step.type === "pending" || step.type === "redirect") ? (
          <Card className="space-y-3">
            <p className="text-sm font-bold">Paiement en attente</p>
            <p className="text-xs text-muted-foreground">
              Référence : {step.reference}
              <br />
              {step.message}
            </p>
            {step.type === "redirect" ? (
              <a
                href={step.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl bg-secondary p-3 text-center text-xs font-bold text-primary"
              >
                Ouvrir la page de paiement
              </a>
            ) : null}
            <Btn full variant="ghost" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              {refresh.isPending ? "Vérification..." : "J'ai payé — vérifier"}
            </Btn>
          </Card>
        ) : null}
      </div>
    </>
  );
}
