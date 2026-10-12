import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Btn, Field, inputClass } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/app";

export function GiftCodeForm() {
  const qc = useQueryClient();
  const [giftCode, setGiftCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  async function redeemGiftCode() {
    if (!giftCode.trim()) {
      toast.error("Entrez un code cadeau");
      return;
    }
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("claim_gift_code", { _code: giftCode });
      if (error) throw error;
      toast.success(`Bonus reçu : +${fcfa((data as { amount?: number })?.amount ?? 0)}`);
      setGiftCode("");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de valider le code cadeau");
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Code cadeau">
        <input value={giftCode} onChange={(event) => setGiftCode(event.target.value.toUpperCase())} className={inputClass} />
      </Field>
      <Btn full disabled={isRedeeming || !giftCode.trim()} onClick={redeemGiftCode}>
        {isRedeeming ? "Validation..." : "Confirmer"}
      </Btn>
    </div>
  );
}