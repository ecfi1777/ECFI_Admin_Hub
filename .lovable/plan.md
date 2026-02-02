

# Add Crew Tab to Edit Entry Dialog

## Overview

This plan adds a new "Crew" tab to both Edit Entry dialogs, providing a dedicated place for crew-reported data that gets compared against supplier-billed data on the Discrepancies page.

## Database Changes

A new column needs to be added to the `schedule_entries` table:

| Column | Type | Purpose |
|--------|------|---------|
| `crew_notes` | TEXT (nullable) | Notes related to the crew's work on this entry |

The `crew_yards_poured` column already exists in the database.

---

## Files to Modify

### 1. Daily Schedule - EditEntryDialog.tsx

**Current State:**
- 5 tabs: General, Concrete, Pump, Inspection, Invoicing
- `crew_yards_poured` not currently included in this dialog

**Changes:**
- Add "Crew" tab after "Invoicing" (6 tabs total)
- Update `defaultTab` type to include "crew"
- Add `crew_yards_poured` and `crew_notes` to form state
- Add to `useEffect` initialization
- Add to `handleSave` updates
- Add TabsContent for Crew tab with:
  - Crew Yards Poured (number input)
  - Crew Notes (textarea)

### 2. Project Details - ProjectScheduleHistory.tsx

**Current State:**
- 3 tabs: Concrete, Pump, Inspection
- `crew_yards_poured` is in the Concrete tab, but should move to Crew tab

**Changes:**
- Add "Crew" tab (4 tabs total)
- Move `crew_yards_poured` from Concrete tab to Crew tab
- Add `crew_notes` to form state
- Add to initialization in `handleEditClick`
- Add to `handleSave` updates
- Update ScheduleEntry interface to include `crew_notes`
- Update Supabase query to fetch `crew_notes`
- Add TabsContent for Crew tab

---

## UI Layout for Crew Tab

```text
+----------------------------------------+
|  Crew Yards Poured                     |
|  [   Number input field           ]    |
|                                        |
|  Crew Notes                            |
|  [                                  ]  |
|  [   Textarea for notes            ]  |
|  [                                  ]  |
+----------------------------------------+
```

---

## Technical Details

### Form State Updates

Both dialogs will add these fields to their form state:

```typescript
crew_yards_poured: "",
crew_notes: "",
```

### Save Logic Updates

Both `handleSave` functions will include:

```typescript
crew_yards_poured: formData.crew_yards_poured 
  ? parseFloat(formData.crew_yards_poured) 
  : null,
crew_notes: formData.crew_notes || null,
```

### Tab Grid Layout

- **EditEntryDialog**: Change from `grid-cols-5` to `grid-cols-6`
- **ProjectScheduleHistory**: Change from `grid-cols-3` to `grid-cols-4`

---

## Summary of Changes

| File | Changes |
|------|---------|
| Database Migration | Add `crew_notes` column to `schedule_entries` |
| `src/components/schedule/EditEntryDialog.tsx` | Add Crew tab, update form state, save logic, tab layout |
| `src/components/projects/ProjectScheduleHistory.tsx` | Add Crew tab, move `crew_yards_poured`, add `crew_notes`, update form state, save logic, fetch query |

