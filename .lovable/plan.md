

# Phase 3 Fix: KanbanColumn.tsx Column Classes

Two corrections to the Phase 3 plan for `src/components/kanban/KanbanColumn.tsx`.

---

## Fix 1: Scope `w-[280px]` to desktop

The plan previously had `w-[280px]` without an `md:` prefix, which would fight `min-w-[85vw]` on mobile.

**Corrected classes for normal (not collapsed) state:**
```
flex flex-col min-w-[85vw] snap-start md:min-w-[260px] md:w-[280px] flex-shrink-0 transition-all
```

## Fix 2: Preserve the existing `isCollapsed` ternary structure

The current code (lines 28-30) uses a template literal with `isCollapsed` conditional:

```tsx
className={`flex flex-col min-w-[260px] ${
  isCollapsed ? "w-12" : "w-[280px]"
} flex-shrink-0 transition-all`}
```

**Keep this exact conditional pattern.** Update the mobile/desktop width classes inside each branch:

```tsx
className={`flex flex-col min-w-[85vw] snap-start md:min-w-[260px] ${
  isCollapsed ? "w-12 min-w-[48px]" : "md:w-[280px]"
} flex-shrink-0 transition-all`}
```

**What changed in each branch:**
- **Collapsed branch**: `"w-12"` becomes `"w-12 min-w-[48px]"` (overrides the 85vw min-width so collapsed columns stay narrow on all screens)
- **Normal branch**: `"w-[280px]"` becomes `"md:w-[280px]"` (desktop-only width; on mobile the column is sized by `min-w-[85vw]` from the outer classes)

**What stays the same:**
- The `isCollapsed` ternary conditional -- not restructured
- `flex-shrink-0 transition-all` -- unchanged
- The collapse toggle button, header, and body rendering -- all untouched

---

## Updated Phase 3 KanbanColumn section (replaces the previous version in the plan)

**`src/components/kanban/KanbanColumn.tsx`** (lines 27-31):

Keep the existing `isCollapsed` conditional structure. Update the mobile/desktop width classes inside each branch as specified:

```tsx
<div
  className={`flex flex-col min-w-[85vw] snap-start md:min-w-[260px] ${
    isCollapsed ? "w-12 min-w-[48px]" : "md:w-[280px]"
  } flex-shrink-0 transition-all`}
>
```

No other changes to this file. The collapse toggle, header, body, ProjectCard rendering, and droppable ref all remain unchanged.

---

All other phases in the plan remain unchanged. This fix only affects the KanbanColumn className on lines 27-31.
