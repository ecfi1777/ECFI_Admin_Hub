

## Green Checkbox for Completed Invoices in "Need to Inv." Column

### Summary
Update the "Need to Inv." cell in `ScheduleTable.tsx` to show a disabled green checkbox when `invoice_complete` is true, otherwise show the existing togglable checkbox.

### Changes — `src/components/schedule/ScheduleTable.tsx`

**Lines 835-840**: Replace the single `<Checkbox>` with a conditional:

```tsx
{entry.invoice_complete ? (
  <Checkbox
    checked={true}
    disabled={true}
    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
  />
) : (
  <Checkbox
    checked={entry.to_be_invoiced}
    onCheckedChange={() => handleCheckboxChange(entry.id, entry.to_be_invoiced)}
    className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
  />
)}
```

The wrapping `<div>` and `<TableCell>` remain unchanged. No other files or columns affected.

