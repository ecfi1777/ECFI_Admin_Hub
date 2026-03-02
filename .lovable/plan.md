
## Theme-Aware Color Replacement in ProjectScheduleHistory

### Summary
Replace all hardcoded dark-theme Tailwind classes in `ProjectScheduleHistory.tsx` with semantic theme tokens so the component respects light/dark mode like the rest of the app. Amber-500 accent colors will be preserved.

### Mapping Applied

| Hardcoded Class | Theme Token |
|---|---|
| `bg-slate-800` | `bg-card` |
| `bg-slate-700` | `bg-muted` |
| `bg-slate-900` | `bg-muted` (detail cards within entries) |
| `bg-slate-600` (tab active) | `bg-border` |
| `text-white` | `text-foreground` |
| `text-slate-300` | `text-muted-foreground` |
| `text-slate-400` | `text-muted-foreground` |
| `border-slate-700` | `border-border` |
| `border-slate-600` | `border-border` |
| `bg-red-900/20` | `bg-destructive/10` |
| `border-red-800/30` | `border-destructive/20` |

### File Changed
**`src/components/projects/ProjectScheduleHistory.tsx`** -- single file, class-name-only changes throughout.

### Locations (by line range)

1. **Loading state** (lines 321-326): `bg-slate-800 border-slate-700` -> `bg-card border-border`, `text-slate-400` -> `text-muted-foreground`
2. **Empty state** (lines 331-338): Same card and text replacements
3. **Main card** (line 344): `bg-slate-800 border-slate-700` -> `bg-card border-border`
4. **Card title** (line 346): `text-white` -> `text-foreground`
5. **Accordion items** (line 354): `bg-slate-700` -> `bg-muted`
6. **Accordion trigger** (line 356): `text-white` -> `text-foreground`
7. **Entry count** (line 359): `text-slate-400` -> `text-muted-foreground`
8. **Entry rows** (lines 370-373): `bg-red-900/20 border-red-800/30` -> `bg-destructive/10 border-destructive/20`, `bg-slate-800` -> `bg-card`
9. **Time text** (line 387): `text-slate-400` -> `text-muted-foreground`
10. **Crew text** (line 393): `text-slate-300` -> `text-muted-foreground`
11. **Edit button** (line 420): `text-slate-400 hover:text-white` -> `text-muted-foreground hover:text-foreground`
12. **Detail cards** (lines 432, 467, 497, 532, 552): `bg-slate-900` -> `bg-muted`
13. **Detail card headers** (lines 433, 468, 498, 533, 553): `text-slate-400` -> `text-muted-foreground`
14. **Detail card values** (lines 438, 443, 448, 473, 478, 503, 508, 513, 538, 558): `text-slate-300` -> `text-muted-foreground`, `text-slate-400` -> `text-muted-foreground`
15. **Border dividers in detail cards** (lines 458, 488, 523, 543, 570): `border-slate-700` -> `border-border`
16. **Dialog** (line 586): `bg-slate-800 border-slate-700` -> `bg-card border-border`
17. **Dialog title** (line 588): `text-white` -> `text-foreground`
18. **TabsList** (line 594): `bg-slate-700` -> `bg-muted`
19. **TabsTriggers** (lines 595-598): `data-[state=active]:bg-slate-600` -> `data-[state=active]:bg-border`
20. **All Labels** in form (lines 604, 617, 639, 648, 659, 671, 684, 698, 708, 720, 733, 746, 761, 770, 782, 795, 806): `text-slate-300` -> `text-muted-foreground`
21. **All Inputs/Textareas** in form: `bg-slate-700 border-slate-600 text-white` -> `bg-muted border-border text-foreground`
22. **All SelectTriggers**: `bg-slate-700 border-slate-600 text-white` -> `bg-muted border-border text-foreground`
23. **All SelectContents**: `bg-slate-700 border-slate-600` -> `bg-muted border-border`
24. **All SelectItems**: `text-white` -> `text-foreground`
25. **Section header** (line 636): `border-slate-600` -> `border-border`, `text-slate-400` -> `text-muted-foreground`
26. **Cancel button** (line 822): `border-slate-600 text-slate-300 hover:bg-slate-700` -> `border-border text-muted-foreground hover:bg-muted`

### Not Changed
- `text-amber-500`, `hover:text-amber-400`, `text-amber-400`, `bg-amber-500`, `hover:bg-amber-600`, `text-black` (on save button) -- intentional brand colors
- `text-green-400` -- status indicator
- `text-red-400`, `text-red-400/80` -- cancellation text (semantic, not theme background)
- `decoration-red-500` -- strikethrough on cancelled entries
