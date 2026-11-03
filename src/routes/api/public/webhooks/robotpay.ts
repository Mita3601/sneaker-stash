import { createFileRoute } from "@tanstack/react-router";

import { verifyRobotpayWebhook } from "@/lib/robotpay.server";

export const Route = createFileRoute("/api/public/webhooks/robotpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-robotpay-signature");

        const check = verifyRobotpayWebhook(raw, signature);
        if (!check.ok) {
          console.warn("RobotPay webhook rejeté:", check.reason);
          return Response.json({ error: "Signature invalide" }, { status: 401 });
        }

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return Response.json({ received: true, ignored: "invalid_json" });
        }

        const event = String(body["event"] ?? "");
        if (event !== "payment.confirmed") {
          return Response.json({ received: true, ignored: event || "ignored_event" });
        }

        const merchantSlug = String(body["merchantSlug"] ?? "");
        const txId = String(body["txId"] ?? "");
        const amount = Number(body["amount"] ?? 0);

        if (!merchantSlug || !txId || !Number.isFinite(amount) || amount <= 0) {
          return Response.json({ received: true, ignored: "invalid_payload" });
        }

        return Response.json({ received: true, txId, amount });
      },
    },
  },
});
