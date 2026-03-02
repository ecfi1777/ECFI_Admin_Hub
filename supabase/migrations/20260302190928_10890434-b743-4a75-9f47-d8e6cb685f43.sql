ALTER TABLE public.schedule_entries
  ADD COLUMN is_cancelled boolean NOT NULL DEFAULT false,
  ADD COLUMN rescheduled_to_date date,
  ADD COLUMN rescheduled_from_entry_id uuid REFERENCES public.schedule_entries(id);