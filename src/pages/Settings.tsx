import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferenceDataTable } from "@/components/settings/ReferenceDataTable";
import { CrewMembersTable } from "@/components/settings/CrewMembersTable";
import { CrewOrderTable } from "@/components/settings/CrewOrderTable";
import { ChangePassword } from "@/components/settings/ChangePassword";

const tabs = [
  { value: "crews", label: "Crews", table: "crews" },
  { value: "crew_order", label: "Crew Order", table: null },
  { value: "crew_members", label: "Crew Members", table: "crew_members" },
  { value: "builders", label: "Builders", table: "builders" },
  { value: "locations", label: "Locations", table: "locations" },
  { value: "phases", label: "Phases", table: "phases" },
  { value: "statuses", label: "Statuses", table: "project_statuses" },
  { value: "suppliers", label: "Suppliers", table: "suppliers" },
  { value: "pump_vendors", label: "Pump Vendors", table: "pump_vendors" },
  { value: "inspection_types", label: "Inspection Types", table: "inspection_types" },
  { value: "inspectors", label: "Inspectors", table: "inspectors" },
  { value: "account", label: "Account", table: null },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("crews");

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage reference data and dropdown options</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted border border-border flex-wrap h-auto gap-1 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 text-muted-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {tab.value === "crew_members" ? (
                <CrewMembersTable />
              ) : tab.value === "crew_order" ? (
                <CrewOrderTable />
              ) : tab.value === "account" ? (
                <ChangePassword />
              ) : (
                <ReferenceDataTable 
                  tableName={tab.table as any} 
                  displayName={tab.label}
                  hasCode={["builders", "suppliers", "pump_vendors"].includes(tab.table || "")}
                  hasOrder={["phases", "project_statuses"].includes(tab.table || "")}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
