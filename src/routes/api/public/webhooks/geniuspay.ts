import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook GeniusPay. Signature HMAC + horodatage vérifiés AVANT tout traitement.
 * Le statut est ensuite revérifié auprès de GeniusPay avant tout crédit (idempotent).
 */
export const Route = createFileRoute("/api/public/webhooks/geniuspay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { verifyWebhook } = await import("@/lib/geniuspay.server");
        const check = verifyWebhook(
          raw,
          request.headers.get("x-webhook-signature"),
          request.headers.get("x-webhook-timestamp"),
        );
        if (!check.ok) {
          console.warn("GeniusPay webhook rejeté:", check.reason);
          return Response.json({ status: 401, detail: "Invalid signature" }, { status: 401 });
        }

        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return Response.json({ received: true, ignored: "invalid_json" });
        }
        const event = String(body["event"] ?? request.headers.get("x-webhook-event") ?? "");
        const data = (body["data"] as Record<string, unknown> | undefined) ?? {};
        const reference = String(data["reference"] ?? "").trim();
        if (!event.startsWith("payment.") || !reference) {
          return Response.json({ received: true, ignored: event || "no_event" });
        }

        try {
          const { syncDeposit } = await import("@/lib/geniuspay-sync.server");
          const result = await syncDeposit(reference);
          return Response.json({ received: true, status: result.status });
        } catch (e) {
          console.error("GeniusPay webhook processing error", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
