"use client";
import { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: (row: T, index: number) => string;
  maxRows?: number;
  emptyTitle?: string;
  emptySubtext?: string;
  striped?: boolean;
  compact?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T = Record<string, unknown>>({
  columns, data, loading, rowKey, maxRows, emptyTitle = "ไม่มีข้อมูล", emptySubtext,
  striped = true, compact = false, onRowClick,
}: DataTableProps<T>) {
  if (loading) return <LoadingState type="table" rows={5} />;
  const rows = maxRows ? data.slice(0, maxRows) : data;
  if (rows.length === 0) return <EmptyState title={emptyTitle} subtitle={emptySubtext} compact />;

  const padY = compact ? "py-1.5" : "py-2";

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[400px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-${col.align ?? "left"} ${padY} px-2 text-[11px] font-semibold text-muted whitespace-nowrap ${col.width ?? ""} ${col.headerClassName ?? ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row, i) : i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                "border-b border-border/50 last:border-0 transition-colors",
                striped && i % 2 === 1 ? "bg-background/30" : "",
                onRowClick ? "cursor-pointer hover:bg-sidebar-hover/40" : "hover:bg-sidebar-hover/20",
              ].join(" ")}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`text-${col.align ?? "left"} ${padY} px-2 text-xs ${col.className ?? ""}`}
                >
                  {col.render
                    ? col.render(row, i)
                    : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
