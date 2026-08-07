import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, phoneToEmail } from "@/lib/app";

export const Route = createFileRoute("/auth/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — NikeStake" },
      { name: "description", content: "Connectez-vous à votre compte NikeStake avec votre numéro de téléphone." },
      { property: "og:title", content: "Connexion — NikeStake" },
      { property: "og:description", content: "Accédez à vos paires et à vos revenus quotidiens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || password.length < 6) {
      toast.error("Numéro et mot de passe (6 caractères min.) requis");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(country, phone),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("Numéro ou mot de passe incorrect");
      return;
    }
    toast.success("Connexion réussie");
    navigate({ to: "/app" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-5 p-5">
      <div>
        <h1 className="text-2xl font-extrabold">Bon retour 👋</h1>
        <p className="text-sm text-muted-foreground">Connectez-vous pour suivre vos revenus.</p>
      </div>

      <Card className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Numéro de téléphone">
            <div className="flex gap-2">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`${inputClass} w-28`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              <input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07 00 00 00 00"
                className={inputClass}
              />
            </div>
          </Field>

          <Field label="Mot de passe">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              className={inputClass}
            />
          </Field>

          <Btn full disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Btn>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/auth/register" className="font-bold text-primary">
          S&apos;inscrire
        </Link>
      </p>
    </main>
  );
}
