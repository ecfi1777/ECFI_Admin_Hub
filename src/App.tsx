import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization, OrganizationProvider } from "@/hooks/useOrganization";
import { useMemo } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Logout from "./pages/Logout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import CalendarView from "./pages/CalendarView";
import Invoices from "./pages/Invoices";
import Discrepancies from "./pages/Discrepancies";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Unified route guard that handles all auth/org states in one render
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { hasOrganization, isLoading: orgLoading } = useOrganization();

  // Single loading state check
  const isLoading = !authInitialized || (user && orgLoading);

  // Memoize the render decision to prevent unnecessary recalculations
  const renderState = useMemo(() => {
    if (isLoading) return "loading";
    if (!user) return "redirect-auth";
    if (!hasOrganization) return "redirect-onboarding";
    return "render";
  }, [isLoading, user, hasOrganization]);

  if (renderState === "loading") {
    return <LoadingScreen message="Loading your workspace..." />;
  }

  if (renderState === "redirect-auth") {
    return <Navigate to="/auth" replace />;
  }

  if (renderState === "redirect-onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { hasOrganization, isLoading: orgLoading } = useOrganization();

  const isLoading = !authInitialized || (user && orgLoading);

  const renderState = useMemo(() => {
    if (isLoading) return "loading";
    if (!user) return "redirect-auth";
    if (hasOrganization) return "redirect-dashboard";
    return "render";
  }, [isLoading, user, hasOrganization]);

  if (renderState === "loading") {
    return <LoadingScreen message="Checking your account..." />;
  }

  if (renderState === "redirect-auth") {
    return <Navigate to="/auth" replace />;
  }

  if (renderState === "redirect-dashboard") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Initializing..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OrganizationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/discrepancies" element={<ProtectedRoute><Discrepancies /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </OrganizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;