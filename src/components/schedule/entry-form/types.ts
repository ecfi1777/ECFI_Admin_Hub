/**
 * Shared types for entry form used by AddEntryDialog and EditEntryDialog
 */

export interface EntryFormValues {
  // General tab
  crew_id: string;
  phase_id: string;
  start_time: string;
  order_status: string;
  notes: string;
  
  // Concrete tab
  supplier_id: string;
  concrete_mix_id: string;
  additive_hot_water: boolean;
  additive_1_percent_he: boolean;
  additive_2_percent_he: boolean;
  qty_ordered: string;
  order_number: string;
  ready_mix_invoice_number: string;
  ready_mix_invoice_amount: string;
  ready_mix_yards_billed: string;
  concrete_notes: string;
  
  // Pump tab
  pump_vendor_id: string;
  pump_invoice_number: string;
  pump_invoice_amount: string;
  pump_notes: string;
  
  // Inspection tab
  inspection_type_id: string;
  inspector_id: string;
  inspection_invoice_number: string;
  inspection_amount: string;
  inspection_notes: string;
  
  // Crew tab
  crew_yards_poured: string;
  crew_notes: string;
  
  // Invoicing tab
  to_be_invoiced: boolean;
}

export const DEFAULT_ENTRY_FORM_VALUES: EntryFormValues = {
  crew_id: "",
  phase_id: "",
  start_time: "",
  order_status: "",
  notes: "",
  supplier_id: "",
  concrete_mix_id: "",
  additive_hot_water: false,
  additive_1_percent_he: false,
  additive_2_percent_he: false,
  qty_ordered: "",
  order_number: "",
  ready_mix_invoice_number: "",
  ready_mix_invoice_amount: "",
  ready_mix_yards_billed: "",
  concrete_notes: "",
  pump_vendor_id: "",
  pump_invoice_number: "",
  pump_invoice_amount: "",
  pump_notes: "",
  inspection_type_id: "",
  inspector_id: "",
  inspection_invoice_number: "",
  inspection_amount: "",
  inspection_notes: "",
  crew_yards_poured: "",
  crew_notes: "",
  to_be_invoiced: false,
};

export type TabName = "general" | "concrete" | "pump" | "inspection" | "invoicing" | "crew";
