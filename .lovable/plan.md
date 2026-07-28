## Goal
Let the Completed invoices tab show more than 100 records by adding pagination, while still allowing the user to view the full list if they choose.

## Current state
- `src/pages/Invoices.tsx` loads completed invoices with `.limit(100)` and no pagination.
- Once a user exceeds 100 completed invoices, older records are hidden with no way to reach them.
- Pending invoices are not capped, so this issue only affects the Completed tab.

## Proposed changes
1. **Remove the hard 100-record cap** on the Completed query (or make it optional via "All").
2. **Add client-side pagination state** for the Completed tab only:
   - `completedPage` (number)
   - `completedPageSize` (50 | 100 | "all")
3. **Add a page-size selector** above the Completed table with options: 50, 100, All. Default to 100 to preserve today's behavior.
4. **Add pagination controls** (Previous / Next / page info) below the Completed table.
5. **Apply filters first, then paginate**, so search and filter still operate across the entire result set.
6. **Leave export unchanged** — it already exports the filtered full set, which is the expected behavior.
7. **Leave Pending tab unchanged** — its volume is naturally limited.

## Files affected
- `src/pages/Invoices.tsx` — pagination state, query change, page-size selector, pagination controls.

## Outcome
Users can scroll through completed invoices 50 or 100 at a time, or switch to "All" to see every completed invoice at once without losing access to older records.