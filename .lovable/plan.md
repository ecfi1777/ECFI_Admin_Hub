
## Set Default Calendar View to Monthly

A single change in `src/pages/CalendarView.tsx`:

**Line 36** — Change the initial `viewMode` state from `"week"` to `"month"`:

```typescript
const [viewMode, setViewMode] = useState<ViewMode>("month");
```

This means when users navigate to the Calendar page, it will load the monthly layout by default. They can still toggle to the weekly view using the existing toggle button.
