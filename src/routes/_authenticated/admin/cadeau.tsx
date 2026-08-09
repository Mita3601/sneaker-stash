import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, SubHeader, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { shortDate } from "@/lib/app";

export const Route = createFileRoute("/_authenticated/admin/cadeau")({
  head: () => ({
    meta: [
      { title: "Admin - Cadeaux — Nike" },
      { name: "description", content: "Créez des coupons cadeaux pour les utilisateurs." },
    ],
  }),
  component: AdminCadeau,
});

function AdminCadeau() {
  const qc = useQueryClient();
  const [giftCode, setGiftCode] = useState("");
  const [giftAmount, setGiftAmount] = useState(0);
  const [giftDuration, setGiftDuration] = useState(7);
  const [giftUsers, setGiftUsers] = useState(1);

  const { data: giftCodes = [] } = useQuery({
    queryKey: ["admin-gift-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_gift_codes" as never);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        code: string;
        amount: number;
        max_redemptions: number;
        redeemed_count: number;
        expires_at: string | null;
        created_at: string;
      }>;
    },
  });

  const createGiftCode = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_gift_code", {
        _code: giftCode,
        _amount: giftAmount,
        _duration_days: giftDuration,
        _max_redemptions: giftUsers,
      });
      if (error) throw error;
      return data as { code?: string };
    },
    onSuccess: (data) => {
      toast.success(`Code créé : ${data?.code ?? giftCode}`);
      setGiftCode("");
      setGiftAmount(0);
      setGiftDuration(7);
      setGiftUsers(1);
      qc.invalidateQueries({ queryKey: ["admin-gift-codes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <SubHeader title="Cadeaux" to="/admin" />
      <div className="space-y-4 p-4">
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-bold">Créer un coupon cadeau</p>
            <p className="text-xs text-muted-foreground">
              Attribuez un code, un montant et un nombre d'utilisateurs.
            </p>
          </div>
          <div className="space-y-3">
            <Field label="Code cadeau">
              <input
                type="text"
                value={giftCode}
                onChange={(event) => setGiftCode(event.target.value.toUpperCase())}
                placeholder="EX: CADEAU2026"
                className={inputClass}
              />
            </Field>
            <Field label="Montant (FCFA)">
              <input
                type="number"
                min={100}
                value={giftAmount === 0 ? "" : giftAmount}
                onChange={(event) => setGiftAmount(Number(event.target.value))}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Durée (jours)">
                <input
                  type="number"
                  min={1}
                  value={giftDuration}
                  onChange={(event) => setGiftDuration(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Max redemptions">
                <input
                  type="number"
                  min={1}
                  value={giftUsers}
                  onChange={(event) => setGiftUsers(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>
            <Btn
              className="w-full"
              disabled={!giftCode || giftAmount <= 0 || createGiftCode.isPending}
              onClick={() => createGiftCode.mutate()}
            >
              {createGiftCode.isPending ? "Création..." : "Créer le coupon"}
            </Btn>
          </div>
        </Card>

        {giftCodes.length === 0 ? (
          <Card className="text-center">Aucun coupon créé.</Card>
        ) : (
          <div className="space-y-3">
            {giftCodes.map((code) => (
              <Card key={code.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{code.code}</p>
                  <span className="text-xs text-muted-foreground">
                    {shortDate(code.created_at)}
                  </span>
                </div>
                <p className="text-sm">Montant : {Number(code.amount).toLocaleString()} FCFA</p>
                <p className="text-sm">
                  Utilisations : {code.redeemed_count}/{code.max_redemptions}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expire le {shortDate(code.expires_at)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
