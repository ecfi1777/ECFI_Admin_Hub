CREATE TABLE public.upcoming_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_date date,
  crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL,
  phase_id uuid REFERENCES public.phases(id) ON DELETE SET NULL,
  phase_custom text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'complete')),
  entered_in_main_schedule boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT upcoming_work_items_phase_required CHECK (phase_id IS NOT NULL OR phase_custom IS NOT NULL),
  CONSTRAINT upcoming_work_items_complete_requires_date CHECK (status = 'scheduled' OR work_date IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upcoming_work_items TO authenticated;
GRANT ALL ON public.upcoming_work_items TO service_role;

ALTER TABLE public.upcoming_work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view upcoming_work_items"
  ON public.upcoming_work_items
  FOR SELECT
  TO authenticated
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Managers can manage upcoming_work_items"
  ON public.upcoming_work_items
  FOR ALL
  TO authenticated
  USING (public.user_has_manage_access(auth.uid(), organization_id))
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE INDEX upcoming_work_items_org_date_idx
  ON public.upcoming_work_items (organization_id, work_date);

CREATE INDEX upcoming_work_items_needs_entry_idx
  ON public.upcoming_work_items (organization_id)
  WHERE status = 'complete' AND entered_in_main_schedule = false;

CREATE TRIGGER update_upcoming_work_items_updated_at
  BEFORE UPDATE ON public.upcoming_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.upcoming_work_week_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, week_start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upcoming_work_week_notes TO authenticated;
GRANT ALL ON public.upcoming_work_week_notes TO service_role;

ALTER TABLE public.upcoming_work_week_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view upcoming_work_week_notes"
  ON public.upcoming_work_week_notes
  FOR SELECT
  TO authenticated
  USING (public.user_has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Managers can manage upcoming_work_week_notes"
  ON public.upcoming_work_week_notes
  FOR ALL
  TO authenticated
  USING (public.user_has_manage_access(auth.uid(), organization_id))
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE TRIGGER update_upcoming_work_week_notes_updated_at
  BEFORE UPDATE ON public.upcoming_work_week_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();