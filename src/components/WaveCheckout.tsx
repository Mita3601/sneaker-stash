import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Copy, CreditCard, RefreshCw, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DEPOSIT_TIMEOUT_MINUTES } from "@/lib/payments";

export const WAVE_ACCOUNT = { number: "0719065178", display: "07 19 06 51 78", name: "Dior International" };

const fmt = (n: number) => `XOF ${n.toLocaleString("fr-FR")}`;

function WaveLogo({ size = 64 }: { size?: number }) {
  // Couleurs officielles de la marque Wave.
  return (
    <span
      className="grid place-items-center rounded-full"
      style={{ width: size, height: size, background: "#1DC8F2" }}
      aria-label="Wave"
    >
      <svg viewBox="0 0 48 48" width={size * 0.6} height={size * 0.6} aria-hidden>
        <g fill="#ffffff">
          <rect x="15" y="12" width="4" height="14" rx="2" />
          <rect x="22" y="9" width="4" height="20" rx="2" />
          <rect x="29" y="13" width="4" height="12" rx="2" />
        </g>
        <text x="24" y="42" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" fontFamily="Arial, sans-serif">
          wave
        </text>
      </svg>
    </span>
  );
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  } catch {
    toast.error("Copie impossible, notez-le manuellement");
  }
}

type Deposit = { reference: string; amount: number; payerPhone: string; createdAt: number };

export function WaveCheckout({
  amount,
  defaultPhone,
  onClose,
}: {
  amount: number;
  defaultPhone: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(defaultPhone.replace(/^\+?225/, ""));
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
      if (digits.length < 8) throw new Error("Indiquez votre numéro Wave");
      const payerPhone = `+225${digits}`;
      const { data, error } = await supabase.rpc("create_wave_manual_deposit", {
        _amount: amount,
        _payer_phone: payerPhone,
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
      const { error } = await supabase.rpc("submit_wave_proof", {
        _reference: deposit!.reference,
        _sms: sms,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("SMS envoyé : votre recharge sera créditée après vérification par l'administrateur.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60 p-3">
      <div className="relative mx-auto max-w-md rounded-3xl bg-card p-5 text-foreground shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-muted-foreground text-primary-foreground"
        >
          <X className="size-5" />
        </button>

        {!deposit ? (
          <div className="space-y-5 pt-2">
            <p className="text-center font-display text-2xl uppercase tracking-widest text-primary">Dior Pay</p>
            <p className="text-sm leading-relaxed">
              Veuillez remplir votre mode de paiement et le compte de paiement réel que vous utiliserez pour
              effectuer le paiement.
            </p>
            <p className="text-sm">
              Montant de paiement : <span className="ml-2 text-xl font-bold text-primary">{fmt(amount)}</span>
            </p>
            <p className="text-sm">Veuillez sélectionner un mode de paiement</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-primary bg-card p-4">
                <WaveLogo />
                <span className="text-center text-sm font-bold">Wave Côte d&apos;Ivoire</span>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-4">
              <span className="font-bold text-primary">+225</span>
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="07XXXXXXXX"
                aria-label="Numéro Wave"
                className="min-w-0 flex-1 bg-transparent text-lg outline-none"
              />
            </label>
            <div className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <p>
                Veuillez remplir votre compte de paiement avec précision. Un remplissage incorrect peut entraîner
                la perte des fonds transférés.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate()}
                className="flex w-4/5 items-center justify-center gap-2 rounded-full bg-gradient-deep py-4 text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-60"
              >
                {create.isPending ? "Création..." : "Confirmer"} <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4 pr-12">
              <span className="font-display text-xl uppercase tracking-widest text-primary">Dior Pay</span>
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground">La transaction expire dans</p>
                <div className="mt-1 flex items-center gap-1 font-mono text-sm font-bold">
                  <span className="rounded-md bg-foreground px-2 py-1 text-background">00</span>:
                  <span className="rounded-md bg-foreground px-2 py-1 text-background">{mm}</span>:
                  <span className="rounded-md bg-foreground px-2 py-1 text-background">{ss}</span>
                </div>
              </div>
            </div>

            {left === 0 && !sent ? (
              <p className="rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
                Délai expiré. Si vous avez déjà payé, collez quand même le SMS ci-dessous.
              </p>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-secondary"><CreditCard className="size-4" /></span>
                <div>
                  <p className="font-bold">Copiez ce compte</p>
                  <p className="text-sm text-muted-foreground">
                    Copiez ce compte <span className="font-bold text-primary">Wave</span> et effectuez le paiement
                  </p>
                </div>
              </div>
              <div className="space-y-4 rounded-2xl border border-border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Montant total payable :</p>
                  <p className="text-2xl font-bold text-primary">{fmt(deposit.amount)}</p>
                </div>
                <Row label="Wave Compte" value={WAVE_ACCOUNT.display} onCopy={() => copy(WAVE_ACCOUNT.number, "Numéro")} />
                <Row label="Nom du compte" value={WAVE_ACCOUNT.name} onCopy={() => copy(WAVE_ACCOUNT.name, "Nom")} />
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground">
                    Réf. <span className="font-bold text-foreground">{deposit.reference}</span>
                  </p>
                  <CopyBtn onClick={() => copy(deposit.reference, "Référence")} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  copy(WAVE_ACCOUNT.number, "Numéro Wave");
                }}
                className="w-full rounded-full bg-gradient-deep py-4 text-lg font-bold text-primary-foreground shadow-lg"
              >
                Cliquez pour payer
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Ouvrez votre application Wave et envoyez {fmt(deposit.amount)} au {WAVE_ACCOUNT.display}.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-secondary"><RefreshCw className="size-4" /></span>
                <div>
                  <p className="font-bold">Paiement achevé ?</p>
                  <p className="text-sm text-muted-foreground">
                    Collez le SMS Wave puis cliquez sur <span className="font-bold text-primary">« Rafraîchir »</span>
                  </p>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant attendu :</p>
                    <p className="font-bold">{fmt(deposit.amount)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={proof.isPending || sent}
                    onClick={() => proof.mutate()}
                    className="rounded-full bg-gradient-deep px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {sent ? "Envoyé" : proof.isPending ? "Envoi..." : "Rafraîchir"}
                  </button>
                </div>
                <p className="font-bold">SMS de la transaction :</p>
                <textarea
                  value={sms}
                  onChange={(e) => setSms(e.target.value.slice(0, 1000))}
                  disabled={sent}
                  rows={3}
                  placeholder="Collez ici le SMS reçu de Wave…"
                  className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Après l&apos;envoi du SMS, la recharge reste en cours jusqu&apos;à la vérification du versement par
                  l&apos;administrateur.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-4">
              <span className="grid size-9 place-items-center rounded-full bg-secondary"><Smartphone className="size-4" /></span>
              <div>
                <p className="text-sm text-muted-foreground">Votre compte de paiement :</p>
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
    <button type="button" onClick={onClick} aria-label="Copier" className="grid size-11 place-items-center rounded-xl border border-border">
      <Copy className="size-4" />
    </button>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-primary">{value}</p>
      </div>
      <CopyBtn onClick={onCopy} />
    </div>
  );
}
