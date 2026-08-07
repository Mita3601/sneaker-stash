import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Empty, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { useCurrentUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PROVIDERS } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/add-bank")({
  head: () => ({
    meta: [
      { title: "Compte de retrait — NikeStake" },
      { name: "description", content: "Ajoutez et gérez les comptes mobile money utilisés pour vos retraits." },
      { property: "og:title", content: "Compte de retrait — NikeStake" },
      { property: "og:description", content: "Enregistrez votre compte Wave, Orange, MTN ou Moov." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddBank,
});

function AddBank() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [provider, setProvider] = useState(PROVIDERS[0]!);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bank_accounts").insert({
        user_id: user!.id,
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
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte supprimé");
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <>
      <SubHeader title="Ajouter un compte de retrait" />
      <div className="space-y-3 p-4">
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Opérateur">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nom du titulaire">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom et prénoms"
                className={inputClass}
              />
            </Field>
            <Field label="Numéro de compte" hint="Le numéro mobile money qui recevra vos retraits">
              <input
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="07 00 00 00 00"
                className={inputClass}
              />
            </Field>
            <Btn full disabled={add.isPending}>
              {add.isPending ? "Enregistrement..." : "Enregistrer"}
            </Btn>
          </form>
        </Card>

        {accounts.length === 0 ? (
          <Empty title="Aucun compte enregistré" text="Ajoutez un compte pour pouvoir retirer." />
        ) : (
          <Card className="divide-y divide-border p-0">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">
                    {a.provider} · {a.account_number}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.account_name}</p>
                </div>
                <button
                  onClick={() => remove.mutate(a.id)}
                  className="rounded-xl p-2 text-destructive hover:bg-destructive/10"
                  aria-label="Supprimer le compte"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
