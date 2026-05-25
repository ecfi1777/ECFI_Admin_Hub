## Plan

Add a small info/note icon with a tooltip to the **Settings → Phases** page so users understand which phase types cause entries to show up in the **Yards Discrepancies** report.

### Changes

1. **Import `Info` icon from lucide-react and tooltip components** in `src/components/settings/SortableReferenceRow.tsx`.
2. **Add info icon to the "Phase Type" column header** in `src/components/settings/ReferenceDataTable.tsx` (line ~286).
   - Wrap the icon in a `<Tooltip>` component.
   - Tooltip text: "Footing Pour, Wall Pour, and Slab Pour types include schedule entries in the Yards Discrepancies report. Other types are excluded."
3. **Add info icon beside each row's Phase Type badge** in `SortableReferenceRow.tsx` when the phase type is `footing`, `wall`, or `slab`.
   - Same tooltip text as above.
   - Use a small `Info` icon (size 12 or 14) next to the badge with muted color.

### Visual

```
Header row:
  Phase Name | P&L Section | Phase Type [i] | Auto Inv. | Active |

Each row (e.g., "Pour Footings"):
  Pour Footings | F&W | FTG [i] | — | Active |
```

The `[i]` is a small, muted info icon. Hovering it shows the tooltip. No new dependencies needed — lucide-react and the existing tooltip component are already available.