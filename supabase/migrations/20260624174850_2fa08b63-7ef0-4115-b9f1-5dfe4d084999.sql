
CREATE TABLE public.commission_report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, crew_id, month, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_report_notes TO authenticated;
GRANT ALL ON public.commission_report_notes TO service_role;

ALTER TABLE public.commission_report_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view commission notes"
  ON public.commission_report_notes FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Managers can insert commission notes"
  ON public.commission_report_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can update commission notes"
  ON public.commission_report_notes FOR UPDATE
  TO authenticated
  USING (public.user_has_manage_access(auth.uid(), organization_id))
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can delete commission notes"
  ON public.commission_report_notes FOR DELETE
  TO authenticated
  USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE TRIGGER update_commission_report_notes_updated_at
  BEFORE UPDATE ON public.commission_report_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
