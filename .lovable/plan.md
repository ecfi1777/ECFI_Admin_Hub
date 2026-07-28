## Goal

When saving a Daily Schedule entry, warn if a concrete, pump, inspection, or sub invoice number already exists on another entry — matching the "Duplicate Bill Number" warning on the Vendor Bills page. Advisory only: "Add Anyway" always saves.

## Files

Only these four:
- CREATE `src/hooks/useDuplicateInvoiceCheck.ts`
- CREATE `src/components/schedule/DuplicateInvoiceDialog.tsx`
- EDIT `src/components/schedule/AddEntryDialog.tsx`
- EDIT `src/components/schedule/EditEntryDialog.tsx`

No other files, no migrations, no schema changes.

## 1. Duplicate check helper

`useDuplicateInvoiceCheck.ts` exports:

```ts
export type InvoiceConflict = { label: string; value: string };
```

and an async `checkDuplicateInvoiceNumbers(organizationId, excludeEntryId, values)` where `values` is `{ concrete?, pump?, inspection?, sub? }`.

Column mapping: concrete → `ready_mix_invoice_number`, pump → `pump_invoice_number`, inspection → `inspection_invoice_number`, sub → `sub_invoice_number`. (All four columns confirmed present on `schedule_entries`, along with the `deleted` boolean.)

Behavior:
- Return `[]` immediately when `organizationId` is falsy.
- Trim each value; skip empty ones (blank numbers are never flagged).
- Per non-empty field: `schedule_entries.select("id").eq("organization_id", …).eq("deleted", false).filter(<column>, "eq", trimmed).limit(1)`, plus `.neq("id", excludeEntryId)` when editing.
- All queries run in parallel via `Promise.all`; any error is thrown for the caller to surface.
- Returns conflicts in fixed order: concrete, pump, inspection, sub.

## 2. DuplicateInvoiceDialog

Presentational shadcn `AlertDialog`. Props: `open`, `onOpenChange`, `conflicts`, `onConfirm`.

- Title: `Duplicate Bill Number`
- One conflict: `A {label} bill with invoice number "{value}" already exists. Do you want to continue?`
- Multiple: `The following invoice numbers already exist. Do you want to continue?` followed by one line per conflict in the same sentence form.
- Footer: `Cancel` (AlertDialogCancel) and `Add Anyway` (AlertDialogAction → `onConfirm`).

Wording and labels match the Vendor Bills dialog exactly.

## 3. AddEntryDialog

- Add `conflicts` and `showDuplicateDialog` state; clear both in the existing open/close reset effect.
- `createMutation` is left untouched — the check does not go in `mutationFn`.
- `handleSubmit` becomes async: existing date/crew/reason guards run first; if `did_not_work`, skip the check and mutate as today. Otherwise `await checkDuplicateInvoiceNumbers(organizationId, null, {…four formData values})`. Non-empty → set conflicts, open the warning, return without saving (entry dialog stays open, form intact). Empty → mutate. `try/catch` surfaces errors via `toast.error(getUserFriendlyError(error))` and blocks the save.
- Render `<DuplicateInvoiceDialog />`; `onConfirm` closes it then calls `createMutation.mutate()` (never re-runs the check).

## 4. EditEntryDialog

- Add `useOrganization` import and `organizationId` (not currently imported here).
- Same two state values, cleared on close.
- `updateMutation` / `deleteMutation` unchanged.
- `handleSave` becomes async, preserving the existing early returns in order: the `did_not_work` + empty-reason toast guard; the "not did_not_work and no project_id" path that calls `deleteMutation.mutate()` with no duplicate check; and the `did_not_work` path that mutates without checking. Only the normal save path runs the check, with `excludeEntryId: entry.id` so an entry never matches itself.
- `<DuplicateInvoiceDialog />` with `onConfirm` closing it and calling `updateMutation.mutate()`.

## Constraints

- Stone is out of scope — no check on `stone_invoice_number` or `schedule_entry_stone_lines`.
- Exact match on the trimmed string; no case-insensitive or fuzzy matching.
- Soft-deleted entries (`deleted = true`) never trigger a warning.
- No DB constraint or index added; no existing toast, label, or validation rule changed.

## Verification

Add and Edit flows for each of the four types (dialog names the right type, Cancel keeps the form and saves nothing, "Add Anyway" saves), multi-conflict single dialog, unchanged-number edit produces no warning, blank fields and "did not work" entries save silently, soft-deleted matches ignored, Vendor Bills warning unchanged, no TypeScript or console errors.
