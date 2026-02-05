import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Organization {
  id: string;
  name: string;
  invite_code: string;
}

interface OrganizationMembership {
  organization_id: string;
  role: string;
  organizations: Organization;
}

export function useOrganization() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["organization", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("organization_memberships")
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            invite_code
          )
        `)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as unknown as OrganizationMembership;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetching on tab focus
    refetchOnWindowFocus: false, // Prevent refetch when switching tabs
    retry: false, // Don't retry on error (user might not have org yet)
  });

  return {
    organizationId: data?.organization_id ?? null,
    organization: data?.organizations ?? null,
    role: data?.role ?? null,
    isLoading,
    error,
    isOwner: data?.role === "owner",
    refetch,
  };
}
