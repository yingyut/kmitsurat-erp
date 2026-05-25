"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/UserContext";
import {
  DEFAULT_LAYOUTS, ALL_VIEWS, WIDGET_LABELS, getRoleDefaultView,
  loadLayout, saveLayout, resetLayout,
  type DashView, type WidgetConfig,
} from "@/lib/dashboardLayout";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket, SalesQuota, Quotation, ServiceContract, Asset, User, JobRequest } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const C = { blue: "#3b82f6", purple: "#8b5cf6", rose: "#f43f5e", green: "#22c55e", amber: "#f59e0b", cyan: "#06b6d4", orange: "#f97316" };
type Filter = "today" | "week" | "month" | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

function quarterRange(qNum: 1 | 2 | 3 | 4, fyStart: number) {
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
  label: string; value: string; sub?: string;
  color: "green" | "blue" | "purple" | "amber" | "red" | "cyan" | "muted";
  href?: string; pct?: number; alert?: boolean;
}) {
  const colorMap = { green: "text-green-400", blue: "text-blue-400", purple: "text-purple-400", amber: "text-amber-400", red: "text-rose-400", cyan: "text-cyan-400", muted: "text-muted" };
  const inner = (
    <div className={`rounded-2xl bg-card border ${alert ? "border-rose-700/60 bg-rose-950/30" : "border-border"} p-4 h-full flex flex-col justify-between gap-2`}>
      <p className="text-xs text-muted leading-tight">{label}</p>
      <p className={`text-3xl font-bold tracking-tight leading-none ${colorMap[color]}`}>{value}</p>
      {pct !== undefined && (
        <div className="h-1.5 rounded-full bg-background overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-rose-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full hover:opacity-80 transition-opacity">{inner}</Link> : inner;
}

// ── Alert Row ──────────────────────────────────────────────────────────────────
function AlertRow({ level, msg, href }: { level: "red" | "orange" | "green"; msg: string; href: string }) {
  const cls = level === "red" ? "bg-rose-950/40 border-rose-800/50 text-rose-300"
    : level === "orange" ? "bg-amber-950/40 border-amber-800/50 text-amber-300"
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
    <div className="rounded-2xl bg-card border border-border overflow-hidden h-full">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-card-hover transition-colors text-left">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">{action}<span className="text-muted text-sm">{open ? "▲" : "▼"}</span></div>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// ── Sortable Widget Wrapper ────────────────────────────────────────────────────
function SortableWidget({ id, span, editMode, onToggleVisible, onToggleSpan, label, children }: {
  id: string; span: "full" | "half"; editMode: boolean;
  onToggleVisible: () => void; onToggleSpan: () => void;
  label: string; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: span === "full" ? "span 2" : "span 1",
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : "auto",
      }}
      className="relative"
    >
      {editMode && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          <div
            {...listeners} {...attributes}
            className="cursor-grab active:cursor-grabbing flex items-center gap-1 px-2 py-1 rounded-lg bg-background/90 border border-border text-muted hover:text-foreground hover:border-accent/50 transition-colors text-[10px] select-none"
            title="ลาก"
          >
            <span className="text-base leading-none">⠿</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          <button onClick={onToggleSpan} title={span === "full" ? "ย่อ 1/2" : "ขยาย Full"}
            className="px-2 py-1 rounded-lg bg-background/90 border border-border text-muted hover:text-foreground text-[10px] transition-colors">
            {span === "full" ? "½" : "⬛"}
          </button>
          <button onClick={onToggleVisible} title="ซ่อน widget นี้"
            className="px-2 py-1 rounded-lg bg-background/90 border border-rose-800/50 text-rose-400 hover:bg-rose-950/30 text-[10px] transition-colors">
            ✕
          </button>
        </div>
      )}
      <div className={editMode ? "ring-2 ring-accent/20 rounded-2xl" : ""}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser } = useCurrentUser();
  const isAdmin = ["admin", "Administrator"].includes(currentUser?.role ?? "");

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fyStartMonth, setFyStartMonth] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [view, setView] = useState<DashView>("executive");
  const [editMode, setEditMode] = useState(false);
  const [layouts, setLayouts] = useState<Record<DashView, WidgetConfig[]>>(DEFAULT_LAYOUTS);

  const [projects, setProjects] = useState<Project[]>([]);
  const [sales, setSales] = useState<SalesActivity[]>([]);
  const [presale, setPresale] = useState<PresaleRequest[]>([]);
  const [service, setService] = useState<ServiceTicket[]>([]);
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [quots, setQuots] = useState<Quotation[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);

  // ── Realtime Firestore subscriptions ─────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const received = new Set<string>();
    const total = ["projects","sales","presale","service","quotas","quots","contracts","assets","users","jobRequests"];
    const onFirst = (name: string) => {
      received.add(name);
      if (total.every(n => received.has(n))) setLoading(false);
      setLastUpdated(new Date());
    };
    const unsubs: (() => void)[] = [];
    (async () => {
      const fs = await import("@/lib/firestore");
      const cs = await fs.companySettings.list();
      if (cs.length > 0 && cs[0].fiscal_year_start_month) setFyStartMonth(cs[0].fiscal_year_start_month);
      unsubs.push(fs.projects.subscribe(d => { setProjects(d); onFirst("projects"); }));
      unsubs.push(fs.salesActivities.subscribe(d => { setSales(d); onFirst("sales"); }));
      unsubs.push(fs.presaleRequests.subscribe(d => { setPresale(d); onFirst("presale"); }));
      unsubs.push(fs.serviceTickets.subscribe(d => { setService(d); onFirst("service"); }));
      unsubs.push(fs.salesQuotas.subscribe(d => { setQuotas(d); onFirst("quotas"); }));
      unsubs.push(fs.quotations.subscribe(d => { setQuots(d); onFirst("quots"); }));
      unsubs.push(fs.serviceContracts.subscribe(d => { setContracts(d); onFirst("contracts"); }));
      unsubs.push(fs.assets.subscribe(d => { setAssets(d); onFirst("assets"); }));
      unsubs.push(fs.users.subscribe(d => { setUsers(d.filter(x => x.active)); onFirst("users"); }));
      unsubs.push(fs.jobRequests.subscribe(d => { setJobRequests(d); onFirst("jobRequests"); }));
    })();
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Role-based default view + load saved layouts ──────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id || currentUser.name;
    const defaultView = getRoleDefaultView(currentUser.role);
    setView(defaultView);
    const all = {} as Record<DashView, WidgetConfig[]>;
    for (const v of ALL_VIEWS) {
      all[v] = loadLayout(uid, v);
    }
    setLayouts(all);
  }, [currentUser?.id, currentUser?.name]);

  // ── Date helpers ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = today.slice(0, 4);
  const thisMonth = today.slice(0, 7);
  const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const qRanges = {
    q1: quarterRange(1, fyStartMonth), q2: quarterRange(2, fyStartMonth),
    q3: quarterRange(3, fyStartMonth), q4: quarterRange(4, fyStartMonth),
  };
  const activeRange = filter === "custom" ? { from: dateFrom, to: dateTo }
    : (["q1","q2","q3","q4"].includes(filter) ? qRanges[filter as "q1"|"q2"|"q3"|"q4"] : null);
  const filterLabel = filter === "today" ? "วันนี้" : filter === "week" ? "7 วัน" : filter === "month" ? "เดือนนี้"
    : filter === "q1" ? "Q1" : filter === "q2" ? "Q2" : filter === "q3" ? "Q3" : filter === "q4" ? "Q4"
    : filter === "year" ? "ปีนี้" : (dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "กำหนดเอง");

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
    const t = new Date(date); t.setHours(0,0,0,0);
    const now = new Date(); now.setHours(0,0,0,0);
    return Math.floor((t.getTime() - now.getTime()) / 86400000);
  }

  // ── Filtered slices ───────────────────────────────────────────────────────────
  const filtQuotas = (() => {
    if (filter === "year") return quotas.filter(q => q.month?.startsWith(thisYear));
    if (filter === "month") return quotas.filter(q => q.month === thisMonth);
    if (activeRange) return quotas.filter(q => q.month && q.month >= activeRange.from.slice(0,7) && q.month <= activeRange.to.slice(0,7));
    return quotas.filter(q => q.month === thisMonth);
  })();
  const filtSales = sales.filter(a => inRange(a.next_follow_up));
  const filtPresale = presale.filter(r => inRange(r.due_date));
  const filtService = service.filter(t => inRange(t.service_date));

  // ── Core KPIs ─────────────────────────────────────────────────────────────────
  const target = filtQuotas.reduce((s, q) => s + (q.quota_target || 0), 0);
  const actual = filtQuotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
  const targetPct = target > 0 ? (actual / target * 100) : 0;
  const profitTarget = filtQuotas.reduce((s, q) => s + (q.profit_target || 0), 0);
  const actualProfit = filtQuotas.reduce((s, q) => s + (q.actual_profit || 0), 0);
  const profitPct = profitTarget > 0 ? (actualProfit / profitTarget * 100) : 0;
  const gpPct = actual > 0 ? (actualProfit / actual * 100) : 0;
  const pipeline = projects.filter(p => !["won","lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  const wonCount = projects.filter(p => p.status === "won").length;
  const totalDeals = projects.filter(p => p.status !== "lost").length;
  const convRate = totalDeals > 0 ? (wonCount / totalDeals * 100) : 0;
  const allSvcResolved = service.filter(t => ["resolved","closed"].includes(t.status)).length;
  const allSvcTotal = service.length;
  const slaOnTime = allSvcTotal > 0 ? Math.round(allSvcResolved / allSvcTotal * 100) : 100;
  const approvedProfit = quots.filter(q => q.status === "approved").reduce((s, q) => s + (q.gross_profit || 0), 0);

  // ── Contracts ─────────────────────────────────────────────────────────────────
  const activeContracts = contracts.filter(c => c.status === "active");
  const expiringContracts = activeContracts.filter(c => { const d = dayDiff(c.end_date); return d !== null && d >= 0 && d <= 30; });
  const expiredContracts = activeContracts.filter(c => { const d = dayDiff(c.end_date); return d !== null && d < 0; });
  const topExpiring = activeContracts.map(c => ({ c, d: dayDiff(c.end_date) ?? 9999 })).filter(x => x.d >= 0).sort((a,b) => a.d - b.d).slice(0,6);

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const salesOverdue = sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done");
  const presaleOverdue = presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed");
  const svcOverdue = service.filter(t => t.service_date && t.service_date < today && !["resolved","closed"].includes(t.status));
  type AlertItem = { id: string; msg: string; level: "red"|"orange"|"green"; href: string };
  const alerts: AlertItem[] = [];
  if (salesOverdue.length > 0) alerts.push({ id:"so", msg:`Sales overdue ${salesOverdue.length} รายการ — ติดตามลูกค้าด่วน`, level:"red", href:"/sales" });
  if (presaleOverdue.length > 0) alerts.push({ id:"po", msg:`Presale ค้าง SLA ${presaleOverdue.length} งาน`, level:"red", href:"/presale" });
  if (expiredContracts.length > 0) alerts.push({ id:"ec", msg:`สัญญาหมดอายุแล้ว ${expiredContracts.length} รายการ — ต่ออายุด่วน`, level:"red", href:"/contracts" });
  if (svcOverdue.length > 0) alerts.push({ id:"sv", msg:`Service ค้าง ${svcOverdue.length} งาน`, level:"orange", href:"/service" });
  if (expiringContracts.length > 0) alerts.push({ id:"rc", msg:`${expiringContracts.length} สัญญาใกล้หมดใน ≤30 วัน`, level:"orange", href:"/contracts" });
  const warranty30 = assets.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d >= 0 && d <= 30; });
  const warrantyExpired = assets.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d < 0; });
  if (warrantyExpired.length > 0) alerts.push({ id:"we", msg:`${warrantyExpired.length} อุปกรณ์หมดประกันแล้ว — ตรวจสอบ MA`, level:"red", href:"/assets" });
  if (warranty30.length > 0) alerts.push({ id:"w30", msg:`${warranty30.length} อุปกรณ์ประกันหมดใน ≤30 วัน`, level:"orange", href:"/assets" });
  const pmDue = assets.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d < 0; });
  if (pmDue.length > 0) alerts.push({ id:"pmd", msg:`${pmDue.length} อุปกรณ์ PM เลยกำหนดแล้ว — สร้าง PM Ticket`, level:"red", href:"/assets/pm-schedule" });
  const draftQ = quots.filter(q => q.status === "draft").length;
  if (draftQ > 0) alerts.push({ id:"dq", msg:`${draftQ} ใบเสนอราคา Draft รอส่ง`, level:"green", href:"/quotations" });

  // ── Quarterly comparison ──────────────────────────────────────────────────────
  function getQuarterOf(monthStr: string): 1|2|3|4 {
    const m = parseInt(monthStr.slice(5,7));
    return (Math.floor(((m - fyStartMonth + 12) % 12) / 3) + 1) as 1|2|3|4;
  }
  const todayMonthNum = new Date().getMonth() + 1;
  const fyYear = fyStartMonth <= todayMonthNum ? parseInt(thisYear) : parseInt(thisYear) - 1;
  const fyStartStr = `${fyYear}-${String(fyStartMonth).padStart(2,"0")}`;
  const fyEndMonthNum = ((fyStartMonth - 1 + 11) % 12) + 1;
  const fyEndYear = fyYear + (fyStartMonth + 11 > 12 ? 1 : 0);
  const fyEndStr = `${fyEndYear}-${String(fyEndMonthNum).padStart(2,"0")}`;
  const fyQuotas = quotas.filter(q => q.month && q.month >= fyStartStr && q.month <= fyEndStr);
  const quarterlyData = ([1,2,3,4] as const).map(q => {
    const qQ = fyQuotas.filter(qt => getQuarterOf(qt.month!) === q);
    const tgt = qQ.reduce((s, x) => s + (x.quota_target||0), 0);
    const act = qQ.reduce((s, x) => s + (x.actual_sales||0), 0);
    const pft = qQ.reduce((s, x) => s + (x.actual_profit||0), 0);
    const r = qRanges[`q${q}` as "q1"|"q2"|"q3"|"q4"];
    return { name:`Q${q}`, isCurrent: r.from <= today && r.to >= today,
      targetK: Math.round(tgt/1000), actualK: Math.round(act/1000), profitK: Math.round(pft/1000),
      pct: tgt > 0 ? Math.round(act/tgt*100) : 0 };
  });

  // ── Sales Users ───────────────────────────────────────────────────────────────
  const activeUserNames = new Set(users.map(u => u.name));
  const SALES_ROLES = new Set(["sale","avenger","Sales Executive","Sales Manager","Branch Manager"]);
  const salesUsers = users.filter(u => SALES_ROLES.has(u.role));
  type PersonRow = { name:string; short:string; tgt:number; act:number; pft:number; acts:number; activeProj:number; pct:number; targetK:number; actualK:number; isPool?:boolean };
  const activeSalesData: PersonRow[] = salesUsers.map(u => {
    const short = u.nickname ? u.nickname.replace(/พี่|น้อง/g,"").trim() : u.name.split(" ")[0];
    const pQ = filtQuotas.filter(q => q.user_name === u.name);
    const tgt = pQ.reduce((s,q) => s+(q.quota_target||0), 0);
    const act = pQ.reduce((s,q) => s+(q.actual_sales||0), 0);
    const pft = pQ.reduce((s,q) => s+(q.actual_profit||0), 0);
    const acts = filtSales.filter(a => a.assigned_to === u.name).length;
    const activeProj = projects.filter(pr => pr.assigned_to === u.name && !["won","lost"].includes(pr.status)).length;
    return { name:u.name, short, tgt, act, pft, acts, activeProj, pct: tgt>0?Math.round(act/tgt*100):0, targetK:Math.round(tgt/1000), actualK:Math.round(act/1000) };
  }).sort((a,b) => b.act-a.act);
  const poolSalesQ = filtQuotas.filter(q => q.user_name && !activeUserNames.has(q.user_name));
  const poolTgt = poolSalesQ.reduce((s,q)=>s+(q.quota_target||0),0), poolAct = poolSalesQ.reduce((s,q)=>s+(q.actual_sales||0),0), poolPft = poolSalesQ.reduce((s,q)=>s+(q.actual_profit||0),0);
  const poolSalesActs = filtSales.filter(a=>a.assigned_to&&!activeUserNames.has(a.assigned_to)).length;
  const poolSalesProj = projects.filter(p=>p.assigned_to&&!activeUserNames.has(p.assigned_to)&&!["won","lost"].includes(p.status)).length;
  const poolRow: PersonRow|null = (poolTgt>0||poolAct>0||poolSalesActs>0||poolSalesProj>0)
    ? { name:"กองกลาง",short:"กองกลาง",tgt:poolTgt,act:poolAct,pft:poolPft,acts:poolSalesActs,activeProj:poolSalesProj,pct:poolTgt>0?Math.round(poolAct/poolTgt*100):0,targetK:Math.round(poolTgt/1000),actualK:Math.round(poolAct/1000),isPool:true }
    : null;
  const personData: PersonRow[] = [...activeSalesData,...(poolRow?[poolRow]:[])];

  // ── Presale Workload ──────────────────────────────────────────────────────────
  const PRESALE_ROLES = new Set(["presale","Presale Manager","presales_manager","Avenger","Avenger Team","avenger","Presale Engineer","BOQ Engineer","Presales Manager","Presales Engineer"]);
  const presaleRoleUsers = users.filter(u => PRESALE_ROLES.has(u.role));
  const presaleAssigneeNames = new Set(presale.map(r=>r.assigned_to).filter(Boolean) as string[]);
  const extraPresaleAssignees = [...presaleAssigneeNames].filter(n => !presaleRoleUsers.find(u=>u.name===n));
  const activeExtraPresale = extraPresaleAssignees.filter(n => activeUserNames.has(n));
  const exPresaleNames = extraPresaleAssignees.filter(n => !activeUserNames.has(n));
  const allPresalePeople = [...presaleRoleUsers.map(u=>u.name),...activeExtraPresale];
  const prWorkload = allPresalePeople.map(name => ({
    name: name.split(" ")[0], fullName: name, isPool: false,
    pending: presale.filter(r=>r.assigned_to===name&&r.status==="pending").length,
    progress: presale.filter(r=>r.assigned_to===name&&r.status==="in_progress").length,
    done: presale.filter(r=>r.assigned_to===name&&r.status==="completed").length,
  })).sort((a,b)=>(b.pending+b.progress+b.done)-(a.pending+a.progress+a.done));
  const exPresaleTickets = presale.filter(r=>r.assigned_to&&exPresaleNames.includes(r.assigned_to));
  if (exPresaleTickets.length > 0) prWorkload.push({ name:"กองกลาง",fullName:"กองกลาง",isPool:true, pending:exPresaleTickets.filter(r=>r.status==="pending").length, progress:exPresaleTickets.filter(r=>r.status==="in_progress").length, done:exPresaleTickets.filter(r=>r.status==="completed").length });

  // ── Service ───────────────────────────────────────────────────────────────────
  const svcOpen = service.filter(t=>t.status==="open").length;
  const svcInProg = service.filter(t=>t.status==="in_progress").length;
  const svcDone = service.filter(t=>["resolved","closed"].includes(t.status)).length;
  const svcDelay = svcOverdue.length;
  const svcPieData = [
    { name:"เสร็จแล้ว",value:svcDone,fill:C.green },
    { name:"เกินกำหนด",value:svcDelay,fill:C.rose },
    { name:"กำลังดำเนินการ",value:svcInProg,fill:C.amber },
    { name:"รอดำเนินการ",value:svcOpen,fill:C.blue },
  ].filter(d=>d.value>0);
  const allTechNames = [...new Set(service.map(t=>t.technician))].filter(Boolean) as string[];
  const activeTechNames = allTechNames.filter(n=>activeUserNames.has(n));
  const exTechNames = allTechNames.filter(n=>!activeUserNames.has(n));
  const techWorkload = [
    ...activeTechNames.map(name => {
      const mine = service.filter(t=>t.technician===name);
      return { name:name.split(" ")[0], fullName:name, open:mine.filter(t=>t.status==="open").length, inProg:mine.filter(t=>t.status==="in_progress").length, done:mine.filter(t=>["resolved","closed"].includes(t.status)).length, total:mine.length, isPool:false };
    }),
    ...(exTechNames.length>0?[(() => { const pool=service.filter(t=>t.technician&&exTechNames.includes(t.technician)); return { name:"กองกลาง",fullName:"กองกลาง",open:pool.filter(t=>t.status==="open").length,inProg:pool.filter(t=>t.status==="in_progress").length,done:pool.filter(t=>["resolved","closed"].includes(t.status)).length,total:pool.length,isPool:true }; })()]:[]),
  ].sort((a,b)=>(b.open+b.inProg)-(a.open+a.inProg)).slice(0,8);

  // ── Funnel ────────────────────────────────────────────────────────────────────
  const funnelSteps = [
    { name:"Lead",value:projects.filter(p=>p.status==="lead").length,fill:C.blue },
    { name:"Opportunity",value:projects.filter(p=>p.status==="opportunity").length,fill:C.cyan },
    { name:"Proposal",value:projects.filter(p=>p.status==="proposal").length,fill:C.amber },
    { name:"Negotiation",value:projects.filter(p=>p.status==="negotiation").length,fill:C.orange },
    { name:"Won",value:projects.filter(p=>p.status==="won").length,fill:C.green },
  ];

  // ── Quotation stats ───────────────────────────────────────────────────────────
  const qtDraft = quots.filter(q=>q.status==="draft").length;
  const qtSent = quots.filter(q=>["sent","follow_up","revised"].includes(q.status)).length;
  const qtApproved = quots.filter(q=>q.status==="approved").length;
  const qtRejected = quots.filter(q=>["rejected","expired"].includes(q.status)).length;
  const approvedGP = quots.filter(q=>q.status==="approved").reduce((s,q)=>s+(q.gross_profit||0),0);
  const approvedTotal = quots.filter(q=>q.status==="approved").reduce((s,q)=>s+(q.grand_total||0),0);
  const prTotal = presale.length, prPending = presale.filter(r=>r.status==="pending").length;
  const prInProg = presale.filter(r=>r.status==="in_progress").length, prDone = presale.filter(r=>r.status==="completed").length;
  const pmOverdue = assets.filter(a=>{ const d=dayDiff(a.pm_next_date); return d!==null&&d<0; });
  const pmDue30 = assets.filter(a=>{ const d=dayDiff(a.pm_next_date); return d!==null&&d>=0&&d<=30; });
  const overdueJobs = salesOverdue.length + presaleOverdue.length + svcOverdue.length;

  // ── Layout management ─────────────────────────────────────────────────────────
  const uid = currentUser?.id || currentUser?.name || "guest";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayouts(prev => {
      const curr = [...prev[view]];
      const oldIdx = curr.findIndex(w => w.id === active.id);
      const newIdx = curr.findIndex(w => w.id === over.id);
      const newLayout = arrayMove(curr, oldIdx, newIdx);
      saveLayout(uid, view, newLayout);
      return { ...prev, [view]: newLayout };
    });
  }, [view, uid]);

  const toggleVisible = useCallback((id: string) => {
    setLayouts(prev => {
      const curr = prev[view].map(w => w.id === id ? { ...w, visible: !w.visible } : w);
      saveLayout(uid, view, curr);
      return { ...prev, [view]: curr };
    });
  }, [view, uid]);

  const toggleSpan = useCallback((id: string) => {
    setLayouts(prev => {
      const curr = prev[view].map(w => w.id === id ? { ...w, span: w.span === "full" ? "half" : "full" as "full"|"half" } : w);
      saveLayout(uid, view, curr);
      return { ...prev, [view]: curr };
    });
  }, [view, uid]);

  const handleResetLayout = useCallback(() => {
    setLayouts(prev => ({ ...prev, [view]: resetLayout(uid, view) }));
  }, [view, uid]);

  // ── renderWidget ──────────────────────────────────────────────────────────────
  const renderWidget = useCallback((id: string): React.ReactNode => {
    const maxTechTotal = Math.max(...techWorkload.map(x => x.total), 1);

    // ── EXECUTIVE ──────────────────────────────────────────────────────────────
    if (id === "exec-kpis") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">ตัวชี้วัดหลัก · {filterLabel}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="รายได้รวม (Revenue)" value={`${(actual/1e6).toFixed(1)}M`} sub="THB" color="green" href="/sales" />
          <KpiCard label="เป้าหมาย vs จริง" value={`${targetPct.toFixed(0)}%`} sub={`${(actual/1000).toFixed(0)}K / ${(target/1000).toFixed(0)}K`} color={targetPct>=80?"green":targetPct>=50?"amber":"red"} pct={targetPct} href="/reports" />
          <KpiCard label="กำไรรวม (GP)" value={actualProfit>0?`${(actualProfit/1e6).toFixed(2)}M`:"—"} sub={`GP ${gpPct.toFixed(1)}% · เป้า ${profitPct.toFixed(0)}%`} color={gpPct>=20?"green":gpPct>=10?"amber":actualProfit>0?"red":"muted"} pct={profitPct} href="/reports" />
          <KpiCard label="Pipeline (ดีลรอปิด)" value={`${(pipeline/1e6).toFixed(1)}M`} sub="THB" color="blue" href="/projects" />
          <KpiCard label="งานค้าง (Overdue)" value={String(overdueJobs)} sub={overdueJobs>0?"ต้องดำเนินการ":"ทุกงานปกติ"} color={overdueJobs>0?"red":"green"} alert={overdueJobs>0} href="/sales" />
          <KpiCard label="SLA On-time" value={`${slaOnTime}%`} sub={`${allSvcResolved}/${allSvcTotal} งาน`} color={slaOnTime>=80?"green":slaOnTime>=60?"amber":"red"} pct={slaOnTime} href="/service" />
        </div>
      </div>
    );

    if (id === "exec-quarterly") return (
      <Section title={`📊 ผลงานรายไตรมาส (FY ${fyYear}/${fyEndYear})`} action={<Link href="/reports" className="text-[11px] text-accent hover:underline">รายงาน →</Link>}>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {quarterlyData.map(q => (
            <div key={q.name} className={`rounded-xl p-3 text-center border ${q.isCurrent?"border-accent bg-accent/10":"border-border bg-background"}`}>
              <p className={`text-xs font-bold ${q.isCurrent?"text-accent":"text-muted"}`}>{q.name}</p>
              <p className="text-lg font-bold mt-1">{q.actualK>0?`${q.actualK}K`:"—"}</p>
              <p className="text-[10px] text-muted">{q.targetK>0?`เป้า ${q.targetK}K`:"ไม่มีเป้า"}</p>
              <p className={`text-[10px] font-medium mt-1 ${q.pct>=80?"text-green-400":q.pct>=50?"text-amber-400":q.pct>0?"text-rose-400":"text-muted"}`}>{q.pct>0?`${q.pct}%`:"—"}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={quarterlyData} margin={{ left:0,right:0,top:0,bottom:0 }}>
            <XAxis dataKey="name" tick={{ fontSize:11,fill:"#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10,fill:"#888" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={(v)=>[`${Number(v).toLocaleString()}K THB`]} contentStyle={{ background:"#1a1a2e",border:"1px solid #333",borderRadius:8,fontSize:11 }} />
            <Bar dataKey="targetK" fill="#334155" radius={[4,4,0,0]} name="เป้า" />
            <Bar dataKey="actualK" fill={C.blue} radius={[4,4,0,0]} name="จริง" />
            <Bar dataKey="profitK" fill={C.purple} radius={[4,4,0,0]} name="กำไร" />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    );

    if (id === "exec-pipeline" || id === "sales-funnel" || id === "prj-funnel") return (
      <Section title="🔽 Sales Pipeline" action={<Link href="/projects" className="text-[11px] text-accent hover:underline">ดูดีล →</Link>}>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="text-xs text-muted">Win Rate</div>
          <div className="text-2xl font-bold text-green-400">{convRate.toFixed(0)}%</div>
          <div className="text-xs text-muted">({wonCount}/{totalDeals} ดีล)</div>
        </div>
        <div className="space-y-2">
          {funnelSteps.map((step, i) => {
            const maxVal = Math.max(...funnelSteps.map(s=>s.value), 1);
            return (
              <Link key={step.name} href="/projects" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-20 text-xs text-right text-muted shrink-0">{step.name}</div>
                <div className="flex-1 h-7 rounded-lg bg-background overflow-hidden">
                  <div className="h-full rounded-lg" style={{ width:`${(step.value/maxVal)*100}%`,backgroundColor:step.fill,opacity:0.85-i*0.05 }} />
                </div>
                <div className="w-8 text-xs font-bold text-right" style={{ color:step.fill }}>{step.value}</div>
              </Link>
            );
          })}
        </div>
      </Section>
    );

    if (id === "exec-sales-table" || id === "sales-table") return (
      <Section title={`👥 ยอดขายรายบุคคล · ${filterLabel}`} action={<Link href="/reports" className="text-[11px] text-accent hover:underline">รายงาน →</Link>}>
        {personData.length === 0 ? <p className="text-xs text-muted py-4">ไม่มีข้อมูล</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-border">
                  <th className="pb-2 font-medium">ชื่อ</th>
                  <th className="pb-2 font-medium text-right">เป้า (K)</th>
                  <th className="pb-2 font-medium text-right">จริง (K)</th>
                  <th className="pb-2 font-medium text-right">GP (K)</th>
                  <th className="pb-2 font-medium text-center">Achievement</th>
                  <th className="pb-2 font-medium text-right">Activity</th>
                  <th className="pb-2 font-medium text-right">โปรเจค</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {personData.map(p => (
                  <tr key={p.name} className={p.isPool?"bg-muted/5":"hover:bg-card-hover"}>
                    <td className="py-2.5 font-medium">
                      {p.isPool?<span className="text-muted/70 text-xs">📦 กองกลาง</span>:<Link href="/sales" className="hover:text-accent">{p.short}</Link>}
                    </td>
                    <td className="py-2.5 text-right text-muted">{p.targetK>0?p.targetK.toLocaleString():"—"}</td>
                    <td className="py-2.5 text-right font-semibold">{p.actualK>0?p.actualK.toLocaleString():"—"}</td>
                    <td className="py-2.5 text-right text-purple-400/70">{p.pft>0?Math.round(p.pft/1000).toLocaleString():"—"}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                          <div className={`h-full rounded-full ${p.pct>=80?"bg-green-500":p.pct>=50?"bg-amber-500":p.pct>0?"bg-rose-500":"bg-muted/30"}`} style={{ width:`${Math.min(p.pct,100)}%` }} />
                        </div>
                        <span className={`text-xs w-9 text-right ${p.pct>=80?"text-green-400":p.pct>=50?"text-amber-400":p.pct>0?"text-rose-400":"text-muted"}`}>{p.tgt>0?`${p.pct}%`:"—"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted">{p.acts||"—"}</td>
                    <td className="py-2.5 text-right text-blue-400/70">{p.activeProj||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    );

    if (id === "exec-presale" || id === "pre-workload") return (
      <Section title="⚙️ Presale Workload" action={<Link href="/presale" className="text-[11px] text-accent hover:underline">ดูงาน →</Link>}>
        {prWorkload.length===0?<p className="text-xs text-muted py-4">ไม่มีข้อมูล</p>:(
          <div className="space-y-2">
            {prWorkload.slice(0,8).map(p=>{
              const total = p.pending+p.progress+p.done;
              return (
                <Link key={p.fullName} href="/presale" className={`flex items-center gap-3 hover:opacity-80 ${p.isPool?"border-t border-dashed border-border pt-2 mt-1":""}`}>
                  <div className="w-16 text-xs truncate">{p.isPool?<span className="text-muted/60">📦 กองกลาง</span>:<span className="text-muted">{p.name}</span>}</div>
                  <div className="flex-1 flex gap-1">
                    {total===0?<div className="h-6 rounded bg-background border border-border text-muted/50 text-[10px] flex items-center justify-center px-2 w-full">ว่าง</div>:(<>
                      {p.pending>0&&<div className="h-6 rounded bg-amber-700/60 text-amber-200 text-[10px] flex items-center justify-center px-1.5 min-w-[22px]">{p.pending}</div>}
                      {p.progress>0&&<div className="h-6 rounded bg-blue-700/60 text-blue-200 text-[10px] flex items-center justify-center px-1.5 min-w-[22px]">{p.progress}</div>}
                      {p.done>0&&<div className="h-6 rounded bg-green-900/60 text-green-300 text-[10px] flex items-center justify-center px-1.5 min-w-[22px]">{p.done}</div>}
                    </>)}
                  </div>
                  <div className="text-[10px] text-muted w-10 text-right">{total>0?`${total} งาน`:"—"}</div>
                </Link>
              );
            })}
            <div className="flex gap-3 mt-2 text-[10px] text-muted">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-700/60 inline-block"/>รอ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-700/60 inline-block"/>กำลังทำ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-900/60 inline-block"/>เสร็จ</span>
            </div>
          </div>
        )}
      </Section>
    );

    if (id === "exec-service" || id === "svc-status") return (
      <Section title="🔧 Service Status" action={<Link href="/service" className="text-[11px] text-accent hover:underline">ดูงาน →</Link>}>
        <div className="flex items-center gap-4 mb-3">
          {svcPieData.length>0?(
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={svcPieData} dataKey="value" innerRadius={28} outerRadius={44} paddingAngle={2}>
                  {svcPieData.map((entry,i)=><Cell key={i} fill={entry.fill}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ):(
            <div className="w-[100px] h-[100px] rounded-full border-4 border-border flex items-center justify-center">
              <span className="text-xs text-muted">ไม่มีข้อมูล</span>
            </div>
          )}
          <div className="space-y-1.5 flex-1">
            {svcPieData.map(d=>(
              <Link key={d.name} href="/service" className="flex items-center gap-2 hover:opacity-80">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor:d.fill }}/>
                <span className="text-xs text-muted flex-1">{d.name}</span>
                <span className="text-xs font-semibold">{d.value}</span>
              </Link>
            ))}
          </div>
        </div>
        {techWorkload.length>0&&(
          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-muted mb-2">ช่างรายคน</p>
            <div className="space-y-2">
              {techWorkload.slice(0,6).map(t=>(
                <Link key={t.name} href="/service" className={`flex items-center gap-2 hover:opacity-80 ${t.isPool?"border-t border-dashed border-border pt-2 mt-1":""}`}>
                  <div className="w-14 text-xs truncate shrink-0">{t.isPool?<span className="text-muted/60">📦</span>:<span className="text-muted">{t.name}</span>}</div>
                  <div className="flex-1 flex gap-0.5 h-5">
                    {t.done>0&&<div className="h-full rounded-sm bg-green-700/70 text-[10px] text-green-200 flex items-center justify-center px-1 min-w-[18px]" style={{ width:`${t.done/maxTechTotal*100}%` }}>{t.done}</div>}
                    {t.inProg>0&&<div className="h-full rounded-sm bg-amber-600/70 text-[10px] text-amber-100 flex items-center justify-center px-1 min-w-[18px]" style={{ width:`${t.inProg/maxTechTotal*100}%` }}>{t.inProg}</div>}
                    {t.open>0&&<div className="h-full rounded-sm bg-blue-800/60 text-[10px] text-blue-200 flex items-center justify-center px-1 min-w-[18px]" style={{ width:`${t.open/maxTechTotal*100}%` }}>{t.open}</div>}
                  </div>
                  <span className="text-[10px] text-muted w-10 text-right shrink-0">{t.total} งาน</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>
    );

    if (id === "exec-contracts" || id === "prj-contracts") return (
      <Section title="📄 สัญญาใกล้หมดอายุ" action={<Link href="/contracts" className="text-[11px] text-accent hover:underline">ดูสัญญา →</Link>}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Link href="/contracts" className="rounded-xl bg-rose-950/30 border border-rose-800/40 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-rose-400">{expiringContracts.length}</p>
            <p className="text-[10px] text-muted mt-0.5">หมดใน ≤30 วัน</p>
          </Link>
          <Link href="/contracts" className="rounded-xl bg-amber-950/30 border border-amber-800/40 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-amber-400">{expiredContracts.length}</p>
            <p className="text-[10px] text-muted mt-0.5">หมดอายุแล้ว</p>
          </Link>
        </div>
        {topExpiring.length>0?(
          <div className="space-y-2">
            {topExpiring.slice(0,5).map(({c,d})=>(
              <Link key={c.id} href="/contracts" className="flex items-center gap-2 hover:opacity-80">
                <div className={`text-xs font-bold w-9 text-center rounded px-1 py-0.5 ${d<=7?"bg-rose-900/50 text-rose-300":d<=30?"bg-amber-900/50 text-amber-300":"bg-background text-muted"}`}>{d}d</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{c.title||c.customer_name}</p>
                  <p className="text-[10px] text-muted truncate">{c.customer_name}</p>
                </div>
              </Link>
            ))}
          </div>
        ):<p className="text-xs text-muted py-2">ไม่มีสัญญาใกล้หมด</p>}
      </Section>
    );

    // ── SALES ─────────────────────────────────────────────────────────────────
    if (id === "sales-person-cards") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Sales รายบุคคล · {filterLabel}</p>
        <div className="flex gap-3 flex-wrap">
          {personData.filter(p=>!p.isPool).map(p=>{
            const myOverdue = salesOverdue.filter(a=>a.assigned_to===p.name).length;
            return (
              <Link key={p.name} href="/sales"
                className="flex-1 min-w-[200px] max-w-[280px] rounded-2xl bg-card border border-border p-4 hover:border-accent/50 hover:bg-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{p.short}</p>
                    <p className="text-[10px] text-muted truncate max-w-[140px]">{p.name}</p>
                  </div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.pct>=80?"bg-green-900/50 text-green-300":p.pct>=50?"bg-amber-900/50 text-amber-300":p.tgt>0?"bg-rose-900/50 text-rose-300":"bg-muted/10 text-muted"}`}>
                    {p.tgt>0?`${p.pct}%`:"—"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-muted">ยอดขาย</span><span className="font-semibold text-green-400">{p.actualK>0?`${p.actualK.toLocaleString()}K`:"—"}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted">เป้า</span><span className="text-muted">{p.targetK>0?`${p.targetK.toLocaleString()}K`:"—"}</span></div>
                  {p.tgt>0&&<div className="h-1.5 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${p.pct>=80?"bg-green-500":p.pct>=50?"bg-amber-500":"bg-rose-500"}`} style={{ width:`${Math.min(p.pct,100)}%` }}/></div>}
                  <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                    <div className="text-center"><p className="text-xs font-bold">{p.acts}</p><p className="text-[10px] text-muted">Activity</p></div>
                    <div className="text-center"><p className="text-xs font-bold">{p.activeProj}</p><p className="text-[10px] text-muted">โปรเจค</p></div>
                    <div className="text-center"><p className={`text-xs font-bold ${myOverdue>0?"text-rose-400":""}`}>{myOverdue}</p><p className="text-[10px] text-muted">ค้าง</p></div>
                  </div>
                </div>
              </Link>
            );
          })}
          {personData.filter(p=>!p.isPool).length===0&&<p className="text-xs text-muted py-4">ยังไม่มีข้อมูล Sales</p>}
        </div>
      </div>
    );

    if (id === "sales-kpis") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Sales KPI · {filterLabel}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="ยอดขายรวม" value={`${(actual/1e6).toFixed(1)}M`} sub="THB" color="green" href="/sales" />
          <KpiCard label="บรรลุเป้า" value={`${targetPct.toFixed(0)}%`} sub={`${(actual/1000).toFixed(0)}K / ${(target/1000).toFixed(0)}K`} color={targetPct>=80?"green":targetPct>=50?"amber":"red"} pct={targetPct} href="/reports" />
          <KpiCard label="กำไรรวม (GP)" value={actualProfit>0?`${(actualProfit/1e6).toFixed(2)}M`:"—"} sub={`GP ${gpPct.toFixed(1)}%`} color={gpPct>=20?"green":gpPct>=10?"amber":actualProfit>0?"red":"muted"} pct={profitPct} href="/reports" />
          <KpiCard label="Activity ทั้งหมด" value={String(filtSales.length)} sub={filterLabel} color="blue" href="/sales" />
          <KpiCard label="Follow-up ค้าง" value={String(salesOverdue.length)} sub={salesOverdue.length>0?"ต้องติดตาม":"ปกติ"} color={salesOverdue.length>0?"red":"green"} alert={salesOverdue.length>0} href="/sales" />
          <KpiCard label="QT Approved" value={String(qtApproved)} sub={approvedGP>0?`GP ${(approvedGP/1000).toFixed(0)}K`:"—"} color="cyan" href="/quotations" />
        </div>
      </div>
    );

    if (id === "sales-qt-status" || id === "prj-qt-status") return (
      <Section title="📋 สถานะใบเสนอราคา" action={<Link href="/quotations" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label:"Draft",value:qtDraft,color:"text-amber-400",bg:"bg-amber-950/30 border-amber-800/40" },
            { label:"Sent / Follow-up",value:qtSent,color:"text-blue-400",bg:"bg-blue-950/30 border-blue-800/40" },
            { label:"Approved",value:qtApproved,color:"text-green-400",bg:"bg-green-950/30 border-green-800/40" },
            { label:"Rejected / Expired",value:qtRejected,color:"text-rose-400",bg:"bg-rose-950/30 border-rose-800/40" },
          ].map(s=>(
            <Link key={s.label} href="/quotations" className={`rounded-xl border p-3 text-center hover:opacity-80 transition-opacity ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
            </Link>
          ))}
        </div>
        {approvedTotal>0&&(
          <Link href="/quotations" className="block rounded-xl bg-green-950/20 border border-green-800/30 p-3 text-center hover:opacity-80">
            <p className="text-xs text-muted mb-1">มูลค่า Approved รวม</p>
            <p className="text-xl font-bold text-green-400">{(approvedTotal/1e6).toFixed(2)}M THB</p>
            <p className="text-[10px] text-muted">GP {(approvedGP/1000).toFixed(0)}K</p>
          </Link>
        )}
      </Section>
    );

    if (id === "sales-overdue") return (
      <Section title="⚠️ Follow-up ค้าง" action={<Link href="/sales" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>}>
        {salesOverdue.length===0?<p className="text-xs text-muted py-4 text-center">✅ ไม่มีงานค้าง</p>:(
          <div className="space-y-1.5">
            {salesOverdue.slice(0,8).map(a=>(
              <Link key={a.id} href="/sales" className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors">
                <div className="text-xs text-rose-400 w-20 shrink-0">{a.next_follow_up}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{a.customer_name||"—"}</p>
                  <p className="text-[10px] text-muted truncate">{a.project_name||a.description?.slice(0,40)||"—"}</p>
                </div>
                <div className="text-[10px] text-muted shrink-0">{a.assigned_to?.split(" ")[0]||"—"}</div>
              </Link>
            ))}
            {salesOverdue.length>8&&<Link href="/sales" className="block text-center text-[11px] text-accent hover:underline pt-1">+ อีก {salesOverdue.length-8} รายการ</Link>}
          </div>
        )}
      </Section>
    );

    // ── PRESALE ────────────────────────────────────────────────────────────────
    if (id === "pre-person-cards") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Presale รายบุคคล</p>
        <div className="flex gap-3 flex-wrap">
          {prWorkload.filter(p=>!p.isPool).map(p=>{
            const total = p.pending+p.progress+p.done;
            const myOverdue = presaleOverdue.filter(r=>r.assigned_to===p.fullName).length;
            return (
              <Link key={p.fullName} href="/presale"
                className="flex-1 min-w-[180px] max-w-[250px] rounded-2xl bg-card border border-border p-4 hover:border-accent/50 hover:bg-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div><p className="text-sm font-semibold">{p.name}</p><p className="text-[10px] text-muted truncate max-w-[130px]">{p.fullName}</p></div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${myOverdue>0?"bg-rose-900/50 text-rose-300":total===0?"bg-muted/10 text-muted":"bg-blue-900/50 text-blue-300"}`}>
                    {myOverdue>0?`${myOverdue} ค้าง`:total===0?"ว่าง":`${total} งาน`}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2 flex-wrap">
                    {p.pending>0&&<span className="text-[10px] rounded-full bg-amber-800/50 text-amber-200 px-2 py-0.5">รอ {p.pending}</span>}
                    {p.progress>0&&<span className="text-[10px] rounded-full bg-blue-800/50 text-blue-200 px-2 py-0.5">ทำ {p.progress}</span>}
                    {p.done>0&&<span className="text-[10px] rounded-full bg-green-900/50 text-green-300 px-2 py-0.5">เสร็จ {p.done}</span>}
                    {total===0&&<span className="text-[10px] text-muted">ยังไม่มีงาน</span>}
                  </div>
                  {total>0&&<div className="flex h-1.5 rounded-full overflow-hidden bg-background mt-1">
                    {p.pending>0&&<div className="bg-amber-500/70" style={{ width:`${p.pending/total*100}%` }}/>}
                    {p.progress>0&&<div className="bg-blue-500/70" style={{ width:`${p.progress/total*100}%` }}/>}
                    {p.done>0&&<div className="bg-green-500/70" style={{ width:`${p.done/total*100}%` }}/>}
                  </div>}
                </div>
              </Link>
            );
          })}
          {prWorkload.filter(p=>!p.isPool).length===0&&<p className="text-xs text-muted py-4">ยังไม่มีข้อมูล Presale</p>}
        </div>
      </div>
    );

    if (id === "pre-kpis") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Presale KPI (ทั้งหมด)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="งาน Presale รวม" value={String(prTotal)} sub="ทุกสถานะ" color="blue" href="/presale" />
          <KpiCard label="รอดำเนินการ" value={String(prPending)} sub="pending" color={prPending>5?"amber":"muted"} href="/presale" />
          <KpiCard label="กำลังดำเนินการ" value={String(prInProg)} sub="in progress" color="cyan" href="/presale" />
          <KpiCard label="เสร็จแล้ว" value={String(prDone)} sub="completed" color="green" href="/presale" />
          <KpiCard label="ค้าง SLA" value={String(presaleOverdue.length)} sub={presaleOverdue.length>0?"เลยกำหนด":"ปกติ"} color={presaleOverdue.length>0?"red":"green"} alert={presaleOverdue.length>0} href="/presale" />
          <KpiCard label="งานช่วงนี้" value={String(filtPresale.length)} sub={filterLabel} color="purple" href="/presale" />
        </div>
      </div>
    );

    if (id === "pre-overdue") return (
      <Section title="⚠️ งาน Presale ค้าง SLA" action={<Link href="/presale" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>}>
        {presaleOverdue.length===0?<p className="text-xs text-muted py-4 text-center">✅ ไม่มีงานค้าง</p>:(
          <div className="space-y-1.5">
            {presaleOverdue.slice(0,8).map(r=>(
              <Link key={r.id} href="/presale" className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors">
                <div className="text-xs text-rose-400 w-20 shrink-0">{r.due_date}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{r.project_name||r.customer_name||"—"}</p>
                  <p className="text-[10px] text-muted truncate">{r.type?.replace(/_/g," ")||"—"}</p>
                </div>
                <div className="text-[10px] text-muted shrink-0">{r.assigned_to?.split(" ")[0]||"—"}</div>
              </Link>
            ))}
            {presaleOverdue.length>8&&<Link href="/presale" className="block text-center text-[11px] text-accent hover:underline pt-1">+ อีก {presaleOverdue.length-8} รายการ</Link>}
          </div>
        )}
      </Section>
    );

    if (id === "pre-request-list") return (
      <Section title={`📋 งาน Presale · ${filterLabel}`} action={<Link href="/presale" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>} defaultOpen={false}>
        {filtPresale.length===0?<p className="text-xs text-muted py-4">ไม่มีข้อมูลช่วงนี้</p>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-border">
                  <th className="pb-2 font-medium">โปรเจค</th><th className="pb-2 font-medium">ลูกค้า</th>
                  <th className="pb-2 font-medium">รับผิดชอบ</th><th className="pb-2 font-medium">Due</th><th className="pb-2 font-medium text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtPresale.slice(0,10).map(r=>(
                  <tr key={r.id} className="hover:bg-card-hover">
                    <td className="py-2 text-xs truncate max-w-[180px]"><Link href="/presale" className="hover:text-accent">{r.project_name||"—"}</Link></td>
                    <td className="py-2 text-xs text-muted truncate max-w-[120px]">{r.customer_name||"—"}</td>
                    <td className="py-2 text-xs text-muted">{r.assigned_to?.split(" ")[0]||"—"}</td>
                    <td className="py-2 text-xs text-muted">{r.due_date||"—"}</td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status==="completed"?"bg-green-900/50 text-green-300":r.status==="in_progress"?"bg-blue-900/50 text-blue-300":"bg-amber-900/50 text-amber-300"}`}>
                        {r.status==="completed"?"เสร็จ":r.status==="in_progress"?"กำลังทำ":"รอ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    );

    // ── SERVICE ────────────────────────────────────────────────────────────────
    if (id === "svc-person-cards") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">ช่างรายบุคคล</p>
        <div className="flex gap-3 flex-wrap">
          {techWorkload.filter(t=>!t.isPool).map(t=>{
            const slaOk = t.total>0?Math.round(t.done/t.total*100):100;
            return (
              <Link key={t.name} href="/service"
                className="flex-1 min-w-[180px] max-w-[240px] rounded-2xl bg-card border border-border p-4 hover:border-accent/50 hover:bg-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div><p className="text-sm font-semibold">{t.name}</p><p className="text-[10px] text-muted">{t.total} งานทั้งหมด</p></div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${(t.open+t.inProg)>3?"bg-amber-900/50 text-amber-300":"bg-blue-900/50 text-blue-300"}`}>{t.open+t.inProg} active</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2 flex-wrap">
                    {t.open>0&&<span className="text-[10px] rounded-full bg-blue-800/50 text-blue-200 px-2 py-0.5">รอ {t.open}</span>}
                    {t.inProg>0&&<span className="text-[10px] rounded-full bg-amber-800/50 text-amber-200 px-2 py-0.5">ทำ {t.inProg}</span>}
                    {t.done>0&&<span className="text-[10px] rounded-full bg-green-900/50 text-green-300 px-2 py-0.5">เสร็จ {t.done}</span>}
                  </div>
                  {t.total>0&&<>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-background mt-1">
                      {t.done>0&&<div className="bg-green-500/70" style={{ width:`${t.done/t.total*100}%` }}/>}
                      {t.inProg>0&&<div className="bg-amber-500/70" style={{ width:`${t.inProg/t.total*100}%` }}/>}
                      {t.open>0&&<div className="bg-blue-500/70" style={{ width:`${t.open/t.total*100}%` }}/>}
                    </div>
                    <div className="flex justify-between text-[10px] pt-1 border-t border-border mt-2">
                      <span className="text-muted">SLA</span>
                      <span className={slaOk>=80?"text-green-400":slaOk>=60?"text-amber-400":"text-rose-400"}>{slaOk}%</span>
                    </div>
                  </>}
                </div>
              </Link>
            );
          })}
          {techWorkload.filter(t=>!t.isPool).length===0&&<p className="text-xs text-muted py-4">ยังไม่มีข้อมูลช่าง</p>}
        </div>
      </div>
    );

    if (id === "svc-kpis") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Service KPI (ทั้งหมด)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Ticket รวม" value={String(service.length)} sub="ทุกสถานะ" color="blue" href="/service" />
          <KpiCard label="เปิดอยู่" value={String(svcOpen)} sub="open" color={svcOpen>0?"amber":"muted"} href="/service" />
          <KpiCard label="กำลังดำเนินการ" value={String(svcInProg)} sub="in progress" color="cyan" href="/service" />
          <KpiCard label="เสร็จแล้ว" value={String(svcDone)} sub="resolved/closed" color="green" href="/service" />
          <KpiCard label="SLA On-time" value={`${slaOnTime}%`} sub={`${allSvcResolved}/${allSvcTotal} งาน`} color={slaOnTime>=80?"green":slaOnTime>=60?"amber":"red"} pct={slaOnTime} href="/service" />
          <KpiCard label="PM เลยกำหนด" value={String(pmOverdue.length)} sub={pmOverdue.length>0?"ต้องนัด PM":"ปกติ"} color={pmOverdue.length>0?"red":"green"} alert={pmOverdue.length>0} href="/assets/pm-schedule" />
        </div>
      </div>
    );

    if (id === "svc-overdue") return (
      <Section title="⚠️ Ticket ค้างกำหนด" action={<Link href="/service" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>}>
        {svcOverdue.length===0?<p className="text-xs text-muted py-3 text-center">✅ ไม่มี Ticket ค้าง</p>:(
          <div className="space-y-1.5">
            {svcOverdue.slice(0,6).map(t=>(
              <Link key={t.id} href="/service" className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors">
                <div className="text-xs text-rose-400 w-20 shrink-0">{t.service_date}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{t.customer_name||"—"}</p>
                  <p className="text-[10px] text-muted truncate">{t.issue?.slice(0,40)||t.type?.replace(/_/g," ")||"—"}</p>
                </div>
                <div className="text-[10px] text-muted shrink-0">{t.technician?.split(" ")[0]||"—"}</div>
              </Link>
            ))}
            {svcOverdue.length>6&&<Link href="/service" className="block text-center text-[11px] text-accent hover:underline pt-1">+ อีก {svcOverdue.length-6} รายการ</Link>}
          </div>
        )}
      </Section>
    );

    if (id === "svc-pm") return (
      <Section title="🛠️ PM Schedule" action={<Link href="/assets/pm-schedule" className="text-[11px] text-accent hover:underline">ดูตาราง →</Link>}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Link href="/assets/pm-schedule" className="rounded-xl bg-rose-950/30 border border-rose-800/40 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-rose-400">{pmOverdue.length}</p><p className="text-[10px] text-muted mt-0.5">PM เลยกำหนด</p>
          </Link>
          <Link href="/assets/pm-schedule" className="rounded-xl bg-amber-950/30 border border-amber-800/40 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-amber-400">{pmDue30.length}</p><p className="text-[10px] text-muted mt-0.5">PM ภายใน 30 วัน</p>
          </Link>
        </div>
        {pmOverdue.slice(0,4).map(a=>(
          <Link key={a.id} href="/assets/pm-schedule" className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors">
            <div className="text-xs text-rose-400 w-20 shrink-0">{a.pm_next_date}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate font-medium">{a.device_model||a.km_number}</p>
              <p className="text-[10px] text-muted truncate">{a.customer_name}</p>
            </div>
          </Link>
        ))}
      </Section>
    );

    // ── PROJECTS ───────────────────────────────────────────────────────────────
    if (id === "prj-kpis") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Projects & Pipeline Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Pipeline (มูลค่า)" value={`${(pipeline/1e6).toFixed(1)}M`} sub="THB รอปิด" color="blue" href="/projects" />
          <KpiCard label="Win Rate" value={`${convRate.toFixed(0)}%`} sub={`${wonCount}/${totalDeals} ดีล`} color={convRate>=30?"green":convRate>=15?"amber":"red"} pct={convRate} href="/projects" />
          <KpiCard label="Lead" value={String(funnelSteps.find(s=>s.name==="Lead")?.value??0)} sub="รอประเมิน" color="muted" href="/projects" />
          <KpiCard label="Proposal" value={String(funnelSteps.find(s=>s.name==="Proposal")?.value??0)} sub="กำลังเสนอ" color="amber" href="/projects" />
          <KpiCard label="QT Sent / รอผล" value={String(qtSent)} sub="ใบเสนอราคา" color="cyan" href="/quotations" />
          <KpiCard label="Contract Active" value={String(activeContracts.length)} sub={`หมดใน 30 วัน: ${expiringContracts.length}`} color={expiringContracts.length>0?"amber":"green"} href="/contracts" />
        </div>
      </div>
    );

    if (id === "prj-quarterly") return (
      <Section title={`📊 ผลงานรายไตรมาส (FY ${fyYear}/${fyEndYear})`} action={<Link href="/reports" className="text-[11px] text-accent hover:underline">รายงาน →</Link>}>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {quarterlyData.map(q=>(
            <div key={q.name} className={`rounded-xl p-2.5 text-center border ${q.isCurrent?"border-accent bg-accent/10":"border-border bg-background"}`}>
              <p className={`text-xs font-bold ${q.isCurrent?"text-accent":"text-muted"}`}>{q.name}</p>
              <p className="text-base font-bold mt-1">{q.actualK>0?`${q.actualK}K`:"—"}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${q.pct>=80?"text-green-400":q.pct>=50?"text-amber-400":q.pct>0?"text-rose-400":"text-muted"}`}>{q.pct>0?`${q.pct}%`:"—"}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={quarterlyData} margin={{ left:0,right:0,top:0,bottom:0 }}>
            <XAxis dataKey="name" tick={{ fontSize:10,fill:"#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10,fill:"#888" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip formatter={(v)=>[`${Number(v).toLocaleString()}K THB`]} contentStyle={{ background:"#1a1a2e",border:"1px solid #333",borderRadius:8,fontSize:11 }} />
            <Bar dataKey="targetK" fill="#334155" radius={[3,3,0,0]} name="เป้า" />
            <Bar dataKey="actualK" fill={C.blue} radius={[3,3,0,0]} name="จริง" />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    );

    // ── COORDINATOR ───────────────────────────────────────────────────────────
    const today2 = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const pendingJobs = jobRequests.filter(j => j.status === "pending");
    const inProgJobs  = jobRequests.filter(j => j.status === "in_progress" || j.status === "accepted");
    const svcOpenAll  = service.filter(s => s.status === "open");
    const svcInProgAll= service.filter(s => s.status === "in_progress");
    const svcResolvedAll = service.filter(s => s.status === "resolved" || s.status === "closed");
    const expiring30 = contracts.filter(c => c.end_date && c.end_date >= today2 && c.end_date <= in30);
    const expiring60 = contracts.filter(c => c.end_date && c.end_date > in30 && c.end_date <= in60);
    const expiring90 = contracts.filter(c => c.end_date && c.end_date > in60 && c.end_date <= in90);
    const PRIO_COLOR: Record<string, string> = {
      urgent: "text-rose-400",  high: "text-amber-400",
      medium: "text-blue-400",  low: "text-muted",
    };
    const PRIO_LABEL: Record<string, string> = {
      urgent: "ด่วนมาก", high: "ด่วน", medium: "ปกติ", low: "ต่ำ",
    };
    const SVC_TYPE_LABEL: Record<string, string> = {
      installation: "ติดตั้ง", site_survey: "Survey", technical_survey: "Technical",
      after_sales: "After Sale", repair: "ซ่อม", pm_service: "PM",
    };

    if (id === "coord-kpis") return (
      <Section title="ภาพรวมธุรการ">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="รับเรื่องรอดำเนินการ"  value={String(pendingJobs.length)}    color={pendingJobs.length > 0 ? "amber" : "muted"} href="/service" alert={pendingJobs.length > 0} />
          <KpiCard label="งานอยู่ระหว่างดำเนินการ" value={String(inProgJobs.length)}   color="blue"   href="/service" />
          <KpiCard label="Ticket เปิดอยู่"         value={String(svcOpenAll.length + svcInProgAll.length)} color="purple" href="/service" />
          <KpiCard label="Ticket เสร็จแล้ว"        value={String(svcResolvedAll.length)} color="green"  href="/service" />
          <KpiCard label="สัญญาใกล้หมด ≤30 วัน"   value={String(expiring30.length)}    color={expiring30.length > 0 ? "red" : "muted"} href="/contracts" alert={expiring30.length > 0} />
        </div>
      </Section>
    );

    if (id === "coord-inbox") return (
      <Section title="กล่องรับเรื่อง" action={<Link href="/service" className="text-xs text-accent hover:underline">+ เปิด Ticket ใหม่</Link>}>
        {pendingJobs.length === 0 && inProgJobs.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">ไม่มีงานค้างในระบบ</p>
        ) : (
          <div className="space-y-2">
            {[...pendingJobs, ...inProgJobs].slice(0, 10).map(j => (
              <div key={j.id} className="flex items-center gap-3 rounded-xl bg-background border border-border px-3 py-2">
                <div className={`text-[10px] font-bold w-16 shrink-0 ${PRIO_COLOR[j.priority] ?? "text-muted"}`}>
                  {PRIO_LABEL[j.priority] ?? j.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{j.title}</p>
                  <p className="text-[11px] text-muted truncate">{j.customer_name} · {j.request_to_team === "presale" ? "Presale" : "Service"}</p>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium
                  ${j.status === "pending" ? "bg-amber-900/40 text-amber-300" : "bg-blue-900/40 text-blue-300"}`}>
                  {j.status === "pending" ? "รอดำเนินการ" : "กำลังดำเนินการ"}
                </div>
                {j.due_date && (
                  <p className={`text-[10px] shrink-0 ${j.due_date < today2 ? "text-rose-400 font-bold" : "text-muted"}`}>
                    {j.due_date < today2 ? "เกิน!" : ""} {j.due_date}
                  </p>
                )}
              </div>
            ))}
            {(pendingJobs.length + inProgJobs.length) > 10 && (
              <p className="text-[11px] text-muted text-center pt-1">และอีก {(pendingJobs.length + inProgJobs.length) - 10} รายการ</p>
            )}
          </div>
        )}
      </Section>
    );

    if (id === "coord-tickets") return (
      <Section title="Ticket ทั้งหมด" action={<Link href="/service" className="text-xs text-accent hover:underline">ดูทั้งหมด →</Link>}>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-background border border-border p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{svcOpenAll.length}</p>
            <p className="text-[11px] text-muted mt-0.5">รอดำเนินการ</p>
          </div>
          <div className="rounded-xl bg-background border border-border p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{svcInProgAll.length}</p>
            <p className="text-[11px] text-muted mt-0.5">กำลังดำเนินการ</p>
          </div>
          <div className="rounded-xl bg-background border border-border p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{svcResolvedAll.length}</p>
            <p className="text-[11px] text-muted mt-0.5">เสร็จแล้ว</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {[...svcOpenAll, ...svcInProgAll].slice(0, 8).map(t => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0
                ${t.status === "open" ? "bg-blue-900/40 text-blue-300" : "bg-amber-900/40 text-amber-300"}`}>
                {t.status === "open" ? "เปิด" : "กำลังทำ"}
              </span>
              <span className="text-[10px] text-muted shrink-0">{SVC_TYPE_LABEL[t.type] ?? t.type}</span>
              <p className="text-sm flex-1 truncate">{t.issue}</p>
              <p className="text-[10px] text-muted shrink-0 truncate max-w-[100px]">{t.customer_name}</p>
              {t.technician && <p className="text-[10px] text-muted shrink-0">{t.technician.split(" ")[0]}</p>}
            </div>
          ))}
          {svcOpenAll.length + svcInProgAll.length === 0 && (
            <p className="text-sm text-muted text-center py-4">ไม่มี Ticket เปิดอยู่</p>
          )}
        </div>
      </Section>
    );

    if (id === "coord-contracts") return (
      <Section title="สัญญาใกล้หมดอายุ" action={<Link href="/contracts" className="text-xs text-accent hover:underline">ดูทั้งหมด →</Link>}>
        {expiring30.length === 0 && expiring60.length === 0 && expiring90.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">ไม่มีสัญญาที่ใกล้หมดใน 90 วัน</p>
        ) : (
          <div className="space-y-2">
            {expiring30.length > 0 && (
              <div>
                <p className="text-[10px] text-rose-400 font-semibold mb-1.5">หมดภายใน 30 วัน ({expiring30.length})</p>
                {expiring30.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-rose-950/20 border border-rose-800/30 px-3 py-1.5 mb-1">
                    <p className="text-sm flex-1 truncate font-medium">{c.customer_name}</p>
                    <p className="text-[11px] text-rose-300 shrink-0">{c.end_date}</p>
                  </div>
                ))}
              </div>
            )}
            {expiring60.length > 0 && (
              <div>
                <p className="text-[10px] text-amber-400 font-semibold mb-1.5">หมดภายใน 31–60 วัน ({expiring60.length})</p>
                {expiring60.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-amber-950/20 border border-amber-800/30 px-3 py-1.5 mb-1">
                    <p className="text-sm flex-1 truncate">{c.customer_name}</p>
                    <p className="text-[11px] text-amber-300 shrink-0">{c.end_date}</p>
                  </div>
                ))}
              </div>
            )}
            {expiring90.length > 0 && (
              <div>
                <p className="text-[10px] text-muted font-semibold mb-1.5">หมดภายใน 61–90 วัน ({expiring90.length})</p>
                {expiring90.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-1.5 mb-1">
                    <p className="text-sm flex-1 truncate">{c.customer_name}</p>
                    <p className="text-[11px] text-muted shrink-0">{c.end_date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    );

    if (id === "coord-satisfaction") {
      const last30Resolved = svcResolvedAll.filter(t => t.resolved_at && String(t.resolved_at).slice(0,10) >= new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
      const byTech: Record<string, { name: string; done: number }> = {};
      service.forEach(t => {
        if (!t.technician) return;
        const name = t.technician.split(" ")[0];
        if (!byTech[name]) byTech[name] = { name, done: 0 };
        if (t.status === "resolved" || t.status === "closed") byTech[name].done++;
      });
      const techRows = Object.values(byTech).sort((a, b) => b.done - a.done).slice(0, 6);
      return (
        <Section title="สรุปงานที่เสร็จ — 30 วันล่าสุด">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide mb-2">งานปิดในช่วง 30 วัน</p>
              <p className="text-3xl font-bold text-green-400">{last30Resolved.length}</p>
              <p className="text-[11px] text-muted mt-1">จากทั้งหมด {svcResolvedAll.length} รายการที่ปิดแล้ว</p>
              <div className="mt-3 space-y-1">
                {(["installation","repair","pm_service","after_sales"] as const).map(type => {
                  const cnt = last30Resolved.filter(t => t.type === type).length;
                  if (!cnt) return null;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <p className="text-[11px] text-muted w-24 shrink-0">{SVC_TYPE_LABEL[type]}</p>
                      <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
                        <div className="h-full rounded-full bg-green-600" style={{ width: `${(cnt/Math.max(last30Resolved.length,1))*100}%` }} />
                      </div>
                      <p className="text-[11px] text-muted w-5 text-right">{cnt}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide mb-2">ผลงานของช่าง (รวม)</p>
              <div className="space-y-1.5">
                {techRows.map(t => (
                  <div key={t.name} className="flex items-center gap-2">
                    <p className="text-sm w-20 shrink-0 font-medium">{t.name}</p>
                    <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${(t.done/Math.max(techRows[0]?.done,1))*100}%` }} />
                    </div>
                    <p className="text-[11px] text-muted w-6 text-right">{t.done}</p>
                  </div>
                ))}
                {techRows.length === 0 && <p className="text-sm text-muted">ยังไม่มีข้อมูล</p>}
              </div>
            </div>
          </div>
        </Section>
      );
    }

    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterLabel, actual, target, targetPct, actualProfit, profitPct, gpPct, pipeline,
    overdueJobs, slaOnTime, allSvcResolved, allSvcTotal, approvedProfit,
    expiringContracts.length, expiredContracts.length, salesOverdue, presaleOverdue, svcOverdue,
    quarterlyData, personData, prWorkload, techWorkload, svcPieData, funnelSteps,
    qtDraft, qtSent, qtApproved, qtRejected, approvedGP, approvedTotal,
    prTotal, prPending, prInProg, prDone, pmOverdue, pmDue30, filtPresale, filtSales, filtService,
    fyYear, fyEndYear, activeContracts.length, wonCount, totalDeals, convRate,
    topExpiring, service.length, svcOpen, svcInProg, svcDone,
    jobRequests, contracts,
  ]);

  if (!mounted) return <div className="p-6 text-muted text-sm">Loading...</div>;

  const currentLayout = layouts[view];
  const visibleWidgets = currentLayout.filter(w => w.visible);
  const hiddenWidgets = currentLayout.filter(w => !w.visible);
  const viewLabel = view==="executive"?"📊 Executive":view==="sales"?"💰 Sales":view==="presale"?"⚙️ Presale":view==="service"?"🔧 Service":view==="coordinator"?"🗂️ ธุรการ":"🔽 Projects";

  return (
    <div className="p-5 max-w-[1400px] space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {view==="executive"?"Executive Dashboard":view==="sales"?"Sales Dashboard":view==="presale"?"Presale Dashboard":view==="service"?"Service Dashboard":view==="coordinator"?"Coordinator Dashboard":"Projects Dashboard"}
          </h1>
          <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
            <span>KMITSURAT — {filterLabel}</span>
            {!loading&&(
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"/>
                </span>
                <span className="text-green-400/80">Live</span>
                {lastUpdated&&<span className="text-muted opacity-60">· {lastUpdated.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filters */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {(["today","week","month","year"] as Filter[]).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter===f?"bg-accent text-white":"text-muted hover:text-foreground"}`}>
                {f==="today"?"วันนี้":f==="week"?"สัปดาห์":f==="month"?"เดือน":"ปี"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {(["q1","q2","q3","q4"] as Filter[]).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                title={`${f.toUpperCase()} · ${qRanges[f as "q1"|"q2"|"q3"|"q4"].from.slice(0,7)} → ${qRanges[f as "q1"|"q2"|"q3"|"q4"].to.slice(0,7)}`}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter===f?"bg-purple-600 text-white":"text-muted hover:text-foreground"}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={()=>setFilter("custom")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${filter==="custom"?"bg-cyan-700 border-cyan-600 text-white":"border-border bg-card text-muted hover:text-foreground"}`}>
            กำหนดเอง
          </button>
          {/* Edit mode toggle */}
          <button onClick={()=>setEditMode(v=>!v)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${editMode?"bg-amber-700 border-amber-600 text-white":"border-border bg-card text-muted hover:text-foreground"}`}>
            {editMode?"✓ เสร็จ":"✏️ ปรับ Layout"}
          </button>
        </div>
      </div>

      {filter==="custom"&&(
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-muted">จาก</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="rounded-xl bg-card border border-border px-3 py-1.5 text-xs" />
          <label className="text-xs text-muted">ถึง</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="rounded-xl bg-card border border-border px-3 py-1.5 text-xs" />
        </div>
      )}

      {/* ── VIEW TABS ──────────────────────────────────────────────────────── */}
      {isAdmin&&(
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit flex-wrap">
          {([
            { id:"executive",   label:"📊 Executive" },
            { id:"sales",       label:"💰 Sales" },
            { id:"presale",     label:"⚙️ Presale" },
            { id:"service",     label:"🔧 Service" },
            { id:"projects",    label:"🔽 Projects" },
            { id:"coordinator", label:"🗂️ ธุรการ" },
          ] as {id:DashView;label:string}[]).map(v=>(
            <button key={v.id} onClick={()=>{ setView(v.id); setEditMode(false); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${view===v.id?"bg-accent text-white":"text-muted hover:text-foreground"}`}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      {loading&&<div className="text-center py-12 text-muted text-sm">กำลังโหลดข้อมูล...</div>}

      {!loading&&(<>

        {/* ── ALERTS BANNER (pinned, not draggable) ──────────────────────── */}
        {alerts.length>0&&(
          <div className={`rounded-2xl border p-4 ${alerts.some(a=>a.level==="red")?"border-rose-800/50 bg-rose-950/20":"border-amber-800/40 bg-amber-950/10"}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-semibold">{alerts.some(a=>a.level==="red")?"⚠️ ต้องดำเนินการด่วน":"🟡 แจ้งเตือน"}</span>
              {alerts.filter(a=>a.level==="red").length>0&&(
                <span className="rounded-full bg-rose-700 text-white text-[10px] px-2 py-0.5 font-bold">
                  {alerts.filter(a=>a.level==="red").length} เรื่องด่วน
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.map(a=><AlertRow key={a.id} {...a}/>)}
            </div>
          </div>
        )}

        {/* ── EDIT MODE TOOLBAR ──────────────────────────────────────────── */}
        {editMode&&(
          <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-amber-300">✏️ โหมดปรับ Layout — {viewLabel}</p>
                <p className="text-[11px] text-muted mt-0.5">ลากเพื่อย้าย · ½/⬛ ปรับขนาด · ✕ ซ่อน</p>
              </div>
              <button onClick={handleResetLayout}
                className="px-3 py-1.5 rounded-xl border border-amber-700/50 text-amber-300 text-xs hover:bg-amber-900/30 transition-colors">
                ↺ รีเซ็ต Default
              </button>
            </div>
            {hiddenWidgets.length>0&&(
              <div>
                <p className="text-[11px] text-muted mb-2">Widget ที่ซ่อนอยู่ — คลิกเพื่อแสดง:</p>
                <div className="flex flex-wrap gap-2">
                  {hiddenWidgets.map(w=>(
                    <button key={w.id} onClick={()=>toggleVisible(w.id)}
                      className="px-3 py-1 rounded-lg border border-border bg-card text-xs text-muted hover:text-foreground hover:border-accent/50 transition-colors">
                      + {WIDGET_LABELS[w.id]||w.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WIDGET GRID ────────────────────────────────────────────────── */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={currentLayout.map(w=>w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-5">
              {currentLayout.map(w=>(
                w.visible?(
                  <SortableWidget
                    key={w.id} id={w.id} span={w.span} editMode={editMode}
                    label={WIDGET_LABELS[w.id]||w.id}
                    onToggleVisible={()=>toggleVisible(w.id)}
                    onToggleSpan={()=>toggleSpan(w.id)}
                  >
                    {renderWidget(w.id)}
                  </SortableWidget>
                ):(
                  <div key={w.id} style={{ display:"none" }}/>
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-[10px] text-muted border-t border-border pt-3">
          <span>ข้อมูลจาก: SalesQuota · Projects · Quotations · ServiceTickets · Contracts · Assets</span>
          <span>{lastUpdated?`อัปเดตล่าสุด ${lastUpdated.toLocaleTimeString("th-TH")}`:""}</span>
        </div>

      </>)}
    </div>
  );
}
