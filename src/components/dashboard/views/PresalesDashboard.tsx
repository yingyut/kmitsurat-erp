"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { PresaleRequest, User } from "@/lib/types";
import { KpiCard } from "../KpiCard";
import { ChartCard } from "../ChartCard";
import { DataTable, type Column } from "../DataTable";
import { AlertPanel, type AlertItem } from "../AlertPanel";
import { DashboardGrid } from "../DashboardGrid";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#f97316"];
const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่", pending: "รอดำเนินการ", assigned: "มอบหมาย", in_progress: "กำลังทำ",
  waiting_info: "รอข้อมูล", waiting_approval: "รอ Approve", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
};
const TYPE_LABEL: Record<string, string> = {
  solution_design: "Solution Design", requirement_summary: "Requirement Summary",
  boq: "BOQ", technical_proposal: "Tech Proposal", site_survey: "Site Survey", project_planning: "Project Planning",
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-rose-500", high: "text-amber-500", normal: "text-blue-500", low: "text-muted",
};

interface PresalesDashboardProps {
  presale: PresaleRequest[];
  users: User[];
  loading: boolean;
  today: string;
  thisMonth: string;
  myName: string;
  isManager: boolean;
}

export function PresalesDashboard({ presale, users, loading, today, thisMonth, myName, isManager }: PresalesDashboardProps) {

  const myWork = useMemo(() =>
    isManager ? presale : presale.filter(r => r.assigned_to === myName),
    [presale, isManager, myName]
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const newReq  = myWork.filter(r => r.status === "new").length;
    const inProg  = myWork.filter(r => ["assigned","in_progress"].includes(r.status)).length;
    const completed = myWork.filter(r => r.status === "completed").length;
    const overSLA = myWork.filter(r => !["completed","cancelled"].includes(r.status) && r.due_date && r.due_date < today).length;
    const pendingApproval = myWork.filter(r => r.status === "waiting_approval").length;
    const waitInfo = myWork.filter(r => r.status === "waiting_info").length;
    return { newReq, inProg, completed, overSLA, pendingApproval, waitInfo };
  }, [myWork, today]);

  // ── Workload by Engineer ───────────────────────────────────────────────────
  const workloadData = useMemo(() => {
    const map: Record<string, number> = {};
    presale.filter(r => !["completed","cancelled"].includes(r.status)).forEach(r => {
      if (r.assigned_to) map[r.assigned_to] = (map[r.assigned_to] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.split(" ")[0] ?? name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [presale]);

  // ── Job Type Distribution ──────────────────────────────────────────────────
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    myWork.forEach(r => { map[r.type] = (map[r.type] || 0) + 1; });
    return Object.entries(map)
      .map(([type, count], i) => ({ name: TYPE_LABEL[type] || type, value: count, fill: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [myWork]);

  // ── Status Distribution ────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    myWork.forEach(r => { map[r.status] = (map[r.status] || 0) + 1; });
    return Object.entries(map)
      .map(([status, count], i) => ({ name: STATUS_LABEL[status] || status, value: count, fill: COLORS[i % COLORS.length] }))
      .filter(d => d.value > 0);
  }, [myWork]);

  // ── Tables ─────────────────────────────────────────────────────────────────
  const pendingReqs = useMemo(() =>
    [...myWork]
      .filter(r => ["new","pending","assigned"].includes(r.status))
      .sort((a, b) => {
        const pa = a.priority === "urgent" ? 0 : a.priority === "high" ? 1 : 2;
        const pb = b.priority === "urgent" ? 0 : b.priority === "high" ? 1 : 2;
        return pa - pb;
      })
      .slice(0, 8),
    [myWork]
  );

  const waitingFeedback = useMemo(() =>
    myWork.filter(r => r.status === "waiting_info").slice(0, 8),
    [myWork]
  );

  const highPriority = useMemo(() =>
    [...myWork]
      .filter(r => ["urgent","high"].includes(r.priority ?? "") && !["completed","cancelled"].includes(r.status))
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
      .slice(0, 8),
    [myWork]
  );

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo<AlertItem[]>(() => [
    { level: kpis.overSLA > 0 ? "red" : "green",           icon: "🆘", label: "งานเกิน SLA",        count: kpis.overSLA,       href: "/presale" },
    { level: kpis.newReq > 5 ? "yellow" : "blue",           icon: "📥", label: "งานใหม่รอรับ",       count: kpis.newReq,        href: "/presale" },
    { level: kpis.pendingApproval > 0 ? "yellow" : "green", icon: "⏳", label: "รอ Approve",         count: kpis.pendingApproval, href: "/presale" },
    { level: kpis.waitInfo > 3 ? "yellow" : "blue",         icon: "❓", label: "รอข้อมูลเพิ่มเติม", count: kpis.waitInfo,      href: "/presale" },
  ], [kpis]);

  const baseColumns: Column<Record<string,unknown>>[] = [
    { key: "customer_name", label: "ลูกค้า", render: r => <span className="font-medium">{String(r.customer_name||"—")}</span> },
    { key: "type",          label: "ประเภท",
      render: r => <span className="text-muted text-[10px]">{TYPE_LABEL[String(r.type)]||String(r.type)}</span> },
    { key: "priority",      label: "Priority", align: "center",
      render: r => <span className={`text-xs font-semibold ${PRIORITY_COLOR[String(r.priority||"normal")]}`}>{String(r.priority||"normal")}</span> },
    { key: "due_date",      label: "Due", align: "center",
      render: r => {
        const d = String(r.due_date || "");
        const days = d ? Math.ceil((new Date(d).getTime() - new Date(today).getTime()) / 86400000) : null;
        return <span className={days !== null && days < 0 ? "text-rose-500 font-medium" : "text-muted"}>{d.slice(5)||"—"}</span>;
      }},
    { key: "assigned_to",   label: "ผู้รับผิดชอบ", className: "text-muted" },
  ];

  return (
    <div className="space-y-4">

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={3} gap="md">
        <KpiCard title="งานใหม่" icon="📥" value={kpis.newReq}
          subtext="รายการที่รอรับมอบหมาย" color="blue" href="/presale" loading={loading} />
        <KpiCard title="กำลังดำเนินการ" icon="⚙️" value={kpis.inProg}
          subtext="assigned + in_progress" color="purple" href="/presale" loading={loading} />
        <KpiCard title="เสร็จสิ้น (เดือนนี้)" icon="✅" value={myWork.filter(r => r.status === "completed" && r.due_date?.startsWith(thisMonth)).length}
          subtext="งานที่ส่งมอบแล้ว" color="green" href="/presale" loading={loading} />
        <KpiCard title="เกิน SLA" icon="🆘" value={kpis.overSLA}
          subtext="งานที่เลยกำหนดแล้ว"
          color={kpis.overSLA > 0 ? "red" : "green"} href="/presale" loading={loading} />
        <KpiCard title="รอ Approve" icon="⏳" value={kpis.pendingApproval}
          subtext="waiting_approval"
          color={kpis.pendingApproval > 0 ? "amber" : "cyan"} href="/presale" loading={loading} />
        <KpiCard title="รอข้อมูล" icon="❓" value={kpis.waitInfo}
          subtext="waiting_info จาก Sales"
          color={kpis.waitInfo > 0 ? "amber" : "blue"} href="/presale" loading={loading} />
      </DashboardGrid>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <AlertPanel title="สถานะงาน Presales" alerts={alerts} loading={loading} cols={4} />

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <ChartCard title="Workload by Engineer" subtitle="จำนวนงาน (ไม่รวมเสร็จ)" height={200} loading={loading} empty={workloadData.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" name="งาน" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <DashboardGrid cols={1} gap="md">
          <ChartCard title="Job Type Distribution" height={96} loading={loading} empty={typeData.length === 0}>
            <div className="flex gap-2 items-center h-full">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={40} dataKey="value" paddingAngle={2}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} งาน`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {typeData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted flex-1 truncate">{d.name}</span>
                    <span className="text-[10px] font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Status Overview" height={96} loading={loading} empty={statusData.length === 0}>
            <div className="flex gap-2 items-center h-full">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={40} dataKey="value" paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} งาน`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {statusData.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted flex-1 truncate">{d.name}</span>
                    <span className="text-[10px] font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </DashboardGrid>
      </DashboardGrid>

      {/* ── Tables ──────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">📋 Pending Requests</h3>
            <Link href="/presale" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <DataTable columns={baseColumns} data={pendingReqs as unknown as Record<string,unknown>[]}
            emptyTitle="ไม่มีงาน Pending" compact />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">🔴 High Priority</h3>
            <Link href="/presale" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <DataTable columns={baseColumns} data={highPriority as unknown as Record<string,unknown>[]}
            emptyTitle="ไม่มีงาน High Priority" compact />
        </div>
      </DashboardGrid>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">❓ Waiting Sales Feedback</h3>
          <Link href="/presale" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
        </div>
        <DataTable
          columns={[
            ...baseColumns,
            { key: "requirement", label: "รายละเอียด", className: "text-muted max-w-[200px] truncate" },
          ]}
          data={waitingFeedback as unknown as Record<string,unknown>[]}
          emptyTitle="ไม่มีงานรอ Feedback" compact />
      </div>

    </div>
  );
}
