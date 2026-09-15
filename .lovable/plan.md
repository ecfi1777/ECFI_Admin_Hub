# Show subcontractor invoice info in Schedule History

## Why it's missing

The Schedule History tab on a project never loads or shows the subcontractor invoice fields. It only shows Concrete, Stone, Pump, Inspection, Crew, and Invoicing details.

What you see on the Basement & Garage Slab entries ("inv # 713" under Crew) is not the subcontractor invoice — that is free text someone typed into the crew note box. So the Exterior Flatwork and Driveways entries, where the sub invoice number and amount were entered properly in the entry screen, show nothing.

## The fix

Add a "Sub Labor" detail card to each entry in Schedule History, shown whenever the entry is marked "Sub will invoice for this work":

- Heading: Sub Labor
- Sub invoice number (e.g. Inv: 767)
- Sub invoice amount in green (e.g. $1,064.00), matching how the other cards show money
- Both the number and amount are hidden from viewer-role users, same as the other cost figures on this tab

Card position: after Inspection and before Crew, so costs stay grouped together.

## Technical notes

- `src/components/projects/ProjectScheduleHistory.tsx`: add `sub_will_invoice`, `sub_invoice_number`, `sub_invoice_amount` to the `schedule_entries` select and to the local `ScheduleEntry` interface.
- Render a new card block guarded by `entry.sub_will_invoice && (sub_invoice_number || sub_invoice_amount)`, reusing the existing `bg-muted rounded p-2` card markup, `formatCurrency`, and the `!readOnly` guard used by the Pump/Inspection cards.
- No database or schema changes; the data already exists on `schedule_entries`.
