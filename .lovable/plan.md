

# Fix: Organization Creation RLS Policy

## Problem

The current INSERT policy on the `organizations` table uses `auth.role() = 'authenticated'` in the `WITH CHECK` clause. This function can behave inconsistently depending on the PostgREST/Supabase version, causing authenticated users to be rejected when trying to create an organization.

The database logs confirm repeated RLS violations on the `organizations` table matching the error you're seeing.

## Solution

Replace the current INSERT policy with one that uses `TO authenticated` in the policy definition. This is the modern, recommended approach -- it lets PostgREST handle role checking directly rather than relying on the `auth.role()` function inside the policy expression.

## Technical Details

### Database Migration

Drop and recreate the INSERT policy on the `organizations` table:

```text
-- Drop the old policy
DROP POLICY "Authenticated users can create organizations" ON public.organizations;

-- Create the new policy scoped to the authenticated role
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### Why This Works

- `TO authenticated` restricts the policy to only apply when PostgREST is operating under the `authenticated` PostgreSQL role (i.e., the user has a valid JWT)
- `WITH CHECK (true)` allows any authenticated user to insert -- the same intent as the original policy, but more reliable
- No code changes are needed; the Onboarding and CreateOrganizationDialog components already work correctly

### No Other Changes Required

- The `organization_memberships` INSERT policy (`auth.uid() = user_id`) is fine -- it correctly validates the user ID
- The application code in `Onboarding.tsx` and `CreateOrganizationDialog.tsx` correctly passes `created_by: user.id`
- The `seed_organization_defaults` RPC already has its own ownership check

