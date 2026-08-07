import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { Btn, Card, SubHeader } from "@/components/ui-kit";
import { useCurrentUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/app/missions")({
  head: () => ({
    meta: [
      { title: "Missions et récompenses — NikeStake" },
      {
        name: "description",
        content: "Invitez des investisseurs et achetez des paires VIP pour débloquer des bonus.",
      },
      { property: "og:title", content: "Missions et récompenses — NikeStake" },
      { property: "og:description", content: "Des bonus jusqu'à 10 000 FCFA à débloquer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Missions,
});

function Missions() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .rpc("refresh_missions", { _user_id: user.id })
      .then(() => qc.invalidateQueries({ queryKey: ["missions"] }));
  }, [user?.id, qc]);

  const { data: missions = [] } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("*, user_missions(*)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const claim = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase.rpc("claim_mission", { _mission_id: missionId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bonus crédité sur votre solde");
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <SubHeader title="Récompenses pour les tâches" />
      <div className="space-y-3 p-4">
        {missions.map((m) => {
          const progressRow = m.user_missions?.[0];
          const progress = Number(progressRow?.progress ?? 0);
          const done = Boolean(progressRow?.is_completed);
          const claimed = Boolean(progressRow?.bonus_claimed);
          const pct = Math.min(100, Math.round((progress / m.requirement_value) * 100));
          return (
            <Card key={m.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs font-extrabold text-primary">
                  {fcfa(m.bonus_amount)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {progress} / {m.requirement_value}
                </span>
                <Btn
                  className="px-3 py-2 text-xs"
                  variant={done && !claimed ? "primary" : "ghost"}
                  disabled={!done || claimed || claim.isPending}
                  onClick={() => claim.mutate(m.id)}
                >
                  {claimed ? "Réclamé" : done ? "Réclamer" : "En cours"}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
