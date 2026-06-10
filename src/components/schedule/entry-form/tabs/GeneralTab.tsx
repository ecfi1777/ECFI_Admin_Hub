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
  hideNonCrewFields?: boolean;
  crewOptions?: Array<{ id: string; name: string; is_active: boolean; is_subcontractor?: boolean }>;
}

export function GeneralTab({ formData, updateField, showCrew = true, hideNonCrewFields = false, crewOptions }: GeneralTabProps) {
  const { data: phases = [] } = usePhases();
  const { data: defaultCrews = [] } = useCrews();

  const crews = crewOptions || defaultCrews;
  const selectedCrew = crews.find((c) => c.id === formData.crew_id);
  const isSubCrew = !!(selectedCrew as any)?.is_subcontractor;

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
                    {crew.name}{crew.is_active === false && " (Inactive)"}
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
            disabled={hideNonCrewFields}
          />
        </div>
      </div>

      {isSubCrew && !hideNonCrewFields && (
        <div className="space-y-3 rounded-md border border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sub_will_invoice"
              checked={formData.sub_will_invoice}
              onChange={(e) => updateField("sub_will_invoice", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="sub_will_invoice" className="cursor-pointer text-sm">
              Sub will invoice for this work (creates a Sub Labor vendor bill)
            </Label>
          </div>
          {formData.sub_will_invoice && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sub_invoice_number">Sub Invoice #</Label>
                <Input
                  id="sub_invoice_number"
                  value={formData.sub_invoice_number}
                  onChange={(e) => updateField("sub_invoice_number", e.target.value)}
                  placeholder="Invoice number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub_invoice_amount">Sub Invoice Amount</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="sub_invoice_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sub_invoice_amount}
                    onChange={(e) => updateField("sub_invoice_amount", e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!hideNonCrewFields && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select value={formData.phase_id} onValueChange={(v) => updateField("phase_id", v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">— None —</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.order_status} onValueChange={(v) => updateField("order_status", v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">— None —</SelectItem>
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
        </>
      )}
    </div>
  );
}
