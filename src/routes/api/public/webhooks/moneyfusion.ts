import { createFileRoute } from "@tanstack/react-router";

function str(value: unknown) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

/**
 * Webhook MoneyFusion (webhook_url). Le contenu reçu n'est jamais cru sur parole :
 * chaque événement est revérifié via GET /paiementNotif/:token avant tout crédit.
 * Idempotent : gateway_confirm_deposit ignore les dépôts déjà traités.
 */
export const Route = createFileRoute("/api/public/webhooks/moneyfusion")({
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
        const token =
          str(body["tokenPay"]) ||
          str(body["token"]) ||
          str(data["tokenPay"]) ||
          str(data["token"]);

        if (!token) {
          return Response.json({ received: true, ignored: "no_token" }, { status: 200 });
        }

        const { findDeposit, syncDeposit } = await import("@/lib/moneyfusion-sync.server");
        const deposit = await findDeposit(token);
        if (!deposit) {
          return Response.json({ received: true, ignored: "deposit_not_found" }, { status: 200 });
        }

        if (deposit.status !== "pending") {
          return Response.json({ received: true, already: deposit.status }, { status: 200 });
        }

        const result = await syncDeposit(deposit.reference ?? token);
        return Response.json({ received: true, status: result.status }, { status: 200 });
      },
    },
  },
});
