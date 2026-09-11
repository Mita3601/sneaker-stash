import { createFileRoute } from "@tanstack/react-router";

/**
 * Tâche planifiée (toutes les 1-2 min) : vérifie les dépôts encore en attente
 * auprès d'Ashtech Pay, crédite ceux qui sont payés et marque échoués ceux
 * dépassant 15 minutes.
 */
export const Route = createFileRoute("/api/public/jobs/expire-deposits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = (process.env["ASHTECHPAY_HP_LIVE_KEY"] ?? "").trim();
        const provided = (
          request.headers.get("x-job-key") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          ""
        ).trim();
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows, error } = await supabaseAdmin
          .from("transactions")
          .select("reference, metadata, created_at")
          .eq("type", "deposit")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) return new Response(error.message, { status: 500 });

        const { syncDeposit } = await import("@/lib/ashtech-sync.server");
        let credited = 0;
        let expired = 0;

        for (const row of rows ?? []) {
          const meta = (row.metadata ?? {}) as Record<string, unknown>;
          if (meta["gateway"] !== "ashtechpay") continue;
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
