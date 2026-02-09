ALTER TABLE public.locations DROP CONSTRAINT locations_name_key;

ALTER TABLE public.locations ADD CONSTRAINT locations_org_name_unique UNIQUE (organization_id, name);