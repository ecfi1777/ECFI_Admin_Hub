ALTER TABLE public.schedule_entry_stone_lines ADD COLUMN IF NOT EXISTS pl_category text;

CREATE OR REPLACE FUNCTION public.validate_stone_pl_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pl_category IS NOT NULL AND NEW.pl_category NOT IN ('basement_garage','exterior') THEN
    RAISE EXCEPTION 'pl_category must be basement_garage or exterior';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_stone_pl_category_trg ON public.schedule_entry_stone_lines;
CREATE TRIGGER validate_stone_pl_category_trg
BEFORE INSERT OR UPDATE ON public.schedule_entry_stone_lines
FOR EACH ROW EXECUTE FUNCTION public.validate_stone_pl_category();

-- Backfill: Prep Slabs name or slab phase_type => basement_garage; else exterior
UPDATE public.schedule_entry_stone_lines sl
SET pl_category = CASE
  WHEN p.phase_type = 'slab' OR lower(coalesce(p.name,'')) LIKE '%prep slab%' OR lower(coalesce(p.name,'')) LIKE '%slab%'
    THEN 'basement_garage'
  ELSE 'exterior'
END
FROM public.schedule_entries se
LEFT JOIN public.phases p ON p.id = se.phase_id
WHERE sl.schedule_entry_id = se.id AND sl.pl_category IS NULL;

-- Any remaining (no entry/phase) default to exterior
UPDATE public.schedule_entry_stone_lines SET pl_category = 'exterior' WHERE pl_category IS NULL;

ALTER TABLE public.schedule_entry_stone_lines ALTER COLUMN pl_category SET NOT NULL;
ALTER TABLE public.schedule_entry_stone_lines ALTER COLUMN pl_category SET DEFAULT 'exterior';