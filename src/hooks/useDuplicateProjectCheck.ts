import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface DuplicateResult {
  id: string;
  lot_number: string;
  deleted_at: string | null;
}

interface UseDuplicateProjectCheckParams {
  builderId: string;
  locationId: string;
  lotNumber: string;
  excludeProjectId?: string;
}

export function useDuplicateProjectCheck({
  builderId,
  locationId,
  lotNumber,
  excludeProjectId,
}: UseDuplicateProjectCheckParams) {
  const { organizationId } = useOrganization();
  const [duplicate, setDuplicate] = useState<DuplicateResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDuplicate(null);

    if (!builderId || !locationId || !lotNumber.trim() || !organizationId) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      let query = supabase
        .from("projects")
        .select("id, lot_number, deleted_at")
        .eq("organization_id", organizationId)
        .eq("builder_id", builderId)
        .eq("location_id", locationId)
        .ilike("lot_number", lotNumber.trim())
        .limit(1);

      if (excludeProjectId) {
        query = query.neq("id", excludeProjectId);
      }

      const { data } = await query;
      setDuplicate(data && data.length > 0 ? data[0] : null);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [builderId, locationId, lotNumber, organizationId, excludeProjectId]);

  return duplicate;
}
