import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Btn } from "@/components/ui-kit";
import { TELEGRAM } from "@/lib/app";

const points = [
  "La plateforme de staking sneakers la plus fiable pour générer des revenus quotidiens.",
  "Les nouveaux membres reçoivent 1 500 FCFA dès l'inscription.",
  "Investissez dans vos paires et percevez des revenus chaque jour.",
  "Montant minimum de retrait : 1 000 FCFA (frais de 15 %).",
  "Dépôts et retraits 24 h/24 et 7 j/7.",
  "Gagnez des commissions en parrainant vos amis sur 3 niveaux.",
];

export function AnnouncementModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("announcement-seen")) return;
    setOpen(true);
  }, []);

  if (!open) return null;

  const close = () => {
    sessionStorage.setItem("announcement-seen", "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="max-h-[85vh] w-full max-w-[400px] overflow-y-auto rounded-3xl bg-card shadow-glow">
        <div className="rounded-t-3xl bg-gradient-primary px-4 py-3 text-center text-base font-bold text-primary-foreground">
          Bienvenue chez Nike !
        </div>
        <ul className="space-y-3 p-4">
          {points.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-2 p-4 pt-0">
          <a href={TELEGRAM.channel} target="_blank" rel="noreferrer" className="block">
            <Btn variant="ghost" full>
              Canal Telegram
            </Btn>
          </a>
          <a href={TELEGRAM.group} target="_blank" rel="noreferrer" className="block">
            <Btn variant="ghost" full>
              Groupe Telegram
            </Btn>
          </a>
          <Btn full onClick={close}>
            D&apos;ACCORD
          </Btn>
        </div>
      </div>
    </div>
  );
}
