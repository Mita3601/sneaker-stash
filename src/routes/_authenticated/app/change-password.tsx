import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass, SubHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/change-password")({
  head: () => ({
    meta: [
      { title: "Changer mon mot de passe — Nike" },
      { name: "description", content: "Mettez à jour le mot de passe de votre compte Nike." },
      { property: "og:title", content: "Changer mon mot de passe — Nike" },
      { property: "og:description", content: "Protégez votre compte avec un mot de passe fort." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChangePassword,
});

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir 6 caractères minimum");
      return;
    }
    if (next !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (email) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: current });
      if (error) {
        setLoading(false);
        toast.error("Mot de passe actuel incorrect");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Mot de passe mis à jour");
  }

  return (
    <>
      <SubHeader title="Changer mon mot de passe" />
      <div className="space-y-3 p-4">
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Mot de passe actuel">
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Btn full disabled={loading}>
              {loading ? "Mise à jour..." : "METTRE À JOUR"}
            </Btn>
          </form>
        </Card>

        <Card>
          <p className="text-sm font-bold">Conseils de sécurité</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Utilisez au moins 6 caractères avec chiffres et lettres.</li>
            <li>Ne partagez jamais votre mot de passe, même avec le support.</li>
            <li>Changez-le régulièrement pour protéger vos gains.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
