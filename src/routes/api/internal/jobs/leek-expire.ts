import { createFileRoute } from "@tanstack/react-router";

/**
 * Ancien job d'expiration : il marquait aveuglément les dépôts en échec après
 * 15 minutes, ce qui pouvait rejeter un paiement réellement encaissé.
 * Il vérifie désormais le statut réel auprès de LeekPay avant toute décision.
 */
export const Route = createFileRoute("/api/internal/jobs/leek-expire")({
  server: {
    handlers: {
      POST: async () => {
        const { syncLeekDeposits } = await import("@/lib/leek-sync.server");
        const result = await syncLeekDeposits({ limit: 100 });
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
