## Goal

Replace the single **Slab** P&L card with two independent cards — **Interior Slabs** and **Exterior Slabs** — so exterior stone (and exterior phase costs like Driveways, Sidewalks, etc.) stop bleeding into Footings & Walls.

Final card lineup per project: **Footings & Walls · Interior Slabs · Exterior Slabs** (Overhead/Service stays as-is).

## 1. Phase remap (Settings → Phases)

Repoint these existing phases' `pl_section`:

**Interior Slabs (`interior_slab`)** — Basement Slab, Garage Slab, Prep Slabs, Prep B&G Slabs, Interior Slabs

**Exterior Slabs (`exterior_slab`)** — Exterior Flatwork, Driveways, Sidewalks, Stoops, Leadwalks, Prep Exterior Slabs

Footings & Walls phases unchanged. Anything still tagged `slab` after migration gets defaulted to `interior_slab` (safety net for orgs other than ECFI).

The Phases settings UI gets two new `pl_section` options ("Interior Slab", "Exterior Slab") and drops the old "Slab" option (existing rows are migrated, so it disappears cleanly).

## 2. Stone categories renamed

In the entry form's Stone tab the two category options become:
- **Interior Slab Stone** (value `basement_garage` — kept as-is in DB to avoid a second data migration)
- **Exterior Slab Stone** (value `exterior`)

Routing: Interior Slab Stone → Interior Slabs card · Exterior Slab Stone → Exterior Slabs card. Vendor Bills label updated to match.

## 3. Revenue, labor, materials, other costs

Each of the three cards is fully independent (own Base House / Extras / Total Invoice / Labor override / Materials list / Other Costs list).

Data migration:
- `project_pl_revenue` rows with `section='slab'` → `section='interior_slab'`
- `project_labor_entries` rows with `pl_section='slab'` → `pl_section='interior_slab'`
- `project_materials_costs` rows with `pl_section='slab'` → `pl_section='interior_slab'`
- `project_other_costs` rows with `pl_section='slab'` → `pl_section='interior_slab'`

Exterior Slabs starts blank for every project; user enters revenue/labor/etc. going forward.

## 4. P&L computation

`ProjectPLTab.tsx` switches from two sections to three:

```text
Section = "footings_walls" | "interior_slab" | "exterior_slab"
```

- Vendor concrete/pump/sub/stone bucketed by phase `pl_section` (using the new values).
- Stone cost is split by `pl_category`:
  - `basement_garage` → Interior Slabs card, row labeled "Interior Slab Stone"
  - `exterior` → Exterior Slabs card, row labeled "Exterior Slab Stone"
- Footings & Walls card no longer shows any stone row.
- Concrete labels: "Slab Pour — Concrete" / "Other Slab Concrete" stay on Interior Slabs; the same two rows appear on Exterior Slabs (driven by phase, so exterior flatwork pours land there).

## 5. Commissions

`ProjectCommissionTab` and Commission report aggregate yards by phase `pl_section`. If they currently key off `"slab"`, they'll be updated to sum `interior_slab + exterior_slab` wherever the current behavior was "all slab yards" — preserving existing commission math.

## 6. Files changed

- **Migration** — update phases, revenue, labor, materials, other_costs rows; no schema changes.
- `src/components/projects/ProjectPLTab.tsx` — three-section model, new labels, stone routing by category, no stone on F&W.
- `src/components/schedule/entry-form/tabs/StoneTab.tsx` — relabel options to "Interior Slab Stone" / "Exterior Slab Stone".
- `src/components/settings/ReferenceDataTable.tsx` (or phases editor) — new `pl_section` dropdown options, remove "Slab".
- `src/components/projects/ProjectCommissionTab.tsx` + `src/components/reports/CommissionReport.tsx` — include both new sections wherever "slab" was summed.
- `src/components/vendor-invoices/*` — label tweak for stone category badge.

## Out of scope

- No new tables or columns.
- Stone `pl_category` DB values stay `basement_garage` / `exterior` (UI labels only change).
- Other orgs' phases that still say `slab` get auto-mapped to `interior_slab`; they can re-tag specific phases as exterior themselves later.
