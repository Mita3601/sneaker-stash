import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Headphones,
  KeyRound,
  LogOut,
  Receipt,
  ScrollText,
  ShieldCheck,
  Trophy,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import hero from "@/assets/hero-banner.jpg";
import { Card } from "@/components/ui-kit";
import { useIsAdmin, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/me")({
  head: () => ({
    meta: [
      { title: "Mon compte — NikeStake" },
      { name: "description", content: "Solde, missions, historiques et paramètres de votre compte." },
      { property: "og:title", content: "Mon compte — NikeStake" },
      { property: "og:description", content: "Gérez votre solde, vos retraits et vos comptes de paiement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Me,
});

const links = [
  { to: "/app/missions", label: "Récompenses pour les tâches", icon: Trophy },
  { to: "/app/account-details", label: "Détails du compte", icon: Receipt },
  { to: "/app/recharge-history", label: "Enregistrements de recharge", icon: ScrollText },
  { to: "/app/withdraw-history", label: "Registres de retrait", icon: ScrollText },
  { to: "/app/add-bank", label: "Gestion de compte bancaire", icon: CreditCard },
] as const;

const links2 = [
  { to: "/app/change-password", label: "Mot de passe", icon: KeyRound },
  { to: "/app/support", label: "Service client", icon: Headphones },
] as const;

function Me() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const [show, setShow] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <>
      <header className="relative overflow-hidden">
        <img
          src={hero}
          alt="Sneakers premium"
          width={1088}
          height={608}
          className="h-52 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-deep/70 p-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold tracking-wider">
              {show ? profile?.phone : "•".repeat(10)}
            </p>
            <button onClick={() => setShow((v) => !v)} className="rounded-full p-1.5 hover:bg-primary-foreground/10">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs opacity-80">Numéro de téléphone</p>
          <p className="mt-6 text-4xl font-extrabold">{fcfa(profile?.balance)}</p>
          <p className="text-xs opacity-80">Solde du compte</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 p-4">
        <Link to="/app/recharge">
          <div className="rounded-2xl bg-gradient-primary p-3 text-center text-sm font-bold text-primary-foreground">
            <Wallet className="mx-auto size-5" />
            Recharger
          </div>
        </Link>
        <Link to="/app/withdraw">
          <div className="rounded-2xl bg-gradient-primary p-3 text-center text-sm font-bold text-primary-foreground">
            <Gift className="mx-auto size-5" />
            Retrait
          </div>
        </Link>
        <Link to="/app/missions">
          <div className="rounded-2xl bg-gradient-primary p-3 text-center text-sm font-bold text-primary-foreground">
            <Trophy className="mx-auto size-5" />
            Missions
          </div>
        </Link>
      </div>

      <div className="space-y-3 px-4 pb-6">
        <Card className="divide-y divide-border p-0">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-4 py-4">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>

        <Card className="divide-y divide-border p-0">
          {links2.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-4 py-4">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          {isAdmin ? (
            <Link to="/admin" className="flex items-center gap-3 px-4 py-4">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                <ShieldCheck className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">Panneau administrateur</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ) : null}
          <button onClick={signOut} className="flex w-full items-center gap-3 px-4 py-4 text-left">
            <span className="grid size-9 place-items-center rounded-xl bg-destructive/10 text-destructive">
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
