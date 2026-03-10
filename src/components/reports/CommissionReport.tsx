import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
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
  crewId: string;
  crewName: string;
  builder: string;
  subdivision: string;
  lotNumber: string;
  ftgDate: string | null;
  ftgTotal: number | null;
  wallDate: string | null;
  wallTotal: number | null;
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

export function CommissionReport({ month, year, organizationId }: CommissionReportProps) {
  const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const [isExporting, setIsExporting] = useState(false);

  // ── Step 1: F&W schedule entries ──
  const { data: rawEntries, isLoading: loadingEntries } = useQuery({
    queryKey: ["commission-report-entries", organizationId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id, scheduled_date, crew_id, crew_yards_poured,
          ready_mix_invoice_amount, project_id,
          crews(id, name),
          phases(pl_section, phase_type),
          projects!inner(
            id, lot_number,
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
        return s === "footings_walls" || s === "both";
      });
    },
  });

  const fwEntries = rawEntries || [];
  const projectIds = useMemo(
    () => [...new Set(fwEntries.map((e: any) => e.project_id).filter(Boolean))],
    [fwEntries]
  );

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
        .select("project_id, amount, pl_section")
        .in("project_id", projectIds)
        .eq("pl_section", "footings_walls");
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const isLoading = loadingEntries || loadingRevenue || loadingCommissions || loadingOther;

  // ── Build rows ──
  const { crewGroups, grandTotals } = useMemo(() => {
    if (!fwEntries.length) return { crewGroups: [], grandTotals: null };

    const revenue = revenueData || [];
    const commissions = commissionsData || [];
    const otherCosts = otherCostsData || [];

    // Group entries by project
    const projectMap = new Map<string, any[]>();
    fwEntries.forEach((e: any) => {
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
      const wallEntry = entries.find((e: any) => e.phases?.phase_type === "wall");

      const totalYards = entries.reduce((s: number, e: any) => s + (e.crew_yards_poured ?? 0), 0);
      const concreteCost = entries.reduce((s: number, e: any) => s + (e.ready_mix_invoice_amount ?? 0), 0);

      const rev = revenue.find((r: any) => r.project_id === pid);
      const baseHouse = (rev as any)?.base_house ?? 0;
      const extras = (rev as any)?.extras ?? 0;
      const totalInvoice = baseHouse + extras;

      const projOtherCosts = otherCosts
        .filter((c: any) => c.project_id === pid)
        .reduce((s: number, c: any) => s + (c.amount ?? 0), 0);

      const comm = commissions.find((c: any) => c.project_id === pid && c.crew_id === crewId);

      let laborAllow = 0;
      if (comm?.override_amount != null) {
        laborAllow = comm.override_amount;
      } else if (comm?.calc_method === "per_cy" && comm?.rate_per_cy) {
        laborAllow = totalYards * comm.rate_per_cy;
      } else if (comm?.calc_method === "pct_invoice" && comm?.pct_of_invoice) {
        laborAllow = totalInvoice * (comm.pct_of_invoice / 100);
      }

      const cogs = concreteCost + projOtherCosts + laborAllow;
      const gross = totalInvoice - cogs;

      rows.push({
        crewId,
        crewName,
        builder: project?.builders?.code || project?.builders?.name || "",
        subdivision: project?.locations?.name || "",
        lotNumber: project?.lot_number || "",
        ftgDate: ftgEntry?.scheduled_date ?? null,
        ftgTotal: ftgEntry?.crew_yards_poured ?? null,
        wallDate: wallEntry?.scheduled_date ?? null,
        wallTotal: wallEntry?.crew_yards_poured ?? null,
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

    return { crewGroups, grandTotals: null };
  }, [fwEntries, revenueData, commissionsData, otherCostsData]);

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

  if (fwEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
        <p>No Footings & Walls entries found for {MONTH_NAMES[month]} {year}.</p>
        <p>Make sure schedule entries exist for this month and phases are tagged with Phase Type in Settings → Phases.</p>
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

      {crewGroups.map((group, gi) => (
        <div key={group.crewId}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                {/* Crew header */}
                <tr className="bg-amber-500/20">
                  <td colSpan={COLUMNS.length} className="px-3 py-2 font-bold text-foreground text-sm">
                    Crew {group.crewName}
                  </td>
                </tr>
                {/* Column headers */}
                <tr className="bg-muted">
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
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.crewName}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.builder}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.subdivision}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.lotNumber}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(r.ftgDate)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtYards(r.ftgTotal)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(r.wallDate)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtYards(r.wallTotal)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.baseHouse)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.extras)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">{fmtCurrency(r.totalInvoice)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtYards(r.totalYards)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.concreteCost)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.otherCosts)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtPct(r.otherPct)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.laborAllow)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtPct(r.laborPct)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.laborPerYd)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtCurrency(r.cogs)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">{fmtCurrency(r.gross)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{fmtPct(r.grossPct)}</td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="border-t-2 border-foreground/20 font-bold bg-muted/50">
                  <td colSpan={8} className="px-2 py-1.5 whitespace-nowrap">
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
                  <td colSpan={8} className="px-2 py-1"></td>
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
    </div>
  );
}
