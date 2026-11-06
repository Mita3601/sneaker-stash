import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Copy, CreditCard, RefreshCw, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DEPOSIT_TIMEOUT_MINUTES } from "@/lib/payments";
import gopayLogo from "@/assets/gopay-logo.png.asset.json";
import waveLogo from "@/assets/wave-logo.png.asset.json";
import orangeLogo from "@/assets/orange-money-logo.png.asset.json";

export type ManualProvider = {
  providerName: string;
  channel: string;
  methodLabel: string;
  methodWord: string;
  logo: string | null;
  dial: string;
  phonePlaceholder: string;
  copyNumLabel: string;
  account: { number: string; display: string; name: string };
  ussd?: string;
};

export const WAVE_ACCOUNT = {
  number: "0143288059",
  display: "01 43 28 80 59",
  name: "Dior International",
};

export const ORANGE_ACCOUNT = {
  number: "692422876",
  display: "692 42 28 76",
  name: "Tayou kamsu Kevin",
};
export const MTN_ACCOUNT = { number: "653080120", display: "653 08 01 20", name: "NDJAPO FANKAP" };

export const WAVE_PROVIDER: ManualProvider = {
  providerName: "Wave",
  channel: "Wave Côte d'Ivoire",
  methodLabel: "Wave Côte d'Ivoire",
  methodWord: "Wave",
  logo: waveLogo.url,
  dial: "+225",
  phonePlaceholder: "07XXXXXXXX",
  copyNumLabel: "Numéro Wave",
  account: WAVE_ACCOUNT,
};

export const ORANGE_PROVIDER: ManualProvider = {
  providerName: "Orange",
  channel: "Orange Money Cameroun",
  methodLabel: "Orange Money Cameroun",
  methodWord: "Orange Money",
  logo: orangeLogo.url,
  dial: "+237",
  phonePlaceholder: "6XXXXXXXX",
  copyNumLabel: "Numéro Orange Money",
  account: ORANGE_ACCOUNT,
  ussd: "#150*1*1*692422876*montant*2#",
};

export const CI_PROVIDERS: ManualProvider[] = [WAVE_PROVIDER];

export const CM_PROVIDERS: ManualProvider[] = [
  ORANGE_PROVIDER,
  {
    ...ORANGE_PROVIDER,
    providerName: "MTN",
    channel: "MTN Mobile Money Cameroun",
    methodLabel: "MTN Mobile Money",
    methodWord: "MTN",
    logo: null,
    copyNumLabel: "Numéro MTN",
    account: MTN_ACCOUNT,
    ussd: "*126*1#",
  },
];

function MethodLogo({ p }: { p: ManualProvider }) {
  if (p.logo)
    return (
      <img src={p.logo} alt={p.methodWord} className="size-[72px] rounded-full object-cover" />
    );
  return (
    <span className="grid size-[68px] place-items-center rounded-full bg-[#FFCC00]">
      <span className="rounded-[50%] border-[3px] border-black px-2 py-0.5 text-sm font-black text-black">
        MTN
      </span>
    </span>
  );
}

const fmt = (n: number) => `XOF ${n.toLocaleString("en-US")}`;

async function copy(text: string, label: string, opts?: { silentError?: boolean }) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  } catch {
    if (!opts?.silentError) {
      toast.error("Copie impossible, notez-le manuellement");
    }
  }
}

function buildPaymentTarget(provider: ManualProvider, amount: number) {
  const ussd = provider.ussd?.replace("montant", String(amount));
  if (ussd) {
    return `tel:${encodeURIComponent(ussd)}`;
  }
  return `tel:${provider.account.number}`;
}

function openPaymentApp(provider: ManualProvider, amount: number) {
  const target = buildPaymentTarget(provider, amount);
  window.location.assign(target);
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua);
}

type Deposit = { reference: string; amount: number; payerPhone: string; createdAt: number };

export function ManualCheckout({
  amount,
  defaultPhone,
  providers,
  onClose,
}: {
  amount: number;
  defaultPhone: string;
  providers: ManualProvider[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<ManualProvider>(providers[0]!);
  const [phone, setPhone] = useState(
    new RegExp(`^\\+?${provider.dial.replace(/\D/g, "")}`).test(defaultPhone)
      ? defaultPhone.replace(new RegExp(`^\\+?${provider.dial.replace(/\D/g, "")}`), "")
      : "",
  );
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [sms, setSms] = useState("");
  const [left, setLeft] = useState(DEPOSIT_TIMEOUT_MINUTES * 60);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!deposit) return;
    const t = setInterval(() => {
      const s = DEPOSIT_TIMEOUT_MINUTES * 60 - Math.floor((Date.now() - deposit.createdAt) / 1000);
      setLeft(Math.max(0, s));
    }, 1000);
    return () => clearInterval(t);
  }, [deposit]);

  const create = useMutation({
    mutationFn: async () => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8) throw new Error(`Indiquez votre numéro ${provider.methodWord}`);
      const payerPhone = `${provider.dial}${digits}`;
      const { data, error } = await supabase.rpc("create_manual_deposit", {
        _amount: amount,
        _payer_phone: payerPhone,
        _provider: provider.providerName,
        _channel: provider.channel,
      });
      if (error) throw error;
      const r = data as { reference: string };
      return { reference: r.reference, amount, payerPhone, createdAt: Date.now() };
    },
    onSuccess: (d) => {
      setDeposit(d);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proof = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("submit_manual_proof", {
        _reference: deposit!.reference,
        _sms: sms,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(
        "Votre depot a ete valide veuillez attendre 5min apres depot pour contacter le service client si votre compte n'a pas ete credite",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3">
      <div
        className="relative mx-auto max-w-md rounded-3xl bg-white p-5 text-[#1F2937] shadow-xl"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[#5B6675] text-white"
        >
          <X className="size-5" />
        </button>

        {!deposit ? (
          <div className="space-y-5 pt-2">
            <div className="flex flex-col items-center">
              <img src={gopayLogo.url} alt="GOPAY" className="h-16 w-auto" />
            </div>
            <p className="text-base leading-relaxed">
              Veuillez remplir votre mode de paiement et le compte de paiement réel que vous
              utiliserez pour effectuer le paiement.
            </p>
            <p className="text-base">
              Montant de paiement :{" "}
              <span className="ml-2 text-xl font-bold text-[#E07B00]">{fmt(amount)}</span>
            </p>
            <p className="text-base">Veuillez sélectionner un mode de paiement</p>
            <div
              className={providers.length === 1 ? "flex justify-center" : "grid grid-cols-2 gap-4"}
            >
              {providers.map((p) => {
                const on = p.channel === provider.channel;
                return (
                  <button
                    key={p.channel}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setProvider(p)}
                    className={`flex flex-col items-center gap-3 rounded-2xl bg-white px-2 py-7 ${on ? "border-2 border-[#F5B83D] shadow-[0_0_0_3px_#FDECC8]" : "border border-[#E5E7EB]"} ${providers.length === 1 ? "w-full max-w-[240px]" : ""}`}
                  >
                    <MethodLogo p={p} />
                    <span className="text-center text-base font-bold text-[#1F2937]">
                      {p.methodLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-4">
              <span className="font-bold text-[#9A4A0C]">{provider.dial}</span>
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={provider.phonePlaceholder}
                aria-label={`Numéro ${provider.methodWord}`}
                className="min-w-0 flex-1 bg-transparent text-lg outline-none"
              />
            </label>
            <div className="flex gap-3 rounded-2xl border border-[#FBD5DB] bg-[#FFF1F2] p-4 text-sm text-[#BE123C]">
              <AlertCircle className="mt-0.5 size-5 shrink-0 fill-[#F59E0B] text-white" />
              <p>
                Veuillez remplir votre compte de paiement avec précision. Un remplissage incorrect
                peut entraîner la perte des fonds transférés.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate()}
                className="flex w-4/5 items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#F59E0B,#EA8A0C)] py-4 text-lg font-bold text-white shadow-[0_8px_20px_#F59E0B55] disabled:opacity-60"
              >
                {create.isPending ? "Création..." : "Confirmer"} <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 pr-12">
              <span className="flex items-center">
                <img src={gopayLogo.url} alt="GOPAY" className="h-11 w-auto" />
              </span>
              <div className="text-center">
                <p className="text-[11px] text-[#6B7280]">La transaction expire dans</p>
                <div className="mt-1 flex items-center gap-1 font-mono text-sm font-bold">
                  <span className="rounded-md bg-[#111827] px-2 py-1 text-white">00</span>:
                  <span className="rounded-md bg-[#111827] px-2 py-1 text-white">{mm}</span>:
                  <span className="rounded-md bg-[#111827] px-2 py-1 text-white">{ss}</span>
                </div>
              </div>
            </div>

            {left === 0 && !sent ? (
              <p className="rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
                Délai expiré. Si vous avez déjà payé, collez quand même le SMS ci-dessous.
              </p>
            ) : null}

            <div className="relative">
              <span
                aria-hidden
                className="absolute bottom-6 left-[17px] top-9 border-l-2 border-dashed border-[#D1D5DB]"
              />
              <div className="relative flex gap-3">
                <span className="z-10 grid size-9 shrink-0 place-items-center rounded-full bg-[#E5E9F0] text-[#64748B]">
                  <CreditCard className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-lg font-bold text-[#111827]">Copiez ce compte</p>
                    <p className="text-sm text-[#6B7280]">
                      Copiez ce compte{" "}
                      <span className="font-bold text-[#E07B00]">{provider.methodWord}</span> et
                      effectuez le paiement
                    </p>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-[#4B5563]">Montant total payable :</p>
                        <p className="text-2xl font-bold text-[#E07B00]">{fmt(deposit.amount)}</p>
                      </div>
                      <span className="grid size-12 place-items-center rounded-full border border-[#E5E7EB] text-sm font-bold text-[#1D6FD8]">
                        EN
                      </span>
                    </div>
                    <Row
                      label={`${provider.methodWord} Compte`}
                      value={provider.account.display}
                      onCopy={() => copy(provider.account.number, "Numéro")}
                    />
                    <Row
                      label="Nom du compte"
                      value={provider.account.name}
                      onCopy={() => copy(provider.account.name, "Nom")}
                    />
                    {provider.ussd ? (
                      <Row
                        label="Code de dépôt"
                        value={provider.ussd.replace("montant", String(deposit.amount))}
                        onCopy={() =>
                          copy(
                            provider.ussd!.replace("montant", String(deposit.amount)),
                            "Code de dépôt",
                          )
                        }
                      />
                    ) : null}
                    <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
                      <p className="text-sm text-[#4B5563]">
                        Réf. <span className="font-bold text-[#111827]">{deposit.reference}</span>
                      </p>
                      <CopyBtn onClick={() => copy(deposit.reference, "Référence")} />
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const amountToPay = deposit?.amount ?? amount;
                  const isMobile = isMobileDevice();

                  if (!isMobile) {
                    const paymentCode = provider.ussd
                      ? provider.ussd.replace("montant", String(amountToPay))
                      : provider.account.number;

                    copy(paymentCode, "Informations de paiement", { silentError: true });
                    toast.info(
                      "Ouverture directe indisponible sur ordinateur. Utilisez un téléphone pour lancer l'application de paiement.",
                    );
                    return;
                  }

                  openPaymentApp(provider, amountToPay);
                  copy(provider.account.number, provider.copyNumLabel, { silentError: true });
                }}
                className="relative z-10 my-6 ml-12 w-[calc(100%-3rem)] rounded-full bg-[linear-gradient(90deg,#EA8A0C,#F5A623)] py-4 text-lg font-bold text-white shadow-[0_8px_20px_#F59E0B55]"
              >
                Cliquez pour payer
              </button>
              <div className="relative flex gap-3">
                <span className="z-10 grid size-9 shrink-0 place-items-center rounded-full bg-[#E5E9F0] text-[#64748B]">
                  <RefreshCw className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-lg font-bold text-[#111827]">Paiement achevé ?</p>
                    <p className="text-sm text-[#6B7280]">
                      Collez le SMS {provider.methodWord} puis cliquez sur{" "}
                      <span className="font-bold text-[#E07B00]">"Rafraîchir"</span>
                    </p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#4B5563]">Montant attendu :</p>
                        <p className="text-lg font-bold text-[#111827]">{fmt(deposit.amount)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={proof.isPending || sent}
                        onClick={() => proof.mutate()}
                        className="rounded-full bg-[linear-gradient(90deg,#EA8A0C,#F5A623)] px-6 py-3 font-bold text-white disabled:opacity-60"
                      >
                        {sent ? "Envoyé" : proof.isPending ? "Envoi..." : "Rafraîchir"}
                      </button>
                    </div>
                    <p className="font-bold text-[#111827]">SMS de la transaction :</p>
                    <textarea
                      value={sms}
                      onChange={(e) => setSms(e.target.value.slice(0, 1000))}
                      disabled={sent}
                      rows={3}
                      placeholder={`Collez ici le SMS reçu de ${provider.methodWord}…`}
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white p-3 text-sm outline-none focus:border-[#F59E0B]"
                    />
                    <p className="text-xs text-[#9CA3AF]">
                      Après l&apos;envoi du SMS, la recharge reste en cours jusqu&apos;à la
                      vérification du versement par l&apos;administrateur.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#E5E7EB] pt-4">
              <span className="grid size-9 place-items-center rounded-full bg-[#EEF1F5] text-[#64748B]">
                <Smartphone className="size-4" />
              </span>
              <div>
                <p className="text-sm text-[#6B7280]">Votre compte de paiement :</p>
                <p className="font-bold">{deposit.payerPhone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copier"
      className="grid size-11 place-items-center rounded-xl border border-[#E5E7EB] text-[#374151]"
    >
      <Copy className="size-4" />
    </button>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[#6B7280]">{label}</p>
        <p className="text-xl font-bold text-[#E07B00]">{value}</p>
      </div>
      <CopyBtn onClick={onCopy} />
    </div>
  );
}
