/**
 * Hook for fetching schedule entries for calendar views.
 * Fetches entries within a date range with all needed relations.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { ScheduleEntry } from "@/types/schedule";

export interface CrewWithColor {
  id: string;
  name: string;
  color: string | null;
  display_order: number;
  is_active: boolean;
}

export function useCalendarEntries(startDate: string, endDate: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["calendar-entries", startDate, endDate, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id,
          scheduled_date,
          crew_id,
          phase_id,
          project_id,
          start_time,
          crews(name),
          phases(name),
          projects(
            lot_number,
            builders(name, code),
            locations(name)
          )
        `)
        .eq("organization_id", organizationId)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .eq("deleted", false)
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as ScheduleEntry[];
    },
    enabled: !!organizationId && !!startDate && !!endDate,
  });
}

export function useCrewsWithColors() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["crews-with-colors", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, color, display_order, is_active")
        .eq("organization_id", organizationId)
        .order("display_order");
      if (error) throw error;
      return data as CrewWithColor[];
    },
    enabled: !!organizationId,
  });
}
