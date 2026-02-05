import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function getPasswordStrength(password: string): {
  score: number;
  isValid: boolean;
  passedRequirements: boolean[];
} {
  const passedRequirements = requirements.map((req) => req.test(password));
  const score = passedRequirements.filter(Boolean).length;
  const isValid = score >= 4; // At least 4 of 5 requirements met
  return { score, isValid, passedRequirements };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, passedRequirements } = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const getStrengthLabel = () => {
    if (score === 0) return { label: "", color: "" };
    if (score <= 2) return { label: "Weak", color: "text-destructive" };
    if (score <= 3) return { label: "Fair", color: "text-amber-500" };
    if (score === 4) return { label: "Good", color: "text-emerald-500" };
    return { label: "Strong", color: "text-emerald-600" };
  };

  const { label: strengthLabel, color: strengthColor } = getStrengthLabel();

  const getBarColor = (index: number) => {
    if (index >= score) return "bg-muted";
    if (score <= 2) return "bg-destructive";
    if (score <= 3) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (!password) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                getBarColor(index)
              )}
            />
          ))}
        </div>
        {strengthLabel && (
          <p className={cn("text-xs font-medium", strengthColor)}>
            {strengthLabel}
          </p>
        )}
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={req.label}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              passedRequirements[index] ? "text-emerald-500" : "text-muted-foreground"
            )}
          >
            {passedRequirements[index] ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
