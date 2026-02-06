/**
 * General tab for entry form - Phase, Time, Status, Notes
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
import { usePhases, useCrews } from "@/hooks/useReferenceData";
import type { EntryFormValues } from "../types";

interface GeneralTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  showCrew?: boolean;
  crewOptions?: Array<{ id: string; name: string; is_active: boolean }>;
}

export function GeneralTab({ formData, updateField, showCrew = true, crewOptions }: GeneralTabProps) {
  const { data: phases = [] } = usePhases();
  const { data: defaultCrews = [] } = useCrews();
  
  const crews = crewOptions || defaultCrews;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {showCrew && (
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
                {crews.map((crew) => (
                  <SelectItem key={crew.id} value={crew.id}>
                    {crew.name}{!crew.is_active && " (Inactive)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Start Time</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => updateField("start_time", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phase</Label>
          <Select value={formData.phase_id} onValueChange={(v) => updateField("phase_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select phase" />
            </SelectTrigger>
            <SelectContent>
              {phases.map((phase) => (
                <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.order_status} onValueChange={(v) => updateField("order_status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sure Go">Sure Go</SelectItem>
              <SelectItem value="Will Call">Will Call</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Add notes..."
          rows={3}
        />
      </div>
    </div>
  );
}
