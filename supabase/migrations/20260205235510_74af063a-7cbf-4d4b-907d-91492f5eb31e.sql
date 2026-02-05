-- Add color column to crews table for calendar color coding
ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

COMMENT ON COLUMN public.crews.color IS 'Hex color code for calendar display (e.g., #3b82f6)';