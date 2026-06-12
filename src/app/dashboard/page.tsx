"use client";
import { useEffect, useState, useCallback, createContext, useContext, useMemo } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/UserContext";
import { isOwnRecord, isOwner, filterOwned, canSeeAll, canManageQuota } from "@/lib/ownership";
import { showHeroKpiStrip } from "@/lib/featureFlags";
import {
  DEFAULT_LAYOUTS, ALL_VIEWS, WIDGET_LABELS, getRoleDefaultView,
  loadLayout, saveLayout, resetLayout,
  type DashView, type WidgetConfig, type WidgetSpan,
} from "@/lib/dashboardLayout";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket, SalesQuota, Quotation, ServiceContract, Asset, User, JobRequest } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
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

// Context สำหรับส่ง hide callback จาก SortableWidget → Section/KpiCardWidget
const HideCtx = createContext<(() => void) | null>(null);
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
function KpiCard({ label, value, sub, color, href, pct, alert, size }: {
  label: string; value: string; sub?: string;
  color: "green" | "blue" | "purple" | "amber" | "red" | "cyan" | "muted";
  href?: string; pct?: number; alert?: boolean; size?: "sm" | "md";
}) {
  const valColor = { green: "text-emerald-500", blue: "text-blue-500", purple: "text-violet-500", amber: "text-amber-500", red: "text-orange-500", cyan: "text-sky-500", muted: "text-muted" }[color];
  const barColor = { green: "bg-emerald-500", blue: "bg-blue-500", purple: "bg-violet-500", amber: "bg-amber-500", red: "bg-orange-500", cyan: "bg-sky-500", muted: "bg-muted" }[color];
  const inner = (
    <div className={`rounded-xl bg-card border ${size === "sm" ? "p-2 sm:p-3 min-h-[72px] sm:min-h-[90px]" : "p-3 sm:p-4 min-h-[95px] sm:min-h-[110px]"} flex flex-col justify-between transition-all duration-150 ${alert ? "border-orange-600/40 border-l-2 border-l-orange-500 shadow-[0_4px_0_0_rgba(234,88,12,0.18),0_1px_4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_rgba(234,88,12,0.2),0_2px_6px_rgba(0,0,0,0.1)]" : "border-border/60 shadow-[0_4px_0_0_rgba(0,0,0,0.07),0_1px_4px_rgba(0,0,0,0.05)] hover:border-border/90 hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_rgba(0,0,0,0.09),0_2px_6px_rgba(0,0,0,0.08)]"} active:translate-y-[2px] active:shadow-none`}>
      <p className={`font-medium text-muted/60 uppercase leading-none truncate ${size === "sm" ? "text-[9px] sm:text-[10px] tracking-normal" : "text-[10px] sm:text-[11px] tracking-wider"}`}>{label}</p>
      <p className={`${size === "sm" ? "text-base sm:text-xl" : "text-xl sm:text-[1.75rem]"} font-bold tracking-tight leading-none ${valColor}`}>{value}</p>
      <div className="space-y-1">
        {pct !== undefined && (
          <div className="h-0.5 rounded-full bg-border/50 overflow-hidden">
            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
        <p className={`text-[9px] sm:text-[11px] text-muted/60 leading-snug min-h-[12px] truncate`}>{sub ?? ""}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full hover:opacity-80 transition-opacity">{inner}</Link> : inner;
}

// ── Alert Row ──────────────────────────────────────────────────────────────────
function AlertRow({ level, msg, href }: { level: "red" | "orange" | "green"; msg: string; href: string }) {
  const dot = level === "red" ? "bg-red-600" : level === "orange" ? "bg-amber-600" : "bg-green-600";
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2 text-xs hover:bg-card-hover transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-foreground/80 line-clamp-1 flex-1">{msg}</span>
      <span className="text-muted/50 shrink-0">→</span>
    </Link>
  );
}

// ── Section Shell ─────────────────────────────────────────────────────────────
function Section({ title, action, children, defaultOpen = true }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const storageKey = `dash_col_${title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)}`;
  const [open, setOpen] = useState(() => {
    try { const s = localStorage.getItem(storageKey); return s === null ? defaultOpen : s === "1"; }
    catch { return defaultOpen; }
  });
  function toggle() {
    setOpen(v => {
      const next = !v;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
      return next;
    });
  }
  const onHide = useContext(HideCtx);
  return (
    <div className="rounded-xl bg-card border border-border/70 overflow-hidden h-full">
      <div className="flex items-center px-4 py-3 border-b border-border/40 gap-2">
        <button onClick={toggle} className="flex-1 text-left min-w-0">
          <span className="text-sm font-semibold text-foreground/90">{title}</span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {action}
          {onHide && (
            <button
              onClick={e => { e.stopPropagation(); onHide(); }}
              title="ซ่อนออกจาก Dashboard (ไปที่ ⚙️ Edit เพื่อเปิดคืน)"
              className="w-5 h-5 rounded flex items-center justify-center text-[11px] text-muted/40 hover:text-orange-400 hover:bg-orange-950/30 transition-all"
            >✕</button>
          )}
          <button onClick={toggle} title={open ? "ย่อ" : "ขยาย"}
            className="text-muted/40 text-[10px] w-5 h-5 flex items-center justify-center hover:text-foreground transition-colors">
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>
      {open && <div className="p-4 pt-3">{children}</div>}
    </div>
  );
}

// KpiCardWidget — wrapper สำหรับ widget ที่ไม่ใช้ Section (KPI cards แยก)
function KpiCardWidget({ children }: { children: React.ReactNode }) {
  const onHide = useContext(HideCtx);
  return (
    <div className="relative h-full">
      {onHide && (
        <button
          onClick={e => { e.stopPropagation(); onHide(); }}
          title="ซ่อน"
          className="absolute top-2 right-2 z-10 w-5 h-5 rounded flex items-center justify-center text-[11px] text-muted/40 hover:text-orange-400 hover:bg-orange-950/30 bg-card/80 transition-all"
        >✕</button>
      )}
      {children}
    </div>
  );
}

// ── Sortable Widget Wrapper ────────────────────────────────────────────────────
function SortableWidget({ id, span, editMode, onToggleVisible, onToggleSpan, label, children }: {
  id: string; span: WidgetSpan; editMode: boolean;
  onToggleVisible: () => void; onToggleSpan: () => void;
  label: string; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const colSpanClass = span === "full" ? "col-span-6" : span === "third" ? "col-span-6 @md:col-span-2" : "col-span-6 @md:col-span-3";
  return (
    <HideCtx.Provider value={onToggleVisible}>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 50 : "auto",
        }}
        className={`group relative ${colSpanClass}`}
      >
        {editMode && (
          <div
            {...listeners} {...attributes}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-t-xl
              bg-card border border-border/60 border-b-0
              cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: "none" }}
          >
            <div className="flex items-center gap-1.5 text-accent text-[11px] font-medium min-w-0">
              <span className="text-sm leading-none shrink-0">⠿</span>
              <span className="truncate">{label}</span>
            </div>
            {span !== "third" && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={onToggleSpan}
                title={span === "full" ? "ย่อเหลือครึ่ง" : "ขยายเต็ม"}
                className="px-2 py-0.5 rounded-md bg-background/80 border border-border text-muted hover:text-foreground text-[10px] transition-colors shrink-0"
              >
                {span === "full" ? "½" : "⬛"}
              </button>
            )}
          </div>
        )}
        <div className={editMode ? "rounded-b-xl rounded-tr-xl ring-1 ring-border/60 overflow-hidden" : ""}>{children}</div>
      </div>
    </HideCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const isAdmin = ["admin", "Administrator"].includes(currentUser?.role ?? "");
  const canSeeFinanceDash = hasPermission("view_finance");

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

  // ── Role-based data scoping ─────────────────────────────────────────────────
  // Admin / Avenger เท่านั้นที่เห็นข้อมูลรวมทุกคนได้
  // isOwnRecord() รองรับ match ทั้ง name และ email (เช่น sale.bb@kmitsurat.com)
  const myName   = currentUser?.name ?? "";
  const seeAll   = canSeeAll(currentUser);   // admin / avenger only
  const sc = {
    projects: seeAll ? projects : filterOwned(projects, currentUser, "assigned_to"),
    sales:    seeAll ? sales    : filterOwned(sales,    currentUser, "assigned_to"),
    quotas:   seeAll ? quotas   : quotas.filter(q => !q.user_name || isOwnRecord({ user_name: q.user_name }, currentUser)),
    quots:    seeAll ? quots    : quots.filter(q => !q.created_by  || isOwnRecord({ created_by: q.created_by }, currentUser)),
    presale:  seeAll ? presale  : filterOwned(presale,  currentUser, "assigned_to"),
    service:  (seeAll || hasPermission("view_all_tickets"))
      ? service
      : service.filter(t => !t.technician || isOwnRecord({ technician: t.technician }, currentUser)),
  };
  // ใช้ seeAll แทน seeAllSales/seeAllService/seeAllPresale ทั้งหมด
  const seeAllSales    = seeAll;
  const seeAllService  = seeAll || hasPermission("view_all_tickets");
  const seeAllPresale  = seeAll;

  // ── Filtered slices ───────────────────────────────────────────────────────────
  const filtQuotas = (() => {
    if (filter === "year") return sc.quotas.filter(q => q.month?.startsWith(thisYear));
    if (filter === "month") return sc.quotas.filter(q => q.month === thisMonth);
    if (activeRange) return sc.quotas.filter(q => q.month && q.month >= activeRange.from.slice(0,7) && q.month <= activeRange.to.slice(0,7));
    return sc.quotas.filter(q => q.month === thisMonth);
  })();
  const filtSales = sc.sales.filter(a => inRange(a.next_follow_up));
  const filtPresale = sc.presale.filter(r => inRange(r.due_date));
  const filtService = sc.service.filter(t => inRange(t.service_date));

  // ── Live actual sales from approved quotations ────────────────────────────────
  const approvedSalesMap = useMemo(() => {
    const map: Record<string, number> = {};
    const projMap = Object.fromEntries(projects.map(p => [p.id, p]));
    quots
      .filter(qt => qt.status === "approved" || qt.po_received)
      .forEach(qt => {
        const month = (qt.po_date || qt.sent_date || thisMonth).slice(0, 7);
        const value = qt.grand_total || qt.total_selling || 0;
        const creditSet = new Set<string>();
        if (qt.salesperson) creditSet.add(qt.salesperson);
        else if (qt.created_by) creditSet.add(qt.created_by);
        const proj = qt.project_id ? projMap[qt.project_id] : null;
        if (proj?.assigned_to) creditSet.add(proj.assigned_to);
        creditSet.forEach(name => {
          const key = `${name}:${month}`;
          map[key] = (map[key] || 0) + value;
        });
      });
    return map;
  }, [quots, projects, thisMonth]);

  function liveAct(userName?: string, month?: string, stored?: number): number {
    if (!userName || !month) return stored || 0;
    return approvedSalesMap[`${userName}:${month}`] || stored || 0;
  }

  // Sum approved QTs for a user across the current filter period (ignores quota records)
  function totalLiveActForFilter(userName: string): number {
    let total = 0;
    for (const [key, val] of Object.entries(approvedSalesMap)) {
      const colonIdx = key.lastIndexOf(":");
      const name = key.slice(0, colonIdx);
      const month = key.slice(colonIdx + 1);
      if (name !== userName) continue;
      if (filter === "year") {
        if (!month.startsWith(thisYear)) continue;
      } else if (activeRange) {
        const mFrom = activeRange.from.slice(0, 7);
        const mTo = activeRange.to.slice(0, 7);
        if (month < mFrom || month > mTo) continue;
      } else {
        if (month !== thisMonth) continue;
      }
      total += val;
    }
    return total;
  }

  // ── Core KPIs ─────────────────────────────────────────────────────────────────
  const target = filtQuotas.reduce((s, q) => s + (q.quota_target || 0), 0);
  const actual = filtQuotas.reduce((s, q) => s + liveAct(q.user_name, q.month, q.actual_sales), 0);
  const targetPct = target > 0 ? (actual / target * 100) : 0;
  const profitTarget = filtQuotas.reduce((s, q) => s + (q.profit_target || 0), 0);
  const actualProfit = filtQuotas.reduce((s, q) => s + (q.actual_profit || 0), 0);

  // ── Personal monthly quota (always current month, for personal header strip) ─
  const myMonthQ = sc.quotas.filter(q => q.month === thisMonth);
  const myMonthTarget = myMonthQ.reduce((s, q) => s + (q.quota_target || 0), 0);
  const myMonthActual = myMonthQ.reduce((s, q) => s + liveAct(q.user_name, q.month, q.actual_sales), 0);
  const myMonthProfit = myMonthQ.reduce((s, q) => s + (q.actual_profit || 0), 0);
  const myMonthPct   = myMonthTarget > 0 ? Math.round(myMonthActual / myMonthTarget * 100) : 0;
  const profitPct = profitTarget > 0 ? (actualProfit / profitTarget * 100) : 0;
  const gpPct = actual > 0 ? (actualProfit / actual * 100) : 0;
  const pipeline = sc.projects.filter(p => !["won","lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  const wonCount = sc.projects.filter(p => p.status === "won").length;
  const totalDeals = sc.projects.filter(p => p.status !== "lost").length;
  const convRate = totalDeals > 0 ? (wonCount / totalDeals * 100) : 0;
  const allSvcResolved = sc.service.filter(t => ["resolved","closed"].includes(t.status)).length;
  const allSvcTotal = sc.service.length;
  const slaOnTime = allSvcTotal > 0 ? Math.round(allSvcResolved / allSvcTotal * 100) : 100;
  const approvedProfit = sc.quots.filter(q => q.status === "approved").reduce((s, q) => s + (q.gross_profit || 0), 0);

  // ── Contracts ─────────────────────────────────────────────────────────────────
  const activeContracts = contracts.filter(c => c.status === "active");
  const expiringContracts = activeContracts.filter(c => { const d = dayDiff(c.end_date); return d !== null && d >= 0 && d <= 30; });
  const expiredContracts = activeContracts.filter(c => { const d = dayDiff(c.end_date); return d !== null && d < 0; });
  const topExpiring = activeContracts.map(c => ({ c, d: dayDiff(c.end_date) ?? 9999 })).filter(x => x.d >= 0).sort((a,b) => a.d - b.d).slice(0,6);

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const salesOverdue = sc.sales.filter(a => a.next_follow_up && a.next_follow_up < today && a.status !== "done");
  const presaleOverdue = sc.presale.filter(r => r.due_date && r.due_date < today && r.status !== "completed");
  const svcOverdue = sc.service.filter(t => t.service_date && t.service_date < today && !["resolved","closed"].includes(t.status));
  type AlertItem = { id: string; msg: string; level: "red"|"orange"|"green"; href: string };
  const alerts: AlertItem[] = [];
  const myRole = currentUser?.role ?? "";
  const isAdminAvenger = ["admin","Administrator","avenger"].includes(myRole);
  // isSalesRole — เซลล์ทุกระดับ (รวม Manager) ยกเว้น admin/avenger ที่เห็นทุกอย่าง
  const isSalesRole   = ["sale","Sales Executive","Sales Manager","Branch Manager"].includes(myRole);
  const isPresaleRole = ["presale","Presales Manager","Presales Engineer","BOQ Engineer"].includes(myRole);
  const isServiceRole = ["service","Service Manager","Service Technician","Operations Coordinator"].includes(myRole);
  // Sales alerts — แสดงเสมอ (sc.sales scoped ตาม role แล้ว)
  if (salesOverdue.length > 0) alerts.push({ id:"so", msg:`Sales overdue ${salesOverdue.length} รายการ — ติดตามลูกค้าด่วน`, level:"red", href:"/sales" });
  // Presale alerts — ซ่อนจากฝ่ายขายและ service
  if (!isSalesRole && !isServiceRole && presaleOverdue.length > 0) alerts.push({ id:"po", msg:`Presale ค้าง SLA ${presaleOverdue.length} งาน`, level:"red", href:"/presale" });
  // Service alerts — ซ่อนจากฝ่ายขายและ presale
  if (!isSalesRole && !isPresaleRole && svcOverdue.length > 0) alerts.push({ id:"sv", msg:`Service ค้าง ${svcOverdue.length} งาน`, level:"orange", href:"/service" });
  // Contract/Warranty/PM alerts — เฉพาะ admin/avenger เท่านั้น
  if (isAdminAvenger) {
    const warranty30 = assets.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d >= 0 && d <= 30; });
    const warrantyExpired = assets.filter(a => { const d = dayDiff(a.warranty_end); return d !== null && d < 0; });
    if (expiredContracts.length > 0) alerts.push({ id:"ec", msg:`สัญญาหมดอายุแล้ว ${expiredContracts.length} รายการ — ต่ออายุด่วน`, level:"red", href:"/contracts" });
    if (expiringContracts.length > 0) alerts.push({ id:"rc", msg:`${expiringContracts.length} สัญญาใกล้หมดใน ≤30 วัน`, level:"orange", href:"/contracts" });
    if (warrantyExpired.length > 0) alerts.push({ id:"we", msg:`${warrantyExpired.length} อุปกรณ์หมดประกันแล้ว — ตรวจสอบ MA`, level:"red", href:"/assets" });
    if (warranty30.length > 0) alerts.push({ id:"w30", msg:`${warranty30.length} อุปกรณ์ประกันหมดใน ≤30 วัน`, level:"orange", href:"/assets" });
    const pmDue = assets.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d < 0; });
    if (pmDue.length > 0) alerts.push({ id:"pmd", msg:`${pmDue.length} อุปกรณ์ PM เลยกำหนดแล้ว — สร้าง PM Ticket`, level:"red", href:"/assets/pm-schedule" });
  }
  // Quotation draft — hide for service roles (they can't access /quotations)
  const draftQ = sc.quots.filter(q => q.status === "draft").length;
  if (!isServiceRole && draftQ > 0) alerts.push({ id:"dq", msg:`${draftQ} ใบเสนอราคา Draft รอส่ง`, level:"green", href:"/quotations" });

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
  const fyQuotas = sc.quotas.filter(q => q.month && q.month >= fyStartStr && q.month <= fyEndStr);
  const quarterlyData = ([1,2,3,4] as const).map(q => {
    const qQ = fyQuotas.filter(qt => getQuarterOf(qt.month!) === q);
    const tgt = qQ.reduce((s, x) => s + (x.quota_target||0), 0);
    const act = qQ.reduce((s, x) => s + liveAct(x.user_name, x.month, x.actual_sales), 0);
    const pft = qQ.reduce((s, x) => s + (x.actual_profit||0), 0);
    const r = qRanges[`q${q}` as "q1"|"q2"|"q3"|"q4"];
    return { name:`Q${q}`, isCurrent: r.from <= today && r.to >= today,
      targetK: Math.round(tgt/1000), actualK: Math.round(act/1000), profitK: Math.round(pft/1000),
      pct: tgt > 0 ? Math.round(act/tgt*100) : 0 };
  });

  // ── Sales Users ───────────────────────────────────────────────────────────────
  const activeUserNames = new Set(users.map(u => u.name));
  const SALES_ROLES = new Set(["sale","Sales Executive","Sales Manager","Branch Manager"]);
  const salesUsers = users.filter(u => u.active && SALES_ROLES.has(u.role));
  type PersonRow = { name:string; short:string; tgt:number; act:number; pft:number; acts:number; activeProj:number; pipVal:number; pct:number; targetK:number; actualK:number; isPool?:boolean };
  const activeSalesData: PersonRow[] = salesUsers.map(u => {
    const short = u.nickname ? u.nickname.replace(/พี่|น้อง/g,"").trim() : u.name.split(" ")[0];
    const pQ = filtQuotas.filter(q => q.user_name === u.name);
    const tgt = pQ.reduce((s,q) => s+(q.quota_target||0), 0);
    const storedAct = pQ.reduce((s,q) => s+(q.actual_sales||0), 0);
    const act = totalLiveActForFilter(u.name) || storedAct;
    const pft = pQ.reduce((s,q) => s+(q.actual_profit||0), 0);
    const acts = filtSales.filter(a => a.assigned_to === u.name).length;
    const activeProj = sc.projects.filter(pr => pr.assigned_to === u.name && !["won","lost"].includes(pr.status)).length;
    const pipVal = sc.projects.filter(pr => pr.assigned_to === u.name && !["won","lost"].includes(pr.status)).reduce((s,p)=>s+(p.value||0),0);
    return { name:u.name, short, tgt, act, pft, acts, activeProj, pipVal, pct: tgt>0?Math.round(act/tgt*100):0, targetK:Math.round(tgt/1000), actualK:Math.round(act/1000) };
  }).sort((a,b) => b.act-a.act);
  const poolSalesQ = filtQuotas.filter(q => q.user_name && !activeUserNames.has(q.user_name));
  const poolTgt = poolSalesQ.reduce((s,q)=>s+(q.quota_target||0),0), poolAct = poolSalesQ.reduce((s,q)=>s+liveAct(q.user_name,q.month,q.actual_sales),0), poolPft = poolSalesQ.reduce((s,q)=>s+(q.actual_profit||0),0);
  const poolSalesActs = filtSales.filter(a=>a.assigned_to&&!activeUserNames.has(a.assigned_to)).length;
  const poolSalesProj = sc.projects.filter(p=>p.assigned_to&&!activeUserNames.has(p.assigned_to)&&!["won","lost"].includes(p.status)).length;
  const poolRow: PersonRow|null = (poolTgt>0||poolAct>0||poolSalesActs>0||poolSalesProj>0)
    ? { name:"กองกลาง",short:"กองกลาง",tgt:poolTgt,act:poolAct,pft:poolPft,acts:poolSalesActs,activeProj:poolSalesProj,pipVal:0,pct:poolTgt>0?Math.round(poolAct/poolTgt*100):0,targetK:Math.round(poolTgt/1000),actualK:Math.round(poolAct/1000),isPool:true }
    : null;
  // ถ้า seeAllSales → แสดงทุกคน + กองกลาง  ถ้าไม่ → แสดงเฉพาะแถวของตัวเอง
  const personData: PersonRow[] = seeAllSales
    ? [...activeSalesData, ...(poolRow ? [poolRow] : [])]
    : activeSalesData.filter(p => p.name === myName || (currentUser?.email && p.name === currentUser.email));

  // ── Presale Workload ──────────────────────────────────────────────────────────
  const PRESALE_ROLES = new Set(["presale","Presale Manager","presales_manager","Avenger","Avenger Team","avenger","Presale Engineer","BOQ Engineer","Presales Manager","Presales Engineer"]);
  const presaleRoleUsers = users.filter(u => PRESALE_ROLES.has(u.role));
  const presaleAssigneeNames = new Set(sc.presale.map(r=>r.assigned_to).filter(Boolean) as string[]);
  const extraPresaleAssignees = [...presaleAssigneeNames].filter(n => !presaleRoleUsers.find(u=>u.name===n));
  const activeExtraPresale = extraPresaleAssignees.filter(n => activeUserNames.has(n));
  const exPresaleNames = extraPresaleAssignees.filter(n => !activeUserNames.has(n));
  const allPresalePeople = [...presaleRoleUsers.map(u=>u.name),...activeExtraPresale];
  const prWorkload = allPresalePeople.map(name => ({
    name: name.split(" ")[0], fullName: name, isPool: false,
    pending: sc.presale.filter(r=>r.assigned_to===name&&r.status==="pending").length,
    progress: sc.presale.filter(r=>r.assigned_to===name&&r.status==="in_progress").length,
    done: sc.presale.filter(r=>r.assigned_to===name&&r.status==="completed").length,
  })).sort((a,b)=>(b.pending+b.progress+b.done)-(a.pending+a.progress+a.done));
  const exPresaleTickets = sc.presale.filter(r=>r.assigned_to&&exPresaleNames.includes(r.assigned_to));
  if (exPresaleTickets.length > 0) prWorkload.push({ name:"กองกลาง",fullName:"กองกลาง",isPool:true, pending:exPresaleTickets.filter(r=>r.status==="pending").length, progress:exPresaleTickets.filter(r=>r.status==="in_progress").length, done:exPresaleTickets.filter(r=>r.status==="completed").length });

  // ── Service ───────────────────────────────────────────────────────────────────
  const svcOpen = sc.service.filter(t=>t.status==="open").length;
  const svcInProg = sc.service.filter(t=>t.status==="in_progress").length;
  const svcDone = sc.service.filter(t=>["resolved","closed"].includes(t.status)).length;
  const svcDelay = svcOverdue.length;
  const svcPieData = [
    { name:"เสร็จแล้ว",value:svcDone,fill:C.green },
    { name:"เกินกำหนด",value:svcDelay,fill:C.rose },
    { name:"กำลังดำเนินการ",value:svcInProg,fill:C.amber },
    { name:"รอดำเนินการ",value:svcOpen,fill:C.blue },
  ].filter(d=>d.value>0);
  const allTechNames = [...new Set(sc.service.map(t=>t.technician))].filter(Boolean) as string[];
  const activeTechNames = allTechNames.filter(n=>activeUserNames.has(n));
  const exTechNames = allTechNames.filter(n=>!activeUserNames.has(n));
  const techWorkload = [
    ...activeTechNames.map(name => {
      const mine = sc.service.filter(t=>t.technician===name);
      return { name:name.split(" ")[0], fullName:name, open:mine.filter(t=>t.status==="open").length, inProg:mine.filter(t=>t.status==="in_progress").length, done:mine.filter(t=>["resolved","closed"].includes(t.status)).length, total:mine.length, isPool:false };
    }),
    ...(exTechNames.length>0?[(() => { const pool=sc.service.filter(t=>t.technician&&exTechNames.includes(t.technician)); return { name:"กองกลาง",fullName:"กองกลาง",open:pool.filter(t=>t.status==="open").length,inProg:pool.filter(t=>t.status==="in_progress").length,done:pool.filter(t=>["resolved","closed"].includes(t.status)).length,total:pool.length,isPool:true }; })()]:[]),
  ].sort((a,b)=>(b.open+b.inProg)-(a.open+a.inProg)).slice(0,8);

  // ── Funnel ────────────────────────────────────────────────────────────────────
  const funnelSteps = [
    { name:"Lead",       value:sc.projects.filter(p=>p.status==="lead").length,        fill:C.blue },
    { name:"Opportunity",value:sc.projects.filter(p=>p.status==="opportunity").length,  fill:C.cyan },
    { name:"Proposal",   value:sc.projects.filter(p=>p.status==="proposal").length,     fill:C.amber },
    { name:"Negotiation",value:sc.projects.filter(p=>p.status==="negotiation").length,  fill:C.orange },
    { name:"Won",        value:sc.projects.filter(p=>p.status==="won").length,          fill:C.green },
  ];

  // ── Quotation stats ───────────────────────────────────────────────────────────
  const qtDraft    = sc.quots.filter(q=>q.status==="draft").length;
  const qtSent     = sc.quots.filter(q=>["sent","follow_up","revised"].includes(q.status)).length;
  const qtApproved = sc.quots.filter(q=>q.status==="approved").length;
  const qtRejected = sc.quots.filter(q=>["rejected","expired"].includes(q.status)).length;
  const approvedGP    = sc.quots.filter(q=>q.status==="approved").reduce((s,q)=>s+(q.gross_profit||0),0);
  const approvedTotal = sc.quots.filter(q=>q.status==="approved").reduce((s,q)=>s+(q.grand_total||0),0);
  const prTotal   = sc.presale.length;
  const prPending = sc.presale.filter(r=>r.status==="pending").length;
  const prInProg  = sc.presale.filter(r=>r.status==="in_progress").length;
  const prDone    = sc.presale.filter(r=>r.status==="completed").length;
  const pmOverdue = assets.filter(a=>{ const d=dayDiff(a.pm_next_date); return d!==null&&d<0; });
  const pmDue30   = assets.filter(a=>{ const d=dayDiff(a.pm_next_date); return d!==null&&d>=0&&d<=30; });
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
      const curr = prev[view].map(w => {
        if (w.id !== id) return w;
        const next: WidgetSpan = w.span === "full" ? "half" : w.span === "half" ? "third" : "full";
        return { ...w, span: next };
      });
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
    const fmtK = (k: number) => k >= 1000 ? `${(k / 1000).toFixed(1)}M` : k > 0 ? `${k}K` : "—";

    // ── EXECUTIVE KPI CARDS (แยกราย — drag/hide ได้อิสระ) ───────────────────
    if (id === "exec-kpi-revenue") return (
      <KpiCardWidget>
        <KpiCard label="รายได้รวม" value={`${(actual/1e6).toFixed(1)}M`} sub={`THB · ${filterLabel}`} color="green" href="/sales" pct={targetPct} />
      </KpiCardWidget>
    );
    if (id === "exec-kpi-target-pct") return (
      <KpiCardWidget>
        <KpiCard label="บรรลุเป้า" value={`${targetPct.toFixed(0)}%`} sub={`${(actual/1000).toFixed(0)}K / ${(target/1000).toFixed(0)}K`} color={targetPct>=80?"green":targetPct>=50?"amber":"red"} pct={targetPct} href="/reports" />
      </KpiCardWidget>
    );
    if (id === "exec-kpi-profit") return (
      <KpiCardWidget>
        <KpiCard label="กำไรรวม (GP)" value={actualProfit>0?`${(actualProfit/1e6).toFixed(2)}M`:"—"} sub={`GP ${gpPct.toFixed(1)}%`} color={gpPct>=20?"green":gpPct>=10?"amber":actualProfit>0?"red":"muted"} pct={profitPct} href="/reports" />
      </KpiCardWidget>
    );
    if (id === "exec-kpi-pipe-val") return (
      <KpiCardWidget>
        <KpiCard label="Pipeline มูลค่า" value={pipeline>0?`${(pipeline/1e6).toFixed(1)}M`:"—"} sub={`${wonCount}/${totalDeals} deals · ${convRate.toFixed(0)}%`} color="purple" href="/projects" />
      </KpiCardWidget>
    );
    if (id === "exec-kpi-overdue") return (
      <KpiCardWidget>
        <KpiCard label="งานค้างทั้งหมด" value={String(overdueJobs)} sub={`Sales ${salesOverdue.length} · Pre ${presaleOverdue.length} · Svc ${svcOverdue.length}`} color={overdueJobs>0?"red":"green"} alert={overdueJobs>0} href="/service" />
      </KpiCardWidget>
    );
    if (id === "exec-kpi-sla") return (
      <KpiCardWidget>
        <KpiCard label="SLA On-time" value={`${slaOnTime.toFixed(0)}%`} sub={`${allSvcResolved}/${allSvcTotal} tickets`} color={slaOnTime>=90?"green":slaOnTime>=70?"amber":"red"} pct={slaOnTime} href="/service" />
      </KpiCardWidget>
    );

    // ── EXECUTIVE (legacy combined KPI) ────────────────────────────────────────
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
              <p className="text-lg font-bold mt-1">{fmtK(q.actualK)}</p>
              <p className="text-[10px] text-muted">{q.targetK>0?`เป้า ${fmtK(q.targetK)}`:"ไม่มีเป้า"}</p>
              <p className={`text-[10px] font-medium mt-1 ${q.pct>=80?"text-green-500":q.pct>=50?"text-amber-500":q.pct>0?"text-red-500":"text-muted"}`}>{q.pct>0?`${q.pct}%`:"—"}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-[10px] text-muted mb-2 px-1">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-600" />เป้าหมาย</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{background:C.blue}} />ยอดจริง</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{background:C.purple}} />กำไร (GP)</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={quarterlyData} margin={{ left:0,right:0,top:0,bottom:0 }}>
            <XAxis dataKey="name" tick={{ fontSize:11,fill:"#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10,fill:"#888" }} axisLine={false} tickLine={false} width={36} tickFormatter={v => v === 0 ? "0" : fmtK(Number(v))} />
            <Tooltip formatter={(v, name)=>[fmtK(Number(v))+" THB", name==="targetK"?"เป้าหมาย":name==="actualK"?"ยอดจริง":"กำไร (GP)"]} contentStyle={{ background:"#1a1a2e",border:"1px solid #333",borderRadius:8,fontSize:11 }} />
            <Bar dataKey="targetK" fill="#334155" radius={[4,4,0,0]} name="เป้าหมาย" />
            <Bar dataKey="actualK" fill={C.blue} radius={[4,4,0,0]} name="ยอดจริง" />
            <Bar dataKey="profitK" fill={C.purple} radius={[4,4,0,0]} name="กำไร (GP)" />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    );

    if (id === "exec-pipeline" || id === "sales-funnel" || id === "prj-funnel") {
      const stageV = (st: string) => sc.projects.filter(p=>p.status===st).reduce((s,p)=>s+(p.value||0),0);
      const fmtV   = (v: number) => v>=1e6?`${(v/1e6).toFixed(1)}M`:v>0?`${Math.round(v/1000)}K`:"—";
      const pipeCards = [
        { name:"Lead",        sub:"ลีด",         cnt:funnelSteps.find(s=>s.name==="Lead")?.value??0,        val:stageV("lead"),        color:"text-blue-500",    bg:"bg-blue-500/10 border-blue-500/25"     },
        { name:"Opportunity", sub:"โอกาสขาย",    cnt:funnelSteps.find(s=>s.name==="Opportunity")?.value??0, val:stageV("opportunity"), color:"text-cyan-500",    bg:"bg-cyan-500/10 border-cyan-500/25"     },
        { name:"Proposal",    sub:"เสนอราคา",    cnt:funnelSteps.find(s=>s.name==="Proposal")?.value??0,    val:stageV("proposal"),    color:"text-amber-500",   bg:"bg-amber-500/10 border-amber-500/25"   },
        { name:"Negotiation", sub:"กำลังเจรจา",  cnt:funnelSteps.find(s=>s.name==="Negotiation")?.value??0, val:stageV("negotiation"), color:"text-orange-500",  bg:"bg-orange-500/10 border-orange-500/25" },
        { name:"Won",         sub:"ปิดดีลได้",   cnt:funnelSteps.find(s=>s.name==="Won")?.value??0,         val:stageV("won"),         color:"text-emerald-500", bg:"bg-emerald-500/10 border-emerald-500/25"},
      ];
      return (
        <Section title="Sales Pipeline" action={<Link href="/projects" className="text-[11px] text-accent hover:underline">ดูดีลทั้งหมด →</Link>}>
          <div className="space-y-1.5 mb-3">
            {pipeCards.map(s=>(
              <Link key={s.name} href="/projects" className={`flex items-center gap-3 rounded-xl border px-3 py-2 hover:opacity-80 transition-opacity ${s.bg}`}>
                <div className="w-20 shrink-0">
                  <p className={`text-[11px] font-semibold ${s.color}`}>{s.sub}</p>
                  <p className="text-[9px] text-muted/60">{s.name}</p>
                </div>
                <div className={`text-xl font-bold tabular-nums ${s.color} w-8 text-center`}>{s.cnt}</div>
                <div className="flex-1 text-right">
                  <p className={`text-[11px] font-medium ${s.color}`}>{fmtV(s.val)}</p>
                  <p className="text-[9px] text-muted/50">THB</p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/projects" className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 hover:opacity-80 transition-opacity">
            <div>
              <p className="text-[11px] text-muted/60">Win Rate</p>
              <p className="text-xl font-bold text-emerald-500">{convRate.toFixed(0)}%</p>
            </div>
            <p className="text-[11px] text-muted/60">{wonCount} / {totalDeals} ดีล</p>
          </Link>
        </Section>
      );
    }

    if (id === "exec-sales-table" || id === "sales-table") return (
      <Section title={`👥 ยอดขายรายบุคคล · ${filterLabel}`} action={<Link href="/reports" className="text-[11px] text-accent hover:underline">รายงาน →</Link>}>
        {personData.length === 0 ? <p className="text-xs text-muted py-4">ไม่มีข้อมูล</p> : (
          <div className="space-y-0 divide-y divide-border/40">
            {personData.map(p => {
              const pctColor = p.pct>=80?"text-green-500":p.pct>=50?"text-amber-500":p.pct>0?"text-red-500":"text-muted";
              const barColor = p.pct>=80?"bg-green-500":p.pct>=50?"bg-amber-500":p.pct>0?"bg-rose-500":"bg-muted/20";
              return (
                <div key={p.name} className={`py-2.5 ${p.isPool?"opacity-70":""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.isPool
                        ? <span className="text-xs text-muted">📦 กองกลาง</span>
                        : <Link href="/sales" className="text-sm font-medium hover:text-accent truncate">{p.short}</Link>}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                      {p.acts > 0 && <span className="text-[10px] text-muted">Act {p.acts}</span>}
                      {p.activeProj > 0 && <span className="text-[10px] text-blue-500">Proj {p.activeProj}</span>}
                      <span className={`text-xs font-bold w-9 text-right ${pctColor}`}>{p.tgt>0?`${p.pct}%`:"—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width:`${Math.min(p.pct,100)}%` }} />
                    </div>
                    <span className="text-[11px] text-muted tabular-nums whitespace-nowrap w-28 text-right">
                      <span className="font-semibold text-foreground/80">{fmtK(p.actualK)}</span>
                      {p.targetK>0 && <span className="text-muted/60"> / {fmtK(p.targetK)}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
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
                      {p.pending>0&&<div className="h-6 rounded bg-amber-500/15 text-amber-500 text-[10px] flex items-center justify-center px-1.5 min-w-[22px] font-semibold">{p.pending}</div>}
                      {p.progress>0&&<div className="h-6 rounded bg-blue-500/15 text-blue-500 text-[10px] flex items-center justify-center px-1.5 min-w-[22px] font-semibold">{p.progress}</div>}
                      {p.done>0&&<div className="h-6 rounded bg-green-500/15 text-green-500 text-[10px] flex items-center justify-center px-1.5 min-w-[22px] font-semibold">{p.done}</div>}
                    </>)}
                  </div>
                  <div className="text-[10px] text-muted w-10 text-right">{total>0?`${total} งาน`:"—"}</div>
                </Link>
              );
            })}
            <div className="flex gap-3 mt-2 text-[10px] text-muted">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/50 inline-block"/>รอ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/50 inline-block"/>กำลังทำ</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500/50 inline-block"/>เสร็จ</span>
            </div>
          </div>
        )}
      </Section>
    );

    if (id === "exec-service" || id === "svc-status") return (
      <Section title="🔧 Service Status" action={<Link href="/service" className="text-[11px] text-accent hover:underline">ดูงาน →</Link>}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Link href="/service" className="rounded-xl bg-green-500/10 border border-green-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-green-500">{svcDone}</p>
            <p className="text-[10px] text-muted/70 mt-0.5">เสร็จแล้ว</p>
          </Link>
          <Link href="/service" className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-rose-500">{svcDelay}</p>
            <p className="text-[10px] text-muted/70 mt-0.5">เกินกำหนด</p>
          </Link>
          <Link href="/service" className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-amber-500">{svcInProg}</p>
            <p className="text-[10px] text-muted/70 mt-0.5">กำลังดำเนินการ</p>
          </Link>
          <Link href="/service" className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-blue-500">{svcOpen}</p>
            <p className="text-[10px] text-muted/70 mt-0.5">รอดำเนินการ</p>
          </Link>
        </div>
        {techWorkload.length>0&&(
          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-muted mb-2">ช่างรายคน</p>
            <div className="space-y-2">
              {techWorkload.slice(0,6).map(t=>(
                <Link key={t.name} href="/service" className={`flex items-center gap-2 hover:opacity-80 ${t.isPool?"border-t border-dashed border-border pt-2 mt-1":""}`}>
                  <div className="w-14 text-xs truncate shrink-0">{t.isPool?<span className="text-muted/60">📦</span>:<span className="text-muted">{t.name}</span>}</div>
                  <div className="flex-1 flex gap-0.5 h-5">
                    {t.done>0&&<div className="h-full rounded-sm bg-green-500/20 text-[10px] text-green-500 flex items-center justify-center px-1 min-w-[18px] font-semibold" style={{ width:`${t.done/maxTechTotal*100}%` }}>{t.done}</div>}
                    {t.inProg>0&&<div className="h-full rounded-sm bg-amber-500/20 text-[10px] text-amber-500 flex items-center justify-center px-1 min-w-[18px] font-semibold" style={{ width:`${t.inProg/maxTechTotal*100}%` }}>{t.inProg}</div>}
                    {t.open>0&&<div className="h-full rounded-sm bg-blue-500/20 text-[10px] text-blue-500 flex items-center justify-center px-1 min-w-[18px] font-semibold" style={{ width:`${t.open/maxTechTotal*100}%` }}>{t.open}</div>}
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
          <Link href="/contracts" className="rounded-xl bg-orange-500/10 border border-orange-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-orange-500">{expiringContracts.length}</p>
            <p className="text-[10px] text-muted/70 mt-0.5">หมดใน ≤30 วัน</p>
          </Link>
          <Link href="/contracts" className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-amber-500">{expiredContracts.length}</p>
            <p className="text-[10px] text-muted mt-0.5">หมดอายุแล้ว</p>
          </Link>
        </div>
        {topExpiring.length>0?(
          <div className="space-y-2">
            {topExpiring.slice(0,5).map(({c,d})=>(
              <Link key={c.id} href="/contracts" className="flex items-center gap-2 hover:opacity-80">
                <div className={`text-xs font-bold w-9 text-center rounded px-1 py-0.5 border ${d<=7?"bg-red-500/10 border-red-500/25 text-red-500":d<=30?"bg-amber-500/10 border-amber-500/25 text-amber-500":"border-border/40 bg-background text-muted"}`}>{d}d</div>
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

    // ── SALES TEAM PLANS ──────────────────────────────────────────────────────
    if (id === "sales-team-plans") {
      const canSeeTeam = seeAll || canManageQuota(currentUser);
      const salesRoles = ["sale","Sales Executive","Sales Manager","Branch Manager"];
      const salesTeam = users.filter(u => u.active && salesRoles.includes(u.role));
      const allPlans  = sales.filter(a => a.is_plan);
      const todayStr  = today;

      if (!canSeeTeam) {
        // เซลล์ทั่วไป — แสดงแผนของตัวเองเดือนนี้
        const myPlans = allPlans.filter(a => a.assigned_to === myName);
        const done    = myPlans.filter(p => p.status === "done").length;
        const overdue = myPlans.filter(p => (p.plan_date||"") < todayStr && p.status !== "done").length;
        const pct     = myPlans.length > 0 ? Math.round(done / myPlans.length * 100) : 0;
        return (
          <Section title="📋 แผนงานของฉัน" action={<Link href="/sales?tab=workplan" className="text-[11px] text-accent hover:underline">ดูปฏิทิน →</Link>}>
            <div className="flex items-center gap-6 py-2">
              <div className="text-center"><p className="text-2xl font-bold">{myPlans.length}</p><p className="text-[11px] text-muted">ทั้งหมด</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-green-500">{done}</p><p className="text-[11px] text-muted">เสร็จแล้ว</p></div>
              {overdue > 0 && <div className="text-center"><p className="text-2xl font-bold text-red-500">{overdue}</p><p className="text-[11px] text-muted">เกินกำหนด</p></div>}
              <div className="flex-1 max-w-[200px]">
                <div className="flex justify-between text-[10px] text-muted mb-1"><span>ความคืบหน้า</span><span>{pct}%</span></div>
                <div className="h-2 rounded-full bg-border/40 overflow-hidden"><div className="h-full rounded-full bg-green-500 transition-all" style={{width:`${pct}%`}}/></div>
              </div>
            </div>
          </Section>
        );
      }

      // Manager/Admin — weekly grid + summary
      const nowLocal = new Date();
      const localToday = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,"0")}-${String(nowLocal.getDate()).padStart(2,"0")}`;
      const dowNow = nowLocal.getDay();
      const monOffset = dowNow === 0 ? -6 : 1 - dowNow;
      const weekDates = Array.from({length: 7}, (_, i) => {
        const d = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate() + monOffset + i);
        const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        return { str, day: d.getDate(), isSat: d.getDay()===6, isSun: d.getDay()===0, isToday: str===localToday };
      });
      const dhShort = ["จ","อ","พ","พฤ","ศ","ส","อา"];

      const rows = salesTeam.map(u => {
        const uPlans   = allPlans.filter(p => p.assigned_to === u.name);
        const uDone    = uPlans.filter(p => p.status === "done").length;
        const uIP      = uPlans.filter(p => p.status === "in_progress").length;
        const uOverdue = uPlans.filter(p => (p.plan_date||"") < localToday && p.status !== "done").length;
        const pct      = uPlans.length > 0 ? Math.round(uDone / uPlans.length * 100) : 0;
        const weekCells = weekDates.map(wd => {
          const dp = uPlans.filter(p => p.plan_date === wd.str);
          return { count: dp.length, done: dp.filter(p=>p.status==="done").length, ip: dp.filter(p=>p.status==="in_progress").length };
        });
        return { u, total: uPlans.length, done: uDone, ip: uIP, overdue: uOverdue, pct, weekCells };
      }).sort((a, b) => b.total - a.total);

      return (
        <Section title="📋 แผนงานทีมขาย — ภาพรวมรายคน" action={<Link href="/sales?tab=workplan" className="text-[11px] text-accent hover:underline">ดูปฏิทิน →</Link>}>
          {rows.length === 0 ? <p className="text-xs text-muted py-4">ยังไม่มีแผนงาน</p> : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-[10px] text-muted font-medium w-20">เซลล์</th>
                      {weekDates.map((wd, i) => (
                        <th key={wd.str} className={`pb-1 text-center w-9 text-[10px] font-medium ${wd.isToday?"text-accent":wd.isSat?"text-orange-500":wd.isSun?"text-rose-500":"text-muted"}`}>
                          <div>{dhShort[i]}</div>
                          <div className={`text-[11px] leading-tight ${wd.isToday?"bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto":""}`}>{wd.day}</div>
                        </th>
                      ))}
                      <th className="pb-2 text-center text-[10px] text-muted font-medium px-1">รวม</th>
                      <th className="pb-2 text-center text-[10px] text-muted font-medium px-1">เสร็จ</th>
                      <th className="pb-2 text-center text-[10px] text-muted font-medium px-1">ค้าง</th>
                      <th className="pb-2 text-[10px] text-muted font-medium min-w-[70px] pl-2">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {rows.map(({ u, total, done, overdue, pct, weekCells }) => (
                      <tr key={u.id} className="hover:bg-card-hover transition-colors">
                        <td className="py-2 font-medium text-xs">
                          <Link href="/sales?tab=workplan" className="hover:text-accent transition-colors">
                            {u.nickname || u.first_name || u.name}
                          </Link>
                        </td>
                        {weekCells.map((cell, ci) => {
                          const wd = weekDates[ci];
                          const allDone = cell.count > 0 && cell.done === cell.count;
                          const partial = cell.count > 0 && cell.done > 0 && cell.done < cell.count;
                          const inProg  = cell.count > 0 && cell.done === 0 && cell.ip > 0;
                          const pending = cell.count > 0 && cell.done === 0 && cell.ip === 0;
                          const color = allDone ? "bg-green-500/20 border-green-500/50 text-green-500"
                                      : partial  ? "bg-amber-500/20 border-amber-500/50 text-amber-500"
                                      : inProg   ? "bg-blue-500/20 border-blue-500/50 text-blue-500"
                                      : pending  ? "bg-slate-400/15 border-slate-400/40 text-slate-400"
                                      : "";
                          return (
                            <td key={wd.str} className={`py-2 text-center ${wd.isToday ? "bg-accent/5" : ""}`}>
                              {cell.count > 0
                                ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-[10px] font-bold ${color}`}>{cell.count}</span>
                                : <span className="text-[10px] text-muted/40">—</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 text-center font-bold text-xs px-1">{total||"—"}</td>
                        <td className="py-2 text-center text-green-500 font-medium text-xs px-1">{done||"—"}</td>
                        <td className="py-2 text-center text-xs px-1">
                          <span className={overdue>0?"text-red-500 font-bold":"text-muted"}>{overdue||"—"}</span>
                        </td>
                        <td className="py-2 pl-2">
                          {total > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden min-w-[36px]">
                                <div className="h-full rounded-full bg-green-500" style={{width:`${pct}%`}}/>
                              </div>
                              <span className="text-[10px] text-muted tabular-nums">{pct}%</span>
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] text-muted border-t border-border/40 pt-2">
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full border bg-green-500/20 border-green-500/50 inline-block"/> เสร็จทั้งหมด</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full border bg-amber-500/20 border-amber-500/50 inline-block"/> เสร็จบางส่วน</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full border bg-blue-500/20 border-blue-500/50 inline-block"/> กำลังทำ</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full border bg-slate-400/15 border-slate-400/40 inline-block"/> ยังไม่เริ่ม</span>
                <span className="flex items-center gap-1"><span className="text-muted/40 mr-0.5">—</span> ไม่มีแผน</span>
              </div>
            </div>
          )}
        </Section>
      );
    }

    // ── SALES MANAGER KPI STRIP ───────────────────────────────────────────────
    if (id === "sales-manager-kpis") {
      const mgMonthQ  = sc.quotas.filter(q => q.month === thisMonth);
      const mgTarget  = mgMonthQ.reduce((s,q) => s+(q.quota_target||0), 0);
      const mgActual  = mgMonthQ.reduce((s,q) => s+liveAct(q.user_name, q.month, q.actual_sales), 0);
      const mgPct     = mgTarget > 0 ? Math.round(mgActual/mgTarget*100) : 0;
      const mgActM    = mgActual >= 1e6 ? `${(mgActual/1e6).toFixed(2)}M` : mgActual > 0 ? `${Math.round(mgActual/1000)}K` : "—";
      const mgTgtM    = mgTarget >= 1e6 ? `${(mgTarget/1e6).toFixed(1)}M` : mgTarget > 0 ? `${Math.round(mgTarget/1000)}K` : "—";
      const monthName = new Date(parseInt(thisMonth.slice(0,4)), parseInt(thisMonth.slice(5,7))-1).toLocaleDateString("th-TH",{month:"long",year:"numeric"});
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="ยอดขายเดือนนี้" value={mgActM} sub={monthName} color="green" href="/reports" pct={mgPct} />
          <KpiCard label="Achievement %" value={mgTarget>0?`${mgPct}%`:"—"} sub={`${Math.round(mgActual/1000)}K / ${mgTgtM}`} color={mgPct>=80?"green":mgPct>=50?"amber":"red"} pct={mgPct} href="/reports" />
          <KpiCard label="Pipeline รวม" value={pipeline>0?`${(pipeline/1e6).toFixed(1)}M`:"—"} sub={`${totalDeals} ดีล · Win ${convRate.toFixed(0)}%`} color="purple" href="/projects" />
          <KpiCard label="Follow-up ค้าง" value={String(salesOverdue.length)} sub={salesOverdue.length>0?"ต้องติดตามด่วน":"ทุกงานปกติ"} color={salesOverdue.length>0?"red":"green"} alert={salesOverdue.length>0} href="/sales" />
        </div>
      );
    }

    // ── TOP DEALS ──────────────────────────────────────────────────────────────
    if (id === "sales-top-deals") {
      const stageLabel: Record<string,string> = { lead:"Lead",opportunity:"Opportunity",proposal:"Proposal",negotiation:"Negotiation",won:"Won" };
      const stageCl: Record<string,string>    = { lead:"text-blue-500",opportunity:"text-cyan-500",proposal:"text-amber-500",negotiation:"text-orange-500",won:"text-emerald-500" };
      const topDeals = sc.projects
        .filter(p => !["won","lost"].includes(p.status) && (p.value||0) > 0)
        .sort((a,b) => (b.value||0)-(a.value||0))
        .slice(0,10);
      const fmtVal = (v:number) => v>=1e6?`${(v/1e6).toFixed(1)}M`:`${Math.round(v/1000)}K`;
      return (
        <Section title="🏆 Top Deals" action={<Link href="/projects" className="text-[11px] text-accent hover:underline">ดูดีลทั้งหมด →</Link>}>
          {topDeals.length===0 ? <p className="text-xs text-muted py-4 text-center">ยังไม่มีดีล</p> : (
            <div className="space-y-1">
              {topDeals.map((p,idx) => (
                <Link key={p.id} href="/projects" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 hover:bg-card-hover transition-colors group">
                  <span className="text-[10px] text-muted/40 w-4 tabular-nums">{idx+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-accent transition-colors">{p.customer_name||p.name}</p>
                    <p className="text-[10px] text-muted/60 truncate">{p.name}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs font-bold text-green-500">{fmtVal(p.value||0)}</p>
                    <p className={`text-[10px] font-medium ${stageCl[p.status]||"text-muted"}`}>{stageLabel[p.status]||p.status}</p>
                  </div>
                  {seeAll && <div className="text-[10px] text-muted/60 shrink-0 w-14 text-right truncate">{p.assigned_to?.split(" ")[0]||"—"}</div>}
                  <div className="text-[10px] text-muted/50 shrink-0 w-16 text-right">{p.next_action_date||p.expected_close_date||"—"}</div>
                </Link>
              ))}
            </div>
          )}
        </Section>
      );
    }

    // ── SALES ─────────────────────────────────────────────────────────────────
    if (id === "sales-person-cards") {
      // แสดงเฉพาะ role ระดับ field sales (sale / Sales Executive)
      // Manager และ Avenger ไม่แสดงในตาราง แต่ยังเห็นข้อมูลทีมได้ตามปกติ
      const fieldSalesRoles = new Set(["sale","Sales Executive"]);
      const myCards = personData.filter(p => {
        if (p.isPool) return false;
        const u = users.find(uu => uu.name === p.name);
        return u ? fieldSalesRoles.has(u.role) : false;
      });
      // Personal card — show only when non-admin sales user sees their own row
      if (!seeAll) {
        const p = myCards[0];
        if (!p) return <p className="text-xs text-muted py-4">ยังไม่มีข้อมูล</p>;
        const myOverdue = salesOverdue.filter(a=>a.assigned_to===p.name).length;
        const profitK = Math.round(p.pft/1000);
        const gpPctMe = p.act>0?Math.round(p.pft/p.act*100):0;
        const pctColor = p.pct>=80?"text-emerald-500":p.pct>=50?"text-amber-500":p.tgt>0?"text-orange-500":"text-muted";
        const barColor = p.pct>=80?"bg-emerald-500":p.pct>=50?"bg-amber-500":"bg-orange-500";
        const gpColor  = gpPctMe>=20?"text-emerald-500":gpPctMe>=10?"text-amber-500":profitK>0?"text-foreground/70":"text-muted";
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Achievement */}
              <div className="rounded-xl bg-background border border-border/60 p-4 flex flex-col justify-between min-h-[110px]">
                <p className="text-[11px] text-muted/60 truncate leading-tight">Achievement</p>
                <p className={`text-xl font-bold leading-none ${pctColor}`}>{p.tgt>0?`${p.pct}%`:"—"}</p>
                <div className="space-y-1 overflow-hidden">
                  {p.tgt>0&&<div className="h-0.5 rounded-full bg-border/50 overflow-hidden"><div className={`h-full ${barColor}`} style={{width:`${Math.min(p.pct,100)}%`}}/></div>}
                  <p className="text-[10px] text-muted/50 truncate">{p.actualK>0?`${p.actualK.toLocaleString()}K`:"-"} / {p.targetK>0?`${p.targetK.toLocaleString()}K`:"-"}</p>
                </div>
              </div>
              {/* ยอดขาย */}
              <Link href="/sales" className="rounded-xl bg-background border border-border/60 p-4 flex flex-col justify-between min-h-[110px] hover:border-border/90 transition-colors">
                <p className="text-[11px] text-muted/60 truncate leading-tight">ยอดขาย</p>
                <p className="text-xl font-bold leading-none text-emerald-500">{p.actualK>0?`${p.actualK.toLocaleString()}K`:"—"}</p>
                <p className="text-[10px] text-muted/50 truncate">THB · {filterLabel}</p>
              </Link>
              {/* GP */}
              <Link href="/reports" className="rounded-xl bg-background border border-border/60 p-4 flex flex-col justify-between min-h-[110px] hover:border-border/90 transition-colors">
                <p className="text-[11px] text-muted/60 truncate leading-tight">กำไร GP</p>
                <p className={`text-xl font-bold leading-none ${gpColor}`}>{profitK>0?`${profitK.toLocaleString()}K`:"—"}</p>
                <p className="text-[10px] text-muted/50 truncate">{gpPctMe>0?`${gpPctMe}% margin`:"ยังไม่มีข้อมูล"}</p>
              </Link>
              {/* Follow-up ค้าง */}
              <Link href="/sales" className={`rounded-xl border p-4 flex flex-col justify-between min-h-[110px] transition-colors ${myOverdue>0?"bg-orange-950/10 border-orange-600/30 hover:border-orange-500/50":"bg-background border-border/60 hover:border-border/90"}`}>
                <p className="text-[11px] text-muted/60 truncate leading-tight">Follow-up</p>
                <p className={`text-xl font-bold leading-none ${myOverdue>0?"text-orange-500":"text-muted"}`}>{myOverdue}</p>
                <p className="text-[10px] text-muted/50 truncate">{myOverdue>0?"งานต้องติดตาม":"ทุกงานปกติ"}</p>
              </Link>
            </div>
            {/* Activity row */}
            <div className="flex items-center gap-5 px-1 pt-1 border-t border-border/30">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">{p.acts}</span>
                <span className="text-[11px] text-muted/60">Activity</span>
              </div>
              <div className="w-px h-3 bg-border/40"/>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">{p.activeProj}</span>
                <span className="text-[11px] text-muted/60">โปรเจค active</span>
              </div>
              <span className="ml-auto text-[11px] text-muted/40">{p.short||p.name} · {filterLabel}</span>
            </div>
          </div>
        );
      }
      // Admin / seeAll: team cards view
      return (
        <div>
          <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Sales รายบุคคล · {filterLabel}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {myCards.map(p=>{
              const myOverdue = salesOverdue.filter(a=>a.assigned_to===p.name).length;
              const pipM = p.pipVal>=1e6?`${(p.pipVal/1e6).toFixed(1)}M`:p.pipVal>0?`${Math.round(p.pipVal/1000)}K`:"—";
              return (
                <Link key={p.name} href="/sales"
                  className="rounded-2xl bg-card border border-border p-3 hover:border-accent/50 hover:bg-card-hover transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.short}</p>
                      <p className="text-[10px] text-muted truncate">{p.name}</p>
                    </div>
                    <div className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ml-1 ${p.pct>=80?"bg-green-500/10 border-green-500/25 text-green-500":p.pct>=50?"bg-amber-500/10 border-amber-500/25 text-amber-500":p.tgt>0?"bg-red-500/10 border-red-500/25 text-red-500":"border-border/40 bg-muted/10 text-muted"}`}>
                      {p.tgt>0?`${p.pct}%`:"—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]"><span className="text-muted">ยอดขาย</span><span className="font-semibold text-green-500">{p.actualK>0?`${p.actualK.toLocaleString()}K`:"—"}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted">เป้า</span><span className="text-muted">{p.targetK>0?`${p.targetK.toLocaleString()}K`:"—"}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted">Pipeline</span><span className="text-purple-500 font-medium">{pipM}</span></div>
                    {p.tgt>0&&<div className="h-1 rounded-full bg-background overflow-hidden mt-1"><div className={`h-full rounded-full ${p.pct>=80?"bg-green-500":p.pct>=50?"bg-amber-500":"bg-rose-500"}`} style={{ width:`${Math.min(p.pct,100)}%` }}/></div>}
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                    <div className="text-center flex-1"><p className="text-xs font-bold">{p.activeProj}</p><p className="text-[9px] text-muted">ดีล</p></div>
                    <div className="w-px bg-border/40"/>
                    <div className="text-center flex-1"><p className={`text-xs font-bold ${myOverdue>0?"text-red-500":""}`}>{myOverdue}</p><p className="text-[9px] text-muted">ค้าง</p></div>
                    <div className="w-px bg-border/40"/>
                    <div className="text-center flex-1"><p className="text-xs font-bold">{p.acts}</p><p className="text-[9px] text-muted">Act</p></div>
                  </div>
                </Link>
              );
            })}
            {myCards.length===0&&<p className="text-xs text-muted py-4 col-span-full">ยังไม่มีข้อมูล Sales</p>}
          </div>
        </div>
      );
    }

    if (id === "sales-kpis") return (
      <div>
        <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">Sales KPI · {filterLabel}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {seeAll && <KpiCard label="ยอดขายรวม" value={`${(actual/1e6).toFixed(1)}M`} sub="THB" color="green" href="/sales" />}
          {seeAll && <KpiCard label="บรรลุเป้า" value={`${targetPct.toFixed(0)}%`} sub={`${(actual/1000).toFixed(0)}K / ${(target/1000).toFixed(0)}K`} color={targetPct>=80?"green":targetPct>=50?"amber":"red"} pct={targetPct} href="/reports" />}
          {seeAll && <KpiCard label="กำไรรวม (GP)" value={actualProfit>0?`${(actualProfit/1e6).toFixed(2)}M`:"—"} sub={`GP ${gpPct.toFixed(1)}%`} color={gpPct>=20?"green":gpPct>=10?"amber":actualProfit>0?"red":"muted"} pct={profitPct} href="/reports" />}
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
            { label:"Draft", sub:"ร่าง", value:qtDraft,color:"text-amber-500",bg:"bg-amber-500/10 border-amber-500/25" },
            { label:"Sent / Follow-up", sub:"ส่งแล้ว / ติดตาม", value:qtSent,color:"text-blue-500",bg:"bg-blue-500/10 border-blue-500/25" },
            { label:"Approved", sub:"อนุมัติแล้ว", value:qtApproved,color:"text-emerald-500",bg:"bg-emerald-500/10 border-emerald-500/25" },
            { label:"Rejected / Expired", sub:"ปฏิเสธ / หมดอายุ", value:qtRejected,color:"text-orange-500",bg:"bg-orange-500/10 border-orange-500/25" },
          ].map(s=>(
            <Link key={s.label} href="/quotations" className={`rounded-xl border p-3 text-center hover:opacity-80 transition-opacity ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] font-medium mt-0.5">{s.sub}</p>
              <p className="text-[10px] text-muted/50">{s.label}</p>
            </Link>
          ))}
        </div>
        {approvedTotal>0&&(
          <Link href="/quotations" className="block rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-center hover:opacity-80">
            <p className="text-xs text-muted/60 mb-1">มูลค่า Approved รวม</p>
            <p className="text-xl font-bold text-emerald-500">{(approvedTotal/1e6).toFixed(2)}M THB</p>
            <p className="text-[10px] text-muted/60">GP {(approvedGP/1000).toFixed(0)}K</p>
          </Link>
        )}
      </Section>
    );

    if (id === "sales-overdue") return (
      <Section title="Follow-up ค้าง" action={<Link href="/sales" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>}>
        {salesOverdue.length===0?(
          <p className="text-xs text-muted/60 py-3 text-center">ไม่มีงานค้าง</p>
        ):(
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5">
            {salesOverdue.slice(0,8).map(a=>(
              <Link key={a.id} href="/sales" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 hover:bg-card-hover transition-colors">
                <div className="text-xs text-orange-500 w-[88px] shrink-0 font-mono">{a.next_follow_up}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{a.customer_name||"—"}</p>
                  <p className="text-[10px] text-muted/60 truncate">{a.project_name||a.description?.slice(0,40)||"—"}</p>
                </div>
                {!seeAll ? null : <div className="text-[10px] text-muted/50 shrink-0">{a.assigned_to?.split(" ")[0]||"—"}</div>}
              </Link>
            ))}
          </div>
        )}
        {salesOverdue.length>8&&<Link href="/sales" className="block text-center text-[11px] text-accent hover:underline pt-2">+ อีก {salesOverdue.length-8} รายการ</Link>}
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
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${myOverdue>0?"bg-red-500/10 border-red-500/25 text-red-500":total===0?"border-border/40 bg-muted/10 text-muted":"bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>
                    {myOverdue>0?`${myOverdue} ค้าง`:total===0?"ว่าง":`${total} งาน`}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2 flex-wrap">
                    {p.pending>0&&<span className="text-[10px] rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 px-2 py-0.5">รอ {p.pending}</span>}
                    {p.progress>0&&<span className="text-[10px] rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 px-2 py-0.5">ทำ {p.progress}</span>}
                    {p.done>0&&<span className="text-[10px] rounded-full bg-green-500/10 border border-green-500/25 text-green-500 px-2 py-0.5">เสร็จ {p.done}</span>}
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
                <div className="text-xs text-orange-500 w-20 shrink-0 font-mono">{r.due_date}</div>
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${r.status==="completed"?"bg-green-500/10 border-green-500/25 text-green-500":r.status==="in_progress"?"bg-blue-500/10 border-blue-500/25 text-blue-500":"bg-amber-500/10 border-amber-500/25 text-amber-500"}`}>
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
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${(t.open+t.inProg)>3?"bg-amber-500/10 border-amber-500/25 text-amber-500":"bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>{t.open+t.inProg} active</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2 flex-wrap">
                    {t.open>0&&<span className="text-[10px] rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 px-2 py-0.5">รอ {t.open}</span>}
                    {t.inProg>0&&<span className="text-[10px] rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 px-2 py-0.5">ทำ {t.inProg}</span>}
                    {t.done>0&&<span className="text-[10px] rounded-full bg-green-500/10 border border-green-500/25 text-green-500 px-2 py-0.5">เสร็จ {t.done}</span>}
                  </div>
                  {t.total>0&&<>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-background mt-1">
                      {t.done>0&&<div className="bg-green-500/70" style={{ width:`${t.done/t.total*100}%` }}/>}
                      {t.inProg>0&&<div className="bg-amber-500/70" style={{ width:`${t.inProg/t.total*100}%` }}/>}
                      {t.open>0&&<div className="bg-blue-500/70" style={{ width:`${t.open/t.total*100}%` }}/>}
                    </div>
                    <div className="flex justify-between text-[10px] pt-1 border-t border-border mt-2">
                      <span className="text-muted">SLA</span>
                      <span className={slaOk>=80?"text-green-500":slaOk>=60?"text-amber-500":"text-red-500"}>{slaOk}%</span>
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
          <KpiCard label="Ticket รวม" value={String(allSvcTotal)} sub="ทุกสถานะ" color="blue" href="/service" />
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
                <div className="text-xs text-orange-500 w-20 shrink-0 font-mono">{t.service_date}</div>
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
          <Link href="/assets/pm-schedule" className="rounded-xl bg-orange-500/10 border border-orange-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-orange-500">{pmOverdue.length}</p><p className="text-[10px] text-muted/70 mt-0.5">PM เลยกำหนด</p>
          </Link>
          <Link href="/assets/pm-schedule" className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-center hover:opacity-80">
            <p className="text-2xl font-bold text-amber-500">{pmDue30.length}</p><p className="text-[10px] text-muted/60 mt-0.5">PM ภายใน 30 วัน</p>
          </Link>
        </div>
        {pmOverdue.slice(0,4).map(a=>(
          <Link key={a.id} href="/assets/pm-schedule" className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors">
            <div className="text-xs text-orange-500 w-20 shrink-0 font-mono">{a.pm_next_date}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate font-medium">{a.device_model||a.km_number}</p>
              <p className="text-[10px] text-muted truncate">{a.customer_name}</p>
            </div>
          </Link>
        ))}
      </Section>
    );

    if (id === "svc-workload") {
      const TYPE_LABEL: Record<string, string> = { repair:"ซ่อม", after_sales:"After Sales", pm_service:"PM", installation:"ติดตั้ง", site_survey:"Survey", technical_survey:"Tech Survey" };
      const STATUS_STYLE: Record<string, string> = { open:"bg-blue-500/10 border border-blue-500/25 text-blue-500", in_progress:"bg-amber-500/10 border border-amber-500/25 text-amber-500", resolved:"bg-green-500/10 border border-green-500/25 text-green-500", closed:"bg-neutral-500/10 border border-neutral-500/20 text-neutral-400" };
      const STATUS_TH: Record<string, string> = { open:"รอ", in_progress:"ทำ", resolved:"เสร็จ", closed:"ปิด" };
      const elapsedDays = (t: ServiceTicket) => {
        const start = t.opened_at || t.service_date;
        const end = ["resolved","closed"].includes(t.status) ? (t.resolved_at || t.closed_at || t.service_date) : undefined;
        const from = new Date(start); from.setHours(0,0,0,0);
        const to = end ? new Date(end) : new Date(); to.setHours(0,0,0,0);
        return Math.max(0, Math.floor((to.getTime()-from.getTime())/86400000));
      };
      const activeTechs = techWorkload.filter(t=>!t.isPool);
      return (
        <Section title="📋 Ticket รายคน (ละเอียด)" action={<Link href="/service" className="text-[11px] text-accent hover:underline">ดูทั้งหมด →</Link>}>
          {activeTechs.length===0?<p className="text-xs text-muted py-3 text-center">ยังไม่มีข้อมูล</p>:(
            <div className="space-y-5">
              {activeTechs.map(tech=>{
                const myTickets = service.filter(t=>t.technician===tech.fullName).sort((a,b)=>{
                  const order = ["open","in_progress","resolved","closed"];
                  return order.indexOf(a.status)-order.indexOf(b.status);
                });
                return (
                  <div key={tech.fullName}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">{tech.name}</span>
                      <span className="text-[10px] text-muted">{tech.open+tech.inProg} active · {tech.done} เสร็จ</span>
                    </div>
                    {myTickets.length===0?<p className="text-xs text-muted pl-2">ไม่มีงาน</p>:(
                      <div className="rounded-xl overflow-hidden border border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-card-hover text-muted text-[10px] uppercase tracking-wide">
                              <th className="text-left px-3 py-2">ลูกค้า</th>
                              <th className="text-left px-3 py-2 hidden sm:table-cell">ปัญหา</th>
                              <th className="text-center px-3 py-2">ประเภท</th>
                              <th className="text-center px-3 py-2">สถานะ</th>
                              <th className="text-center px-3 py-2">วันที่ผ่าน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {myTickets.map((t,i)=>{
                              const days = elapsedDays(t);
                              const isActive = ["open","in_progress"].includes(t.status);
                              return (
                                <tr key={i} className="hover:bg-card-hover transition-colors">
                                  <td className="px-3 py-2 font-medium truncate max-w-[120px]">{t.customer_name}</td>
                                  <td className="px-3 py-2 text-muted truncate max-w-[180px] hidden sm:table-cell">{t.issue?.slice(0,50)||"—"}</td>
                                  <td className="px-3 py-2 text-center text-muted">{TYPE_LABEL[t.type]||t.type}</td>
                                  <td className="px-3 py-2 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status]||""}`}>{STATUS_TH[t.status]||t.status}</span></td>
                                  <td className={`px-3 py-2 text-center font-medium ${isActive&&days>7?"text-red-500":isActive&&days>3?"text-amber-500":"text-muted"}`}>{days} วัน</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      );
    }

    if (id === "svc-repeat") {
      // ลูกค้าที่เปิด ticket ซ้ำ
      const custCount = service.reduce<Record<string, { name: string; count: number; open: number; types: string[] }>>((acc, t) => {
        const k = t.customer_name || "—";
        if (!acc[k]) acc[k] = { name: k, count: 0, open: 0, types: [] };
        acc[k].count++;
        if (["open","in_progress"].includes(t.status)) acc[k].open++;
        if (t.type && !acc[k].types.includes(t.type)) acc[k].types.push(t.type);
        return acc;
      }, {});
      const repeatCusts = Object.values(custCount).filter(c=>c.count>1).sort((a,b)=>b.open-a.open||b.count-a.count);
      // ช่างที่มี ticket ค้างนาน (active > 7 วัน)
      const techProblems = techWorkload.filter(t=>!t.isPool).map(t=>{
        const myActive = service.filter(s=>s.technician===t.fullName&&["open","in_progress"].includes(s.status));
        const longRunning = myActive.filter(s=>{
          const d = new Date(s.opened_at||s.service_date); d.setHours(0,0,0,0);
          const now = new Date(); now.setHours(0,0,0,0);
          return Math.floor((now.getTime()-d.getTime())/86400000) > 7;
        });
        return { name: t.name, active: myActive.length, longRunning: longRunning.length };
      }).filter(t=>t.active>0||t.longRunning>0);
      return (
        <Section title="🔁 ปัญหาซ้ำ & Skill Gap">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">ลูกค้าเปิด Ticket ซ้ำ</p>
              {repeatCusts.length===0?<p className="text-xs text-muted">ไม่มีลูกค้าเปิดซ้ำ</p>:(
                <div className="space-y-1.5">
                  {repeatCusts.slice(0,8).map(c=>(
                    <div key={c.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted">{c.types.join(", ")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold">{c.count} ticket</p>
                        {c.open>0&&<p className="text-[10px] text-amber-500 font-semibold">ค้างอยู่ {c.open}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">ช่างที่มีงานค้างนาน ({">"}7 วัน)</p>
              {techProblems.length===0?<p className="text-xs text-muted text-center py-2">✅ ไม่มีงานค้างนาน</p>:(
                <div className="space-y-1.5">
                  {techProblems.map(t=>(
                    <div key={t.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{t.name}</p>
                        <p className="text-[10px] text-muted">Active {t.active} งาน</p>
                      </div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${t.longRunning>0?"bg-red-500/10 border-red-500/25 text-red-500":"bg-green-500/10 border-green-500/25 text-green-500"}`}>
                        {t.longRunning>0?`ค้างนาน ${t.longRunning}`:"ปกติ"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      );
    }

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
              <p className="text-base font-bold mt-1">{fmtK(q.actualK)}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${q.pct>=80?"text-green-500":q.pct>=50?"text-amber-500":q.pct>0?"text-red-500":"text-muted"}`}>{q.pct>0?`${q.pct}%`:"—"}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-[10px] text-muted mb-2 px-1">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-600" />เป้าหมาย</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{background:C.blue}} />ยอดจริง</span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={quarterlyData} margin={{ left:0,right:0,top:0,bottom:0 }}>
            <XAxis dataKey="name" tick={{ fontSize:10,fill:"#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10,fill:"#888" }} axisLine={false} tickLine={false} width={36} tickFormatter={v => v === 0 ? "0" : fmtK(Number(v))} />
            <Tooltip formatter={(v, name)=>[fmtK(Number(v))+" THB", name==="targetK"?"เป้าหมาย":"ยอดจริง"]} contentStyle={{ background:"#1a1a2e",border:"1px solid #333",borderRadius:8,fontSize:11 }} />
            <Bar dataKey="targetK" fill="#334155" radius={[3,3,0,0]} name="เป้าหมาย" />
            <Bar dataKey="actualK" fill={C.blue} radius={[3,3,0,0]} name="ยอดจริง" />
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
      urgent: "text-red-500",  high: "text-amber-500",
      medium: "text-blue-500",  low: "text-muted",
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
                <div className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium border
                  ${j.status === "pending" ? "bg-amber-500/10 border-amber-500/25 text-amber-500" : "bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>
                  {j.status === "pending" ? "รอดำเนินการ" : "กำลังดำเนินการ"}
                </div>
                {j.due_date && (
                  <p className={`text-[10px] shrink-0 ${j.due_date < today2 ? "text-red-500 font-bold" : "text-muted"}`}>
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
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{svcOpenAll.length}</p>
            <p className="text-[11px] text-muted mt-0.5">รอดำเนินการ</p>
          </div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{svcInProgAll.length}</p>
            <p className="text-[11px] text-muted mt-0.5">กำลังดำเนินการ</p>
          </div>
          <div className="rounded-xl bg-green-500/10 border border-green-500/25 p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{svcResolvedAll.length}</p>
            <p className="text-[11px] text-muted mt-0.5">เสร็จแล้ว</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {[...svcOpenAll, ...svcInProgAll].slice(0, 8).map(t => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0
                ${t.status === "open" ? "bg-blue-500/10 border-blue-500/25 text-blue-500" : "bg-amber-500/10 border-amber-500/25 text-amber-500"}`}>
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
                <p className="text-[10px] text-red-500 font-semibold mb-1.5">หมดภายใน 30 วัน ({expiring30.length})</p>
                {expiring30.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-red-500/8 border border-red-500/20 px-3 py-1.5 mb-1">
                    <p className="text-sm flex-1 truncate font-medium">{c.customer_name}</p>
                    <p className="text-[11px] text-red-500 shrink-0">{c.end_date}</p>
                  </div>
                ))}
              </div>
            )}
            {expiring60.length > 0 && (
              <div>
                <p className="text-[10px] text-amber-500 font-semibold mb-1.5">หมดภายใน 31–60 วัน ({expiring60.length})</p>
                {expiring60.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 mb-1">
                    <p className="text-sm flex-1 truncate">{c.customer_name}</p>
                    <p className="text-[11px] text-amber-500 shrink-0">{c.end_date}</p>
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
              <p className="text-3xl font-bold text-green-500">{last30Resolved.length}</p>
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

    // ── SERVICE TEAM OVERVIEW ─────────────────────────────────────────────────
    if (id === "svc-team-overview") {
      const viewAll = hasPermission("view_all_tickets");
      const allTix = viewAll ? service : sc.service;
      const techNames = [...new Set(allTix.filter(t => t.technician).map(t => t.technician!))] as string[];
      const teamRows = techNames.map(techName => {
        const mine = allTix.filter(t => t.technician === techName);
        const done = mine.filter(t => ["resolved","closed"].includes(t.status));
        const active = mine.filter(t => !["resolved","closed","cancelled"].includes(t.status));
        const overdueT = mine.filter(t => !["resolved","closed","cancelled"].includes(t.status) && t.service_date && t.service_date < today);
        const closedWithTime = done.filter(t => t.opened_at && (t.resolved_at || t.closed_at));
        const avgCloseMs = closedWithTime.length > 0
          ? closedWithTime.reduce((sum, t) => sum + Math.max(0, new Date((t.resolved_at || t.closed_at)!).getTime() - new Date(t.opened_at!).getTime()), 0) / closedWithTime.length
          : 0;
        const avgCloseDays = avgCloseMs > 0 ? (avgCloseMs / 86400000).toFixed(1) : "—";
        const custCount: Record<string, number> = {};
        mine.forEach(t => { const k = t.customer_name || t.customer_id; custCount[k] = (custCount[k] || 0) + 1; });
        const rework = Object.values(custCount).filter(c => c > 1).length;
        const slaOk = mine.length > 0 ? Math.round(done.length / mine.length * 100) : 100;
        return { techName, shortName: techName.split(" ")[0], total: mine.length, active: active.length, done: done.length, overdue: overdueT.length, slaOk, avgCloseDays, rework };
      }).sort((a, b) => b.active - a.active);

      return (
        <Section title="👥 ภาพรวมทีม Service (รายช่าง)" action={<Link href="/service" className="text-[11px] text-accent hover:underline">ดูงาน →</Link>}>
          {teamRows.length === 0 ? <p className="text-xs text-muted py-4">ยังไม่มีข้อมูลช่าง</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="text-left text-[10px] text-muted border-b border-border uppercase tracking-wide">
                    <th className="pb-2 font-medium">ช่าง</th>
                    <th className="pb-2 font-medium text-center">Active</th>
                    <th className="pb-2 font-medium text-center">เสร็จ</th>
                    <th className="pb-2 font-medium text-center">ค้างกำหนด</th>
                    <th className="pb-2 font-medium text-center">SLA%</th>
                    <th className="pb-2 font-medium text-center">เฉลี่ย (วัน)</th>
                    <th className="pb-2 font-medium text-center">Rework</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {teamRows.map(r => (
                    <tr key={r.techName} className="hover:bg-card-hover transition-colors">
                      <td className="py-2.5 font-medium">{r.shortName}</td>
                      <td className="py-2.5 text-center">
                        <span className={`font-bold ${r.active > 4 ? "text-red-500" : r.active > 2 ? "text-amber-500" : r.active > 0 ? "text-blue-500" : "text-muted"}`}>{r.active}</span>
                      </td>
                      <td className="py-2.5 text-center text-green-500 font-medium">{r.done}</td>
                      <td className="py-2.5 text-center">
                        <span className={r.overdue > 0 ? "text-red-500 font-bold" : "text-muted"}>{r.overdue || "—"}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={r.slaOk >= 80 ? "text-green-500" : r.slaOk >= 60 ? "text-amber-500" : "text-red-500"}>{r.slaOk}%</span>
                      </td>
                      <td className="py-2.5 text-center text-muted">{r.avgCloseDays}</td>
                      <td className="py-2.5 text-center">
                        {r.rework > 0
                          ? <span className="text-amber-500 font-medium">{r.rework}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-4 text-[10px] text-muted mt-2 px-1">
                <span>Active = งานที่ยังไม่ปิด</span>
                <span>·</span>
                <span>Rework = ลูกค้าที่เปิด ticket ซ้ำ</span>
              </div>
            </div>
          )}
        </Section>
      );
    }

    if (id === "svc-time-analysis") {
      const durMs = (start?: string, end?: string): number | null => {
        if (!start || !end) return null;
        const ms = new Date(end).getTime() - new Date(start).getTime();
        return ms > 0 ? ms : null;
      };
      const avgMs = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const toH = (ms: number) => (ms / 3600000).toFixed(1);

      const closedTix = service.filter(t => ["resolved","closed"].includes(t.status));
      const responseMsList = closedTix.map(t => durMs(t.opened_at || t.service_date, t.accepted_at || t.acknowledged_at)).filter((ms): ms is number => ms !== null);
      const travelMsList   = closedTix.map(t => durMs(t.traveling_at || t.accepted_at, t.on_site_at)).filter((ms): ms is number => ms !== null);
      const repairMsList   = closedTix.map(t => {
        const start = t.repair_start_at || t.on_site_at || t.started_at;
        const end = t.resolved_at || t.closed_at;
        const total = durMs(start, end);
        if (!total) return null;
        const partsWait = durMs(t.waiting_parts_at, t.resume_at);
        return total - (partsWait || 0);
      }).filter((ms): ms is number => ms !== null && ms > 0);
      const partsMsList    = closedTix.map(t => durMs(t.waiting_parts_at, t.resume_at || t.resolved_at)).filter((ms): ms is number => ms !== null);

      const avgResponseMs = avgMs(responseMsList);
      const avgTravelMs   = avgMs(travelMsList);
      const avgRepairMs   = avgMs(repairMsList);
      const avgPartsMs    = avgMs(partsMsList);
      const totalAvgMs    = avgResponseMs + avgTravelMs + avgRepairMs + avgPartsMs;

      const phases = [
        { label:"ตอบรับ",   sub:"opened→accepted",  ms:avgResponseMs, color:"bg-blue-500"   },
        { label:"เดินทาง",  sub:"travel→on site",   ms:avgTravelMs,   color:"bg-violet-500" },
        { label:"ซ่อมงาน", sub:"start→resolved",   ms:avgRepairMs,   color:"bg-amber-500"  },
        { label:"รออะไหล่", sub:"wait→resume",      ms:avgPartsMs,    color:"bg-rose-500"   },
      ].filter(p => p.ms > 0);
      const maxMs = Math.max(...phases.map(p => p.ms), 1);

      const activeTix = service.filter(t => !["resolved","closed","cancelled"].includes(t.status));
      const aging = { d1:0, d3:0, d7:0, dLong:0 };
      activeTix.forEach(t => {
        const d = Math.max(0, Math.floor((Date.now() - new Date(t.opened_at || t.service_date).getTime()) / 86400000));
        if (d <= 1) aging.d1++; else if (d <= 3) aging.d3++; else if (d <= 7) aging.d7++; else aging.dLong++;
      });

      return (
        <Section title="⏱️ วิเคราะห์เวลาการทำงาน" action={<span className="text-[10px] text-muted">{closedTix.length} tickets ปิดแล้ว</span>}>
          <div className="space-y-2 mb-4">
            {phases.length === 0
              ? <p className="text-xs text-muted">ยังไม่มีข้อมูล timestamp — บันทึกสถานะในใบงานเพื่อเริ่มเก็บข้อมูล</p>
              : phases.map(p => (
                <div key={p.label} className="flex items-center gap-3">
                  <div className="w-16 shrink-0">
                    <p className="text-xs font-medium">{p.label}</p>
                    <p className="text-[9px] text-muted">{p.sub}</p>
                  </div>
                  <div className="flex-1 h-5 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.color} opacity-80 flex items-center px-2`}
                      style={{ width:`${Math.max(p.ms / maxMs * 100, 8)}%` }}
                    >
                      <span className="text-[10px] text-white font-medium whitespace-nowrap">{toH(p.ms)}h</span>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
          {totalAvgMs > 0 && (
            <div className="rounded-xl bg-background border border-border/50 p-3 text-center mb-4">
              <p className="text-[10px] text-muted">เวลาปิดงานเฉลี่ยรวม</p>
              <p className="text-2xl font-bold mt-0.5">{toH(totalAvgMs)} ชม.</p>
            </div>
          )}
          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-muted uppercase tracking-widest mb-2">อายุ Ticket ที่ยังค้างอยู่</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label:"≤1 วัน",  v:aging.d1,    c:"text-green-500", bg:"bg-green-500/10 border-green-500/25" },
                { label:"2-3 วัน", v:aging.d3,    c:"text-blue-500",  bg:"bg-blue-500/10 border-blue-500/25"  },
                { label:"4-7 วัน", v:aging.d7,    c:"text-amber-500", bg:"bg-amber-500/10 border-amber-500/25"},
                { label:">7 วัน",  v:aging.dLong, c:"text-red-500",   bg:"bg-red-500/10 border-red-500/25"   },
              ].map(b => (
                <div key={b.label} className={`rounded-xl border p-2 text-center ${b.bg}`}>
                  <p className={`text-xl font-bold ${b.c}`}>{b.v}</p>
                  <p className="text-[10px] text-muted">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      );
    }

    if (id === "svc-cost-dashboard") {
      if (!canSeeFinanceDash) return (
        <Section title="💰 รายรับ / ต้นทุน Service">
          <p className="text-xs text-muted py-6 text-center">ต้องการสิทธิ์ finance เพื่อดูข้อมูล</p>
        </Section>
      );
      const closedFin = service.filter(t => ["resolved","closed"].includes(t.status) && (t.service_value || t.service_cost || t.gross_profit));
      const totalValue = closedFin.reduce((s, t) => s + (t.service_value || 0), 0);
      const totalCost  = closedFin.reduce((s, t) => s + (t.service_cost  || 0), 0);
      const totalGP    = closedFin.reduce((s, t) => s + (t.gross_profit  || 0), 0);
      const totalHours = service.filter(t => t.hours_spent).reduce((s, t) => s + (t.hours_spent || 0), 0);
      const avgGP      = closedFin.length > 0 ? totalGP / closedFin.length : 0;
      const gpPctSvc   = totalValue > 0 ? (totalGP / totalValue * 100) : 0;
      const hoursJobs  = service.filter(t => t.hours_spent).length;
      const avgHours   = hoursJobs > 0 ? totalHours / hoursJobs : 0;
      return (
        <Section title="💰 รายรับ / ต้นทุน Service" action={<span className="text-[10px] text-muted">{closedFin.length} งานมีข้อมูล</span>}>
          {closedFin.length === 0 ? (
            <p className="text-xs text-muted py-4">ยังไม่มีข้อมูล — กรอกรายรับ/ต้นทุนในใบงานเมื่อปิดงาน</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <KpiCard size="sm" label="รายรับ Service" value={totalValue>0?`${(totalValue/1000).toFixed(0)}K`:"—"} sub="THB" color="green" />
                <KpiCard size="sm" label="ต้นทุนรวม" value={totalCost>0?`${(totalCost/1000).toFixed(0)}K`:"—"} sub="THB" color={totalCost>totalValue?"red":"amber"} />
                <KpiCard size="sm" label="กำไร GP" value={totalGP>0?`${(totalGP/1000).toFixed(0)}K`:"—"} sub={`GP ${gpPctSvc.toFixed(1)}%`} color={gpPctSvc>=20?"green":gpPctSvc>=10?"amber":totalGP>0?"red":"muted"} pct={gpPctSvc} />
                <KpiCard size="sm" label="เฉลี่ย/Job" value={avgGP>0?`${(avgGP).toFixed(0)}`:"—"} sub="GP ต่อใบงาน" color="cyan" />
              </div>
              {totalHours > 0 && (
                <div className="rounded-xl bg-background border border-border/50 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">ชั่วโมงทำงานรวม</p>
                    <p className="text-lg font-bold">{totalHours.toFixed(1)} ชม.</p>
                  </div>
                  {avgHours > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted">เฉลี่ย/Job</p>
                      <p className="text-lg font-bold">{avgHours.toFixed(1)} ชม.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
    topExpiring, service, svcOpen, svcInProg, svcDone,
    jobRequests, contracts, canSeeFinanceDash, hasPermission, sc.service,
  ]);

  if (!mounted) return <div className="p-6 text-muted text-sm">Loading...</div>;

  const currentLayout = layouts[view];
  const visibleWidgets = currentLayout.filter(w => w.visible);
  const hiddenWidgets = currentLayout.filter(w => !w.visible);
  const viewLabel = view==="executive"?"📊 Executive":view==="sales"?"💰 Sales":view==="presale"?"⚙️ Presale":view==="service"?"🔧 Service":view==="coordinator"?"🗂️ ธุรการ":"🔽 Projects";

  return (
    <div className="p-5 md:p-6 max-w-[1400px] space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {view==="executive"?"Executive Dashboard":view==="sales"?(seeAll?"Sales Dashboard":myName||"Sales Dashboard"):view==="presale"?"Presale Dashboard":view==="service"?"Service Dashboard":view==="coordinator"?"Coordinator Dashboard":"Projects Dashboard"}
            </h1>
            {view==="sales" && !seeAll && myMonthTarget > 0 && (
              <span className="text-[11px] font-medium text-muted/70 bg-card border border-border/60 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                เป้า <span className="text-blue-500 font-semibold">{(myMonthTarget/1000).toFixed(0)}K</span>
                <span className="text-muted/40">·</span>
                <span className={`font-semibold ${myMonthPct >= 100 ? "text-emerald-500" : myMonthPct >= 70 ? "text-amber-500" : "text-red-500"}`}>{myMonthPct}%</span>
              </span>
            )}
            {!loading&&(
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"/>
                </span>
                <span className="text-[11px] text-emerald-500/80 font-medium">Live</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted/70">
            <span>{filterLabel}</span>
            {lastUpdated&&<><span>·</span><span>{lastUpdated.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}</span></>}
          </div>
        </div>
        <div className="overflow-x-auto -mx-1 px-1 pb-0.5">
          <div className="flex items-center gap-1.5 w-max">
            {/* Period filter */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card p-1">
              {(["today","week","month","year"] as Filter[]).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filter===f?"bg-accent text-white shadow-sm":"text-muted hover:text-foreground"}`}>
                  {f==="today"?"วันนี้":f==="week"?"7 วัน":f==="month"?"เดือนนี้":"ปีนี้"}
                </button>
              ))}
            </div>
            {/* Quarter filter */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card p-1">
              {(["q1","q2","q3","q4"] as Filter[]).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  title={`${qRanges[f as "q1"|"q2"|"q3"|"q4"].from.slice(0,7)} → ${qRanges[f as "q1"|"q2"|"q3"|"q4"].to.slice(0,7)}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filter===f?"bg-violet-600 text-white shadow-sm":"text-muted hover:text-foreground"}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={()=>setFilter("custom")} title="กำหนดช่วงวันเอง"
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${filter==="custom"?"bg-sky-700 border-sky-600 text-white":"border-border/70 bg-card text-muted hover:text-foreground"}`}>
              กำหนดเอง
            </button>
            <button onClick={()=>setEditMode(v=>!v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${editMode?"bg-amber-600 border-amber-500 text-white":"border-border/70 bg-card text-muted hover:text-foreground"}`}>
              {editMode?"✓ เสร็จ":"ปรับ Layout"}
            </button>
          </div>
        </div>
      </div>

      {filter==="custom"&&(
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-muted">จาก</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="rounded-lg bg-card border border-border/70 px-3 py-1.5 text-xs" />
          <label className="text-xs text-muted">ถึง</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="rounded-lg bg-card border border-border/70 px-3 py-1.5 text-xs" />
        </div>
      )}

      {/* ── VIEW TABS ──────────────────────────────────────────────────────── */}
      {isAdmin&&(
        <div className="flex gap-0.5 rounded-lg border border-border/70 bg-card p-1 w-fit flex-wrap">
          {([
            { id:"executive", label:"Executive" },
            { id:"sales",     label:"Sales" },
            { id:"presale",   label:"Presale" },
            { id:"service",   label:"Service" },
            { id:"projects",  label:"Projects" },
            { id:"coordinator", label:"ธุรการ" },
          ] as {id:DashView;label:string}[]).map(v=>(
            <button key={v.id} onClick={()=>{ setView(v.id); setEditMode(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view===v.id?"bg-accent text-white shadow-sm":"text-muted hover:text-foreground"}`}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      {loading&&<div className="text-center py-16 text-muted text-sm">กำลังโหลดข้อมูล...</div>}

      {!loading&&(<>

        {/* ── ALERTS BANNER ──────────────────────────────────────────────── */}
        {alerts.length>0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground/90">การแจ้งเตือน</span>
                {alerts.filter(a=>a.level==="red").length>0&&(
                  <span className="rounded-full bg-red-500/10 text-red-500 border border-red-500/25 text-[10px] px-2 py-0.5 font-semibold">
                    {alerts.filter(a=>a.level==="red").length} เรื่องด่วน
                  </span>
                )}
              </div>
              {alerts.length>5&&(
                <Link href="/sales" className="text-[11px] text-accent hover:underline shrink-0">
                  ดูทั้งหมด {alerts.length} รายการ →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {alerts.slice(0,5).map(a=><AlertRow key={a.id} {...a}/>)}
            </div>
          </div>
        ) : !seeAll && (
          <div className="rounded-xl border border-border/40 p-3 text-center text-xs text-muted/70">
            ไม่มีงานเร่งด่วน
          </div>
        )}

        {/* ── HERO KPI STRIP — ซ่อนสำหรับ sales view ส่วนตัว และ service roles ── */}
        {showHeroKpiStrip && !(view === "sales" && !seeAll) && !isServiceRole && (
          <div className="grid grid-cols-4 gap-2">
            <KpiCard size="sm" label="ยอดขาย" value={`${(actual/1e6).toFixed(1)}M`} sub={`THB`} color="green" href="/sales" pct={targetPct} />
            <KpiCard size="sm" label="Achievement" value={`${targetPct.toFixed(0)}%`} sub={`${(actual/1000).toFixed(0)}K/${(target/1000).toFixed(0)}K`} color={targetPct>=80?"green":targetPct>=50?"amber":"red"} pct={targetPct} href="/reports" />
            <KpiCard size="sm" label="GP รวม" value={actualProfit>0?`${(actualProfit/1e6).toFixed(1)}M`:"—"} sub={`GP ${gpPct.toFixed(1)}%`} color={gpPct>=20?"green":gpPct>=10?"amber":actualProfit>0?"red":"muted"} pct={profitPct} href="/reports" />
            <KpiCard size="sm" label="Follow-up" value={String(salesOverdue.length)} sub={salesOverdue.length>0?`ค้าง`:"ปกติ"} color={salesOverdue.length>0?"red":"green"} alert={salesOverdue.length>0} href="/sales" />
          </div>
        )}

        {/* ── EDIT MODE TOOLBAR ──────────────────────────────────────────── */}
        {editMode&&(
          <div className="rounded-xl border border-amber-600/40 bg-amber-950/15 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-amber-400">โหมดปรับ Layout — {viewLabel}</p>
                <p className="text-[11px] text-muted/70 mt-0.5">ลากเพื่อย้าย · ½/⬛ ปรับขนาด · ✕ ซ่อน</p>
              </div>
              <button onClick={handleResetLayout}
                className="px-3 py-1.5 rounded-lg border border-amber-600/40 text-amber-400 text-xs hover:bg-amber-900/20 transition-colors">
                รีเซ็ต Default
              </button>
            </div>
            {hiddenWidgets.length>0&&(
              <div>
                <p className="text-[11px] text-muted/70 mb-2">Widget ที่ซ่อนอยู่ — คลิกเพื่อแสดง:</p>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenWidgets.map(w=>(
                    <button key={w.id} onClick={()=>toggleVisible(w.id)}
                      className="px-2.5 py-1 rounded-md border border-border/60 bg-background text-xs text-muted hover:text-foreground hover:border-accent/50 transition-colors">
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
          <SortableContext items={visibleWidgets.map(w=>w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-6 gap-5">
              {visibleWidgets.map(w=>(
                <SortableWidget
                  key={w.id} id={w.id} span={w.span} editMode={editMode}
                  label={WIDGET_LABELS[w.id]||w.id}
                  onToggleVisible={()=>toggleVisible(w.id)}
                  onToggleSpan={()=>toggleSpan(w.id)}
                >
                  {renderWidget(w.id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-[10px] text-muted/50 border-t border-border/40 pt-4">
          <span>ข้อมูลจาก: SalesQuota · Projects · Quotations · ServiceTickets · Contracts · Assets</span>
          <span>{lastUpdated?`อัปเดต ${lastUpdated.toLocaleTimeString("th-TH")}`:""}</span>
        </div>

      </>)}
    </div>
  );
}
