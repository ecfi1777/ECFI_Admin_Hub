

# Fix: Daily Schedule Edit Button on Mobile

## Problem
The pencil (Edit) button in Daily Schedule rows does not reliably open EditEntryDialog on Android. The current bubble-phase `onPointerDown` + `onClick` with `stopPropagation` is insufficient -- mobile browsers can intercept events at the capture phase before they reach the button.

## Solution
Upgrade the Edit button to use **capture-phase** event handlers with `preventDefault()`.

## File Changed

**`src/components/schedule/ScheduleTable.tsx`** -- Edit/Pencil button only

### Current code (Edit button block):
```tsx
<Button
  type="button"
  size="icon"
  variant="ghost"
  onPointerDown={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();
    setEditEntry(entry);
    setEditEntryTab("general");
  }}
  className="h-7 w-7 text-muted-foreground hover:text-foreground"
  title="Edit full details"
>
  <Pencil className="w-3 h-3" />
</Button>
```

### Replace with:
```tsx
<Button
  type="button"
  size="icon"
  variant="ghost"
  className="h-7 w-7 text-muted-foreground hover:text-foreground"
  title="Edit full details"
  onPointerDownCapture={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  onTouchStartCapture={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  onClickCapture={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditEntry(entry);
    setEditEntryTab("general");
  }}
>
  <Pencil className="w-3 h-3" />
</Button>
```

### What changes
- `onPointerDown` (bubble) replaced with `onPointerDownCapture` (capture phase)
- Added `onTouchStartCapture` to intercept touch events before any parent
- Added `onClickCapture` as additional capture-phase safety
- Added `preventDefault()` on all handlers to block mobile ghost-click/focus
- Existing `onClick` business logic preserved (`setEditEntry`, `setEditEntryTab`)

### What must NOT change
- Do not change the row's `onClick` or `onPointerDown` -- only ensure the pencil tap never triggers the row handler.
- Move and Delete buttons remain unchanged.
- No new files, no new dependencies.

