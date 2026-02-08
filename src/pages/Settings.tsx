import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferenceDataTable } from "@/components/settings/ReferenceDataTable";
import { CrewsManagement } from "@/components/settings/CrewsManagement";
import { ChangePassword } from "@/components/settings/ChangePassword";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";

const tabs = [
  { value: "organization", label: "Organization", table: null },
  { value: "crews", label: "Crews", table: null },
  { value: "builders", label: "Builders", table: "builders" },
  { value: "locations", label: "Locations", table: "locations" },
  { value: "phases", label: "Phases", table: "phases" },
  { value: "statuses", label: "Statuses", table: "project_statuses" },
  { value: "suppliers", label: "Suppliers", table: "suppliers" },
  { value: "pump_vendors", label: "Pump Vendors", table: "pump_vendors" },
  { value: "concrete_mixes", label: "Concrete Mixes", table: "concrete_mixes" },
  { value: "inspection_types", label: "Inspection Types", table: "inspection_types" },
  { value: "inspectors", label: "Inspectors", table: "inspectors" },
  { value: "account", label: "Account", table: null },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("organization");

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage reference data and dropdown options</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2">
            <TabsList className="bg-muted border border-border inline-flex w-auto gap-1 p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {tab.value === "organization" ? (
                <OrganizationSettings />
              ) : tab.value === "crews" ? (
                <CrewsManagement />
              ) : tab.value === "account" ? (
                <ChangePassword />
              ) : (
                <ReferenceDataTable 
                  tableName={tab.table as any} 
                  displayName={tab.label}
                  hasCode={["builders", "suppliers", "pump_vendors"].includes(tab.table || "")}
                  hasOrder={["phases", "project_statuses", "concrete_mixes"].includes(tab.table || "")}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
