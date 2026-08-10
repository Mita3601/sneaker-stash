import { createFileRoute } from "@tanstack/react-router";

/**
 * Réconciliation : interroge LeekPay pour tous les dépôts encore en attente
 * et crédite automatiquement ceux qui sont payés. Sans effet de bord si rien
 * n'est payé — peut donc être appelé librement (cron ou app).
 */
async function run() {
  const { syncLeekDeposits } = await import("@/lib/leek-sync.server");
  const result = await syncLeekDeposits({ limit: 100, debug: true });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/jobs/leekpay-sync")({
  server: {
    handlers: {
      GET: async () => run(),
      POST: async () => run(),
    },
  },
});
