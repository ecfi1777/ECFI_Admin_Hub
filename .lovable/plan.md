
# Fix: Organization Membership Visibility Issue

## Problem Summary
When you're logged in as `ecfischedule@gmail.com` and viewing the ECFI 1 organization, you can't see other team members (like `elan@easternconcrete.com`) or transfer ownership because of a bug in how the database determines which organization you're currently using.

## Root Cause
The database has a helper function called `get_user_organization_id()` that picks which organization a user belongs to. However, this function:
- Picks the **first** organization membership it finds (not necessarily the one you're currently viewing)
- Doesn't know which organization you've selected in the app

Since `ecfischedule@gmail.com` joined "Test Company 1" before "ECFI 1", the database always thinks you're in Test Company 1, even when you've switched to ECFI 1 in the app.

This causes the security rules to hide other ECFI 1 members from you because it thinks you're not currently in that organization.

## Solution
Update the security rules to allow users to view and manage memberships for **any organization where they are an owner**, not just the first organization returned by the function.

---

## Technical Details

### Current RLS Policy (SELECT)
```sql
(organization_id = get_user_organization_id(auth.uid())) 
OR (user_id = auth.uid())
```
This only allows viewing memberships in ONE organization (whichever `LIMIT 1` returns).

### Current RLS Policy (UPDATE - for ownership transfer)  
```sql
(organization_id = get_user_organization_id(auth.uid()))
```
Same issue - only works for one organization.

### Updated RLS Policy (SELECT)
```sql
EXISTS (
  SELECT 1 FROM organization_memberships om
  WHERE om.user_id = auth.uid()
  AND om.organization_id = organization_memberships.organization_id
)
OR (user_id = auth.uid())
```
This allows viewing memberships for **all organizations the user belongs to**.

### Updated RLS Policy (UPDATE)
```sql
EXISTS (
  SELECT 1 FROM organization_memberships om
  WHERE om.user_id = auth.uid()
  AND om.organization_id = organization_memberships.organization_id
  AND om.role = 'owner'
)
```
This allows managing memberships in **any organization where the user is an owner**.

---

## Implementation Steps

1. **Drop existing problematic policies**
   - `Users can view memberships in their organization`
   - `Owners can manage memberships`

2. **Create corrected policies**
   - New SELECT policy: Allow viewing all memberships in any organization the user belongs to
   - New UPDATE policy: Allow managing memberships only in organizations where user is an owner

3. **Test the fix**
   - Log in as `ecfischedule@gmail.com`
   - Navigate to Settings > Organization
   - Verify `elan@easternconcrete.com` now appears in the Team Members table
   - Verify the transfer ownership button works

---

## Migration SQL Preview
```sql
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view memberships in their organization" 
  ON organization_memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" 
  ON organization_memberships;

-- Create corrected SELECT policy
CREATE POLICY "Users can view memberships in their organizations"
  ON organization_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_memberships.organization_id
    )
    OR (user_id = auth.uid())
  );

-- Create corrected UPDATE policy  
CREATE POLICY "Owners can manage memberships in their organizations"
  ON organization_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_memberships.organization_id
      AND om.role = 'owner'
    )
  );
```

## Risk Assessment
- **Low risk**: Only changes visibility rules, no data modifications
- **Backward compatible**: Users in single organizations will see no change
- **Immediate effect**: Fix will work as soon as migration runs
