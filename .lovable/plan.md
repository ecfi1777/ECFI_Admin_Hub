

## Hide Projects Directly from Commission Report

### What you'll get
An eye icon button on each project row in the Commission Report. Clicking it sets `exclude_from_commission = true` on that project in the database, immediately removing it from the report and its totals/export. This uses the `exclude_from_commission` column already added to the `projects` table.

### Changes (CommissionReport.tsx only)

1. **Add imports**: `EyeOff` from lucide-react, `useMutation` and `useQueryClient` from tanstack, plus `supabase` (already imported).

2. **Add mutation**: A `useMutation` that updates `projects.exclude_from_commission = true` for a given project ID, then invalidates the commission report queries so the row disappears.

3. **Add an action column**: Prepend a narrow column (no header label) before "Crew" in the rendered table. Each project row gets an `EyeOff` icon button in that cell. Clicking it fires the mutation.

4. **Update colSpan values**: The crew header row and totals row use `colSpan={COLUMNS.length}` — since this action column is outside the COLUMNS array, bump those colSpans by 1 (e.g., `COLUMNS.length + 1`).

5. **No changes to**: COLUMNS array, editable cells, save handlers, totals calculation logic, or Excel export (the project simply won't be in the data after exclusion).

### Technical details

- The action column is a visual-only column not part of `COLUMNS`, so Excel export is unaffected.
- After mutation succeeds, invalidating `["commission-report"]` and `["commission-report-all-entries"]` query keys causes the wall-anchor query to re-run, which already filters out `exclude_from_commission = true` projects.
- A toast confirms the action: "Project excluded from commission report".
- The `ProjectCommissionTab` toggle (already built) can be used to undo the exclusion if needed.

