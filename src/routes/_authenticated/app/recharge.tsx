import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass } from "@/components/ui-kit";
import { FinanceHeader, financeButton } from "@/components/FinanceLayout";
import {
  ManualCheckout,
  CI_PROVIDERS,
  CM_PROVIDERS,
  type ManualProvider,
} from "@/components/WaveCheckout";
import { useCurrentUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, fcfa } from "@/lib/app";
import { checkDepositStatus, getPaymentOptions, initiateDeposit } from "@/lib/payments.functions";
import {
  DEPOSIT_TIMEOUT_MINUTES,
  MIN_DEPOSIT,
  PAYMENT_PROVIDER_BY_COUNTRY,
  type DepositInit,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/app/recharge")({
  head: () => ({
    meta: [
      { title: "Recharge — Dior Parfums" },
      {
        name: "description",
        content:
          "Rechargez votre solde par mobile money (Orange, MTN, Moov, Wave). Crédit après validation du paiement.",
      },
      { property: "og:title", content: "Recharge — Dior Parfums" },
      {
        property: "og:description",
        content: "Dépôt mobile money sécurisé, solde crédité après validation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recharge,
});

const PRESETS = [4000, 8000, 10000, 20000, 40000, 75000, 100000, 150000, 250000];
const POLL_MS = 5000;
const TIMEOUT_MS = DEPOSIT_TIMEOUT_MINUTES * 60 * 1000;

type Phase = "idle" | "pending" | "success" | "failed";

function Recharge() {
  const qc = useQueryClient();
  const { data: authUser } = useCurrentUser();
  const userId = authUser?.id ?? null;
  const loadOptions = useServerFn(getPaymentOptions);
  const initiate = useServerFn(initiateDeposit);
  const checkStatus = useServerFn(checkDepositStatus);

  const options = useQuery({
    queryKey: ["payment-options"],
    queryFn: () => loadOptions(),
    staleTime: 5 * 60 * 1000,
  });

  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, country_code")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const gatewayReady = options.data ? options.data.gatewayConfigured : true;

  const [amount, setAmount] = useState("4000");
  const [country, setCountry] = useState(COUNTRIES[0]?.code ?? "+225");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [deposit, setDeposit] = useState<DepositInit | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [manualProvider, setManualProvider] = useState<ManualProvider[] | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (!phone && profile.data?.phone) setPhone(String(profile.data.phone));
  }, [profile.data, phone]);

  useEffect(() => {
    const cc = String(profile.data?.country_code ?? "");
    if (COUNTRIES.some((c) => c.code === cc)) setCountry(cc);
  }, [profile.data]);

  // Retour depuis la page de paiement GeniusPay.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("paiement");
    if (!status) return;
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    if (status === "success") {
      toast.success("Paiement reçu : votre solde est crédité automatiquement dès confirmation.");
    } else {
      toast.error("Le paiement n'a pas abouti. Vous pouvez réessayer.");
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, [qc]);

  const pay = useMutation({
    mutationFn: () => {
      const provider = PAYMENT_PROVIDER_BY_COUNTRY[country] ?? "geniuspay";
      const digits = phone.replace(/\D/g, "");
      const ccDigits = country.replace(/\D/g, "");
      const intl = phone.startsWith("+")
        ? phone
        : digits.startsWith(ccDigits) && digits.length > 10
          ? `+${digits}`
          : `${country}${digits}`;
      return initiate({
        data: {
          amount: Number(amount),
          phone: provider === "robotpay" ? "" : intl,
          name: provider === "robotpay" ? "RobotPay" : name,
          country_code: country,
          country,
        },
      });
    },
    onSuccess: (result) => {
      setDeposit(result);
      setPhase("pending");
      startedAt.current = Date.now();
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (result.paymentLink) {
        window.open(result.paymentLink, "_blank", "noopener,noreferrer");
        toast.success("La page de paiement s'ouvre dans un nouvel onglet.");
      } else {
        toast.success(result.message);
      }
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
    setAmount("4000");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < MIN_DEPOSIT) {
      toast.error(`Montant minimum : ${MIN_DEPOSIT} FCFA`);
      return;
    }
    const provider = PAYMENT_PROVIDER_BY_COUNTRY[country] ?? "geniuspay";
    if (provider === "manual") {
      setManualProvider(country === "+225" ? CI_PROVIDERS : CM_PROVIDERS);
      return;
    }
    if (provider !== "robotpay" && phone.replace(/\D/g, "").length < 8) {
      toast.error("Indiquez votre numéro mobile money");
      return;
    }
    if (provider !== "robotpay" && name.trim().length < 2) {
      toast.error("Indiquez le nom du titulaire");
      return;
    }
    pay.mutate();
  }

  const provider = PAYMENT_PROVIDER_BY_COUNTRY[country] ?? "geniuspay";
  const isManual = provider === "manual";
  const isRobotpay = provider === "robotpay";

  return (
    <>
      {manualProvider ? (
        <ManualCheckout
          amount={Number(amount)}
          defaultPhone={phone}
          providers={manualProvider}
          onClose={() => setManualProvider(null)}
        />
      ) : null}

      <div className="finance-page">
        <FinanceHeader title="Recharger" info="recharge-instructions" />
        <div className="px-5 pb-10 pt-7">
          {!gatewayReady && !isManual && (
            <p className="mb-5 text-sm text-destructive">
              Paiement momentanément indisponible. Réessayez plus tard ou contactez le service
              client.
            </p>
          )}
          {phase === "idle" && (
            <form onSubmit={onSubmit}>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-bold">Montant de la recharge</h2>
                <span className="text-sm">(Minimum {fcfa(MIN_DEPOSIT)})</span>
              </div>
              <div className="mt-9 grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <Btn
                    key={p}
                    type="button"
                    variant="outline"
                    aria-pressed={amount === String(p)}
                    onClick={() => setAmount(String(p))}
                    className={`h-11 rounded-md px-1 text-sm font-normal normal-case tracking-normal shadow-card ${amount === String(p) ? "bg-secondary ring-primary" : "bg-card text-muted-foreground ring-border/40"}`}
                  >
                    {p}
                  </Btn>
                ))}
              </div>
              <label className="mt-7 flex h-12 items-center gap-4 rounded-md border border-border px-5">
                <span>FCFA</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="Veuillez saisir le montant de la recharge"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  aria-label="Montant"
                />
              </label>
              <h2 className="mb-3 mt-8 px-2 text-lg font-bold">Méthode de recharge</h2>
              <div className="space-y-2" role="group" aria-label="Pays de recharge">
                {COUNTRIES.map((c) => (
                  <Btn
                    key={c.code}
                    type="button"
                    variant="outline"
                    aria-pressed={country === c.code}
                    onClick={() => setCountry(c.code)}
                    className={`h-12 w-full rounded-md text-sm font-normal normal-case tracking-normal shadow-card ${country === c.code ? "bg-secondary ring-border" : "bg-card ring-border/40"}`}
                  >
                    Chaîne de recharge ({c.label})
                  </Btn>
                ))}
              </div>
              {!isManual && !isRobotpay && (
                <div className="mt-5 space-y-4">
                  <Field label="Numéro mobile money">
                    <input
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                      placeholder="XXXXXXXX"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Nom du titulaire">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nom et prénoms"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              <Btn
                full
                className={`${financeButton} mt-14`}
                disabled={pay.isPending || (!gatewayReady && !isManual)}
              >
                {pay.isPending ? "Création du paiement..." : "Rechargez maintenant"}
              </Btn>
            </form>
          )}

          {phase === "pending" && deposit ? (
            <Card className="space-y-3">
              <p className="text-sm font-bold">En attente de confirmation…</p>
              <p className="text-xs text-muted-foreground">
                Référence : {deposit.reference}
                <br />
                Montant : {fcfa(deposit.amount)}
                <br />
                Ne fermez pas cette page : votre solde sera crédité automatiquement.
              </p>
              {deposit.account && !deposit.paymentLink ? (
                <p className="rounded-xl bg-secondary p-3 text-center text-xs font-bold text-primary">
                  Envoyez {fcfa(deposit.amount)} au numéro {deposit.account}
                </p>
              ) : null}
              {deposit.paymentLink ? (
                <a
                  href={deposit.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-secondary p-3 text-center text-xs font-bold text-primary"
                >
                  Réouvrir la page de paiement
                </a>
              ) : null}
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
          <section id="recharge-instructions" className="finance-instructions mt-12 px-2">
            <h2 className="text-lg font-bold">Instructions de recharge</h2>
            <ol className="mt-6 list-decimal space-y-4 pl-4 text-sm leading-relaxed">
              <li>
                Le dépôt minimum est de {fcfa(MIN_DEPOSIT)}. Les dépôts inférieurs à ce montant ne
                seront pas crédités sur votre compte.
              </li>
              <li>
                Veuillez utiliser les informations de paiement les plus récentes pour chaque dépôt.
              </li>
              <li>Le montant saisi doit correspondre au montant du paiement.</li>

              <li>
                Si votre dépôt n'est pas crédité après validation dans un delai de 15min, veuillez
                contacter le service client avec votre référence et votre preuve de paiement.
              </li>
            </ol>
            <Link
              to="/app/recharge-history"
              className="mt-8 block text-sm text-muted-foreground underline"
            >
              Historique des recharges
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
