import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import hero from "@/assets/dior-auth.jpg";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { HomeActions } from "@/components/HomeActions";
import { Btn } from "@/components/ui-kit";
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

  return (
    <>
      <AnnouncementModal />
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5">
        <h1 className="min-w-0 font-sans text-base font-bold">Page d’accueil</h1>
        <span className="shrink-0 font-display text-3xl font-semibold text-primary">DIOR</span>
      </header>
      <section className="mx-4 aspect-[16/9] overflow-hidden">
        <img
          src={hero}
          alt="Collection de parfums Dior"
          width={1536}
          height={1024}
          className="h-full w-full object-cover"
        />
      </section>

      <HomeActions />

      <section className="px-5 pb-8 pt-2">
        <h2 className="sr-only">La collection</h2>
        <div className="grid grid-cols-2 gap-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 animate-pulse bg-secondary" />)
            : products.map((p) => {
                const level = p.vip_level ?? "VIP1";
                return (
                  <article key={p.id} className="flex min-w-0 flex-col rounded-sm border border-border/50 bg-card p-1.5">
                    <h3 className="text-center font-sans text-sm font-bold">{level}</h3>
                    <img src={PERFUME_IMAGES[level]} alt={`Flacon ${PERFUME_NAMES[level] ?? p.name}`} loading="lazy" width={768} height={768} className="mt-1 aspect-[1.65] w-full object-cover" />
                    <div className="mt-2 space-y-0.5 text-[11px] leading-4">
                      <p className="font-bold text-product-income">{fcfa(p.daily_yield)}</p>
                      <p className="text-muted-foreground">Revenu quotidien</p>
                      <p className="pt-0.5 font-bold text-product-income">{fcfa(p.total_yield)}</p>
                      <p className="text-muted-foreground">Revenu total</p>
                    </div>
                    <p className="mt-3 text-base font-bold">{fcfa(p.price)}</p>
                    <div className="mt-auto flex justify-end pt-2">
                      <Btn className="min-h-6 px-2 py-1 text-[10px] tracking-normal" disabled={!p.is_active || buy.isPending} onClick={() => p.is_active && buy.mutate(p.id)}>
                        {p.is_active ? "Acheter" : "Bientôt disponible"}
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