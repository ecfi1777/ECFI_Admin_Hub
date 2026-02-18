import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Logout() {
  const [status, setStatus] = useState("Signing out...");

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear local storage but preserve auth version flag
        const authVersion = localStorage.getItem("auth_version");
        localStorage.clear();
        sessionStorage.clear();
        if (authVersion) localStorage.setItem("auth_version", authVersion);
        
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        setStatus("Signed out successfully. Redirecting...");
        
        // Force redirect to auth page
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
      } catch (error) {
        console.error("Logout error:", error);
        setStatus("Error during logout. Forcing redirect...");
        
        // Force redirect anyway
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1000);
      }
    };

    performLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-white">{status}</p>
      </div>
    </div>
  );
}
