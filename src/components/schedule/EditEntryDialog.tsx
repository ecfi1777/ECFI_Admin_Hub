import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";

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
}

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ScheduleEntry;
}

export function EditEntryDialog({ open, onOpenChange, entry }: EditEntryDialogProps) {
  const [crewId, setCrewId] = useState(entry.crew_id || "");
  const [projectId, setProjectId] = useState(entry.project_id || "");
  const [phaseId, setPhaseId] = useState(entry.phase_id || "");
  const [startTime, setStartTime] = useState(entry.start_time || "");
  const [orderStatus, setOrderStatus] = useState(entry.order_status || "");
  const [notes, setNotes] = useState(entry.notes || "");
  const [supplierId, setSupplierId] = useState(entry.supplier_id || "");
  const [readyMixInvoiceNumber, setReadyMixInvoiceNumber] = useState(entry.ready_mix_invoice_number || "");
  const [readyMixInvoiceAmount, setReadyMixInvoiceAmount] = useState(entry.ready_mix_invoice_amount?.toString() || "");
  const [readyMixYardsBilled, setReadyMixYardsBilled] = useState(entry.ready_mix_yards_billed?.toString() || "");
  const [crewYardsPoured, setCrewYardsPoured] = useState(entry.crew_yards_poured?.toString() || "");
  const [pumpVendorId, setPumpVendorId] = useState(entry.pump_vendor_id || "");
  const [pumpInvoiceNumber, setPumpInvoiceNumber] = useState(entry.pump_invoice_number || "");
  const [pumpInvoiceAmount, setPumpInvoiceAmount] = useState(entry.pump_invoice_amount?.toString() || "");
  const [inspectionTypeId, setInspectionTypeId] = useState(entry.inspection_type_id || "");
  const [inspectorId, setInspectorId] = useState(entry.inspector_id || "");
  const [inspectionInvoiceNumber, setInspectionInvoiceNumber] = useState(entry.inspection_invoice_number || "");
  const [inspectionAmount, setInspectionAmount] = useState(entry.inspection_amount?.toString() || "");
  const [toBeInvoiced, setToBeInvoiced] = useState(entry.to_be_invoiced);
  const [invoiceComplete, setInvoiceComplete] = useState(entry.invoice_complete);
  const [invoiceNumber, setInvoiceNumber] = useState(entry.invoice_number || "");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setCrewId(entry.crew_id || "");
    setProjectId(entry.project_id || "");
    setPhaseId(entry.phase_id || "");
    setStartTime(entry.start_time || "");
    setOrderStatus(entry.order_status || "");
    setNotes(entry.notes || "");
    setSupplierId(entry.supplier_id || "");
    setReadyMixInvoiceNumber(entry.ready_mix_invoice_number || "");
    setReadyMixInvoiceAmount(entry.ready_mix_invoice_amount?.toString() || "");
    setReadyMixYardsBilled(entry.ready_mix_yards_billed?.toString() || "");
    setCrewYardsPoured(entry.crew_yards_poured?.toString() || "");
    setPumpVendorId(entry.pump_vendor_id || "");
    setPumpInvoiceNumber(entry.pump_invoice_number || "");
    setPumpInvoiceAmount(entry.pump_invoice_amount?.toString() || "");
    setInspectionTypeId(entry.inspection_type_id || "");
    setInspectorId(entry.inspector_id || "");
    setInspectionInvoiceNumber(entry.inspection_invoice_number || "");
    setInspectionAmount(entry.inspection_amount?.toString() || "");
    setToBeInvoiced(entry.to_be_invoiced);
    setInvoiceComplete(entry.invoice_complete);
    setInvoiceNumber(entry.invoice_number || "");
  }, [entry]);

  const { data: crews = [] } = useQuery({
    queryKey: ["crews-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crews").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, lot_number, builders(name, code), locations(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("phases").select("id, name").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: pumpVendors = [] } = useQuery({
    queryKey: ["pump-vendors-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pump_vendors").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: inspectionTypes = [] } = useQuery({
    queryKey: ["inspection-types-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspection_types").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: inspectors = [] } = useQuery({
    queryKey: ["inspectors-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspectors").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_entries").update({
        crew_id: crewId || null,
        project_id: projectId || null,
        phase_id: phaseId || null,
        start_time: startTime || null,
        order_status: orderStatus || null,
        notes: notes || null,
        supplier_id: supplierId || null,
        ready_mix_invoice_number: readyMixInvoiceNumber || null,
        ready_mix_invoice_amount: parseFloat(readyMixInvoiceAmount) || 0,
        ready_mix_yards_billed: parseFloat(readyMixYardsBilled) || 0,
        crew_yards_poured: parseFloat(crewYardsPoured) || 0,
        pump_vendor_id: pumpVendorId || null,
        pump_invoice_number: pumpInvoiceNumber || null,
        pump_invoice_amount: parseFloat(pumpInvoiceAmount) || 0,
        inspection_type_id: inspectionTypeId || null,
        inspector_id: inspectorId || null,
        inspection_invoice_number: inspectionInvoiceNumber || null,
        inspection_amount: parseFloat(inspectionAmount) || 0,
        to_be_invoiced: toBeInvoiced,
        invoice_complete: invoiceComplete,
        invoice_number: invoiceNumber || null,
      }).eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      toast({ title: "Entry updated" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_entries").update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      }).eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      toast({ title: "Entry deleted" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Schedule Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="bg-slate-700 w-full">
              <TabsTrigger value="basic" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Basic</TabsTrigger>
              <TabsTrigger value="concrete" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Concrete</TabsTrigger>
              <TabsTrigger value="pump" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Pump</TabsTrigger>
              <TabsTrigger value="inspection" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Inspection</TabsTrigger>
              <TabsTrigger value="invoice" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Invoice</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Crew</Label>
                  <Select value={crewId} onValueChange={setCrewId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select crew" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {crews.map((crew) => (
                        <SelectItem key={crew.id} value={crew.id} className="text-white">{crew.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 max-h-60">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-white">
                        {project.builders?.code || project.builders?.name} - {project.locations?.name} - {project.lot_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Phase</Label>
                  <Select value={phaseId} onValueChange={setPhaseId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {phases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id} className="text-white">{phase.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Order Status</Label>
                  <Input value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} placeholder="Set, Order #, etc." className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </TabsContent>

            <TabsContent value="concrete" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice #</Label>
                  <Input value={readyMixInvoiceNumber} onChange={(e) => setReadyMixInvoiceNumber(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice $</Label>
                  <Input type="number" step="0.01" value={readyMixInvoiceAmount} onChange={(e) => setReadyMixInvoiceAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Yards Billed</Label>
                  <Input type="number" step="0.1" value={readyMixYardsBilled} onChange={(e) => setReadyMixYardsBilled(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Crew Yards Poured</Label>
                <Input type="number" step="0.1" value={crewYardsPoured} onChange={(e) => setCrewYardsPoured(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </TabsContent>

            <TabsContent value="pump" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Pump Vendor</Label>
                <Select value={pumpVendorId} onValueChange={setPumpVendorId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select pump vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {pumpVendors.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice #</Label>
                  <Input value={pumpInvoiceNumber} onChange={(e) => setPumpInvoiceNumber(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice $</Label>
                  <Input type="number" step="0.01" value={pumpInvoiceAmount} onChange={(e) => setPumpInvoiceAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inspection" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Inspection Type</Label>
                  <Select value={inspectionTypeId} onValueChange={setInspectionTypeId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {inspectionTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-white">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Inspector</Label>
                  <Select value={inspectorId} onValueChange={setInspectorId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {inspectors.map((i) => (
                        <SelectItem key={i.id} value={i.id} className="text-white">{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice #</Label>
                  <Input value={inspectionInvoiceNumber} onChange={(e) => setInspectionInvoiceNumber(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice $</Label>
                  <Input type="number" step="0.01" value={inspectionAmount} onChange={(e) => setInspectionAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="invoice" className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="toBeInvoiced" checked={toBeInvoiced} onCheckedChange={(c) => setToBeInvoiced(!!c)} />
                  <Label htmlFor="toBeInvoiced" className="text-slate-300">To Be Invoiced</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="invoiceComplete" checked={invoiceComplete} onCheckedChange={(c) => setInvoiceComplete(!!c)} />
                  <Label htmlFor="invoiceComplete" className="text-slate-300">Invoice Complete</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Enter invoice number" className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
