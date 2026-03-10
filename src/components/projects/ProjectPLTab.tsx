import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, ChevronRight, AlertTriangle, DollarSign, Check } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface ProjectPLTabProps {
  projectId: string | null;
  readOnly?: boolean;
}

interface VendorEntry {
  pl_section: string | null;
  ready_mix_invoice_amount: number | null;
  stone_invoice_amount: number | null;
  pump_invoice_amount: number | null;
  inspection_amount: number | null;
}




interface OtherCost {
  id: string;
  pl_section: string;
  description: string;
  amount: number;
  display_order: number;
}

interface RevenueRow {
  id: string;
  section: string;
  sales_price: number | null;
  base_house: number | null;
  extras: number | null;
  notes: string | null;
}

type Section = "footings_walls" | "slab";

const SECTION_LABELS: Record<Section, string> = {
  footings_walls: "Footings & Walls",
  slab: "Slab",
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined): string =>
  n != null && n !== 0
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtTotal = (n: number): string =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (profit: number, revenue: number): string =>
  revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : "—";

const profitColor = (profit: number | null, hasRevenue: boolean): string => {
  if (!hasRevenue) return "text-muted-foreground";
  if (profit == null) return "text-muted-foreground";
  return profit >= 0 ? "text-green-500" : "text-destructive";
};

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export function ProjectPLTab({ projectId, readOnly = false }: ProjectPLTabProps) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── Vendor costs from schedule_entries via phases.pl_section ──
  const { data: vendorEntries = [] } = useQuery({
    queryKey: ["pl-vendor-costs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          ready_mix_invoice_amount,
          stone_invoice_amount,
          pump_invoice_amount,
          inspection_amount,
          phases(pl_section)
        `)
        .eq("project_id", projectId)
        .eq("deleted", false);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        pl_section: d.phases?.pl_section ?? null,
        ready_mix_invoice_amount: d.ready_mix_invoice_amount,
        stone_invoice_amount: d.stone_invoice_amount,
        pump_invoice_amount: d.pump_invoice_amount,
        inspection_amount: d.inspection_amount,
      })) as VendorEntry[];
    },
    enabled: !!projectId,
  });

  // Also fetch entries with no phase or phase with null pl_section for warning
  const { data: uncategorizedEntries = [] } = useQuery({
    queryKey: ["pl-uncategorized", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      // Entries with vendor amounts but phase has no pl_section or no phase
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id,
          ready_mix_invoice_amount,
          stone_invoice_amount,
          pump_invoice_amount,
          inspection_amount,
          phase_id,
          phases(pl_section)
        `)
        .eq("project_id", projectId)
        .eq("deleted", false);
      if (error) throw error;
      return (data || []).filter((e: any) => {
        const hasAmount =
          (e.ready_mix_invoice_amount && e.ready_mix_invoice_amount > 0) ||
          (e.stone_invoice_amount && e.stone_invoice_amount > 0) ||
          (e.pump_invoice_amount && e.pump_invoice_amount > 0) ||
          (e.inspection_amount && e.inspection_amount > 0);
        const noSection = !e.phases?.pl_section;
        return hasAmount && noSection;
      });
    },
    enabled: !!projectId,
  });

  // ── Schedule entry hours for labor ──
  const { data: scheduleEntries = [] } = useQuery({
    queryKey: ["pl-schedule-hours", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, crew_hours, crew_labor_cost_override, crew_id,
          phases(pl_section),
          crews(id, name)
        `)
        .eq("project_id", projectId)
        .eq("deleted", false)
        .not("crew_hours", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: crewMemberRates = [] } = useQuery({
    queryKey: ["crew-member-rates", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crew_members")
        .select("crew_id, hourly_rate")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .not("hourly_rate", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // ── Other costs ──
  const { data: otherCosts = [] } = useQuery({
    queryKey: ["pl-other-costs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_other_costs")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order")
        .order("created_at");
      if (error) throw error;
      return data as OtherCost[];
    },
    enabled: !!projectId,
  });

  // ── Revenue ──
  const { data: revenueRows = [] } = useQuery({
    queryKey: ["pl-revenue", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_pl_revenue")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as RevenueRow[];
    },
    enabled: !!projectId,
  });

  // ── Aggregate vendor costs per section ──
  const aggregateVendor = (section: Section) => {
    const matching = vendorEntries.filter((e) => {
      if (!e.pl_section) return false;
      return e.pl_section === section || e.pl_section === "both";
    });
    return {
      concrete: matching.reduce((s, e) => s + (e.ready_mix_invoice_amount || 0), 0),
      stone: matching.reduce((s, e) => s + (e.stone_invoice_amount || 0), 0),
      pump: matching.reduce((s, e) => s + (e.pump_invoice_amount || 0), 0),
      inspection: matching.reduce((s, e) => s + (e.inspection_amount || 0), 0),
    };
  };

  // ── Aggregate labor per section from schedule entry hours ──
  const getCrewRate = (crewId: string | null) => {
    if (!crewId) return 0;
    return crewMemberRates
      .filter((m: any) => m.crew_id === crewId)
      .reduce((sum: number, m: any) => sum + (m.hourly_rate ?? 0), 0);
  };

  const aggregateLabor = (section: Section) => {
    return scheduleEntries
      .filter((e: any) => {
        const s = e.phases?.pl_section;
        return s === section || s === "both";
      })
      .reduce((sum: number, e: any) => {
        if (e.crew_labor_cost_override != null) {
          return sum + e.crew_labor_cost_override;
        }
        return sum + (e.crew_hours ?? 0) * getCrewRate(e.crew_id);
      }, 0);
  };

  const getLaborHoursSummary = (section: string) => {
    const sectionEntries = scheduleEntries.filter((e: any) => {
      const s = e.phases?.pl_section;
      return s === section || s === "both";
    });
    const totalHours = sectionEntries.reduce((s: number, e: any) => s + (e.crew_hours ?? 0), 0);
    const count = sectionEntries.length;
    return { totalHours, count };
  };

  const buildSection = (section: Section) => {
    const vendor = aggregateVendor(section);
    const labor = aggregateLabor(section);
    const sectionOther = otherCosts.filter((c) => c.pl_section === section);
    const otherTotal = sectionOther.reduce((s, c) => s + (c.amount || 0), 0);
    const totalCosts = vendor.concrete + vendor.stone + vendor.pump + vendor.inspection + labor + otherTotal;
    const rev = revenueRows.find((r) => r.section === section);
    const salesPrice = rev?.sales_price ?? null;
    const grossProfit = salesPrice != null ? salesPrice - totalCosts : null;
    return { vendor, labor, sectionOther, otherTotal, totalCosts, salesPrice, grossProfit, rev };
  };

  const fw = buildSection("footings_walls");
  const slab = buildSection("slab");

  const combinedSales = (fw.salesPrice ?? 0) + (slab.salesPrice ?? 0);
  const combinedCosts = fw.totalCosts + slab.totalCosts;
  const combinedProfit = combinedSales - combinedCosts;
  const hasCombinedRevenue = (fw.salesPrice ?? 0) > 0 || (slab.salesPrice ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      {uncategorizedEntries.length > 0 && (
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm text-left hover:bg-yellow-500/20 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            ⚠ Some costs could not be categorized because their phases have no P&L section assigned.
            Go to Settings → Phases to fix this.
          </span>
        </button>
      )}

      {/* Section Cards */}
      {(["footings_walls", "slab"] as Section[]).map((section) => {
        const data = section === "footings_walls" ? fw : slab;
        const { totalHours, count } = getLaborHoursSummary(section);
        const overrideEntry = scheduleEntries.find((e: any) => {
          const s = e.phases?.pl_section;
          return (s === section || s === "both") && e.crew_labor_cost_override != null;
        });
        return (
          <SectionCard
            key={section}
            section={section}
            data={data}
            projectId={projectId}
            organizationId={organizationId}
            readOnly={readOnly}
            queryClient={queryClient}
            laborHours={totalHours}
            laborEntryCount={count}
            hasOverride={overrideEntry != null}
            overrideValue={overrideEntry?.crew_labor_cost_override ?? null}
            scheduleEntries={scheduleEntries}
            crewMemberRates={crewMemberRates}
          />
        );
      })}

      {/* Overall Totals */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-foreground text-sm">Overall Totals</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Combined Sales Price</span>
          <span className="text-right font-medium text-foreground">{hasCombinedRevenue ? fmtTotal(combinedSales) : "—"}</span>
          <span className="text-muted-foreground">Combined Total Costs</span>
          <span className="text-right font-medium text-foreground">{fmtTotal(combinedCosts)}</span>
          <span className="text-muted-foreground">Combined Gross Profit</span>
          <span className={cn("text-right font-bold", profitColor(combinedProfit, hasCombinedRevenue))}>
            {hasCombinedRevenue ? fmtTotal(combinedProfit) : "—"}
          </span>
          <span className="text-muted-foreground">Margin</span>
          <span className={cn("text-right font-bold", profitColor(combinedProfit, hasCombinedRevenue))}>
            {pct(combinedProfit, combinedSales)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Section Card
// ────────────────────────────────────────────────────────────────

interface SectionData {
  vendor: { concrete: number; stone: number; pump: number; inspection: number };
  labor: number;
  sectionOther: OtherCost[];
  otherTotal: number;
  totalCosts: number;
  salesPrice: number | null;
  grossProfit: number | null;
  rev: RevenueRow | undefined;
}

interface SectionCardProps {
  section: Section;
  data: SectionData;
  projectId: string | null;
  organizationId: string | null;
  readOnly: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
  laborHours: number;
  laborEntryCount: number;
  hasOverride: boolean;
  overrideValue: number | null;
  scheduleEntries: any[];
  crewMemberRates: any[];
}

function SectionCard({
  section,
  data,
  projectId,
  organizationId,
  readOnly,
  queryClient,
  laborHours,
  laborEntryCount,
  hasOverride,
  overrideValue,
  scheduleEntries,
  crewMemberRates,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50">
          <h3 className="font-semibold text-foreground text-sm">{SECTION_LABELS[section]}</h3>
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Revenue */}
            <SalesPriceRow
              section={section}
              projectId={projectId}
              organizationId={organizationId}
              initialValue={data.salesPrice}
              revenueId={data.rev?.id}
              readOnly={readOnly}
              queryClient={queryClient}
              rev={data.rev}
            />

            {/* Vendor Costs */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Costs</h4>
              <CostLine label="Concrete" amount={data.vendor.concrete} />
              {data.vendor.stone > 0 && <CostLine label="Stone / Gravel" amount={data.vendor.stone} />}
              {data.vendor.pump > 0 && <CostLine label="Pump" amount={data.vendor.pump} />}
              {data.vendor.inspection > 0 && <CostLine label="Inspection" amount={data.vendor.inspection} />}
              {/* Labor */}
              <div className="flex items-start justify-between py-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Labor</span>
                  {laborEntryCount > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {laborHours.toFixed(1)} hrs across {laborEntryCount} entries
                    </div>
                  )}
                  {(() => {
                    const sectionEntries = scheduleEntries.filter((e: any) => {
                      const s = e.phases?.pl_section;
                      return s === section || s === "both";
                    });
                    const crewMap = new Map<string, { name: string; rate: number }>();
                    sectionEntries.forEach((e: any) => {
                      if (e.crew_id && e.crews?.name && !crewMap.has(e.crew_id)) {
                        const rate = crewMemberRates
                          .filter((m: any) => m.crew_id === e.crew_id)
                          .reduce((sum: number, m: any) => sum + (m.hourly_rate ?? 0), 0);
                        if (rate > 0) {
                          crewMap.set(e.crew_id, { name: e.crews.name, rate });
                        }
                      }
                    });
                    if (crewMap.size === 0) return null;
                    return Array.from(crewMap.values()).map((c, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        @ ${c.rate.toFixed(2)}/hr ({c.name})
                      </div>
                    ));
                  })()}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {hasOverride && (
                      <span className="text-xs text-muted-foreground line-through">
                        {fmtTotal(data.labor)}
                      </span>
                    )}
                    {readOnly ? (
                      <span className={data.labor > 0 ? "text-foreground" : "text-muted-foreground"}>
                        {fmt(hasOverride ? (overrideValue ?? 0) : data.labor)}
                      </span>
                    ) : (
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={hasOverride ? (overrideValue ?? 0) : data.labor.toFixed(2)}
                          key={`${section}-${hasOverride}-${overrideValue}-${data.labor}`}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) return;
                            const sectionIds = scheduleEntries
                              .filter((se: any) => {
                                const s = se.phases?.pl_section;
                                return s === section || s === "both";
                              })
                              .map((se: any) => se.id);
                            if (sectionIds.length > 0) {
                              await supabase
                                .from("schedule_entries")
                                .update({ crew_labor_cost_override: null } as any)
                                .in("id", sectionIds);
                              await supabase
                                .from("schedule_entries")
                                .update({ crew_labor_cost_override: val } as any)
                                .eq("id", sectionIds[0]);
                              queryClient.invalidateQueries({
                                queryKey: ["pl-schedule-hours", projectId],
                              });
                            }
                          }}
                          className="h-7 text-sm pl-5 pr-2 text-right w-32 border border-input rounded-md bg-background"
                        />
                      </div>
                    )}
                  </div>
                  {hasOverride && !readOnly && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      onClick={async () => {
                        const sectionIds = scheduleEntries
                          .filter((se: any) => {
                            const s = se.phases?.pl_section;
                            return s === section || s === "both";
                          })
                          .map((se: any) => se.id);
                        if (sectionIds.length > 0) {
                          await supabase
                            .from("schedule_entries")
                            .update({ crew_labor_cost_override: null } as any)
                            .in("id", sectionIds);
                          queryClient.invalidateQueries({
                            queryKey: ["pl-schedule-hours", projectId],
                          });
                        }
                      }}
                    >
                      Reset to calculated
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Other Costs */}
            <OtherCostsSection
              section={section}
              projectId={projectId}
              organizationId={organizationId}
              costs={data.sectionOther}
              readOnly={readOnly}
              queryClient={queryClient}
            />

            {/* Totals */}
            <div className="border-t border-border pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Costs</span>
                <span className="font-medium text-foreground">{fmtTotal(data.totalCosts)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Profit</span>
                <span className={cn("font-bold", profitColor(data.grossProfit, data.salesPrice != null && data.salesPrice > 0))}>
                  {data.grossProfit != null ? fmtTotal(data.grossProfit) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span className={cn("font-bold", profitColor(data.grossProfit, data.salesPrice != null && data.salesPrice > 0))}>
                  {data.salesPrice && data.salesPrice > 0 ? pct(data.grossProfit ?? 0, data.salesPrice) : "—"}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ────────────────────────────────────────────────────────────────
// Cost Line
// ────────────────────────────────────────────────────────────────

function CostLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={amount > 0 ? "text-foreground" : "text-muted-foreground"}>{fmt(amount)}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sales Price Row (editable)
// ────────────────────────────────────────────────────────────────

function SalesPriceRow({
  section,
  projectId,
  organizationId,
  initialValue,
  revenueId,
  readOnly,
  queryClient,
  rev,
}: {
  section: Section;
  projectId: string | null;
  organizationId: string | null;
  initialValue: number | null;
  revenueId: string | undefined;
  readOnly: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
  rev: RevenueRow | undefined;
}) {
  const [baseHouse, setBaseHouse] = useState("");
  const [extras, setExtras] = useState("");
  const [status, setStatus] = useState<"idle" | "unsaved" | "saved">("idle");

  useEffect(() => {
    setBaseHouse((rev?.base_house ?? rev?.sales_price)?.toString() ?? "");
    setExtras(rev?.extras?.toString() ?? "");
    setStatus("idle");
  }, [rev]);

  const baseNum = parseFloat(baseHouse) || 0;
  const extrasNum = parseFloat(extras) || 0;
  const totalInvoice = baseNum + extrasNum;

  const handleSave = async () => {
    if (!projectId || !organizationId) return;
    const bh = parseFloat(baseHouse) || null;
    const ex = parseFloat(extras) || null;
    const sp = (bh ?? 0) + (ex ?? 0);

    try {
      const { error } = await supabase
        .from("project_pl_revenue")
        .upsert({
          ...(revenueId ? { id: revenueId } : {}),
          organization_id: organizationId,
          project_id: projectId,
          section,
          base_house: bh,
          extras: ex,
          sales_price: sp > 0 ? sp : null,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "project_id,section" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["pl-revenue", projectId] });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e: any) {
      toast.error(getUserFriendlyError(e));
      setStatus("unsaved");
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Base House</span>
          <span className="text-foreground">{rev?.base_house != null ? fmtTotal(rev.base_house) : "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Extras</span>
          <span className="text-foreground">{rev?.extras != null ? fmtTotal(rev.extras) : "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Invoice</span>
          <span className="font-semibold text-foreground">{initialValue != null ? fmtTotal(initialValue) : "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Base House</span>
        <div className="relative w-32">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={baseHouse}
            onChange={(e) => { setBaseHouse(e.target.value); setStatus("unsaved"); }}
            onBlur={handleSave}
            className="h-8 text-sm pl-6"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Extras</span>
        <div className="relative w-32">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={extras}
            onChange={(e) => { setExtras(e.target.value); setStatus("unsaved"); }}
            onBlur={handleSave}
            className="h-8 text-sm pl-6"
            placeholder="0.00"
          />
        </div>
        {status === "unsaved" && (
          <span className="text-xs text-yellow-500">Unsaved</span>
        )}
        {status === "saved" && (
          <span className="text-xs text-green-500 flex items-center gap-0.5">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Total Invoice</span>
        <span className="text-sm font-semibold text-foreground">
          {totalInvoice > 0 ? fmtTotal(totalInvoice) : "—"}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Other Costs Section
// ────────────────────────────────────────────────────────────────

function OtherCostsSection({
  section,
  projectId,
  organizationId,
  costs,
  readOnly,
  queryClient,
}: {
  section: Section;
  projectId: string | null;
  organizationId: string | null;
  costs: OtherCost[];
  readOnly: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pl-other-costs", projectId] });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !organizationId) throw new Error("Missing context");
      const { error } = await supabase.from("project_other_costs").insert({
        organization_id: organizationId,
        project_id: projectId,
        pl_section: section,
        description: "New cost",
        amount: 0,
        display_order: costs.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(getUserFriendlyError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_other_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Cost removed");
    },
    onError: (e: Error) => toast.error(getUserFriendlyError(e)),
  });

  const updateCost = async (id: string, updates: Partial<OtherCost>) => {
    const { error } = await supabase
      .from("project_other_costs")
      .update(updates as any)
      .eq("id", id);
    if (error) {
      toast.error(getUserFriendlyError(error));
    } else {
      invalidate();
    }
  };

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Other Costs</h4>
      {costs.map((cost) => (
        <OtherCostRow
          key={cost.id}
          cost={cost}
          readOnly={readOnly}
          onUpdate={updateCost}
          onDelete={() => deleteMutation.mutate(cost.id)}
        />
      ))}
      {costs.length === 0 && (
        <p className="text-xs text-muted-foreground">No other costs.</p>
      )}
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending}
          className="text-muted-foreground"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Cost
        </Button>
      )}
    </div>
  );
}

function OtherCostRow({
  cost,
  readOnly,
  onUpdate,
  onDelete,
}: {
  cost: OtherCost;
  readOnly: boolean;
  onUpdate: (id: string, updates: Partial<OtherCost>) => void;
  onDelete: () => void;
}) {
  const [desc, setDesc] = useState(cost.description);
  const [amount, setAmount] = useState(cost.amount?.toString() ?? "0");

  useEffect(() => {
    setDesc(cost.description);
    setAmount(cost.amount?.toString() ?? "0");
  }, [cost]);

  return (
    <div className="flex items-center gap-2">
      {readOnly ? (
        <>
          <span className="flex-1 text-sm text-muted-foreground">{cost.description}</span>
          <span className="text-sm text-foreground">{fmt(cost.amount)}</span>
        </>
      ) : (
        <>
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => {
              if (desc !== cost.description) onUpdate(cost.id, { description: desc });
            }}
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
        </>
      )}
    </div>
  );
}
