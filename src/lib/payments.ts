/** Règles et types partagés du système de recharge (Ashtech Pay — lien de paiement). */
export const MIN_DEPOSIT = 200;

/** Le dépôt est automatiquement marqué échoué au-delà de ce délai. */
export const DEPOSIT_TIMEOUT_MINUTES = 15;

export type PayCurrency = {
  code: string;
  label: string;
};

export const CURRENCIES: PayCurrency[] = [
  { code: "XOF", label: "FCFA (XOF) — Afrique de l’Ouest" },
  { code: "XAF", label: "FCFA (XAF) — Afrique centrale" },
  { code: "CDF", label: "Franc congolais (CDF)" },
];

export type DepositInit = {
  reference: string;
  paymentLink: string;
  amount: number;
  currency: string;
  expiresAt: string | null;
  message: string;
};

export type DepositStatusResult = {
  status: "pending" | "approved" | "rejected" | "unknown";
  amount: number;
  reference: string;
};
