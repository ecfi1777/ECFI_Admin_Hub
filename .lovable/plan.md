# Plan: Crew Note Placeholder Text Update

## Change
In `src/components/schedule/CrewNotes.tsx`, replace the empty-state text:
- **From:** `"No crew note for this day."`
- **To:** `"Add Note"` (keeping the `FileText` icon)

## Details
- The `FileText` icon already appears in the left corner of the component.
- The right-side button already reads "Add Note" when no note exists.
- This change removes the duplicate/unnecessary "No crew note..." message and lets the icon + "Add Note" button serve as the empty state.

## Files Modified
- `src/components/schedule/CrewNotes.tsx` (1 line change)

## No database changes required