-- project_pl_revenue
DROP POLICY IF EXISTS "org members can view project_pl_revenue" ON public.project_pl_revenue;
DROP POLICY IF EXISTS "org members can insert project_pl_revenue" ON public.project_pl_revenue;
DROP POLICY IF EXISTS "org members can update project_pl_revenue" ON public.project_pl_revenue;
DROP POLICY IF EXISTS "org members can delete project_pl_revenue" ON public.project_pl_revenue;

CREATE POLICY "managers can view project_pl_revenue" ON public.project_pl_revenue
FOR SELECT TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can insert project_pl_revenue" ON public.project_pl_revenue
FOR INSERT TO authenticated WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can update project_pl_revenue" ON public.project_pl_revenue
FOR UPDATE TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id))
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can delete project_pl_revenue" ON public.project_pl_revenue
FOR DELETE TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id));

-- project_materials_costs
DROP POLICY IF EXISTS "org members can view project_materials_costs" ON public.project_materials_costs;
DROP POLICY IF EXISTS "org members can insert project_materials_costs" ON public.project_materials_costs;
DROP POLICY IF EXISTS "org members can update project_materials_costs" ON public.project_materials_costs;
DROP POLICY IF EXISTS "org members can delete project_materials_costs" ON public.project_materials_costs;

CREATE POLICY "managers can view project_materials_costs" ON public.project_materials_costs
FOR SELECT TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can insert project_materials_costs" ON public.project_materials_costs
FOR INSERT TO authenticated WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can update project_materials_costs" ON public.project_materials_costs
FOR UPDATE TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id))
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can delete project_materials_costs" ON public.project_materials_costs
FOR DELETE TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id));

-- project_other_costs
DROP POLICY IF EXISTS "org members can view project_other_costs" ON public.project_other_costs;
DROP POLICY IF EXISTS "org members can insert project_other_costs" ON public.project_other_costs;
DROP POLICY IF EXISTS "org members can update project_other_costs" ON public.project_other_costs;
DROP POLICY IF EXISTS "org members can delete project_other_costs" ON public.project_other_costs;

CREATE POLICY "managers can view project_other_costs" ON public.project_other_costs
FOR SELECT TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can insert project_other_costs" ON public.project_other_costs
FOR INSERT TO authenticated WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can update project_other_costs" ON public.project_other_costs
FOR UPDATE TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id))
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE POLICY "managers can delete project_other_costs" ON public.project_other_costs
FOR DELETE TO authenticated USING (public.user_has_manage_access(auth.uid(), organization_id));

-- project_labor_employees (scoped through parent labor entry)
DROP POLICY IF EXISTS "org members can view project_labor_employees" ON public.project_labor_employees;
DROP POLICY IF EXISTS "org members can insert project_labor_employees" ON public.project_labor_employees;
DROP POLICY IF EXISTS "org members can update project_labor_employees" ON public.project_labor_employees;
DROP POLICY IF EXISTS "org members can delete project_labor_employees" ON public.project_labor_employees;

CREATE POLICY "managers can view project_labor_employees" ON public.project_labor_employees
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.project_labor_entries ple
  WHERE ple.id = project_labor_employees.labor_entry_id
    AND public.user_has_manage_access(auth.uid(), ple.organization_id)));
CREATE POLICY "managers can insert project_labor_employees" ON public.project_labor_employees
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_labor_entries ple
  WHERE ple.id = project_labor_employees.labor_entry_id
    AND public.user_has_manage_access(auth.uid(), ple.organization_id)));
CREATE POLICY "managers can update project_labor_employees" ON public.project_labor_employees
FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.project_labor_entries ple
  WHERE ple.id = project_labor_employees.labor_entry_id
    AND public.user_has_manage_access(auth.uid(), ple.organization_id)))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_labor_entries ple
  WHERE ple.id = project_labor_employees.labor_entry_id
    AND public.user_has_manage_access(auth.uid(), ple.organization_id)));
CREATE POLICY "managers can delete project_labor_employees" ON public.project_labor_employees
FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.project_labor_entries ple
  WHERE ple.id = project_labor_employees.labor_entry_id
    AND public.user_has_manage_access(auth.uid(), ple.organization_id)));