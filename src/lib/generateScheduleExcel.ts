import ExcelJS from "exceljs";
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
  concrete_mix?: { name: string } | null;
  additive_hot_water?: boolean;
  additive_1_percent_he?: boolean;
  additive_2_percent_he?: boolean;
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
  notes?: string | null;
  to_be_invoiced?: boolean;
  invoice_complete?: boolean;
  invoice_number?: string | null;
}

const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: "Date", key: "date", width: 12 },
  { header: "Crew", key: "crew", width: 15 },
  { header: "Builder", key: "builder", width: 20 },
  { header: "Location", key: "location", width: 15 },
  { header: "Lot #", key: "lot", width: 10 },
  { header: "Phase", key: "phase", width: 15 },
  { header: "Supplier", key: "supplier", width: 20 },
  { header: "Qty Ordered", key: "qtyOrdered", width: 12 },
  { header: "Yards Billed", key: "yardsBilled", width: 12 },
  { header: "Concrete Invoice #", key: "concreteInvoiceNum", width: 18 },
  { header: "Concrete Invoice $", key: "concreteInvoiceAmt", width: 16 },
  { header: "Concrete Mix", key: "concreteMix", width: 20 },
  { header: "Hot Water", key: "hotWater", width: 10 },
  { header: "1% HE", key: "he1", width: 10 },
  { header: "2% HE", key: "he2", width: 10 },
  { header: "Concrete Notes", key: "concreteNotes", width: 30 },
  { header: "Pump Vendor", key: "pumpVendor", width: 20 },
  { header: "Pump Invoice #", key: "pumpInvoiceNum", width: 15 },
  { header: "Pump Invoice $", key: "pumpInvoiceAmt", width: 14 },
  { header: "Pump Notes", key: "pumpNotes", width: 30 },
  { header: "Inspection Type", key: "inspectionType", width: 18 },
  { header: "Inspector", key: "inspector", width: 15 },
  { header: "Inspection Invoice #", key: "inspectionInvoiceNum", width: 18 },
  { header: "Inspection Invoice $", key: "inspectionInvoiceAmt", width: 16 },
  { header: "Inspection Notes", key: "inspectionNotes", width: 30 },
  { header: "Yards Poured", key: "yardsPoured", width: 12 },
  { header: "Crew Notes", key: "crewNotes", width: 30 },
  { header: "Notes", key: "notes", width: 30 },
  { header: "Invoice Status", key: "invoiceStatus", width: 14 },
  { header: "Invoice #", key: "invoiceNumber", width: 15 },
];

function mapEntry(entry: ScheduleEntryExport): Record<string, unknown> {
  return {
    date: format(new Date(`${entry.scheduled_date}T00:00:00`), "MM/dd/yyyy"),
    crew: entry.crew?.name || "",
    builder: entry.project?.builder?.name || "",
    location: entry.project?.location?.name || "",
    lot: entry.project?.lot_number || "",
    phase: entry.phase?.name || "",
    supplier: entry.supplier?.name || "",
    qtyOrdered: entry.qty_ordered || "",
    yardsBilled: entry.ready_mix_yards_billed ?? "",
    concreteInvoiceNum: entry.ready_mix_invoice_number || "",
    concreteInvoiceAmt: entry.ready_mix_invoice_amount ?? "",
    concreteMix: entry.concrete_mix?.name || "",
    hotWater: entry.additive_hot_water ? "Yes" : "",
    he1: entry.additive_1_percent_he ? "Yes" : "",
    he2: entry.additive_2_percent_he ? "Yes" : "",
    concreteNotes: entry.concrete_notes || "",
    pumpVendor: entry.pump_vendor?.name || "",
    pumpInvoiceNum: entry.pump_invoice_number || "",
    pumpInvoiceAmt: entry.pump_invoice_amount ?? "",
    pumpNotes: entry.pump_notes || "",
    inspectionType: entry.inspection_type?.name || "",
    inspector: entry.inspector?.name || "",
    inspectionInvoiceNum: entry.inspection_invoice_number || "",
    inspectionInvoiceAmt: entry.inspection_amount ?? "",
    inspectionNotes: entry.inspection_notes || "",
    yardsPoured: entry.crew_yards_poured ?? "",
    crewNotes: entry.crew_notes || "",
    notes: entry.notes || "",
    invoiceStatus: entry.invoice_complete
      ? "Complete"
      : entry.to_be_invoiced
        ? "Pending"
        : "",
    invoiceNumber: entry.invoice_number || "",
  };
}

export async function generateScheduleExcel(
  entries: ScheduleEntryExport[],
  month: number,
  year: number
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Schedule");

  worksheet.columns = COLUMNS;

  for (const entry of entries) {
    worksheet.addRow(mapEntry(entry));
  }

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const monthStr = String(month).padStart(2, "0");
  const filename = `ECFI_Schedule_Backup_${year}-${monthStr}.xlsx`;

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
