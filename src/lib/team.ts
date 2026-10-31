import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TEAM_LEVELS = [
  { level: 1, rate: "27 %" },
  { level: 2, rate: "2 %" },
  { level: 3, rate: "1 %" },
] as const;

export type TeamMember = {
  id: string;
  phone: string;
  created_at: string;
  firstPurchasePrice: number | null;
};

export function teamQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: ["team", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TeamMember[][]> => {
      if (!userId) return [[], [], []];
      const levels: TeamMember[][] = [];
      let parentIds = [userId];
      for (let level = 0; level < 3; level++) {
        if (!parentIds.length) {
          levels.push([]);
          continue;
        }
        const { data, error } = await supabase.from("profiles")
          .select("id, phone, created_at")
          .in("referred_by", parentIds)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const members = (data ?? []).map((member) => ({ ...member, firstPurchasePrice: null as number | null }));
        levels.push(members);
        parentIds = members.map((member) => member.id);
      }
      const allIds = levels.flat().map((member) => member.id);
      if (allIds.length) {
        const { data, error } = await supabase.from("user_products")
          .select("user_id, purchase_date, products(price)")
          .in("user_id", allIds)
          .order("purchase_date", { ascending: true });
        if (error) throw error;
        const firstPrices = new Map<string, number>();
        for (const purchase of data ?? []) {
          if (!firstPrices.has(purchase.user_id) && purchase.products) {
            firstPrices.set(purchase.user_id, Number(purchase.products.price));
          }
        }
        for (const member of levels.flat()) {
          member.firstPurchasePrice = firstPrices.get(member.id) ?? null;
        }
      }
      return levels;
    },
    staleTime: 30_000,
  });
}