

# Add Drag-and-Drop Editing to All Settings Lists

## Overview
Redesign the `ReferenceDataTable` component to match the drag-and-drop style used in the Crews management section. Every reference data list (Builders, Locations, Phases, Statuses, Suppliers, Pump Vendors, Concrete Mixes, Inspection Types, Inspectors) will get grip handles for reordering, inline active toggles, and edit buttons -- all in the same visual style as Crews.

## What Changes

### 1. Database Migration
Six tables currently lack a `display_order` column. A migration will add it (defaulting to `0`) to:
- `builders`
- `inspection_types`
- `inspectors`
- `locations`
- `pump_vendors`
- `suppliers`

### 2. Redesigned ReferenceDataTable Component
Replace the current table-based layout with a drag-and-drop list matching the Crews style:

- **Grip handle** (drag icon) on the left for reordering
- **Position number** showing current order
- **Item name** displayed inline
- **Code badge** (for Builders, Suppliers, Pump Vendors) shown next to the name
- **Active/Inactive toggle** switch
- **Edit button** (pencil icon) to open the edit dialog
- **"Save Order" button** appears when order changes are detected (unsaved reordering)
- **"+ Add" button** at the top to create new items

### 3. Settings Page Update
Remove the `hasOrder` prop from the Settings page since all tables will now support ordering via drag-and-drop.

## Technical Details

### Database Migration SQL
```sql
ALTER TABLE public.builders ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.inspection_types ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.inspectors ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.pump_vendors ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
```

### Component Architecture
- Create a new `SortableReferenceRow` sub-component using `@dnd-kit/sortable` (same pattern as `SortableCrewRow`)
- Refactor `ReferenceDataTable` to use `DndContext` + `SortableContext` with vertical list strategy
- Add local state for ordered items and a `hasOrderChanges` flag
- Add a save-order mutation that updates `display_order` for each item
- Keep the existing Add/Edit dialog for name and code fields
- Remove the manual "Display Order" number input field from the dialog (replaced by drag-and-drop)

### Files Modified
- `src/components/settings/ReferenceDataTable.tsx` -- full rewrite to drag-and-drop style
- `src/pages/Settings.tsx` -- remove `hasOrder` prop (no longer needed)
- New migration file for adding `display_order` columns

