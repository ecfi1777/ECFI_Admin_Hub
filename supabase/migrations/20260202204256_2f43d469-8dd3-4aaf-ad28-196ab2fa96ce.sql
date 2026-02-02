-- Add notes columns for vendor-specific notes on schedule entries
ALTER TABLE public.schedule_entries
ADD COLUMN concrete_notes TEXT,
ADD COLUMN pump_notes TEXT,
ADD COLUMN inspection_notes TEXT;