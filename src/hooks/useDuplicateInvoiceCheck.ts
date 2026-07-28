/**
 * Advisory duplicate invoice-number check for schedule entries.
 * Plain async function (runs on save, not on render).
 */

import { supabase } from "@/integrations/supabase/client";

export type InvoiceConflict = {
  label: string; // "concrete" | "pump" | "inspection" | "sub"
  value: string; // the trimmed invoice number that collided
};

type InvoiceValues = {
  concrete?: string;
  pump?: string;
  inspection?: string;
  sub?: string;
};

const FIELD_MAP: { key: keyof InvoiceValues; label: string; column: string }[] = [
  { key: "concrete", label: "concrete", column: "ready_mix_invoice_number" },
  { key: "pump", label: "pump", column: "pump_invoice_number" },
  { key: "inspection", label: "inspection", column: "inspection_invoice_number" },
  { key: "sub", label: "sub", column: "sub_invoice_number" },
];

export async function checkDuplicateInvoiceNumbers(
  organizationId: string | null | undefined,
  excludeEntryId: string | null | undefined,
  values: InvoiceValues
): Promise<InvoiceConflict[]> {
  if (!organizationId) return [];

  const candidates = FIELD_MAP.map((field) => ({
    ...field,
    value: (values[field.key] || "").trim(),
  })).filter((f) => f.value.length > 0);

  if (candidates.length === 0) return [];

  const results = await Promise.all(
    candidates.map(async (field) => {
      let query = supabase
        .from("schedule_entries")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .filter(field.column, "eq", field.value)
        .limit(1);

      if (excludeEntryId) {
        query = query.neq("id", excludeEntryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { field, hasMatch: !!data && data.length > 0 };
    })
  );

  return results
    .filter((r) => r.hasMatch)
    .map((r) => ({ label: r.field.label, value: r.field.value }));
}
