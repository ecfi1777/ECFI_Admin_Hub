-- Add crew_notes column to schedule_entries table
ALTER TABLE public.schedule_entries
ADD COLUMN crew_notes TEXT;