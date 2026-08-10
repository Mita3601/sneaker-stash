import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, TrendingUp, Wallet, CalendarCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import hero from "@/assets/hero-banner.jpg";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { Btn, Card } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, SNEAKER_IMAGES } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Catalogue de paires — Nike" },
      {
        name: "description",
        content: "Choisissez votre paire VIP et percevez un revenu quotidien sur toute sa durée.",
      },
      { property: "og:title", content: "Catalogue de paires — Nike" },
      {
        property: "og:description",
        content: "9 niveaux VIP, revenus quotidiens et retraits 24/7.",
      },
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
      toast.success("Achat réussi — votre paire génère déjà du revenu");
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
      toast.success(`Pointage validé: +${fcfa(data?.reward ?? 100)}`);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const lastCheckinMs = profile?.last_checkin_at ? new Date(profile.last_checkin_at).getTime() : 0;
  const nextFromLastCheckin = lastCheckinMs ? lastCheckinMs + 24 * 60 * 60 * 1000 : 0;
  const nextCheckinAt = Math.max(0, nextFromLastCheckin);
  const remaining = Math.max(0, nextCheckinAt - now);
  const canCheckIn = Boolean(profile?.id) && (profile?.last_checkin_at ? remaining === 0 : true);
  const checkinDays = profile?.checkin_count ?? 0;

  return (
    <>
      <AnnouncementModal />
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-extrabold">Nike</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
          {fcfa(profile?.balance)}
        </span>
      </header>

      <section className="p-4">
        <div className="relative overflow-hidden rounded-2xl">
          <img
            src={hero}
            alt="Sneakers premium sur fond bleu"
            width={1088}
            height={608}
            className="h-40 w-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-deep/50 p-4 text-primary-foreground">
            <p className="text-2xl font-extrabold">Nike</p>
            <p className="text-xs opacity-90">La technologie au service de vos revenus</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to="/app/recharge">
            <div className="rounded-2xl bg-gradient-primary p-3 text-center text-primary-foreground">
              <Wallet className="mx-auto size-5" />
              <span className="mt-1 block text-xs font-bold">Recharger</span>
            </div>
          </Link>
          <Link to="/app/withdraw">
            <div className="rounded-2xl bg-gradient-primary p-3 text-center text-primary-foreground">
              <TrendingUp className="mx-auto size-5" />
              <span className="mt-1 block text-xs font-bold">Retirer</span>
            </div>
          </Link>
          <Link to="/app/support">
            <div className="rounded-2xl bg-gradient-primary p-3 text-center text-primary-foreground">
              <Headphones className="mx-auto size-5" />
              <span className="mt-1 block text-xs font-bold">Support</span>
            </div>
          </Link>
        </div>

        <Card className="mt-4 border border-primary/15 bg-gradient-to-r from-primary/10 via-cyan-400/10 to-background">
          <div className="grid gap-5 sm:grid-cols-[1.6fr_auto] sm:items-center">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-extrabold text-foreground">Pointage quotidien</p>
                <p className="text-xs text-muted-foreground">
                  Tous les 24h, appuyez pour recevoir 100 FCFA.
                </p>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-5xl font-black text-primary">{checkinDays}</p>
                <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  jour{checkinDays > 1 ? "s" : ""} de pointage
                </span>
              </div>
              <p className="text-sm font-semibold text-primary">
                {canCheckIn
                  ? "Pointage disponible maintenant"
                  : `Prochain pointage dans ${new Date(remaining).toISOString().slice(11, 19)}`}
              </p>
            </div>

            <Btn
              className="shrink-0 rounded-full px-5 py-4 text-sm font-semibold"
              disabled={!canCheckIn || claimCheckin.isPending}
              onClick={() => claimCheckin.mutate()}
            >
              <CalendarCheck className="mr-2 inline-block size-4" />
              {claimCheckin.isPending ? "Validation..." : "Pointer"}
            </Btn>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4 pb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-56 animate-pulse bg-secondary" children={null} />
            ))
          : products.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <p className="text-center text-sm font-extrabold">{p.name}</p>
                <img
                  src={SNEAKER_IMAGES[p.vip_level ?? "VIP1"]}
                  alt={p.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="mx-auto my-2 aspect-square w-full rounded-xl object-cover"
                />
                <p className="text-sm font-bold text-primary">{fcfa(p.daily_yield)}</p>
                <p className="text-[11px] text-muted-foreground">Revenu quotidien</p>
                <p className="mt-1 text-sm font-bold text-primary">{fcfa(p.total_yield)}</p>
                <p className="text-[11px] text-muted-foreground">Revenu total</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">{fcfa(p.price)}</span>
                  {!p.is_active ? (
                    <Btn className="px-3 py-2 text-xs" disabled>
                      Bientôt disponible
                    </Btn>
                  ) : (
                    <Btn
                      className="px-3 py-2 text-xs"
                      disabled={buy.isPending}
                      onClick={() => buy.mutate(p.id)}
                    >
                      Acheter
                    </Btn>
                  )}
                </div>
              </Card>
            ))}
      </section>
    </>
  );
}
