import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generateScheduleExcel } from "@/lib/generateScheduleExcel";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Generate years from 2020 to current year + 1
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => ({
  value: String(2020 + i),
  label: String(2020 + i),
}));

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [isExporting, setIsExporting] = useState(false);
  const { organizationId } = useOrganization();

  const handleExport = async () => {
    if (!organizationId) {
      toast.error("No organization selected");
      return;
    }
    setIsExporting(true);
    
    try {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      
      // Calculate date range for the selected month
      const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

      // Fetch schedule entries for the month
      const { data: entries, error } = await supabase
        .from("schedule_entries")
        .select(`
          scheduled_date,
          crew:crews(name),
          project:projects(
            lot_number,
            builder:builders(name, code),
            location:locations(name)
          ),
          phase:phases(name),
          supplier:suppliers(name, code),
          qty_ordered,
          ready_mix_yards_billed,
          ready_mix_invoice_number,
          ready_mix_invoice_amount,
          concrete_mix:concrete_mixes(name),
          additive_hot_water,
          additive_1_percent_he,
          additive_2_percent_he,
          concrete_notes,
          pump_vendor:pump_vendors(name, code),
          pump_invoice_number,
          pump_invoice_amount,
          pump_notes,
          inspection_type:inspection_types(name),
          inspector:inspectors(name),
          inspection_invoice_number,
          inspection_amount,
          inspection_notes,
          crew_yards_poured,
          crew_notes,
          notes,
          to_be_invoiced,
          invoice_complete,
          invoice_number
        `)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      if (!entries || entries.length === 0) {
        toast.warning("No schedule entries found for the selected month");
        return;
      }

      // Generate and download Excel file
      generateScheduleExcel(entries as any, month, year);
      
      toast.success(`Exported ${entries.length} schedule entries`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export schedule data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and export data reports</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Monthly Schedule Backup Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Monthly Schedule Backup</CardTitle>
                  <CardDescription>Export all schedule entries for a month</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
