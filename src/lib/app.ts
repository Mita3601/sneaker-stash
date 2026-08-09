import vip1 from "@/assets/sneaker-vip1.jpg";
import vip2 from "@/assets/sneaker-vip2.jpg";
import vip3 from "@/assets/sneaker-vip3.jpg";
import vip4 from "@/assets/sneaker-vip4.jpg";
import vip5 from "@/assets/sneaker-vip5.jpg";
import vip6 from "@/assets/sneaker-vip6.jpg";
import vip7 from "@/assets/sneaker-vip7.jpg";
import vip8 from "@/assets/sneaker-vip8.jpg";
import vip9 from "@/assets/sneaker-vip9.jpg";

export const SNEAKER_IMAGES: Record<string, string> = {
  VIP1: vip1,
  VIP2: vip2,
  VIP3: vip3,
  VIP4: vip4,
  VIP5: vip5,
  VIP6: vip6,
  VIP7: vip7,
  VIP8: vip8,
  VIP9: vip9,
};

export const COUNTRIES = [
  { code: "+225", label: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+226", label: "Burkina Faso", flag: "🇧🇫" },
  { code: "+229", label: "Bénin", flag: "🇧🇯" },
  { code: "+237", label: "Cameroun", flag: "🇨🇲" },
];

export const PROVIDERS = ["Wave", "Orange", "MTN", "Moov"];

export const WITHDRAW_MIN = 1000;
export const WITHDRAW_FEE_RATE = 0.15;

export const TELEGRAM = {
  group: "https://t.me/",
  channel: "https://t.me/",
  support: "https://t.me/",
};

export const WHATSAPP = {
  group: "https://chat.whatsapp.com/",
};

export function fcfa(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} FCFA`;
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return "-";
  const raw = String(value).trim();
  if (raw.length <= 8) return raw;
  return `${raw.slice(0, 6)}...${raw.slice(-2)}`;
}

/** Phone numbers are mapped to a stable internal email alias for authentication. */
export function phoneToEmail(countryCode: string, phone: string) {
  const digits = `${countryCode}${phone}`.replace(/\D/g, "");
  return `u${digits}@nike.app`;
}

export function normalizePhone(countryCode: string, phone: string) {
  return `${countryCode}${phone.replace(/\D/g, "")}`;
}

export function nextClaimAt(lastClaim: string | null, purchaseDate?: string | null) {
  const DAY = 24 * 60 * 60 * 1000;
  if (lastClaim) return new Date(lastClaim).getTime() + DAY;
  if (purchaseDate) return new Date(purchaseDate).getTime() + DAY;
  return 0;
}

export function countdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export const TX_LABELS: Record<string, string> = {
  deposit: "Recharge",
  withdraw: "Retrait",
  bonus: "Bonus",
  commission: "Commission",
  yield: "Revenu quotidien",
  purchase: "Achat produit",
  adjustment: "Ajustement",
};

export const CREDIT_TYPES = ["deposit", "bonus", "commission", "yield"];

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Rejeté",
};

export type PasswordMode = "alphanumeric" | "numeric" | "alpha";

export function validatePassword(password: string, mode: PasswordMode) {
  if (!password || password.length < 6) {
    return { ok: false, message: "Le mot de passe doit contenir 6 caractères minimum" };
  }
  if (mode === "numeric") {
    if (!/^\d+$/.test(password)) {
      return { ok: false, message: "Le mot de passe doit contenir uniquement des chiffres" };
    }
  } else if (mode === "alpha") {
    if (!/^[A-Za-z]+$/.test(password)) {
      return { ok: false, message: "Le mot de passe doit contenir uniquement des lettres" };
    }
  } else {
    if (!/^[A-Za-z0-9]+$/.test(password)) {
      return {
        ok: false,
        message: "Le mot de passe doit être alphanumérique (lettres et/ou chiffres)",
      };
    }
  }
  return { ok: true };
}
