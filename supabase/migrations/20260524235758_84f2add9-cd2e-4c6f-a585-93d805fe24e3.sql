ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS is_subcontractor boolean NOT NULL DEFAULT false;

ALTER TABLE public.schedule_entries
  ADD COLUMN IF NOT EXISTS sub_will_invoice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sub_invoice_number text,
  ADD COLUMN IF NOT EXISTS sub_invoice_amount numeric DEFAULT 0;