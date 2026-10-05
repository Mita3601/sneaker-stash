import { createFileRoute } from "@tanstack/react-router";

const ok = () => new Response("success", { status: 200, headers: { "Content-Type": "text/plain" } });

/**
 * Notification PRISCA (recouvrement). Signature vérifiée, puis statut revérifié
 * via /collection/query avant tout crédit. Répond toujours "success" (HTTP 200).
 */
export const Route = createFileRoute("/api/public/webhooks/prisca")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { verifyNotification } = await import("@/lib/prisca.server");
        if (!verifyNotification(raw, request.headers.get("authorization"))) {
          console.warn("PRISCA webhook: signature invalide, notification ignorée");
          return ok();
        }
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return ok();
        }
        const refId = String(body["refId"] ?? "").trim();
        if (!refId) return ok();
        try {
          const { syncDeposit } = await import("@/lib/prisca-sync.server");
          await syncDeposit(refId);
        } catch (e) {
          console.error("PRISCA webhook processing error", e);
          return new Response("error", { status: 500 });
        }
        return ok();
      },
    },
  },
});
