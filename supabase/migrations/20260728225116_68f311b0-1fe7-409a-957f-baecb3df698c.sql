DROP POLICY IF EXISTS "org members can view project_labor_entries" ON public.project_labor_entries;
DROP POLICY IF EXISTS "org members can insert project_labor_entries" ON public.project_labor_entries;
DROP POLICY IF EXISTS "org members can update project_labor_entries" ON public.project_labor_entries;
DROP POLICY IF EXISTS "org members can delete project_labor_entries" ON public.project_labor_entries;

CREATE POLICY "managers can view project_labor_entries"
ON public.project_labor_entries FOR SELECT TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "managers can insert project_labor_entries"
ON public.project_labor_entries FOR INSERT TO authenticated
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "managers can update project_labor_entries"
ON public.project_labor_entries FOR UPDATE TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id))
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "managers can delete project_labor_entries"
ON public.project_labor_entries FOR DELETE TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id));