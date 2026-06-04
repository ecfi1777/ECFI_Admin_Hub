
-- 1. Update validation functions to accept the new pl_section values.
CREATE OR REPLACE FUNCTION public.validate_pl_section()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pl_section IS NOT NULL AND NEW.pl_section NOT IN
    ('footings_walls', 'slab', 'interior_slab', 'exterior_slab', 'both', 'overhead') THEN
    RAISE EXCEPTION 'pl_section must be footings_walls, interior_slab, exterior_slab, both, or overhead';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_pl_section_two()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pl_section NOT IN ('footings_walls', 'slab', 'interior_slab', 'exterior_slab') THEN
    RAISE EXCEPTION 'pl_section must be footings_walls, interior_slab, or exterior_slab';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_revenue_section()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.section NOT IN ('footings_walls', 'slab', 'interior_slab', 'exterior_slab') THEN
    RAISE EXCEPTION 'section must be footings_walls, interior_slab, or exterior_slab';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Re-tag ECFI phases into interior_slab / exterior_slab based on name.
UPDATE public.phases
SET pl_section = 'exterior_slab'
WHERE pl_section = 'slab'
  AND name IN ('Exterior Flatwork', 'Driveways', 'Sidewalks', 'Stoops', 'Leadwalks', 'Prep Exterior Slabs');

UPDATE public.phases
SET pl_section = 'interior_slab'
WHERE pl_section = 'slab';

-- 3. Migrate existing data referencing the old 'slab' bucket to 'interior_slab'.
UPDATE public.project_pl_revenue       SET section    = 'interior_slab' WHERE section    = 'slab';
UPDATE public.project_labor_entries    SET pl_section = 'interior_slab' WHERE pl_section = 'slab';
UPDATE public.project_materials_costs  SET pl_section = 'interior_slab' WHERE pl_section = 'slab';
UPDATE public.project_other_costs      SET pl_section = 'interior_slab' WHERE pl_section = 'slab';
