import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  Copy,
  Download,
  FilePenLine,
  Gift,
  Headset,
  Info,
  KeyRound,
  PlayCircle,
  Power,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import hero from "@/assets/dior-auth.jpg";
import { Btn } from "@/components/ui-kit";

import { useIsAdmin, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/me")({
  head: () => ({
    meta: [
      { title: "Mon compte — Dior Parfums" },
      {
        name: "description",
        content:
          "Consultez votre solde, vos recharges, vos retraits et les paramètres de votre compte Dior.",
      },
      { property: "og:title", content: "Mon compte — Dior Parfums" },
      {
        property: "og:description",
        content: "Votre solde et vos historiques de paiement réunis dans votre compte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
    { to: "/app/download", label: "Télécharger l'app", icon: Download },
    { to: "/app/missions", label: "Cadeaux & missions", icon: Gift },
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

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <>
      <header className="relative overflow-hidden text-primary-foreground">
        <img
          src={hero}
          alt="Collection de parfums Dior"
          width={1536}
          height={1024}
          className="h-[267px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary-deep/50 px-3 py-8">
          <h1 className="sr-only">Mon compte</h1>
          <p className="text-base">Numéro de téléphone</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xl font-bold">{profile?.phone || "—"}</p>
            <Btn
              variant="outline"
              title="Copier le numéro"
              className="min-h-8 border-0 bg-transparent p-1 text-primary-foreground shadow-none ring-0"
              onClick={async () => {
                if (!profile?.phone) return;
                try {
                  await navigator.clipboard.writeText(profile.phone);
                  toast.success("Numéro copié");
                } catch {
                  toast.error("Impossible de copier le numéro");
                }
              }}
              aria-label="Copier le numéro"
            >
              <Copy className="size-5" />
            </Btn>
          </div>
          <div className="absolute bottom-16 left-3 right-3">
            <p className="text-base">Solde du compte</p>
            <p className="mt-1 text-xl font-bold">
              <span className="text-base">FCFA </span>
              <span className="text-3xl">
                {new Intl.NumberFormat("fr-FR").format(Number(profile?.balance ?? 0))}
              </span>
            </p>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 px-1.5 pb-2 pt-5">
        <Link
          to="/app/recharge"
          className="flex h-[73px] items-center justify-center rounded-md bg-gradient-actions text-base font-bold text-primary-foreground"
        >
          Recharger
        </Link>
        <Link
          to="/app/withdraw"
          className="flex h-[73px] items-center justify-center rounded-md bg-gradient-actions text-base font-bold text-primary-foreground"
        >
          Retrait
        </Link>
      </div>

      <div className="space-y-6 px-1.5 pb-5 pt-1">
        {groups.map((items, index) => (
          <div key={index} className="overflow-hidden rounded-md bg-muted">
            {items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-[61px] items-center gap-7 px-8 py-4 transition hover:bg-secondary"
              >
                <Icon className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 text-base font-normal">{label}</span>
                <ChevronRight className="size-4 shrink-0" />
              </Link>
            ))}
            {index === 1 && (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex min-h-[61px] items-center gap-7 px-8 py-4 hover:bg-secondary"
                  >
                    <ShieldCheck className="size-6 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-base font-normal">Panneau administrateur</span>
                    <ChevronRight className="size-4" />
                  </Link>
                )}
                <Btn
                  full
                  variant="ghost"
                  className="justify-start gap-4 rounded-none bg-transparent px-5 py-4 text-left text-base font-normal normal-case tracking-normal shadow-none hover:bg-secondary"
                  onClick={signOut}
                >
                  <Power className="size-6 shrink-0 text-muted-foreground" />
                  <span className="flex-1">Sortie sécurisée</span>
                  <ChevronRight className="size-4" />
                </Btn>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
