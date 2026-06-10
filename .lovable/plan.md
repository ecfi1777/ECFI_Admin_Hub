## Goal

When the "Sub will invoice for this work" checkbox is checked in the Edit/Add Entry dialog (General tab), let the user enter the sub contractor's invoice number and amount right there — instead of having to go to the Vendor Invoices page.

## Changes

1. **`src/components/schedule/entry-form/types.ts`** — Add two fields to `EntryFormValues`:
   - `sub_invoice_number: string`
   - `sub_invoice_amount: string`
   Add empty-string defaults in `DEFAULT_ENTRY_FORM_VALUES`.

2. **`src/components/schedule/entry-form/useEntryForm.ts`**
   - `loadFromEntry`: populate `sub_invoice_number` and `sub_invoice_amount` from the entry.
   - `getInsertPayload`: include `sub_invoice_number` (null if empty) and `sub_invoice_amount` (parsed float or null).

3. **`src/components/schedule/entry-form/tabs/GeneralTab.tsx`**
   - Directly below the existing "Sub will invoice…" checkbox, when `sub_will_invoice` is true, render a two-column row:
     - **Sub Invoice #** (text input)
     - **Sub Invoice Amount** (number input with `$` prefix, matching the vendor bill pattern noted in project memory)
   - Fields are optional (user can save without filling, just like the Vendor Invoices page allows).

## Notes
- No DB migration needed — columns `sub_invoice_number` and `sub_invoice_amount` already exist on the entries table.
- The Vendor Invoices "Sub Labor" row will automatically reflect the values entered here.
- No changes to P&L logic; it already reads `sub_invoice_amount` when `sub_will_invoice` is true.
