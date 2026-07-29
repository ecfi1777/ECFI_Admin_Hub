DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles = '{public}'
      AND (
        coalesce(qual, '') ~ '(user_belongs_to_organization|user_has_manage_access|user_is_org_owner|user_has_organization_access|get_my_role)'
        OR coalesce(with_check, '') ~ '(user_belongs_to_organization|user_has_manage_access|user_is_org_owner|user_has_organization_access|get_my_role)'
      )
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;