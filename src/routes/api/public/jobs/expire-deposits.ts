import { createFileRoute } from "@tanstack/react-router";

/**
 * Filet de sécurité (à appeler toutes les 1-2 min) : revérifie les dépôts encore
 * en attente auprès de MoneyFusion, crédite ceux qui sont payés et marque échoués
 * ceux dépassant 15 minutes.
 */
export const Route = createFileRoute("/api/public/jobs/expire-deposits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = (
          process.env["CRON_SECRET"] ??
          process.env["MONEYFUSION_API_URL"] ??
          ""
        ).trim();
        const provided = (
          request.headers.get("x-cron-secret") ??
          request.headers.get("x-job-key") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          ""
        ).trim();
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabase } = await import("@/integrations/supabase/client");
        const { data: rows, error } = await supabase.rpc("list_pending_moneyfusion_deposits", {
          p_limit: 500,
        });
        if (error) return new Response(error.message, { status: 500 });

        const { syncDeposit } = await import("@/lib/moneyfusion-sync.server");
        let credited = 0;
        let expired = 0;

        for (const row of (rows ?? []) as {
          reference: string | null;
          metadata: Record<string, unknown> | null;
        }[]) {
          const meta = (row.metadata ?? {}) as Record<string, unknown>;
          if (meta["gateway"] !== "moneyfusion") continue;
          if (!row.reference) continue;
          try {
            const result = await syncDeposit(row.reference);
            if (result.status === "approved") credited += 1;
            if (result.status === "rejected") expired += 1;
          } catch {
            // on continue avec les autres dépôts
          }
        }

        return Response.json({ credited, expired }, { status: 200 });
      },
    },
  },
});
