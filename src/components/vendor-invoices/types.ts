export type VendorTypeFilter = 'all' | 'concrete' | 'pump' | 'inspection' | 'crew';

export interface VendorEntry {
  id: string;
  scheduled_date: string;
  project_id: string | null;
  crew_id: string | null;
  supplier_id: string | null;
  pump_vendor_id: string | null;
  inspector_id: string | null;
  phase_id: string | null;
  ready_mix_invoice_number: string | null;
  ready_mix_yards_billed: number | null;
  ready_mix_invoice_amount: number | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  crew_yards_poured: number | null;
  projects: {
    id: string;
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
  crews: { name: string } | null;
  suppliers: { name: string; code: string | null } | null;
  pump_vendors: { name: string; code: string | null } | null;
  inspectors: { name: string } | null;
  phases: { name: string } | null;
}

export interface VendorInvoiceRowData {
  entry: VendorEntry;
  type: 'concrete' | 'pump' | 'inspection' | 'crew';
  vendorName: string;
}
