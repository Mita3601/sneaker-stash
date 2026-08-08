import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Headphones, MessageCircle, Send, Users } from "lucide-react";

import { Btn, SubHeader } from "@/components/ui-kit";
import copyImage from "@/assets/image copy.png";
import { TELEGRAM, WHATSAPP } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/support")({
  head: () => ({
    meta: [
      { title: "Service client — NikeStake" },
      { name: "description", content: "Contactez le support NikeStake par Telegram ou WhatsApp." },
      { property: "og:title", content: "Service client — NikeStake" },
      { property: "og:description", content: "Assistance rapide pour vos dépôts et retraits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Support,
});

const steps = [
  { icon: MessageCircle, label: "Vous rencontrez un problème" },
  { icon: Headphones, label: "Contactez le service client" },
  { icon: Send, label: "Réponse en ligne" },
  { icon: CheckCircle, label: "Problème résolu" },
];

const contacts = [
  { icon: Users, label: "Groupe Telegram", href: TELEGRAM.group },
  { icon: Send, label: "Canal Telegram", href: TELEGRAM.channel },
  { icon: MessageCircle, label: "Groupe WhatsApp", href: WHATSAPP.group },
  { icon: Headphones, label: "Support direct", href: TELEGRAM.support },
];

function Support() {
  return (
    <>
      <SubHeader title="Service client" />
      <div className="space-y-6 p-4">
        <div className="relative overflow-hidden rounded-[32px] bg-slate-950 shadow-2xl shadow-slate-950/20">
          <img
            src={copyImage}
            alt="Service client background"
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-slate-950/85" />
          <div className="relative grid gap-4 px-6 py-8 sm:px-8 sm:py-10">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-300/90">Service client</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-black text-white sm:text-2xl">HORAIRES EN LIGNE</h1>
                <p className="mt-2 text-lg font-medium text-slate-200/95">8 h - 22 h</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-200/30 backdrop-blur-md sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
            Processus de support
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {steps.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex min-w-[220px] flex-1 items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Icon className="size-5" />
                </span>
                <p className="text-sm font-medium text-slate-900">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-slate-900">Contacter le service client</p>
          <div className="mt-4 grid gap-3">
            {contacts.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="block">
                <Btn full variant="outline">
                  <Icon className="size-4" /> {label}
                </Btn>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <p className="text-sm font-semibold text-slate-900">Conseils</p>
          <ol className="mt-3 space-y-2 pl-4 text-sm leading-6 text-slate-700 list-decimal">
            <li>
              Pour toute question, n&apos;hésitez pas à contacter notre service client en ligne.
            </li>
            <li>
              Veuillez conserver votre mot de passe en lieu sûr et ne le divulguez jamais à
              personne. Le personnel officiel ne vous le demandera jamais.
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}
