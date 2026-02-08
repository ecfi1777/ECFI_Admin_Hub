
# Mobile Responsiveness -- Remaining Pages

## Overview
Address mobile responsiveness gaps on the Calendar View, Settings, Reports, and Invoices pages. The Discrepancies page is excluded since it has a pending rewrite.

## Pages and Changes

### 1. Calendar View (`src/pages/CalendarView.tsx`)

**Header controls:**
- Change outer padding from `p-6` to `p-3 md:p-6`
- The header already uses `flex-col sm:flex-row`, which is good
- Reduce date title `min-w-[180px]` to `min-w-[140px]` so it fits narrow screens
- On mobile, stack the view toggle and nav controls onto two rows by wrapping them in `flex flex-wrap gap-2`

**Week view -- show only 1 day at a time on mobile:**
- On screens below 768px, the 7-column grid is unusable. Instead of the grid, render a horizontally scrollable day list using `snap-x snap-mandatory` with each day taking full width (`min-w-full snap-start`), matching the Kanban mobile pattern.
- Each day card shows the day header and its entries in a vertical list
- The user can swipe left/right between days
- Above the swipeable area, show a compact day-of-week row so users know where they are (e.g., small dots or abbreviated day names with the active one highlighted)
- Requires changes in `CalendarWeekView.tsx` -- accept an `isMobile` prop and conditionally render the swipe layout vs. the grid

**Month view -- compact list on mobile:**
- On mobile, the 7-column month grid is equally unusable. Switch to a vertical list showing only days that have entries (a "day agenda" view).
- Each day row shows the date and the count of entries, and taps expand to show the entry list
- This avoids the need to squeeze 7 tiny columns onto a 360px screen
- Requires changes in `CalendarMonthView.tsx` -- accept an `isMobile` prop

**Skeleton:** Update `CalendarSkeleton` to reflect the mobile layouts (single-column cards instead of 7-column grid).

**Files changed:**
- `src/pages/CalendarView.tsx` -- pass `isMobile` to sub-views, responsive padding
- `src/components/calendar/CalendarWeekView.tsx` -- add mobile swipe layout
- `src/components/calendar/CalendarMonthView.tsx` -- add mobile agenda layout

### 2. Settings Page (`src/pages/Settings.tsx`)

**Tab strip:**
- Change outer padding from `p-6` to `p-3 md:p-6`
- Replace the `flex-wrap` TabsList with a horizontally scrollable container on mobile: wrap the TabsList in a `div` with `overflow-x-auto whitespace-nowrap` and remove `flex-wrap` from the TabsList itself, using `inline-flex` instead
- This matches the mobile dialog tab pattern already used in entry forms

**Files changed:**
- `src/pages/Settings.tsx` -- responsive padding, scrollable tab strip

### 3. Reports Page (`src/pages/Reports.tsx`)

**Minor padding fix:**
- Change outer padding from `p-6` to `p-3 md:p-6`
- The card grid already uses `md:grid-cols-2 lg:grid-cols-3` which stacks on mobile, so no further changes needed

**Files changed:**
- `src/pages/Reports.tsx` -- responsive padding only

### 4. Invoices Page (`src/pages/Invoices.tsx`)

**Table overflow:**
- The 8-column invoice table has no horizontal scroll wrapper. Wrap the `<Table>` in a `div` with `overflow-x-auto` so it scrolls horizontally on narrow screens
- This matches the pattern used in `ScheduleTable.tsx`

**Files changed:**
- `src/pages/Invoices.tsx` -- add `overflow-x-auto` wrapper around the table

## Technical Details

### Mobile detection
- Reuse the existing `useIsMobile()` hook from `src/hooks/use-mobile.tsx` (breakpoint at 768px)

### Calendar Week View mobile layout (in `CalendarWeekView.tsx`)
```text
+--------------------------------------------------+
|  S   M   T   W   T   F   S    (day selector row) |
|             [active dot]                          |
+--------------------------------------------------+
| <-- swipe -->                                     |
| +----------------------------------------------+ |
| | Wednesday, Feb 11                            | |
| | [Entry 1 - crew colored]                     | |
| | [Entry 2 - crew colored]                     | |
| | [Entry 3 - crew colored]                     | |
| | [+ Add Entry button]                         | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

- Use `useState` for `activeDayIndex` (default to today's index in the week, or 0)
- Tapping a day abbreviation in the selector row jumps to that day
- Swiping updates the active day index
- Implement with snap scroll: `overflow-x-auto snap-x snap-mandatory` container with 7 children each `min-w-full snap-start`
- Track scroll position with an `onScroll` handler to update the active day indicator

### Calendar Month View mobile layout (in `CalendarMonthView.tsx`)
```text
+--------------------------------------------------+
| February 11 (Tue)              3 entries    [+]  |
|   [Entry 1]                                       |
|   [Entry 2]                                       |
|   [Entry 3]                                       |
+--------------------------------------------------+
| February 12 (Wed)              1 entry      [+]  |
|   [Entry 1]                                       |
+--------------------------------------------------+
| February 14 (Fri)              2 entries    [+]  |
|   ...collapsed...                                  |
+--------------------------------------------------+
```

- Filter `calendarDays` to only show days with entries (or current day)
- Use `Collapsible` from existing UI to expand/collapse each day
- Each entry row is a `CalendarEntry` component (reused)
- Add button visible on each day header

### Settings tab scrolling (in `Settings.tsx`)
```text
Before: flex-wrap causes tabs to wrap into 2-3 rows, crowding on 360px
After:  single scrollable row, user can swipe to see all tabs
```

The TabsList will use `overflow-x-auto` and `inline-flex` with `whitespace-nowrap` to allow horizontal scrolling. Remove `flex-wrap` and `h-auto`.

## Files Changed Summary

| File | Action | Scope |
|------|--------|-------|
| `src/pages/CalendarView.tsx` | Edit | Responsive padding, pass `isMobile` prop |
| `src/components/calendar/CalendarWeekView.tsx` | Edit | Add mobile swipe-day layout |
| `src/components/calendar/CalendarMonthView.tsx` | Edit | Add mobile agenda layout |
| `src/pages/Settings.tsx` | Edit | Responsive padding, scrollable tab strip |
| `src/pages/Reports.tsx` | Edit | Responsive padding |
| `src/pages/Invoices.tsx` | Edit | Add `overflow-x-auto` to table wrapper |
