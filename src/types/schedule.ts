/**
 * Shared types for schedule entries.
 * This is the single source of truth for ScheduleEntry-related types.
 */

export interface ScheduleEntryProject {
  id?: string;
  lot_number: string;
  builders: { name: string; code: string | null } | null;
  locations: { name: string } | null;
}

export interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  project_id: string | null;
  crew_id: string | null;
  phase_id: string | null;
  start_time: string | null;
  order_status: string | null;
  notes: string | null;
  supplier_id: string | null;
  concrete_mix_id: string | null;
  qty_ordered: string | null;
  order_number: string | null;
  ready_mix_invoice_number: string | null;
  ready_mix_invoice_amount: number | null;
  ready_mix_yards_billed: number | null;
  crew_yards_poured: number | null;
  crew_notes: string | null;
  concrete_notes: string | null;
  pump_vendor_id: string | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  pump_notes: string | null;
  inspection_type_id: string | null;
  inspector_id: string | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  inspection_notes: string | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  additive_hot_water: boolean;
  additive_1_percent_he: boolean;
  additive_2_percent_he: boolean;
  // Nested relations
  crews: { name: string } | null;
  phases: { name: string } | null;
  suppliers: { name: string; code: string | null } | null;
  pump_vendors: { name: string; code: string | null } | null;
  inspection_types: { name: string } | null;
  inspectors: { name: string } | null;
  concrete_mixes: { name: string } | null;
  projects: ScheduleEntryProject | null;
}

/**
 * Minimal schedule entry type for invoice tracking
 */
export type ScheduleEntryForInvoice = Pick<
  ScheduleEntry,
  | 'id'
  | 'scheduled_date'
  | 'crew_yards_poured'
  | 'to_be_invoiced'
  | 'invoice_complete'
  | 'invoice_number'
  | 'project_id'
  | 'crews'
  | 'phases'
  | 'projects'
>;

/**
 * Minimal schedule entry type for discrepancy tracking
 */
export type ScheduleEntryForDiscrepancy = Pick<
  ScheduleEntry,
  | 'id'
  | 'scheduled_date'
  | 'crew_yards_poured'
  | 'ready_mix_yards_billed'
  | 'crews'
  | 'phases'
  | 'suppliers'
  | 'projects'
>;
