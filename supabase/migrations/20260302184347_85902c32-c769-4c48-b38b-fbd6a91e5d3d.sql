
-- Add "did not work" columns to schedule_entries
ALTER TABLE public.schedule_entries
  ADD COLUMN did_not_work boolean NOT NULL DEFAULT false,
  ADD COLUMN not_working_reason text;
