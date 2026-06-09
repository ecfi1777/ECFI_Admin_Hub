
CREATE TABLE public.crew_daily_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (organization_id, crew_id, note_date)
);

CREATE INDEX idx_crew_daily_notes_org_date ON public.crew_daily_notes (organization_id, note_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_daily_notes TO authenticated;
GRANT ALL ON public.crew_daily_notes TO service_role;

ALTER TABLE public.crew_daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crew_daily_notes in their org"
ON public.crew_daily_notes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.organization_memberships m
  WHERE m.user_id = auth.uid() AND m.organization_id = crew_daily_notes.organization_id));

CREATE POLICY "Users can insert crew_daily_notes in their org"
ON public.crew_daily_notes FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_memberships m
  WHERE m.user_id = auth.uid() AND m.organization_id = crew_daily_notes.organization_id));

CREATE POLICY "Users can update crew_daily_notes in their org"
ON public.crew_daily_notes FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.organization_memberships m
  WHERE m.user_id = auth.uid() AND m.organization_id = crew_daily_notes.organization_id));

CREATE POLICY "Users can delete crew_daily_notes in their org"
ON public.crew_daily_notes FOR DELETE
USING (EXISTS (SELECT 1 FROM public.organization_memberships m
  WHERE m.user_id = auth.uid() AND m.organization_id = crew_daily_notes.organization_id));

CREATE TRIGGER update_crew_daily_notes_updated_at
BEFORE UPDATE ON public.crew_daily_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
