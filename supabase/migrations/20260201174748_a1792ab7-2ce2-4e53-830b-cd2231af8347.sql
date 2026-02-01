-- Add display_order to crews for custom sorting
ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Add new fields to schedule_entries for Concrete tab
ALTER TABLE public.schedule_entries ADD COLUMN IF NOT EXISTS qty_ordered text;
ALTER TABLE public.schedule_entries ADD COLUMN IF NOT EXISTS order_number text;