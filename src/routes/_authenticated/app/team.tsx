import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Btn, Card, Empty } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, maskPhone, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({
    meta: [
      { title: "Mon cercle — Dior" },
      {
        name: "description",
        content: "Partagez votre code de parrainage et gagnez 27 %, 2 % et 1 % sur 3 niveaux.",
      },
      { property: "og:title", content: "Mon cercle — Dior" },
      {
        property: "og:description",
        content: "Commissions instantanées sur 3 niveaux de parrainage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Team,
});

const LEVELS = [
  { level: 1, rate: "27 %" },
  { level: 2, rate: "2 %" },
  { level: 3, rate: "1 %" },
];

function Team() {
  const { data: profile } = useProfile();

  const { data: team } = useQuery({
    queryKey: ["team", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data: l1 = [] } = await supabase
        .from("profiles")
        .select("id, phone, created_at, total_deposits")
        .eq("referred_by", profile!.id);
      const l1Ids = (l1 ?? []).map((p) => p.id);
      const { data: l2 = [] } = l1Ids.length
        ? await supabase
            .from("profiles")
            .select("id, phone, created_at, total_deposits")
            .in("referred_by", l1Ids)
        : { data: [] as typeof l1 };
      const l2Ids = (l2 ?? []).map((p) => p.id);
      const { data: l3 = [] } = l2Ids.length
        ? await supabase
            .from("profiles")
            .select("id, phone, created_at, total_deposits")
            .in("referred_by", l2Ids)
        : { data: [] as typeof l1 };
      const l3Ids = (l3 ?? []).map((p) => p.id);

      const allIds = [...l1Ids, ...l2Ids, ...l3Ids];
      const firstPurchasePriceByUser: Record<string, number> = {};
      if (allIds.length) {
        const { data: purchases = [] } = await supabase
          .from("user_products")
          .select("user_id, purchase_date, products(price)")
          .in("user_id", allIds)
          .order("purchase_date", { ascending: true });

        (purchases as Array<any>).forEach((purchase) => {
          if (!firstPurchasePriceByUser[purchase.user_id]) {
            firstPurchasePriceByUser[purchase.user_id] = Number(purchase.products?.price ?? 0);
          }
        });
      }

      const attachPrice = (profiles: Array<any>) =>
        profiles.map((profile) => ({
          ...profile,
          firstPurchasePrice: firstPurchasePriceByUser[profile.id] ?? null,
        }));

      return {
        l1: attachPrice(l1 ?? []),
        l2: attachPrice(l2 ?? []),
        l3: attachPrice(l3 ?? []),
      };
    },
  });

  const { data: commissionByLevel = [0, 0, 0] } = useQuery({
    queryKey: ["commissions-by-level", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const userId = profile?.id;
      if (!userId) return [0, 0, 0];
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, description")
        .eq("type", "commission")
        .eq("status", "approved")
        .eq("user_id", userId);
      if (error) throw error;
      const totals = [0, 0, 0];
      (data ?? []).forEach((t) => {
        const m = /niveau\s*([123])/i.exec(String(t.description ?? ""));
        const idx = m ? Number(m[1]) - 1 : 0;
        totals[idx] = (totals[idx] ?? 0) + Number(t.amount ?? 0);
      });
      return totals;
    },
  });
  const commissions = commissionByLevel.reduce((a, b) => a + b, 0);

  const referralCode = profile?.referral_code?.trim();
  const link =
    typeof window !== "undefined"
      ? referralCode
        ? `${window.location.origin}/auth/register?ref=${referralCode}`
        : `${window.location.origin}/auth/register`
      : "";

  const members = [
    ...(team?.l1 ?? []).map((m) => ({ ...m, level: 1 })),
    ...(team?.l2 ?? []).map((m) => ({ ...m, level: 2 })),
    ...(team?.l3 ?? []).map((m) => ({ ...m, level: 3 })),
  ];

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  }

  const valid = [team?.l1 ?? [], team?.l2 ?? [], team?.l3 ?? []].map(
    (list) => list.filter((m) => m.firstPurchasePrice != null).length,
  );
  const validTotal = valid.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-full space-y-4 bg-secondary p-3">
      <section className="space-y-3 rounded-md bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-widest text-foreground">
              {profile?.referral_code ?? "—"}
            </p>
            <p className="text-sm text-primary">Code d&apos;invitation</p>
          </div>
          <Btn className="w-28 shrink-0" onClick={() => copy(profile?.referral_code ?? "", "Code")}>
            Copie
          </Btn>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border-2 border-primary p-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{link}</p>
            <p className="mt-1 text-sm text-primary">Lien d&apos;invitation</p>
          </div>
          <Btn className="w-28 shrink-0" onClick={() => copy(link, "Lien")}>
            Copie
          </Btn>
        </div>
      </section>

      <section className="overflow-hidden rounded-md bg-gradient-primary text-primary-foreground">
        <div className="grid grid-cols-[1.4fr_1fr_0.7fr] gap-1 border-b border-primary-foreground/20 px-2 py-3 text-xs sm:text-sm">
          <span className="text-center">Taux de commission</span>
          <span className="text-center">Utilisateurs valides</span>
          <span className="text-center">Revenu</span>
        </div>
        {LEVELS.map((l, i) => (
          <div
            key={l.level}
            className="grid grid-cols-[1.4fr_1fr_0.7fr] gap-1 border-b border-primary-foreground/20 px-2 py-3 text-xs last:border-b-0 sm:text-sm"
          >
            <span className="text-center">
              Équipe de niveau {l.level} : {l.rate}
            </span>
            <span className="text-center">{valid[i]}</span>
            <span className="text-center">{Math.round(commissionByLevel[i] ?? 0).toLocaleString("en-US")}</span>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-gradient-deep px-2 py-4 text-center text-primary-foreground">
          <p className="text-lg">{validTotal}</p>
          <p className="text-sm">Utilisateurs valides</p>
        </div>
        <div className="rounded-md bg-gradient-deep px-2 py-4 text-center text-primary-foreground">
          <p className="text-lg">{fcfa(commissions)}</p>
          <p className="text-sm">Récompenses de parrainage</p>
        </div>
      </section>

      <section className="space-y-3 rounded-md bg-gradient-deep p-4 text-sm leading-relaxed text-primary-foreground/85">
        <h2 className="border-l-4 border-primary-foreground pl-3 font-sans text-lg text-primary-foreground">
          Bonus d&apos;invitation
        </h2>
        <p>
          Lorsqu&apos;un ami que vous avez invité s&apos;inscrit et effectue un investissement, vous
          recevez immédiatement une récompense en espèces équivalente à 27 % du montant de son
          investissement.
        </p>
        <p>
          Lorsque des membres de votre équipe de niveau 2 investissent, vous percevez une prime en
          espèces de 2 %.
        </p>
        <p>
          Lorsque des membres de votre équipe de niveau 3 investissent, vous percevez une prime en
          espèces de 1 %.
        </p>
        <p>
          Dès qu&apos;un membre de votre équipe effectue un investissement, la prime en espèces est
          instantanément créditée sur votre compte et vous pouvez la retirer immédiatement.
        </p>
      </section>

      {members.length === 0 ? (
        <Empty
          title="Aucun invité pour le moment"
          text="Partagez votre code pour construire votre équipe."
        />
      ) : (
        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-bold">
            <UserPlus className="size-4 text-primary" /> Mon réseau
          </p>
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border-t border-border pt-2 text-sm"
            >
              <div>
                <p className="font-semibold">{maskPhone(m.phone)}</p>
                <p className="text-xs text-muted-foreground">
                  Niveau {m.level} · {shortDate(m.created_at)}
                </p>
              </div>
              <span className="text-xs font-bold text-primary">
                {m.firstPurchasePrice != null ? fcfa(m.firstPurchasePrice) : "Aucun achat"}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
