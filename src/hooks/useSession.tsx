import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
}

export function useProfile() {
  const qc = useQueryClient();
  const { data: authUser } = useCurrentUser();
  const userId = authUser?.id ?? null;

  const query = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        throw new Error("Profil introuvable pour l'utilisateur authentifié.");
      }

      return data;
    },
    retry: false,
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      qc.removeQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      qc.invalidateQueries({ queryKey: ["is-admin"] });
    });

    const channel = supabase
      .channel(`profile-live-${userId ?? "guest"}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["profile"] });
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  return query;
}

export function useIsAdmin() {
  const { data: authUser } = useCurrentUser();
  const userId = authUser?.id ?? null;

  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}
