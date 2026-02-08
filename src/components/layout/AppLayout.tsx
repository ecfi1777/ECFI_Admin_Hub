import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import {
  HardHat,
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
} from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "Schedule", icon: Calendar },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/vendor-invoices", label: "Vendor Invoices", icon: Receipt },
  { href: "/discrepancies", label: "Discrepancies", icon: AlertTriangle },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { organizationId } = useOrganization();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const renderNavLinks = (onNavigate?: () => void) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.href;
      return (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "bg-amber-500/10 text-amber-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Icon className="w-5 h-5" />
          {item.label}
        </Link>
      );
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
        {/* Sticky mobile header */}
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
          {/* Spacer to center the logo */}
          <div className="min-w-[44px]" />
        </header>

        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="p-0 flex flex-col w-[280px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            {/* Logo */}
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

            {/* Organization Switcher */}
            <OrganizationSwitcher />

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {renderNavLinks(() => setDrawerOpen(false))}
            </nav>

            {/* Theme Toggle & User */}
            <div className="p-4 border-t border-border space-y-3">
              {renderThemeToggle()}
              {renderUserSection()}
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main key={organizationId || "loading"} className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout — unchanged
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo */}
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

        {/* Organization Switcher */}
        <OrganizationSwitcher />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {renderNavLinks()}
        </nav>

        {/* Theme Toggle & User */}
        <div className="p-4 border-t border-border space-y-3">
          {renderThemeToggle()}
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
        </div>
      </aside>

      {/* Main Content */}
      <main key={organizationId || "loading"} className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
