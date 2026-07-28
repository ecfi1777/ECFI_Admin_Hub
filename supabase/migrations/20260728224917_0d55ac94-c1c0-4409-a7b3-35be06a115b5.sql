DROP POLICY IF EXISTS "org members can view project_commissions" ON public.project_commissions;
DROP POLICY IF EXISTS "org members can insert project_commissions" ON public.project_commissions;
DROP POLICY IF EXISTS "org members can update project_commissions" ON public.project_commissions;
DROP POLICY IF EXISTS "org members can delete project_commissions" ON public.project_commissions;

CREATE POLICY "managers can view project_commissions"
ON public.project_commissions FOR SELECT TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "managers can insert project_commissions"
ON public.project_commissions FOR INSERT TO authenticated
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "managers can update project_commissions"
ON public.project_commissions FOR UPDATE TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id))
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "managers can delete project_commissions"
ON public.project_commissions FOR DELETE TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id));