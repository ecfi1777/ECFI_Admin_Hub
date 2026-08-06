export interface UpcomingWorkItem {
  id: string;
  organization_id: string;
  work_date: string | null;
  crew_id: string | null;
  phase_id: string | null;
  phase_custom: string | null;
  description: string;
  status: "scheduled" | "complete";
  entered_in_main_schedule: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  crews: { id: string; name: string; color: string | null } | null;
  phases: { id: string; name: string } | null;
}

export interface UpcomingWorkWeekNote {
  id: string;
  organization_id: string;
  week_start_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface UpcomingWorkFormValues {
  work_date: string; // empty string => null
  crew_id: string; // empty string => null
  phase_id: string; // empty string => null
  phase_custom: string;
  description: string;
  status: "scheduled" | "complete";
}

export type SelectedCrewFilter = string | null; // null means unassigned
