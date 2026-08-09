import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import hero from "@/assets/hero-banner.jpg";
import { Card, Empty, StatTile } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { countdown, fcfa, nextClaimAt, SNEAKER_IMAGES, shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/my-products")({
  head: () => ({
    meta: [
      { title: "Mes paires — Nike" },
      {
        name: "description",
        content: "Suivez vos paires actives et réclamez vos revenus quotidiens.",
      },
      { property: "og:title", content: "Mes paires — Nike" },
      {
        property: "og:description",
        content: "Revenus quotidiens à réclamer toutes les 24 heures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyProducts,
});

function MyProducts() {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["my-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_products")
        .select("*, products(*)")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const claim = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("claim_yield", { _user_product_id: id });
      if (error) throw error;
      return data as { gain: number };
    },
    onSuccess: (data) => {
      toast.success(`${fcfa(data?.gain)} crédités sur votre solde`);
      qc.invalidateQueries({ queryKey: ["my-products"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (_error: Error) => {
      // ignore individual auto-claim failures, they may simply be not ready yet
    },
  });

  const autoClaimedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const readyItems = items.filter(
      (item) =>
        item.status === "active" &&
        nextClaimAt(item.last_claim_date, item.purchase_date) <= now &&
        !autoClaimedRef.current.has(item.id),
    );

    if (readyItems.length === 0) return;

    let aborted = false;
    const process = async () => {
      for (const item of readyItems) {
        if (aborted) return;
        try {
          await claim.mutateAsync(item.id);
        } catch {
          // ignore errors to avoid interrupting auto processing
        } finally {
          autoClaimedRef.current.add(item.id);
        }
      }
    };

    process();
    return () => {
      aborted = true;
    };
  }, [items, now, claim]);

  const active = items.filter((i) => i.status === "active");
  const dailyTotal = active.reduce((sum, i) => sum + Number(i.products?.daily_yield ?? 0), 0);
  const earned = items.reduce((sum, i) => sum + Number(i.total_earned ?? 0), 0);

  return (
    <>
      <header className="relative overflow-hidden text-primary-foreground">
        <img
          src={hero}
          alt="Sneakers Nike en fond"
          width={1088}
          height={608}
          className="h-44 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-deep/70" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 py-5">
          <p className="text-2xl font-extrabold">{fcfa(dailyTotal)}</p>
          <p className="text-xs opacity-90">Les revenus quotidiens générés par mes paires</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <StatTile label="Nombre de paires" value={items.length} />
        <StatTile label="Mes revenus" value={fcfa(earned)} />
      </div>

      <section className="space-y-3 px-4 pb-6">
        {items.length === 0 ? (
          <Empty
            title="Aucune paire pour le moment"
            text="Achetez une paire dans le catalogue pour commencer à générer des revenus."
          />
        ) : (
          items.map((item) => {
            const ready = nextClaimAt(item.last_claim_date, item.purchase_date) <= now;
            return (
              <Card key={item.id} className="flex gap-3">
                <img
                  src={SNEAKER_IMAGES[item.products?.vip_level ?? "VIP1"]}
                  alt={item.products?.name ?? "Paire"}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="size-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{item.products?.name}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-primary">
                      {item.products?.vip_level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Acheté le {shortDate(item.purchase_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gagné : {fcfa(item.total_earned)} / {fcfa(item.products?.total_yield)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary">
                      {item.status === "completed"
                        ? "Terminé"
                        : ready
                          ? `Crédit automatique + ${fcfa(item.products?.daily_yield)}`
                          : countdown(nextClaimAt(item.last_claim_date, item.purchase_date) - now)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>
    </>
  );
}
