import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Logout() {
  const [status, setStatus] = useState("Signing out...");
  const queryClient = useQueryClient();

  useEffect(() => {
    const performLogout = async () => {
      try {
        queryClient.clear();
        localStorage.removeItem("ecfi_active_organization_id");
        localStorage.removeItem("app_cache_version");
        
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error("Sign-out error (forcing redirect):", e);
        }
        
        setStatus("Signed out successfully. Redirecting...");
        
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
      } catch (error) {
        console.error("Logout error:", error);
        setStatus("Error during logout. Forcing redirect...");
        
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1000);
      }
    };

    performLogout();
  }, [queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-white">{status}</p>
      </div>
    </div>
  );
}
