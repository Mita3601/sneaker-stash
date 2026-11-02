import { useEffect, useState } from "react";

import { TELEGRAM } from "@/lib/app";

const MUTE_KEY = "announcement-muted";
const SEEN_KEY = "announcement-seen";

const rules = [
  "Le dépôt minimum est de 200 FCFA. Le crédit intervient après vérification et approbation du paiement.",
  "Bonus d'inscription : 1 500 FCFA pour les nouveaux comptes.",
  "✨ Revenus quotidiens versés selon le parfum choisi.",
  "Parrainage : 27 % au niveau 1, 2 % au niveau 2 et 1 % au niveau 3, uniquement sur les achats réglés avec de l'argent réel.",
  "Chaque parfum acheté dispose de son propre cycle et les revenus de plusieurs parfums se cumulent.",
  "Les revenus des parfums achetés sont automatiquement crédités sur votre solde toutes les 24 heures après l'achat.",
  "Retrait minimum : 1 000 FCFA. Frais : 15 %. Un achat est requis. 2 retraits maximum par jour.",
  "Rejoignez notre canal et notre groupe Telegram pour suivre les offres de la plateforme.",
];

export function AnnouncementModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(MUTE_KEY) || sessionStorage.getItem(SEEN_KEY)) return;
    setOpen(true);
  }, []);

  if (!open) return null;

  const close = () => {
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };
  const mute = () => {
    localStorage.setItem(MUTE_KEY, "1");
    close();
  };

  const linkBtn =
    "flex h-11 items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/45 to-muted-foreground text-[15px] text-primary-foreground shadow-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-5"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="w-full max-w-[400px] rounded-2xl bg-muted p-4 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="announcement-title"
          className="px-4 pt-3 text-center text-[28px] font-bold leading-tight text-primary"
        >
          Notification de la plateforme
        </h2>

        <div className="mt-4 max-h-[36vh] overflow-y-auto px-2 text-foreground">
          <p className="text-[13px] text-muted-foreground">
            Bonus de bienvenue : 1 500 FCFA. Dépôt minimum : 200 FCFA.
          </p>
          <p className="mt-2 text-[15px]">Bienvenue sur votre espace Dior Parfums.</p>
          <ol className="mt-4 list-decimal space-y-1 pl-6 text-[15px] leading-relaxed">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <a href={TELEGRAM.channel} target="_blank" rel="noreferrer" className={linkBtn}>
            Canal Telegram
          </a>
          <a href={TELEGRAM.group} target="_blank" rel="noreferrer" className={linkBtn}>
            Groupe Telegram
          </a>
        </div>
        <button
          type="button"
          onClick={mute}
          className="mt-4 h-12 w-full rounded-md border-2 border-foreground bg-gradient-primary text-[15px] text-primary-foreground"
        >
          Désactiver les rappels
        </button>
      </div>
    </div>
  );
}
