import { createFileRoute } from "@tanstack/react-router";

/**
 * Réconciliation des dépôts LeekPay : vérifie auprès de la passerelle chaque
 * dépôt encore en attente et crédite le solde des paiements confirmés.
 * Utilisable manuellement ou via une tâche planifiée.
 */
export const Route = createFileRoute("/api/public/jobs/leekpay-sync")({
  server: {
    handlers: {
      POST: async () => {
        const { syncLeekDeposits } = await import("@/lib/leek-sync.server");
        const result = await syncLeekDeposits({ limit: 100 });
        return Response.json(result);
      },
      GET: async () => {
        const { syncLeekDeposits } = await import("@/lib/leek-sync.server");
        const result = await syncLeekDeposits({ limit: 100 });
        return Response.json(result);
      },
    },
  },
});
