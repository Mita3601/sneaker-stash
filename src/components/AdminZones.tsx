import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export type AdminZone = "bfci" | "cm" | "all";

export const ADMIN_ZONES: { value: AdminZone; label: string }[] = [
  { value: "bfci", label: "Burkina & Côte d'Ivoire" },
  { value: "cm", label: "Cameroun" },
  { value: "all", label: "Récapitulatif global" },
];

/** Country dial codes: +226 Burkina, +225 Côte d'Ivoire, +237 Cameroun. */
export function zoneOf(countryCode: string | null | undefined): AdminZone | null {
  const c = String(countryCode ?? "").replace(/\D/g, "");
  if (c === "226" || c === "225") return "bfci";
  if (c === "237") return "cm";
  return null;
}

export function inZone(countryCode: string | null | undefined, zone: AdminZone) {
  return zone === "all" || zoneOf(countryCode) === zone;
}

export function ZoneTabs({ zone, onChange }: { zone: AdminZone; onChange: (z: AdminZone) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
      {ADMIN_ZONES.map((z) => (
        <button
          key={z.value}
          type="button"
          onClick={() => onChange(z.value)}
          className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
            zone === z.value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background/50"
          }`}
        >
          {z.label}
        </button>
      ))}
    </div>
  );
}

/** Approved deposits, approved withdrawals and remaining balance for a zone. */
export function ZoneSummary({ zone }: { zone: AdminZone }) {
  const { data = [] } = useQuery({
    queryKey: ["admin-zone-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, profiles(country_code)")
        .in("type", ["deposit", "withdraw"])
        .eq("status", "approved");
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = data.filter((tx) => inZone(tx.profiles?.country_code, zone));
  const sum = (type: string) =>
    rows.filter((tx) => tx.type === type).reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const dep = sum("deposit");
  const wd = sum("withdraw");
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Dépôts validés", value: dep, hint: "Montant total" },
        { label: "Retraits validés", value: wd, hint: "Déboursé" },
        { label: "Reste", value: dep - wd, hint: "En réserve" },
      ].map((c) => (
        <Card key={c.label} className="p-3 text-center">
          <p className="text-xs opacity-90">{c.label}</p>
          <p className="text-lg font-black">{fcfa(c.value)}</p>
          <p className="text-xs text-muted-foreground">{c.hint}</p>
        </Card>
      ))}
    </div>
  );
}
