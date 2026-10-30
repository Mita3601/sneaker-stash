import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, CreditCard, ReceiptText } from "lucide-react";
import heroImg from "@/assets/dior-hero.jpg";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass } from "@/components/ui-kit";
import { ManualCheckout, ORANGE_PROVIDER, WAVE_PROVIDER, type ManualProvider } from "@/components/WaveCheckout";
import { useCurrentUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, fcfa } from "@/lib/app";
import { checkDepositStatus, getPaymentOptions, initiateDeposit } from "@/lib/payments.functions";
import { DEPOSIT_TIMEOUT_MINUTES, MIN_DEPOSIT, type DepositInit } from "@/lib/payments";

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

const PRESETS = [2000, 8000, 20000, 60000];
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
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, country_code")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const gatewayReady = options.data ? options.data.gatewayConfigured : true;

  const [amount, setAmount] = useState("2000");
  const [country, setCountry] = useState(COUNTRIES[0]!.code);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [deposit, setDeposit] = useState<DepositInit | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [manualProvider, setManualProvider] = useState<ManualProvider | null>(null);
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
      const digits = phone.replace(/\D/g, "");
      const ccDigits = country.replace(/\D/g, "");
      const intl = phone.startsWith("+")
        ? phone
        : digits.startsWith(ccDigits) && digits.length > 10
          ? `+${digits}`
          : `${country}${digits}`;
      return initiate({ data: { amount: Number(amount), phone: intl, name } });
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
    setAmount("2000");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < MIN_DEPOSIT) {
      toast.error(`Montant minimum : ${MIN_DEPOSIT} FCFA`);
      return;
    }
    if (country === "+225" || country === "+237") {
      setManualProvider(country === "+225" ? WAVE_PROVIDER : ORANGE_PROVIDER);
      return;
    }
    if (phone.replace(/\D/g, "").length < 8) {
      toast.error("Indiquez votre numéro mobile money");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Indiquez le nom du titulaire");
      return;
    }
    pay.mutate();
  }

  const isCI = country === "+225";
  const isManual = isCI || country === "+237";

  return (
    <>
      {manualProvider ? (
        <ManualCheckout
          amount={Number(amount)}
          defaultPhone={phone}
          provider={manualProvider}
          onClose={() => setManualProvider(null)}
        />
      ) : null}

      <section className="relative h-48 overflow-hidden bg-gradient-deep">
        <img src={heroImg} alt="Flacons de parfum Dior" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 to-foreground/40" />
        <Link to="/app/me" aria-label="Retour" className="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-foreground/30 text-primary-foreground">
          <ChevronLeft className="size-6" />
        </Link>
        <Link to="/app/recharge-history" aria-label="Historique des recharges" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-foreground/30 text-primary-foreground">
          <ReceiptText className="size-5" />
        </Link>
        <h1 className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-5xl font-medium uppercase tracking-widest text-primary-foreground drop-shadow">
          Recharge
        </h1>
      </section>
      <div className="space-y-4 bg-secondary p-4">
        {!gatewayReady && !isManual ? (
          <Card>
            <p className="text-sm font-bold">Paiement momentanément indisponible</p>
            <p className="mt-1 text-xs text-muted-foreground">
              La passerelle de paiement n&apos;est pas encore activée. Réessayez plus tard ou
              contactez le service client.
            </p>
          </Card>
        ) : null}

        {phase === "idle" ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <p className="px-1 text-base text-foreground">Le montant de la recharge</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`rounded-md border py-3 text-sm transition ${
                      amount === String(p)
                        ? "border-foreground bg-gradient-deep text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {p.toLocaleString("en-US")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-1 text-base text-foreground">Saisir un autre montant</p>
              <label className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-3">
                <span className="text-muted-foreground">FCFA</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder={String(MIN_DEPOSIT)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="Montant"
                />
              </label>
            </div>

            <Card className="space-y-3">
              <p className="text-base text-foreground">Méthode de recharge</p>
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCountry(c.code)}
                  className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition ${
                    country === c.code
                      ? "bg-gradient-deep text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  <CreditCard className="size-5" />
                  <span className="flex-1">{c.label}</span>
                  <span className="text-xs opacity-70">{c.code}</span>
                  {country === c.code ? <Check className="size-4" /> : null}
                </button>
              ))}

              {!isManual ? (<>
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
              </>) : (
                <p className="text-xs text-muted-foreground">
                  {isCI
                    ? "Paiement par Wave Côte d'Ivoire, validé par l'administrateur."
                    : "Paiement par Orange Money Cameroun, validé par l'administrateur."}
                </p>
              )}
            </Card>

            <div className="flex justify-center">
              <Btn className="w-2/3 rounded-full py-4 text-base" disabled={pay.isPending || (!gatewayReady && !isManual)}>
                {pay.isPending ? "Création du paiement..." : "Confirmer"}
              </Btn>
            </div>
            <Link to="/app/recharge-history" className="block text-center text-sm text-primary underline-offset-2 hover:underline">
              Si la recharge n&apos;est pas créditée, consultez votre historique ici
            </Link>

            <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
              <li>Le montant minimum du dépôt est de {fcfa(MIN_DEPOSIT)}.</li>
              <li>Choisissez votre pays, puis payez avec le numéro mobile money indiqué.</li>
              <li>Suivez scrupuleusement les instructions de la page de paiement sécurisée.</li>
              <li>
                Sans confirmation sous {DEPOSIT_TIMEOUT_MINUTES} minutes, la demande est annulée ;
                contactez alors le service client avec votre référence.
              </li>
            </ol>
          </form>
        ) : null}

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
      </div>
    </>
  );
}
