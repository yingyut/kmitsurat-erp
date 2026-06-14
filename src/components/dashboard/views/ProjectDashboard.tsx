"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { Project, Quotation, Customer, User } from "@/lib/types";
import { KpiCard } from "../KpiCard";
import { ChartCard } from "../ChartCard";
import { DataTable, type Column } from "../DataTable";
import { AlertPanel, type AlertItem } from "../AlertPanel";
import { DashboardGrid } from "../DashboardGrid";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#f97316"];
const STATUS_LABEL: Record<string, string> = {
  lead: "Lead", opportunity: "Opportunity", proposal: "Proposal",
  negotiation: "Negotiation", won: "Won", lost: "Lost",
};
function fmtM(v: number) { return v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${Math.round(v/1000)}K` : "—"; }

interface ProjectDashboardProps {
  projects: Project[];
  quotations: Quotation[];
  customers: Customer[];
  users: User[];
  loading: boolean;
  today: string;
  thisMonth: string;
  myName: string;
  isManager: boolean;
}

export function ProjectDashboard({ projects, quotations, customers, loading, today, thisMonth, myName, isManager }: ProjectDashboardProps) {

  const myProjects = useMemo(() => {
    if (isManager) return projects;
    type ExtP = { co_owners?: string[]; team_members?: string[] };
    return projects.filter(p => {
      const ep = p as unknown as ExtP;
      return (
        p.assigned_to === myName ||
        (ep.co_owners ?? []).includes(myName) ||
        (ep.team_members ?? []).includes(myName)
      );
    });
  }, [projects, isManager, myName]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const PIPE_ST = new Set(["lead","opportunity","proposal","negotiation"]);
    const active    = myProjects.filter(p => PIPE_ST.has(p.status)).length;
    const delayed   = myProjects.filter(p => PIPE_ST.has(p.status) && p.expected_close_date && p.expected_close_date < today).length;
    const completed = myProjects.filter(p => p.status === "won").length;
    const budgetUse = myProjects.filter(p => PIPE_ST.has(p.status)).reduce((s, p) => s + (p.value || 0), 0);
    const avgProb   = (() => {
      const ps = myProjects.filter(p => PIPE_ST.has(p.status) && p.probability != null);
      return ps.length > 0 ? Math.round(ps.reduce((s, p) => s + (p.probability || 0), 0) / ps.length) : 0;
    })();
    const pending = myProjects.filter(p => p.status === "won" && !p.expected_close_date).length;
    return { active, delayed, completed, budgetUse, avgProb, pending };
  }, [myProjects, today]);

  // ── Project Status Pie ─────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    myProjects.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map)
      .map(([status, count], i) => ({ name: STATUS_LABEL[status] || status, value: count, fill: COLORS[i % COLORS.length] }))
      .filter(d => d.value > 0);
  }, [myProjects]);

  // ── Progress by Stage ──────────────────────────────────────────────────────
  const stageProgress = useMemo(() => {
    const STAGES = ["lead","opportunity","proposal","negotiation","won"];
    return STAGES.map(s => {
      const ps = myProjects.filter(p => p.status === s);
      return {
        name: STATUS_LABEL[s] || s,
        count: ps.length,
        value: ps.reduce((sum, p) => sum + (p.value || 0), 0),
      };
    }).filter(d => d.count > 0);
  }, [myProjects]);

  // ── Budget vs Actual ───────────────────────────────────────────────────────
  const budgetData = useMemo(() => {
    const PIPE_ST = new Set(["lead","opportunity","proposal","negotiation"]);
    const myApproved = quotations.filter(q => q.status === "approved" || q.po_received);
    return myProjects
      .filter(p => PIPE_ST.has(p.status) || p.status === "won")
      .slice(0, 6)
      .map(p => {
        const linked = myApproved.filter(q => q.project_id === p.id);
        const actual = linked.reduce((s, q) => s + (q.grand_total || 0), 0);
        return {
          name: (p.customer_name || p.name || "—").slice(0, 10),
          budget: p.value || 0,
          actual,
        };
      })
      .filter(d => d.budget > 0 || d.actual > 0);
  }, [myProjects, quotations]);

  // ── Tables ─────────────────────────────────────────────────────────────────
  const delayedProjs = useMemo(() =>
    [...myProjects]
      .filter(p => !["won","lost"].includes(p.status) && p.expected_close_date && p.expected_close_date < today)
      .sort((a, b) => (a.expected_close_date || "").localeCompare(b.expected_close_date || ""))
      .slice(0, 8),
    [myProjects, today]
  );

  const upcomingClose = useMemo(() => {
    const d30 = new Date(today); d30.setDate(d30.getDate() + 30); const d30s = d30.toISOString().slice(0, 10);
    return [...myProjects]
      .filter(p => !["won","lost"].includes(p.status) && p.expected_close_date && p.expected_close_date >= today && p.expected_close_date <= d30s)
      .sort((a, b) => (a.expected_close_date || "").localeCompare(b.expected_close_date || ""))
      .slice(0, 8);
  }, [myProjects, today]);

  const highValue = useMemo(() =>
    [...myProjects]
      .filter(p => !["won","lost"].includes(p.status))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 8),
    [myProjects]
  );

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo<AlertItem[]>(() => {
    const d7 = new Date(today); d7.setDate(d7.getDate() + 7); const d7s = d7.toISOString().slice(0, 10);
    const d30 = new Date(today); d30.setDate(d30.getDate() + 30); const d30s = d30.toISOString().slice(0, 10);
    const delayed  = myProjects.filter(p => !["won","lost"].includes(p.status) && p.expected_close_date && p.expected_close_date < today).length;
    const soonClose = myProjects.filter(p => !["won","lost"].includes(p.status) && p.expected_close_date && p.expected_close_date >= today && p.expected_close_date <= d7s).length;
    const noDate   = myProjects.filter(p => !["won","lost"].includes(p.status) && !p.expected_close_date).length;
    const highProb = myProjects.filter(p => (p.probability || 0) >= 80 && !["won","lost"].includes(p.status)).length;
    return [
      { level: delayed > 0 ? "red" : "green",      icon: "⏰", label: "Project เกิน Close Date",    count: delayed,   href: "/projects" },
      { level: soonClose > 0 ? "yellow" : "green",  icon: "📅", label: "ปิดใน 7 วัน",               count: soonClose, href: "/projects" },
      { level: noDate > 3 ? "yellow" : "blue",      icon: "❓", label: "ไม่มี Close Date",           count: noDate,    href: "/projects" },
      { level: highProb > 0 ? "blue" : "green",     icon: "🎯", label: "Prob >= 80% (ใกล้ปิด)",     count: highProb,  href: "/projects" },
    ];
  }, [myProjects, today]);

  const projCols: Column<Record<string,unknown>>[] = [
    { key: "customer_name", label: "ลูกค้า",
      render: r => <Link href="/projects" className="font-medium hover:text-blue-500">{String(r.customer_name||"—")}</Link> },
    { key: "name",          label: "โปรเจค", className: "text-muted max-w-[140px] truncate" },
    { key: "value",         label: "มูลค่า", align: "right",
      render: r => <span className="font-semibold text-emerald-500">{fmtM(Number(r.value||0))}</span> },
    { key: "status",        label: "Stage", align: "center",
      render: r => <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500">{STATUS_LABEL[String(r.status)]||String(r.status)}</span> },
    { key: "probability",   label: "%", align: "right",
      render: r => {
        const p = Number(r.probability||0);
        return <span className={p>=70?"text-emerald-500":p>=40?"text-amber-500":"text-muted"}>{p}%</span>;
      }},
    { key: "expected_close_date", label: "Close", align: "center",
      render: r => {
        const d = String(r.expected_close_date||"");
        const overdue = d && d < today;
        return <span className={overdue ? "text-rose-500 font-medium" : "text-muted"}>{d.slice(5)||"—"}</span>;
      }},
  ];

  return (
    <div className="space-y-4">

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={3} gap="md">
        <KpiCard title="Active Projects" icon="🏗️" value={kpis.active}
          subtext="Projects ที่กำลังดำเนินการ" color="blue" href="/projects" loading={loading} />
        <KpiCard title="Delayed" icon="⏰" value={kpis.delayed}
          subtext="เลย Expected Close Date"
          color={kpis.delayed > 0 ? "red" : "green"} href="/projects" loading={loading} />
        <KpiCard title="Won (เดือนนี้)" icon="🏆" value={myProjects.filter(p => p.status === "won" && p.expected_close_date?.startsWith(thisMonth)).length}
          subtext="Projects ที่ปิดได้ในเดือนนี้" color="green" href="/projects" loading={loading} />
        <KpiCard title="Budget (Pipeline)" icon="💰" value={fmtM(kpis.budgetUse)}
          subtext="มูลค่า Projects ที่กำลังดำเนินการ" color="purple" href="/projects" loading={loading} />
        <KpiCard title="Avg. Probability" icon="📊" value={`${kpis.avgProb}%`}
          subtext="ค่าเฉลี่ยโอกาสปิดงาน"
          color={kpis.avgProb >= 60 ? "green" : kpis.avgProb >= 40 ? "amber" : "blue"}
          href="/projects" loading={loading}
          progress={{ current: kpis.avgProb, target: 100 }} />
        <KpiCard title="Won ทั้งหมด" icon="✅" value={kpis.completed}
          subtext="Projects ที่ปิดสำเร็จ" color="cyan" href="/projects" loading={loading} />
      </DashboardGrid>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <AlertPanel title="สถานะ Projects" alerts={alerts} loading={loading} cols={4} />

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <ChartCard title="Project Progress by Stage" subtitle="จำนวน Projects ต่อ Stage" height={200} loading={loading} empty={stageProgress.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageProgress} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                {stageProgress.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <DashboardGrid cols={1} gap="md">
          <ChartCard title="Project Status" height={96} loading={loading} empty={statusData.length === 0}>
            <div className="flex gap-2 items-center h-full">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={40} dataKey="value" paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} โปรเจค`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
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

          <ChartCard title="Budget vs Actual" height={96} loading={loading} empty={budgetData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}K`} width={32} />
                <Tooltip formatter={(v) => [`${fmtM(Number(v))} ฿`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="budget" name="Budget"  fill="#8b5cf6" radius={[2,2,0,0]} />
                <Bar dataKey="actual" name="Actual"  fill="#22c55e" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </DashboardGrid>
      </DashboardGrid>

      {/* ── Tables ──────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">⏰ Delayed Projects</h3>
          <Link href="/projects" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
        </div>
        <DataTable columns={projCols} data={delayedProjs as unknown as Record<string,unknown>[]}
          emptyTitle="✅ ไม่มี Project ที่ล่าช้า" compact />
      </div>

      <DashboardGrid cols={2} gap="md">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">📅 Upcoming Close (30 วัน)</h3>
            <Link href="/projects" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <DataTable columns={projCols} data={upcomingClose as unknown as Record<string,unknown>[]}
            emptyTitle="ไม่มี Projects ที่จะปิดใน 30 วัน" compact />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">🏆 High Value Pipeline</h3>
            <Link href="/projects" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <DataTable columns={projCols} data={highValue as unknown as Record<string,unknown>[]}
            emptyTitle="ไม่มีข้อมูล Pipeline" compact />
        </div>
      </DashboardGrid>

    </div>
  );
}
