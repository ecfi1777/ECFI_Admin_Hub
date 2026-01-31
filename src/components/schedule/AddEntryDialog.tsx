import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCrewId?: string | null;
  defaultDate: string;
}

export function AddEntryDialog({ open, onOpenChange, defaultCrewId, defaultDate }: AddEntryDialogProps) {
  const [crewId, setCrewId] = useState(defaultCrewId || "");
  const [projectId, setProjectId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [readyMixInvoiceNumber, setReadyMixInvoiceNumber] = useState("");
  const [readyMixInvoiceAmount, setReadyMixInvoiceAmount] = useState("");
  const [readyMixYardsBilled, setReadyMixYardsBilled] = useState("");
  const [crewYardsPoured, setCrewYardsPoured] = useState("");
  const [pumpVendorId, setPumpVendorId] = useState("");
  const [pumpInvoiceNumber, setPumpInvoiceNumber] = useState("");
  const [pumpInvoiceAmount, setPumpInvoiceAmount] = useState("");
  const [inspectionTypeId, setInspectionTypeId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [inspectionInvoiceNumber, setInspectionInvoiceNumber] = useState("");
  const [inspectionAmount, setInspectionAmount] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (defaultCrewId) setCrewId(defaultCrewId);
  }, [defaultCrewId]);

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_entries").insert({
        scheduled_date: defaultDate,
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      toast({ title: "Entry created" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setProjectId("");
    setPhaseId("");
    setStartTime("");
    setOrderStatus("");
    setNotes("");
    setSupplierId("");
    setReadyMixInvoiceNumber("");
    setReadyMixInvoiceAmount("");
    setReadyMixYardsBilled("");
    setCrewYardsPoured("");
    setPumpVendorId("");
    setPumpInvoiceNumber("");
    setPumpInvoiceAmount("");
    setInspectionTypeId("");
    setInspectorId("");
    setInspectionInvoiceNumber("");
    setInspectionAmount("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Add Schedule Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="bg-slate-700 w-full">
              <TabsTrigger value="basic" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                Basic
              </TabsTrigger>
              <TabsTrigger value="concrete" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                Concrete
              </TabsTrigger>
              <TabsTrigger value="pump" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                Pump
              </TabsTrigger>
              <TabsTrigger value="inspection" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                Inspection
              </TabsTrigger>
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
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
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
                  <Input
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    placeholder="Set, Order #, etc."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
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
                  <Input
                    value={readyMixInvoiceNumber}
                    onChange={(e) => setReadyMixInvoiceNumber(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={readyMixInvoiceAmount}
                    onChange={(e) => setReadyMixInvoiceAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Yards Billed</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={readyMixYardsBilled}
                    onChange={(e) => setReadyMixYardsBilled(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Crew Yards Poured</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={crewYardsPoured}
                  onChange={(e) => setCrewYardsPoured(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
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
                  <Input
                    value={pumpInvoiceNumber}
                    onChange={(e) => setPumpInvoiceNumber(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pumpInvoiceAmount}
                    onChange={(e) => setPumpInvoiceAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
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
                  <Input
                    value={inspectionInvoiceNumber}
                    onChange={(e) => setInspectionInvoiceNumber(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Invoice $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inspectionAmount}
                    onChange={(e) => setInspectionAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
