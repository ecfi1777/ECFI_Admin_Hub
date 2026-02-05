import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

interface Organization {
  id: string;
  name: string;
  invite_code: string;
}

interface OrganizationMembership {
  organization_id: string;
  role: string;
  created_at: string;
  organizations: Organization;
}

interface OrganizationContextValue {
  organizationId: string | null;
  organization: Organization | null;
  role: string | null;
  isOwner: boolean;
  allOrganizations: OrganizationMembership[];
  switchOrganization: (orgId: string) => void;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasOrganization: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

const ACTIVE_ORG_KEY = "ecfi_active_organization_id";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get active org from localStorage, with fallback to first org
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACTIVE_ORG_KEY);
    }
    return null;
  });

  // Fetch ALL organizations the user belongs to
  const { data: allMemberships, isLoading, error, refetch } = useQuery({
    queryKey: ["organizations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("organization_memberships")
        .select(`
          organization_id,
          role,
          created_at,
          organizations (
            id,
            name,
            invite_code
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Organization fetch error:", error);
        throw error;
      }
      
      return (data || []) as unknown as OrganizationMembership[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Determine the current active organization
  const currentMembership = allMemberships?.find(
    (m) => m.organization_id === activeOrgId
  ) || allMemberships?.[0] || null;

  // Sync activeOrgId with localStorage and ensure it's valid
  useEffect(() => {
    if (allMemberships && allMemberships.length > 0) {
      const validOrg = allMemberships.find(m => m.organization_id === activeOrgId);
      if (!validOrg) {
        // Active org not found, default to first org
        const firstOrgId = allMemberships[0].organization_id;
        setActiveOrgIdState(firstOrgId);
        localStorage.setItem(ACTIVE_ORG_KEY, firstOrgId);
      }
    }
  }, [allMemberships, activeOrgId]);

  // Switch organization - updates state and invalidates queries
  const switchOrganization = useCallback((orgId: string) => {
    setActiveOrgIdState(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    // Invalidate all queries to force refetch with new org
    queryClient.invalidateQueries();
  }, [queryClient]);

  const value: OrganizationContextValue = {
    organizationId: currentMembership?.organization_id ?? null,
    organization: currentMembership?.organizations ?? null,
    role: currentMembership?.role ?? null,
    isOwner: currentMembership?.role === "owner",
    allOrganizations: allMemberships || [],
    switchOrganization,
    isLoading,
    error: error as Error | null,
    refetch,
    hasOrganization: (allMemberships?.length ?? 0) > 0,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
