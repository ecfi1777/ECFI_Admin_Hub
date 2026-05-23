## Goal
Let each phase carry a "Default to Invoice" setting. When a new schedule entry is created for a phase that has this flag on, the entry's "To Be Invoiced" checkbox is pre-checked automatically.

## Changes

### 1. Database
- Add column `default_to_be_invoiced boolean NOT NULL DEFAULT false` to `phases`.

### 2. Phases reference data (Settings → Reference Data → Phases)
- Add a "Default Invoice" toggle column to the phases management table (`ReferenceDataTable` / phase-specific row), alongside the existing P&L Section and Phase Type controls.
- Persist toggling via update to `phases.default_to_be_invoiced`.

### 3. Add Entry Dialog (`AddEntryDialog` + `useEntryForm`)
- When the user picks a phase (or when the dialog opens with a pre-selected phase), look up that phase's `default_to_be_invoiced` and, if true AND the user hasn't manually toggled the box yet, set `to_be_invoiced = true`.
- Track a "user manually changed" flag so switching phases back and forth doesn't fight the user.
- Edit dialog is NOT affected — only applies on creation.

### 4. Types
- Extend the phase type / reference data hook to include `default_to_be_invoiced`.

## Out of scope
- Edit Entry Dialog behavior (existing entries keep whatever was saved).
- Inline schedule add (`InlineAddSelect`) — only the full Add Entry dialog. (Tell me if you want inline included.)
- Auto-checking "Invoice Complete" — that stays manual via the Invoices page.

## Open question
Should this also apply to the quick **inline add** row on the schedule (where a phase is picked from a dropdown), or only the full "Add Entry" dialog?
