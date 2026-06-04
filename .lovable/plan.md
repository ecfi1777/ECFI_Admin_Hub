## Slab P&L Enhancements

The Project → P&L tab already has a "Slab" card next to "Footings & Walls". This plan upgrades it so every slab-related cost (especially stone) flows through correctly, is broken out by phase, and leaves room for materials you'll add later.

### 1. Fix multi-supplier stone aggregation
Today the P&L reads `schedule_entries.stone_invoice_amount`, which only mirrors line 1 of a multi-supplier entry. Switch the Slab (and F&W) aggregator to sum **all** rows in `schedule_entry_stone_lines` for the entries in scope, falling back to the legacy column when no lines exist (older entries).

### 2. Phase-type breakdown for the Slab card
Mirror what F&W does. Slab costs will be split into named lines based on the entry's `phases.phase_type`:

```text
Slab
├─ Prep Slabs — Stone           $ ...   (sum of stone lines on prep-slab phase entries)
├─ Slab Pour — Concrete         $ ...   (ready_mix on slab-pour phase entries)
├─ Slab Pour — Pump             $ ...
├─ Other Slab Concrete          $ ...   (if phase_type is neither)
├─ Inspection                   $ ...
├─ Sub Labor                    $ ...   (single rolled-up line, as today)
├─ Labor                        $ ...   (existing crew-hours × rate logic)
├─ Materials   ◄── NEW          $ ...
└─ Other Costs (existing)       $ ...
```

Lines with $0 stay hidden, same convention as F&W.

### 3. Itemized stone deliveries (expandable)
Under the "Prep Slabs — Stone" line, add a small expandable list showing each delivery: `Supplier · tons · invoice # · $amount`. Read-only display sourced from `schedule_entry_stone_lines` joined to `suppliers`. Collapsed by default so the card stays compact.

### 4. New "Materials" cost section
A new repeating cost block per P&L section (like Other Costs) for things like rebar, vapor barrier, finishing materials, equipment rental, etc. Each row: description, vendor (optional free text), amount. Editable inline; deletable; included in Total Costs.

**Schema:** new table `public.project_materials_costs` with columns `project_id`, `organization_id`, `pl_section` (`footings_walls` | `slab`), `description`, `vendor` (nullable text), `amount`, `display_order`, timestamps. Org-scoped RLS mirroring `project_other_costs`, plus the required GRANTs.

Because it's added to both sections, you'll automatically get a Materials line on Footings & Walls too — let me know if you'd rather restrict it to Slab.

### 5. Touch points
- `src/components/projects/ProjectPLTab.tsx` — query change for stone lines, phase-type aggregation for slab, new "Materials" subcomponent, render itemized stone breakdown.
- New `ProjectMaterialsCostsSection` component (kept under 300 lines, parent fetches data).
- One migration for `project_materials_costs`.

### What stays the same
- Sub Labor remains one rolled-up line per section (per your choice).
- Vendor Bills, Discrepancies, Daily Schedule UI: unchanged.
- F&W card: gains the multi-stone fix and a Materials line, otherwise unchanged.

### Open question (won't block)
The slab card's stone breakdown assumes "Prep Slabs" is the phase_type used for stone deliveries on slabs. If you also do stone on other slab phases, I'll roll them under "Other Slab Stone" the same way F&W handles "Other F&W Concrete".
