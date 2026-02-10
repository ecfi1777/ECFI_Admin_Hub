
-- ============================================================
-- ECFI Hub — Audit Log
-- Record-level activity tracking with 90-day retention
-- ============================================================

-- Create audit log table
CREATE TABLE public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  record_label text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_log_org_created ON audit_log(organization_id, created_at DESC);

-- RLS: owner-only access
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view audit log"
ON audit_log FOR SELECT
USING (
  public.user_is_org_owner(auth.uid(), organization_id)
);

CREATE POLICY "No direct inserts"
ON audit_log FOR INSERT
WITH CHECK (false);

-- ============================================================
-- Trigger function for projects
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_record projects;
  v_label text;
  v_email text;
  v_location_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_record := OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_record := NEW;
  ELSE
    v_action := 'updated';
    v_record := NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT name INTO v_location_name FROM locations WHERE id = v_record.location_id;

  v_label := concat_ws(', ',
    nullif(v_location_name, ''),
    nullif(v_record.lot_number, '')
  );

  INSERT INTO audit_log (organization_id, user_id, user_email, table_name, record_id, action, record_label)
  VALUES (v_record.organization_id, auth.uid(), coalesce(v_email, 'unknown'), 'projects', v_record.id, v_action, v_label);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_audit_projects
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION audit_projects();

-- ============================================================
-- Trigger function for schedule_entries
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_schedule_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_record schedule_entries;
  v_label text;
  v_email text;
  v_crew_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_record := OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_record := NEW;
  ELSE
    v_action := 'updated';
    v_record := NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT name INTO v_crew_name FROM crews WHERE id = v_record.crew_id;

  v_label := concat_ws(' - ',
    nullif(v_record.scheduled_date::text, ''),
    nullif(v_crew_name, '')
  );

  INSERT INTO audit_log (organization_id, user_id, user_email, table_name, record_id, action, record_label)
  VALUES (v_record.organization_id, auth.uid(), coalesce(v_email, 'unknown'), 'schedule_entries', v_record.id, v_action, v_label);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_audit_schedule_entries
AFTER INSERT OR UPDATE OR DELETE ON schedule_entries
FOR EACH ROW EXECUTE FUNCTION audit_schedule_entries();
