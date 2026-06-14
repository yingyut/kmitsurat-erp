"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { ServiceTicket, ServiceContract, User } from "@/lib/types";
import { KpiCard } from "../KpiCard";
import { ChartCard } from "../ChartCard";
import { DataTable, type Column } from "../DataTable";
import { AlertPanel, type AlertItem } from "../AlertPanel";
import { DashboardGrid } from "../DashboardGrid";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#f97316"];
const STATUS_LABEL: Record<string, string> = {
  open: "เปิด", in_progress: "กำลังทำ", resolved: "แก้ไขแล้ว", closed: "ปิด",
};
const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-rose-500", high: "text-amber-500", medium: "text-blue-500", low: "text-muted",
};
function fmtM(v: number) { return v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v/1000)}K` : String(Math.round(v)); }

interface ServiceDashboardProps {
  service: ServiceTicket[];
  contracts: ServiceContract[];
  users: User[];
  loading: boolean;
  today: string;
  thisMonth: string;
  myName: string;
  isManager: boolean;
}

export function ServiceDashboard({ service, contracts, users, loading, today, thisMonth, myName, isManager }: ServiceDashboardProps) {

  const myTickets = useMemo(() => {
    if (isManager) return service;
    // Non-manager: เห็นเฉพาะ Ticket ที่ assign ให้ตัวเอง เท่านั้น
    return service.filter(t =>
      t.technician === myName ||
      (t as unknown as Record<string, unknown>).assigned_to === myName
    );
  }, [service, isManager, myName]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const open    = myTickets.filter(t => !["resolved","closed"].includes(t.status)).length;
    const closed  = myTickets.filter(t => ["resolved","closed"].includes(t.status) && t.service_date?.startsWith(thisMonth)).length;

    const closedAll = myTickets.filter(t => ["resolved","closed"].includes(t.status));
    const withinSLA = closedAll.filter(t => {
      if (!t.opened_at || !t.closed_at || !t.sla_resolve_hours) return false;
      return (new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 3600000 <= t.sla_resolve_hours;
    }).length;
    const slaPct = closedAll.length > 0 ? Math.round((withinSLA / closedAll.length) * 100) : 100;

    const pmCount = myTickets.filter(t => t.type === "pm_service").length;
    const cmCount = myTickets.filter(t => t.type === "repair").length;
    const maCount = contracts.filter(c => c.status === "active").length;

    return { open, closed, slaPct, pmCount, cmCount, maCount };
  }, [myTickets, contracts, thisMonth]);

  // ── Ticket Status Pie ───────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    myTickets.forEach(t => { map[t.status] = (map[t.status] || 0) + 1; });
    return Object.entries(map)
      .map(([status, count], i) => ({ name: STATUS_LABEL[status] || status, value: count, fill: COLORS[i % COLORS.length] }))
      .filter(d => d.value > 0);
  }, [myTickets]);

  // ── SLA Trend (6 months) ───────────────────────────────────────────────────
  const slaTrend = useMemo(() => {
    const now = new Date(thisMonth + "-01");
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTix = myTickets.filter(t => ["resolved","closed"].includes(t.status) && t.service_date?.startsWith(mon));
      const within = monthTix.filter(t => {
        if (!t.opened_at || !t.closed_at || !t.sla_resolve_hours) return false;
        return (new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 3600000 <= t.sla_resolve_hours;
      }).length;
      return { month: THAI_MONTHS[d.getMonth()], pct: monthTix.length > 0 ? Math.round((within / monthTix.length) * 100) : 0, total: monthTix.length };
    });
  }, [myTickets, thisMonth]);

  // ── Ticket by Category ─────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    myTickets.forEach(t => {
      const cat = t.type || "อื่นๆ";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([type, count]) => ({
        name: type === "pm_service" ? "PM" : type === "repair" ? "CM" : type === "installation" ? "ติดตั้ง"
          : type === "after_sales" ? "After Sales" : type === "site_survey" ? "Survey" : type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [myTickets]);

  // ── Near SLA Breach ────────────────────────────────────────────────────────
  const nearBreach = useMemo(() => {
    return myTickets
      .filter(t => {
        if (["resolved","closed"].includes(t.status) || !t.opened_at || !t.sla_resolve_hours) return false;
        const elapsed = (Date.now() - new Date(t.opened_at).getTime()) / 3600000;
        const threshold = t.sla_resolve_hours * 0.75;
        return elapsed >= threshold;
      })
      .sort((a, b) => {
        const ta = a.opened_at ? new Date(a.opened_at).getTime() : 0;
        const tb = b.opened_at ? new Date(b.opened_at).getTime() : 0;
        return ta - tb;
      })
      .slice(0, 8);
  }, [myTickets]);

  // ── Waiting Customer ───────────────────────────────────────────────────────
  const waitingCust = useMemo(() =>
    myTickets
      .filter(t => t.status === "open" && t.priority === "critical")
      .sort((a, b) => (a.service_date || "").localeCompare(b.service_date || ""))
      .slice(0, 8),
    [myTickets]
  );

  // ── Technician Workload ────────────────────────────────────────────────────
  const techWorkload = useMemo(() => {
    const map: Record<string, { open: number; closed: number }> = {};
    service.filter(t => t.technician).forEach(t => {
      if (!map[t.technician]) map[t.technician] = { open: 0, closed: 0 };
      if (["resolved","closed"].includes(t.status)) map[t.technician].closed++;
      else map[t.technician].open++;
    });
    return Object.entries(map)
      .map(([name, counts]) => ({ name: name.split(" ")[0] ?? name, ...counts, total: counts.open + counts.closed }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [service]);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo<AlertItem[]>(() => {
    const slaBreached = myTickets.filter(t => {
      if (["resolved","closed"].includes(t.status) || !t.opened_at || !t.sla_resolve_hours) return false;
      return (Date.now() - new Date(t.opened_at).getTime()) / 3600000 > t.sla_resolve_hours;
    }).length;
    const critical = myTickets.filter(t => t.priority === "critical" && !["resolved","closed"].includes(t.status)).length;
    const d30 = new Date(today); d30.setDate(d30.getDate() + 30); const d30s = d30.toISOString().slice(0, 10);
    const expContracts = contracts.filter(c => c.status === "active" && c.end_date && c.end_date <= d30s && c.end_date >= today).length;
    const longOpen = myTickets.filter(t => {
      if (["resolved","closed"].includes(t.status) || !t.opened_at) return false;
      return (Date.now() - new Date(t.opened_at).getTime()) / 86400000 > 3;
    }).length;
    return [
      { level: slaBreached > 0 ? "red" : "green",    icon: "🆘", label: "Ticket เกิน SLA",         count: slaBreached,   href: "/service" },
      { level: critical > 0 ? "red" : "green",        icon: "🔴", label: "Critical Priority",        count: critical,      href: "/service" },
      { level: longOpen > 5 ? "yellow" : "blue",      icon: "⏰", label: "เปิดนาน > 3 วัน",          count: longOpen,      href: "/service" },
      { level: expContracts > 0 ? "yellow" : "green", icon: "📜", label: "สัญญาใกล้หมด (30 วัน)",    count: expContracts,  href: "/contracts" },
    ];
  }, [myTickets, contracts, today]);

  const baseCols: Column<Record<string,unknown>>[] = [
    { key: "customer_name", label: "ลูกค้า",
      render: r => <span className="font-medium">{String(r.customer_name||"—")}</span> },
    { key: "issue",         label: "ปัญหา", className: "text-muted max-w-[160px] truncate" },
    { key: "technician",    label: "ช่าง", className: "text-muted" },
    { key: "priority",      label: "Priority", align: "center",
      render: r => <span className={`text-xs font-semibold ${PRIORITY_COLOR[String(r.priority||"medium")]}`}>{String(r.priority||"—")}</span> },
    { key: "service_date",  label: "วันที่", align: "center",
      render: r => <span className="text-muted">{String(r.service_date||"—").slice(5)||"—"}</span> },
  ];

  return (
    <div className="space-y-4">

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={3} gap="md">
        <KpiCard title="Open Tickets" icon="🎫" value={kpis.open}
          subtext="Tickets ที่ยังเปิดอยู่"
          color={kpis.open > 20 ? "red" : kpis.open > 10 ? "amber" : "blue"}
          href="/service" loading={loading} />
        <KpiCard title="ปิดแล้ว (เดือนนี้)" icon="✅" value={kpis.closed}
          subtext={`Tickets ที่แก้ไขเสร็จใน ${thisMonth}`}
          color="green" href="/service" loading={loading} />
        <KpiCard title="SLA On-Time" icon="⏱️" value={`${kpis.slaPct}%`}
          subtext="Tickets ที่ปิดภายใน SLA"
          color={kpis.slaPct >= 85 ? "green" : kpis.slaPct >= 70 ? "amber" : "red"}
          href="/service" loading={loading}
          progress={{ current: kpis.slaPct, target: 100 }} />
        <KpiCard title="PM (Preventive)" icon="🔧" value={kpis.pmCount}
          subtext="pm_service tickets" color="purple" href="/service" loading={loading} />
        <KpiCard title="CM (Corrective)" icon="🛠️" value={kpis.cmCount}
          subtext="repair tickets" color="orange" href="/service" loading={loading} />
        <KpiCard title="MA Contracts" icon="📋" value={kpis.maCount}
          subtext="สัญญา MA ที่ active" color="cyan" href="/contracts" loading={loading} />
      </DashboardGrid>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <AlertPanel title="สถานะ Service" alerts={alerts} loading={loading} cols={4} />

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <ChartCard title="SLA Trend" subtitle="% SLA On-Time รายเดือน" height={200} loading={loading} empty={slaTrend.every(d => d.total === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={slaTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip formatter={(v) => [`${v}%`, "SLA"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: "#22c55e" }} name="SLA %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <DashboardGrid cols={1} gap="md">
          <ChartCard title="Ticket by Category" height={96} loading={loading} empty={categoryData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ticket Status" height={96} loading={loading} empty={statusData.length === 0}>
            <div className="flex gap-2 items-center h-full">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={40} dataKey="value" paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} ใบ`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted flex-1">{d.name}</span>
                    <span className="text-[10px] font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </DashboardGrid>
      </DashboardGrid>

      {/* ── Technician Workload Chart ──────────────────────────────────────── */}
      <ChartCard title="Technician Workload" subtitle="จำนวน Tickets ต่อช่าง" height={180} loading={loading} empty={techWorkload.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={techWorkload} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="open"   name="Open"   stackId="a" fill="#f43f5e" radius={[0,0,0,0]} />
            <Bar dataKey="closed" name="Closed" stackId="a" fill="#22c55e" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Tables ──────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">⚠️ Near SLA Breach</h3>
            <Link href="/service" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <DataTable
            columns={[
              ...baseCols,
              { key: "sla_resolve_hours", label: "SLA (h)", align: "right",
                render: r => {
                  if (!r.opened_at || !r.sla_resolve_hours) return <span className="text-muted">—</span>;
                  const elapsed = (Date.now() - new Date(String(r.opened_at)).getTime()) / 3600000;
                  const remain = Number(r.sla_resolve_hours) - elapsed;
                  return <span className={remain < 4 ? "text-rose-500 font-semibold" : "text-amber-500"}>{remain.toFixed(1)}h</span>;
                }},
            ]}
            data={nearBreach as unknown as Record<string,unknown>[]}
            emptyTitle="ไม่มี Ticket ใกล้เกิน SLA" compact />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">🔴 Critical / Waiting</h3>
            <Link href="/service" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <DataTable columns={baseCols} data={waitingCust as unknown as Record<string,unknown>[]}
            emptyTitle="ไม่มี Critical Tickets" compact />
        </div>
      </DashboardGrid>

    </div>
  );
}
