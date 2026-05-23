import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import {
  HardHat,
  LayoutDashboard,
  Calendar,
  FolderKanban,
  CalendarDays,
  Settings,
  LogOut,
  AlertTriangle,
  FileText,
  Sun,
  Moon,
  ClipboardList,
  Columns3,
  Menu,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const allNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "viewer" as const },
  { href: "/projects", label: "Projects", icon: FolderKanban, minRole: "viewer" as const },
  { href: "/", label: "Daily Schedule", icon: Calendar, minRole: "viewer" as const },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, minRole: "viewer" as const },
  { href: "/kanban", label: "Kanban", icon: Columns3, minRole: "manager" as const },
  { href: "/invoices", label: "Jobs to Invoice", icon: FileText, minRole: "manager" as const },
  { href: "/vendor-invoices", label: "Vendor Bills", icon: Receipt, minRole: "manager" as const },
  { href: "/discrepancies", label: "Discrepancies", icon: AlertTriangle, minRole: "manager" as const },
  { href: "/reports", label: "Reports", icon: ClipboardList, minRole: "manager" as const },
  { href: "/settings", label: "Settings", icon: Settings, minRole: "viewer" as const },
];

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { organizationId } = useOrganization();
  const { canManage } = useUserRole();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Filter nav items based on role
  const navItems = allNavItems.filter((item) => {
    if (item.minRole === "viewer") return true;
    if (item.minRole === "manager") return canManage;
    return false;
  });

  const renderNavLinks = (onNavigate?: () => void, isCollapsed = false) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.href;
      const link = (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
            isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2",
            isActive
              ? "bg-amber-500/10 text-amber-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Icon className="w-5 h-5 shrink-0" />
          {!isCollapsed && item.label}
        </Link>
      );
      if (isCollapsed) {
        return (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      }
      return link;
    });

  const renderThemeToggle = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start gap-2 border-border"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4" />
          Light Mode
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          Dark Mode
        </>
      )}
    </Button>
  );

  const renderCollapsedThemeToggle = () => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" onClick={toggleTheme} className="w-10 h-10 mx-auto border-border">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{theme === "dark" ? "Light Mode" : "Dark Mode"}</TooltipContent>
    </Tooltip>
  );

  const renderUserSection = () => (
    <div className="flex items-center justify-between">
      <div className="truncate">
        <p className="text-sm font-medium text-foreground truncate">
          {user?.email}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setDrawerOpen(false);
          signOut();
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background border-b border-border flex items-center justify-between px-3 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="min-h-[44px] min-w-[44px]"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <HardHat className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-bold text-foreground">ECFI Hub</span>
          </div>
          <div className="min-w-[44px]" />
        </header>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="p-0 flex flex-col w-[280px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-slate-900" />
                </div>
                <div>
                  <h1 className="font-bold text-foreground">ECFI Hub</h1>
                  <p className="text-xs text-muted-foreground">Project Management</p>
                </div>
              </div>
            </div>
            <OrganizationSwitcher />
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {renderNavLinks(() => setDrawerOpen(false))}
            </nav>
            <div className="p-4 border-t border-border space-y-3">
              {renderThemeToggle()}
              {renderUserSection()}
            </div>
          </SheetContent>
        </Sheet>

        <main key={organizationId || "loading"} className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <aside
          className={cn(
            "bg-card border-r border-border flex flex-col transition-all duration-200 relative",
            collapsed ? "w-14" : "w-64"
          )}
        >
          <div className={cn("border-b border-border", collapsed ? "p-2" : "p-4")}>
            <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
              <div className="bg-amber-500 rounded-xl flex items-center justify-center shrink-0 w-10 h-10">
                <HardHat className="w-6 h-6 text-slate-900" />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-foreground">ECFI Hub</h1>
                  <p className="text-xs text-muted-foreground">Project Management</p>
                </div>
              )}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed((c) => !c)}
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {!collapsed && <OrganizationSwitcher />}
          <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-4")}>
            {renderNavLinks(undefined, collapsed)}
          </nav>
          <div className={cn("border-t border-border space-y-3", collapsed ? "p-2" : "p-4")}>
            {collapsed ? renderCollapsedThemeToggle() : renderThemeToggle()}
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="w-10 h-10 mx-auto text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
            {collapsed && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCollapsed((c) => !c)}
                    className="w-10 h-10 mx-auto border-border"
                    aria-label="Expand sidebar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        <main key={organizationId || "loading"} className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
