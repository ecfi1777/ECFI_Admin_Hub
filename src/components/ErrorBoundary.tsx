import React, { Component, ErrorInfo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleForceLogout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Force logout error:", e);
    }
    window.location.href = "/auth";
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-lg p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-slate-400 text-sm mb-4">
                The application encountered an unexpected error.
              </p>
            </div>

            <div className="bg-slate-700/50 rounded p-3 mb-6 max-h-32 overflow-auto">
              <p className="text-red-400 text-xs font-mono break-words">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleForceLogout}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Sign Out & Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
