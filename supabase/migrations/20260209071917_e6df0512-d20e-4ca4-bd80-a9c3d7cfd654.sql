ALTER TABLE public.builders DROP CONSTRAINT builders_name_key;
ALTER TABLE public.builders ADD CONSTRAINT builders_org_name_unique UNIQUE (organization_id, name);

ALTER TABLE public.inspection_types DROP CONSTRAINT inspection_types_name_key;
ALTER TABLE public.inspection_types ADD CONSTRAINT inspection_types_org_name_unique UNIQUE (organization_id, name);

ALTER TABLE public.inspectors DROP CONSTRAINT inspectors_name_key;
ALTER TABLE public.inspectors ADD CONSTRAINT inspectors_org_name_unique UNIQUE (organization_id, name);

ALTER TABLE public.pump_vendors DROP CONSTRAINT pump_vendors_name_key;
ALTER TABLE public.pump_vendors ADD CONSTRAINT pump_vendors_org_name_unique UNIQUE (organization_id, name);

ALTER TABLE public.suppliers DROP CONSTRAINT suppliers_name_key;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_org_name_unique UNIQUE (organization_id, name);