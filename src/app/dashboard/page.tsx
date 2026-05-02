"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket, SalesQuota, Quotation } from "@/lib/types";
import {
  BarChart, Bar, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// Colors
const C = { blue: "#3b82f6", purple: "#8b5cf6", rose: "#f43f5e", green: "#22c55e", amber: "#f59e0b", cyan: "#06b6d4", indigo: "#6366f1", orange: "#f97316" };
const PIE_COLORS = [C.blue, C.amber, C.green, C.rose];

type Filter = "today" | "week" | "month" | "year";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("month");

  const [projects, setProjects] = useState<Project[]>([]);
  const [sales, setSales] = useState<SalesActivity[]>([]);
  const [presale, setPresale] = useState<PresaleRequest[]>([]);
  const [service, setService] = useState<ServiceTicket[]>([]);
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [quots, setQuots] = useState<Quotation[]>([]);

  async function load() {
    try {
      const fs = await import("@/lib/firestore");
      const [p, s, pr, sv, q, qt] = await Promise.all([
        fs.projects.list(), fs.salesActivities.list(), fs.presaleRequests.list(),
        fs.serviceTickets.list(), fs.salesQuotas.list(), fs.quotations.list(),
      ]);
      setProjects(p); setSales(s); setPresale(pr); setService(sv); setQuotas(q); setQuots(qt);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  // === CALCULATIONS ===
  const today = new Date().toISOString().slice(0, 10);
  const revenue = projects.filter(p => p.status === "won").reduce((s, p) => s + (p.value || 0), 0);
  const target = quotas.reduce((s, q) => s + (q.quota_target || 0), 0);
  const actual = quotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
  const targetPct = target > 0 ? (actual / target * 100) : 0;
  const pipeline = projects.filter(p => !["won", "lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  const overdueJobs = sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done").length
    + presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed").length
    + service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
  const totalSvc = service.length;
  const slaOnTime = totalSvc > 0 ? Math.round(service.filter(t => ["resolved", "closed"].includes(t.status)).length / totalSvc * 100) : 100;
  const forecast = actual + pipeline * 0.3; // weighted forecast

  // Sales
  const funnelData = [
    { value: projects.filter(p => p.status === "lead").length, name: "Lead", fill: C.blue },
    { value: projects.filter(p => p.status === "opportunity").length, name: "Opportunity", fill: C.cyan },
    { value: projects.filter(p => p.status === "proposal").length, name: "Proposal", fill: C.amber },
    { value: projects.filter(p => p.status === "negotiation").length, name: "Negotiation", fill: C.orange },
    { value: projects.filter(p => p.status === "won").length, name: "Won", fill: C.green },
  ];
  const wonCount = projects.filter(p => p.status === "won").length;
  const totalDeals = projects.filter(p => p.status !== "lost").length;
  const convRate = totalDeals > 0 ? (wonCount / totalDeals * 100) : 0;

  const activityByPerson = [...new Set(sales.map(a => a.assigned_to))].filter(Boolean).map(name => ({
    name: name.split(" ")[0],
    count: sales.filter(a => a.assigned_to === name).length,
  }));

  const todayCalls = sales.filter(a => a.type === "phone_call").length;
  const todayMeetings = sales.filter(a => a.type === "meeting" || a.type === "visit").length;
  const todayFollowups = sales.filter(a => a.type === "follow_up").length;

  // Presale
  const prNew = presale.filter(r => r.status === "pending").length;
  const prProg = presale.filter(r => r.status === "in_progress").length;
  const prDone = presale.filter(r => r.status === "completed").length;
  const prByType = [
    { name: "BOQ", value: presale.filter(r => r.type === "boq").length },
    { name: "Design", value: presale.filter(r => r.type === "solution_design").length },
    { name: "Proposal", value: presale.filter(r => r.type === "technical_proposal").length },
    { name: "Survey", value: presale.filter(r => r.type === "site_survey").length },
  ].filter(d => d.value > 0);

  const prWorkload = [...new Set(presale.map(r => r.assigned_to))].filter(Boolean).map(name => ({
    name: name.split(" ")[0],
    pending: presale.filter(r => r.assigned_to === name && r.status === "pending").length,
    progress: presale.filter(r => r.assigned_to === name && r.status === "in_progress").length,
    done: presale.filter(r => r.assigned_to === name && r.status === "completed").length,
  }));

  // Service
  const cmJobs = service.filter(t => ["repair", "after_sales"].includes(t.type)).length;
  const pmJobs = service.filter(t => t.type === "pm_service").length;
  const installJobs = service.filter(t => t.type === "installation").length;
  const svcOnTime = service.filter(t => ["resolved", "closed"].includes(t.status)).length;
  const svcDelay = service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
  const svcPie = [
    { name: "On-time", value: svcOnTime },
    { name: "Delay", value: svcDelay },
    { name: "Active", value: totalSvc - svcOnTime - svcDelay },
  ].filter(d => d.value > 0);

  // Projects
  const activeP = projects.filter(p => !["won", "lost"].includes(p.status)).length;
  const pendingP = projects.filter(p => p.status === "lead").length;
  const completedP = projects.filter(p => p.status === "won").length;
  const projValue = projects.reduce((s, p) => s + (p.value || 0), 0);

  // Team Performance
  const allNames = [...new Set([...sales.map(a => a.assigned_to), ...presale.map(r => r.assigned_to), ...service.map(t => t.technician)])].filter(Boolean);
  const teamPerf = allNames.map(name => {
    const sA = sales.filter(a => a.assigned_to === name);
    const pA = presale.filter(r => r.assigned_to === name);
    const tA = service.filter(t => t.technician === name);
    const total = sA.length + pA.length + tA.length;
    const done = sA.filter(a => a.status === "done").length + pA.filter(r => r.status === "completed").length + tA.filter(t => ["resolved", "closed"].includes(t.status)).length;
    const late = sA.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done").length;
    return { name, total, done, pending: total - done, late };
  }).sort((a, b) => b.total - a.total);

  const teamChart = teamPerf.map(m => ({ name: m.name.split(" ")[0], done: m.done, pending: m.pending, late: m.late }));

  // Alerts
  type AlertItem = { id: string; msg: string; level: "red" | "orange" | "green"; href: string };
  const alerts: AlertItem[] = [];
  sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done").forEach(a => alerts.push({ id: `so-${a.id}`, msg: `Sales overdue: ${a.description.slice(0, 40)}`, level: "red", href: "/sales" }));
  presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed").forEach(r => alerts.push({ id: `po-${r.id}`, msg: `Presale ค้าง SLA: ${r.requirement.slice(0, 40)}`, level: "red", href: "/presale" }));
  service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).forEach(t => alerts.push({ id: `sv-${t.id}`, msg: `Service ค้าง: ${t.issue.slice(0, 40)}`, level: "orange", href: "/service" }));
  projects.filter(p => p.value >= 1000000 && !["won", "lost"].includes(p.status)).forEach(p => alerts.push({ id: `hp-${p.id}`, msg: `ดีลใหญ่: ${p.name} (${(p.value / 1000000).toFixed(1)}M)`, level: "orange", href: "/projects" }));
  const draftQ = quots.filter(q => q.status === "draft").length;
  if (draftQ > 0) alerts.push({ id: "dq", msg: `${draftQ} ใบเสนอราคา Draft รอส่ง`, level: "green", href: "/quotations" });

  // Work items
  type WI = { id: string; title: string; sub: string; type: string; status: string; value?: number; href: string };
  const workItems: WI[] = [
    ...sales.filter(a => a.status !== "done").slice(0, 3).map(a => ({ id: a.id!, title: a.description, sub: a.customer_name, type: "sales", status: a.status, href: "/sales" })),
    ...presale.filter(r => r.status !== "completed").slice(0, 2).map(r => ({ id: r.id!, title: r.requirement, sub: r.customer_name, type: "presale", status: r.status, href: "/presale" })),
    ...service.filter(t => !["resolved", "closed"].includes(t.status)).slice(0, 2).map(t => ({ id: t.id!, title: t.issue, sub: t.customer_name, type: "service", status: t.status, href: "/service" })),
  ];

  const alertColor = { red: "bg-red-900/20 border-red-800 text-red-400", orange: "bg-amber-900/20 border-amber-800 text-amber-400", green: "bg-emerald-900/20 border-emerald-800 text-emerald-400" };
  const alertIcon = { red: "🔴", orange: "🟠", green: "🟢" };
  const typeColor: Record<string, string> = { sales: "bg-blue-900/50 text-blue-400", presale: "bg-purple-900/50 text-purple-400", service: "bg-rose-900/50 text-rose-400" };

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-5 max-w-[1400px]">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" title="แดชบอร์ดผู้บริหาร">Executive Dashboard</h1>
          <p className="text-xs text-muted">ภาพรวมการทำงาน KMITSURAT — ตัดสินใจเร็วขึ้น</p>
        </div>
        <div className="flex gap-1.5">
          {(["today", "week", "month", "year"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} title={f === "today" ? "วันนี้" : f === "week" ? "สัปดาห์นี้" : f === "month" ? "เดือนนี้" : "ปีนี้"}
              className={`px-3 py-1.5 rounded-lg text-xs ${filter === f ? "bg-accent text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* ═══════════════ LAYER 1: DECISION ═══════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KPI label="Total Revenue" thai="รายได้รวม" value={`${(revenue / 1000000).toFixed(1)}M`} sub="THB" color="green" />
        <div className="rounded-xl bg-card border border-border p-4" title="ยอดขายเทียบเป้า">
          <p className="text-[10px] text-muted uppercase">Target vs Actual</p>
          <p className="text-[10px] text-muted">ยอดเทียบเป้า</p>
          <p className={`text-2xl font-bold mt-1 ${targetPct >= 80 ? "text-green-400" : targetPct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{targetPct.toFixed(0)}%</p>
          <div className="mt-2 h-2 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${targetPct >= 80 ? "bg-green-500" : targetPct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(targetPct, 100)}%` }} /></div>
          <p className="text-[10px] text-muted mt-1">{actual.toLocaleString()} / {target.toLocaleString()}</p>
        </div>
        <KPI label="Pipeline Value" thai="มูลค่าดีลรอปิด" value={`${(pipeline / 1000000).toFixed(1)}M`} sub="THB" color="blue" />
        <KPI label="Overdue Jobs" thai="งานล่าช้า" value={String(overdueJobs)} sub={overdueJobs > 0 ? "ต้องแก้ด่วน!" : "ปกติ"} color={overdueJobs > 0 ? "red" : "green"} />
        <KPI label="SLA On-time" thai="อัตราปิดงานตาม SLA" value={`${slaOnTime}%`} sub={`${svcOnTime}/${totalSvc} jobs`} color={slaOnTime >= 80 ? "green" : slaOnTime >= 50 ? "amber" : "red"} />
        <KPI label="Forecast EOM" thai="คาดการณ์สิ้นเดือน" value={`${(forecast / 1000000).toFixed(1)}M`} sub="THB" color="cyan" />
      </div>

      {/* ═══════════════ LAYER 2: OPERATION ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">

        {/* SALES OVERVIEW */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-blue-400">Sales Overview</h3>
          <p className="text-[10px] text-muted mb-3">ภาพรวมยอดขายและกิจกรรมของทีมขาย</p>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <div className="text-center"><p className="text-lg font-bold">{todayCalls}</p><p className="text-muted">Calls</p></div>
            <div className="text-center"><p className="text-lg font-bold">{todayMeetings}</p><p className="text-muted">Meetings</p></div>
            <div className="text-center"><p className="text-lg font-bold">{todayFollowups}</p><p className="text-muted">Follow-ups</p></div>
            <div className="text-center"><p className="text-lg font-bold text-green-400">{convRate.toFixed(0)}%</p><p className="text-muted">Conv. Rate</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted mb-1">Sales Funnel</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} width={65} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>{funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-[10px] text-muted mb-1">Activity / Person</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={activityByPerson} margin={{ left: 0, right: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill={C.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PRESALE OVERVIEW */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-purple-400">Presale Workload</h3>
          <p className="text-[10px] text-muted mb-3">ภาพรวมงานออกแบบโซลูชันและ BOQ</p>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <div className="text-center"><p className="text-lg font-bold">{presale.length}</p><p className="text-muted">Total</p></div>
            <div className="text-center"><p className="text-lg font-bold text-yellow-400">{prNew}</p><p className="text-muted">Waiting</p></div>
            <div className="text-center"><p className="text-lg font-bold text-blue-400">{prProg}</p><p className="text-muted">Working</p></div>
            <div className="text-center"><p className="text-lg font-bold text-green-400">{prDone}</p><p className="text-muted">Done</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted mb-1">By Type</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={prByType.length > 0 ? prByType : [{ name: "None", value: 1 }]} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value">
                    {(prByType.length > 0 ? prByType : [{ name: "None", value: 1 }]).map((_, i) => <Cell key={i} fill={[C.purple, C.blue, C.amber, C.cyan][i % 4]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-[10px] text-muted mb-1">Workload / Person</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={prWorkload} margin={{ left: 0, right: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="pending" stackId="a" fill={C.amber} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="progress" stackId="a" fill={C.blue} />
                  <Bar dataKey="done" stackId="a" fill={C.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SERVICE OVERVIEW */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-rose-400">Service Operation</h3>
          <p className="text-[10px] text-muted mb-3">ภาพรวมงาน CM / PM / Install และ SLA</p>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <div className="text-center"><p className="text-lg font-bold">{cmJobs}</p><p className="text-muted">CM</p></div>
            <div className="text-center"><p className="text-lg font-bold">{pmJobs}</p><p className="text-muted">PM</p></div>
            <div className="text-center"><p className="text-lg font-bold">{installJobs}</p><p className="text-muted">Install</p></div>
            <div className="text-center"><p className={`text-lg font-bold ${slaOnTime >= 80 ? "text-green-400" : "text-red-400"}`}>{slaOnTime}%</p><p className="text-muted">SLA</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted mb-1">SLA Status</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={svcPie.length > 0 ? svcPie : [{ name: "None", value: 1 }]} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value">
                    {(svcPie.length > 0 ? svcPie : [{ name: "None", value: 1 }]).map((_, i) => <Cell key={i} fill={[C.green, C.rose, C.amber][i % 3]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-[10px] text-muted mb-1">Job Types</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[{ name: "CM", v: cmJobs }, { name: "PM", v: pmJobs }, { name: "Install", v: installJobs }]} margin={{ left: 0, right: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]}>{[C.rose, C.amber, C.blue].map((c, i) => <Cell key={i} fill={c} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PROJECT OVERVIEW */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-indigo-400">Project Overview</h3>
          <p className="text-[10px] text-muted mb-3">ภาพรวมโปรเจคและมูลค่างาน</p>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <div className="text-center"><p className="text-lg font-bold text-blue-400">{activeP}</p><p className="text-muted">Active</p></div>
            <div className="text-center"><p className="text-lg font-bold text-yellow-400">{pendingP}</p><p className="text-muted">Pending</p></div>
            <div className="text-center"><p className="text-lg font-bold text-green-400">{completedP}</p><p className="text-muted">Won</p></div>
            <div className="text-center"><p className="text-lg font-bold">{(projValue / 1000000).toFixed(1)}M</p><p className="text-muted">Value</p></div>
          </div>
          <div className="space-y-1.5">
            {projects.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                <div className="flex-1 min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-muted">{p.customer_name}</p></div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted">{(p.value || 0).toLocaleString()}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${p.status === "won" ? "bg-green-900/50 text-green-400" : p.status === "lost" ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ LAYER 3: DETAIL ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* TEAM PERFORMANCE */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-1" title="ผลงานรายบุคคล">Team Performance</h3>
          <p className="text-[10px] text-muted mb-3">ภาระงานและผลงานของแต่ละคน</p>
          {teamPerf.length === 0 ? <p className="text-xs text-muted">ไม่มีข้อมูล</p> : (<>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={teamChart} margin={{ left: 0, right: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="done" stackId="a" fill={C.green} name="เสร็จ" />
                <Bar dataKey="pending" stackId="a" fill={C.amber} name="ค้าง" />
                <Bar dataKey="late" stackId="a" fill={C.rose} name="ล่าช้า" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] text-muted uppercase border-b border-border"><th className="px-2 py-1.5 text-left">Name</th><th className="px-2 py-1.5 text-center">Total</th><th className="px-2 py-1.5 text-center">Done</th><th className="px-2 py-1.5 text-center">Pending</th><th className="px-2 py-1.5 text-center">Late</th><th className="px-2 py-1.5">Progress</th></tr></thead>
                <tbody>{teamPerf.map(m => {
                  const pct = m.total > 0 ? (m.done / m.total * 100) : 0;
                  return (<tr key={m.name} className="border-b border-border last:border-0"><td className="px-2 py-1.5 font-medium">{m.name}</td><td className="px-2 py-1.5 text-center">{m.total}</td><td className="px-2 py-1.5 text-center text-green-400">{m.done}</td><td className="px-2 py-1.5 text-center text-yellow-400">{m.pending}</td><td className="px-2 py-1.5 text-center text-red-400">{m.late}</td><td className="px-2 py-1.5"><div className="flex items-center gap-1.5"><div className="h-1.5 w-14 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div><span className="text-muted">{pct.toFixed(0)}%</span></div></td></tr>);
                })}</tbody>
              </table>
            </div>
          </>)}
        </div>

        {/* ALERTS */}
        <div className="rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-1" title="การแจ้งเตือน">Alerts</h3>
          <p className="text-[10px] text-muted mb-3">สิ่งที่ต้องดำเนินการตอนนี้</p>
          {alerts.length === 0 ? (
            <div className="text-center py-8"><p className="text-green-400 text-lg">✓</p><p className="text-xs text-muted mt-1">ไม่มีแจ้งเตือนเร่งด่วน</p></div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {alerts.sort((a, b) => (a.level === "red" ? 0 : a.level === "orange" ? 1 : 2) - (b.level === "red" ? 0 : b.level === "orange" ? 1 : 2)).map(a => (
                <Link key={a.id} href={a.href} className={`block rounded-lg px-3 py-2 text-xs border transition-colors hover:opacity-80 ${alertColor[a.level]}`}>
                  {alertIcon[a.level]} {a.msg}
                </Link>
              ))}
            </div>
          )}

          {/* Work Items */}
          <h3 className="text-sm font-semibold mt-5 mb-1" title="งานสำคัญ">Priority Items</h3>
          <p className="text-[10px] text-muted mb-2">งานที่ต้องดูแล</p>
          <div className="space-y-1.5">
            {workItems.map(w => (
              <Link key={`${w.type}-${w.id}`} href={w.href} className="block rounded-lg bg-background border border-border px-3 py-2 hover:bg-card-hover transition-colors">
                <p className="text-xs truncate">{w.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${typeColor[w.type] || "bg-gray-700 text-gray-400"}`}>{w.type}</span>
                  <span className="text-[10px] text-muted">{w.sub}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      </>)}
    </div>
  );
}

// === KPI Card Component ===
function KPI({ label, thai, value, sub, color }: { label: string; thai: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = { green: "text-green-400", blue: "text-blue-400", red: "text-red-400", amber: "text-yellow-400", cyan: "text-cyan-400" };
  const barMap: Record<string, string> = { green: "bg-green-600", blue: "bg-blue-600", red: "bg-red-600", amber: "bg-yellow-600", cyan: "bg-cyan-600" };
  return (
    <div className="rounded-xl bg-card border border-border p-4" title={thai}>
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className="text-[10px] text-muted">{thai}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color] || "text-white"}`}>{value}</p>
      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
      <div className={`mt-2 h-1 w-10 rounded ${barMap[color] || "bg-gray-600"}`} />
    </div>
  );
}
