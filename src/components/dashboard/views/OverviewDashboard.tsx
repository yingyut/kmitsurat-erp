"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket, SalesQuota, Quotation, ServiceContract, Customer, User } from "@/lib/types";
import { KpiCard } from "../KpiCard";
import { ChartCard } from "../ChartCard";
import { DataTable } from "../DataTable";
import { AlertPanel, type AlertItem } from "../AlertPanel";
import { DashboardGrid } from "../DashboardGrid";
import { EmptyState } from "../EmptyState";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#f97316"];

interface OverviewDashboardProps {
  projects: Project[];
  sales: SalesActivity[];
  presale: PresaleRequest[];
  service: ServiceTicket[];
  quotas: SalesQuota[];
  quotations: Quotation[];
  contracts: ServiceContract[];
  customers: Customer[];
  users: User[];
  loading: boolean;
  today: string;
  thisMonth: string;
}

function fmtM(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1000)}K`;
  return String(Math.round(v));
}

const MOCK_TREND = [
  { month: "ม.ค.", revenue: 820000, gp: 164000 },
  { month: "ก.พ.", revenue: 1100000, gp: 242000 },
  { month: "มี.ค.", revenue: 950000, gp: 190000 },
  { month: "เม.ย.", revenue: 1350000, gp: 310500 },
  { month: "พ.ค.", revenue: 1200000, gp: 252000 },
  { month: "มิ.ย.", revenue: 1480000, gp: 370000 },
];

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export function OverviewDashboard({
  projects, sales, presale, service, quotas, quotations, contracts, customers, users, loading, today, thisMonth,
}: OverviewDashboardProps) {

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const mQuotas = quotas.filter(q => q.month === thisMonth);
    const revenue = mQuotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
    const gpAmt   = mQuotas.reduce((s, q) => s + (q.actual_profit || 0), 0);
    const target  = mQuotas.reduce((s, q) => s + (q.quota_target || 0), 0);
    const gpPct   = revenue > 0 ? (gpAmt / revenue) * 100 : 0;

    const PIPE_ST = new Set(["lead","opportunity","proposal","negotiation"]);
    const pipeline = projects.filter(p => PIPE_ST.has(p.status)).reduce((s, p) => s + (p.value || 0), 0);
    const openTickets = service.filter(t => !["resolved","closed"].includes(t.status)).length;
    const activeProjects = projects.filter(p => !["won","lost"].includes(p.status)).length;

    const closedTix = service.filter(t => ["resolved","closed"].includes(t.status));
    const withinSLA = closedTix.filter(t => {
      if (!t.opened_at || !t.closed_at || !t.sla_resolve_hours) return false;
      const hrs = (new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 3600000;
      return hrs <= (t.sla_resolve_hours ?? 999);
    }).length;
    const slaPct = closedTix.length > 0 ? Math.round((withinSLA / closedTix.length) * 100) : 100;

    return { revenue, gpAmt, gpPct, target, pipeline, openTickets, activeProjects, slaPct };
  }, [quotas, projects, service, thisMonth]);

  // ── Revenue Trend (last 6 months) ─────────────────────────────────────────
  const trendData = useMemo(() => {
    if (quotas.length === 0) return MOCK_TREND;
    const now = new Date(thisMonth + "-01");
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rev = quotas.filter(q => q.month === mon).reduce((s, q) => s + (q.actual_sales || 0), 0);
      const gp  = quotas.filter(q => q.month === mon).reduce((s, q) => s + (q.actual_profit || 0), 0);
      return { month: THAI_MONTHS[d.getMonth()], revenue: rev, gp };
    });
  }, [quotas, thisMonth]);

  // ── Revenue by Dept ────────────────────────────────────────────────────────
  const deptData = useMemo(() => {
    const salesRev = quotas.filter(q => q.month === thisMonth).reduce((s, q) => s + (q.actual_sales || 0), 0);
    const svcRev   = service.filter(t => ["resolved","closed"].includes(t.status) && t.service_date?.startsWith(thisMonth))
      .reduce((s, t) => s + (t.service_value || 0), 0);
    const preCount = presale.filter(r => r.status === "completed" && r.due_date?.startsWith(thisMonth)).length * 10000;
    const data = [
      { name: "ฝ่ายขาย", value: salesRev },
      { name: "Service", value: svcRev },
      { name: "Presale", value: preCount },
    ].filter(d => d.value > 0);
    return data.length > 0 ? data : [{ name: "ฝ่ายขาย", value: 1 }, { name: "Service", value: 1 }];
  }, [quotas, service, presale, thisMonth]);

  // ── Customer Segment ───────────────────────────────────────────────────────
  const segData = useMemo(() => {
    const map: Record<string, number> = {};
    customers.forEach(c => {
      const type = c.org_type || c.org_sector || "อื่นๆ";
      const norm = type.includes("โรงพยาบาล") || type.toLowerCase().includes("hospital") ? "โรงพยาบาล"
        : type.includes("รัฐ") || type.toLowerCase().includes("gov") ? "ภาครัฐ"
        : type.includes("โรงเรียน") || type.toLowerCase().includes("school") || type.toLowerCase().includes("edu") ? "การศึกษา"
        : type.includes("อุตสาห") || type.toLowerCase().includes("industrial") ? "อุตสาหกรรม"
        : "เอกชน";
      map[norm] = (map[norm] || 0) + 1;
    });
    const arr = Object.entries(map).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
    return arr.length > 0 ? arr.sort((a, b) => b.value - a.value)
      : [{ name: "เอกชน", value: 5, fill: COLORS[0] },{ name: "ภาครัฐ", value: 3, fill: COLORS[1] }];
  }, [customers]);

  // ── Team Performance ───────────────────────────────────────────────────────
  const teamData = useMemo(() => {
    const arr = quotas
      .filter(q => q.month === thisMonth && q.user_name)
      .map(q => ({
        name: q.user_name.split(" ")[0] ?? q.user_name,
        actual: q.actual_sales || 0,
        target: q.quota_target || 0,
        pct: q.quota_target > 0 ? Math.round((q.actual_sales || 0) / q.quota_target * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
    if (arr.length > 0) return arr;
    return [
      { name: "Sales A", actual: 900000, target: 1000000, pct: 90 },
      { name: "Sales B", actual: 700000, target: 1000000, pct: 70 },
      { name: "Sales C", actual: 500000, target: 1000000, pct: 50 },
    ];
  }, [quotas, thisMonth]);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo<AlertItem[]>(() => {
    const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
    const d7s = d7.toISOString().slice(0, 10);

    const qtOverdue = quotations.filter(q =>
      ["sent","follow_up"].includes(q.status) && (q.follow_up_date || q.sent_date || "") < d7s
    ).length;

    const slaBreached = service.filter(t => {
      if (["resolved","closed"].includes(t.status) || !t.opened_at || !t.sla_resolve_hours) return false;
      const hrs = (new Date().getTime() - new Date(t.opened_at).getTime()) / 3600000;
      return hrs > t.sla_resolve_hours;
    }).length;

    const delayedProj = projects.filter(p =>
      !["won","lost"].includes(p.status) && p.expected_close_date && p.expected_close_date < today
    ).length;

    const lowGP = quotations.filter(q =>
      q.status === "approved" && (q.gp_percent ?? 0) < 15 && q.grand_total > 0
    ).length;

    return [
      { level: qtOverdue > 5 ? "red" : "yellow", icon: "📋", label: "QT ไม่มีการติดตาม > 7 วัน",    count: qtOverdue,    href: "/quotations" },
      { level: slaBreached > 0 ? "red" : "green", icon: "🆘", label: "Ticket เกิน SLA",              count: slaBreached,  href: "/service-tickets" },
      { level: delayedProj > 0 ? "red" : "green", icon: "⏰", label: "Project เกิน Close Date",      count: delayedProj,  href: "/projects" },
      { level: lowGP > 0 ? "yellow" : "green",    icon: "📉", label: "QT ที่ได้รับ GP < 15%",         count: lowGP,        href: "/quotations" },
    ];
  }, [quotations, service, projects, today]);

  // ── Expiring Contracts ─────────────────────────────────────────────────────
  const expiringContracts = useMemo(() => {
    const d30 = new Date(today); d30.setDate(d30.getDate() + 30);
    const d30s = d30.toISOString().slice(0, 10);
    return contracts
      .filter(c => c.status === "active" && c.end_date && c.end_date <= d30s && c.end_date >= today)
      .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""))
      .slice(0, 8);
  }, [contracts, today]);

  return (
    <div className="space-y-4">

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={3} gap="md">
        <KpiCard
          title="รายได้เดือนนี้" icon="💰"
          value={fmtM(kpis.revenue)}
          subtext={`เป้า ${fmtM(kpis.target)} · ${kpis.target > 0 ? Math.round((kpis.revenue / kpis.target) * 100) : 0}%`}
          color="green" href="/reports" loading={loading}
          progress={kpis.target > 0 ? { current: kpis.revenue, target: kpis.target } : undefined}
        />
        <KpiCard
          title="GP เดือนนี้" icon="📈"
          value={`${fmtM(kpis.gpAmt)} (${kpis.gpPct.toFixed(1)}%)`}
          subtext={kpis.gpPct >= 20 ? "✅ GP ดี" : kpis.gpPct >= 10 ? "⚠️ GP ต่ำกว่าเป้า" : "🔴 GP ต่ำมาก"}
          color={kpis.gpPct >= 20 ? "green" : kpis.gpPct >= 10 ? "amber" : "red"}
          href="/reports" loading={loading}
        />
        <KpiCard
          title="Pipeline" icon="🔮"
          value={fmtM(kpis.pipeline)}
          subtext={`${projects.filter(p => !["won","lost"].includes(p.status)).length} deals ที่กำลังดำเนินการ`}
          color="purple" href="/projects" loading={loading}
        />
        <KpiCard
          title="Open Tickets" icon="🎫"
          value={kpis.openTickets}
          subtext={`Service tickets ที่ยังเปิดอยู่`}
          color={kpis.openTickets > 20 ? "red" : kpis.openTickets > 10 ? "amber" : "cyan"}
          href="/service-tickets" loading={loading}
        />
        <KpiCard
          title="Active Projects" icon="🏗️"
          value={kpis.activeProjects}
          subtext={`Projects ที่กำลังดำเนินการทั้งหมด`}
          color="blue" href="/projects" loading={loading}
        />
        <KpiCard
          title="SLA On-Time" icon="⏱️"
          value={`${kpis.slaPct}%`}
          subtext={`Tickets ที่ปิดภายใน SLA`}
          color={kpis.slaPct >= 85 ? "green" : kpis.slaPct >= 70 ? "amber" : "red"}
          href="/service-tickets" loading={loading}
          progress={{ current: kpis.slaPct, target: 100 }}
        />
      </DashboardGrid>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <AlertPanel title="สถานะรวม — รายการที่ต้องดูแล" alerts={alerts} loading={loading} cols={4} />

      {/* ── Charts Row 1 ────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <ChartCard title="Revenue Trend" subtitle="รายรับ 6 เดือนย้อนหลัง" height={220} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ovRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ovGpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}K`} width={40} />
              <Tooltip formatter={(v) => [`${fmtM(Number(v))} ฿`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#ovRevGrad)" name="รายรับ" />
              <Area type="monotone" dataKey="gp" stroke="#22c55e" strokeWidth={2} fill="url(#ovGpGrad)" name="GP" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Team Performance" subtitle={`ผลงานฝ่ายขาย ${thisMonth}`} height={220} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip formatter={(v) => [`${v}%`, "บรรลุเป้า"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="pct" name="%" radius={[4, 4, 0, 0]}>
                {teamData.map((d, i) => (
                  <Cell key={i} fill={d.pct >= 80 ? "#22c55e" : d.pct >= 50 ? "#f59e0b" : "#f43f5e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </DashboardGrid>

      {/* ── Charts Row 2 ────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <ChartCard title="Revenue by Department" subtitle="สัดส่วนรายได้ตามแผนก" height={200} loading={loading}>
          <div className="flex gap-3 items-center h-full">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value" paddingAngle={2}>
                  {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${fmtM(Number(v))}`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {deptData.map((d, i) => {
                const total = deptData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-muted flex-1">{d.name}</span>
                    <span className="text-xs font-semibold">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Customer Segment" subtitle="จำนวนลูกค้าตามประเภท" height={200} loading={loading}>
          <div className="flex gap-3 items-center h-full">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={segData} cx="50%" cy="50%" outerRadius={68} dataKey="value" paddingAngle={2}>
                  {segData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} ราย`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {segData.slice(0, 5).map(s => {
                const total = segData.reduce((x, d) => x + d.value, 0);
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                    <span className="text-xs text-muted flex-1">{s.name}</span>
                    <span className="text-xs font-semibold">{total > 0 ? Math.round(s.value / total * 100) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* ── Expiring Contracts ───────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">📜 สัญญาใกล้หมดอายุ (30 วัน)</h3>
          <Link href="/contracts" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
        </div>
        {loading ? (
          <EmptyState title="กำลังโหลด..." compact />
        ) : expiringContracts.length === 0 ? (
          <p className="text-xs text-emerald-500 py-1">✅ ไม่มีสัญญาใกล้หมดอายุ</p>
        ) : (
          <DataTable
            columns={[
              { key: "contract_number", label: "เลขสัญญา", width: "w-28" },
              { key: "customer_name",   label: "ลูกค้า" },
              { key: "type",            label: "ประเภท",  width: "w-28",
                render: (r) => <span className="text-muted">{(r as unknown as ServiceContract).type?.replace(/_/g," ")}</span> },
              { key: "end_date",        label: "หมดอายุ", align: "center", width: "w-24",
                render: (r) => {
                  const d = (r as unknown as ServiceContract).end_date ?? "";
                  const days = Math.ceil((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
                  return (
                    <span className={`font-medium ${days <= 7 ? "text-rose-500" : days <= 14 ? "text-amber-500" : "text-muted"}`}>
                      {d.slice(5)} ({days}d)
                    </span>
                  );
                },
              },
            ]}
            data={expiringContracts as unknown as Record<string, unknown>[]}
            compact
          />
        )}
      </div>

    </div>
  );
}
