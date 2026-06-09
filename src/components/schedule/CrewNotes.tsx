import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { FileText } from "lucide-react";

interface CrewNotesProps {
  crewId: string;
  dateStr: string;
  canManage: boolean;
}

export function CrewNotes({ crewId, dateStr, canManage }: CrewNotesProps) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const queryKey = ["crew-daily-notes", organizationId, crewId, dateStr];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from("crew_daily_notes")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("crew_id", crewId)
        .eq("note_date", dateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    setValue(data?.notes || "");
    setEditing(false);
  }, [data]);

  const save = useMutation({
    mutationFn: async (notes: string) => {
      if (!organizationId) throw new Error("No organization");
      if (data) {
        const { error } = await supabase
          .from("crew_daily_notes")
          .update({ notes, updated_at: new Date().toISOString() })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("crew_daily_notes")
          .insert({ organization_id: organizationId, crew_id: crewId, note_date: dateStr, notes });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Crew note saved");
      setEditing(false);
    },
    onError: (e) => {
      toast.error("Failed to save note");
      console.error(e);
    },
  });

  const hasNote = !!(data?.notes && data.notes.trim());

  if (!editing && !hasNote && !canManage) return null;

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          {editing ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Add a note for this crew..."
              className="min-h-[60px] bg-background text-sm"
              autoFocus
            />
          ) : (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
              {hasNote ? data!.notes : "No crew note for this day."}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setValue(data?.notes || "");
                    setEditing(false);
                  }}
                  className="text-muted-foreground hover:text-foreground h-7"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => save.mutate(value)}
                  disabled={save.isPending}
                  className="bg-amber-500 text-black hover:bg-amber-600 h-7"
                >
                  {save.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground h-7"
              >
                {hasNote ? "Edit" : "Add Note"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
