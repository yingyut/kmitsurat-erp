"use client";
import Link from "next/link";
import { ReactNode } from "react";

export type KpiColor = "green" | "blue" | "purple" | "amber" | "red" | "cyan" | "orange";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: number;
  trendLabel?: string;
  color?: KpiColor;
  icon?: ReactNode;
  href?: string;
  loading?: boolean;
  progress?: { current: number; target: number };
}

const colorMap: Record<KpiColor, { bar: string; text: string; iconBg: string }> = {
  green:  { bar: "bg-emerald-500", text: "text-emerald-500", iconBg: "bg-emerald-500/10" },
  blue:   { bar: "bg-blue-500",    text: "text-blue-500",    iconBg: "bg-blue-500/10"    },
  purple: { bar: "bg-violet-500",  text: "text-violet-500",  iconBg: "bg-violet-500/10"  },
  amber:  { bar: "bg-amber-500",   text: "text-amber-500",   iconBg: "bg-amber-500/10"   },
  red:    { bar: "bg-rose-500",    text: "text-rose-500",    iconBg: "bg-rose-500/10"    },
  cyan:   { bar: "bg-cyan-500",    text: "text-cyan-500",    iconBg: "bg-cyan-500/10"    },
  orange: { bar: "bg-orange-500",  text: "text-orange-500",  iconBg: "bg-orange-500/10"  },
};

export function KpiCard({ title, value, subtext, trend, trendLabel, color = "blue", icon, href, loading, progress }: KpiCardProps) {
  const c = colorMap[color];
  const pct = progress ? Math.min(100, Math.round((progress.current / Math.max(1, progress.target)) * 100)) : null;

  const inner = (
    <div className="relative bg-card border border-border rounded-xl p-4 overflow-hidden h-full transition-shadow hover:shadow-md group">
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] ${c.bar} rounded-r-full`} />
      <div className="pl-1">
        <div className="flex items-start justify-between mb-2 gap-2">
          <p className="text-[11px] font-medium text-muted leading-tight">{title}</p>
          {icon && (
            <span className={`text-base shrink-0 ${c.iconBg} p-1.5 rounded-lg leading-none`}>
              {icon}
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-7 w-24 bg-muted/20 rounded animate-pulse mb-1" />
        ) : (
          <p className={`text-2xl font-bold ${c.text} leading-none mb-1`}>{value}</p>
        )}

        {subtext && (
          <p className="text-[11px] text-muted/70 mt-1 leading-tight">{subtext}</p>
        )}

        {trend != null && (
          <p className={`text-[11px] mt-1.5 font-semibold ${trend >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
            {trendLabel && <span className="font-normal text-muted ml-1">{trendLabel}</span>}
          </p>
        )}

        {pct != null && (
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] text-muted mb-1">
              <span>ความคืบหน้า</span>
              <span className={c.text + " font-semibold"}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
              <div
                className={`h-full ${c.bar} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{inner}</Link>;
  }
  return inner;
}
