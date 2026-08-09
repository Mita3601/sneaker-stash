import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Btn, Card, Empty, StatTile } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, maskPhone, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({
    meta: [
      { title: "Mon équipe — Nike" },
      {
        name: "description",
        content: "Partagez votre code de parrainage et gagnez 27 %, 2 % et 1 % sur 3 niveaux.",
      },
      { property: "og:title", content: "Mon équipe — Nike" },
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
  const [showDetail, setShowDetail] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);

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

  const { data: commissions = 0 } = useQuery({
    queryKey: ["commissions-total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "commission")
        .eq("status", "approved");
      if (error) throw error;
      return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
    },
  });

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/register?ref=${profile?.referral_code ?? ""}`
      : "";

  const counts = [team?.l1.length ?? 0, team?.l2.length ?? 0, team?.l3.length ?? 0];
  const members = [
    ...(team?.l1 ?? []).map((m) => ({ ...m, level: 1 })),
    ...(team?.l2 ?? []).map((m) => ({ ...m, level: 2 })),
    ...(team?.l3 ?? []).map((m) => ({ ...m, level: 3 })),
  ];

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-extrabold">Mon équipe</h1>
        <div>
          <Btn
            variant="ghost"
            className="px-3 py-2 text-xs"
            onClick={() => setShowDetail((s) => !s)}
          >
            Mon équipe
          </Btn>
        </div>
      </header>

      {showDetail ? (
        <div className="space-y-3 p-4">
          <Card className="rounded-2xl p-4 bg-gradient-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs">Bonus reçus</p>
                <p className="mt-1 text-2xl font-black">{fcfa(commissions)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs">Personnes invitées</p>
                <p className="mt-1 text-2xl font-black">{counts.reduce((a, b) => a + b, 0)}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  selectedLevel === level
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white/5 text-muted-foreground"
                }`}
              >
                Niveau {level}
                <br />
                {counts[level - 1]} invité
              </button>
            ))}
          </div>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Filleuls niveau {selectedLevel}</p>
                <p className="text-xs text-muted-foreground">
                  {counts[selectedLevel - 1]} membre(s)
                </p>
              </div>
            </div>

            {(() => {
              const selectedMembers =
                selectedLevel === 1
                  ? (team?.l1 ?? [])
                  : selectedLevel === 2
                    ? (team?.l2 ?? [])
                    : (team?.l3 ?? []);
              return selectedMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{maskPhone(m.phone)}</p>
                    <p className="text-xs text-muted-foreground">
                      Niveau {selectedLevel} · {shortDate(m.created_at)}
                    </p>
                    {m.firstPurchasePrice != null ? (
                      <p className="text-xs text-muted-foreground">
                        1er achat : {fcfa(m.firstPurchasePrice)}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {fcfa(m.firstPurchasePrice ?? m.total_deposits)}
                  </span>
                </div>
              ));
            })()}

            {(() => {
              const selectedMembers =
                selectedLevel === 1
                  ? (team?.l1 ?? [])
                  : selectedLevel === 2
                    ? (team?.l2 ?? [])
                    : (team?.l3 ?? []);
              return selectedMembers.length === 0 ? (
                <div className="mt-8 text-center">
                  <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-primary text-white">
                    <UserPlus className="size-10" />
                  </div>
                  <p className="text-sm text-muted-foreground">Tout à ce niveau pour le moment</p>
                  <div className="mt-4">
                    <Btn onClick={() => copy(link, "Lien")}>Inviter des amis</Btn>
                  </div>
                </div>
              ) : null;
            })()}
          </Card>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xl font-extrabold tracking-widest">{profile?.referral_code}</p>
                <p className="text-xs text-muted-foreground">Code d'invitation</p>
              </div>
              <Btn
                className="px-3 py-2 text-xs"
                onClick={() => copy(profile?.referral_code ?? "", "Code")}
              >
                <Copy className="size-4" /> Copier
              </Btn>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="truncate text-xs text-muted-foreground">{link}</p>
              <Btn
                variant="ghost"
                className="shrink-0 px-3 py-2 text-xs"
                onClick={() => copy(link, "Lien")}
              >
                Copier le lien
              </Btn>
            </div>
          </Card>

          <Card className="p-0">
            <div className="grid grid-cols-3 rounded-t-2xl bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground">
              <span>Commission</span>
              <span className="text-center">Invités</span>
              <span className="text-right">Niveau</span>
            </div>
            {LEVELS.map((l, i) => (
              <div
                key={l.level}
                className="grid grid-cols-3 border-t border-border px-3 py-3 text-sm"
              >
                <span className="font-semibold">{l.rate}</span>
                <span className="text-center">{counts[i]}</span>
                <span className="text-right text-muted-foreground">Niveau {l.level}</span>
              </div>
            ))}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Nombre d'invités" value={counts.reduce((a, b) => a + b, 0)} />
            <StatTile label="Revenus sollicités" value={fcfa(commissions)} />
          </div>

          <Card className="bg-gradient-deep text-primary-foreground">
            <p className="text-sm">
              Lorsqu'un ami que vous invitez s'inscrit et investit, vous recevez immédiatement une
              prime de 27 % du montant de son investissement. Niveau 2 : 2 %. Niveau 3 : 1 %. La
              prime est créditée instantanément et retirable.
            </p>
          </Card>

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
                    {fcfa(m.firstPurchasePrice ?? m.total_deposits)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </>
  );
}
