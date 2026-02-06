/**
 * Shared hook for managing entry form state
 */

import { useState, useCallback } from "react";
import type { EntryFormValues } from "./types";
import { DEFAULT_ENTRY_FORM_VALUES } from "./types";
import type { ScheduleEntry } from "@/types/schedule";

interface UseEntryFormOptions {
  initialValues?: Partial<EntryFormValues>;
}

export function useEntryForm(options: UseEntryFormOptions = {}) {
  const [formData, setFormData] = useState<EntryFormValues>({
    ...DEFAULT_ENTRY_FORM_VALUES,
    ...options.initialValues,
  });

  const updateField = useCallback(<K extends keyof EntryFormValues>(
    field: K,
    value: EntryFormValues[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      ...DEFAULT_ENTRY_FORM_VALUES,
      ...options.initialValues,
    });
  }, [options.initialValues]);

  const loadFromEntry = useCallback((entry: ScheduleEntry) => {
    setFormData({
      crew_id: entry.crew_id || "",
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
      crew_yards_poured: (entry as any).crew_yards_poured?.toString() || "",
      crew_notes: (entry as any).crew_notes || "",
      to_be_invoiced: entry.to_be_invoiced,
    });
  }, []);

  const getInsertPayload = useCallback(() => {
    return {
      crew_id: formData.crew_id || null,
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
      crew_yards_poured: formData.crew_yards_poured ? parseFloat(formData.crew_yards_poured) : null,
      crew_notes: formData.crew_notes || null,
      to_be_invoiced: formData.to_be_invoiced,
    };
  }, [formData]);

  const getUpdatePayload = getInsertPayload; // Same structure for updates

  return {
    formData,
    updateField,
    resetForm,
    loadFromEntry,
    getInsertPayload,
    getUpdatePayload,
  };
}
