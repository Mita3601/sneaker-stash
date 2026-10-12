import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, UsersRound, Wallet } from "lucide-react";
import { toast } from "sonner";

import hero from "@/assets/dior-hero.jpg";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { Btn } from "@/components/ui-kit";
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
      <section className="relative h-[310px] overflow-hidden text-primary-foreground">
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
          <h2 className="mt-3 text-3xl font-medium italic leading-none">Une collection rare,<br />un revenu quotidien</h2>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 px-4 py-4">
        {[
          { to: "/app/recharge", label: "Recharger", icon: CreditCard },
          { to: "/app/withdraw", label: "Retirer", icon: Wallet },
          { to: "/app/support", label: "Conciergerie", icon: UsersRound },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-md bg-gradient-primary px-1 py-4 text-center text-primary-foreground transition hover:opacity-90">
            <Icon className="size-6 text-accent" strokeWidth={2.5} />
            <span className="text-xs font-bold">{label}</span>
          </Link>
        ))}
      </section>

      <section className="px-4 pb-8">
        <h2 className="sr-only">La collection</h2>
        <div className="grid grid-cols-2 gap-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 animate-pulse bg-secondary" />)
            : products.map((p) => {
                const level = p.vip_level ?? "VIP1";
                return (
                  <article key={p.id} className="flex min-w-0 flex-col rounded-sm bg-card p-2.5 shadow-card ring-1 ring-border/60">
                    <h3 className="text-center font-sans text-base font-bold">{level}</h3>
                    <img src={PERFUME_IMAGES[level]} alt={`Flacon ${PERFUME_NAMES[level] ?? p.name}`} loading="lazy" width={768} height={768} className="mt-2 aspect-square w-full object-cover" />
                    <p className="mt-2 min-h-10 text-center font-display text-lg font-medium leading-5">{PERFUME_NAMES[level] ?? p.name}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="font-bold text-accent-foreground">{fcfa(p.daily_yield)}</p>
                      <p className="text-muted-foreground">Revenu quotidien</p>
                      <p className="pt-1 font-bold text-accent-foreground">{fcfa(p.total_yield)}</p>
                      <p className="text-muted-foreground">Revenu total</p>
                    </div>
                    <p className="mt-4 text-lg font-bold">{fcfa(p.price)}</p>
                    <div className="mt-auto flex justify-end pt-3">
                      <Btn className="min-h-8 px-3 py-2 text-[10px] tracking-normal" disabled={!p.is_active || buy.isPending} onClick={() => p.is_active && buy.mutate(p.id)}>
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