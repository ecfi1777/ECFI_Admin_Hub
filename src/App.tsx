import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization, OrganizationProvider } from "@/hooks/useOrganization";
import { useMemo, memo } from "react";
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

// Single unified auth check component - memoized to prevent re-renders
const ProtectedRoute = memo(function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { hasOrganization, isLoading: orgLoading } = useOrganization();

  // Compute render state once
  const renderState = useMemo(() => {
    // Auth not ready yet
    if (!authInitialized) return "loading-auth";
    
    // No user - redirect to auth
    if (!user) return "redirect-auth";
    
    // User exists but org check still loading
    if (orgLoading) return "loading-org";
    
    // User exists, org check complete, but no org
    if (!hasOrganization) return "redirect-onboarding";
    
    // All good
    return "render";
  }, [authInitialized, user, orgLoading, hasOrganization]);

  if (renderState === "loading-auth") {
    return <LoadingScreen message="Initializing..." />;
  }

  if (renderState === "loading-org") {
    return <LoadingScreen message="Loading workspace..." />;
  }

  if (renderState === "redirect-auth") {
    return <Navigate to="/auth" replace />;
  }

  if (renderState === "redirect-onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

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
});

const AuthRoute = memo(function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();

  // Show nothing during init to prevent flash
  if (!initialized) {
    return <LoadingScreen message="Initializing..." />;
  }

  // User already logged in - redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
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
