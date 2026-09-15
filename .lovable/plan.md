# Show subcontractor invoice info in Schedule History

## Why it's missing

The Schedule History tab on a project never loads or shows the subcontractor invoice fields. It only shows Concrete, Stone, Pump, Inspection, Crew, and Invoicing details.

What you see on the Basement & Garage Slab entries ("inv # 713" under Crew) is not the subcontractor invoice. Verified against those two entries in the database: their sub-invoice fields are empty, and the text sits in the crew notes field — typed by hand on the Crew tab (one reads "inv # 713", the other "Inv # 713", different capitalization). Nothing in the app generates that note; it is free text.

Meanwhile Exterior Flatwork (inv 767, $1,064) and Driveways (inv 786, $2,391) do have real sub-invoice data saved, and the Schedule History tab simply never loads or displays those fields — so they show nothing.

## The fix

Add a "Sub Labor" detail card to each entry in Schedule History, shown whenever the entry is marked "Sub will invoice for this work":

- Heading: Sub Labor
- Sub invoice number (e.g. Inv: 767)
- Sub invoice amount in green (e.g. $1,064.00), matching how the other cards show money
- Both the number and amount are hidden from viewer-role users, same as the other cost figures on this tab

Card position: after Inspection and before Crew, so costs stay grouped together.

## Second fix: the two different Edit screens

Clicking Edit on the Schedule History tab opens a smaller "Edit Vendor Details" box with only Concrete, Pump, Inspection and Crew. The pencil on the Daily Schedule opens the full entry editor with General, Concrete, Pump, Inspection, Invoicing and Crew. That's why the sub invoice fields can't be seen or corrected from the project page.

Fix: add the same "Sub will invoice for this work" block (checkbox, Sub Invoice #, Sub Invoice Amount) to the Schedule History edit box, so both screens can record the same information.

## Technical notes

- `src/components/projects/ProjectScheduleHistory.tsx`: add `sub_will_invoice`, `sub_invoice_number`, `sub_invoice_amount` to the `schedule_entries` select and to the local `ScheduleEntry` interface.
- Render a new card block guarded by `entry.sub_will_invoice && (sub_invoice_number || sub_invoice_amount)`, reusing the existing `bg-muted rounded p-2` card markup, `formatCurrency`, and the `!readOnly` guard used by the Pump/Inspection cards.
- No database or schema changes; the data already exists on `schedule_entries`.
