/**
 * Hook to get the current user's role in the active organization.
 * Uses the get_my_role RPC (SECURITY DEFINER) for accurate role resolution.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface UserRole {
  role: string | null;
  isOwner: boolean;
  isManager: boolean;
  isViewer: boolean;
  canManage: boolean; // owner || manager
  isLoading: boolean;
}

export function useUserRole(): UserRole {
  const { organizationId, tentativeOrganizationId } = useOrganization();
  const effectiveOrgId = organizationId || tentativeOrganizationId;

  const { data: role = null, isLoading } = useQuery({
    queryKey: ["user-role", effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;
      const { data, error } = await supabase.rpc("get_my_role" as any, {
        p_organization_id: effectiveOrgId,
      });
      if (error) {
        console.error("Failed to fetch role:", error);
        return null;
      }
      return data as string | null;
    },
    enabled: !!effectiveOrgId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    role,
    isOwner: role === "owner",
    isManager: role === "manager",
    isViewer: role === "viewer",
    canManage: role === "owner" || role === "manager",
    isLoading,
  };
}
