## Problem

The Daily Schedule shows the DRB / Westridge / 87-94V entry as **Cancelled — moved to Mar 18**, but its original row still appears in **Vendor Bills**. Cancelled jobs shouldn't need vendor data — the rescheduled copy on the new date is the one that should be billed.

The `vendor-invoice-entries` query in `src/pages/VendorInvoices.tsx` filters by `deleted = false` and `did_not_work = false`, but does **not** filter out `is_cancelled = true` entries. That's why the cancelled row still appears.

## Fix

**File: `src/pages/VendorInvoices.tsx`**

In the supabase query (around line 91-94), add one more filter:

```ts
.eq("is_cancelled", false)
```

That's the only change. Cancelled entries will disappear from both the Active and All views of Vendor Bills. The rescheduled copy on the new date remains unaffected and will show up normally once it's on or past its scheduled date.

## Out of scope

- No changes to the cancel workflow itself.
- No changes to schedule, calendar, or financial views.
- No DB schema changes.
