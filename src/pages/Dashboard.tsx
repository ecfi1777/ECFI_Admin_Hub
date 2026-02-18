import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FolderKanban,
  Calendar,
  CalendarDays,
  Columns3,
  FileText,
  Receipt,
  AlertTriangle,
  ClipboardList,
  Settings,
} from "lucide-react";

const dashboardItems = [
  { href: "/projects", label: "Projects", description: "Manage all your projects", icon: FolderKanban, minRole: "viewer" as const },
  { href: "/", label: "Schedule", description: "Daily schedule and entries", icon: Calendar, minRole: "viewer" as const },
  { href: "/calendar", label: "Calendar", description: "Monthly and weekly calendar views", icon: CalendarDays, minRole: "viewer" as const },
  { href: "/kanban", label: "Kanban", description: "Visual project pipeline", icon: Columns3, minRole: "manager" as const },
  { href: "/invoices", label: "Jobs to Invoice", description: "Track invoicing status", icon: FileText, minRole: "manager" as const },
  { href: "/vendor-invoices", label: "Vendor Details", description: "Vendor invoice tracking", icon: Receipt, minRole: "manager" as const },
  { href: "/discrepancies", label: "Discrepancies", description: "Yard and entry discrepancies", icon: AlertTriangle, minRole: "manager" as const },
  { href: "/reports", label: "Reports", description: "Generate and view reports", icon: ClipboardList, minRole: "manager" as const },
  { href: "/settings", label: "Settings", description: "Manage your account and organization", icon: Settings, minRole: "viewer" as const },
];

export default function Dashboard() {
  const { canManage } = useUserRole();

  const visibleItems = dashboardItems.filter((item) => {
    if (item.minRole === "viewer") return true;
    if (item.minRole === "manager") return canManage;
    return false;
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} to={item.href} className="group">
                <Card className="h-full transition-colors group-hover:border-amber-500/60 group-hover:shadow-md">
                  <CardHeader className="flex flex-row items-start gap-4">
                    <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">{item.label}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
