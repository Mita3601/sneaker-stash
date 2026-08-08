/** Pays et opérateurs mobile money supportés pour les recharges (Ashtech Pay). */
export type PayCountry = {
  code: string;
  name: string;
  currency: "XOF" | "XAF";
  dial: string;
  flag: string;
  operators: string[];
};

export const PAY_COUNTRIES: PayCountry[] = [
  {
    code: "CI",
    name: "Côte d'Ivoire",
    currency: "XOF",
    dial: "+225",
    flag: "🇨🇮",
    operators: ["Orange Money", "MTN Money", "Moov Money", "Wave Money"],
  },
  {
    code: "BF",
    name: "Burkina Faso",
    currency: "XOF",
    dial: "+226",
    flag: "🇧🇫",
    operators: ["Orange Money", "Moov Money", "Wallet LigdiCash"],
  },
  {
    code: "BJ",
    name: "Bénin",
    currency: "XOF",
    dial: "+229",
    flag: "🇧🇯",
    operators: ["MTN Money", "Moov Money", "Celtiis Money", "Coris Money"],
  },
  {
    code: "CM",
    name: "Cameroun",
    currency: "XAF",
    dial: "+237",
    flag: "🇨🇲",
    operators: ["MTN Money", "Orange Money"],
  },
];

export function payCountry(code: string) {
  return PAY_COUNTRIES.find((c) => c.code === code) ?? PAY_COUNTRIES[0]!;
}

/** Wave n'exige pas de numéro de téléphone : le client confirme via le lien de paiement. */
export function isWave(operator: string) {
  return operator.toLowerCase().startsWith("wave");
}

export type DepositInit =
  | { type: "ussd_push"; reference: string; transactionId: string }
  | { type: "wave"; reference: string; transactionId: string; waveUrl: string }
  | { type: "otp_ussd"; reference: string; ussdCode: string; message: string }
  | { type: "otp_sms"; reference: string; message: string };
