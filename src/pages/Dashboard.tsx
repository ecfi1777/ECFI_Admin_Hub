import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
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

const allTiles = [
  { href: "/projects", label: "Projects", subtitle: "Manage jobs and builders", icon: FolderKanban, minRole: "viewer" as const },
  { href: "/schedule", label: "Schedule", subtitle: "Daily crew assignments", icon: Calendar, minRole: "viewer" as const },
  { href: "/calendar", label: "Calendar", subtitle: "Monthly overview", icon: CalendarDays, minRole: "viewer" as const },
  { href: "/kanban", label: "Kanban", subtitle: "Workflow board", icon: Columns3, minRole: "manager" as const },
  { href: "/invoices", label: "Jobs to Invoice", subtitle: "Track billable work", icon: FileText, minRole: "manager" as const },
  { href: "/vendor-invoices", label: "Vendor Details", subtitle: "Suppliers and services", icon: Receipt, minRole: "manager" as const },
  { href: "/discrepancies", label: "Discrepancies", subtitle: "Resolve issues", icon: AlertTriangle, minRole: "manager" as const },
  { href: "/reports", label: "Reports", subtitle: "Analytics and data", icon: ClipboardList, minRole: "manager" as const },
  { href: "/settings", label: "Settings", subtitle: "App configuration", icon: Settings, minRole: "viewer" as const },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { canManage } = useUserRole();

  const tiles = allTiles.filter((t) =>
    t.minRole === "viewer" ? true : canManage
  );

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">ECFI Hub Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.href}
                onClick={() => navigate(tile.href)}
                className="group rounded-lg border border-border bg-card p-6 text-left transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="w-8 h-8 text-amber-500 mb-3" />
                <h2 className="text-lg font-semibold text-foreground">{tile.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">{tile.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
