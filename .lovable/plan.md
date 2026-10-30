# Save / Edit / Delete for payroll notes (items 3 and 6)

## What changes

The item 3 notes (deductions and changes) and the item 6 payment note will stop saving automatically while you type. Each one works like this instead:

- **No note yet:** you see an "Add note" button. Clicking it opens a text box with **Save** and **Cancel** buttons.
- **Note saved:** the note shows as plain text with **Edit** and **Delete** buttons next to it.
- **Edit:** opens the text box filled with the current note, again with Save and Cancel. Cancel drops your changes.
- **Delete:** asks "Delete this note? This can't be undone." before removing it.
- If you close or move away with unsaved text in the box, nothing is saved.

The **Balance notes** pop-up uses the same pattern for each month's payment note: Edit and Delete buttons on each row, Save and Cancel while editing, and the same delete warning.

Each field still holds one note per crew per month, as it does now.

## Technical notes

- New `src/components/reports/SavedNoteField.tsx`: view/edit states, Textarea, Save/Cancel/Edit/Delete buttons, and an `AlertDialog` confirmation for delete. Props: `value`, `onSave(text)`, `onDelete()`, `placeholder`, `rows`.
- `PayrollReconciliationBlock.tsx`: replace the item 3 Textarea and the item 6 input (and their autosave `onBlur` logic) with `SavedNoteField`. Delete sets `adjustment_notes` / `payment_notes` to null.
- `BalanceNotesDialog.tsx`: replace `NoteCell` with `SavedNoteField`. Delete calls `onSaveNote(month, year, "")`, which stores null.
- No database changes.
