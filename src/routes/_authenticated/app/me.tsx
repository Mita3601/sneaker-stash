import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Gift,
  Headphones,
  KeyRound,
  LogOut,
  Info,
  Receipt,
  ScrollText,
  ShieldCheck,
  Trophy,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import hero from "@/assets/hero-banner.jpg";
import { Card, Field, inputClass } from "@/components/ui-kit";
import { useIsAdmin, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/me")({
  head: () => ({
    meta: [
      { title: "Mon compte — Nike" },
      {
        name: "description",
        content: "Solde, missions, historiques et paramètres de votre compte.",
      },
      { property: "og:title", content: "Mon compte — Nike" },
      {
        property: "og:description",
        content: "Gérez votre solde, vos retraits et vos comptes de paiement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Me,
});

const links = [
  { to: "/app/about", label: "À propos", icon: Info },
  { to: "/app/regulation", label: "Réglementation", icon: ShieldCheck },
  { to: "/app/history", label: "Historique", icon: ScrollText },
  { to: "/app/support", label: "Service client", icon: Headphones },
  { to: "/app/download", label: "Télécharger l’app", icon: Download },
  { to: "/app/add-bank", label: "Lier une carte bancaire", icon: CreditCard },
  { to: "/app/change-password", label: "Modifier le mot de passe", icon: KeyRound },
] as const;

const quickActions = [
  { to: "/app/recharge", label: "Recharger", icon: Wallet },
  { to: "/app/withdraw", label: "Retirer", icon: Gift },
  { to: "/app/history", label: "Historique", icon: Receipt },
] as const;

const groupedLinks = [
  {
    title: "Découvrir",
    items: [
      { to: "/app/about", label: "À propos", icon: Info },
      { to: "/app/regulation", label: "Réglementation", icon: ShieldCheck },
      { to: "/app/support", label: "Service client", icon: Headphones },
    ],
  },
  {
    title: "Compte",
    items: [
      { to: "/app/download", label: "Télécharger l’app", icon: Download },
      { to: "/app/add-bank", label: "Lier une carte bancaire", icon: CreditCard },
      { to: "/app/change-password", label: "Modifier le mot de passe", icon: KeyRound },
    ],
  },
] as const;

function Me() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const [show, setShow] = useState(false);
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  async function redeemGiftCode() {
    if (!giftCode.trim()) {
      toast.error("Entrez un code cadeau");
      return;
    }
    setIsRedeeming(true);
    const { data, error } = await supabase.rpc("claim_gift_code", { _code: giftCode });
    setIsRedeeming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Bonus reçu : +${fcfa((data as { amount?: number })?.amount ?? 0)}`);
    setGiftCode("");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <>
      <header className="relative overflow-hidden rounded-b-[2rem]">
        <img
          src={hero}
          alt="Sneakers premium"
          width={1088}
          height={608}
          className="h-[16rem] w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.22)_0%,rgba(2,6,23,0.45)_42%,rgba(2,6,23,0.86)_100%)] p-3 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-primary-foreground/70">
                Mon compte
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="text-base font-semibold tracking-wide">
                  {show ? profile?.phone : "•".repeat(10)}
                </p>
                <button
                  onClick={() => setShow((v) => !v)}
                  className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/20"
                  aria-label={show ? "Masquer le numéro" : "Afficher le numéro"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-primary-foreground/80">Numéro de téléphone</p>
            </div>

            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              Compte actif
            </div>
          </div>

          <div className="mt-8 rounded-[1.25rem] border border-white/15 bg-white/10 p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/75">
              Solde du compte
            </p>
            <p className="mt-1.5 text-[2.6rem] font-black leading-none tracking-tight">
              {fcfa(profile?.balance)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        {quickActions.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[1.4rem] bg-gradient-to-br from-primary via-sky-500 to-cyan-400 px-3 py-4 text-center text-sm font-bold text-primary-foreground shadow-[0_14px_32px_rgba(0,82,255,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(0,82,255,0.24)]">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Icon className="size-5" />
              </span>
              {label}
            </div>
          </Link>
        ))}
      </div>

      <div className="px-4 pb-4 pt-4">
        {!showGiftForm ? (
          <button
            type="button"
            className="w-full rounded-3xl bg-gradient-primary px-5 py-4 text-center text-sm font-semibold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
            onClick={() => setShowGiftForm(true)}
          >
            Gagner des cadeaux
          </button>
        ) : (
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-extrabold text-foreground">Code cadeau</p>
              <p className="text-xs text-muted-foreground">
                Votre document de référence cadeau pour recevoir un bonus instantané.
              </p>
            </div>
            <div className="space-y-3">
              <Field label="Code cadeau">
                <input
                  type="text"
                  value={giftCode}
                  onChange={(event) => setGiftCode(event.target.value.toUpperCase())}
                  placeholder="EX: APPLECFD"
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
                disabled={isRedeeming || !giftCode.trim()}
                onClick={redeemGiftCode}
              >
                {isRedeeming ? "Validation..." : "Confirmer"}
              </button>
            </div>
          </Card>
        )}
      </div>

      <div className="px-4 pb-4 pt-4">
        <Card className="relative overflow-hidden border-0 p-0 text-primary-foreground shadow-[0_18px_45px_rgba(10,15,35,0.22)]">
          <img
            src={hero}
            alt="Centre des missions"
            width={1088}
            height={608}
            className="h-40 w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.68)_48%,rgba(15,23,42,0.18)_100%)]" />
          <div className="absolute inset-0 flex items-end justify-between gap-3 p-4">
            <div className="max-w-[68%]">
              <p className="text-xs uppercase tracking-[0.32em] text-primary-foreground/70">
                Bonus et tâches
              </p>
              <p className="mt-2 text-[1.75rem] font-black leading-[0.95]">Centre des missions</p>
              <p className="mt-2 text-sm text-primary-foreground/88">
                Accomplissez des missions et obtenez des bonus généreux.
              </p>
            </div>
            <Link to="/app/missions" className="shrink-0">
              <div className="rounded-[1.35rem] border border-white/20 bg-white/92 px-4 py-4 text-center text-sm font-bold text-slate-900 shadow-xl backdrop-blur-sm transition hover:scale-[1.02]">
                <Trophy className="mx-auto size-5 text-primary" />Y aller -&gt;
              </div>
            </Link>
          </div>
        </Card>
      </div>

      <div className="space-y-4 px-4 pb-6 pt-2">
        {groupedLinks.map((group) => (
          <div key={group.title} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {group.title}
              </p>
            </div>
            <Card className="divide-y divide-border/70 p-0 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              {group.items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-4 py-4 transition hover:bg-secondary/50"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-400/10 text-primary ring-1 ring-primary/10">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </Card>
          </div>
        ))}

        <Card className="divide-y divide-border/70 p-0 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          {isAdmin ? (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-4 transition hover:bg-secondary/50"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-400/10 text-primary ring-1 ring-primary/10">
                <ShieldCheck className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">Panneau administrateur</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ) : null}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-destructive/5"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <LogOut className="size-4" />
            </span>
            <span className="flex-1 text-sm font-semibold text-destructive">Déconnexion</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </Card>
      </div>
    </>
  );
}
