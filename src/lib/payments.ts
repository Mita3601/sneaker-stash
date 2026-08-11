/** Pays et opérateurs mobile money disponibles pour le formulaire de recharge. */
export const MIN_DEPOSIT = 200;

export type PayOperator = {
  name: string;
  otp: boolean;
};

export type PayCountry = {
  code: string;
  name: string;
  currency: string;
  dial: string;
  flag: string;
  operators: PayOperator[];
};

export const DIAL_CODES: Record<string, string> = {
  BJ: "+229",
  BF: "+226",
  CI: "+225",
  CM: "+237",
  SN: "+221",
  TG: "+228",
  ML: "+223",
  NE: "+227",
  GA: "+241",
  CG: "+242",
  CD: "+243",
  TD: "+235",
  CF: "+236",
  GW: "+245",
};

export function payCountry(countries: PayCountry[], code: string) {
  return countries.find((c) => c.code === code) ?? countries[0];
}

/** Wave n'exige pas de numéro de téléphone : le client confirme via le lien Wave. */
export function isWave(operator: string) {
  return operator.toLowerCase().startsWith("wave");
}

export type DepositInit =
  | { type: "pending"; reference: string; message: string }
  | { type: "redirect"; reference: string; url: string; message: string }
  | { type: "otp"; reference: string; ussdCode: string; message: string };
