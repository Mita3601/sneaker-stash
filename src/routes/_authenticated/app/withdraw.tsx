import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn } from "@/components/ui-kit";
import { FinanceHeader, financeButton } from "@/components/FinanceLayout";
import hero from "@/assets/dior-hero.jpg";
import { useCurrentUser, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, WITHDRAW_FEE_RATE, WITHDRAW_MIN } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/withdraw")({
  head: () => ({
    meta: [
      { title: "Retrait — Dior Parfums" },
      {
        name: "description",
        content: "Demandez un retrait dès 1 000 FCFA vers votre compte mobile money.",
      },
      { property: "og:title", content: "Retrait — Dior Parfums" },
      { property: "og:description", content: "Retraits 24/7, frais de 15 %." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Withdraw,
});

function Withdraw() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: user } = useCurrentUser();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const selected = accountId || accounts[0]?.id || "";
  const value = Number(amount || 0);
  const fee = Math.round(value * WITHDRAW_FEE_RATE);

  const { data: hasPurchased = false } = useQuery({
    queryKey: ["has-purchased-product", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return false;
      const { count, error } = await supabase
        .from("user_products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_withdrawal", {
        _amount: value,
        _bank_account_id: selected,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande de retrait envoyée");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["bank-accounts", user?.id] });
      qc.invalidateQueries({ queryKey: ["has-purchased-product", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error("Ajoutez d'abord un compte de retrait");
      return;
    }
    if (value < WITHDRAW_MIN) {
      toast.error(`Le montant minimum est de ${fcfa(WITHDRAW_MIN)}`);
      return;
    }
    if (value > Number(profile?.balance ?? 0)) {
      toast.error("Solde insuffisant");
      return;
    }
    if (!hasPurchased) {
      toast.error("Vous devez sélectionner au moins un parfum avant de demander un retrait");
      return;
    }
    submit.mutate();
  }

  return (
    <div className="finance-page">
      <FinanceHeader title="Retrait" info="withdraw-instructions" />
      <div className="px-5 pb-10 pt-3">
        <section className="relative aspect-[1.78] overflow-hidden rounded-md">
          <img src={hero} alt="Parfums Dior" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-primary-deep/35 text-primary-foreground"><div className="absolute right-3 top-3 text-right"><p className="text-base font-bold">Solde du compte</p><p className="mt-2 text-base">FCFA <span className="text-3xl font-bold">{new Intl.NumberFormat("fr-FR").format(Number(profile?.balance ?? 0))}</span></p></div></div>
        </section>
        <form onSubmit={onSubmit} className="mt-5">
          <label className="block text-lg font-bold" htmlFor="withdraw-account">Compte de retrait</label>
          <select id="withdraw-account" value={selected} onChange={(e) => setAccountId(e.target.value)} className="mt-4 h-14 w-full rounded-md border border-border bg-card px-3 text-sm shadow-card">
            {accounts.length === 0 && <option value="">Sélectionnez le compte portefeuille de retrait</option>}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.provider} · {a.account_number}</option>)}
          </select>
          {accounts.length === 0 && <Link to="/app/add-bank" className="mt-2 block text-sm text-primary underline">Ajouter un compte de retrait</Link>}
          <div className="mb-5 mt-6 flex items-center justify-between gap-2"><label htmlFor="withdraw-amount" className="text-lg font-bold">Montant du retrait</label><span className="text-sm font-bold">Frais : {WITHDRAW_FEE_RATE * 100} %</span></div>
          <div className="flex h-14 items-center gap-4 px-4"><span>FCFA</span><input id="withdraw-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Veuillez choisir le montant du retrait" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" /></div>
          <p className="mt-5 text-sm">Montant reçu: FCFA {new Intl.NumberFormat("fr-FR", {minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.max(value-fee,0))}</p>
          <p className="mt-2 text-center text-sm text-accent">Minimum : {fcfa(WITHDRAW_MIN)} · 2 retraits par jour · Un achat requis.</p>
          <Btn full className={`${financeButton} mt-8`} disabled={submit.isPending}>{submit.isPending ? "Envoi..." : "Retirer de l'argent maintenant"}</Btn>
        </form>
        <section id="withdraw-instructions" className="finance-instructions mt-16 px-2">
          <h2 className="text-lg font-bold">Instructions de retrait</h2>
          <ol className="mt-6 list-decimal space-y-4 pl-4 text-sm leading-relaxed">
            <li>Vous devez avoir acheté au moins un parfum avant de demander un retrait.</li>
            <li>Le minimum de retrait est de {fcfa(WITHDRAW_MIN)}. Les demandes sont ouvertes 24 h sur 24, avec un maximum de 2 retraits par jour.</li>
            <li>Les frais sont de {WITHDRAW_FEE_RATE * 100} %. Le montant net est indiqué avant confirmation.</li>
            <li>La demande est transmise à l'administration pour versement manuel. Son enregistrement ne signifie pas que le versement a déjà été effectué.</li>
            <li>Veuillez saisir correctement les informations de votre compte de retrait : toute information incorrecte entraînera l'échec du retrait.</li>
            <li>Le montant demandé doit être disponible sur votre solde. Il est réservé pendant le traitement et libéré si la demande est refusée.</li>
          </ol>
          <p className="mt-9 text-xs leading-relaxed text-muted-foreground">Retrait minimum : {fcfa(WITHDRAW_MIN)}. Frais : {WITHDRAW_FEE_RATE * 100} %. Un achat et un solde disponible suffisant sont nécessaires. Consultez l'historique pour suivre votre demande.</p>
          <Link to="/app/withdraw-history" className="mt-6 block text-sm text-muted-foreground underline">Historique des retraits</Link>
        </section>
      </div>
    </div>
  );
}
