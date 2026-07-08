## Anchor commission crew to the wall entry (report + project detail)

Currently the `project_commissions` row for Karma is stored with `crew_id = 800` (the crew that was on the F&W entries when the commission was first entered). The Commission Report now anchors Karma's row to crew 1200 (the wall-in-month crew), so the per-(project, crew) lookup fails and Labor Allowance shows **$0** — even though the project's Commission tab still shows **$3,690.50** because it independently resolves the crew from the "first F&W entry with a crew."

This plan syncs both surfaces to the same wall-crew anchor, without moving/rewriting any commission rows.

### 1. `src/components/reports/CommissionReport.tsx`
- In the `projectMap.forEach` loop, when looking up the commission for a project, extend the lookup:
  1. Prefer `commissions.find(c => c.project_id === pid && c.crew_id === crewId)` (current behavior).
  2. If none, fall back to any commission for that project (`commissions.find(c => c.project_id === pid)`).
- Karma's report row (anchored to crew 1200) will pick up the commission stored under crew 800 and display $3,690.50 correctly.
- When saving `labor_allow` inline, if the existing commission row's `crew_id` differs from the report's anchor crew, update that existing row by `id` instead of upserting on `(project_id, crew_id)`. This prevents creating a duplicate commission row for the "new" crew and keeps a single source of truth per project's F&W commission.

### 2. `src/components/projects/ProjectCommissionTab.tsx`
- Replace `const crewEntry = fwEntries.find(e => e.crew_id)` (line 147) with the same wall-anchor logic used in the report, minus the month window (project detail has no month scope):
  1. Latest wall entry with a crew (by `scheduled_date` desc).
  2. Otherwise footing entry with a crew.
  3. Otherwise any F&W entry with a crew.
- The Commission tab header will now read "Footings & Walls Commission — **1200**" for Karma, and the same commission record ($3,690.50) will be shown/edited under that crew.
- `handleSave` still upserts on `(project_id, crew_id)`. If the stored row is under a different crew (e.g. 800) and the user edits values under 1200, we'll:
  - Prefer `upsert` by the existing `commission.id` when present (line 198 already handles this), so edits update the existing row in place regardless of stored `crew_id`.
  - Only fall back to the `(project_id, crew_id)` conflict path when no commission row exists yet for the project.

### What this does NOT do
- Does not migrate/rename any `project_commissions.crew_id` values.
- Does not change schema.
- Does not touch the report's crew-grouping logic (already correct after the previous fix).

### Result for Karma (May 2026)
- Commission Report: Karma appears under Crew 1200 with **Labor Allow. $3,690.50** (was $0.00).
- Project detail Commission tab: header shows "Footings & Walls Commission — 1200" with the same $3,690.50 (was showing "— 800").
- Commission tab totals unchanged.
