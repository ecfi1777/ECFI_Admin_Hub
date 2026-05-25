## Problem
The Discrepancies page currently shows all schedule entries with missing yards data, including non-concrete phases like Prep Footings, Set Walls, and Strip Walls. These phases never involve concrete and should not appear on this report.

## Solution
Restrict the Discrepancies page to only schedule entries whose associated phase has `phase_type` in `['footing', 'wall', 'slab']`.

## Changes

### 1. Type update (`src/types/schedule.ts`)
- Add `phase_type: string | null` to the `phases` nested relation on `ScheduleEntry`.

### 2. Query update (`src/pages/Discrepancies.tsx`)
- Update `ENTRY_SELECT` to select `phases(phase_type, name)` instead of `phases(name)`.
- After fetching `incompleteEntries`, filter to only those where `phases?.phase_type` is `'footing'`, `'wall'`, or `'slab'` before passing to `IncompleteEntriesSection`.
- After fetching `completeEntries`, apply the same phase-type filter before passing to:
  - `projectGroups` (Project Discrepancies section)
  - `YardsSummaryCards` (breakdown cards)

This keeps the page scoped to actual concrete pours and hides Prep Footings, Set Walls, Strip Walls, Service, and any other non-pour phases entirely.

## Out of scope
- P&L tab, Commission tab, Vendor Bills, Calendar, other reports — those are handled separately.
- No database schema changes needed.
- No new UI elements or filters.