ALTER TABLE public.phases DROP CONSTRAINT phases_name_key;

ALTER TABLE public.phases ADD CONSTRAINT phases_org_name_unique UNIQUE (organization_id, name);