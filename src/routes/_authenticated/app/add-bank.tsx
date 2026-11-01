import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Btn } from "@/components/ui-kit";
import { FinanceHeader, financeButton, financeInput } from "@/components/FinanceLayout";
import { useCurrentUser, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PROVIDERS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/add-bank")({
  head: () => ({
    meta: [
      { title: "Compte de retrait — Dior Parfums" },
      {
        name: "description",
        content: "Ajoutez et gérez les comptes mobile money utilisés pour vos retraits.",
      },
      { property: "og:title", content: "Compte de retrait — Dior Parfums" },
      {
        property: "og:description",
        content: "Enregistrez votre compte Wave, Orange, MTN ou Moov.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddBank,
});

function AddBank() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const [provider, setProvider] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

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

  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Veuillez vous connecter");
      const { error } = await supabase.from("bank_accounts").insert({
        user_id: user.id,
        provider,
        account_name: name.trim(),
        account_number: number.trim(),
        is_default: accounts.length === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte de retrait ajouté");
      setName("");
      setNumber("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const getProvidersForCountry = (countryCode: string | null | undefined) => {
    switch (countryCode) {
      case "+226":
        return ["Wave", "Orange", "Moov"];
      case "+237":
        return ["Moov", "Orange"];
      case "+225":
        return ["Moov", "Orange", "MTN", "Wave"];
      case "+229":
        return ["Moov", "Orange"];
      default:
        return PROVIDERS;
    }
  };

  const availableProviders = getProvidersForCountry(profile?.country_code);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Veuillez vous connecter");
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte supprimé");
      qc.invalidateQueries({ queryKey: ["bank-accounts", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!availableProviders.includes(provider)) {
      toast.error("Sélectionnez le type de portefeuille");
      return;
    }
    if (name.trim().length < 3) {
      toast.error("Renseignez le nom du titulaire");
      return;
    }
    if (number.replace(/\D/g, "").length < 8) {
      toast.error("Numéro de compte invalide");
      return;
    }
    add.mutate();
  }

  return (
    <div className="finance-page">
      {adding ? <>
        <FinanceHeader title="Ajouter un compte de retrait" />
        <form onSubmit={onSubmit} className="px-5 pt-9">
          <label className="block space-y-3"><span className="font-display text-xl">*Sélectionnez le type de portefeuille</span><select aria-label="Type de portefeuille" value={provider} onChange={(e) => setProvider(e.target.value)} className={financeInput}><option value="">Veuillez sélectionner</option>{availableProviders.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className="mt-7 block space-y-3"><span className="font-display text-xl">*Nom</span><input aria-label="Nom du titulaire" value={name} onChange={(e) => setName(e.target.value)} placeholder="Veuillez entrer votre nom" className={financeInput} /></label>
          <label className="mt-7 block space-y-3"><span className="font-display text-xl">*Compte portefeuille</span><input aria-label="Compte portefeuille" inputMode="tel" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Numéro local ou avec l’indicatif de votre pays" className={financeInput} /></label>
          <Btn full className={`${financeButton} mx-auto mt-16 w-5/6 rounded-full`} disabled={add.isPending}>{add.isPending ? "Enregistrement..." : "Ajouter"}</Btn>
          <Btn full type="button" variant="outline" className="mt-4 border-0 bg-transparent text-sm font-normal normal-case tracking-normal shadow-none ring-0" onClick={() => setAdding(false)}>Annuler</Btn>
        </form>
      </> : <>
        <FinanceHeader title="Gestion de compte bancaire" />
        {accounts.length === 0 ? <div className="px-5 pt-24">
          <div className="relative mx-auto grid h-48 w-64 place-items-center text-muted-foreground/20" aria-label="Aucun compte enregistré"><div className="absolute bottom-3 h-16 w-full rounded-full bg-muted/50" /><ClipboardList className="relative size-40" strokeWidth={1} /></div>
          <Btn full className={`${financeButton} mx-auto mt-14 w-5/6 rounded-2xl`} onClick={() => setAdding(true)}>Ajouter</Btn>
        </div> : <div className="space-y-4 px-5 py-6">
          {accounts.map((a) => <div key={a.id} className="flex items-center gap-3 border-b border-border py-4"><CreditCard className="size-7 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-base font-bold">{a.provider} · {a.account_number}</p><p className="mt-1 text-sm text-muted-foreground">{a.account_name}</p></div><Btn variant="outline" title="Supprimer le compte" className="bg-transparent p-2 text-destructive shadow-none ring-0" disabled={remove.isPending} onClick={() => { if (window.confirm("Supprimer ce compte de retrait ?")) remove.mutate(a.id); }} aria-label="Supprimer le compte"><Trash2 className="size-5" /></Btn></div>)}
          <Btn full className={`${financeButton} mt-6`} onClick={() => setAdding(true)}>Ajouter</Btn>
        </div>}
      </>}
    </div>
  );
}
