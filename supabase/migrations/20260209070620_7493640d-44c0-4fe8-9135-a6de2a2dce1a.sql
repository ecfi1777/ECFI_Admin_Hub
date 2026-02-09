ALTER TABLE public.crews DROP CONSTRAINT crews_name_key;

ALTER TABLE public.crews ADD CONSTRAINT crews_org_name_unique UNIQUE (organization_id, name);