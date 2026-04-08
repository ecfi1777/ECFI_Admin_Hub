

## Add Project Details Link to Edit Entry Dialog Title

### Summary
Add an `ExternalLink` icon button next to the project name in the Edit Entry dialog title. Clicking it opens the `ProjectDetailsSheet` overlay, matching the pattern already used in `ScheduleTable.tsx`.

### Changes — `src/components/schedule/EditEntryDialog.tsx`

**1. Imports (line 8, 23)**
- Add `useState` to the existing `useEffect, useMemo` import on line 8
- Add `ExternalLink` to the lucide-react import on line 23
- Add `import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";` after line 27

**2. State variables (after line 47)**
```tsx
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
```

**3. DialogTitle update (line 176)**
Replace the single-line `<DialogTitle>` with a flex layout containing the truncated text plus a conditional `ExternalLink` icon button (only shown when `entry?.project_id` exists). The button calls `setSelectedProjectId` and `setIsProjectSheetOpen`.

**4. ProjectDetailsSheet (before closing `</Dialog>` on line 325)**
Add the `<ProjectDetailsSheet>` component with `projectId={selectedProjectId}`, `isOpen={isProjectSheetOpen}`, and an `onClose` handler that resets both state variables.

### No other files changed

