import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { InlineAddSelect } from "./InlineAddSelect";

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
  qty_ordered: string | null;
  order_number: string | null;
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
  projects: {
    lot_number: string;
    builders: { name: string; code: string | null } | null;
    locations: { name: string } | null;
  } | null;
}

interface EditEntryDialogProps {
  entry: ScheduleEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "general" | "concrete" | "pump" | "inspection" | "invoicing" | "crew";
}

export function EditEntryDialog({ entry, open, onOpenChange, defaultTab = "general" }: EditEntryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    phase_id: "",
    start_time: "",
    order_status: "",
    notes: "",
    // Concrete tab
    supplier_id: "",
    concrete_mix_id: "",
    additive_hot_water: false,
    additive_1_percent_he: false,
    additive_2_percent_he: false,
    qty_ordered: "",
    order_number: "",
    ready_mix_invoice_number: "",
    ready_mix_invoice_amount: "",
    ready_mix_yards_billed: "",
    concrete_notes: "",
    // Pump tab
    pump_vendor_id: "",
    pump_invoice_number: "",
    pump_invoice_amount: "",
    pump_notes: "",
    // Inspection tab
    inspection_type_id: "",
    inspector_id: "",
    inspection_invoice_number: "",
    inspection_amount: "",
    inspection_notes: "",
    // Invoice tab
    to_be_invoiced: false,
    // Crew tab
    crew_id: "",
    crew_yards_poured: "",
    crew_notes: "",
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        phase_id: entry.phase_id || "",
        start_time: entry.start_time || "",
        order_status: entry.order_status || "",
        notes: entry.notes || "",
        supplier_id: entry.supplier_id || "",
        concrete_mix_id: (entry as any).concrete_mix_id || "",
        additive_hot_water: (entry as any).additive_hot_water || false,
        additive_1_percent_he: (entry as any).additive_1_percent_he || false,
        additive_2_percent_he: (entry as any).additive_2_percent_he || false,
        qty_ordered: entry.qty_ordered || "",
        order_number: entry.order_number || "",
        ready_mix_invoice_number: entry.ready_mix_invoice_number || "",
        ready_mix_invoice_amount: entry.ready_mix_invoice_amount?.toString() || "",
        ready_mix_yards_billed: entry.ready_mix_yards_billed?.toString() || "",
        concrete_notes: (entry as any).concrete_notes || "",
        pump_vendor_id: entry.pump_vendor_id || "",
        pump_invoice_number: entry.pump_invoice_number || "",
        pump_invoice_amount: entry.pump_invoice_amount?.toString() || "",
        pump_notes: (entry as any).pump_notes || "",
        inspection_type_id: entry.inspection_type_id || "",
        inspector_id: entry.inspector_id || "",
        inspection_invoice_number: entry.inspection_invoice_number || "",
        inspection_amount: entry.inspection_amount?.toString() || "",
        inspection_notes: (entry as any).inspection_notes || "",
        to_be_invoiced: entry.to_be_invoiced,
        crew_id: entry.crew_id || "",
        crew_yards_poured: (entry as any).crew_yards_poured?.toString() || "",
        crew_notes: (entry as any).crew_notes || "",
      });
    }
  }, [entry]);

  // Fetch reference data
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

  const { data: crews = [] } = useQuery({
    queryKey: ["crews-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crews").select("id, name, is_active").order("display_order");
      if (error) throw error;
      return data as { id: string; name: string; is_active: boolean }[];
    },
  });

  const { data: concreteMixes = [] } = useQuery({
    queryKey: ["concrete-mixes-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("concrete_mixes").select("id, name").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Filter to show active crews + the currently-assigned crew (even if inactive)
  const crewOptions = crews.filter(
    (c) => c.is_active || c.id === entry?.crew_id
  );

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!entry) return;
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", entry.id);
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

  const handleSave = () => {
    const updates: Record<string, any> = {
      phase_id: formData.phase_id || null,
      start_time: formData.start_time || null,
      order_status: formData.order_status || null,
      notes: formData.notes || null,
      supplier_id: formData.supplier_id || null,
      concrete_mix_id: formData.concrete_mix_id || null,
      additive_hot_water: formData.additive_hot_water,
      additive_1_percent_he: formData.additive_1_percent_he,
      additive_2_percent_he: formData.additive_2_percent_he,
      qty_ordered: formData.qty_ordered || null,
      order_number: formData.order_number || null,
      ready_mix_invoice_number: formData.ready_mix_invoice_number || null,
      ready_mix_invoice_amount: formData.ready_mix_invoice_amount ? parseFloat(formData.ready_mix_invoice_amount) : null,
      ready_mix_yards_billed: formData.ready_mix_yards_billed ? parseFloat(formData.ready_mix_yards_billed) : null,
      concrete_notes: formData.concrete_notes || null,
      pump_vendor_id: formData.pump_vendor_id || null,
      pump_invoice_number: formData.pump_invoice_number || null,
      pump_invoice_amount: formData.pump_invoice_amount ? parseFloat(formData.pump_invoice_amount) : null,
      pump_notes: formData.pump_notes || null,
      inspection_type_id: formData.inspection_type_id || null,
      inspector_id: formData.inspector_id || null,
      inspection_invoice_number: formData.inspection_invoice_number || null,
      inspection_amount: formData.inspection_amount ? parseFloat(formData.inspection_amount) : null,
      inspection_notes: formData.inspection_notes || null,
      to_be_invoiced: formData.to_be_invoiced,
      crew_id: formData.crew_id || null,
      crew_yards_poured: formData.crew_yards_poured ? parseFloat(formData.crew_yards_poured) : null,
      crew_notes: formData.crew_notes || null,
    };
    
    updateMutation.mutate(updates);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!entry) return null;

  const projectLabel = [
    entry.projects?.builders?.code || entry.projects?.builders?.name,
    entry.projects?.locations?.name,
    entry.projects?.lot_number,
  ].filter(Boolean).join(" / ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entry: {projectLabel}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="concrete">Concrete</TabsTrigger>
            <TabsTrigger value="pump">Pump</TabsTrigger>
            <TabsTrigger value="inspection">Inspection</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="crew">Crew</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select value={formData.phase_id} onValueChange={(v) => updateField("phase_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => updateField("start_time", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order Status</Label>
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="concrete" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <InlineAddSelect
                label="Supplier"
                value={formData.supplier_id}
                onChange={(v) => updateField("supplier_id", v)}
                options={suppliers}
                placeholder="Select supplier"
                tableName="suppliers"
                queryKey="suppliers-active"
                hasCode={true}
                showCode={true}
              />
              <div className="space-y-2">
                <Label>Concrete Mix</Label>
                <Select value={formData.concrete_mix_id} onValueChange={(v) => updateField("concrete_mix_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mix" />
                  </SelectTrigger>
                  <SelectContent>
                    {concreteMixes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qty Ordered</Label>
                <Input
                  value={formData.qty_ordered}
                  onChange={(e) => updateField("qty_ordered", e.target.value)}
                  placeholder="e.g. 10+ or 8+2"
                />
              </div>
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => updateField("order_number", e.target.value)}
                  placeholder="Order #"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additives</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="additive_hot_water"
                    checked={formData.additive_hot_water}
                    onCheckedChange={(checked) => updateField("additive_hot_water", checked === true)}
                  />
                  <label htmlFor="additive_hot_water" className="text-sm">Hot Water</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="additive_1_percent_he"
                    checked={formData.additive_1_percent_he}
                    onCheckedChange={(checked) => updateField("additive_1_percent_he", checked === true)}
                  />
                  <label htmlFor="additive_1_percent_he" className="text-sm">1% HE</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="additive_2_percent_he"
                    checked={formData.additive_2_percent_he}
                    onCheckedChange={(checked) => updateField("additive_2_percent_he", checked === true)}
                  />
                  <label htmlFor="additive_2_percent_he" className="text-sm">2% HE</label>
                </div>
              </div>
            </div>
            <hr className="border-border my-4" />
            <h4 className="text-sm font-medium text-muted-foreground">Ready Mix Invoice</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input
                  value={formData.ready_mix_invoice_number}
                  onChange={(e) => updateField("ready_mix_invoice_number", e.target.value)}
                  placeholder="Invoice #"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ready_mix_invoice_amount}
                  onChange={(e) => updateField("ready_mix_invoice_amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Yards Billed</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ready_mix_yards_billed}
                  onChange={(e) => updateField("ready_mix_yards_billed", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Concrete Notes</Label>
              <Textarea
                value={formData.concrete_notes}
                onChange={(e) => updateField("concrete_notes", e.target.value)}
                placeholder="Notes related to concrete/ready mix..."
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="pump" className="space-y-4 mt-4">
            <InlineAddSelect
              label="Pump Vendor"
              value={formData.pump_vendor_id}
              onChange={(v) => updateField("pump_vendor_id", v)}
              options={pumpVendors}
              placeholder="Select pump vendor"
              tableName="pump_vendors"
              queryKey="pump-vendors-active"
              hasCode={true}
              showCode={true}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input
                  value={formData.pump_invoice_number}
                  onChange={(e) => updateField("pump_invoice_number", e.target.value)}
                  placeholder="Invoice #"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pump_invoice_amount}
                  onChange={(e) => updateField("pump_invoice_amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pump Notes</Label>
              <Textarea
                value={formData.pump_notes}
                onChange={(e) => updateField("pump_notes", e.target.value)}
                placeholder="Notes related to pump vendor..."
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="inspection" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <InlineAddSelect
                label="Inspection Type"
                value={formData.inspection_type_id}
                onChange={(v) => updateField("inspection_type_id", v)}
                options={inspectionTypes}
                placeholder="Select type"
                tableName="inspection_types"
                queryKey="inspection-types-active"
              />
              <InlineAddSelect
                label="Inspected By"
                value={formData.inspector_id}
                onChange={(v) => updateField("inspector_id", v)}
                options={inspectors}
                placeholder="Select inspector"
                tableName="inspectors"
                queryKey="inspectors-active"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input
                  value={formData.inspection_invoice_number}
                  onChange={(e) => updateField("inspection_invoice_number", e.target.value)}
                  placeholder="Invoice #"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.inspection_amount}
                  onChange={(e) => updateField("inspection_amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inspection Notes</Label>
              <Textarea
                value={formData.inspection_notes}
                onChange={(e) => updateField("inspection_notes", e.target.value)}
                placeholder="Notes related to inspection..."
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="invoicing" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="to_be_invoiced"
                checked={formData.to_be_invoiced}
                onChange={(e) => updateField("to_be_invoiced", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="to_be_invoiced">Mark as "To Be Invoiced"</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Note: "Invoice Complete" status is managed from the Invoices page.
            </p>
          </TabsContent>
          
          <TabsContent value="crew" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Crew</Label>
              <Select value={formData.crew_id} onValueChange={(v) => updateField("crew_id", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select crew" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {crewOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{!c.is_active && " (Inactive)"}
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
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
