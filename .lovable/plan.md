## Add Stone Category (Basement & Garage / Exterior) to drive P&L mapping

### What changes

1. **New required field on every stone line:** **Category** — a two-option toggle/select:
   - **Basement & Garage Stone**
   - **Exterior Stone**

2. **Stone Type becomes optional** — the existing dropdown (Recycled 57's, CR6, Washed 3/4 Gravel, Blue 57) stays, but is no longer required. Category is what drives P&L.

3. **P&L mapping driven by Category (not phase):**
   - **Basement & Garage Stone** → rolls into the **Slab** P&L card.
   - **Exterior Stone** → rolls into the **Footings & Walls** P&L card.
   - This replaces the current phase-based stone bucketing (Prep Slabs → Slab, Prep Footings → F&W, off-phase → "Other …"). The "Other Slab Stone" / "Other F&W Stone" lines go away — every stone line lands in exactly one card based on its category.

4. **Stone tab in entry form (Add & Edit dialogs):** each supplier line gets a Category selector at the top of the line, with a sensible default based on phase (Prep Slabs / Slab Pour default → Basement & Garage; Prep Footings / Footing / Wall Pour default → Exterior). User can override per line. Saving requires Category set.

5. **Vendor Bills:** unchanged — stone still surfaces under the Stone filter. Category will be shown as a small label next to the stone line so you can tell at a glance which P&L it hits.

6. **Itemized Stone deliveries in P&L:** the expandable list under the stone row will show Supplier · Tons · Invoice # · **Category**.

### Technical details

- Migration: add `pl_category text` to `schedule_entry_stone_lines` (values `basement_garage` | `exterior`), nullable for now, plus a validation trigger. Backfill existing rows from phase (Prep Slabs / slab_pour → `basement_garage`; everything else → `exterior`). After backfill, mark NOT NULL.
- `ProjectPLTab.tsx`: replace phase-keyed stone aggregation with category-keyed aggregation across all entries on the project.
- `StoneTab.tsx`: add Category selector per line, default from phase, mark required.
- `AddEntryDialog` / `EditEntryDialog`: pass current phase to StoneTab so it can default the category; include `pl_category` in save payloads.
- `types.ts` (form values) + `useEntryForm.ts`: add `pl_category` to `StoneLineFormValue`.

### Out of scope (confirm if you want it)

- No new Settings page — the two categories are hard-coded (you said only two, ever). If later you want them editable, we'd promote to a reference-data table.
- Stone Types reference list stays as-is.