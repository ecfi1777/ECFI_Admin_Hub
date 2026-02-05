/**
 * Shared hooks for fetching reference data.
 * These hooks encapsulate organizationId filtering and consistent query keys.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

// ============ Type definitions ============

export interface Phase {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string | null;
}

export interface PumpVendor {
  id: string;
  name: string;
  code: string | null;
}

export interface InspectionType {
  id: string;
  name: string;
}

export interface Inspector {
  id: string;
  name: string;
}

export interface Builder {
  id: string;
  name: string;
  code: string | null;
}

export interface Location {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  display_order?: number;
  is_active?: boolean;
  color?: string | null;
}

export interface ConcreteMix {
  id: string;
  name: string;
}

export interface ProjectStatus {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  lot_number: string;
  builders: { name: string; code: string | null } | null;
  locations: { name: string } | null;
}

// ============ Hooks ============

export function usePhases() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["phases-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("phases")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Phase[];
    },
    enabled: !!organizationId,
  });
}

export function useSuppliers() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["suppliers-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!organizationId,
  });
}

export function usePumpVendors() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["pump-vendors-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("pump_vendors")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as PumpVendor[];
    },
    enabled: !!organizationId,
  });
}

export function useInspectionTypes() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["inspection-types-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("inspection_types")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as InspectionType[];
    },
    enabled: !!organizationId,
  });
}

export function useInspectors() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["inspectors-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("inspectors")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Inspector[];
    },
    enabled: !!organizationId,
  });
}

export function useBuilders() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["builders-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("builders")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Builder[];
    },
    enabled: !!organizationId,
  });
}

export function useLocations() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["locations-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!organizationId,
  });
}

export function useCrews() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["crews-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crews")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Crew[];
    },
    enabled: !!organizationId,
  });
}

/**
 * Fetches all crews (active and inactive) with display_order and is_active fields.
 * Used by DailySchedule to show inactive crews that have entries.
 */
export function useCrewsAll() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["crews-all", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order, is_active, color")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return data as Crew[];
    },
    enabled: !!organizationId,
  });
}

export function useConcreteMixes() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["concrete-mixes-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("concrete_mixes")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as ConcreteMix[];
    },
    enabled: !!organizationId,
  });
}

export function useProjectStatuses() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["project-statuses-active", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("project_statuses")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as ProjectStatus[];
    },
    enabled: !!organizationId,
  });
}

/**
 * Fetches all projects for the organization.
 * Used by AddEntryDialog and EditEntryDialog for project selection.
 */
export function useProjects() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["projects-all", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, lot_number, builders(name, code), locations(name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!organizationId,
  });
}
