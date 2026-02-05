import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { organizationId, isLoading: orgLoading, error: orgError } = useOrganization();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    console.log("ProtectedRoute state:", { 
      user: user?.id, 
      authLoading, 
      organizationId, 
      orgLoading,
      orgError: orgError?.message 
    });
  }, [user, authLoading, organizationId, orgLoading, orgError]);

  // Handle redirects using window.location to avoid SecurityError in iframes
  useEffect(() => {
    if (authLoading || orgLoading) return;
    
    if (!user) {
      console.log("ProtectedRoute: No user, redirecting to auth");
      setRedirecting(true);
      window.location.href = "/auth";
      return;
    }
    
    if (!organizationId) {
      console.log("ProtectedRoute: No org, redirecting to onboarding");
      setRedirecting(true);
      window.location.href = "/onboarding";
      return;
    }
  }, [user, authLoading, organizationId, orgLoading]);

  if (authLoading || orgLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { organizationId, isLoading: orgLoading } = useOrganization();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    console.log("OnboardingRoute state:", { user: user?.id, authLoading, organizationId, orgLoading });
  }, [user, authLoading, organizationId, orgLoading]);

  useEffect(() => {
    if (authLoading || orgLoading) return;
    
    if (!user) {
      console.log("OnboardingRoute: No user, redirecting to auth");
      setRedirecting(true);
      window.location.href = "/auth";
      return;
    }
    
    if (organizationId) {
      console.log("OnboardingRoute: Has org, redirecting to dashboard");
      setRedirecting(true);
      window.location.href = "/";
      return;
    }
  }, [user, authLoading, organizationId, orgLoading]);

  if (authLoading || orgLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      console.log("AuthRoute: Has user, redirecting to dashboard");
      setRedirecting(true);
      window.location.href = "/";
    }
  }, [user, loading]);

  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
