import { createFileRoute } from "@tanstack/react-router";

/** Filet de sécurité : revérifie les dépôts GeniusPay en attente, crédite les payés, expire après 15 min. */
export const Route = createFileRoute("/api/public/jobs/expire-deposits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = (process.env["CRON_SECRET"] ?? "").trim();
        const provided = (
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          ""
        ).trim();
        if (!secret || provided !== secret) return new Response("Unauthorized", { status: 401 });

        const { supabase } = await import("@/integrations/supabase/client");
        const { data: rows, error } = await supabase.rpc("list_pending_gateway_deposits", {
          p_gateway: "geniuspay",
          p_limit: 500,
        });
        if (error) return new Response(error.message, { status: 500 });

        const { syncDeposit } = await import("@/lib/geniuspay-sync.server");
        let credited = 0;
        let expired = 0;
        for (const row of (rows ?? []) as { reference: string | null }[]) {
          if (!row.reference) continue;
          try {
            const r = await syncDeposit(row.reference);
            if (r.status === "approved") credited += 1;
            if (r.status === "rejected") expired += 1;
          } catch {
            // continuer
          }
        }
        return Response.json({ credited, expired });
      },
    },
  },
});
