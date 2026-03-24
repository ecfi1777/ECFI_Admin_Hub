import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, EyeOff, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { cn } from "@/lib/utils";

interface CommissionReportProps {
  month: number;
  year: number;
  organizationId: string;
}

// ── Formatters ──
const fmtCurrency = (val: number | null | undefined): string =>
  val != null
    ? `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtPct = (val: number | null | undefined): string =>
  val != null ? `${(val * 100).toFixed(2)}%` : "—";

const fmtYards = (val: number | null | undefined): string =>
  val != null ? val.toFixed(1) : "—";

const fmtDate = (val: string | null | undefined): string => {
  if (!val) return "—";
  try {
    return format(parseISO(val), "M/d/yyyy");
  } catch {
    return "—";
  }
};

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Column definitions ──
const COLUMNS = [
  "Crew", "Builder", "Subdivision", "Lot #", "Ftg Date", "Ftg Total",
  "Wall Date", "Wall Total", "Base House", "Extras", "Total Invoice",
  "Total Yds", "Concrete $", "Other $", "Other %", "Labor Allow.",
  "Labor %", "Labor $/YD", "COGS", "Gross $", "Gross %",
];

interface ProjectRow {
  projectId: string;
  crewId: string;
  crewName: string;
  builder: string;
  subdivision: string;
  lotNumber: string;
  ftgDate: string | null;
  ftgTotal: number | null;
  ftgEntryId: string | null;
  wallDate: string | null;
  wallTotal: number | null;
  wallEntryId: string | null;
  baseHouse: number;
  extras: number;
  totalInvoice: number;
  totalYards: number;
  concreteCost: number;
  otherCosts: number;
  otherPct: number | null;
  laborAllow: number;
  laborPct: number | null;
  laborPerYd: number | null;
  cogs: number;
  gross: number;
  grossPct: number | null;
}

// ── Editable Cell ──
function EditableCell({
  value,
  onSave,
  prefix = "$",
  decimals = 2,
}: {
  value: number | null | undefined;
  onSave: (v: number | null) => void;
  prefix?: string;
  decimals?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onSave(draft === "" ? null : parseFloat(draft));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value?.toString() ?? "");
            setEditing(false);
          }
        }}
        className="w-24 h-6 px-1 text-right text-xs border border-primary rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <span
      onClick={() => {
        setDraft(value?.toString() ?? "");
        setEditing(true);
      }}
      title="Click to edit"
      className="cursor-pointer hover:text-primary hover:underline decoration-dashed underline-offset-2 transition-colors"
    >
      {prefix}
      {value != null
        ? Number(value).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : "—"}
    </span>
  );
}

export function CommissionReport({ month, year, organizationId }: CommissionReportProps) {
  const queryClient = useQueryClient();
  const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const [isExporting, setIsExporting] = useState(false);

  const excludeMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ exclude_from_commission: true })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-report-wall-anchor"] });
      queryClient.invalidateQueries({ queryKey: ["commission-report-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["commission-report-excluded"] });
      toast.success("Project excluded from commission report");
    },
    onError: () => {
      toast.error("Failed to exclude project");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ exclude_from_commission: false })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-report-wall-anchor"] });
      queryClient.invalidateQueries({ queryKey: ["commission-report-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["commission-report-excluded"] });
      toast.success("Project restored to commission report");
    },
    onError: () => {
      toast.error("Failed to restore project");
    },
  });
  const [overrides, setOverrides] = useState<Record<string, {
    base_house?: number | null;
    extras?: number | null;
    other_costs?: number | null;
    labor_allow?: number | null;
    ftg_total?: number | null;
    wall_total?: number | null;
  }>>({});

  // ── Step 1: Wall-anchor entries (only wall phases in selected month) ──
  const { data: rawWallEntries, isLoading: loadingWallEntries } = useQuery({
    queryKey: ["commission-report-wall-anchor", organizationId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_id, crew_yards_poured,
          ready_mix_invoice_amount, project_id,
          crews(id, name),
          phases(pl_section, phase_type),
          projects!inner(
            id, lot_number, exclude_from_commission,
            builders(name, code),
            locations(name)
          )
        `)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);
      if (error) throw error;
      return (data || []).filter((e: any) => {
        const s = e.phases?.pl_section;
        return (s === "footings_walls" || s === "both") && e.phases?.phase_type === "wall";
      }).filter((e: any) => !e.projects?.exclude_from_commission);
    },
  });

  const wallAnchorEntries = rawWallEntries || [];
  const projectIds = useMemo(
    () => [...new Set(wallAnchorEntries.map((e: any) => e.project_id).filter(Boolean))],
    [wallAnchorEntries]
  );

  // ── Step 1b: All F&W entries for qualifying projects (no date filter) ──
  const { data: rawAllEntries, isLoading: loadingAllEntries } = useQuery({
    queryKey: ["commission-report-all-entries", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_id, crew_yards_poured,
          ready_mix_invoice_amount, project_id,
          crews(id, name),
          phases(pl_section, phase_type),
          projects!inner(
            id, lot_number, exclude_from_commission,
            builders(name, code),
            locations(name)
          )
        `)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .in("project_id", projectIds);
      if (error) throw error;
      return (data || []).filter((e: any) => {
        const s = e.phases?.pl_section;
        return s === "footings_walls" || s === "both";
      });
    },
    enabled: projectIds.length > 0,
  });

  const allProjectEntries = rawAllEntries || [];

  // ── Step 2: Revenue, commissions, other costs ──
  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ["commission-report-revenue", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_pl_revenue")
        .select("project_id, section, base_house, extras, sales_price")
        .in("project_id", projectIds)
        .eq("section", "footings_walls");
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const { data: commissionsData, isLoading: loadingCommissions } = useQuery({
    queryKey: ["commission-report-commissions", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_commissions")
        .select("*")
        .in("project_id", projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const { data: otherCostsData, isLoading: loadingOther } = useQuery({
    queryKey: ["commission-report-other-costs", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_other_costs")
        .select("project_id, amount, pl_section, id, description")
        .in("project_id", projectIds)
        .eq("pl_section", "footings_walls");
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  // ── Excluded projects for this month (wall entries exist but project is excluded) ──
  const { data: excludedProjects } = useQuery({
    queryKey: ["commission-report-excluded", organizationId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          project_id,
          phases(pl_section, phase_type),
          projects!inner(
            id, lot_number, exclude_from_commission,
            builders(name, code),
            locations(name)
          )
        `)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);
      if (error) throw error;
      // Keep only wall entries for excluded projects
      const wallExcluded = (data || []).filter((e: any) => {
        const s = e.phases?.pl_section;
        return (s === "footings_walls" || s === "both") &&
          e.phases?.phase_type === "wall" &&
          e.projects?.exclude_from_commission === true;
      });
      // Deduplicate by project_id
      const seen = new Set<string>();
      return wallExcluded.filter((e: any) => {
        if (seen.has(e.project_id)) return false;
        seen.add(e.project_id);
        return true;
      });
    },
  });

  const isLoading = loadingWallEntries || loadingAllEntries || loadingRevenue || loadingCommissions || loadingOther;

  // ── Save handlers ──
  const handleSave = async (
    projectId: string,
    field: "base_house" | "extras" | "other_costs" | "labor_allow" | "ftg_total" | "wall_total",
    value: number | null,
    crewId: string,
    entryId?: string | null
  ) => {
    // Update local overrides immediately
    setOverrides((prev) => ({
      ...prev,
      [projectId]: { ...prev[projectId], [field]: value },
    }));

    try {
      if (field === "base_house" || field === "extras") {
        // Get current values from overrides or fetched data
        const rev = (revenueData || []).find((r: any) => r.project_id === projectId);
        const currentOverrides = overrides[projectId] || {};
        const newBaseHouse = field === "base_house"
          ? value ?? 0
          : currentOverrides.base_house ?? (rev as any)?.base_house ?? 0;
        const newExtras = field === "extras"
          ? value ?? 0
          : currentOverrides.extras ?? (rev as any)?.extras ?? 0;

        const { error } = await supabase.from("project_pl_revenue").upsert(
          {
            organization_id: organizationId,
            project_id: projectId,
            section: "footings_walls" as any,
            base_house: newBaseHouse,
            extras: newExtras,
            sales_price: (newBaseHouse ?? 0) + (newExtras ?? 0),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id,section" }
        );
        if (error) throw error;
        toast.success("Saved");
      } else if (field === "other_costs") {
        // Find existing "Other" row or create one
        const existing = (otherCostsData || []).find(
          (c: any) => c.project_id === projectId && c.description === "Other"
        );
        if (existing) {
          const { error } = await supabase
            .from("project_other_costs")
            .update({ amount: value ?? 0, updated_at: new Date().toISOString() })
            .eq("id", (existing as any).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("project_other_costs").insert({
            organization_id: organizationId,
            project_id: projectId,
            description: "Other",
            pl_section: "footings_walls" as any,
            amount: value ?? 0,
            display_order: 0,
          });
          if (error) throw error;
        }
        toast.success("Saved");
      } else if (field === "labor_allow") {
        const comm = (commissionsData || []).find(
          (c: any) => c.project_id === projectId && c.crew_id === crewId
        );
        const { error } = await supabase.from("project_commissions").upsert(
          {
            organization_id: organizationId,
            project_id: projectId,
            crew_id: crewId,
            override_amount: value,
            calc_method: (comm?.calc_method ?? "per_cy") as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id,crew_id" }
        );
        if (error) throw error;
        toast.success("Saved");
      } else if (field === "ftg_total" || field === "wall_total") {
        if (!entryId) {
          toast.error("No schedule entry found to update");
          return;
        }
        const { error } = await supabase
          .from("schedule_entries")
          .update({ crew_yards_poured: value ?? 0 })
          .eq("id", entryId);
        if (error) throw error;
        toast.success("Saved");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    }
  };

  // ── Build rows ──
  // Build lookup: projectId → array of other cost rows (for multi-row detection)
  const otherCostRows = useMemo(() => {
    const map: Record<string, any[]> = {};
    (otherCostsData || []).forEach((c: any) => {
      if (!map[c.project_id]) map[c.project_id] = [];
      map[c.project_id].push(c);
    });
    return map;
  }, [otherCostsData]);

  const { crewGroups } = useMemo(() => {
    if (!allProjectEntries.length) return { crewGroups: [] };

    const revenue = revenueData || [];
    const commissions = commissionsData || [];
    const otherCosts = otherCostsData || [];

    // Group entries by project
    const projectMap = new Map<string, any[]>();
    allProjectEntries.forEach((e: any) => {
      const pid = e.project_id;
      if (!projectMap.has(pid)) projectMap.set(pid, []);
      projectMap.get(pid)!.push(e);
    });

    const rows: ProjectRow[] = [];

    projectMap.forEach((entries, pid) => {
      const first = entries[0];
      const project = first.projects;
      const crewEntry = entries.find((e: any) => e.crew_id);
      const crewId = crewEntry?.crew_id ?? "unknown";
      const crewName = crewEntry?.crews?.name ?? "Unknown";

      const ftgEntry = entries.find((e: any) => e.phases?.phase_type === "footing");

      // Aggregate all wall entries: use last date, sum yards
      const wallEntries = entries
        .filter((e: any) => e.phases?.phase_type === "wall")
        .sort((a: any, b: any) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));
      const lastWallEntry = wallEntries.length > 0 ? wallEntries[wallEntries.length - 1] : null;
      const aggregatedWallYards = wallEntries.reduce(
        (s: number, e: any) => s + (e.crew_yards_poured ?? 0),
        0
      );

      const ov = overrides[pid];
      const ftgYards = ov?.ftg_total ?? ftgEntry?.crew_yards_poured ?? null;
      const wallYards = ov?.wall_total ?? (wallEntries.length > 0 ? aggregatedWallYards : null);
      const totalYards = (ftgYards ?? 0) + (wallYards ?? 0);
      const concreteCost = entries.reduce((s: number, e: any) => s + (e.ready_mix_invoice_amount ?? 0), 0);

      const rev = revenue.find((r: any) => r.project_id === pid);
      const baseHouse = ov?.base_house ?? (rev as any)?.base_house ?? 0;
      const extras = ov?.extras ?? (rev as any)?.extras ?? 0;
      const totalInvoice = baseHouse + extras;

      const projOtherCosts = ov?.other_costs ??
        otherCosts
          .filter((c: any) => c.project_id === pid)
          .reduce((s: number, c: any) => s + (c.amount ?? 0), 0);

      const comm = commissions.find((c: any) => c.project_id === pid && c.crew_id === crewId);

      let laborAllow = 0;
      if (ov?.labor_allow != null) {
        laborAllow = ov.labor_allow;
      } else if (comm?.override_amount != null) {
        laborAllow = comm.override_amount;
      } else if (comm?.calc_method === "per_cy" && comm?.rate_per_cy) {
        laborAllow = totalYards * comm.rate_per_cy;
      } else if (comm?.calc_method === "pct_invoice" && comm?.pct_of_invoice) {
        laborAllow = totalInvoice * (comm.pct_of_invoice / 100);
      }

      const cogs = concreteCost + projOtherCosts + laborAllow;
      const gross = totalInvoice - cogs;

      rows.push({
        projectId: pid,
        crewId,
        crewName,
        builder: project?.builders?.code || project?.builders?.name || "",
        subdivision: project?.locations?.name || "",
        lotNumber: project?.lot_number || "",
        ftgDate: ftgEntry?.scheduled_date ?? null,
        ftgTotal: ftgYards,
        ftgEntryId: ftgEntry?.id ?? null,
        wallDate: lastWallEntry?.scheduled_date ?? null,
        wallTotal: wallYards,
        wallEntryId: lastWallEntry?.id ?? null,
        baseHouse,
        extras,
        totalInvoice,
        totalYards,
        concreteCost,
        otherCosts: projOtherCosts,
        otherPct: totalInvoice > 0 ? projOtherCosts / totalInvoice : null,
        laborAllow,
        laborPct: totalInvoice > 0 ? laborAllow / totalInvoice : null,
        laborPerYd: totalYards > 0 ? laborAllow / totalYards : null,
        cogs,
        gross,
        grossPct: totalInvoice > 0 ? gross / totalInvoice : null,
      });
    });

    // Group by crew
    const grouped = new Map<string, { crewName: string; rows: ProjectRow[] }>();
    rows.forEach((r) => {
      if (!grouped.has(r.crewId)) grouped.set(r.crewId, { crewName: r.crewName, rows: [] });
      grouped.get(r.crewId)!.rows.push(r);
    });

    const crewGroups = Array.from(grouped.entries()).map(([crewId, g]) => {
      const totals = g.rows.reduce(
        (t, r) => ({
          baseHouse: t.baseHouse + r.baseHouse,
          extras: t.extras + r.extras,
          totalInvoice: t.totalInvoice + r.totalInvoice,
          totalYards: t.totalYards + r.totalYards,
          concreteCost: t.concreteCost + r.concreteCost,
          otherCosts: t.otherCosts + r.otherCosts,
          laborAllow: t.laborAllow + r.laborAllow,
          cogs: t.cogs + r.cogs,
          gross: t.gross + r.gross,
        }),
        { baseHouse: 0, extras: 0, totalInvoice: 0, totalYards: 0, concreteCost: 0, otherCosts: 0, laborAllow: 0, cogs: 0, gross: 0 }
      );
      return { crewId, crewName: g.crewName, rows: g.rows, totals };
    });

    return { crewGroups };
  }, [allProjectEntries, revenueData, commissionsData, otherCostsData, overrides]);

  // ── Export to Excel ──
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Commission Report");

      const currencyFmt = '$#,##0.00';
      const pctFmt = '0.00%';

      for (const group of crewGroups) {
        // Crew header row
        const headerRow = sheet.addRow([`Crew ${group.crewName}`]);
        headerRow.font = { bold: true, size: 12 };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5E6CC" } };
        sheet.mergeCells(headerRow.number, 1, headerRow.number, COLUMNS.length);

        // Column headers
        const colRow = sheet.addRow(COLUMNS);
        colRow.font = { bold: true, size: 9 };
        colRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
        });

        // Data rows
        for (const r of group.rows) {
          const row = sheet.addRow([
            r.crewName, r.builder, r.subdivision, r.lotNumber,
            fmtDate(r.ftgDate), r.ftgTotal, fmtDate(r.wallDate), r.wallTotal,
            r.baseHouse, r.extras, r.totalInvoice,
            r.totalYards, r.concreteCost, r.otherCosts,
            r.otherPct, r.laborAllow, r.laborPct, r.laborPerYd,
            r.cogs, r.gross, r.grossPct,
          ]);
          row.font = { size: 9 };
          // Currency format
          [9, 10, 11, 13, 14, 16, 18, 19, 20].forEach((col) => {
            row.getCell(col).numFmt = currencyFmt;
          });
          // Pct format
          [15, 17, 21].forEach((col) => {
            row.getCell(col).numFmt = pctFmt;
          });
        }

        // Totals row
        const t = group.totals;
        const totRow = sheet.addRow([
          `Total - Crew ${group.crewName}:`, "", "", "", "", "",
          "", "", t.baseHouse, t.extras, t.totalInvoice,
          t.totalYards, t.concreteCost, t.otherCosts,
          t.totalInvoice > 0 ? t.otherCosts / t.totalInvoice : null,
          t.laborAllow,
          t.totalInvoice > 0 ? t.laborAllow / t.totalInvoice : null,
          t.totalYards > 0 ? t.laborAllow / t.totalYards : null,
          t.cogs, t.gross, "—",
        ]);
        totRow.font = { bold: true, size: 9 };
        [9, 10, 11, 13, 14, 16, 18, 19, 20].forEach((col) => {
          totRow.getCell(col).numFmt = currencyFmt;
        });
        [15, 17].forEach((col) => {
          totRow.getCell(col).numFmt = pctFmt;
        });

        // Blank spacer
        sheet.addRow([]);
      }

      // Auto-width columns
      sheet.columns.forEach((col) => {
        col.width = 14;
      });
      if (sheet.columns[0]) sheet.columns[0].width = 20;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Commission_Report_${MONTH_NAMES[month]}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading commission data...
      </div>
    );
  }

  if (wallAnchorEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
        <p>No wall entries found for {MONTH_NAMES[month]} {year}.</p>
        <p>Projects appear in the month their wall phase is scheduled. Make sure phases are tagged with Phase Type in Settings → Phases.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Commission Report — {MONTH_NAMES[month]} {year}
        </h2>
        <Button onClick={handleExport} disabled={isExporting} size="sm">
          {isExporting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" />Export to Excel</>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        Click Ftg Total, Wall Total, Base House, Extras, Other $, or Labor Allow. cells to edit — changes save automatically.
      </p>

      {crewGroups.map((group, gi) => (
        <div key={group.crewId}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                {/* Crew header */}
                <tr className="bg-amber-500/20">
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-2 font-bold text-foreground text-sm">
                    Crew {group.crewName}
                  </td>
                </tr>
                {/* Column headers */}
                <tr className="bg-muted">
                  <th className="px-1 py-1.5 w-8"></th>
                  {COLUMNS.map((col) => (
                    <th key={col} className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-border hover:bg-muted/30">
                    <td className="px-1 py-1.5 text-center">
                      <button
                        onClick={() => excludeMutation.mutate(r.projectId)}
                        disabled={excludeMutation.isPending}
                        title="Exclude from commission report"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.crewName}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.builder}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.subdivision}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.lotNumber}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(r.ftgDate)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <EditableCell
                        value={r.ftgTotal}
                        onSave={(v) => handleSave(r.projectId, "ftg_total", v, r.crewId, r.ftgEntryId)}
                        prefix=""
                        decimals={1}
                      />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(r.wallDate)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <EditableCell
                        value={r.wallTotal}
                        onSave={(v) => handleSave(r.projectId, "wall_total", v, r.crewId, r.wallEntryId)}
                        prefix=""
                        decimals={1}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <EditableCell
                        value={r.baseHouse}
                        onSave={(v) => handleSave(r.projectId, "base_house", v, r.crewId)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <EditableCell
                        value={r.extras}
                        onSave={(v) => handleSave(r.projectId, "extras", v, r.crewId)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">{fmtCurrency(r.totalInvoice)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtYards(r.totalYards)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.concreteCost)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      {(otherCostRows[r.projectId]?.length ?? 0) > 1 ? (
                        <span
                          title="Multiple itemized costs exist — edit on Commission tab"
                          className="text-muted-foreground cursor-help border-b border-dashed border-muted-foreground"
                        >
                          {fmtCurrency(r.otherCosts)}
                        </span>
                      ) : (
                        <EditableCell
                          value={r.otherCosts}
                          onSave={(v) => handleSave(r.projectId, "other_costs", v, r.crewId)}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtPct(r.otherPct)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <EditableCell
                        value={r.laborAllow}
                        onSave={(v) => handleSave(r.projectId, "labor_allow", v, r.crewId)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtPct(r.laborPct)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.laborPerYd)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.cogs)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">{fmtCurrency(r.gross)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtPct(r.grossPct)}</td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="border-t-2 border-foreground/20 font-bold bg-muted/50">
                  <td colSpan={9} className="px-2 py-1.5 whitespace-nowrap">
                    Total - Crew {group.crewName}:
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.baseHouse)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.extras)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.totalInvoice)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtYards(group.totals.totalYards)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.concreteCost)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.otherCosts)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.otherCosts / group.totals.totalInvoice) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.laborAllow)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.laborAllow / group.totals.totalInvoice) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {group.totals.totalYards > 0 ? fmtCurrency(group.totals.laborAllow / group.totals.totalYards) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.cogs)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(group.totals.gross)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">—</td>
                </tr>

                {/* Percentages row */}
                <tr className="text-muted-foreground italic text-xs">
                  <td colSpan={9} className="px-2 py-1"></td>
                  <td colSpan={2} className="px-2 py-1"></td>
                  <td className="px-2 py-1 text-right">100%</td>
                  <td className="px-2 py-1 text-right">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.totalYards / group.totals.totalInvoice) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.concreteCost / group.totals.totalInvoice) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.otherCosts / group.totals.totalInvoice) : "—"}
                  </td>
                  <td className="px-2 py-1"></td>
                  <td className="px-2 py-1 text-right">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.laborAllow / group.totals.totalInvoice) : "—"}
                  </td>
                  <td colSpan={2} className="px-2 py-1"></td>
                  <td className="px-2 py-1 text-right">
                    {group.totals.totalInvoice > 0 ? fmtPct(group.totals.cogs / group.totals.totalInvoice) : "—"}
                  </td>
                  <td colSpan={2} className="px-2 py-1"></td>
                </tr>
              </tbody>
            </table>
          </div>
          {gi < crewGroups.length - 1 && <div className="py-3" />}
        </div>
      ))}

      {/* Excluded projects section */}
      {(excludedProjects?.length ?? 0) > 0 && (
        <div className="mt-6 border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Excluded Projects ({excludedProjects!.length})
          </h3>
          <div className="space-y-2">
            {excludedProjects!.map((entry: any) => (
              <div
                key={entry.project_id}
                className="flex items-center justify-between text-sm py-1.5 px-3 rounded bg-muted/30 border border-border"
              >
                <span className="text-foreground">
                  {entry.projects?.locations?.name && (
                    <span className="text-muted-foreground">{entry.projects.locations.name} — </span>
                  )}
                  Lot {entry.projects?.lot_number}
                  {entry.projects?.builders?.name && (
                    <span className="text-muted-foreground"> ({entry.projects.builders.code || entry.projects.builders.name})</span>
                  )}
                </span>
                <button
                  onClick={() => restoreMutation.mutate(entry.project_id)}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
