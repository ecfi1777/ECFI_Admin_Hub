

## Exclude Projects from Commission Report

### Problem
There is no `exclude_from_commission` field on the `projects` table yet. This requires both a database migration and a code change.

### Step 1 — Database Migration
Add a boolean column to the `projects` table:
```sql
ALTER TABLE public.projects
ADD COLUMN exclude_from_commission boolean NOT NULL DEFAULT false;
```

### Step 2 — Update CommissionReport.tsx

**2a. Add the field to the select queries**

In the wall-anchor query (Step 1) and the all-entries query (Step 1b), add `exclude_from_commission` to the `projects!inner(...)` select:
```
projects!inner(
  id, lot_number, exclude_from_commission,
  builders(name, code),
  locations(name)
)
```

**2b. Filter excluded projects in `wallAnchorEntries`**

After the existing `.filter()` that keeps only wall phases, add a second filter to remove entries whose project is excluded:
```typescript
return (data || []).filter((e: any) => {
  const s = e.phases?.pl_section;
  return (s === "footings_walls" || s === "both") && e.phases?.phase_type === "wall";
}).filter((e: any) => !e.projects?.exclude_from_commission);
```

This means `projectIds` will only contain non-excluded projects, and the downstream all-entries query, row building, totals, and Excel export all naturally exclude them with no additional patches.

### What does NOT change
- Column layout, editable cells, save handlers, totals row structure, Excel export structure — all untouched.

### Note on setting the flag
To mark a project as excluded, you would need a UI control (e.g., a checkbox on the project details or commission tab). If you want that added as well, let me know — but this plan covers the reporting exclusion logic only.

