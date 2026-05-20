"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket, SalesQuota, Quotation, ServiceContract, Asset, User } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const C = { blue: "#3b82f6", purple: "#8b5cf6", rose: "#f43f5e", green: "#22c55e", amber: "#f59e0b", cyan: "#06b6d4", orange: "#f97316" };

type Filter = "today" | "week" | "month" | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

function quarterRange(qNum: 1 | 2 | 3 | 4, fyStart: number): { from: string; to: string } {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayYear = now.getFullYear();
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

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, href, pct, alert }: {
  label: string; value: string; sub?: string; color: "green" | "blue" | "purple" | "amber" | "red" | "cyan" | "muted";
  href?: string; pct?: number; alert?: boolean;
}) {
  const colorMap = {
    green: "text-green-400", blue: "text-blue-400", purple: "text-purple-400",
    amber: "text-amber-400", red: "text-rose-400", cyan: "text-cyan-400", muted: "text-muted",
  };
  const inner = (
    <div className={`rounded-2xl bg-card border ${alert ? "border-rose-700/60 bg-rose-950/30" : "border-border"} p-4 h-full flex flex-col justify-between gap-2`}>
      <p className="text-xs text-muted leading-tight">{label}</p>
      <p className={`text-3xl font-bold tracking-tight leading-none ${colorMap[color]}`}>{value}</p>
      {pct !== undefined && (
        <div className="h-1.5 rounded-full bg-background overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-rose-500"}`}
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full hover:opacity-80 transition-opacity">{inner}</Link> : inner;
}

// ── Alert Row ──────────────────────────────────────────────────────────────────
function AlertRow({ level, msg, href }: { level: "red" | "orange" | "green"; msg: string; href: string }) {
  const cls = level === "red"
    ? "bg-rose-950/40 border-rose-800/50 text-rose-300"
    : level === "orange"
    ? "bg-amber-950/40 border-amber-800/50 text-amber-300"
    : "bg-emerald-950/40 border-emerald-800/50 text-emerald-300";
  return (
    <Link href={href} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs hover:opacity-80 transition-opacity ${cls}`}>
      <span className="shrink-0 mt-0.5">{level === "red" ? "🔴" : level === "orange" ? "🟡" : "🟢"}</span>
      <span className="line-clamp-2">{msg}</span>
    </Link>
  );
}

// ── Section Shell ─────────────────────────────────────────────────────────────
function Section({ title, action, children, defaultOpen = true }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-card-hover transition-colors text-left">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {action}
          <span className="text-muted text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
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
      setProjects(p); setSales(s); setPresale(pr); setService(sv);
      setQuotas(q); setQuots(qt); setContracts(ct); setAssets(at);
      setUsers(u.filter(x => x.active));
      if (cs.length > 0 && cs[0].fiscal_year_start_month) setFyStartMonth(cs[0].fiscal_year_start_month);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    setMounted(true);
    load();
    const interval = setInterval(load, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // ── Date helpers ────────────────────────────────────────────────────────────
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
    : filter === "q1" ? `Q1` : filter === "q2" ? `Q2` : filter === "q3" ? `Q3` : filter === "q4" ? `Q4`
    : filter === "year" ? "ปีนี้"
    : (dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "กำหนดเอง");

  function inRange(date?: string): boolean {
    if (!date) return false;
    if (filter === "today") return date === today;
    if (filter === "week") return date >= weekAgo && date <= today;
    if (filter === "month") return date.startsWith(thisMonth);
    if (filter === "year") return date.startsWith(thisYear);
    if (activeRange) return date >= activeRange.from && date <= activeRange.to;
    return false;
  }

  function dayDiff(date?: string): number | null {
    if (!date) return null;
    const t = new Date(date); t.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.floor((t.getTime() - now.getTime()) / 86400000);
  }

  // ── Filtered slices ─────────────────────────────────────────────────────────
  const filtQuotas = (() => {
    if (filter === "year") return quotas.filter(q => q.month?.startsWith(thisYear));
    if (filter === "month") return quotas.filter(q => q.month === thisMonth);
    if (activeRange) return quotas.filter(q => q.month && q.month >= activeRange.from.slice(0, 7) && q.month <= activeRange.to.slice(0, 7));
    return quotas.filter(q => q.month === thisMonth);
  })();
  const filtSales = sales.filter(a => inRange(a.next_follow_up));
  const filtPresale = presale.filter(r => inRange(r.due_date));
  const filtService = service.filter(t => inRange(t.service_date));

  // ── Core KPIs ───────────────────────────────────────────────────────────────
  const target = filtQuotas.reduce((s, q) => s + (q.quota_target || 0), 0);
  const actual = filtQuotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
  const targetPct = target > 0 ? (actual / target * 100) : 0;
  const profitTarget = filtQuotas.reduce((s, q) => s + (q.profit_target || 0), 0);
  const actualProfit = filtQuotas.reduce((s, q) => s + (q.actual_profit || 0), 0);
  const profitPct = profitTarget > 0 ? (actualProfit / profitTarget * 100) : 0;
  const gpPct = actual > 0 ? (actualProfit / actual * 100) : 0;
  const pipeline = projects.filter(p => !["won", "lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  const wonCount = projects.filter(p => p.status === "won").length;
  const totalDeals = projects.filter(p => p.status !== "lost").length;
  const convRate = totalDeals > 0 ? (wonCount / totalDeals * 100) : 0;
  // SLA uses ALL tickets (not period-filtered) — it's a snapshot of current ops health
  const allSvcResolved = service.filter(t => ["resolved", "closed"].includes(t.status)).length;
  const allSvcTotal = service.length;
  const slaOnTime = allSvcTotal > 0 ? Math.round(allSvcResolved / allSvcTotal * 100) : 100;
  const totalSvc = filtService.length;
  const svcResolved = filtService.filter(t => ["resolved", "closed"].includes(t.status)).length;
  const overdueJobs =
    sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done").length
    + presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed").length
    + service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
  const approvedProfit = quots.filter(q => q.status === "approved").reduce((s, q) => s + (q.gross_profit || 0), 0);

  // ── Contracts ───────────────────────────────────────────────────────────────
  const activeContracts = contracts.filter(c => c.status === "active");
  const expiringContracts = activeContracts.filter(c => { const d = dayDiff(c.end_date); return d !== null && d >= 0 && d <= 30; });
  const expiredContracts = activeContracts.filter(c => { const d = dayDiff(c.end_date); return d !== null && d < 0; });
  const topExpiring = activeContracts
    .map(c => ({ c, d: dayDiff(c.end_date) ?? 9999 }))
    .filter(x => x.d >= 0)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  // ── Alerts (grouped summaries — not one row per item) ───────────────────────
  type AlertItem = { id: string; msg: string; level: "red" | "orange" | "green"; href: string; count?: number };
  const alerts: AlertItem[] = [];
  const salesOverdue = sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done");
  if (salesOverdue.length > 0) alerts.push({ id: "so", msg: `Sales overdue ${salesOverdue.length} รายการ — ติดตามลูกค้าด่วน`, level: "red", href: "/sales", count: salesOverdue.length });
  const presaleOverdue = presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed");
  if (presaleOverdue.length > 0) alerts.push({ id: "po", msg: `Presale ค้าง SLA ${presaleOverdue.length} งาน`, level: "red", href: "/presale", count: presaleOverdue.length });
  if (expiredContracts.length > 0) alerts.push({ id: "ec", msg: `สัญญาหมดอายุแล้ว ${expiredContracts.length} รายการ — ต่ออายุด่วน`, level: "red", href: "/contracts", count: expiredContracts.length });
  const svcOverdue = service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status));
  if (svcOverdue.length > 0) alerts.push({ id: "sv", msg: `Service ค้าง ${svcOverdue.length} งาน`, level: "orange", href: "/service", count: svcOverdue.length });
  if (expiringContracts.length > 0) alerts.push({ id: "rc", msg: `${expiringContracts.length} สัญญาใกล้หมดใน ≤30 วัน — เสนอ renewal`, level: "orange", href: "/contracts" });
  const warranty30 = assets.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d >= 0 && d <= 30; });
  const warrantyExpired = assets.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d < 0; });
  if (warrantyExpired.length > 0) alerts.push({ id: "we", msg: `${warrantyExpired.length} อุปกรณ์หมดประกันแล้ว — ตรวจสอบ MA`, level: "red", href: "/assets" });
  if (warranty30.length > 0) alerts.push({ id: "w30", msg: `${warranty30.length} อุปกรณ์ประกันหมดใน ≤30 วัน`, level: "orange", href: "/assets" });
  const pmDue = assets.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d < 0; });
  if (pmDue.length > 0) alerts.push({ id: "pmd", msg: `${pmDue.length} อุปกรณ์ PM เลยกำหนดแล้ว — สร้าง PM Ticket`, level: "red", href: "/assets/pm-schedule" });
  const draftQ = quots.filter(q => q.status === "draft").length;
  if (draftQ > 0) alerts.push({ id: "dq", msg: `${draftQ} ใบเสนอราคา Draft รอส่ง`, level: "green", href: "/quotations" });

  // ── Quarterly comparison ────────────────────────────────────────────────────
  function getQuarterOf(monthStr: string): 1 | 2 | 3 | 4 {
    const m = parseInt(monthStr.slice(5, 7));
    return (Math.floor(((m - fyStartMonth + 12) % 12) / 3) + 1) as 1 | 2 | 3 | 4;
  }
  const todayMonthNum = new Date().getMonth() + 1;
  const fyYear = fyStartMonth <= todayMonthNum ? parseInt(thisYear) : parseInt(thisYear) - 1;
  const fyStartStr = `${fyYear}-${String(fyStartMonth).padStart(2, "0")}`;
  const fyEndMonthNum = ((fyStartMonth - 1 + 11) % 12) + 1;
  const fyEndYear = fyYear + (fyStartMonth + 11 > 12 ? 1 : 0);
  const fyEndStr = `${fyEndYear}-${String(fyEndMonthNum).padStart(2, "0")}`;
  const fyQuotas = quotas.filter(q => q.month && q.month >= fyStartStr && q.month <= fyEndStr);
  const quarterlyData = ([1, 2, 3, 4] as const).map(q => {
    const qQ = fyQuotas.filter(qt => getQuarterOf(qt.month!) === q);
    const tgt = qQ.reduce((s, x) => s + (x.quota_target || 0), 0);
    const act = qQ.reduce((s, x) => s + (x.actual_sales || 0), 0);
    const pft = qQ.reduce((s, x) => s + (x.actual_profit || 0), 0);
    const r = qRanges[`q${q}` as "q1" | "q2" | "q3" | "q4"];
    const isCurrent = r.from <= today && r.to >= today;
    return {
      name: `Q${q}`, isCurrent,
      targetK: Math.round(tgt / 1000), actualK: Math.round(act / 1000), profitK: Math.round(pft / 1000),
      pct: tgt > 0 ? Math.round(act / tgt * 100) : 0,
      gpPct: act > 0 ? Math.round(pft / act * 100) : 0,
    };
  });

  // ── Active user name set (used across multiple sections) ────────────────────
  const activeUserNames = new Set(users.map(u => u.name));

  // ── Individual Sales Performance ────────────────────────────────────────────
  const SALES_ROLES = new Set(["sale", "avenger", "Sales Executive", "Sales Manager", "Branch Manager"]);
  const salesUsers = users.filter(u => SALES_ROLES.has(u.role));
  type PersonRow = { name: string; short: string; tgt: number; act: number; pft: number; acts: number; activeProj: number; pct: number; targetK: number; actualK: number; isPool?: boolean };
  const activeSalesData: PersonRow[] = salesUsers.map(u => {
    const short = u.nickname ? u.nickname.replace(/พี่|น้อง/g, "").trim() : u.name.split(" ")[0];
    const pQ = filtQuotas.filter(q => q.user_name === u.name);
    const tgt = pQ.reduce((s, q) => s + (q.quota_target || 0), 0);
    const act = pQ.reduce((s, q) => s + (q.actual_sales || 0), 0);
    const pft = pQ.reduce((s, q) => s + (q.actual_profit || 0), 0);
    const acts = filtSales.filter(a => a.assigned_to === u.name).length;
    const activeProj = projects.filter(pr => pr.assigned_to === u.name && !["won", "lost"].includes(pr.status)).length;
    return { name: u.name, short, tgt, act, pft, acts, activeProj, pct: tgt > 0 ? Math.round(act / tgt * 100) : 0, targetK: Math.round(tgt / 1000), actualK: Math.round(act / 1000) };
  }).sort((a, b) => b.act - a.act);
  // ข้อมูลยอดของคนที่ลบออกไปแล้ว → รวมไว้ในกองกลาง
  const poolSalesQ = filtQuotas.filter(q => q.user_name && !activeUserNames.has(q.user_name));
  const poolSalesActs = filtSales.filter(a => a.assigned_to && !activeUserNames.has(a.assigned_to)).length;
  const poolSalesProj = projects.filter(pr => pr.assigned_to && !activeUserNames.has(pr.assigned_to) && !["won", "lost"].includes(pr.status)).length;
  const poolSalesTgt = poolSalesQ.reduce((s, q) => s + (q.quota_target || 0), 0);
  const poolSalesAct = poolSalesQ.reduce((s, q) => s + (q.actual_sales || 0), 0);
  const poolSalesPft = poolSalesQ.reduce((s, q) => s + (q.actual_profit || 0), 0);
  const poolSalesRow: PersonRow | null = (poolSalesTgt > 0 || poolSalesAct > 0 || poolSalesActs > 0 || poolSalesProj > 0)
    ? { name: "กองกลาง", short: "กองกลาง", tgt: poolSalesTgt, act: poolSalesAct, pft: poolSalesPft, acts: poolSalesActs, activeProj: poolSalesProj, pct: poolSalesTgt > 0 ? Math.round(poolSalesAct / poolSalesTgt * 100) : 0, targetK: Math.round(poolSalesTgt / 1000), actualK: Math.round(poolSalesAct / 1000), isPool: true }
    : null;
  const personData: PersonRow[] = [...activeSalesData, ...(poolSalesRow ? [poolSalesRow] : [])];

  // ── Presale workload ────────────────────────────────────────────────────────
  const PRESALE_ROLES = new Set(["presale", "Presale Manager", "presales_manager", "Avenger", "Avenger Team", "avenger", "Presale Engineer", "BOQ Engineer"]);
  const presaleRoleUsers = users.filter(u => PRESALE_ROLES.has(u.role));
  const presaleAssigneeNames = new Set(presale.map(r => r.assigned_to).filter(Boolean) as string[]);
  // แยกระหว่าง "คนที่ยังอยู่แต่ไม่ใช่ role presale" กับ "คนที่ถูกลบออกไปแล้ว"
  const extraPresaleAssignees = [...presaleAssigneeNames].filter(n => !presaleRoleUsers.find(u => u.name === n));
  const activeExtraPresale = extraPresaleAssignees.filter(n => activeUserNames.has(n));
  const exPresaleNames = extraPresaleAssignees.filter(n => !activeUserNames.has(n));
  const allPresalePeople = [...presaleRoleUsers.map(u => u.name), ...activeExtraPresale];
  const prWorkload = allPresalePeople.map(name => ({
    name: name.split(" ")[0], fullName: name, isPool: false,
    pending: presale.filter(r => r.assigned_to === name && r.status === "pending").length,
    progress: presale.filter(r => r.assigned_to === name && r.status === "in_progress").length,
    done: presale.filter(r => r.assigned_to === name && r.status === "completed").length,
  })).sort((a, b) => (b.pending + b.progress + b.done) - (a.pending + a.progress + a.done));
  // งาน presale ของคนที่ถูกลบ → กองกลาง
  const exPresaleTickets = presale.filter(r => r.assigned_to && exPresaleNames.includes(r.assigned_to));
  if (exPresaleTickets.length > 0) {
    prWorkload.push({
      name: "กองกลาง", fullName: "กองกลาง", isPool: true,
      pending: exPresaleTickets.filter(r => r.status === "pending").length,
      progress: exPresaleTickets.filter(r => r.status === "in_progress").length,
      done: exPresaleTickets.filter(r => r.status === "completed").length,
    });
  }

  // ── Service status — ใช้ข้อมูลรวมทั้งหมด (snapshot ปัจจุบัน) ──────────────
  const svcDelay = service.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
  const svcOpen = service.filter(t => t.status === "open").length;
  const svcInProg = service.filter(t => t.status === "in_progress").length;
  const svcDone = service.filter(t => ["resolved", "closed"].includes(t.status)).length;
  const svcPieData = [
    { name: "เสร็จแล้ว", value: svcDone, fill: C.green },
    { name: "เกินกำหนด", value: svcDelay, fill: C.rose },
    { name: "กำลังดำเนินการ", value: svcInProg, fill: C.amber },
    { name: "รอดำเนินการ", value: svcOpen, fill: C.blue },
  ].filter(d => d.value > 0);

  // Tech workload — active techs show individually; deleted techs → กองกลาง
  const allTechNames = [...new Set(service.map(t => t.technician))].filter(Boolean) as string[];
  const activeTechNames = allTechNames.filter(n => activeUserNames.has(n));
  const exTechNames = allTechNames.filter(n => !activeUserNames.has(n));
  const techWorkload = [
    ...activeTechNames.map(name => {
      const mine = service.filter(t => t.technician === name);
      return { name: name.split(" ")[0], open: mine.filter(t => t.status === "open").length, inProg: mine.filter(t => t.status === "in_progress").length, done: mine.filter(t => ["resolved", "closed"].includes(t.status)).length, total: mine.length, isPool: false };
    }),
    ...(exTechNames.length > 0 ? (() => {
      const pool = service.filter(t => t.technician && exTechNames.includes(t.technician));
      return [{ name: "กองกลาง", open: pool.filter(t => t.status === "open").length, inProg: pool.filter(t => t.status === "in_progress").length, done: pool.filter(t => ["resolved", "closed"].includes(t.status)).length, total: pool.length, isPool: true }];
    })() : []),
  ].sort((a, b) => (b.open + b.inProg) - (a.open + a.inProg)).slice(0, 8);

  // ── Sales funnel ────────────────────────────────────────────────────────────
  const funnelSteps = [
    { name: "Lead", value: projects.filter(p => p.status === "lead").length, fill: C.blue },
    { name: "Opportunity", value: projects.filter(p => p.status === "opportunity").length, fill: C.cyan },
    { name: "Proposal", value: projects.filter(p => p.status === "proposal").length, fill: C.amber },
    { name: "Negotiation", value: projects.filter(p => p.status === "negotiation").length, fill: C.orange },
    { name: "Won", value: projects.filter(p => p.status === "won").length, fill: C.green },
  ];

  if (!mounted) return <div className="p-6 text-muted text-sm">Loading...</div>;

  return (
    <div className="p-5 max-w-[1400px] space-y-5">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-muted mt-0.5">
            KMITSURAT — {filterLabel}
            {lastUpdated && !loading && (
              <span className="ml-2 opacity-50">
                · อัปเดต {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} disabled={loading}
            className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover disabled:opacity-40 transition-colors">
            {loading ? "..." : "↺"}
          </button>
          {/* Period filters */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {(["today", "week", "month", "year"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>
                {f === "today" ? "วันนี้" : f === "week" ? "สัปดาห์" : f === "month" ? "เดือน" : "ปี"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {(["q1", "q2", "q3", "q4"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                title={`${f.toUpperCase()} · ${qRanges[f as "q1" | "q2" | "q3" | "q4"].from.slice(0, 7)} → ${qRanges[f as "q1" | "q2" | "q3" | "q4"].to.slice(0, 7)}`}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-purple-600 text-white" : "text-muted hover:text-foreground"}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setFilter("custom")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${filter === "custom" ? "bg-cyan-700 border-cyan-600 text-white" : "border-border bg-card text-muted hover:text-foreground"}`}>
            กำหนดเอง
          </button>
        </div>
      </div>

      {filter === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-muted">จาก</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-xl bg-card border border-border px-3 py-1.5 text-xs" />
          <label className="text-xs text-muted">ถึง</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-xl bg-card border border-border px-3 py-1.5 text-xs" />
        </div>
      )}

      {loading && <div className="text-center py-12 text-muted text-sm">กำลังโหลดข้อมูล...</div>}

      {!loading && (<>

        {/* ── ALERTS BANNER ──────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className={`rounded-2xl border p-4 ${alerts.some(a => a.level === "red") ? "border-rose-800/50 bg-rose-950/20" : "border-amber-800/40 bg-amber-950/10"}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-semibold">{alerts.some(a => a.level === "red") ? "⚠️ ต้องดำเนินการด่วน" : "🟡 แจ้งเตือน"}</span>
              {alerts.filter(a => a.level === "red").length > 0 && (
                <span className="rounded-full bg-rose-700 text-white text-[10px] px-2 py-0.5 font-bold">
                  {alerts.filter(a => a.level === "red").length} เรื่องด่วน
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.map(a => <AlertRow key={a.id} {...a} />)}
            </div>
          </div>
        )}

        {/* ── LAYER 1: CORE KPIs ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">ตัวชี้วัดหลัก · {filterLabel}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="รายได้รวม (Revenue)" value={`${(actual / 1000000).toFixed(1)}M`} sub="THB" color="green" href="/sales" />
            <KpiCard label="เป้าหมาย vs จริง" value={`${targetPct.toFixed(0)}%`}
              sub={`${(actual / 1000).toFixed(0)}K / ${(target / 1000).toFixed(0)}K`}
              color={targetPct >= 80 ? "green" : targetPct >= 50 ? "amber" : "red"}
              pct={targetPct} href="/reports" />
            <KpiCard label="กำไรรวม (GP)" value={actualProfit > 0 ? `${(actualProfit / 1000000).toFixed(2)}M` : "—"}
              sub={`GP ${gpPct.toFixed(1)}% · เป้า ${profitPct.toFixed(0)}%`}
              color={gpPct >= 20 ? "green" : gpPct >= 10 ? "amber" : actualProfit > 0 ? "red" : "muted"}
              pct={profitPct} href="/reports" />
            <KpiCard label="Pipeline (ดีลรอปิด)" value={`${(pipeline / 1000000).toFixed(1)}M`} sub="THB" color="blue" href="/projects" />
            <KpiCard label="งานค้าง (Overdue)" value={String(overdueJobs)}
              sub={overdueJobs > 0 ? "ต้องดำเนินการ" : "ทุกงานปกติ"}
              color={overdueJobs > 0 ? "red" : "green"} alert={overdueJobs > 0} href="/sales" />
            <KpiCard label="SLA On-time" value={`${slaOnTime}%`}
              sub={`${allSvcResolved}/${allSvcTotal} งานรวม`}
              color={slaOnTime >= 80 ? "green" : slaOnTime >= 60 ? "amber" : "red"}
              pct={slaOnTime} href="/service" />
          </div>
        </div>

        {/* ── LAYER 2: PROFITABILITY + QUARTERLY ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Quarterly Comparison */}
          <Section title={`📊 ผลงานรายไตรมาส (FY ${fyYear}/${fyEndYear})`}
            action={<Link href="/reports" className="text-[11px] text-accent hover:underline">รายงาน →</Link>}>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {quarterlyData.map(q => (
                <div key={q.name}
                  className={`rounded-xl p-3 text-center border ${q.isCurrent ? "border-accent bg-accent/10" : "border-border bg-background"}`}>
                  <p className={`text-xs font-bold ${q.isCurrent ? "text-accent" : "text-muted"}`}>{q.name}</p>
                  <p className="text-lg font-bold mt-1">{q.actualK > 0 ? `${q.actualK}K` : "—"}</p>
                  <p className="text-[10px] text-muted">{q.targetK > 0 ? `เป้า ${q.targetK}K` : "ไม่มีเป้า"}</p>
                  <p className={`text-[10px] font-medium mt-1 ${q.pct >= 80 ? "text-green-400" : q.pct >= 50 ? "text-amber-400" : q.pct > 0 ? "text-rose-400" : "text-muted"}`}>
                    {q.pct > 0 ? `${q.pct}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={quarterlyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}K THB`]} contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="targetK" fill="#334155" radius={[4, 4, 0, 0]} name="เป้า" />
                <Bar dataKey="actualK" fill={C.blue} radius={[4, 4, 0, 0]} name="จริง" />
                <Bar dataKey="profitK" fill={C.purple} radius={[4, 4, 0, 0]} name="กำไร" />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          {/* Sales Pipeline Funnel */}
          <Section title="🔽 Sales Pipeline"
            action={<Link href="/projects" className="text-[11px] text-accent hover:underline">ดูดีล →</Link>}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="text-xs text-muted">Win Rate</div>
              <div className="text-2xl font-bold text-green-400">{convRate.toFixed(0)}%</div>
              <div className="text-xs text-muted">({wonCount}/{totalDeals} ดีล)</div>
            </div>
            <div className="space-y-2">
              {funnelSteps.map((step, i) => {
                const maxVal = Math.max(...funnelSteps.map(s => s.value), 1);
                return (
                  <div key={step.name} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-right text-muted shrink-0">{step.name}</div>
                    <div className="flex-1 h-7 rounded-lg bg-background relative overflow-hidden">
                      <div className="h-full rounded-lg transition-all duration-300"
                        style={{ width: `${(step.value / maxVal) * 100}%`, backgroundColor: step.fill, opacity: 0.85 - i * 0.05 }} />
                    </div>
                    <div className="w-8 text-xs font-bold text-right" style={{ color: step.fill }}>{step.value}</div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* ── LAYER 3: INDIVIDUAL SALES ───────────────────────────────────────── */}
        {personData.length > 0 && (
          <Section title={`👥 ยอดขายรายบุคคล · ${filterLabel}`}
            action={<Link href="/reports" className="text-[11px] text-accent hover:underline">รายงาน →</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-[11px] text-muted border-b border-border">
                    <th className="pb-2 font-medium">ชื่อ</th>
                    <th className="pb-2 font-medium text-right">เป้า (K)</th>
                    <th className="pb-2 font-medium text-right">จริง (K)</th>
                    <th className="pb-2 font-medium text-right">กำไร (K)</th>
                    <th className="pb-2 font-medium text-center">Achievement</th>
                    <th className="pb-2 font-medium text-right">Activity</th>
                    <th className="pb-2 font-medium text-right">โปรเจคเปิด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {personData.map(p => (
                    <tr key={p.name} className={`transition-colors ${p.isPool ? "bg-muted/5 border-t border-dashed border-border" : "hover:bg-card-hover"}`}>
                      <td className="py-2.5 font-medium">
                        {p.isPool
                          ? <span className="text-muted/70 text-xs flex items-center gap-1">📦 กองกลาง <span className="text-[10px] opacity-60">(พ้นสภาพ)</span></span>
                          : p.short}
                      </td>
                      <td className="py-2.5 text-right text-muted">{p.targetK > 0 ? p.targetK.toLocaleString() : "—"}</td>
                      <td className={`py-2.5 text-right font-semibold ${p.isPool ? "text-muted/70" : ""}`}>{p.actualK > 0 ? p.actualK.toLocaleString() : "—"}</td>
                      <td className="py-2.5 text-right text-purple-400/70">{p.pft > 0 ? Math.round(p.pft / 1000).toLocaleString() : "—"}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                            <div className={`h-full rounded-full ${p.isPool ? "bg-muted/40" : p.pct >= 80 ? "bg-green-500" : p.pct >= 50 ? "bg-amber-500" : p.pct > 0 ? "bg-rose-500" : "bg-muted/30"}`}
                              style={{ width: `${Math.min(p.pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs w-9 text-right ${p.isPool ? "text-muted/50" : p.pct >= 80 ? "text-green-400" : p.pct >= 50 ? "text-amber-400" : p.pct > 0 ? "text-rose-400" : "text-muted"}`}>
                            {p.tgt > 0 ? `${p.pct}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-muted">{p.acts || "—"}</td>
                      <td className="py-2.5 text-right text-blue-400/70">{p.activeProj || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── LAYER 4: OPS ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Presale Workload */}
          <Section title="⚙️ Presale Workload"
            action={<Link href="/presale" className="text-[11px] text-accent hover:underline">ดูงาน →</Link>}>
            {prWorkload.length === 0 ? (
              <p className="text-xs text-muted py-4">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {prWorkload.slice(0, 8).map(p => {
                  const total = p.pending + p.progress + p.done;
                  return (
                    <div key={p.fullName} className={`flex items-center gap-3 ${p.isPool ? "border-t border-dashed border-border pt-2 mt-1" : ""}`}>
                      <div className="w-16 text-xs truncate">
                        {p.isPool ? <span className="text-muted/60">📦 กองกลาง</span> : <span className="text-muted">{p.name}</span>}
                      </div>
                      <div className="flex-1 flex gap-1">
                        {total === 0 ? (
                          <div className="h-6 rounded bg-background border border-border text-muted/50 text-[10px] flex items-center justify-center px-2 w-full">
                            ว่าง
                          </div>
                        ) : (<>
                          {p.pending > 0 && (
                            <div className="h-6 rounded bg-amber-700/60 text-amber-200 text-[10px] flex items-center justify-center px-1.5 min-w-[22px]">
                              {p.pending}
                            </div>
                          )}
                          {p.progress > 0 && (
                            <div className="h-6 rounded bg-blue-700/60 text-blue-200 text-[10px] flex items-center justify-center px-1.5 min-w-[22px]">
                              {p.progress}
                            </div>
                          )}
                          {p.done > 0 && (
                            <div className="h-6 rounded bg-green-900/60 text-green-300 text-[10px] flex items-center justify-center px-1.5 min-w-[22px]">
                              {p.done}
                            </div>
                          )}
                        </>)}
                      </div>
                      <div className="text-[10px] text-muted w-10 text-right">{total > 0 ? `${total} งาน` : "—"}</div>
                    </div>
                  );
                })}
                <div className="flex gap-3 mt-2 text-[10px] text-muted">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-700/60 inline-block" />รอ</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-700/60 inline-block" />กำลังทำ</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-900/60 inline-block" />เสร็จ</span>
                </div>
              </div>
            )}
          </Section>

          {/* Service Status */}
          <Section title="🔧 Service Status"
            action={<Link href="/service" className="text-[11px] text-accent hover:underline">ดูงาน →</Link>}>
            <div className="flex items-center gap-4 mb-3">
              {svcPieData.length > 0 ? (
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={svcPieData} dataKey="value" innerRadius={28} outerRadius={44} paddingAngle={2}>
                      {svcPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-[100px] h-[100px] rounded-full border-4 border-border flex items-center justify-center">
                  <span className="text-xs text-muted">ไม่มีข้อมูล</span>
                </div>
              )}
              <div className="space-y-1.5 flex-1">
                {svcPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-muted flex-1">{d.name}</span>
                    <span className="text-xs font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {techWorkload.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-muted">ช่างรายคน</p>
                  <div className="flex gap-2 text-[10px] text-muted">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-600 inline-block" />เสร็จ</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />รอ</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {techWorkload.slice(0, 6).map(t => {
                    const maxTotal = Math.max(...techWorkload.map(x => x.total), 1);
                    return (
                      <div key={t.name} className={`flex items-center gap-2 ${t.isPool ? "border-t border-dashed border-border pt-2 mt-1" : ""}`}>
                        <div className="w-14 text-xs truncate shrink-0">
                          {t.isPool ? <span className="text-muted/60">📦 กองกลาง</span> : <span className="text-muted">{t.name}</span>}
                        </div>
                        <div className="flex-1 flex gap-0.5 h-5">
                          {t.done > 0 && (
                            <div className="h-full rounded-sm bg-green-700/70 flex items-center justify-center text-[10px] text-green-200 px-1 min-w-[18px]"
                              style={{ width: `${t.done / maxTotal * 100}%` }}>
                              {t.done}
                            </div>
                          )}
                          {t.inProg > 0 && (
                            <div className="h-full rounded-sm bg-amber-600/70 flex items-center justify-center text-[10px] text-amber-100 px-1 min-w-[18px]"
                              style={{ width: `${t.inProg / maxTotal * 100}%` }}>
                              {t.inProg}
                            </div>
                          )}
                          {t.open > 0 && (
                            <div className="h-full rounded-sm bg-blue-800/60 flex items-center justify-center text-[10px] text-blue-200 px-1 min-w-[18px]"
                              style={{ width: `${t.open / maxTotal * 100}%` }}>
                              {t.open}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted w-10 text-right shrink-0">{t.total} งาน</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* Contracts expiring */}
          <Section title="📄 สัญญาใกล้หมดอายุ"
            action={<Link href="/contracts" className="text-[11px] text-accent hover:underline">ดูสัญญา →</Link>}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-rose-950/30 border border-rose-800/40 p-3 text-center">
                <p className="text-2xl font-bold text-rose-400">{expiringContracts.length}</p>
                <p className="text-[10px] text-muted mt-0.5">หมดใน ≤30 วัน</p>
              </div>
              <div className="rounded-xl bg-amber-950/30 border border-amber-800/40 p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{expiredContracts.length}</p>
                <p className="text-[10px] text-muted mt-0.5">หมดอายุแล้ว</p>
              </div>
            </div>
            {topExpiring.length > 0 ? (
              <div className="space-y-2">
                {topExpiring.slice(0, 5).map(({ c, d }) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className={`text-xs font-bold w-9 text-center rounded px-1 py-0.5 ${d <= 7 ? "bg-rose-900/50 text-rose-300" : d <= 30 ? "bg-amber-900/50 text-amber-300" : "bg-background text-muted"}`}>
                      {d}d
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{c.title || c.customer_name}</p>
                      <p className="text-[10px] text-muted truncate">{c.customer_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted py-2">ไม่มีสัญญาใกล้หมด</p>
            )}
          </Section>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-[10px] text-muted border-t border-border pt-3">
          <span>ข้อมูลจาก: SalesQuota · Projects · Quotations · ServiceTickets · Contracts · Assets</span>
          <span>{lastUpdated ? `อัปเดตล่าสุด ${lastUpdated.toLocaleTimeString("th-TH")}` : ""}</span>
        </div>

      </>)}
    </div>
  );
}
