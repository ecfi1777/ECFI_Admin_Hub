import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo, useRef } from "react";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationMembership {
  id: string;
  organization_id: string;
  role: string;
  created_at: string;
  display_order: number;
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
  saveOrganizationOrder: (orderedIds: string[]) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

const ACTIVE_ORG_KEY = "ecfi_active_organization_id";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const queryClient = useQueryClient();
  const hasInitializedActiveOrg = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACTIVE_ORG_KEY);
    }
    return null;
  });

  const shouldFetchOrgs = authInitialized && !!user?.id;

  // Fetch ALL organizations the user belongs to, sorted by display_order
  const { data: allMemberships, isLoading: queryLoading, error, refetch, isFetched } = useQuery({
    queryKey: ["organizations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("organization_memberships")
        .select(`
          id,
          organization_id,
          role,
          created_at,
          display_order,
          organizations (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Organization fetch error:", error);
        throw error;
      }
      
      return (data || []) as unknown as OrganizationMembership[];
    },
    enabled: shouldFetchOrgs,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const currentMembership = useMemo(() => {
    if (!allMemberships || allMemberships.length === 0) return null;
    return allMemberships.find(m => m.organization_id === activeOrgId) || allMemberships[0];
  }, [allMemberships, activeOrgId]);

  // On first load, if no valid saved org, use the first in sorted order (= user's default)
  useEffect(() => {
    if (!allMemberships || allMemberships.length === 0) return;
    if (hasInitializedActiveOrg.current && previousUserId.current === user?.id) return;
    
    const validOrg = allMemberships.find(m => m.organization_id === activeOrgId);
    if (!validOrg) {
      const targetOrgId = allMemberships[0].organization_id;
      setActiveOrgIdState(targetOrgId);
      localStorage.setItem(ACTIVE_ORG_KEY, targetOrgId);
    }
    hasInitializedActiveOrg.current = true;
    previousUserId.current = user?.id ?? null;
  }, [allMemberships, activeOrgId, user?.id]);

  useEffect(() => {
    if (user?.id !== previousUserId.current) {
      hasInitializedActiveOrg.current = false;
    }
  }, [user?.id]);

  const switchOrganization = useCallback((orgId: string) => {
    if (orgId === activeOrgId) return;
    setActiveOrgIdState(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    queryClient.invalidateQueries();
  }, [queryClient, activeOrgId]);

  // Save reordered organization display_order
  const saveOrganizationOrder = useCallback(async (orderedMembershipIds: string[]) => {
    const updates = orderedMembershipIds.map((id, index) => 
      supabase
        .from("organization_memberships")
        .update({ display_order: index + 1 })
        .eq("id", id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
  }, [queryClient]);

  // Safety timeout: if org loading takes more than 8 seconds, unblock
  useEffect(() => {
    if (!authInitialized || !user) return;
    const timer = setTimeout(() => {
      setTimedOut(true);
      console.warn("Organization loading timeout – unblocking UI");
    }, 8000);
    return () => clearTimeout(timer);
  }, [authInitialized, user]);

  // Reset timeout when data arrives
  useEffect(() => {
    if (isFetched || error) setTimedOut(false);
  }, [isFetched, error]);

  const isLoading = useMemo(() => {
    if (timedOut) return false;
    if (!authInitialized) return true;
    if (user && !isFetched && !error) return true;
    return false;
  }, [authInitialized, user, isFetched, error, timedOut]);

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
    saveOrganizationOrder,
  }), [currentMembership, allMemberships, switchOrganization, isLoading, error, refetch, saveOrganizationOrder]);

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
