import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/payment/robotpay/return")({
  component: RobotpayReturnPage,
});

function RobotpayReturnPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const status = params.get("status");
  const ref = params.get("ref");
  const amount = params.get("amount");
  const deposit = params.get("deposit");

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <div className="w-full rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">RobotPay</p>
        <h1 className="mt-3 text-2xl font-bold text-white">Vérification du paiement</h1>

        {status === "success" ? (
          <div className="mt-5 space-y-3 text-sm text-slate-200">
            <p>Votre paiement a bien été initié et est en cours de confirmation côté RobotPay.</p>
            {ref ? <p>Référence : {ref}</p> : null}
            {amount ? <p>Montant : {amount} FCFA</p> : null}
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              Paiement validé par le webhook signé, puis solde crédité automatiquement.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3 text-sm text-slate-200">
            <p>Vérification de votre paiement en cours…</p>
            {deposit ? <p>ID dépôt : {deposit}</p> : null}
            <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-200">
              Nous ne créditons jamais uniquement sur les paramètres status/amount de l’URL. Le
              crédit est déclenché par le webhook RobotPay sécurisé.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
