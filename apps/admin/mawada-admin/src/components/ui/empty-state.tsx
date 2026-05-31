import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6", className)}>
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary/40" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/5 animate-ping" />
      </div>
      <h3 className="text-base font-semibold text-foreground/80 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground/70 text-center max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-5 rounded-xl shadow-sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
