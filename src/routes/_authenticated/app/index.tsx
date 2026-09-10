import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Headphones, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import hero from "@/assets/dior-hero.jpg";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { Btn, Card } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, PERFUME_IMAGES, PERFUME_NAMES } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Collection de parfums — Dior" },
      {
        name: "description",
        content: "Sélectionnez votre parfum Dior et percevez un revenu quotidien.",
      },
      { property: "og:title", content: "Collection privée — Dior" },
      { property: "og:description", content: "Neuf fragrances et des revenus quotidiens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Products,
});

function Products() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("price");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const buy = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.rpc("purchase_product", { _product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Achat réussi — votre parfum génère déjà du revenu");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const claimCheckin = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_daily_checkin");
      if (error) throw error;
      return data as { reward?: number };
    },
    onSuccess: (data) => {
      toast.success(`Rituel validé : +${fcfa(data?.reward ?? 100)}`);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const lastCheckinMs = profile?.last_checkin_at ? new Date(profile.last_checkin_at).getTime() : 0;
  const nextCheckinAt = lastCheckinMs ? lastCheckinMs + 24 * 60 * 60 * 1000 : 0;
  const remaining = Math.max(0, nextCheckinAt - now);
  const canCheckIn = Boolean(profile?.id) && (!profile?.last_checkin_at || remaining === 0);
  const checkinDays = profile?.checkin_count ?? 0;

  return (
    <>
      <AnnouncementModal />
      <section className="relative h-[460px] overflow-hidden text-primary-foreground">
        <img
          src={hero}
          alt="Parfum couture dans une lumière dorée"
          width={1024}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary-deep)_35%,transparent)_0%,transparent_42%,var(--primary-deep)_92%)]" />
        <header className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-7">
          <div>
            <h1 className="text-4xl font-medium">DIOR</h1>
            <p className="text-[8px] uppercase tracking-[0.28em] text-primary-foreground/65">Collection privée</p>
          </div>
          <div className="border border-primary-foreground/25 bg-primary-deep/45 px-3 py-2 text-right backdrop-blur-md">
            <p className="text-[8px] uppercase tracking-[0.18em] text-primary-foreground/60">Votre solde</p>
            <p className="text-sm font-bold text-accent">{fcfa(profile?.balance)}</p>
          </div>
        </header>
        <div className="absolute inset-x-0 bottom-8 px-6">
          <p className="text-[9px] uppercase tracking-[0.3em] text-accent">L’art de la matière</p>
          <h2 className="mt-3 text-4xl font-medium italic leading-none">Une collection rare,<br />un revenu quotidien</h2>
        </div>
      </section>

      <section className="grid grid-cols-3 border-b border-border bg-card">
        {[
          { to: "/app/recharge", label: "Recharger", icon: Wallet },
          { to: "/app/withdraw", label: "Retirer", icon: TrendingUp },
          { to: "/app/support", label: "Conciergerie", icon: Headphones },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="border-r border-border px-2 py-5 text-center last:border-r-0">
            <Icon className="mx-auto size-4 text-accent" strokeWidth={1.5} />
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span>
          </Link>
        ))}
      </section>

      <section className="px-5 py-8">
        <Card className="border-l-2 border-l-accent bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Rituel quotidien</p>
              <p className="mt-2 font-display text-3xl font-medium">Jour {checkinDays}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canCheckIn ? "Votre récompense de 100 FCFA est disponible." : `Prochain rituel dans ${new Date(remaining).toISOString().slice(11, 19)}`}
              </p>
            </div>
            <Btn className="shrink-0 px-4" disabled={!canCheckIn || claimCheckin.isPending} onClick={() => claimCheckin.mutate()}>
              <CalendarCheck className="size-4" />
              {claimCheckin.isPending ? "Validation" : "Pointer"}
            </Btn>
          </div>
        </Card>
      </section>

      <section className="px-5 pb-8">
        <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Les fragrances</p>
            <h2 className="mt-1 text-4xl font-medium">La collection</h2>
          </div>
          <span className="pb-1 text-xs text-muted-foreground">01 — 09</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 animate-pulse bg-secondary" />)
            : products.map((p, index) => {
                const level = p.vip_level ?? "VIP1";
                return (
                  <article key={p.id} className={index % 2 ? "mt-8" : ""}>
                    <div className="relative overflow-hidden bg-card ring-1 ring-border">
                      <img
                        src={PERFUME_IMAGES[level]}
                        alt={`Flacon ${PERFUME_NAMES[level] ?? p.name}`}
                        loading="lazy"
                        width={768}
                        height={768}
                        className="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-[1.03]"
                      />
                      <span className="absolute left-2 top-2 bg-primary/85 px-2 py-1 text-[8px] font-bold text-primary-foreground backdrop-blur">{level}</span>
                    </div>
                    <div className="pt-3">
                      <h3 className="text-xl font-medium leading-none">{PERFUME_NAMES[level] ?? p.name}</h3>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Édition {p.name}</p>
                      <div className="mt-3 border-y border-border py-2 text-[11px]">
                        <div className="flex justify-between"><span className="text-muted-foreground">Par jour</span><strong className="text-accent-foreground">{fcfa(p.daily_yield)}</strong></div>
                        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Rendement</span><strong>{fcfa(p.total_yield)}</strong></div>
                      </div>
                      <p className="mt-3 font-display text-xl font-semibold">{fcfa(p.price)}</p>
                      <Btn
                        full
                        className="mt-2 min-h-9 px-2 py-2 text-[10px]"
                        disabled={!p.is_active || buy.isPending}
                        onClick={() => p.is_active && buy.mutate(p.id)}
                      >
                        {p.is_active ? "Sélectionner" : "Bientôt disponible"}
                      </Btn>
                    </div>
                  </article>
                );
              })}
        </div>
      </section>
    </>
  );
}