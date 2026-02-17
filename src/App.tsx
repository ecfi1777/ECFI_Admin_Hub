import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { useOrganization, OrganizationProvider } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useMemo, memo } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AccessDenied } from "@/components/layout/AccessDenied";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Logout from "./pages/Logout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Projects from "./pages/Projects";
import CalendarView from "./pages/CalendarView";
import Invoices from "./pages/Invoices";
import Discrepancies from "./pages/Discrepancies";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Kanban from "./pages/Kanban";
import VendorInvoices from "./pages/VendorInvoices";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const ProtectedRoute = memo(function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { hasOrganization, isLoading: orgLoading } = useOrganization();

  const renderState = useMemo(() => {
    // If auth is completely stalled, but we have some indication of user, move forward
    if (!authInitialized) return "loading-auth";
    if (!user) return "redirect-auth";
    
    // Once auth is ready, wait for organization
    if (orgLoading) return "loading-org";
    if (!hasOrganization) return "redirect-onboarding";
    
    return "render";
  }, [authInitialized, user, orgLoading, hasOrganization]);

  if (renderState === "loading-auth" || renderState === "loading-org") {
    const message = renderState === "loading-auth" ? "Initializing..." : "Loading workspace...";
    return <LoadingScreen message={message} />;
  }
  
  if (renderState === "redirect-auth") return <Navigate to="/auth" replace />;
  if (renderState === "redirect-onboarding") return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
});

/** Route guard for manager+ only pages */
const ManagerRoute = memo(function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { canManage, isLoading } = useUserRole();

  if (isLoading) return <LoadingScreen message="Checking access..." />;
  if (!canManage) return <AccessDenied />;
  return <>{children}</>;
});

const OnboardingRoute = memo(function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { hasOrganization, isLoading: orgLoading } = useOrganization();

  const renderState = useMemo(() => {
    if (!authInitialized) return "loading";
    if (!user) return "redirect-auth";
    if (orgLoading) return "loading";
    if (hasOrganization) return "redirect-dashboard";
    return "render";
  }, [authInitialized, user, orgLoading, hasOrganization]);

  if (renderState === "loading") return <LoadingScreen message="Checking your account..." />;
  if (renderState === "redirect-auth") return <Navigate to="/auth" replace />;
  if (renderState === "redirect-dashboard") return <Navigate to="/" replace />;
  return <>{children}</>;
});

const AuthRoute = memo(function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen message="Initializing..." />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <OrganizationProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/logout" element={<Logout />} />
                  <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
                  {/* Viewer-accessible routes */}
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                  <Route path="/kanban" element={<ProtectedRoute><ManagerRoute><Kanban /></ManagerRoute></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  {/* Manager+ only routes */}
                  <Route path="/invoices" element={<ProtectedRoute><ManagerRoute><Invoices /></ManagerRoute></ProtectedRoute>} />
                  <Route path="/vendor-invoices" element={<ProtectedRoute><ManagerRoute><VendorInvoices /></ManagerRoute></ProtectedRoute>} />
                  <Route path="/discrepancies" element={<ProtectedRoute><ManagerRoute><Discrepancies /></ManagerRoute></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><ManagerRoute><Reports /></ManagerRoute></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </OrganizationProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
