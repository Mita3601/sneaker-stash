import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, normalizePhone, phoneToEmail } from "@/lib/app";

export const Route = createFileRoute("/auth/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inscription — NikeStake" },
      {
        name: "description",
        content: "Créez votre compte NikeStake et recevez 1 500 FCFA de bonus de bienvenue.",
      },
      { property: "og:title", content: "Inscription — NikeStake" },
      { property: "og:description", content: "1 500 FCFA offerts dès votre inscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [country, setCountry] = useState(COUNTRIES[0]!.code);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState((search?.get("ref") ?? "").toUpperCase());
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 8) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir 6 caractères minimum");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (!/^[A-Za-z0-9]{6}$/.test(code)) {
      toast.error("Code de parrainage invalide (6 caractères)");
      return;
    }

    setLoading(true);
    try {
      const { data: sponsor, error: sponsorError } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", code.toUpperCase())
        .maybeSingle();
      if (sponsorError) throw sponsorError;
      if (!sponsor) {
        toast.error("Ce code de parrainage n'existe pas");
        return;
      }

      const { data: signUp, error: signUpError } = await supabase.auth.signUp({
        email: phoneToEmail(country, phone),
        password,
      });
      if (signUpError) throw signUpError;
      if (!signUp.user) throw new Error("Inscription impossible");

      const { error: profileError } = await supabase.from("profiles").insert({
        id: signUp.user.id,
        phone: normalizePhone(country, phone),
        country_code: country,
        referred_by: sponsor.id,
      });
      if (profileError) throw profileError;

      toast.success("Compte créé — 1 500 FCFA offerts !");
      navigate({ to: "/app" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(
        message.includes("already registered") || message.includes("duplicate")
          ? "Ce numéro est déjà utilisé"
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-5 p-5">
      <div>
        <h1 className="text-2xl font-extrabold">Créer un compte</h1>
        <p className="text-sm text-muted-foreground">1 500 FCFA crédités immédiatement.</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Pays / Numéro">
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

          <Field label="Confirmer le mot de passe">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Retapez le mot de passe"
              className={inputClass}
            />
          </Field>

          <Field label="Code de parrainage" hint="Obligatoire — 6 caractères alphanumériques">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="EX: A1B2C3"
              className={inputClass}
            />
          </Field>

          <Btn full disabled={loading}>
            {loading ? "Création..." : "S'inscrire"}
          </Btn>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link to="/auth/login" className="font-bold text-primary">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
