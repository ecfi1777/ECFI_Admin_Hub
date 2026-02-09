import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferenceDataTable } from "@/components/settings/ReferenceDataTable";
import { CrewsManagement } from "@/components/settings/CrewsManagement";
import { ChangePassword } from "@/components/settings/ChangePassword";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { useUserRole } from "@/hooks/useUserRole";

const allTabs = [
  { value: "organization", label: "Organization", table: null, minRole: "viewer" as const },
  { value: "crews", label: "Crews", table: null, minRole: "manager" as const },
  { value: "builders", label: "Builders", table: "builders", minRole: "manager" as const },
  { value: "locations", label: "Locations", table: "locations", minRole: "manager" as const },
  { value: "phases", label: "Phases", table: "phases", minRole: "manager" as const },
  { value: "statuses", label: "Statuses", table: "project_statuses", minRole: "manager" as const },
  { value: "suppliers", label: "Suppliers", table: "suppliers", minRole: "manager" as const },
  { value: "pump_vendors", label: "Pump Vendors", table: "pump_vendors", minRole: "manager" as const },
  { value: "concrete_mixes", label: "Concrete Mixes", table: "concrete_mixes", minRole: "manager" as const },
  { value: "inspection_types", label: "Inspection Types", table: "inspection_types", minRole: "manager" as const },
  { value: "inspectors", label: "Inspectors", table: "inspectors", minRole: "manager" as const },
  { value: "account", label: "Account", table: null, minRole: "viewer" as const },
];

export default function Settings() {
  const { canManage } = useUserRole();
  const tabs = allTabs.filter((tab) => {
    if (tab.minRole === "viewer") return true;
    if (tab.minRole === "manager") return canManage;
    return false;
  });

  const [activeTab, setActiveTab] = useState(tabs[0]?.value || "organization");

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            {canManage ? "Manage reference data and dropdown options" : "View your profile and organization"}
          </p>
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
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
