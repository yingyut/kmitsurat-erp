"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket, SalesQuota, Quotation, ServiceContract, Asset, User } from "@/lib/types";
import {
  BarChart, Bar, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// Colors
const C = { blue: "#3b82f6", purple: "#8b5cf6", rose: "#f43f5e", green: "#22c55e", amber: "#f59e0b", cyan: "#06b6d4", indigo: "#6366f1", orange: "#f97316" };
const PIE_COLORS = [C.blue, C.amber, C.green, C.rose];

type Filter = "today" | "week" | "month" | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

// Compute the date range [from, to] for a given quarter (1-4) given the fiscal year start month (1=Jan)
function quarterRange(qNum: 1 | 2 | 3 | 4, fyStart: number): { from: string; to: string } {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayYear = now.getFullYear();
  // Fiscal year start year: if fyStart is still ahead this month, FY started last year
  const fyYear = fyStart <= todayMonth ? todayYear : todayYear - 1;
  const qStartMonth = ((fyStart - 1 + (qNum - 1) * 3) % 12) + 1;
  const qStartYear = fyYear + Math.floor((fyStart - 1 + (qNum - 1) * 3) / 12);
  const qEndMonth = ((qStartMonth - 1 + 2) % 12) + 1;
  const qEndYear = qEndMonth < qStartMonth ? qStartYear + 1 : qStartYear;
  const lastDay = new Date(qEndYear, qEndMonth, 0).getDate();
  return {
    from: `${qStartYear}-${String(qStartMonth).padStart(2, "0")}-01`,
    to: `${qEndYear}-${String(qEndMonth).padStart(2, "0")}-${lastDay}`,
  };
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fyStartMonth, setFyStartMonth] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [sales, setSales] = useState<SalesActivity[]>([]);
  const [presale, setPresale] = useState<PresaleRequest[]>([]);
  const [service, setService] = useState<ServiceTicket[]>([]);
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [quots, setQuots] = useState<Quotation[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  async function load() {
    setLoading(true);
    try {
      const fs = await import("@/lib/firestore");
      const [p, s, pr, sv, q, qt, ct, at, u, cs] = await Promise.all([
        fs.projects.list(), fs.salesActivities.list(), fs.presaleRequests.list(),
        fs.serviceTickets.list(), fs.salesQuotas.list(), fs.quotations.list(),
        fs.serviceContracts.list(), fs.assets.list(), fs.users.list(),
        fs.companySettings.list(),
      ]);
      setProjects(p); setSales(s); setPresale(pr); setService(sv); setQuotas(q); setQuots(qt); setContracts(ct); setAssets(at);
      setUsers(u.filter(x => x.active));
      if (cs.length > 0 && cs[0].fiscal_year_start_month) setFyStartMonth(cs[0].fiscal_year_start_month);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    setMounted(true);
    load();
    // Auto-refresh ทุก 60 วินาที
    const interval = setInterval(load, 60000);
    // Reload เมื่อ tab กลับมา focus (เช่น ไปแก้ข้อมูลที่หน้าอื่นแล้วกลับมา)
    const handleVisibility = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // === CALCULATIONS ===
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = today.slice(0, 4);
  const thisMonth = today.slice(0, 7);
  const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const qRanges = {
    q1: quarterRange(1, fyStartMonth), q2: quarterRange(2, fyStartMonth),
    q3: quarterRange(3, fyStartMonth), q4: quarterRange(4, fyStartMonth),
  };
  const activeRange = filter === "custom" ? { from: dateFrom, to: dateTo }
    : (["q1", "q2", "q3", "q4"].includes(filter) ? qRanges[filter as "q1" | "q2" | "q3" | "q4"] : null);
  const filterLabel = filter === "today" ? "วันนี้" : filter === "week" ? "7 วัน" : filter === "month" ? "เดือนนี้"
    : filter === "q1" ? `Q1 (${qRanges.q1.from.slice(0, 7)}→${qRanges.q1.to.slice(0, 7)})`
    : filter === "q2" ? `Q2 (${qRanges.q2.from.slice(0, 7)}→${qRanges.q2.to.slice(0, 7)})`
    : filter === "q3" ? `Q3 (${qRanges.q3.from.slice(0, 7)}→${qRanges.q3.to.slice(0, 7)})`
    : filter === "q4" ? `Q4 (${qRanges.q4.from.slice(0, 7)}→${qRanges.q4.to.slice(0, 7)})`
    : filter === "custom" ? (dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "กำหนดเอง")
    : "ปีนี้";

  function inRange(date?: string): boolean {
    if (!date) return false;
    if (filter === "today") return date === today;
    if (filter === "week") return date >= weekAgo && date <= today;
    if (filter === "month") return date.startsWith(thisMonth);
    if (filter === "year") return date.startsWith(thisYear);
    if (activeRange) return date >= activeRange.from && date <= activeRange.to;
    return false;
  }

  // Filtered slices — quotas by month/year; activities, presale, service by their date fields
  const filtQuotas = (() => {
    if (filter === "year") return quotas.filter(q => q.month?.startsWith(thisYear));
    if (filter === "month") return quotas.filter(q => q.month === thisMonth);
    if (activeRange) return quotas.filter(q => q.month && q.month >= activeRange.from.slice(0, 7) && q.month <= activeRange.to.slice(0, 7));
    return quotas.filter(q => q.month === thisMonth);
  })();
  const filtSales = sales.filter(a => inRange(a.next_follow_up));
  const filtPresale = presale.filter(r => inRange(r.due_date));
  const filtService = service.filter(t => inRange(t.service_date));

  const target = filtQuotas.reduce((s, q) => s + (q.quota_target || 0), 0);
  const actual = filtQuotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
  // Revenue = actual sales from quotas (same source as TARGET VS ACTUAL)
  const revenue = actual;
  const targetPct = target > 0 ? (actual / target * 100) : 0;
  const pipeline = projects.filter(p => !["won", "lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  // Overdue always uses unfiltered data — shows all pending items regardless of period
  const overdueJobs = sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done").length
    + presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed").length
    + service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
  const totalSvc = filtService.length;
  const slaOnTime = totalSvc > 0 ? Math.round(filtService.filter(t => ["resolved", "closed"].includes(t.status)).length / totalSvc * 100) : 100;
  const forecast = actual + pipeline * 0.3;

  // === PROFIT (เป้าหมายหลักของบริษัท) ===
  const profitTarget = filtQuotas.reduce((s, q) => s + (q.profit_target || 0), 0);
  const actualProfit = filtQuotas.reduce((s, q) => s + (q.actual_profit || 0), 0);
  const profitPct = profitTarget > 0 ? (actualProfit / profitTarget * 100) : 0;
  const profitRemaining = profitTarget - actualProfit;
  const gpPct = actual > 0 ? (actualProfit / actual * 100) : 0;
  // Approved/pipeline profit from quotations — not date-filtered (snapshot of current QT status)
  const approvedQuotProfit = quots.filter(q => q.status === "approved").reduce((s, q) => s + (q.gross_profit || 0), 0);
  const pipelineQuotProfit = quots.filter(q => q.status === "draft" || q.status === "sent").reduce((s, q) => s + (q.gross_profit || 0), 0);

  // === CONTRACTS / WARRANTY (renewal alerts) ===
  function dayDiff(date?: string): number | null {
    if (!date) return null;
    const t = new Date(date); t.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.floor((t.getTime() - now.getTime()) / 86400000);
  }
  const expiringContracts = contracts.filter(c => {
    if (c.status !== "active") return false;
    const d = dayDiff(c.end_date);
    return d !== null && d >= 0 && d <= 30;
  });
  const expiredContracts = contracts.filter(c => {
    if (c.status !== "active") return false;
    const d = dayDiff(c.end_date);
    return d !== null && d < 0;
  });
  const contractRenewalValue = expiringContracts.reduce((s, c) => s + (c.contract_value || 0), 0);
  // Active contracts (auto-include expired in display only)
  const activeContracts = contracts.filter(c => c.status === "active");
  const totalContractValue = activeContracts.reduce((s, c) => s + (c.contract_value || 0), 0);
  const contractsByType = {
    product_warranty: activeContracts.filter(c => c.type === "product_warranty").length,
    installation_warranty: activeContracts.filter(c => c.type === "installation_warranty").length,
    service_contract: activeContracts.filter(c => c.type === "service_contract").length,
  };
  const expiryBuckets = (() => {
    const a = activeContracts.map(c => ({ c, d: dayDiff(c.end_date) })).filter(x => x.d !== null);
    return {
      bucket30: a.filter(x => x.d! >= 0 && x.d! <= 30).length,
      bucket60: a.filter(x => x.d! > 30 && x.d! <= 60).length,
      bucket90: a.filter(x => x.d! > 60 && x.d! <= 90).length,
      safe: a.filter(x => x.d! > 90).length,
    };
  })();
  const topExpiring = activeContracts
    .map(c => ({ c, d: dayDiff(c.end_date) }))
    .filter(x => x.d !== null && x.d >= 0)
    .sort((a, b) => a.d! - b.d!)
    .slice(0, 5);
  const contractTypePie = [
    { name: "Product", value: contractsByType.product_warranty, fill: C.blue },
    { name: "Install", value: contractsByType.installation_warranty, fill: C.purple },
    { name: "MA", value: contractsByType.service_contract, fill: C.green },
  ].filter(x => x.value > 0);
  const contractExpiryData = [
    { name: "≤30d", value: expiryBuckets.bucket30, fill: C.rose },
    { name: "31-60", value: expiryBuckets.bucket60, fill: C.amber },
    { name: "61-90", value: expiryBuckets.bucket90, fill: "#facc15" },
    { name: ">90d", value: expiryBuckets.safe, fill: C.green },
  ];

  // === WARRANTY EXPIRY (Assets) ===
  const activeAssets = assets.filter(a => a.status === "active" || a.status === "maintenance");
  const assetsWithWarranty = activeAssets.filter(a => a.warranty_end);
  const warrantyExpired = assetsWithWarranty.filter(a => dayDiff(a.warranty_end) !== null && dayDiff(a.warranty_end)! < 0);
  const warranty30 = assetsWithWarranty.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d >= 0 && d <= 30; });
  const warranty60 = assetsWithWarranty.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d > 30 && d <= 60; });
  const warranty90 = assetsWithWarranty.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d > 60 && d <= 90; });
  const topWarrantyExpiring = assetsWithWarranty
    .map(a => ({ a, d: dayDiff(a.warranty_end)! }))
    .filter(x => x.d >= 0)
    .sort((a, b) => a.d - b.d)
    .slice(0, 8);

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

  const activeNames = new Set(users.map(u => u.name));
  const isActive = (name: string) => activeNames.size === 0 || activeNames.has(name);
  const activityByPerson = [...new Set(filtSales.map(a => a.assigned_to))].filter(Boolean)
    .filter(isActive)
    .map(name => ({
      name: name.split(" ")[0],
      count: filtSales.filter(a => a.assigned_to === name).length,
    }));

  const todayCalls = filtSales.filter(a => a.type === "phone_call").length;
  const todayMeetings = filtSales.filter(a => a.type === "meeting" || a.type === "visit").length;
  const todayFollowups = filtSales.filter(a => a.type === "follow_up").length;

  // Presale
  const prNew = filtPresale.filter(r => r.status === "pending").length;
  const prProg = filtPresale.filter(r => r.status === "in_progress").length;
  const prDone = filtPresale.filter(r => r.status === "completed").length;
  const prByType = [
    { name: "BOQ", value: filtPresale.filter(r => r.type === "boq").length },
    { name: "Design", value: filtPresale.filter(r => r.type === "solution_design").length },
    { name: "Proposal", value: filtPresale.filter(r => r.type === "technical_proposal").length },
    { name: "Survey", value: filtPresale.filter(r => r.type === "site_survey").length },
  ].filter(d => d.value > 0);

  const prWorkload = [...new Set(filtPresale.map(r => r.assigned_to))].filter(Boolean).filter(isActive).map(name => ({
    name: name.split(" ")[0],
    pending: filtPresale.filter(r => r.assigned_to === name && r.status === "pending").length,
    progress: filtPresale.filter(r => r.assigned_to === name && r.status === "in_progress").length,
    done: filtPresale.filter(r => r.assigned_to === name && r.status === "completed").length,
  }));

  // Service
  const cmJobs = filtService.filter(t => ["repair", "after_sales"].includes(t.type)).length;
  const pmJobs = filtService.filter(t => t.type === "pm_service").length;
  const installJobs = filtService.filter(t => t.type === "installation").length;
  const svcOnTime = filtService.filter(t => ["resolved", "closed"].includes(t.status)).length;
  const svcDelay = filtService.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
  const svcPie = [
    { name: "On-time", value: svcOnTime },
    { name: "Delay", value: svcDelay },
    { name: "Active", value: totalSvc - svcOnTime - svcDelay },
  ].filter(d => d.value > 0);

  // Technician workload
  const techWorkload = [...new Set(filtService.map(t => t.technician))].filter(Boolean).map(name => {
    const mine = filtService.filter(t => t.technician === name);
    const open = mine.filter(t => t.status === "open").length;
    const inProg = mine.filter(t => t.status === "in_progress").length;
    const done = mine.filter(t => t.status === "resolved" || t.status === "closed").length;
    const overdue = mine.filter(t => t.service_date && t.service_date < today && t.status !== "resolved" && t.status !== "closed").length;
    return { name, fullName: name, total: mine.length, open, inProg, done, overdue, shortName: name.split(" ")[0].replace(/[()]/g, "") };
  }).sort((a, b) => (b.open + b.inProg) - (a.open + a.inProg));

  // Projects
  const activeP = projects.filter(p => !["won", "lost"].includes(p.status)).length;
  const pendingP = projects.filter(p => p.status === "lead").length;
  const completedP = projects.filter(p => p.status === "won").length;
  const projValue = projects.reduce((s, p) => s + (p.value || 0), 0);

  // Team Performance
  const allNames = [...new Set([...filtSales.map(a => a.assigned_to), ...filtPresale.map(r => r.assigned_to), ...filtService.map(t => t.technician)])].filter(Boolean).filter(isActive);
  const teamPerf = allNames.map(name => {
    const sA = filtSales.filter(a => a.assigned_to === name);
    const pA = filtPresale.filter(r => r.assigned_to === name);
    const tA = filtService.filter(t => t.technician === name);
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
  expiredContracts.forEach(c => alerts.push({ id: `ec-${c.id}`, msg: `🛡️ สัญญาหมดอายุ: ${c.title} — ${c.customer_name}`, level: "red", href: "/contracts" }));
  if (expiringContracts.length > 0) alerts.push({ id: "rc", msg: `🛡️ ${expiringContracts.length} สัญญาใกล้หมด ≤30 วัน (รวม ${(contractRenewalValue / 1000).toLocaleString()}K) — เสนอ renewal`, level: "orange", href: "/contracts" });
  if (warrantyExpired.length > 0) alerts.push({ id: "we", msg: `🖥️ ${warrantyExpired.length} อุปกรณ์หมดประกันแล้ว — ตรวจสอบ MA`, level: "red", href: "/assets" });
  if (warranty30.length > 0) alerts.push({ id: "w30", msg: `🖥️ ${warranty30.length} อุปกรณ์ประกันหมดใน ≤30 วัน — วางแผน renewal`, level: "orange", href: "/assets" });

  // PM Schedule alerts
  const pmDue = assets.filter(a => { if (!a.pm_next_date) return false; const d = dayDiff(a.pm_next_date); return d !== null && d < 0; });
  const pm30 = assets.filter(a => { if (!a.pm_next_date) return false; const d = dayDiff(a.pm_next_date); return d !== null && d >= 0 && d <= 30; });
  if (pmDue.length > 0) alerts.push({ id: "pmd", msg: `🔧 ${pmDue.length} อุปกรณ์ PM เลยกำหนดแล้ว — สร้าง PM Ticket`, level: "red", href: "/assets/pm-schedule" });
  if (pm30.length > 0) alerts.push({ id: "pm30", msg: `🔧 ${pm30.length} อุปกรณ์ถึงรอบ PM ใน ≤30 วัน`, level: "orange", href: "/assets/pm-schedule" });

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" title="แดชบอร์ดผู้บริหาร">Executive Dashboard</h1>
          <p className="text-xs text-muted">ภาพรวมการทำงาน KMITSURAT — ตัดสินใจเร็วขึ้น</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastUpdated && !loading && (
            <span className="text-[10px] text-muted hidden sm:inline">
              อัปเดต {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button onClick={load} disabled={loading} title="โหลดข้อมูลใหม่" className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover disabled:opacity-50">
            {loading ? "..." : "↺ Refresh"}
          </button>
          <div className="flex gap-1 flex-wrap">
            {(["today", "week", "month", "year"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg text-xs ${filter === f ? "bg-accent text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
                {f === "today" ? "วันนี้" : f === "week" ? "สัปดาห์" : f === "month" ? "เดือน" : "ปี"}
              </button>
            ))}
            <span className="text-muted text-xs self-center px-0.5">|</span>
            {(["q1", "q2", "q3", "q4"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} title={`${f.toUpperCase()} · ${qRanges[f as "q1"|"q2"|"q3"|"q4"].from.slice(0,7)} → ${qRanges[f as "q1"|"q2"|"q3"|"q4"].to.slice(0,7)}`}
                className={`px-2.5 py-1.5 rounded-lg text-xs ${filter === f ? "bg-purple-600 text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
                {f.toUpperCase()}
              </button>
            ))}
            <button onClick={() => setFilter("custom")}
              className={`px-2.5 py-1.5 rounded-lg text-xs ${filter === "custom" ? "bg-cyan-700 text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
              กำหนดเอง
            </button>
          </div>
        </div>
      </div>
      {filter === "custom" && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <label className="text-xs text-muted">จาก</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg bg-card border border-border px-2 py-1 text-xs" />
          <label className="text-xs text-muted">ถึง</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg bg-card border border-border px-2 py-1 text-xs" />
          {dateFrom && dateTo && <span className="text-[10px] text-accent">{dateFrom} → {dateTo}</span>}
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* ═══════════════ LAYER 1: DECISION ═══════════════ */}
      {/* Row 1: Revenue / Operations */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        <KPI label="Total Revenue" thai="รายได้รวม" value={`${(revenue / 1000000).toFixed(1)}M`} sub="THB" color="green" href="/sales" source={`Quota.actual_sales · ${filterLabel}`} />
        <Link href="/sales" className="rounded-xl bg-card border border-border p-4 hover:border-accent/40 hover:bg-card-hover transition-colors group cursor-pointer block" title={`ยอดขายเทียบเป้า · SalesQuota.quota_target vs actual_sales · ${filterLabel}`}>
          <p className="text-[10px] text-muted uppercase">Target vs Actual</p>
          <p className="text-[10px] text-muted">ยอดเทียบเป้า</p>
          <p className={`text-2xl font-bold mt-1 ${targetPct >= 80 ? "text-green-400" : targetPct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{targetPct.toFixed(0)}%</p>
          <div className="mt-2 h-2 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${targetPct >= 80 ? "bg-green-500" : targetPct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(targetPct, 100)}%` }} /></div>
          <p className="text-[10px] text-muted mt-1">{actual.toLocaleString()} / {target.toLocaleString()}</p>
          <p className="text-[9px] text-muted/50 mt-0.5 truncate">📌 SalesQuota · {filterLabel}</p>
        </Link>
        <KPI label="Pipeline Value" thai="มูลค่าดีลรอปิด" value={`${(pipeline / 1000000).toFixed(1)}M`} sub="THB" color="blue" href="/projects" source="Projects lead→negotiation · ทุกช่วงเวลา" />
        <KPI label="Overdue Jobs" thai="งานล่าช้า" value={String(overdueJobs)} sub={overdueJobs > 0 ? "ต้องแก้ด่วน!" : "ปกติ"} color={overdueJobs > 0 ? "red" : "green"} href="/sales" source="Sales+Presale+Service ค้างทั้งหมด" />
        <KPI label="SLA On-time" thai="อัตราปิดงานตาม SLA" value={`${slaOnTime}%`} sub={`${svcOnTime}/${totalSvc} jobs`} color={slaOnTime >= 80 ? "green" : slaOnTime >= 50 ? "amber" : "red"} href="/service" source={`Service resolved+closed / ทั้งหมด · ${filterLabel}`} />
        <KPI label="Forecast EOM" thai="คาดการณ์สิ้นเดือน" value={`${(forecast / 1000000).toFixed(1)}M`} sub="THB" color="cyan" href="/reports" source="actual + pipeline×30%" />
      </div>

      {/* Row 2: Profitability — เป้าหมายหลักของบริษัท */}
      <div className="rounded-xl bg-purple-900/10 border border-purple-800/40 p-3 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-purple-300">💎 Profitability</p>
          <p className="text-[10px] text-purple-300/60">— เป้าหมายหลักของบริษัท (Gross Profit)</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPI label="Profit Target" thai="เป้ากำไร" value={profitTarget > 0 ? `${(profitTarget / 1000000).toFixed(2)}M` : "—"} sub="THB" color="purple" href="/reports" source={`Quota.profit_target · ${filterLabel}`} />
          <KPI label="Actual Profit" thai="กำไรจริง" value={actualProfit > 0 ? `${(actualProfit / 1000000).toFixed(2)}M` : "—"} sub="THB" color="purple" href="/reports" source={`Quota.actual_profit · ${filterLabel}`} />
          <div className="rounded-xl bg-card border border-purple-800/40 p-4" title={`กำไรเทียบเป้า · ที่มา: actual_profit ÷ profit_target · ${filterLabel}`}>
            <p className="text-[10px] text-muted uppercase">Profit Achievement</p>
            <p className="text-[10px] text-muted">กำไรเทียบเป้า</p>
            <p className={`text-2xl font-bold mt-1 ${profitPct >= 80 ? "text-green-400" : profitPct >= 50 ? "text-yellow-400" : profitPct > 0 ? "text-red-400" : "text-muted"}`}>{profitPct > 0 ? `${profitPct.toFixed(0)}%` : "—"}</p>
            {profitTarget > 0 && (
              <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
                <div className={`h-full rounded-full ${profitPct >= 80 ? "bg-green-500" : profitPct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(profitPct, 100)}%` }} />
              </div>
            )}
            <p className="text-[10px] text-muted mt-1">เหลือ {profitRemaining > 0 ? `${(profitRemaining / 1000).toFixed(0)}K` : "0"} THB</p>
            <p className="text-[9px] text-muted/50 mt-0.5 truncate">📌 Quota · {filterLabel}</p>
          </div>
          <KPI label="Actual GP%" thai="margin จริง" value={gpPct > 0 ? `${gpPct.toFixed(1)}%` : "—"} sub={`${(actualProfit / 1000).toFixed(0)}K / ${(actual / 1000).toFixed(0)}K`} color={gpPct >= 20 ? "green" : gpPct >= 10 ? "amber" : gpPct > 0 ? "red" : "purple"} href="/reports" source="actual_profit ÷ actual_sales" />
          <KPI label="Approved QT Profit" thai="กำไรจาก QT อนุมัติ" value={approvedQuotProfit >= 1000 ? `${(approvedQuotProfit / 1000).toFixed(0)}K` : approvedQuotProfit > 0 ? `฿${approvedQuotProfit.toLocaleString()}` : "—"} sub="THB · pending bill" color="green" href="/quotations" source="Quotations status=approved · gross_profit" />
          <KPI label="Quotation Pipeline" thai="กำไรรอผล QT" value={pipelineQuotProfit >= 1000 ? `${(pipelineQuotProfit / 1000).toFixed(0)}K` : pipelineQuotProfit > 0 ? `฿${pipelineQuotProfit.toLocaleString()}` : "—"} sub="THB · draft + sent" color="blue" href="/quotations" source="Quotations status=draft|sent · gross_profit" />
        </div>
      </div>

      {/* ═══════════════ LAYER 2: OPERATION ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">

        {/* SALES OVERVIEW */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-blue-400">Sales Overview</h3>
              <span className="text-[9px] bg-blue-900/30 text-blue-400 border border-blue-800/40 rounded px-1.5 py-0.5">{filterLabel}</span>
            </div>
            <Link href="/sales" className="text-[10px] text-accent hover:underline">Activities →</Link>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] text-muted">ภาพรวมยอดขายและกิจกรรมของทีมขาย · next_follow_up</p>
            <Link href="/projects" className="text-[10px] text-accent/70 hover:text-accent hover:underline shrink-0">Pipeline →</Link>
          </div>
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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-purple-400">Presale Workload</h3>
              <span className="text-[9px] bg-purple-900/30 text-purple-400 border border-purple-800/40 rounded px-1.5 py-0.5">{filterLabel}</span>
            </div>
            <Link href="/presale" className="text-[10px] text-accent hover:underline">ดู Presale →</Link>
          </div>
          <p className="text-[10px] text-muted mb-3">ภาพรวมงานออกแบบโซลูชันและ BOQ · due_date</p>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <div className="text-center"><p className="text-lg font-bold">{filtPresale.length}</p><p className="text-muted">Total</p></div>
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
        <Link href="/service" className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-colors block" title="คลิกเพื่อดูรายละเอียดงานบริการ">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-rose-400">Service Operation</h3>
            <span className="text-[9px] bg-rose-900/30 text-rose-400 border border-rose-800/40 rounded px-1.5 py-0.5">{filterLabel}</span>
          </div>
          <p className="text-[10px] text-muted mb-3">ภาพรวมงาน CM / PM / Install และ SLA · service_date · คลิกเพื่อดูรายละเอียด</p>
          <div className="grid grid-cols-5 gap-2 mb-3 text-xs">
            <div className="text-center"><p className="text-lg font-bold">{cmJobs}</p><p className="text-muted">CM</p></div>
            <div className="text-center"><p className="text-lg font-bold">{pmJobs}</p><p className="text-muted">PM</p></div>
            <div className="text-center"><p className="text-lg font-bold">{installJobs}</p><p className="text-muted">Install</p></div>
            <div className="text-center"><p className={`text-lg font-bold ${svcDelay > 0 ? "text-red-400" : "text-green-400"}`}>{svcDelay}</p><p className="text-muted">ค้าง</p></div>
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
        </Link>

        {/* PROJECT OVERVIEW */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-indigo-400">Project Overview</h3>
            <Link href="/projects" className="text-[10px] text-accent hover:underline">ดู Pipeline →</Link>
          </div>
          <p className="text-[10px] text-muted mb-3">ภาพรวมโปรเจคและมูลค่างาน</p>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <Link href="/projects" className="text-center hover:opacity-80 block"><p className="text-lg font-bold text-blue-400">{activeP}</p><p className="text-muted">Active</p></Link>
            <Link href="/projects" className="text-center hover:opacity-80 block"><p className="text-lg font-bold text-yellow-400">{pendingP}</p><p className="text-muted">Pending</p></Link>
            <Link href="/projects" className="text-center hover:opacity-80 block"><p className="text-lg font-bold text-green-400">{completedP}</p><p className="text-muted">Won</p></Link>
            <div className="text-center"><p className="text-lg font-bold">{(projValue / 1000000).toFixed(1)}M</p><p className="text-muted">Value</p></div>
          </div>
          <div className="space-y-1.5">
            {projects.slice(0, 5).map(p => (
              <Link key={p.id} href="/projects" className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0 hover:bg-card-hover -mx-1 px-1 rounded transition-colors">
                <div className="flex-1 min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-muted">{p.customer_name}</p></div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted">{(p.value || 0).toLocaleString()}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${p.status === "won" ? "bg-green-900/50 text-green-400" : p.status === "lost" ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`}>{p.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CONTRACTS OVERVIEW (full-width row) */}
      {activeContracts.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-emerald-400">🛡️ Contracts Overview</h3>
              <p className="text-[10px] text-muted">รับประกัน + สัญญา MA — ใช้วาง renewal plan</p>
            </div>
            <Link href="/contracts" className="text-[10px] text-accent hover:underline">จัดการสัญญาทั้งหมด →</Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-[10px] text-muted">Active</p>
                <p className="text-xl font-bold text-emerald-400">{activeContracts.length}</p>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-[10px] text-muted">มูลค่ารวม</p>
                <p className="text-xl font-bold">{(totalContractValue / 1000000).toFixed(2)}M</p>
                <p className="text-[10px] text-muted">THB</p>
              </div>
              <div className="rounded-lg bg-red-900/10 border border-red-800/40 p-3">
                <p className="text-[10px] text-muted">≤30 วัน 🔴</p>
                <p className="text-xl font-bold text-red-400">{expiryBuckets.bucket30}</p>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-[10px] text-muted">หมดอายุแล้ว</p>
                <p className="text-xl font-bold text-gray-400">{expiredContracts.length}</p>
              </div>
            </div>

            {/* Type pie */}
            <div>
              <p className="text-[10px] text-muted mb-1">By Type</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={contractTypePie.length > 0 ? contractTypePie : [{ name: "None", value: 1, fill: "#475569" }]} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" label={(e) => e.name}>
                    {(contractTypePie.length > 0 ? contractTypePie : [{ name: "None", value: 1, fill: "#475569" }]).map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Expiry timeline bar */}
            <div>
              <p className="text-[10px] text-muted mb-1">Expiry Timeline</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={contractExpiryData} margin={{ left: 0, right: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>{contractExpiryData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top expiring list */}
            <div>
              <p className="text-[10px] text-muted mb-1">ใกล้หมดอายุ Top 5</p>
              {topExpiring.length === 0 ? <p className="text-xs text-muted">ไม่มีสัญญาใกล้หมด</p> : (
                <div className="space-y-1">
                  {topExpiring.map(({ c, d }) => (
                    <Link key={c.id} href="/contracts" className="block text-[11px] py-0.5 border-b border-border last:border-0 hover:text-accent">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate flex-1">{c.title}</span>
                        <span className={`shrink-0 font-semibold ${d! <= 7 ? "text-red-400" : d! <= 30 ? "text-amber-400" : d! <= 90 ? "text-yellow-400" : "text-muted"}`}>{d}d</span>
                      </div>
                      <p className="text-[9px] text-muted truncate">{c.customer_name}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WARRANTY EXPIRY ALERT (full-width row) */}
      {assetsWithWarranty.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-orange-400">🖥️ Warranty Expiry Alert</h3>
              <p className="text-[10px] text-muted">ติดตามอุปกรณ์ที่ประกันใกล้หมด — วางแผน MA ต่อ</p>
            </div>
            <Link href="/assets" className="text-[10px] text-accent hover:underline">ดู Assets ทั้งหมด →</Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-red-900/10 border border-red-800/40 p-3">
                <p className="text-[10px] text-muted">หมดประกันแล้ว 🔴</p>
                <p className="text-2xl font-bold text-red-400">{warrantyExpired.length}</p>
                <p className="text-[10px] text-muted">อุปกรณ์</p>
              </div>
              <div className="rounded-lg bg-amber-900/10 border border-amber-800/40 p-3">
                <p className="text-[10px] text-muted">≤30 วัน 🟠</p>
                <p className="text-2xl font-bold text-amber-400">{warranty30.length}</p>
                <p className="text-[10px] text-muted">อุปกรณ์</p>
              </div>
              <div className="rounded-lg bg-yellow-900/10 border border-yellow-800/40 p-3">
                <p className="text-[10px] text-muted">31–60 วัน 🟡</p>
                <p className="text-2xl font-bold text-yellow-400">{warranty60.length}</p>
                <p className="text-[10px] text-muted">อุปกรณ์</p>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-[10px] text-muted">61–90 วัน</p>
                <p className="text-2xl font-bold text-foreground">{warranty90.length}</p>
                <p className="text-[10px] text-muted">อุปกรณ์</p>
              </div>
            </div>

            {/* Expiry bar chart */}
            <div>
              <p className="text-[10px] text-muted mb-1">Expiry Timeline</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[
                  { name: "หมดแล้ว", value: warrantyExpired.length, fill: C.rose },
                  { name: "≤30d", value: warranty30.length, fill: C.orange },
                  { name: "31-60", value: warranty60.length, fill: C.amber },
                  { name: "61-90", value: warranty90.length, fill: "#facc15" },
                ]} margin={{ left: 0, right: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>{[C.rose, C.orange, C.amber, "#facc15"].map((c, i) => <Cell key={i} fill={c} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top expiring assets list */}
            <div>
              <p className="text-[10px] text-muted mb-1">อุปกรณ์ใกล้หมดประกัน Top 8</p>
              {topWarrantyExpiring.length === 0 ? <p className="text-xs text-muted">ไม่มีอุปกรณ์ใกล้หมดประกัน</p> : (
                <div className="space-y-1 max-h-[140px] overflow-y-auto">
                  {topWarrantyExpiring.map(({ a, d }) => (
                    <Link key={a.id} href={`/assets/${a.id}`} className="flex items-center justify-between gap-1 py-1 border-b border-border last:border-0 hover:opacity-80 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-mono font-medium text-accent group-hover:underline truncate">{a.km_number}</p>
                        <p className="text-[10px] text-muted truncate">{a.device_model} · {a.customer_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-semibold ${d <= 7 ? "text-red-400" : d <= 30 ? "text-amber-400" : d <= 60 ? "text-yellow-400" : "text-muted"}`}>
                          {d === 0 ? "วันนี้!" : `${d}d`}
                        </p>
                        <p className="text-[9px] text-muted">{a.warranty_end}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ LAYER 3: DETAIL ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* TEAM PERFORMANCE */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold" title="ผลงานรายบุคคล">Team Performance</h3>
            <Link href="/reports" className="text-[10px] text-accent hover:underline">รายงาน →</Link>
          </div>
          <p className="text-[10px] text-muted mb-3">ภาระงานและผลงานของแต่ละคน · คลิกชื่อเพื่อดูรายละเอียด</p>
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
                  return (<tr key={m.name} className="border-b border-border last:border-0 hover:bg-card-hover/50 cursor-pointer" onClick={() => window.location.href = "/sales"} title={`คลิกเพื่อดูกิจกรรมของ ${m.name}`}><td className="px-2 py-1.5 font-medium text-accent hover:underline">{m.name}</td><td className="px-2 py-1.5 text-center">{m.total}</td><td className="px-2 py-1.5 text-center text-green-400">{m.done}</td><td className="px-2 py-1.5 text-center text-yellow-400">{m.pending}</td><td className="px-2 py-1.5 text-center text-red-400">{m.late}</td><td className="px-2 py-1.5"><div className="flex items-center gap-1.5"><div className="h-1.5 w-14 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div><span className="text-muted">{pct.toFixed(0)}%</span></div></td></tr>);
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
function KPI({ label, thai, value, sub, color, href, source }: { label: string; thai: string; value: string; sub: string; color: string; href?: string; source?: string }) {
  const colorMap: Record<string, string> = { green: "text-green-400", blue: "text-blue-400", red: "text-red-400", amber: "text-yellow-400", cyan: "text-cyan-400", purple: "text-purple-400" };
  const barMap: Record<string, string> = { green: "bg-green-600", blue: "bg-blue-600", red: "bg-red-600", amber: "bg-yellow-600", cyan: "bg-cyan-600", purple: "bg-purple-600" };
  const borderMap: Record<string, string> = { purple: "border-purple-800/40" };
  const inner = (
    <div className={`rounded-xl bg-card border ${borderMap[color] || "border-border"} p-4 ${href ? "hover:border-accent/40 hover:bg-card-hover transition-colors cursor-pointer group" : ""}`} title={source ? `${thai}\nที่มา: ${source}` : thai}>
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className="text-[10px] text-muted">{thai}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color] || "text-white"}`}>{value}</p>
      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
      {source && <p className="text-[9px] text-muted/50 mt-0.5 truncate">📌 {source}</p>}
      <div className="flex items-center justify-between mt-1">
        <div className={`h-1 w-10 rounded ${barMap[color] || "bg-gray-600"}`} />
        {href && <span className="text-[9px] text-accent/40 group-hover:text-accent transition-colors">→</span>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
