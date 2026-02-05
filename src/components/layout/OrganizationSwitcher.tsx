import { useOrganization } from "@/hooks/useOrganization";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function OrganizationSwitcher() {
  const { organization, allOrganizations, organizationId, switchOrganization, isLoading } = useOrganization();
  const [open, setOpen] = useState(false);

  if (isLoading || !organization) {
    return (
      <div className="px-2 py-2">
        <div className="animate-pulse h-10 bg-muted rounded-lg" />
      </div>
    );
  }

  // Only show switcher if user has multiple organizations
  if (allOrganizations.length <= 1) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {organization.name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto py-2 px-3 hover:bg-muted"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">
                  {organization.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {allOrganizations.length} organizations
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            {allOrganizations.map((membership) => {
              const isActive = membership.organization_id === organizationId;
              return (
                <button
                  key={membership.organization_id}
                  onClick={() => {
                    if (!isActive) {
                      switchOrganization(membership.organization_id);
                    }
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors
                    ${isActive 
                      ? "bg-primary/10 text-foreground" 
                      : "hover:bg-muted text-foreground"
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}
                  `}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {membership.organizations.name}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize mt-0.5">
                      {membership.role}
                    </Badge>
                  </div>
                  {isActive && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
