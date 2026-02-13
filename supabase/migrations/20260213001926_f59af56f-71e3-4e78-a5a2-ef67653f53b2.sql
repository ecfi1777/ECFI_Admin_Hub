
-- Enable pg_net extension for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function to notify org owner when a new member joins
CREATE OR REPLACE FUNCTION public.notify_owner_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_name text;
  v_owner_user_id uuid;
  v_owner_email text;
  v_new_member_email text;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Look up organization name
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = NEW.organization_id;

  -- Find the owner of the organization
  SELECT user_id INTO v_owner_user_id
  FROM organization_memberships
  WHERE organization_id = NEW.organization_id
    AND role = 'owner'
  LIMIT 1;

  -- If no owner found, skip silently
  IF v_owner_user_id IS NULL THEN
    RAISE WARNING 'No owner found for organization %', NEW.organization_id;
    RETURN NEW;
  END IF;

  -- If the new member IS the owner, skip (initial org creation)
  IF NEW.user_id = v_owner_user_id THEN
    RETURN NEW;
  END IF;

  -- Look up owner email
  SELECT email INTO v_owner_email
  FROM auth.users
  WHERE id = v_owner_user_id;

  -- Look up new member email
  SELECT email INTO v_new_member_email
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Get Supabase config for edge function URL
  v_supabase_url := current_setting('app.settings.supabase_url', true);

  -- If supabase_url not available via app settings, construct from project ref
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://mouzljbaiiwatoxakped.supabase.co';
  END IF;

  v_service_role_key := current_setting('app.settings.service_role_key', true);
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    v_service_role_key := current_setting('supabase.service_role_key', true);
  END IF;

  -- Call the edge function asynchronously via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/notify-owner-new-member',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_service_role_key, '')
    ),
    body := jsonb_build_object(
      'owner_email', v_owner_email,
      'new_member_email', v_new_member_email,
      'org_name', v_org_name,
      'member_role', NEW.role,
      'joined_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on organization_memberships for INSERT only
CREATE TRIGGER on_new_membership_notify_owner
  AFTER INSERT ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_new_member();
