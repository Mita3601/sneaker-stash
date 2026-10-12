import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChartNoAxesCombined, ChevronRight, CreditCard, Eye, EyeOff, FilePenLine, Headset, Info, KeyRound, PlayCircle, Power, ShieldCheck } from "lucide-react";
import { useState } from "react";

import hero from "@/assets/dior-auth.jpg";
import { Btn } from "@/components/ui-kit";
import { useIsAdmin, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/me")({
  head: () => ({ meta: [
    { title: "Mon compte — Dior Parfums" },
    { name: "description", content: "Consultez votre solde, vos recharges, vos retraits et les paramètres de votre compte Dior." },
    { property: "og:title", content: "Mon compte — Dior Parfums" },
    { property: "og:description", content: "Votre solde et vos historiques de paiement réunis dans votre compte." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Me,
});

const groups = [
  [
    { to: "/app/account-details", label: "Détails du financement", icon: ChartNoAxesCombined },
    { to: "/app/recharge-history", label: "Historique des recharges", icon: FilePenLine },
    { to: "/app/withdraw-history", label: "Registres de retrait", icon: FilePenLine },
    { to: "/app/add-bank", label: "Gestion de compte bancaire", icon: CreditCard },
  ],
  [
    { to: "/app/about", label: "À propos de nous", icon: Info },
    { to: "/app/regulation", label: "Règles de la plateforme", icon: PlayCircle },
    { to: "/app/support", label: "Service client", icon: Headset },
    { to: "/app/change-password", label: "Modifier le mot de passe", icon: KeyRound },
  ],
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
      <header className="relative m-3 overflow-hidden text-primary-foreground">
        <img src={hero} alt="Collection de parfums Dior" width={1536} height={1024} className="h-64 w-full object-cover" />
        <div className="absolute inset-0 bg-primary-deep/65 p-5">
          <h1 className="sr-only">Mon compte</h1>
          <p className="text-sm">Numéro de téléphone</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-lg font-bold">{show ? profile?.phone : "•".repeat(10)}</p>
            <Btn variant="outline" className="min-h-8 border-0 bg-transparent p-1 text-primary-foreground shadow-none ring-0 hover:bg-primary-foreground/10" onClick={() => setShow((value) => !value)} aria-label={show ? "Masquer le numéro" : "Afficher le numéro"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Btn>
          </div>
          <div className="absolute bottom-9 left-5 right-5">
            <p className="text-sm">Solde du compte</p>
            <p className="mt-2 text-2xl font-bold">{fcfa(profile?.balance)}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 px-4 py-2">
        <Link to="/app/recharge" className="flex min-h-14 items-center justify-center rounded-md bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground">Recharger</Link>
        <Link to="/app/withdraw" className="flex min-h-14 items-center justify-center rounded-md bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground">Retrait</Link>
      </div>

      <div className="space-y-3 px-4 pb-5 pt-1">
        {groups.map((items, index) => (
          <div key={index} className="overflow-hidden rounded-md bg-muted">
            {items.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex min-h-14 items-center gap-4 px-5 py-4 transition hover:bg-secondary">
                <Icon className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
                <ChevronRight className="size-4 shrink-0" />
              </Link>
            ))}
            {index === 1 && <>
              {isAdmin && <Link to="/admin" className="flex min-h-14 items-center gap-4 px-5 py-4 hover:bg-secondary"><ShieldCheck className="size-5 shrink-0 text-muted-foreground" /><span className="flex-1 text-sm font-medium">Panneau administrateur</span><ChevronRight className="size-4" /></Link>}
              <Btn full variant="ghost" className="justify-start gap-4 rounded-none bg-transparent px-5 py-4 text-left text-sm font-medium normal-case tracking-normal shadow-none hover:bg-secondary" onClick={signOut}>
                <Power className="size-5 shrink-0 text-muted-foreground" /><span className="flex-1">Sortie sécurisée</span><ChevronRight className="size-4" />
              </Btn>
            </>}
          </div>
        ))}
      </div>
    </>
  );
}
