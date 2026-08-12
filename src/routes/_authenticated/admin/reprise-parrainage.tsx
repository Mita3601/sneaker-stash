import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Btn, Card, Field, SubHeader, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

const RATES: Record<number, number> = {
  1: 0.27,
  2: 0.02,
  3: 0.01,
};

type Profile = {
  id: string;
  phone: string;
  referred_by: string | null;
};

type Purchase = {
  id: string;
  user_id: string;
  purchase_date: string | null;
  status: string;
  product_id: string;
  products: { name: string | null; price: number } | null;
};

function getReferralLevel(sponsorId: string, profile: Profile, profiles: Profile[]) {
  let current = profile;
  let depth = 0;

  while (current.referred_by && depth < 3) {
    if (current.referred_by === sponsorId) return depth + 1;
    const parent = profiles.find((item) => item.id === current.referred_by);
    if (!parent) break;
    current = parent;
    depth += 1;
  }

  return 0;
}

export const Route = createFileRoute("/_authenticated/admin/reprise-parrainage")({
  head: () => ({
    meta: [
      { title: "Admin - Reprise parrainage — Nike" },
      {
        name: "description",
        content: "Reprendre une commission de parrainage accordée lors de l'achat d'un filleul.",
      },
    ],
  }),
  component: AdminRepriseParrainage,
});

function AdminRepriseParrainage() {
  const qc = useQueryClient();
  const [sponsorId, setSponsorId] = useState("");
  const [childId, setChildId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-referral-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, referred_by")
        .order("phone", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["admin-referral-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_products")
        .select("id, user_id, purchase_date, status, product_id, products(name, price)")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Purchase[];
    },
  });

  const sponsors = useMemo(() => {
    return profiles.filter((profile) => profiles.some((child) => child.referred_by === profile.id));
  }, [profiles]);

  const children = useMemo(() => {
    if (!sponsorId) return [];
    return profiles
      .map((profile) => ({
        ...profile,
        level: getReferralLevel(sponsorId, profile, profiles),
      }))
      .filter((profile) => profile.level > 0)
      .sort((a, b) => a.level - b.level || a.phone.localeCompare(b.phone));
  }, [profiles, sponsorId]);

  const selectedChild = children.find((profile) => profile.id === childId);
  const childPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.user_id === childId),
    [purchases, childId],
  );

  const selectedPurchase = childPurchases.find((purchase) => purchase.id === purchaseId);

  const commissionAmount = useMemo(() => {
    if (!selectedPurchase || !selectedChild) return 0;
    const rate = RATES[selectedChild.level] ?? 0;
    const price = Number(selectedPurchase.products?.price ?? 0);
    return Number((price * rate).toFixed(2));
  }, [selectedChild, selectedPurchase]);

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!sponsorId || !selectedPurchase || !selectedChild) {
        throw new Error("Veuillez sélectionner le parrain, le filleul et l'achat.");
      }

      const { error } = await supabase.rpc("admin_adjust_balance", {
        _user_id: sponsorId,
        _amount: -commissionAmount,
        _reason: `Reprise commission parrainage pour ${selectedChild.phone} (${selectedPurchase.products?.name ?? selectedPurchase.product_id})`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Commission reprise avec succès");
      setSponsorId("");
      setChildId("");
      setPurchaseId("");
      qc.invalidateQueries({ queryKey: ["admin-referral-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-referral-purchases"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div>
      <SubHeader title="Reprise parrainage" to="/admin" />
      <div className="space-y-4 p-4">
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-bold">Sélection du parrain</p>
            <p className="text-xs text-muted-foreground">
              Choisissez le parrain dont vous souhaitez annuler une commission.
            </p>
          </div>
          <Field label="Parrain">
            <select
              className={inputClass}
              value={sponsorId}
              onChange={(event) => {
                setSponsorId(event.target.value);
                setChildId("");
                setPurchaseId("");
              }}
            >
              <option value="">Choisir un parrain</option>
              {sponsors.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.phone}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        {sponsorId ? (
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-bold">Filleul concerné</p>
              <p className="text-xs text-muted-foreground">
                Sélectionnez un filleul du parrain choisi.
              </p>
            </div>
            <Field label="Filleul">
              <select
                className={inputClass}
                value={childId}
                onChange={(event) => {
                  setChildId(event.target.value);
                  setPurchaseId("");
                }}
              >
                <option value="">Choisir un filleul</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.phone} — niveau {child.level}
                  </option>
                ))}
              </select>
            </Field>

            {childId ? (
              <Field label="Achat du filleul">
                <select
                  className={inputClass}
                  value={purchaseId}
                  onChange={(event) => setPurchaseId(event.target.value)}
                >
                  <option value="">Choisir un achat</option>
                  {childPurchases.map((purchase) => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.products?.name ?? purchase.product_id} —{" "}
                      {new Date(purchase.purchase_date ?? "").toLocaleDateString()} —{" "}
                      {fcfa(purchase.products?.price ?? 0)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {selectedPurchase ? (
              <div className="space-y-3 rounded-3xl border border-border bg-slate-50 p-4">
                <p className="text-sm font-semibold">Montant de reprise</p>
                <p className="text-2xl font-black">{fcfa(commissionAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  Cette somme correspond à la commission calculée pour le niveau{" "}
                  {selectedChild?.level}.
                </p>
              </div>
            ) : null}

            <Btn
              className="w-full"
              disabled={
                !sponsorId ||
                !childId ||
                !purchaseId ||
                commissionAmount <= 0 ||
                revokeMutation.isPending
              }
              onClick={() => revokeMutation.mutate()}
            >
              {revokeMutation.isPending ? "En cours..." : "Reprendre la commission"}
            </Btn>
          </Card>
        ) : null}

        <Card className="space-y-3 bg-gradient-primary text-primary-foreground">
          <p className="text-sm font-bold">Instructions</p>
          <p className="text-sm">
            Cette page vous permet d’annuler une commission de parrainage liée à l’achat d’un
            filleul. La correction se fait par ajustement de solde sur le compte du parrain.
          </p>
        </Card>
      </div>
    </div>
  );
}
