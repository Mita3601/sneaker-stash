import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { useCurrentUser, useProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, WITHDRAW_FEE_RATE, WITHDRAW_MIN } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/withdraw")({
  head: () => ({
    meta: [
      { title: "Retrait — Nike" },
      {
        name: "description",
        content: "Demandez un retrait dès 1 000 FCFA vers votre compte mobile money.",
      },
      { property: "og:title", content: "Retrait — Nike" },
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
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const selected = accountId || accounts[0]?.id || "";
  const value = Number(amount || 0);
  const fee = Math.round(value * WITHDRAW_FEE_RATE);

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
    submit.mutate();
  }

  return (
    <>
      <SubHeader title="Retrait" />
      <div className="space-y-3 p-4">
        <Card className="bg-gradient-deep text-primary-foreground">
          <p className="text-3xl font-extrabold">{fcfa(profile?.balance)}</p>
          <p className="text-xs opacity-90">Solde disponible</p>
        </Card>

        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Compte de retrait">
              <select
                value={selected}
                onChange={(e) => setAccountId(e.target.value)}
                className={inputClass}
              >
                {accounts.length === 0 ? <option value="">Aucun compte enregistré</option> : null}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.provider} · {a.account_number}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Montant" hint={`Minimum ${fcfa(WITHDRAW_MIN)} · frais 15 %`}>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="1000"
                className={inputClass}
              />
            </Field>

            <div className="space-y-1 rounded-xl bg-secondary p-3 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Frais (15 %)</span>
                <span className="font-bold">{fcfa(fee)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Vous recevez</span>
                <span className="font-bold text-primary">{fcfa(Math.max(value - fee, 0))}</span>
              </p>
            </div>

            <Btn full disabled={submit.isPending}>
              {submit.isPending ? "Envoi..." : "Demander le retrait"}
            </Btn>
          </form>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-semibold">Informations importantes</p>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Montant minimum de retrait : 1 000 FCFA.</li>
            <li>Frais de retrait : 15 % du montant retiré.</li>
            <li>
              Vous pouvez effectuer des retraits à tout moment. Les retraits sont disponibles sous
              10 min à 1 heure.
            </li>
            <li>
              Afin de protéger les intérêts de la plateforme et de ses membres, vous devez disposer
              d’au moins un appareil pour activer la fonction de retrait.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
