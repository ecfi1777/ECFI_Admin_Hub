import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo, useRef } from "react";

interface Organization {
  id: string;
  name: string;
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
  defaultOrganizationId: string | null;
  setDefaultOrganization: (orgId: string | null) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

const ACTIVE_ORG_KEY = "ecfi_active_organization_id";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const queryClient = useQueryClient();
  const hasInitializedActiveOrg = useRef(false);
  const previousUserId = useRef<string | null>(null);
  
  // Get active org from localStorage, with fallback to first org
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACTIVE_ORG_KEY);
    }
    return null;
  });

  // Only enable query when auth is fully ready AND we have a user
  const shouldFetchOrgs = authInitialized && !!user?.id;

  // Fetch the user's default_organization_id from their profile
  const { data: profileData } = useQuery({
    queryKey: ["profile-default-org", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("default_organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: shouldFetchOrgs,
    staleTime: 5 * 60 * 1000,
  });

  const defaultOrganizationId = profileData?.default_organization_id ?? null;

  // Fetch ALL organizations the user belongs to
  const { data: allMemberships, isLoading: queryLoading, error, refetch, isFetched } = useQuery({
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
            name
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
    enabled: shouldFetchOrgs,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Determine the current active organization (memoized to prevent recalculation)
  const currentMembership = useMemo(() => {
    if (!allMemberships || allMemberships.length === 0) return null;
    return allMemberships.find(m => m.organization_id === activeOrgId) || allMemberships[0];
  }, [allMemberships, activeOrgId]);

  // Sync activeOrgId with localStorage and ensure it's valid - only run once per data load
  // Use the user's default org preference when no saved active org exists
  useEffect(() => {
    if (!allMemberships || allMemberships.length === 0) return;
    if (hasInitializedActiveOrg.current && previousUserId.current === user?.id) return;
    
    const validOrg = allMemberships.find(m => m.organization_id === activeOrgId);
    if (!validOrg) {
      // No valid saved org - try default org, then fall back to first
      const defaultOrg = defaultOrganizationId
        ? allMemberships.find(m => m.organization_id === defaultOrganizationId)
        : null;
      const targetOrgId = defaultOrg ? defaultOrg.organization_id : allMemberships[0].organization_id;
      setActiveOrgIdState(targetOrgId);
      localStorage.setItem(ACTIVE_ORG_KEY, targetOrgId);
    }
    hasInitializedActiveOrg.current = true;
    previousUserId.current = user?.id ?? null;
  }, [allMemberships, activeOrgId, user?.id, defaultOrganizationId]);

  // Reset initialization flag when user changes
  useEffect(() => {
    if (user?.id !== previousUserId.current) {
      hasInitializedActiveOrg.current = false;
    }
  }, [user?.id]);

  // Switch organization - updates state and invalidates queries
  const switchOrganization = useCallback((orgId: string) => {
    if (orgId === activeOrgId) return; // No-op if same org
    setActiveOrgIdState(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    // Invalidate all queries to force refetch with new org
    queryClient.invalidateQueries();
  }, [queryClient, activeOrgId]);

  // Set or clear the default organization preference
  const setDefaultOrganization = useCallback(async (orgId: string | null) => {
    if (!user?.id) return;
    await supabase
      .from("profiles")
      .update({ default_organization_id: orgId })
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["profile-default-org"] });
  }, [user?.id, queryClient]);

  // Simplified loading state:
  // - If auth isn't initialized, we're loading
  // - If we have a user and haven't fetched orgs yet, we're loading
  const isLoading = useMemo(() => {
    if (!authInitialized) return true;
    if (user && !isFetched) return true;
    return false;
  }, [authInitialized, user, isFetched]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<OrganizationContextValue>(() => ({
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
    defaultOrganizationId,
    setDefaultOrganization,
  }), [currentMembership, allMemberships, switchOrganization, isLoading, error, refetch, defaultOrganizationId, setDefaultOrganization]);

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
