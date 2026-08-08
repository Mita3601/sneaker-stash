import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DepositInit } from "@/lib/payments";

type Input = {
  amount: number;
  countryCode: string;
  currency: string;
  operator: string;
  phone: string;
  otp?: string;
  reference?: string;
};

function validate(data: Input): Input {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount < 1000 || amount > 5_000_000) {
    throw new Error("Montant invalide (minimum 1 000 FCFA).");
  }
  if (!/^[A-Z]{2}$/.test(data.countryCode)) throw new Error("Pays invalide.");
  if (!/^(XOF|XAF)$/.test(data.currency)) throw new Error("Devise invalide.");
  if (!data.operator || data.operator.length > 40) throw new Error("Opérateur invalide.");
  const phone = String(data.phone ?? "").replace(/\D/g, "");
  if (phone.length > 20) throw new Error("Numéro invalide.");
  const otp = data.otp ? String(data.otp).replace(/\D/g, "").slice(0, 10) : undefined;
  const reference = data.reference ? String(data.reference).slice(0, 60) : undefined;
  return {
    amount: Math.round(amount),
    countryCode: data.countryCode,
    currency: data.currency,
    operator: data.operator,
    phone,
    ...(otp ? { otp } : {}),
    ...(reference ? { reference } : {}),
  };
}

export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<DepositInit> => {
    const { collect, newReference, webhookUrl } = await import("@/lib/ashtech.server");

    const reference = data.reference ?? newReference();

    const { status, body } = await collect({
      amount: data.amount,
      currency: data.currency,
      phone: data.phone,
      operator: data.operator,
      country_code: data.countryCode,
      reference,
      ...(data.otp ? { otp: data.otp } : {}),
      notify_url: webhookUrl(),
    });

    if (status === 400 && body["error"] === "otp_required") {
      const apiRef = String(body["reference"] ?? reference);
      const ussd = body["ussd_code"] ? String(body["ussd_code"]) : "";
      const message = String(body["message"] ?? "Code de confirmation requis.");
      return ussd
        ? { type: "otp_ussd", reference: apiRef, ussdCode: ussd, message }
        : { type: "otp_sms", reference: apiRef, message };
    }

    if (status !== 202 && status !== 200) {
      throw new Error(String(body["message"] ?? "Le paiement a été refusé par l'opérateur."));
    }

    const apiRef = String(body["reference"] ?? reference);
    const transactionId = String(body["transaction_id"] ?? apiRef);

    const { error } = await context.supabase.rpc("create_gateway_deposit", {
      _amount: data.amount,
      _reference: apiRef,
      _metadata: {
        gateway: "ashtechpay",
        gateway_transaction_id: transactionId,
        country_code: data.countryCode,
        currency: data.currency,
        operator: data.operator,
        phone: data.phone,
      },
    });
    if (error) throw new Error(error.message);

    if (body["flow"] === "wave" && body["wave_url"]) {
      return {
        type: "wave",
        reference: apiRef,
        transactionId,
        waveUrl: String(body["wave_url"]),
      };
    }

    return { type: "ussd_push", reference: apiRef, transactionId };
  });

export const checkDepositStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => ({
    reference: String(data.reference ?? "").slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("transactions")
      .select("status, amount")
      .eq("reference", data.reference)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    return { status: row?.status ?? "unknown", amount: Number(row?.amount ?? 0) };
  });
