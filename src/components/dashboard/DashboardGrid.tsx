"use client";
import { ReactNode } from "react";

interface DashboardGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const colMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

const gapMap: Record<string, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

export function DashboardGrid({ children, cols = 2, gap = "md", className }: DashboardGridProps) {
  return (
    <div className={`grid ${colMap[cols] ?? colMap[2]} ${gapMap[gap]} ${className ?? ""}`}>
      {children}
    </div>
  );
}
