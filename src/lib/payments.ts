/** Règles et types partagés du système de recharge (MoneyFusion — lien de paiement). */
export const MIN_DEPOSIT = 200;

/** Le dépôt est automatiquement marqué échoué au-delà de ce délai. */
export const DEPOSIT_TIMEOUT_MINUTES = 15;

export type DepositInit = {
  reference: string;
  paymentLink: string;
  amount: number;
  message: string;
};

export type DepositStatusResult = {
  status: "pending" | "approved" | "rejected" | "unknown";
  amount: number;
  reference: string;
};
