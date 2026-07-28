REVOKE EXECUTE ON FUNCTION public.audit_projects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_owner_new_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_schedule_entries() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_stone_lines() FROM PUBLIC, anon, authenticated;