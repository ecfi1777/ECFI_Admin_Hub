import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle } from "lucide-react";

export function DeleteAccount() {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    if (confirmation !== "DELETE") {
      toast({
        title: "Invalid confirmation",
        description: "Please type DELETE exactly to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Session expired",
          description: "Please log in again to delete your account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("delete-account", {
        body: { confirmation },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete account");
      }

      if (response.data?.error) {
        toast({
          title: "Cannot delete account",
          description: response.data.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      // Redirect to auth page
      window.location.href = "/auth";
      
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDialogOpen(false);
      setConfirmation("");
    }
  };

  return (
    <Card className="bg-card mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Delete Account</CardTitle>
            <CardDescription>Permanently delete your account and all data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted border border-border rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1 text-foreground">Warning: This action cannot be undone</p>
                <p>
                  Deleting your account will permanently remove all your data, including projects, 
                  schedules, and organization memberships. This data cannot be restored.
                </p>
              </div>
            </div>
          </div>

          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Account Permanently?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This will permanently delete your account and all associated data. 
                    This action <strong>cannot be undone</strong>.
                  </p>
                  <p>
                    All your projects, schedule entries, documents, and organization 
                    memberships will be permanently removed.
                  </p>
                  <div className="pt-2">
                    <Label htmlFor="delete-confirmation" className="text-foreground">
                      Type <span className="font-mono font-bold">DELETE</span> to confirm:
                    </Label>
                    <Input
                      id="delete-confirmation"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder="Type DELETE here"
                      className="mt-2"
                      autoComplete="off"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmation("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={confirmation !== "DELETE" || loading}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {loading ? "Deleting..." : "Delete Account Forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
