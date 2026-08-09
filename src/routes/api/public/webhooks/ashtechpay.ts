import { createFileRoute } from "@tanstack/react-router";

type WebhookBody = Record<string, unknown>;

function timingSafeEqualString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function str(value: unknown) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

/** Notre référence locale est encodée dans le nom/email du client sur le lien. */
function localRefs(raw: string) {
  const matches = raw.toUpperCase().match(/DEP-[A-Z0-9]{6,20}/g) ?? [];
  return [...new Set(matches)];
}

export const Route = createFileRoute("/api/public/webhooks/ashtechpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["ASHTECHPAY_WEBHOOK_TOKEN"];
        if (!expected) return new Response("Not configured", { status: 503 });

        const url = new URL(request.url);
        const token =
          url.searchParams.get("token") ?? request.headers.get("x-webhook-token") ?? "";
        if (!timingSafeEqualString(token, expected)) {
          return new Response("Invalid token", { status: 401 });
        }

        const raw = await request.text();
        let body: WebhookBody;
        try {
          body = JSON.parse(raw) as WebhookBody;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const event = str(body["event"]).toLowerCase();
        const status = str(body["status"]).toLowerCase();
        const reference = str(body["reference"]) || str(body["order_id"]);
        const txId = str(body["transaction_id"]) || str(body["transactionId"]) || str(body["id"]);

        const success =
          event === "payment.completed" ||
          ["success", "successful", "completed", "paid", "approved"].includes(status);
        const failed =
          event === "payment.failed" ||
          ["failed", "cancelled", "canceled", "rejected", "expired"].includes(status);

        if (!success && !failed) {
          return new Response(JSON.stringify({ received: true, ignored: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const metadata = {
          gateway: "ashtechpay_link",
          gateway_event: event || status,
          gateway_status: status || null,
          gateway_transaction_id: txId || reference || null,
          gateway_amount: body["amount"] ?? null,
          gateway_total_amount: body["total_amount"] ?? null,
        };

        const candidates = [reference, txId, ...localRefs(raw)].filter(Boolean);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const candidate of candidates) {
          const { data } = await supabaseAdmin.rpc("gateway_confirm_deposit", {
            _reference: candidate,
            _success: success,
            _metadata: metadata,
          });
          const result = (data ?? {}) as { ok?: boolean; reason?: string };
          if (result.ok && result.reason !== "not_found") break;
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

