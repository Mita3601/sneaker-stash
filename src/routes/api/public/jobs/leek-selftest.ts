import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/jobs/leek-selftest")({
  server: {
    handlers: {
      GET: async () => {
        const { createCheckout, getCheckout } = await import("@/lib/leek.server");
        const created = await createCheckout({
          amount: 200,
          currency: "XOF",
          description: "selftest",
          customer_email: "selftest@nike.app",
        });
        const id = String(
          (created.body["data"] as Record<string, unknown> | undefined)?.["id"] ?? "",
        );
        const fetched = id ? await getCheckout(id) : null;
        const key = (process.env["LEEKPAY_SECRET_KEY"] ?? "").trim();
        return Response.json({
          keyPrefix: key.slice(0, 8),
          keyLength: key.length,
          created,
          fetched,
        });
      },
    },
  },
});
