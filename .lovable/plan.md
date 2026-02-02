

# Fix Inactive Crew Behavior

## Overview

This plan addresses two issues with inactive crews:

1. **Daily Schedule**: Entries assigned to inactive crews are currently shown in "Unassigned" because the inactive crew's card is not rendered
2. **Edit Entry Dialog**: The crew dropdown only shows active crews, which means you cannot see/keep the currently assigned inactive crew when editing an existing entry

## Problem Analysis

### Issue 1: Daily Schedule Missing Inactive Crew Cards

**Current Behavior:**
- `DailySchedule.tsx` fetches only active crews (line 129: `.eq("is_active", true)`)
- If an entry is assigned to an inactive crew, no card exists for that crew
- The entry falls into "Unassigned" section (line 222: entries where `crew_id` doesn't match any sorted crew)

**Desired Behavior:**
- Show inactive crew cards only if they have entries on the selected date
- Historical entries remain visible under their original crew assignment

### Issue 2: Edit Dialog Hides Currently-Assigned Inactive Crew

**Current Behavior:**
- `EditEntryDialog.tsx` fetches only active crews (line 180: `.eq("is_active", true)`)
- If editing an entry assigned to an inactive crew, that crew is not in the dropdown
- User cannot see or maintain the original crew assignment

**Desired Behavior:**
- Dropdown shows all active crews PLUS the currently-assigned crew (even if inactive)
- User can change to any active crew, or keep the inactive crew assignment

---

## Solution

### File 1: `src/components/schedule/DailySchedule.tsx`

**Changes:**

1. Remove `is_active` filter from crews query - fetch all crews
2. Add `is_active` field to the Crew interface
3. Filter the crews to display based on:
   - Active crews (always shown)
   - Inactive crews that have at least one entry on the selected date

**Logic:**
```text
displayedCrews = crews.filter(crew => 
  crew.is_active || 
  entries.some(entry => entry.crew_id === crew.id)
)
```

### File 2: `src/components/schedule/EditEntryDialog.tsx`

**Changes:**

1. Modify the crews query to fetch all crews (remove `is_active` filter)
2. Add `is_active` field to the crew data
3. Filter the dropdown options to show:
   - All active crews
   - The currently-assigned crew if it exists (even if inactive)
4. Mark inactive crews in the dropdown with "(Inactive)" label

**Logic:**
```text
crewOptions = crews.filter(crew =>
  crew.is_active ||
  crew.id === entry.crew_id
)
```

---

## Technical Details

### DailySchedule.tsx Changes

```typescript
// Update Crew interface (line ~53-57)
interface Crew {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;  // Add this field
}

// Update query (lines 123-133)
const { data: crews = [] } = useQuery({
  queryKey: ["crews-all"],  // Change query key
  queryFn: async () => {
    const { data, error } = await supabase
      .from("crews")
      .select("id, name, display_order, is_active");  // Remove .eq filter, add is_active
    if (error) throw error;
    return data as Crew[];
  },
});

// Filter crews for display (after sortCrews, before entriesByCrew)
const displayedCrews = sortedCrews.filter(
  (crew) => crew.is_active || entries.some((e) => e.crew_id === crew.id)
);

// Use displayedCrews instead of sortedCrews in the render
```

### EditEntryDialog.tsx Changes

```typescript
// Update query (lines 177-184)
const { data: crews = [] } = useQuery({
  queryKey: ["crews-all"],  // Change query key
  queryFn: async () => {
    const { data, error } = await supabase
      .from("crews")
      .select("id, name, is_active")  // Add is_active, remove .eq filter
      .order("display_order");
    if (error) throw error;
    return data;
  },
});

// Filter for dropdown options
const crewOptions = crews.filter(
  (c) => c.is_active || c.id === entry?.crew_id
);

// Update SelectItem rendering to show inactive label
{crewOptions.map((c) => (
  <SelectItem key={c.id} value={c.id}>
    {c.name}{!c.is_active && " (Inactive)"}
  </SelectItem>
))}
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/schedule/DailySchedule.tsx` | Fetch all crews with `is_active` field; filter to show active crews + inactive crews with entries for the selected date |
| `src/components/schedule/EditEntryDialog.tsx` | Fetch all crews with `is_active` field; filter dropdown to show active crews + currently-assigned crew; add "(Inactive)" label |

---

## No Database Changes Required

Both fixes only require frontend query and filtering changes. The existing `is_active` column on the `crews` table already stores the necessary data.

