import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Check, X, FileText, AlertTriangle } from "lucide-react";
import { EditEntryDialog } from "./EditEntryDialog";

interface ScheduleEntry {
  id: string;
  project_id: string | null;
  crew_id: string | null;
  phase_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  order_status: string | null;
  notes: string | null;
  supplier_id: string | null;
  ready_mix_invoice_number: string | null;
  ready_mix_invoice_amount: number | null;
  ready_mix_yards_billed: number | null;
  crew_yards_poured: number | null;
  pump_vendor_id: string | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  inspection_type_id: string | null;
  inspector_id: string | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  crews: { name: string } | null;
  phases: { name: string } | null;
  suppliers: { name: string; code: string | null } | null;
  pump_vendors: { name: string; code: string | null } | null;
  inspection_types: { name: string } | null;
  inspectors: { name: string } | null;
  projects: {
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
}

interface ScheduleEntryRowProps {
  entry: ScheduleEntry;
}

export function ScheduleEntryRow({ entry }: ScheduleEntryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [crewYards, setCrewYards] = useState(entry.crew_yards_poured?.toString() || "");
  const [orderStatus, setOrderStatus] = useState(entry.order_status || "");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasDiscrepancy = 
    entry.crew_yards_poured !== null && 
    entry.ready_mix_yards_billed !== null && 
    entry.crew_yards_poured !== entry.ready_mix_yards_billed;

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ScheduleEntry>) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleInvoiceMutation = useMutation({
    mutationFn: async (field: "to_be_invoiced" | "invoice_complete") => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ [field]: !entry[field] })
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
    },
  });

  const handleSaveInline = () => {
    updateMutation.mutate({
      crew_yards_poured: parseFloat(crewYards) || 0,
      order_status: orderStatus || null,
    });
  };

  const handleCancelInline = () => {
    setCrewYards(entry.crew_yards_poured?.toString() || "");
    setOrderStatus(entry.order_status || "");
    setIsEditing(false);
  };

  return (
    <>
      <div className="px-4 py-3 hover:bg-slate-700/50 transition-colors">
        <div className="flex items-center gap-4">
          {/* Time */}
          <div className="w-16 text-slate-400 text-sm">
            {entry.start_time ? entry.start_time.slice(0, 5) : "-"}
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {entry.projects?.builders?.code || entry.projects?.builders?.name || "No Builder"}
              </span>
              <span className="text-slate-400">-</span>
              <span className="text-slate-300 truncate">
                {entry.projects?.locations?.name || "No Location"}
              </span>
              <span className="text-slate-400">-</span>
              <span className="text-amber-500 font-medium">
                {entry.projects?.lot_number || "No Lot"}
              </span>
            </div>
            {entry.notes && (
              <p className="text-slate-500 text-sm truncate mt-0.5">{entry.notes}</p>
            )}
          </div>

          {/* Phase */}
          <Badge variant="outline" className="border-slate-600 text-slate-300 shrink-0">
            {entry.phases?.name || "-"}
          </Badge>

          {/* Order Status */}
          <div className="w-20">
            {isEditing ? (
              <Input
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                placeholder="Set"
                className="h-7 bg-slate-700 border-slate-600 text-white text-sm"
              />
            ) : (
              <span className={`text-sm ${entry.order_status ? "text-green-400" : "text-slate-500"}`}>
                {entry.order_status || "-"}
              </span>
            )}
          </div>

          {/* Supplier */}
          <div className="w-16 text-sm text-slate-400">
            {entry.suppliers?.code || entry.suppliers?.name || "-"}
          </div>

          {/* Crew Yards */}
          <div className="w-20 flex items-center gap-1">
            {isEditing ? (
              <Input
                type="number"
                value={crewYards}
                onChange={(e) => setCrewYards(e.target.value)}
                className="h-7 bg-slate-700 border-slate-600 text-white text-sm"
              />
            ) : (
              <span className={`text-sm font-medium ${hasDiscrepancy ? "text-red-400" : "text-white"}`}>
                {entry.crew_yards_poured || "-"}
              </span>
            )}
            {hasDiscrepancy && !isEditing && (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
          </div>

          {/* Pump */}
          <div className="w-12 text-sm text-slate-400">
            {entry.pump_vendors?.code || "-"}
          </div>

          {/* Inspection */}
          <div className="w-12 text-sm text-slate-400">
            {entry.inspection_types?.name || "-"}
          </div>

          {/* Invoice Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleInvoiceMutation.mutate("to_be_invoiced")}
              className={`p-1 rounded ${
                entry.to_be_invoiced 
                  ? "bg-amber-500/20 text-amber-500" 
                  : "bg-slate-700 text-slate-500"
              }`}
              title="To Be Invoiced"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleInvoiceMutation.mutate("invoice_complete")}
              className={`p-1 rounded ${
                entry.invoice_complete 
                  ? "bg-green-500/20 text-green-500" 
                  : "bg-slate-700 text-slate-500"
              }`}
              title="Invoice Complete"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveInline}
                  className="h-7 w-7 text-green-500 hover:text-green-400"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelInline}
                  className="h-7 w-7 text-red-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-7 w-7 text-slate-400 hover:text-white"
                  title="Quick edit yards & order"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="h-7 w-7 text-slate-400 hover:text-white"
                  title="Full edit"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <EditEntryDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        entry={entry}
      />
    </>
  );
}
