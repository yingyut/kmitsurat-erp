"use client";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon = "📭", title, subtitle, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-4" : "py-8 px-4"}`}>
      {icon && <span className="text-3xl mb-2 opacity-50">{icon}</span>}
      <p className="text-sm font-medium text-muted">{title}</p>
      {subtitle && <p className="text-xs text-muted/60 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
