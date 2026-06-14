"use client";
import { ReactNode } from "react";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  className?: string;
}

export function ChartCard({
  title, subtitle, action, children, height = 220, loading, empty, emptyTitle = "ยังไม่มีข้อมูล", className,
}: ChartCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div style={{ height }} className="relative">
        {loading ? (
          <LoadingState type="chart" />
        ) : empty ? (
          <EmptyState title={emptyTitle} compact />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
