import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SiteNotesProps {
  value: string;
  canManage: boolean;
  onSave: (notes: string) => void;
}

export function SiteNotes({ value, canManage, onSave }: SiteNotesProps) {
  const [notes, setNotes] = useState(value);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotes(value);
  }, [value]);

  const debouncedSave = useCallback(
    (next: string) => {
      const timeout = setTimeout(() => {
        onSave(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }, 1000);
      return () => clearTimeout(timeout);
    },
    [onSave]
  );

  useEffect(() => {
    if (!canManage) return;
    const cleanup = debouncedSave(notes);
    return cleanup;
  }, [notes, canManage, debouncedSave]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="site-notes" className="text-sm font-semibold">
          Site Notes — This Week
        </Label>
        {canManage && (
          <span
            className="text-xs text-muted-foreground transition-opacity"
            style={{ opacity: saved ? 1 : 0 }}
          >
            Saved
          </span>
        )}
      </div>
      <Textarea
        id="site-notes"
        value={notes}
        readOnly={!canManage}
        placeholder={canManage ? "Add notes for this week..." : "No notes for this week"}
        className="min-h-[80px] resize-y bg-background"
        onChange={(e) => canManage && setNotes(e.target.value)}
      />
    </div>
  );
}
