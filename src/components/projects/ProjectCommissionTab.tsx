import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { useOrganization } from "@/hooks/useOrganization";
import { invalidateProjectQueries } from "@/lib/queryHelpers";
import { Plus, Trash2, Check, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ProjectCommissionTabProps {
  projectId: string | null;
  readOnly?: boolean;
}

const fmt = (n: number): string =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (profit: number, revenue: number): string =>
  revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : "—";

export function ProjectCommissionTab({ projectId, readOnly = false }: ProjectCommissionTabProps) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  // ── Query 1: F&W schedule entries ──
  const { data: fwEntries = [] } = useQuery({
    queryKey: ["commission-fw-entries", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, crew_id, crew_yards_poured, ready_mix_invoice_amount,
          scheduled_date,
          crews(id, name),
          phases(pl_section, phase_type)
        `)
        .eq("project_id", projectId)
        .eq("deleted", false);
      if (error) throw error;
      return (data || []).filter((e: any) => {
        const s = e.phases?.pl_section;
        return s === "footings_walls" || s === "both";
      });
    },
    enabled: !!projectId,
  });

  // ── Query 2: Saved commissions ──
  const { data: commissions = [] } = useQuery({
    queryKey: ["commission-saved", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_commissions")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // ── Query 3: Other costs for F&W ──
  const { data: otherCosts = [] } = useQuery({
    queryKey: ["commission-other-costs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_other_costs")
        .select("*")
        .eq("project_id", projectId)
        .eq("pl_section", "footings_walls")
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // ── Query 4: F&W revenue ──
  const { data: revenue } = useQuery({
    queryKey: ["commission-revenue", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("project_pl_revenue")
        .select("base_house, extras, sales_price")
        .eq("project_id", projectId)
        .eq("section", "footings_walls")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // ── Derived values ──
  const totalFWYards = fwEntries.reduce((s: number, e: any) => s + (e.crew_yards_poured ?? 0), 0);
  const fwConcreteTotal = fwEntries.reduce((s: number, e: any) => s + (e.ready_mix_invoice_amount ?? 0), 0);
  const fwOtherTotal = otherCosts.reduce((s: number, c: any) => s + (c.amount ?? 0), 0);
  const fwInvoiceTotal = ((revenue as any)?.base_house ?? 0) + ((revenue as any)?.extras ?? 0);

  // Find crew
  const crewEntry = fwEntries.find((e: any) => e.crew_id);
  const crewId = (crewEntry as any)?.crew_id ?? null;
  const crewName = (crewEntry as any)?.crews?.name ?? "Unknown Crew";
  const commission = commissions.find((c: any) => c.crew_id === crewId);

  // ── Local form state ──
  const [calcMethod, setCalcMethod] = useState<string>("per_cy");
  const [ratePerCy, setRatePerCy] = useState("");
  const [pctOfInvoice, setPctOfInvoice] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    if (commission) {
      setCalcMethod(commission.calc_method ?? "per_cy");
      setRatePerCy(commission.rate_per_cy?.toString() ?? "");
      setPctOfInvoice(commission.pct_of_invoice?.toString() ?? "");
      setOverrideAmount(commission.override_amount?.toString() ?? "");
      setNotes(commission.notes ?? "");
    } else {
      setCalcMethod("per_cy");
      setRatePerCy("");
      setPctOfInvoice("");
      setOverrideAmount("");
      setNotes("");
    }
  }, [commission]);

  const getFinalAllowance = () => {
    const ov = parseFloat(overrideAmount);
    if (!isNaN(ov) && overrideAmount !== "") return ov;
    if (calcMethod === "per_cy") {
      const rate = parseFloat(ratePerCy) || 0;
      return totalFWYards * rate;
    }
    if (calcMethod === "pct_invoice") {
      const p = parseFloat(pctOfInvoice) || 0;
      return fwInvoiceTotal * (p / 100);
    }
    return 0;
  };

  const allowance = getFinalAllowance();

  const handleSave = async () => {
    if (!projectId || !organizationId || !crewId) return;
    try {
      const { error } = await supabase
        .from("project_commissions")
        .upsert({
          ...(commission?.id ? { id: commission.id } : {}),
          organization_id: organizationId,
          project_id: projectId,
          crew_id: crewId,
          calc_method: calcMethod,
          rate_per_cy: ratePerCy ? parseFloat(ratePerCy) : null,
          pct_of_invoice: pctOfInvoice ? parseFloat(pctOfInvoice) : null,
          override_amount: overrideAmount ? parseFloat(overrideAmount) : null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "project_id,crew_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["commission-saved", projectId] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e: any) {
      toast.error(getUserFriendlyError(e));
    }
  };

  // ── Other costs mutations ──
  const invalidateOtherCosts = () => {
    queryClient.invalidateQueries({ queryKey: ["commission-other-costs", projectId] });
    queryClient.invalidateQueries({ queryKey: ["pl-other-costs", projectId] });
  };

  const addCostMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !organizationId) throw new Error("Missing context");
      const { error } = await supabase.from("project_other_costs").insert({
        organization_id: organizationId,
        project_id: projectId,
        pl_section: "footings_walls",
        description: "New cost",
        amount: 0,
        display_order: otherCosts.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: invalidateOtherCosts,
    onError: (e: Error) => toast.error(getUserFriendlyError(e)),
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_other_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateOtherCosts();
      toast.success("Cost removed");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(getUserFriendlyError(e)),
  });

  const updateCost = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("project_other_costs").update(updates).eq("id", id);
    if (error) toast.error(getUserFriendlyError(error));
    else invalidateOtherCosts();
  };

  // ── Summary ──
  const cogs = fwConcreteTotal + fwOtherTotal + allowance;
  const grossProfit = fwInvoiceTotal - cogs;
  const hasRevenue = fwInvoiceTotal > 0;

  // Empty state
  if (fwEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
        <p>No Footings & Walls entries found for this project.</p>
        <p>Commission will appear once F&W schedule entries are added and phases are tagged in Settings → Phases.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Footings & Walls Commission — {crewName}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Commission is separate from project P&L and gross margin
        </p>
      </div>

      {/* Reference values */}
      <div className="bg-card border border-border rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total F&W Yards</span>
          <span className="text-foreground">{totalFWYards.toFixed(1)} yd</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">F&W Concrete Invoice</span>
          <span className="text-foreground">{fmt(fwConcreteTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">F&W Invoice (Base+Extras)</span>
          <span className="text-foreground">{fmt(fwInvoiceTotal)}</span>
        </div>
      </div>

      {/* Crew Allowance Card */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Crew Allowance</h4>

        {/* Calc method radios */}
        {!readOnly && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="calc_method"
                value="per_cy"
                checked={calcMethod === "per_cy"}
                onChange={() => { setCalcMethod("per_cy"); }}
                className="accent-primary"
              />
              <span className="text-foreground">Per Cubic Yard</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="calc_method"
                value="pct_invoice"
                checked={calcMethod === "pct_invoice"}
                onChange={() => { setCalcMethod("pct_invoice"); }}
                className="accent-primary"
              />
              <span className="text-foreground">% of Invoice</span>
            </label>
          </div>
        )}

        {/* Per CY inputs */}
        {calcMethod === "per_cy" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Rate per CY</label>
            {readOnly ? (
              <span className="text-sm text-foreground">{ratePerCy ? `$${ratePerCy}` : "—"}</span>
            ) : (
              <div className="relative w-32">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ratePerCy}
                  onChange={(e) => setRatePerCy(e.target.value)}
                  onBlur={handleSave}
                  className="h-8 text-sm pl-6"
                  placeholder="0.00"
                />
              </div>
            )}
            {(parseFloat(ratePerCy) || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                = {fmt(totalFWYards * (parseFloat(ratePerCy) || 0))} ({totalFWYards.toFixed(1)} yd × ${parseFloat(ratePerCy)?.toFixed(2)})
              </p>
            )}
          </div>
        )}

        {/* Pct of Invoice inputs */}
        {calcMethod === "pct_invoice" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">% of F&W Invoice</label>
            {readOnly ? (
              <span className="text-sm text-foreground">{pctOfInvoice ? `${pctOfInvoice}%` : "—"}</span>
            ) : (
              <div className="relative w-32">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pctOfInvoice}
                  onChange={(e) => setPctOfInvoice(e.target.value)}
                  onBlur={handleSave}
                  className="h-8 text-sm pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">F&W Invoice: {fmt(fwInvoiceTotal)}</p>
            {(parseFloat(pctOfInvoice) || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                = {fmt(fwInvoiceTotal * (parseFloat(pctOfInvoice) || 0) / 100)}
              </p>
            )}
          </div>
        )}

        {/* Override */}
        <div className="space-y-1 border-t border-border pt-3">
          <label className="text-sm text-muted-foreground">Override Amount (optional)</label>
          {readOnly ? (
            overrideAmount ? <span className="text-sm text-foreground">{fmt(parseFloat(overrideAmount))}</span> : null
          ) : (
            <>
              <div className="relative w-32">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmount(e.target.value)}
                  onBlur={handleSave}
                  className="h-8 text-sm pl-6"
                  placeholder="—"
                />
              </div>
              <p className="text-xs text-muted-foreground">Overrides the calculation above if entered</p>
            </>
          )}
        </div>

        {/* Result */}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-semibold text-foreground">Crew Allowance</span>
          <span className={cn("text-sm font-bold", allowance > 0 ? "text-green-500" : "text-muted-foreground")}>
            {fmt(allowance)}
          </span>
        </div>

        {/* Save status */}
        {saveStatus === "saved" && (
          <span className="text-xs text-green-500 flex items-center gap-0.5">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Notes</label>
          {readOnly ? (
            notes ? <p className="text-sm text-foreground">{notes}</p> : null
          ) : (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSave}
              placeholder="Commission notes..."
              className="text-sm min-h-[60px]"
            />
          )}
        </div>
      </div>

      {/* Other Job Costs Card */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Other Job Costs (F&W)</h4>
          <p className="text-xs text-muted-foreground mt-0.5">These same costs appear on the P&L tab</p>
        </div>

        {otherCosts.map((cost: any) => (
          <OtherCostRow
            key={cost.id}
            cost={cost}
            readOnly={readOnly}
            onUpdate={updateCost}
            onDelete={() => setDeleteId(cost.id)}
          />
        ))}

        {otherCosts.length === 0 && (
          <p className="text-xs text-muted-foreground">No other costs.</p>
        )}

        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addCostMutation.mutate()}
            disabled={addCostMutation.isPending}
            className="text-muted-foreground"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Cost
          </Button>
        )}

        <div className="flex justify-between text-sm border-t border-border pt-2">
          <span className="text-muted-foreground">Other Costs Total</span>
          <span className="font-medium text-foreground">{fmt(fwOtherTotal)}</span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-1">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Summary</h4>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Concrete Cost</span>
          <span className="text-foreground">{fmt(fwConcreteTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Other Costs</span>
          <span className="text-foreground">{fmt(fwOtherTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Labor Allowance</span>
          <span className="text-foreground">{fmt(allowance)}</span>
        </div>
        <div className="border-t border-border my-1" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">COGS</span>
          <span className="font-medium text-foreground">{fmt(cogs)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">Invoice Total</span>
          <span className="font-medium text-foreground">{fmt(fwInvoiceTotal)}</span>
        </div>
        <div className="border-t border-border my-1" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-semibold">Gross Profit</span>
          <span className={cn("font-bold", hasRevenue ? (grossProfit >= 0 ? "text-green-500" : "text-destructive") : "text-muted-foreground")}>
            {hasRevenue ? fmt(grossProfit) : "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-semibold">Gross Margin</span>
          <span className={cn("font-bold", hasRevenue ? (grossProfit >= 0 ? "text-green-500" : "text-destructive") : "text-muted-foreground")}>
            {pct(grossProfit, fwInvoiceTotal)}
          </span>
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Cost"
        description="Remove this cost line? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteId) deleteCostMutation.mutate(deleteId); }}
        isLoading={deleteCostMutation.isPending}
      />
    </div>
  );
}

// ── Other Cost Row ──
function OtherCostRow({
  cost,
  readOnly,
  onUpdate,
  onDelete,
}: {
  cost: any;
  readOnly: boolean;
  onUpdate: (id: string, updates: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const [desc, setDesc] = useState(cost.description);
  const [amount, setAmount] = useState(cost.amount?.toString() ?? "0");

  useEffect(() => {
    setDesc(cost.description);
    setAmount(cost.amount?.toString() ?? "0");
  }, [cost]);

  if (readOnly) {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{cost.description}</span>
        <span className="text-foreground">{fmt(cost.amount ?? 0)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => { if (desc !== cost.description) onUpdate(cost.id, { description: desc }); }}
        className="flex-1 h-7 text-sm"
        placeholder="Description"
      />
      <div className="relative w-24">
        <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            const n = parseFloat(amount) || 0;
            if (n !== cost.amount) onUpdate(cost.id, { amount: n });
          }}
          className="h-7 text-sm pl-5"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

