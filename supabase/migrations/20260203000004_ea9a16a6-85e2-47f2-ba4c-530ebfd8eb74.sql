-- Add DELETE policy for crew_members table
CREATE POLICY "Authenticated users can delete crew_members"
ON public.crew_members
FOR DELETE
USING (true);