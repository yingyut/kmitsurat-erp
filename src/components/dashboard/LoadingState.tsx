"use client";

interface LoadingStateProps {
  rows?: number;
  type?: "card" | "table" | "chart" | "list";
}

export function LoadingState({ rows = 3, type = "list" }: LoadingStateProps) {
  if (type === "card") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
            <div className="h-3 w-20 bg-muted/30 rounded mb-3" />
            <div className="h-7 w-28 bg-muted/25 rounded mb-2" />
            <div className="h-2 w-14 bg-muted/20 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (type === "table") {
    return (
      <div className="animate-pulse space-y-2 py-1">
        <div className="h-8 bg-muted/20 rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/10 rounded-lg" style={{ opacity: 1 - i * 0.18 }} />
        ))}
      </div>
    );
  }
  if (type === "chart") {
    return (
      <div className="h-full bg-muted/10 rounded-lg animate-pulse flex items-end gap-1.5 p-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-muted/20 rounded-t"
            style={{ height: `${30 + (i % 3) * 20}%` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 items-center" style={{ opacity: 1 - i * 0.18 }}>
          <div className="h-8 w-8 bg-muted/20 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-muted/20 rounded w-3/4" />
            <div className="h-2 bg-muted/15 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
