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
import { useToast } from "@/hooks/use-toast";

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
}

export function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
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
    qty_ordered: "",
    order_number: "",
    ready_mix_invoice_number: "",
    ready_mix_invoice_amount: "",
    ready_mix_yards_billed: "",
    // Pump tab
    pump_vendor_id: "",
    pump_invoice_number: "",
    pump_invoice_amount: "",
    // Inspection tab
    inspection_type_id: "",
    inspector_id: "",
    inspection_invoice_number: "",
    inspection_amount: "",
    // Invoice tab
    to_be_invoiced: false,
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
        qty_ordered: entry.qty_ordered || "",
        order_number: entry.order_number || "",
        ready_mix_invoice_number: entry.ready_mix_invoice_number || "",
        ready_mix_invoice_amount: entry.ready_mix_invoice_amount?.toString() || "",
        ready_mix_yards_billed: entry.ready_mix_yards_billed?.toString() || "",
        pump_vendor_id: entry.pump_vendor_id || "",
        pump_invoice_number: entry.pump_invoice_number || "",
        pump_invoice_amount: entry.pump_invoice_amount?.toString() || "",
        inspection_type_id: entry.inspection_type_id || "",
        inspector_id: entry.inspector_id || "",
        inspection_invoice_number: entry.inspection_invoice_number || "",
        inspection_amount: entry.inspection_amount?.toString() || "",
        to_be_invoiced: entry.to_be_invoiced,
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
    queryKey: ["crews-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crews").select("id, name").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data;
    },
  });

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
      qty_ordered: formData.qty_ordered || null,
      order_number: formData.order_number || null,
      ready_mix_invoice_number: formData.ready_mix_invoice_number || null,
      ready_mix_invoice_amount: formData.ready_mix_invoice_amount ? parseFloat(formData.ready_mix_invoice_amount) : null,
      ready_mix_yards_billed: formData.ready_mix_yards_billed ? parseFloat(formData.ready_mix_yards_billed) : null,
      pump_vendor_id: formData.pump_vendor_id || null,
      pump_invoice_number: formData.pump_invoice_number || null,
      pump_invoice_amount: formData.pump_invoice_amount ? parseFloat(formData.pump_invoice_amount) : null,
      inspection_type_id: formData.inspection_type_id || null,
      inspector_id: formData.inspector_id || null,
      inspection_invoice_number: formData.inspection_invoice_number || null,
      inspection_amount: formData.inspection_amount ? parseFloat(formData.inspection_amount) : null,
      to_be_invoiced: formData.to_be_invoiced,
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
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="concrete">Concrete</TabsTrigger>
            <TabsTrigger value="pump">Pump</TabsTrigger>
            <TabsTrigger value="inspection">Inspection</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
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
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => updateField("supplier_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qty Ordered</Label>
                <Input
                  value={formData.qty_ordered}
                  onChange={(e) => updateField("qty_ordered", e.target.value)}
                  placeholder="e.g. 10+ or 8+2"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => updateField("order_number", e.target.value)}
                placeholder="Order #"
              />
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
          </TabsContent>
          
          <TabsContent value="pump" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Pump Vendor</Label>
              <Select value={formData.pump_vendor_id} onValueChange={(v) => updateField("pump_vendor_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pump vendor" />
                </SelectTrigger>
                <SelectContent>
                  {pumpVendors.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </TabsContent>
          
          <TabsContent value="inspection" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inspection Type</Label>
                <Select value={formData.inspection_type_id} onValueChange={(v) => updateField("inspection_type_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Inspected By</Label>
                <Select value={formData.inspector_id} onValueChange={(v) => updateField("inspector_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspector" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectors.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
