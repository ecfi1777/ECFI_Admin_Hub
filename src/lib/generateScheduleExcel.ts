import * as XLSX from "xlsx";
import { format } from "date-fns";

interface ScheduleEntryExport {
  scheduled_date: string;
  crew?: { name: string } | null;
  project?: {
    lot_number: string;
    builder?: { name: string; code?: string | null } | null;
    location?: { name: string } | null;
  } | null;
  phase?: { name: string } | null;
  supplier?: { name: string; code?: string | null } | null;
  qty_ordered?: string | null;
  ready_mix_yards_billed?: number | null;
  ready_mix_invoice_number?: string | null;
  ready_mix_invoice_amount?: number | null;
  concrete_notes?: string | null;
  pump_vendor?: { name: string; code?: string | null } | null;
  pump_invoice_number?: string | null;
  pump_invoice_amount?: number | null;
  pump_notes?: string | null;
  inspection_type?: { name: string } | null;
  inspector?: { name: string } | null;
  inspection_invoice_number?: string | null;
  inspection_amount?: number | null;
  inspection_notes?: string | null;
  crew_yards_poured?: number | null;
  crew_notes?: string | null;
  to_be_invoiced?: boolean;
  invoice_complete?: boolean;
  invoice_number?: string | null;
}

export function generateScheduleExcel(
  entries: ScheduleEntryExport[],
  month: number,
  year: number
): void {
  // Transform data for Excel
  const excelData = entries.map((entry) => ({
    "Date": format(new Date(`${entry.scheduled_date}T00:00:00`), "MM/dd/yyyy"),
    "Crew": entry.crew?.name || "",
    "Builder": entry.project?.builder?.name || "",
    "Location": entry.project?.location?.name || "",
    "Lot #": entry.project?.lot_number || "",
    "Phase": entry.phase?.name || "",
    // Concrete
    "Supplier": entry.supplier?.name || "",
    "Qty Ordered": entry.qty_ordered || "",
    "Yards Billed": entry.ready_mix_yards_billed || "",
    "Concrete Invoice #": entry.ready_mix_invoice_number || "",
    "Concrete Invoice $": entry.ready_mix_invoice_amount || "",
    "Concrete Notes": entry.concrete_notes || "",
    // Pump
    "Pump Vendor": entry.pump_vendor?.name || "",
    "Pump Invoice #": entry.pump_invoice_number || "",
    "Pump Invoice $": entry.pump_invoice_amount || "",
    "Pump Notes": entry.pump_notes || "",
    // Inspection
    "Inspection Type": entry.inspection_type?.name || "",
    "Inspector": entry.inspector?.name || "",
    "Inspection Invoice #": entry.inspection_invoice_number || "",
    "Inspection Invoice $": entry.inspection_amount || "",
    "Inspection Notes": entry.inspection_notes || "",
    // Crew
    "Yards Poured": entry.crew_yards_poured || "",
    "Crew Notes": entry.crew_notes || "",
    // Invoice Status
    "Invoice Status": entry.invoice_complete
      ? "Complete"
      : entry.to_be_invoiced
      ? "Pending"
      : "",
    "Invoice #": entry.invoice_number || "",
  }));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 15 }, // Crew
    { wch: 20 }, // Builder
    { wch: 15 }, // Location
    { wch: 10 }, // Lot #
    { wch: 15 }, // Phase
    { wch: 20 }, // Supplier
    { wch: 12 }, // Qty Ordered
    { wch: 12 }, // Yards Billed
    { wch: 18 }, // Concrete Invoice #
    { wch: 16 }, // Concrete Invoice $
    { wch: 30 }, // Concrete Notes
    { wch: 20 }, // Pump Vendor
    { wch: 15 }, // Pump Invoice #
    { wch: 14 }, // Pump Invoice $
    { wch: 30 }, // Pump Notes
    { wch: 18 }, // Inspection Type
    { wch: 15 }, // Inspector
    { wch: 18 }, // Inspection Invoice #
    { wch: 16 }, // Inspection Invoice $
    { wch: 30 }, // Inspection Notes
    { wch: 12 }, // Yards Poured
    { wch: 30 }, // Crew Notes
    { wch: 14 }, // Invoice Status
    { wch: 15 }, // Invoice #
  ];
  worksheet["!cols"] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");

  // Generate filename
  const monthStr = String(month).padStart(2, "0");
  const filename = `ECFI_Schedule_Backup_${year}-${monthStr}.xlsx`;

  // Download the file
  XLSX.writeFile(workbook, filename);
}
