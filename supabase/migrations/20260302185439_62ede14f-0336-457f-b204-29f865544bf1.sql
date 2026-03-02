ALTER TABLE public.schedule_entries
  ADD COLUMN cancellation_reason text,
  ADD COLUMN rescheduled_from_date date;