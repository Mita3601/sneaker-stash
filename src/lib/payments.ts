/** Règles et types partagés du système de recharge (RobotPay prioritaire, GeniusPay en secours). */
export const MIN_DEPOSIT = 4000;

/** Le dépôt est automatiquement marqué échoué au-delà de ce délai. */
export const DEPOSIT_TIMEOUT_MINUTES = 15;

export type PaymentProvider = "robotpay" | "geniuspay" | "manual";

export const PAYMENT_PROVIDER_BY_COUNTRY: Record<string, PaymentProvider> = {
  "+225": "robotpay",
  "+226": "manual",
  "+237": "robotpay",
};

export type DepositInit = {
  reference: string;
  paymentLink: string;
  /** Numéro à créditer si la passerelle renvoie un numéro à créditer. */
  account?: string;
  amount: number;
  message: string;
};

export type DepositStatusResult = {
  status: "pending" | "approved" | "rejected" | "unknown";
  amount: number;
  reference: string;
};
