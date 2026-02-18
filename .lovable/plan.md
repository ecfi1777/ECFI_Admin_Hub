

## Fix: Schedule Route Rendering Dashboard Instead of Schedule

The root cause is on line 108 of `src/App.tsx`:

```
<Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

Both `/` and `/dashboard` currently render the Dashboard component. The `/` route should render the **DailySchedule** component (the actual schedule page), since the sidebar and dashboard tiles both link to `/` for "Schedule".

### Changes

**File: `src/App.tsx`**
1. Import the `DailySchedule` component from `@/components/schedule/DailySchedule`
2. Change the `/` route to render `<DailySchedule />` wrapped in `<AppLayout>` instead of `<Dashboard />`

This is a one-line route change plus one import addition. No other files need updating -- the sidebar and dashboard tiles already point to the correct paths.

