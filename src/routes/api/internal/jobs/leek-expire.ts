import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/jobs/leek-expire")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Fetch recent pending gateway deposits for leekpay
        const { data: rows, error } = await supabaseAdmin
          .from("transactions")
          .select("reference, metadata, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) return new Response(error.message, { status: 500 });

        const now = Date.now();
        const cutoff = now - 15 * 60 * 1000; // 15 minutes

        let processed = 0;
        for (const row of (rows ?? []) as any[]) {
          try {
            const meta = row.metadata ?? {};
            const gateway = meta?.gateway ?? meta?.gateway_name ?? null;
            if (gateway !== "leekpay") continue;
            const created = new Date(row.created_at).getTime();
            if (isNaN(created) || created > cutoff) continue;

            // mark as failed
            await supabaseAdmin.rpc("gateway_confirm_deposit", {
              _reference: row.reference,
              _success: false,
              _metadata: { gateway: "leekpay", gateway_event: "expired_by_server" },
            });
            processed += 1;
          } catch {
            // ignore individual errors
          }
        }

        return new Response(JSON.stringify({ processed }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
