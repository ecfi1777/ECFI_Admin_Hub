## Goal
Clarify the Phases settings table so each control is clearly labeled, and fix the misleading helper text that says Phase Type is "for the Commission Report" (it's actually used by Commission Report, Project P&L, and Discrepancies).

## Changes

### 1. `src/components/settings/SortableReferenceRow.tsx`
- Restructure the two trailing toggles into vertical stacks (small label on top, switch below):
  - **Auto Inv.** stacked above its switch
  - **Active** stacked above its switch
- Remove the inline "Auto Inv." text that currently sits to the right of the switch.
- Labels: `text-[10px] text-muted-foreground`, centered above each switch.

### 2. `src/components/settings/ReferenceDataTable.tsx`
- Replace the helper sentence under the Phases header with:
  > "Set both **P&L Section** (which P&L bucket the phase rolls into) and **Phase Type** (which rows are actual concrete pours). Phase Type drives the Commission Report (footing/wall anchors), Project P&L sub-totals, and the Yards Discrepancies filter."
- Add a thin header strip above the sortable list (only when `hasPlSection` is true) with small column labels aligned to the controls below: `P&L Section`, `Phase Type`, `Auto Inv.`, `Active`. Styled `text-[10px] text-muted-foreground uppercase tracking-wide`, mirroring the widths in `SortableReferenceRow`.

## Out of scope
- No DB or business-logic changes.
- No changes to other reference tables (Crews, Builders, etc.).