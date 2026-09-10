import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Field, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, phoneToEmail } from "@/lib/app";
import copyImage from "@/assets/dior-auth.jpg";

export const Route = createFileRoute("/auth/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — Dior Parfums" },
      {
        name: "description",
        content: "Connectez-vous à votre espace Dior Parfums avec votre numéro de téléphone.",
      },
      { property: "og:title", content: "Connexion — Dior Parfums" },
      { property: "og:description", content: "Accédez à vos parfums et à vos revenus quotidiens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [country, setCountry] = useState(COUNTRIES[0]!.code);
  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0]!;
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || password.length < 6) {
      toast.error("Numéro et mot de passe (6 caractères min.) requis");
      return;
    }
    setLoading(true);
    const email = phoneToEmail(country, phone);
    let result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      const oldEmail = email.replace(/@nike\.app$/i, "@nikestake.app");
      if (oldEmail !== email) {
        result = await supabase.auth.signInWithPassword({ email: oldEmail, password });
      }
    }

    setLoading(false);
    if (result.error) {
      toast.error("Numéro ou mot de passe incorrect");
      return;
    }
    toast.success("Connexion réussie");
    navigate({ to: "/app" });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-screen overflow-hidden bg-primary">
        <div className="absolute inset-0">
          <img
            src={copyImage}
            alt="Collection de parfums dans un décor nocturne"
            width={1536}
            height={1024}
            className="h-full w-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-primary/70" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14 lg:px-12 lg:py-18">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-end">
            <div className="max-w-2xl text-primary-foreground">
              <p className="text-sm uppercase tracking-[0.32em] text-accent">Dior · Collection privée</p>
              <h1 className="mt-4 text-5xl font-medium italic sm:text-6xl lg:text-7xl">
                Retrouvez votre collection
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Accédez à votre sélection de parfums et suivez vos revenus dans un espace élégant
                et confidentiel.
              </p>
            </div>

            <div className="overflow-hidden rounded-md border border-primary-foreground/15 bg-card/95 shadow-glow backdrop-blur">
              <div className="px-8 pt-10 sm:px-10">
                <h2 className="text-4xl font-medium text-foreground">
                  Connexion
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Connectez-vous pour retrouver votre portefeuille et vos parfums.
                </p>
              </div>

              <div className="px-8 pb-10 pt-8 sm:px-10">
                <form onSubmit={onSubmit} className="space-y-5">
                  <Field label="Pays" className="text-slate-900">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={`${inputClass} w-full rounded-[28px] border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition focus:border-slate-900`}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {`${c.flag} ${c.label} (${c.code})`}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Numéro de téléphone" className="text-slate-900">
                    <div className="flex gap-3">
                      <span className="inline-flex min-w-[72px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 px-3 py-3 text-slate-900">
                        {selectedCountry.flag} {selectedCountry.code}
                      </span>
                      <input
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07 00 00 00 00"
                        className={`${inputClass} flex-1 rounded-[28px] border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition focus:border-slate-900`}
                      />
                    </div>
                  </Field>

                  <Field label="Mot de passe" className="text-slate-900">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Au moins 6 caractères"
                        className={`${inputClass} rounded-[28px] border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 shadow-sm transition focus:border-slate-900`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700"
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>

                  <Btn
                    full
                    disabled={loading}
                    className="h-14 rounded-full text-base font-semibold"
                  >
                    {loading ? "Connexion..." : "Se connecter"}
                  </Btn>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Pas encore de compte ?{" "}
                  <Link
                    to="/auth/register"
                    className="font-semibold text-slate-950 transition hover:text-slate-700"
                  >
                    S'inscrire
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
