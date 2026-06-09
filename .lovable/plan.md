## Summary
Move the empty-state "Add Note" button from the right side of `CrewNotes.tsx` to the left, placing it directly beside the `FileText` icon.

## Current Layout (no note)
```
[Icon] "Add Note" ........................ [Add Note]
```

## Target Layout (no note)
```
[Icon] [Add Note]
```

## Details

**File:** `src/components/schedule/CrewNotes.tsx`

**Change:**
- When `hasNote` is false and `editing` is false, replace the left-side text `"Add Note"` with the actual `Button` component that currently lives on the right.
- Remove that button from the right-side button group so it no longer appears duplicated.
- The right side remains empty when there is no note.
- When a note exists, layout stays as-is: `[Icon] Note text ........ [Edit]`.
- No database or logic changes.
