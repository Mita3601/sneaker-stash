import { createFileRoute } from "@tanstack/react-router";

function str(v: unknown) {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

function localRefs(raw: string) {
  const matches = raw.toUpperCase().match(/DEP-[A-Z0-9]{6,20}/g) ?? [];
  return [...new Set(matches)];
}

function mergeCandidates(raw: string, body: Record<string, unknown>, checkoutId: string) {
  const metadata = (body["metadata"] as Record<string, unknown>) ?? {};
  const candidates = [
    checkoutId,
    str(body["reference"]),
    str((body["data"] as Record<string, unknown>)?.["reference"]),
    str(metadata["local_reference"]),
    ...localRefs(raw),
  ].filter(Boolean);

  return [...new Set(candidates)];
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

        const eventHeader =
          request.headers.get("x-leekpay-event") || request.headers.get("X-LeekPay-Event");
        const event = str(body["event"] || eventHeader).toLowerCase();
        const data = (body["data"] as Record<string, unknown>) ?? {};
        const checkoutId = str(
          data["checkout_id"] || data["transaction_id"] || data["checkoutId"] || "",
        );
        const status = str(data["status"] || "").toLowerCase();
        const success =
          event === "payment.completed" || ["paid", "completed", "successful"].includes(status);
        const failed =
          event === "payment.failed" ||
          event === "payment.cancelled" ||
          ["failed", "cancelled", "expired"].includes(status);

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

        if (signature && publicKey && !verified) {
          return new Response(JSON.stringify({ received: false, reason: "invalid_signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const metadata = {
          gateway: "leekpay",
          gateway_event: event || status,
          gateway_status: status || null,
          gateway_transaction_id: checkoutId || null,
          gateway_amount: (data["amount"] as number | string | null) ?? null,
        };

        const confirmDeposit = async (reference: string, isSuccess: boolean) => {
          const { data: rpc } = await supabaseAdmin.rpc("gateway_confirm_deposit", {
            _reference: reference,
            _success: isSuccess,
            _metadata: {
              ...metadata,
              gateway_event: event || status || metadata.gateway_event,
              gateway_status: status || metadata.gateway_status,
            },
          });
          const result = (rpc ?? {}) as { ok?: boolean; reason?: string };
          return result;
        };

        if (!verified && checkoutId) {
          try {
            const { getCheckout } = await import("@/lib/leek.server");
            const res = await getCheckout(checkoutId);
            const remoteStatus = String((res.body["data"] as Record<string, unknown> | undefined)?.["status"] ?? "").toLowerCase();
            const remoteSuccess = ["paid", "completed", "successful"].includes(remoteStatus);
            const remoteFailed = ["failed", "cancelled", "expired"].includes(remoteStatus);

            if (remoteSuccess || remoteFailed) {
              const candidates = mergeCandidates(raw, body, checkoutId);
              for (const candidate of candidates) {
                const result = await confirmDeposit(candidate, remoteSuccess);
                if (result.ok && result.reason !== "not_found") break;
              }
              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }
          } catch {
            // fallback to incoming event processing below
          }
        }

        if (!success && !failed) {
          return new Response(JSON.stringify({ received: true, ignored: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const candidates = mergeCandidates(raw, body, checkoutId);
        for (const candidate of candidates) {
          const result = await confirmDeposit(candidate, success);
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
