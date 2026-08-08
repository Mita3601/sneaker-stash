import { createFileRoute } from "@tanstack/react-router";

type WebhookBody = {
  event?: string;
  reference?: string;
  transaction_id?: string;
  status?: string;
  amount?: number;
  total_amount?: number;
  currency?: string;
};

function timingSafeEqualString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

        let body: WebhookBody;
        try {
          body = (await request.json()) as WebhookBody;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const reference = typeof body.reference === "string" ? body.reference : "";
        const event = typeof body.event === "string" ? body.event : "";
        if (!reference || !event.startsWith("payment.")) {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.rpc("gateway_confirm_deposit", {
          _reference: reference,
          _success: event === "payment.completed",
          _metadata: {
            gateway_event: event,
            gateway_status: body.status ?? null,
            gateway_transaction_id: body.transaction_id ?? null,
            gateway_net_amount: body.amount ?? null,
            gateway_total_amount: body.total_amount ?? null,
          },
        });

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
