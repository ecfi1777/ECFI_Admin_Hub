import jsPDF from "jspdf";
import { format } from "date-fns";

interface Project {
  lot_number: string;
  full_address: string | null;
  county: string | null;
  permit_number: string | null;
  authorization_numbers: string | null;
  wall_height: string | null;
  basement_type: string | null;
  google_drive_url: string | null;
  notes: string | null;
  builders: { name: string; code: string | null } | null;
  locations: { name: string } | null;
  project_statuses: { name: string } | null;
}

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  crew_yards_poured: number | null;
  crew_notes: string | null;
  ready_mix_yards_billed: number | null;
  ready_mix_invoice_number: string | null;
  ready_mix_invoice_amount: number | null;
  concrete_notes: string | null;
  pump_invoice_number: string | null;
  pump_invoice_amount: number | null;
  pump_notes: string | null;
  inspection_invoice_number: string | null;
  inspection_amount: number | null;
  inspection_notes: string | null;
  notes: string | null;
  to_be_invoiced: boolean;
  invoice_complete: boolean;
  invoice_number: string | null;
  phases: { id: string; name: string } | null;
  crews: { id: string; name: string } | null;
  suppliers: { id: string; name: string; code: string | null } | null;
  pump_vendors: { id: string; name: string; code: string | null } | null;
  inspectors: { id: string; name: string } | null;
  inspection_types: { id: string; name: string } | null;
}

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === 0) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const phaseOrder = [
  "Footings",
  "Walls",
  "Prep Footings",
  "Strip Walls",
  "Flatwork",
  "Porch",
  "Driveway",
  "Sidewalk",
];

export function generateProjectPdf(project: Project, entries: ScheduleEntry[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkNewPage = (neededHeight: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`Project: ${project.lot_number}`, margin, y);
  y += 8;

  // Builder, Location, Status
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const headerParts: string[] = [];
  if (project.builders) {
    headerParts.push(project.builders.code || project.builders.name);
  }
  if (project.locations) {
    headerParts.push(project.locations.name);
  }
  if (project.project_statuses) {
    headerParts.push(`Status: ${project.project_statuses.name}`);
  }
  if (headerParts.length > 0) {
    doc.text(headerParts.join(" • "), margin, y);
    y += 8;
  }

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Project Details Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Project Details", margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const details: { label: string; value: string }[] = [];
  if (project.full_address) {
    details.push({ label: "Address", value: project.full_address });
  }
  if (project.county) {
    details.push({ label: "County", value: project.county });
  }
  if (project.permit_number) {
    details.push({ label: "Permit #", value: project.permit_number });
  }
  if (project.authorization_numbers) {
    details.push({ label: "Authorization #", value: project.authorization_numbers });
  }
  if (project.wall_height) {
    details.push({ label: "Wall Height", value: project.wall_height });
  }
  if (project.basement_type) {
    details.push({ label: "Basement Type", value: project.basement_type });
  }

  details.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${detail.label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, margin + 35, y);
    y += 5;
  });

  if (project.google_drive_url) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Google Drive:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 102, 204);
    doc.text(project.google_drive_url, margin + 35, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  if (project.notes) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(project.notes, contentWidth);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 4 + 2;
  }

  // Divider
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Schedule History Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Schedule History", margin, y);
  y += 8;

  // Group entries by phase
  const groupedByPhase = entries.reduce((acc, entry) => {
    const phaseName = entry.phases?.name || "Unassigned";
    if (!acc[phaseName]) {
      acc[phaseName] = [];
    }
    acc[phaseName].push(entry);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const sortedPhases = Object.keys(groupedByPhase).sort((a, b) => {
    const aIndex = phaseOrder.indexOf(a);
    const bIndex = phaseOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  sortedPhases.forEach((phaseName) => {
    checkNewPage(25);

    // Phase header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, contentWidth, 7, "F");
    doc.text(`${phaseName} (${groupedByPhase[phaseName].length} entries)`, margin + 2, y);
    y += 8;

    groupedByPhase[phaseName].forEach((entry) => {
      checkNewPage(45);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");

      // Date, Time, Crew
      const dateStr = format(new Date(entry.scheduled_date + "T00:00:00"), "MMM d, yyyy");
      const timeStr = entry.start_time ? ` @ ${entry.start_time.slice(0, 5)}` : "";
      const crewStr = entry.crews ? ` • Crew: ${entry.crews.name}` : "";
      doc.text(`${dateStr}${timeStr}${crewStr}`, margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Concrete Details
      if (entry.suppliers || entry.ready_mix_yards_billed || entry.ready_mix_invoice_number || entry.concrete_notes) {
        const concreteDetails: string[] = [];
        if (entry.suppliers) {
          concreteDetails.push(`Supplier: ${entry.suppliers.code || entry.suppliers.name}`);
        }
        if (entry.ready_mix_yards_billed) {
          concreteDetails.push(`Billed: ${entry.ready_mix_yards_billed} yds`);
        }
        if (entry.ready_mix_invoice_number) {
          concreteDetails.push(`Inv #: ${entry.ready_mix_invoice_number}`);
        }
        if (entry.ready_mix_invoice_amount) {
          concreteDetails.push(formatCurrency(entry.ready_mix_invoice_amount));
        }
        doc.text(`  Concrete: ${concreteDetails.join(" | ")}`, margin, y);
        y += 4;
        if (entry.concrete_notes) {
          const splitNotes = doc.splitTextToSize(`    Notes: ${entry.concrete_notes}`, contentWidth - 10);
          doc.text(splitNotes, margin, y);
          y += splitNotes.length * 3.5;
        }
      }

      // Pump Details
      if (entry.pump_vendors || entry.pump_invoice_number || entry.pump_notes) {
        const pumpDetails: string[] = [];
        if (entry.pump_vendors) {
          pumpDetails.push(`Vendor: ${entry.pump_vendors.code || entry.pump_vendors.name}`);
        }
        if (entry.pump_invoice_number) {
          pumpDetails.push(`Inv #: ${entry.pump_invoice_number}`);
        }
        if (entry.pump_invoice_amount) {
          pumpDetails.push(formatCurrency(entry.pump_invoice_amount));
        }
        doc.text(`  Pump: ${pumpDetails.join(" | ")}`, margin, y);
        y += 4;
        if (entry.pump_notes) {
          const splitNotes = doc.splitTextToSize(`    Notes: ${entry.pump_notes}`, contentWidth - 10);
          doc.text(splitNotes, margin, y);
          y += splitNotes.length * 3.5;
        }
      }

      // Inspection Details
      if (entry.inspection_types || entry.inspectors || entry.inspection_invoice_number || entry.inspection_notes) {
        const inspDetails: string[] = [];
        if (entry.inspection_types) {
          inspDetails.push(`Type: ${entry.inspection_types.name}`);
        }
        if (entry.inspectors) {
          inspDetails.push(`Inspector: ${entry.inspectors.name}`);
        }
        if (entry.inspection_invoice_number) {
          inspDetails.push(`Inv #: ${entry.inspection_invoice_number}`);
        }
        if (entry.inspection_amount) {
          inspDetails.push(formatCurrency(entry.inspection_amount));
        }
        doc.text(`  Inspection: ${inspDetails.join(" | ")}`, margin, y);
        y += 4;
        if (entry.inspection_notes) {
          const splitNotes = doc.splitTextToSize(`    Notes: ${entry.inspection_notes}`, contentWidth - 10);
          doc.text(splitNotes, margin, y);
          y += splitNotes.length * 3.5;
        }
      }

      // Crew Details
      if (entry.crew_yards_poured || entry.crew_notes) {
        const crewDetails: string[] = [];
        if (entry.crew_yards_poured) {
          crewDetails.push(`Yards Poured: ${entry.crew_yards_poured}`);
        }
        doc.text(`  Crew: ${crewDetails.join(" | ")}`, margin, y);
        y += 4;
        if (entry.crew_notes) {
          const splitNotes = doc.splitTextToSize(`    Notes: ${entry.crew_notes}`, contentWidth - 10);
          doc.text(splitNotes, margin, y);
          y += splitNotes.length * 3.5;
        }
      }

      // Invoice Status
      let invoiceStatus = "Not Invoiced";
      if (entry.invoice_complete) {
        invoiceStatus = `Invoice Complete${entry.invoice_number ? ` (#${entry.invoice_number})` : ""}`;
      } else if (entry.to_be_invoiced) {
        invoiceStatus = "To Be Invoiced";
      }
      doc.text(`  Invoice Status: ${invoiceStatus}`, margin, y);
      y += 6;
    });

    y += 4;
  });

  // Footer with generation date
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated: ${format(new Date(), "MMM d, yyyy h:mm a")} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `Project_${project.lot_number.replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
