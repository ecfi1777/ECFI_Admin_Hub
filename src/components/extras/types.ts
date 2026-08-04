export interface InvoiceExtra {
  id: string;
  organization_id: string;
  entry_date: string;
  builder_name: string;
  location_name: string | null;
  lot_number: string | null;
  description: string;
  amount: number | null;
  invoice_number: string | null;
  invoice_complete: boolean;
  created_at: string;
}

export interface ExtraFormValues {
  entry_date: string;
  builder_name: string;
  location_name: string;
  lot_number: string;
  description: string;
  amount: string;
  invoice_number: string;
}
