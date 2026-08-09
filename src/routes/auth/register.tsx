import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { Btn, Field, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, normalizePhone, phoneToEmail } from "@/lib/app";
import copyImage from "@/assets/image copy.png";

export const Route = createFileRoute("/auth/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inscription — Nike" },
      {
        name: "description",
        content: "Créez votre compte Nike et recevez 1 500 FCFA de bonus de bienvenue.",
      },
      { property: "og:title", content: "Inscription — Nike" },
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
  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0]!;
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState((search?.get("ref") ?? "").toUpperCase());
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
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
    const referralCode = code.trim().toUpperCase();
    if (!referralCode) {
      toast.error("Le code de parrainage est obligatoire");
      return;
    }
    if (!/^[A-Za-z0-9]{6}$/.test(referralCode)) {
      toast.error("Code de parrainage invalide (6 caractères alphanumériques)");
      return;
    }

    setLoading(true);
    try {
      let sponsorId: string | null = null;

      if (referralCode) {
        const { data: sponsor, error: sponsorError } = await supabase
          .from("profiles")
          .select("id")
          .eq("referral_code", referralCode)
          .maybeSingle();
        if (sponsorError) throw sponsorError;
        if (!sponsor) {
          toast.error("Ce code de parrainage n'existe pas");
          return;
        }
        sponsorId = sponsor.id;
      }

      const { data: signUp, error: signUpError } = await supabase.auth.signUp({
        email: phoneToEmail(country, phone),
        password,
      });
      if (signUpError) throw signUpError;
      if (!signUp.user) throw new Error("Inscription impossible");

      const normalizedPhone = normalizePhone(country, phone);
      const { error: profileError } = await supabase.from("profiles").insert({
        id: signUp.user.id,
        phone: normalizedPhone,
        country_code: country,
        balance: 0,
        total_deposits: 0,
        total_withdrawals: 0,
        total_bonus: 0,
        ...(sponsorId ? { referred_by: sponsorId } : {}),
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <img
            src={copyImage}
            alt="Nike invest background"
            className="h-full w-full object-contain object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/95" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14 lg:px-12 lg:py-18">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-end">
            <div className="max-w-2xl text-white">
              <p className="text-sm uppercase tracking-[0.45em] text-slate-300">Nike Invest</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Just invest it
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Ouvre ton compte Nike, profite d’un bonus de bienvenue et prends le contrôle de tes
                sneakers premium.
              </p>
            </div>

            <div className="overflow-hidden rounded-[40px] border border-white/12 bg-white/95 shadow-[0_40px_120px_rgba(15,23,42,0.18)]">
              <div className="px-8 pt-10 sm:px-10">
                <h2 className="text-4xl font-black uppercase tracking-tight text-slate-950">
                  INSCRIPTION
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Créez votre compte Nike et recevez un bonus de bienvenue de 1 500 FCFA.
                </p>
              </div>

              <div className="px-8 pb-10 pt-8 sm:px-10">
                <form onSubmit={onSubmit} className="space-y-5">
                  <Field label="Numéro de téléphone" className="text-slate-900">
                    <div className="flex gap-3">
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`${inputClass} min-w-[72px] rounded-[28px] border-slate-200 bg-slate-100 px-3 py-3 text-slate-500 shadow-sm transition focus:border-slate-500`}
                        aria-label="Code pays"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {`${c.flag} ${c.label} (${c.code})`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        inputMode="tel"
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
                        className={`${inputClass} rounded-[28px] border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-slate-900`}
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

                  <Field label="Confirmer le mot de passe" className="text-slate-900">
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Retapez le mot de passe"
                        className={`${inputClass} rounded-[28px] border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-slate-900`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700"
                        aria-label={
                          showConfirmPassword
                            ? "Masquer la confirmation"
                            : "Afficher la confirmation"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </Field>

                  <Field
                    label="Code de parrainage"
                    hint="Obligatoire — 6 caractères alphanumériques"
                    className="text-slate-900"
                  >
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="EX: A1B2C3"
                      className={`${inputClass} rounded-[28px] border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-slate-900`}
                    />
                  </Field>

                  <Btn
                    full
                    disabled={loading}
                    className="h-14 rounded-full text-base font-semibold"
                  >
                    {loading ? "Création..." : "S'inscrire"}
                  </Btn>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Déjà inscrit ?{" "}
                  <Link
                    to="/auth/login"
                    className="font-semibold text-slate-950 transition hover:text-slate-700"
                  >
                    Se connecter
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
