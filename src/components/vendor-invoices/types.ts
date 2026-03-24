export type VendorTypeFilter = 'all' | 'concrete' | 'stone' | 'pump' | 'inspection';

export interface VendorEntry {
  id: string;
  scheduled_date: string;
  project_id: string | null;
  crew_id: string | null;
  supplier_id: string | null;
  pump_vendor_id: string | null;
  inspector_id: string | null;
  phase_id: string | null;
  stone_supplier_id: string | null;
  ready_mix_invoice_number: string | null;
  ready_mix_yards_billed: number | null;
  ready_mix_invoice_amount: number | null;
  stone_invoice_number: string | null;
  stone_tons_billed: number | null;
  stone_invoice_amount: number | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  inspection_no_charge: boolean;
  crew_yards_poured: number | null;
  // Concrete detail fields
  concrete_mix_id: string | null;
  qty_ordered: string | null;
  order_number: string | null;
  concrete_notes: string | null;
  additive_hot_water: boolean;
  additive_1_percent_he: boolean;
  additive_2_percent_he: boolean;
  projects: {
    id: string;
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
  crews: { name: string } | null;
  suppliers: { name: string; code: string | null } | null;
  stone_suppliers: { name: string; code: string | null } | null;
  pump_vendors: { name: string; code: string | null } | null;
  inspectors: { name: string } | null;
  phases: { name: string } | null;
  concrete_mixes: { id: string; name: string } | null;
}

export interface VendorInvoiceRowData {
  entry: VendorEntry;
  type: 'concrete' | 'stone' | 'pump' | 'inspection';
  vendorName: string;
}
