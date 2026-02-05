import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useState, useEffect, useCallback, useRef } from "react";

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

const ACTIVE_ORG_KEY = "ecfi_active_organization_id";

export function useOrganization() {
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
      
      console.log("All organizations fetched:", data);
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

  // Track previous org to detect changes and invalidate queries
  const previousOrgIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Invalidate queries when organizationId changes (after initial load)
  useEffect(() => {
    const currentOrgId = currentMembership?.organization_id ?? null;
    
    if (isInitializedRef.current && previousOrgIdRef.current !== currentOrgId && currentOrgId) {
      // Organization actually changed - invalidate all queries
      console.log("Organization switched from", previousOrgIdRef.current, "to", currentOrgId, "- invalidating queries");
      queryClient.invalidateQueries();
    }
    
    // Mark as initialized after first valid org is set
    if (currentOrgId && !isInitializedRef.current) {
      isInitializedRef.current = true;
    }
    
    previousOrgIdRef.current = currentOrgId;
  }, [currentMembership?.organization_id, queryClient]);

  // Switch organization
  const switchOrganization = useCallback((orgId: string) => {
    setActiveOrgIdState(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
  }, []);

  return {
    // Current active organization
    organizationId: currentMembership?.organization_id ?? null,
    organization: currentMembership?.organizations ?? null,
    role: currentMembership?.role ?? null,
    isOwner: currentMembership?.role === "owner",
    
    // Multi-org support
    allOrganizations: allMemberships || [],
    switchOrganization,
    
    // Loading/error state
    isLoading,
    error,
    refetch,
    
    // Check if user has any organizations
    hasOrganization: (allMemberships?.length ?? 0) > 0,
  };
}
