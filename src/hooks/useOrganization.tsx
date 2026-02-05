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

      // Use maybeSingle or limit 1 to handle users with multiple memberships
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
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Organization fetch error:", error);
        throw error;
      }
      
      console.log("Organization data fetched:", data);
      return data as unknown as OrganizationMembership | null;
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
