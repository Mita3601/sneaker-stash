import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import hero from "@/assets/dior-auth.jpg";
import { Empty, StatTile } from "@/components/ui-kit";
import { useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, nextClaimAt, PERFUME_IMAGES, PERFUME_NAMES } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/my-products")({
  head: () => ({
    meta: [
      { title: "Mes parfums — Dior" },
      {
        name: "description",
        content: "Suivez vos parfums actifs et vos revenus quotidiens.",
      },
      { property: "og:title", content: "Mes parfums — Dior" },
      {
        property: "og:description",
        content: "Vos parfums achetés et leurs revenus quotidiens automatiques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyProducts,
});

function MyProducts() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["my-products", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const userId = profile?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_products")
        .select("*, products(*)")
        .eq("user_id", userId)
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

  const earned = items.reduce((sum, i) => sum + Number(i.total_earned ?? 0), 0);

  return (
    <>
      <header className="m-3 overflow-hidden rounded-sm">
        <h1 className="sr-only">Mes parfums</h1>
        <img
          src={hero}
           alt="Collection de parfums Dior"
           width={1536}
           height={1024}
          className="aspect-[16/9] w-full object-cover"
        />
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 py-2">
        <StatTile label="Quantité achetée" value={items.length} />
        <StatTile label="Mes revenus" value={fcfa(earned)} />
      </div>

      <section className="divide-y divide-border px-4 pb-6">
        {items.length === 0 ? (
          <Empty
            title="Aucun parfum pour le moment"
            text="Sélectionnez un parfum dans la collection pour commencer à générer des revenus."
          />
        ) : (
          items.map((item) => {
            return (
              <article key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 py-5">
                <img
                  src={PERFUME_IMAGES[item.products?.vip_level ?? "VIP1"]}
                   alt={PERFUME_NAMES[item.products?.vip_level ?? "VIP1"] ?? "Parfum"}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="mt-1 size-16 rounded-sm object-cover"
                />
                <div className="min-w-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <h2 className="min-w-0 font-sans text-sm font-bold">{item.products?.vip_level ?? item.products?.name}</h2>
                    <span className="shrink-0 text-sm font-bold">{fcfa(item.products?.price)}</span>
                  </div>
                  <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
                    <p>Revenu quotidien : {fcfa(item.products?.daily_yield)}</p>
                    <p>Revenu total : {fcfa(item.products?.total_yield)}</p>
                    <p>Période de validité : {item.products?.duration_days ?? "—"} jours</p>
                    <p>Heure d'achat : {new Date(item.purchase_date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
