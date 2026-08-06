UPDATE public.upcoming_work_items
   SET phase_custom = 'General'
   WHERE phase_id IS NULL
     AND (phase_custom IS NULL OR btrim(phase_custom) = '');

ALTER TABLE public.upcoming_work_items
     ADD CONSTRAINT upcoming_work_items_phase_required
     CHECK (phase_id IS NOT NULL OR phase_custom IS NOT NULL);