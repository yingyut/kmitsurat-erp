"use client";
import Link from "next/link";
import { LoadingState } from "./LoadingState";

export interface AlertItem {
  level: "red" | "yellow" | "green" | "blue";
  icon: string;
  label: string;
  count: number;
  href: string;
}

const levelCls: Record<string, { card: string; count: string }> = {
  red:    { card: "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15",   count: "text-rose-500"   },
  yellow: { card: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15", count: "text-amber-500"  },
  green:  { card: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15", count: "text-emerald-500" },
  blue:   { card: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15",   count: "text-blue-500"   },
};

interface AlertPanelProps {
  title?: string;
  alerts: AlertItem[];
  loading?: boolean;
  cols?: 2 | 3 | 4;
  showEmpty?: boolean;
}

const gridCls: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export function AlertPanel({ title, alerts, loading, cols = 4, showEmpty = true }: AlertPanelProps) {
  const active = alerts.filter(a => a.count > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">🔔 {title}</h3>
      )}
      {loading ? (
        <LoadingState type="card" rows={cols} />
      ) : active.length === 0 ? (
        showEmpty && <p className="text-xs text-emerald-500 py-1">✅ ทุกอย่างเรียบร้อยดี ไม่มีรายการค้าง</p>
      ) : (
        <div className={`grid ${gridCls[cols] ?? gridCls[4]} gap-2`}>
          {active.map((a, i) => {
            const s = levelCls[a.level] ?? levelCls.yellow;
            return (
              <Link key={i} href={a.href}
                className={`rounded-xl border p-3 transition-colors cursor-pointer ${s.card}`}>
                <p className={`text-xl font-bold mb-0.5 ${s.count}`}>{a.icon} {a.count}</p>
                <p className="text-[10px] text-muted/80 leading-snug">{a.label}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
