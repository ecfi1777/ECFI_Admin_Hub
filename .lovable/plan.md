## Invoices Page — Two Updates

### 1. Include lot number in search
In `src/pages/Invoices.tsx` `filterEntries` (around line 163), extend `matchesSearch` to also match `entry.projects?.lot_number?.toLowerCase().includes(searchLower)`. Update the search input placeholder (line 349) to `"Search builder, location, lot, crew, phase..."`.

### 2. Require invoice # before marking complete
In the checkbox `onCheckedChange` handler (lines 248–250), when the user is checking the box (`checked === true`) and `entry.invoice_number` is empty/null:
- Do NOT call `toggleCompleteMutation`.
- Show a toast: `"Please add an invoice number before marking complete"`.
- Auto-open the inline invoice # editor by calling `handleStartEditInvoice(entry)` so the user can immediately type one.

Unchecking (moving back to pending) remains unchanged.

No other files affected.