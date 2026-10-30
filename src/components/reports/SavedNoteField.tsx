import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SavedNoteField({
  value, onSave, onDelete, placeholder, rows = 3,
}: {
  value: string | null | undefined;
  onSave: (text: string) => void;
  onDelete: () => void;
  placeholder?: string;
  rows?: number;
}) {
  const current = value?.trim() ? value : "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startEdit = () => { setDraft(current); setEditing(true); };

  if (editing) {
    return (
      <div className="space-y-1">
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="px-2 py-1.5 text-xs resize-y bg-background"
        />
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
          <Button
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={!draft.trim() || draft === current}
            onClick={() => { onSave(draft.trim()); setEditing(false); }}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-left text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
      >
        + Add note
      </button>
    );
  }

  return (
    <div className="flex items-start gap-1.5">
      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded-md border border-input bg-background px-2 py-1.5 text-xs">
        {current}
      </p>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={startEdit}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => setConfirmOpen(true)}>Delete</Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
