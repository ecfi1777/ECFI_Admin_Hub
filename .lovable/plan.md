# Upcoming Work — weekly planning board

A standalone freehand planning page, fully separate from the operational Daily Schedule. It never reads or writes schedule entries. It reads crews and phases only as tag sources (read-only).

## Database (two new tables, nothing existing is touched)

**upcoming_work_items** — one row per planning item. A row with a date shows on the weekly board; a row without a date is a "horizon" item.
- Fields: date (optional), crew (optional), phase (either a picked phase or freehand text), description, status (scheduled/complete), "entered in main schedule" flag, ordering within a day, timestamps and who created/updated.
- Rules enforced in the database: every item must have a phase (picked or typed); an item with no date can never be marked complete.
- Indexes for fast week lookups and for the "needs schedule entry" badge.
- Standard auto-updating timestamp trigger.

**upcoming_work_week_notes** — one note per organization per week (week identified by its Monday), unique per week.

**Access rules:** any member of the organization can view; only owners/managers can add, edit or delete. Enforced in the database, not just hidden in the UI.

## Page

New "Upcoming Work" route, added to the sidebar right under Daily Schedule, visible to all roles, using the existing app shell, theme and toasts.

**Header:** title, week navigation (Prev / "Week of MM/DD/YYYY" / Next / Today), weeks start Monday, opens on the current week. Two tabs: Board and Needs Schedule Entry (with a count badge of completed items not yet entered in the main schedule, org-wide; hidden at zero).

**Board tab**
- Crew filter chips: "All crews", one per active crew with its color dot, plus "Unassigned". Multi-select, client-side only, applies to both the board and the horizon list.
- Legend: Scheduled (blue) and Complete (green) dots, theme-aware.
- Seven day columns Mon–Sun, today's column highlighted, each with an "+ Add job" button and a subtle "No jobs" empty state.
- Job cards: status dot, crew pill in the crew's color (or muted "No crew"), phase tag, multiline description, and a managers-only quick "✓ complete" action with a toast. Completed cards are muted with a green dot. Clicking a card opens the edit dialog.
- Drag and drop between days (managers only) via dnd-kit, already in the project; dropping updates the date and appends to that day's order. On touch devices the dialog's date field is the fallback.

**Add/Edit dialog** (shared by board and horizon): optional Date with "leave blank to keep this on the horizon" helper text, optional Crew, Phase dropdown of active phases plus "Other — type my own…" revealing a text field, required Description, and a Status toggle shown only when a date is set. Delete with confirmation when editing. Typed phases are stored on the item and never added to the phases list.

**Site Notes — This Week:** one textarea per visible week, auto-saved after ~1s with a subtle "Saved" indicator, read-only for non-managers.

**On the Horizon — Organized by Start Date:** "+ Add upcoming item" button; lists dated items after the visible week's Sunday grouped under month headers, then undated items under "No date set" with a TBD pill. Same records as the board — no duplication; items drop off once the visible week reaches their date, and past-dated items never appear. Each row shows date/TBD, phase, crew, description and (managers only) Edit/Remove. Setting a date shows a toast confirming the day it landed on.

**Needs Schedule Entry tab:** short explainer, then a table of completed items not yet entered in the main schedule (all weeks, oldest first) with Date, Phase, Crew, Description and a managers-only "✓ Added to main schedule" button that removes the row, updates the badge and toasts. Empty state: "All caught up — every completed job is in the main schedule."

**Non-managers:** the whole page works read-only — all add/edit/drag/complete/check-off controls are hidden (not disabled) and notes are not editable.

## Technical notes

- One migration creating only the two new tables, their constraints, indexes, grants, RLS policies and the updated_at trigger. Policies use the existing helpers `user_has_organization_access(auth.uid(), organization_id)` and `user_has_manage_access(auth.uid(), organization_id)` — note these take the user id first, so the calls will use that argument order.
- Data layer: react-query hooks scoped by the active organization id, with invalidation shared across board, horizon and badge so all three stay in sync after any mutation.
- Files: `src/pages/UpcomingWork.tsx` plus focused components under `src/components/upcoming-work/` (week header/tabs, crew filter, day column, job card, edit dialog, site notes, horizon panel, needs-entry report) and a `useUpcomingWork` hook — each kept small per the project's component-size convention.
- Existing files edited: `src/App.tsx` (route) and `src/components/layout/AppLayout.tsx` (nav item) only.
- Dates handled with the project's local-midnight `T00:00:00` convention; crew colors via the existing `getCrewColor`/contrast helpers.
- Responsive: columns scroll horizontally on narrow screens; the horizon and report become stacked rows on mobile.
