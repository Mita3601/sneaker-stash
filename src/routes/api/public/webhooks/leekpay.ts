import { createFileRoute } from "@tanstack/react-router";

function str(v: unknown) {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

function localRefs(raw: string) {
  const matches = raw.toUpperCase().match(/DEP-[A-Z0-9]{6,20}/g) ?? [];
  return [...new Set(matches)];
}

export const Route = createFileRoute("/api/public/webhooks/leekpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const event = str(body["event"]).toLowerCase();
        const data = (body["data"] as Record<string, unknown>) ?? {};
        const checkoutId = str(
          data["checkout_id"] || data["transaction_id"] || data["checkoutId"] || "",
        );
        const status = str(data["status"] || "").toLowerCase();

        const success =
          event === "payment.completed" || ["paid", "completed", "successful"].includes(status);
        const failed =
          event === "payment.failed" || ["failed", "cancelled", "expired"].includes(status);

        // Best-effort verification: if a public key is configured, try verify signature.
        const signature =
          request.headers.get("x-leekpay-signature") || request.headers.get("X-LeekPay-Signature");
        const publicKey = process.env["LEEKPAY_PUBLIC_KEY"];
        let verified = false;
        if (signature && publicKey) {
          try {
            const { verifySignature } = await import("@/lib/leek.server");
            verified = verifySignature(raw, signature, publicKey as string);
          } catch {
            verified = false;
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // If signature not verified, fall back to confirming with LeekPay API using secret key.
        if (!verified && checkoutId) {
          try {
            const { getCheckout } = await import("@/lib/leek.server");
            const res = await getCheckout(checkoutId);
            const remoteStatus = String(res.body?.data?.status ?? "").toLowerCase();
            if (remoteStatus === "paid") {
              // treat as success
              for (const candidate of [checkoutId, ...localRefs(raw)]) {
                const { data: rpc } = await supabaseAdmin.rpc("gateway_confirm_deposit", {
                  _reference: candidate,
                  _success: true,
                  _metadata: {
                    gateway: "leekpay",
                    gateway_event: event || status,
                    gateway_status: remoteStatus,
                    gateway_transaction_id: checkoutId,
                    gateway_amount: data["amount"] ?? null,
                  },
                });
                const result = (rpc ?? {}) as { ok?: boolean; reason?: string };
                if (result.ok && result.reason !== "not_found") break;
              }
              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }
          } catch (err) {
            // ignore and continue to try handling incoming event
          }
        }

        if (!success && !failed) {
          return new Response(JSON.stringify({ received: true, ignored: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const metadata = {
          gateway: "leekpay",
          gateway_event: event || status,
          gateway_status: status || null,
          gateway_transaction_id: checkoutId || null,
          gateway_amount: data["amount"] ?? null,
        };

        const candidates = [checkoutId, ...localRefs(raw)].filter(Boolean);

        for (const candidate of candidates) {
          const { data: rpc } = await supabaseAdmin.rpc("gateway_confirm_deposit", {
            _reference: candidate,
            _success: success,
            _metadata: metadata,
          });
          const result = (rpc ?? {}) as { ok?: boolean; reason?: string };
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
