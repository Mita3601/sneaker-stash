import { createFileRoute } from "@tanstack/react-router";

function str(value: unknown) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

/**
 * Webhook Ashtech Pay. Le contenu reçu n'est jamais cru sur parole : chaque
 * événement est revérifié via GET /hosted-payment/:payment_id avant tout crédit.
 * Idempotent : gateway_confirm_deposit ignore les dépôts déjà traités.
 */
export const Route = createFileRoute("/api/public/webhooks/ashtechpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return Response.json({ received: true, ignored: "invalid_json" }, { status: 200 });
        }

        const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
        const candidates = [
          str(body["payment_id"]) || str(data["payment_id"]),
          str(body["reference"]) || str(data["reference"]),
          str(body["transaction_id"]) || str(data["transaction_id"]),
          str(body["slug"]) || str(data["slug"]),
        ].filter(Boolean);

        const { findDeposit, syncDeposit } = await import("@/lib/ashtech-sync.server");

        for (const candidate of [...new Set(candidates)]) {
          const deposit = await findDeposit(candidate);
          if (!deposit) continue;

          if (deposit.status !== "pending") {
            // Idempotence + garde-fou : un paiement confirmé après le délai de 15 min
            // n'est jamais crédité automatiquement, il est journalisé pour revue.
            console.warn(
              `[ashtechpay] webhook reçu pour un dépôt déjà ${deposit.status} (ref ${deposit.reference}) — aucun crédit automatique`,
            );
            return Response.json({ received: true, already: deposit.status }, { status: 200 });
          }

          const result = await syncDeposit(deposit.reference ?? candidate);
          return Response.json({ received: true, status: result.status }, { status: 200 });
        }

        return Response.json({ received: true, ignored: "deposit_not_found" }, { status: 200 });
      },
    },
  },
});
