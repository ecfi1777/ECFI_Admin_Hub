

## Fix: Match Edit Entry Dialog Size and Enable Tab Scrolling on Mobile

### What I see in your screenshots

From your mobile phone on the Calendar page:
- **Add Schedule Entry** dialog fills the full width of the screen and all 4 tabs fit nicely
- **Edit Entry** dialog appears slightly narrower and the last 2 tabs (Invoicing, Crew) are cut off with no way to reach them

### Root Causes

1. The Edit Entry dialog has extra `px-3 sm:px-6` padding that the Add Entry dialog does not -- this eats into usable width on mobile
2. The Edit Entry tabs lack `flex-shrink-0` on each tab trigger, so tabs compress instead of scrolling
3. The tabs list is missing `justify-start` so tabs try to center/compress rather than overflow and scroll

### Changes

**File: `src/components/schedule/EditEntryDialog.tsx`**

1. Remove the extra `px-3 sm:px-6` from `DialogContent` so it matches the Add Entry dialog exactly
2. Add `justify-start` to the `TabsList` class
3. Add `flex-shrink-0` to each of the 6 `TabsTrigger` components so they maintain their size and allow horizontal scrolling

The DialogContent line changes from:
```
className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-2xl max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg px-3 sm:px-6"
```
to:
```
className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-2xl max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg"
```

The TabsList changes from:
```
<TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1 pb-1">
  <TabsTrigger value="general">General</TabsTrigger>
  ...
```
to:
```
<TabsList className="w-full overflow-x-auto flex flex-nowrap justify-start gap-1 pb-1">
  <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
  <TabsTrigger value="concrete" className="flex-shrink-0">Concrete</TabsTrigger>
  <TabsTrigger value="pump" className="flex-shrink-0">Pump</TabsTrigger>
  <TabsTrigger value="inspection" className="flex-shrink-0">Inspection</TabsTrigger>
  <TabsTrigger value="invoicing" className="flex-shrink-0">Invoicing</TabsTrigger>
  <TabsTrigger value="crew" className="flex-shrink-0">Crew</TabsTrigger>
```

Only one file is modified. No new dependencies needed.
