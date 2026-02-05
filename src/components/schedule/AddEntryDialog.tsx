import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";
import { Search } from "lucide-react";
import {
  useCrews,
  useProjects,
  usePhases,
  useSuppliers,
  usePumpVendors,
  useInspectionTypes,
  useInspectors,
} from "@/hooks/useReferenceData";

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCrewId?: string | null;
  defaultDate: string;
}

export function AddEntryDialog({ open, onOpenChange, defaultCrewId, defaultDate }: AddEntryDialogProps) {
  const [crewId, setCrewId] = useState(defaultCrewId || "");
  const [projectId, setProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [qtyOrdered, setQtyOrdered] = useState("");
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

  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  useEffect(() => {
    if (defaultCrewId) setCrewId(defaultCrewId);
  }, [defaultCrewId]);

  // Use shared reference data hooks
  const { data: crews = [] } = useCrews();
  const { data: projects = [] } = useProjects();
  const { data: phases = [] } = usePhases();
  const { data: suppliers = [] } = useSuppliers();
  const { data: pumpVendors = [] } = usePumpVendors();
  const { data: inspectionTypes = [] } = useInspectionTypes();
  const { data: inspectors = [] } = useInspectors();

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    
    const searchLower = projectSearch.toLowerCase();
    return projects.filter((project) => {
      const builderName = project.builders?.name?.toLowerCase() || "";
      const builderCode = project.builders?.code?.toLowerCase() || "";
      const location = project.locations?.name?.toLowerCase() || "";
      const lot = project.lot_number?.toLowerCase() || "";
      
      return (
        builderName.includes(searchLower) ||
        builderCode.includes(searchLower) ||
        location.includes(searchLower) ||
        lot.includes(searchLower)
      );
    });
  }, [projects, projectSearch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization found");
      const { error } = await supabase.from("schedule_entries").insert({
        organization_id: organizationId,
        scheduled_date: defaultDate,
        crew_id: crewId || null,
        project_id: projectId || null,
        phase_id: phaseId || null,
        start_time: startTime || null,
        order_status: orderStatus || null,
        notes: notes || null,
        supplier_id: supplierId || null,
        order_number: orderNumber || null,
        qty_ordered: qtyOrdered || null,
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
      toast.success("Entry created");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setProjectId("");
    setProjectSearch("");
    setPhaseId("");
    setStartTime("");
    setOrderStatus("");
    setNotes("");
    setSupplierId("");
    setOrderNumber("");
    setQtyOrdered("");
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
    if (!projectId) {
      toast.error("Please select a project before adding an entry");
      return;
    }
    createMutation.mutate();
  };

  const handleProjectSelect = (id: string) => {
    setProjectId(id);
    // Clear search after selection to show the selected project clearly
    setProjectSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Schedule Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="bg-muted w-full">
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
                  <Label className="text-muted-foreground">Crew</Label>
                  <Select value={crewId} onValueChange={setCrewId}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select crew" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {crews.map((crew) => (
                        <SelectItem key={crew.id} value={crew.id} className="text-foreground">{crew.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Project <span className="text-red-400">*</span></Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={projectSearch}
                      onChange={(e) => {
                        setProjectSearch(e.target.value);
                        // Clear selection when user starts typing again
                        if (projectId) setProjectId("");
                      }}
                      placeholder="Search by builder, location, or lot..."
                      className="bg-muted border-border text-foreground pl-9"
                    />
                  </div>
                  {/* Show search results as clickable list */}
                  {projectSearch.trim() && filteredProjects.length > 0 && !projectId && (
                    <div className="bg-muted border border-border rounded-md max-h-48 overflow-y-auto">
                      {filteredProjects.slice(0, 10).map((project) => (
                        <div
                          key={project.id}
                          onClick={() => handleProjectSelect(project.id)}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-foreground text-sm border-b border-border last:border-b-0"
                        >
                          {project.builders?.code || project.builders?.name || "No Builder"} - {project.locations?.name || "No Location"} - {project.lot_number}
                        </div>
                      ))}
                    </div>
                  )}
                  {projectSearch.trim() && filteredProjects.length === 0 && !projectId && (
                    <div className="text-muted-foreground text-sm py-2">
                      No projects found matching "{projectSearch}"
                    </div>
                  )}
                  {/* Show selected project */}
                  {projectId && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-foreground text-sm flex justify-between items-center">
                      <span>
                        {projects.find(p => p.id === projectId)?.builders?.code || projects.find(p => p.id === projectId)?.builders?.name} - {projects.find(p => p.id === projectId)?.locations?.name} - {projects.find(p => p.id === projectId)?.lot_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProjectId("")}
                        className="text-muted-foreground hover:text-foreground ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Phase</Label>
                  <Select value={phaseId} onValueChange={setPhaseId}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {phases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id} className="text-foreground">{phase.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Select value={orderStatus} onValueChange={setOrderStatus}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Sure Go" className="text-foreground">Sure Go</SelectItem>
                      <SelectItem value="Will Call" className="text-foreground">Will Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </TabsContent>

            <TabsContent value="concrete" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-foreground">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Order Number</Label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., RM-12345"
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Qty Ordered</Label>
                  <Input
                    value={qtyOrdered}
                    onChange={(e) => setQtyOrdered(e.target.value)}
                    placeholder="e.g., 10+5"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Crew Yards Poured</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={crewYardsPoured}
                    onChange={(e) => setCrewYardsPoured(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice #</Label>
                  <Input
                    value={readyMixInvoiceNumber}
                    onChange={(e) => setReadyMixInvoiceNumber(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={readyMixInvoiceAmount}
                    onChange={(e) => setReadyMixInvoiceAmount(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Yards Billed</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={readyMixYardsBilled}
                    onChange={(e) => setReadyMixYardsBilled(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pump" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Pump Vendor</Label>
                <Select value={pumpVendorId} onValueChange={setPumpVendorId}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select pump vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {pumpVendors.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-foreground">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice #</Label>
                  <Input
                    value={pumpInvoiceNumber}
                    onChange={(e) => setPumpInvoiceNumber(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pumpInvoiceAmount}
                    onChange={(e) => setPumpInvoiceAmount(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inspection" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Inspection Type</Label>
                  <Select value={inspectionTypeId} onValueChange={setInspectionTypeId}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {inspectionTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-foreground">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Inspector</Label>
                  <Select value={inspectorId} onValueChange={setInspectorId}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {inspectors.map((i) => (
                        <SelectItem key={i.id} value={i.id} className="text-foreground">{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice #</Label>
                  <Input
                    value={inspectionInvoiceNumber}
                    onChange={(e) => setInspectionInvoiceNumber(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invoice $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inspectionAmount}
                    onChange={(e) => setInspectionAmount(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 text-slate-900 hover:bg-amber-600">
              Add Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
