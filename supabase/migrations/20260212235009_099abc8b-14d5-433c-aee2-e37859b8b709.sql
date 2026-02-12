ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action = ANY (ARRAY['created', 'updated', 'deleted', 'restored']));