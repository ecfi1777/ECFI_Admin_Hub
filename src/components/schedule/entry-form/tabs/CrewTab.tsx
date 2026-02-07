/**
 * Crew tab for entry form - Crew assignment, Yards Poured, Notes
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrewsAll } from "@/hooks/useReferenceData";
import type { EntryFormValues } from "../types";

interface CrewTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  /** Pass to include inactive crew if currently assigned */
  currentCrewId?: string;
}

export function CrewTab({ formData, updateField, currentCrewId }: CrewTabProps) {
  const { data: crews = [] } = useCrewsAll();
  
  // Filter to show active crews + the currently-assigned crew (even if inactive)
  const crewOptions = crews.filter(
    (c) => c.is_active || c.id === currentCrewId
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Crew</Label>
        <Select 
          value={formData.crew_id} 
          onValueChange={(v) => updateField("crew_id", v === "none" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select crew" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {crewOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.is_active === false && " (Inactive)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Crew Yards Poured</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.crew_yards_poured}
          onChange={(e) => updateField("crew_yards_poured", e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="space-y-2">
        <Label>Crew Notes</Label>
        <Textarea
          value={formData.crew_notes}
          onChange={(e) => updateField("crew_notes", e.target.value)}
          placeholder="Notes related to crew work on this entry..."
          rows={4}
        />
      </div>
    </div>
  );
}
