"use client";
import { useEffect, useState } from "react";
import type { ServiceTicket, ServiceStatus, Customer, Project, JobRequest, User, Asset } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import Link from "next/link";
import { ServiceTicketDetail } from "@/components/ServiceTicketDetail";

const svcTypes = ["installation","site_survey","technical_survey","after_sales","repair","pm_service"] as const;
const typeLabels: Record<string, string> = { installation: "Installation", site_survey: "Site Survey", technical_survey: "Technical Survey", after_sales: "After-Sales", repair: "Repair", pm_service: "PM Service" };
const empty = {
  customer_id: "", customer_name: "", project_id: "", project_name: "",
  type: "installation" as ServiceTicket["type"], issue: "", technician: "", service_date: "",
  status: "open" as ServiceStatus,
  priority: "medium" as NonNullable<ServiceTicket["priority"]>,
  service_value: 0, service_cost: 0, gross_profit: 0, hours_spent: 0,
  reported_by: "", report_date: "", report_channel: "phone" as NonNullable<ServiceTicket["report_channel"]>,
  assignment_mode: "individual" as NonNullable<ServiceTicket["assignment_mode"]>,
  target_skill: "", target_area: "",
  sla_response_hours: 4, sla_resolve_hours: 48,
  asset_id: "", km_number: "",
};

const channelLabel: Record<string, string> = { phone: "📞 โทรศัพท์", line: "💬 Line", email: "✉️ อีเมล", walk_in: "🚶 มาที่หน้าร้าน", system: "💻 ระบบ" };
const modeLabel: Record<string, string> = { individual: "👤 ระบุช่าง", all: "📢 ทุกคนในทีม", by_skill: "🛠️ ตามความถนัด", by_area: "📍 ตามพื้นที่" };
const modeIcon: Record<string, string> = { individual: "👤", all: "📢", by_skill: "🛠️", by_area: "📍" };

function parseISO(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}
function hoursBetween(from?: string, to?: string): number | null {
  const a = parseISO(from); const b = parseISO(to);
  if (a === null || b === null) return null;
  return (b - a) / 3600000;
}
function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const statusLabel: Record<string, string> = {
  open: "เปิดใหม่", acknowledged: "รับทราบแล้ว", traveling: "เดินทาง",
  on_site: "ถึงสถานที่", repair_start: "เริ่มซ่อม", in_progress: "กำลังทำ",
  waiting_parts: "รอชิ้นส่วน", resume: "กลับมาทำต่อ", resolved: "แก้ไขแล้ว",
  closed: "ปิดงาน", cancelled: "ยกเลิก", waiting_approval: "รออนุมัติ",
};
const statusIcon: Record<string, string> = {
  open: "🆕", acknowledged: "👁️", traveling: "🚗", on_site: "📍",
  repair_start: "🔧", in_progress: "⚙️", waiting_parts: "📦", resume: "▶️",
  resolved: "✅", closed: "🔒", cancelled: "❌", waiting_approval: "⏳",
};
const statusColor: Record<string, string> = {
  open: "bg-red-900/50 text-red-400",
  acknowledged: "bg-indigo-900/50 text-indigo-400",
  traveling: "bg-orange-900/50 text-orange-400",
  on_site: "bg-amber-900/50 text-amber-400",
  repair_start: "bg-yellow-900/50 text-yellow-300",
  in_progress: "bg-yellow-900/50 text-yellow-400",
  waiting_parts: "bg-purple-900/50 text-purple-400",
  resume: "bg-blue-900/50 text-blue-400",
  resolved: "bg-green-900/50 text-green-400",
  closed: "bg-gray-700 text-gray-300",
  cancelled: "bg-gray-800/80 text-gray-500",
  waiting_approval: "bg-rose-900/50 text-rose-400",
};
const priorityBadge: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-gray-500/20 text-gray-400",
};
const priorityLabel: Record<string, string> = { critical: "🔴 วิกฤต", high: "🟠 สูง", medium: "🟡 ปกติ", low: "🟢 ต่ำ" };

const ALL_STATUSES: ServiceStatus[] = [
  "open","acknowledged","traveling","on_site","repair_start","in_progress",
  "waiting_parts","resume","resolved","closed","cancelled","waiting_approval",
];

export default function ServicePage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [list, setList]               = useState<ServiceTicket[]>([]);
  const [custs, setCusts]             = useState<Customer[]>([]);
  const [projs, setProjs]             = useState<Project[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [svcUsers, setSvcUsers]       = useState<User[]>([]);
  const [assetList, setAssetList]     = useState<Asset[]>([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [typeFilter, setTypeFilter]   = useState("");
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(empty);
  const [saving, setSaving]           = useState(false);
  const [mounted, setMounted]         = useState(false);
  // visibility toggles — ห้ามลบ, ใช้เปิด/ปิดใน config อนาคต
  const [showRevenue, setShowRevenue]       = useState(false);
  const [showSlaDetail, setShowSlaDetail]   = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [t, c, p, jr, u, al] = await Promise.all([fs.serviceTickets.list(), fs.customers.list(), fs.projects.list(), fs.jobRequests.list(), fs.users.list(), fs.assets.list()]);
      setList(t); setCusts(c); setProjs(p); setAssetList(al);
      setIncomingReqs(jr.filter(j => j.request_to_team === "service"));
      setSvcUsers(u.filter(x => x.active && (x.role === "service" || x.role === "Service Technician" || x.role === "Service Manager")));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  const ownTicketsOnly = isNewRole(currentUser?.role ?? "") && !hasPermission("view_all_tickets");
  const baseTickets = ownTicketsOnly ? list.filter(t => t.technician === currentUser?.name) : list;

  const filtered = baseTickets.filter((t) => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.issue.toLowerCase().includes(s) || t.customer_name.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchType   = !typeFilter || t.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  const today  = todayStr();
  const isActive = (st: ServiceStatus) => !["resolved","closed","cancelled"].includes(st);
  const overdueList = list.filter(t => t.service_date && t.service_date < today && isActive(t.status));
  const todayList   = list.filter(t => t.service_date === today && isActive(t.status));
  const stats = {
    total:      list.length,
    open:       list.filter(t => t.status === "open").length,
    inProgress: list.filter(t => t.status === "in_progress").length,
    resolved:   list.filter(t => t.status === "resolved").length,
    closed:     list.filter(t => t.status === "closed").length,
    overdue:    overdueList.length,
    today:      todayList.length,
    pendingReqs: incomingReqs.filter(r => r.status === "pending").length,
    pmCount:    list.filter(t => t.type === "pm_service" && isActive(t.status)).length,
  };

  // ── Workload (existing — kept for Revenue section) ───────────────────────────
  const workload = svcUsers.map(u => ({
    name: u.name,
    active: list.filter(t => t.technician === u.name && isActive(t.status)).length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active).slice(0, 5);

  // ── Revenue / Profit (HIDDEN BY DEFAULT — ห้ามลบ) ──────────────────────────
  const completed = list.filter(t => t.status === "resolved" || t.status === "closed");
  const pending   = list.filter(t => isActive(t.status));
  const sumValue  = (arr: ServiceTicket[]) => arr.reduce((s, t) => s + (t.service_value || 0), 0);
  const sumProfit = (arr: ServiceTicket[]) => arr.reduce((s, t) => s + (t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))), 0);
  const completedRevenue = sumValue(completed);
  const completedProfit  = sumProfit(completed);
  const completedGP      = completedRevenue > 0 ? (completedProfit / completedRevenue * 100) : 0;
  const pendingRevenue   = sumValue(pending);
  const pendingProfit    = sumProfit(pending);
  const currentMonth     = today.slice(0, 7);
  const monthCompleted   = completed.filter(t => (t.service_date || "").slice(0, 7) === currentMonth);
  const monthRevenue     = sumValue(monthCompleted);
  const monthProfit      = sumProfit(monthCompleted);
  const techRevenue = svcUsers.map(u => {
    const mine = completed.filter(t => t.technician === u.name);
    const rev = sumValue(mine); const profit = sumProfit(mine);
    return { name: u.name, jobs: mine.length, revenue: rev, profit, gp: rev > 0 ? (profit / rev * 100) : 0 };
  }).filter(t => t.revenue > 0 || t.jobs > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const typeRevenue = svcTypes.map(tt => {
    const mine = completed.filter(t => t.type === tt);
    const rev = sumValue(mine); const profit = sumProfit(mine);
    return { type: tt, label: typeLabels[tt], jobs: mine.length, revenue: rev, profit, gp: rev > 0 ? (profit / rev * 100) : 0 };
  }).filter(x => x.revenue > 0 || x.jobs > 0).sort((a, b) => b.revenue - a.revenue);

  // ── SLA Analysis (HIDDEN BY DEFAULT — ห้ามลบ) ──────────────────────────────
  const ticketsWithAccept  = list.filter(t => t.opened_at && t.accepted_at);
  const responseHours      = ticketsWithAccept.map(t => hoursBetween(t.opened_at, t.accepted_at) ?? 0);
  const avgResponse        = responseHours.length > 0 ? avg(responseHours) : null;
  const ticketsWithResolve = list.filter(t => t.opened_at && t.resolved_at);
  const resolveHours       = ticketsWithResolve.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
  const avgResolve         = resolveHours.length > 0 ? avg(resolveHours) : null;
  const nowMs = Date.now();
  const overdueAccept = list.filter(t => {
    if (t.status !== "open" || !t.opened_at) return false;
    const sla = t.sla_response_hours || 4;
    const h = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000;
    return h > sla;
  });
  const slaBreachedResolve = list.filter(t => {
    if (!t.opened_at || !t.resolved_at) return false;
    const h = hoursBetween(t.opened_at, t.resolved_at);
    return h !== null && h > (t.sla_resolve_hours || 48);
  });
  const techResponse = svcUsers.map(u => {
    const mine = ticketsWithAccept.filter(t => (t.accepted_by || t.technician) === u.name);
    const hours = mine.map(t => hoursBetween(t.opened_at, t.accepted_at) ?? 0);
    return { name: u.name, count: mine.length, avgHours: hours.length > 0 ? avg(hours) : 0 };
  }).filter(x => x.count > 0).sort((a, b) => b.avgHours - a.avgHours);
  const typeResolve = svcTypes.map(tt => {
    const mine = ticketsWithResolve.filter(t => t.type === tt);
    const hours = mine.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
    return { type: tt, label: typeLabels[tt], count: mine.length, avgHours: hours.length > 0 ? avg(hours) : 0, maxHours: hours.length > 0 ? Math.max(...hours) : 0, slaTarget: 48 };
  }).filter(x => x.count > 0).sort((a, b) => b.avgHours - a.avgHours);

  // ── NEW: Dashboard enhancements ──────────────────────────────────────────────
  const unassigned = list.filter(t => t.status === "open" && !t.technician && t.assignment_mode === "individual");

  const workloadDetailed = svcUsers.map(u => ({
    name:    u.name,
    active:  list.filter(t => t.technician === u.name && isActive(t.status)).length,
    overdue: list.filter(t => t.technician === u.name && isActive(t.status) && t.service_date && t.service_date < today).length,
    waitSla: overdueAccept.filter(t => t.technician === u.name).length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active);

  const next14Str = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })();
  const pmUpcoming = list.filter(t =>
    t.type === "pm_service" && isActive(t.status) && t.service_date && t.service_date >= today && t.service_date <= next14Str
  ).sort((a, b) => (a.service_date || "").localeCompare(b.service_date || ""));

  const slaOnTimeCount = ticketsWithResolve.filter(t => {
    const h = hoursBetween(t.opened_at, t.resolved_at);
    return h !== null && h <= (t.sla_resolve_hours || 48);
  }).length;
  const slaOnTimeRate = ticketsWithResolve.length > 0
    ? Math.round(slaOnTimeCount / ticketsWithResolve.length * 100)
    : null;

  const typeActive = {
    repair:  list.filter(t => t.type === "repair"            && isActive(t.status)).length,
    pm:      list.filter(t => t.type === "pm_service"        && isActive(t.status)).length,
    install: list.filter(t => t.type === "installation"      && isActive(t.status)).length,
    survey:  list.filter(t => (t.type === "site_survey" || t.type === "technical_survey") && isActive(t.status)).length,
    after:   list.filter(t => t.type === "after_sales"       && isActive(t.status)).length,
  };

  // ── Handler functions (unchanged) ────────────────────────────────────────────
  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm(f => ({ ...f, customer_id: id, customer_name: c?.company_name || "", asset_id: "", km_number: "" })); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm(f => ({ ...f, project_id: id, project_name: p?.name || "" })); }
  function selectAsset(id: string) {
    if (!id) { setForm(f => ({ ...f, asset_id: "", km_number: "" })); return; }
    const a = assetList.find(x => x.id === id);
    if (!a) return;
    setForm(f => ({ ...f, asset_id: id, km_number: a.km_number ?? "", customer_id: f.customer_id || a.customer_id, customer_name: f.customer_name || a.customer_name }));
  }
  function updateMoney(field: "service_value" | "service_cost" | "hours_spent", val: number) {
    const next = { ...form, [field]: val };
    next.gross_profit = (next.service_value || 0) - (next.service_cost || 0);
    setForm(next);
  }
  async function handleSave() {
    if (!form.issue.trim()) return; setSaving(true);
    const { serviceTickets } = await import("@/lib/firestore");
    const now = new Date().toISOString();
    const initHistory = [{ status: form.status, timestamp: now, by: currentUser?.name || "", note: "สร้าง Ticket" }];
    const payload = { ...form, gross_profit: (form.service_value || 0) - (form.service_cost || 0), opened_at: now, status_history: initHistory };
    try {
      await serviceTickets.add(payload as unknown as Record<string, unknown>);
      try { const { logActivity } = await import("@/lib/firestore"); await logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "create", module: "service", resource_name: form.issue, details: `สร้าง Ticket: ${form.customer_name}` }); } catch {}
      setForm(empty); setShowForm(false); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { serviceTickets } = await import("@/lib/firestore"); await serviceTickets.remove(id); await load(); }
  async function changeStatus(t: ServiceTicket, newStatus: ServiceStatus, who?: string, note?: string) {
    if (newStatus === t.status) return;
    const { serviceTickets } = await import("@/lib/firestore");
    const { arrayUnion } = await import("firebase/firestore");
    const now = new Date().toISOString();
    const by = who || currentUser?.name || "";
    const histEntry: Record<string, string> = { status: newStatus, timestamp: now, by };
    if (note) histEntry.note = note;

    const update: Record<string, unknown> = {
      status: newStatus,
      status_history: arrayUnion(histEntry),
    };
    if (!t.opened_at) update.opened_at = now;

    // Extended status → timestamp field mapping
    const tsMap: Partial<Record<ServiceStatus, string>> = {
      acknowledged: "acknowledged_at", traveling: "traveling_at",
      on_site: "on_site_at", repair_start: "repair_start_at",
      waiting_parts: "waiting_parts_at", resume: "resume_at",
      cancelled: "cancelled_at", waiting_approval: "waiting_approval_at",
    };
    if (tsMap[newStatus]) update[tsMap[newStatus]!] = now;

    // Legacy compat timestamps
    const acceptTriggers: ServiceStatus[] = ["acknowledged","in_progress","repair_start","traveling","on_site","resolved","closed","waiting_approval"];
    if (acceptTriggers.includes(newStatus) && !t.accepted_at) {
      update.accepted_at = now;
      if (by && !t.accepted_by) update.accepted_by = by;
    }
    const startTriggers: ServiceStatus[] = ["in_progress","repair_start","on_site","resolved","closed"];
    if (startTriggers.includes(newStatus) && !t.started_at) update.started_at = now;
    if (["resolved","closed"].includes(newStatus) && !t.resolved_at) update.resolved_at = now;
    if (newStatus === "closed" && !t.closed_at) update.closed_at = now;

    await serviceTickets.update(t.id!, update);
    if (selectedTicket?.id === t.id) setSelectedTicket({ ...t, ...update, status_history: [...(t.status_history || []), histEntry as unknown as import("@/lib/types").ServiceStatusHistory] });
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Service Control Center
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">

      {/* ── Job Requests from Sales (unchanged) ── */}
      {incomingReqs.filter(r => r.status === "pending").length > 0 && (
        <div className="rounded-xl bg-rose-900/10 border border-rose-800/50 p-4 mb-4">
          <h3 className="text-sm font-semibold text-rose-400 mb-2">📥 Job Requests จากทีม Sales ({incomingReqs.filter(r => r.status === "pending").length} รายการรออนุมัติ)</h3>
          <div className="space-y-2">
            {incomingReqs.filter(r => r.status === "pending").map(r => (
              <div key={r.id} className="rounded-lg bg-card border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted mt-0.5">{r.description}</p>
                    <p className="text-xs text-muted mt-1">จาก: {r.request_from} · ลูกค้า: {r.customer_name} · มูลค่า: {(r.value || 0).toLocaleString()} THB · กำหนด: {r.due_date || "-"}</p>
                    <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.priority === "urgent" ? "bg-red-900/50 text-red-400" : r.priority === "high" ? "bg-amber-900/50 text-amber-400" : "bg-blue-900/50 text-blue-400"}`}>{r.priority}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <select id={`svc-assign-${r.id}`} defaultValue="" className="rounded bg-background border border-border px-2 py-1 text-xs"><option value="">-- มอบหมายช่าง --</option>{svcUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
                    <div className="flex gap-1">
                      <button onClick={async () => { const assignTo = (document.getElementById(`svc-assign-${r.id}`) as HTMLSelectElement)?.value; const note = prompt("หมายเหตุรับงาน (ไม่บังคับ)") || ""; const { jobRequests } = await import("@/lib/firestore"); await jobRequests.update(r.id!, { status: "accepted", assigned_to: assignTo, accept_note: note }); await load(); }} className="text-[10px] bg-green-800/50 text-green-400 rounded px-2 py-1 hover:bg-green-800">✓ รับงาน</button>
                      <button onClick={async () => { const reason = prompt("เหตุผลที่ปฏิเสธ:"); if (!reason) return; const { jobRequests } = await import("@/lib/firestore"); await jobRequests.update(r.id!, { status: "rejected", reject_reason: reason }); await load(); }} className="text-[10px] bg-red-800/50 text-red-400 rounded px-2 py-1 hover:bg-red-800">✗ ปฏิเสธ</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">🎛️ Service Control Center</h1>
          <p className="text-xs text-muted">ภาพรวมงานทีม Service — ติดตั้ง · ซ่อม · PM · บริการหลังการขาย</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {/* ── Alert Bar — แสดงเมื่อมีงานต้องดูแลด่วน ── */}
      {!loading && (overdueAccept.length > 0 || overdueList.length > 0 || unassigned.length > 0 || stats.pendingReqs > 0) && (
        <div className="rounded-xl border border-red-800/50 bg-red-900/10 px-4 py-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs font-bold text-red-400 shrink-0">⚡ ต้องดูแลทันที</span>
          {overdueAccept.length > 0 && (
            <button onClick={() => setStatusFilter("open")} className="flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:underline">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
              {overdueAccept.length} งานค้างรอรับ &gt; SLA
            </button>
          )}
          {overdueList.length > 0 && <span className="text-sm font-semibold text-amber-400">⚠ {overdueList.length} งานเลยกำหนดนัด</span>}
          {unassigned.length > 0 && <span className="text-sm font-semibold text-orange-400">📋 {unassigned.length} งานยังไม่มอบหมาย</span>}
          {stats.pendingReqs > 0 && <span className="text-sm font-semibold text-purple-400">📥 {stats.pendingReqs} Job Request รอรับ</span>}
        </div>
      )}

      {/* ── KPI Grid (8 tiles: 2 rows × 4) ── */}
      {!loading && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {/* Row 1: Status filters (clickable) */}
          {([
            { label: "เปิดใหม่",    v: stats.open,       f: "open",        cls: "text-red-400" },
            { label: "กำลังทำ",    v: stats.inProgress,  f: "in_progress", cls: "text-yellow-400" },
            { label: "แก้ไขแล้ว", v: stats.resolved,    f: "resolved",    cls: "text-green-400" },
            { label: "ปิดงาน",    v: stats.closed,      f: "closed",      cls: "text-muted" },
          ] as const).map(k => (
            <button key={k.f}
              onClick={() => setStatusFilter(statusFilter === k.f ? "all" : k.f as ServiceStatus)}
              className={`rounded-xl border p-3 text-left transition-colors ${statusFilter === k.f ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.v}</p>
              <p className="text-[11px] text-muted mt-0.5">{k.label}</p>
            </button>
          ))}
          {/* Row 2: Context KPIs */}
          <div className={`rounded-xl border p-3 ${stats.overdue > 0 ? "border-red-800/50 bg-red-900/10" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${stats.overdue > 0 ? "text-red-400" : "text-muted"}`}>{stats.overdue}</p>
            <p className="text-[11px] text-muted mt-0.5">เลยกำหนด</p>
          </div>
          <div className={`rounded-xl border p-3 ${stats.today > 0 ? "border-amber-800/40 bg-amber-900/10" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${stats.today > 0 ? "text-amber-400" : "text-muted"}`}>{stats.today}</p>
            <p className="text-[11px] text-muted mt-0.5">งานวันนี้</p>
          </div>
          <div className="rounded-xl border border-blue-800/40 bg-blue-900/10 p-3">
            <p className="text-2xl font-bold text-blue-400">{stats.pmCount}</p>
            <p className="text-[11px] text-muted mt-0.5">PM Active</p>
          </div>
          <div className={`rounded-xl border p-3 ${stats.pendingReqs > 0 ? "border-purple-800/40 bg-purple-900/10" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${stats.pendingReqs > 0 ? "text-purple-400" : "text-muted"}`}>{stats.pendingReqs}</p>
            <p className="text-[11px] text-muted mt-0.5">Job Req รอรับ</p>
          </div>
        </div>
      )}

      {/* ── Main 3-column Grid ── */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          {/* Col 1: ภาระงานต่อช่าง */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-0.5">👤 ภาระงานต่อช่าง</h2>
            <p className="text-[10px] text-muted mb-4">Active · ⚠เลยกำหนด · ⏱รอรับ SLA</p>
            {workloadDetailed.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">ไม่มีงาน Active</p>
            ) : (() => {
              const maxA = Math.max(...workloadDetailed.map(w => w.active), 1);
              return (
                <div className="space-y-3">
                  {workloadDetailed.map(w => (
                    <div key={w.name}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium flex-1 truncate">{w.name}</span>
                        <span className="text-sm font-bold w-5 text-center">{w.active}</span>
                        {w.overdue > 0 && <span className="text-[10px] font-semibold text-red-400" title="เลยกำหนด">⚠{w.overdue}</span>}
                        {w.waitSla > 0 && <span className="text-[10px] font-semibold text-amber-400" title="รอรับ > SLA">⏱{w.waitSla}</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(w.active / maxA) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {unassigned.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[11px] font-semibold text-orange-400">📋 {unassigned.length} งานยังไม่มอบหมาย</p>
              </div>
            )}
          </div>

          {/* Col 2: SLA Performance */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-0.5">⏱️ SLA Performance</h2>
            <p className="text-[10px] text-muted mb-4">อัตราแก้งานทันเวลา · เฉลี่ย response / resolve</p>

            <div className="text-center mb-5">
              <p className={`text-5xl font-bold tabular-nums ${slaOnTimeRate === null ? "text-muted" : slaOnTimeRate >= 85 ? "text-green-400" : slaOnTimeRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                {slaOnTimeRate !== null ? `${slaOnTimeRate}%` : "—"}
              </p>
              <p className="text-[11px] text-muted mt-1">On-time ({slaOnTimeCount}/{ticketsWithResolve.length} งาน)</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">ตอบรับเฉลี่ย</span>
                <span className={`font-semibold ${avgResponse !== null && avgResponse > 4 ? "text-red-400" : "text-green-400"}`}>
                  {fmtHours(avgResponse)}
                  <span className="text-muted font-normal"> / เป้า 4h</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">แก้งานเฉลี่ย</span>
                <span className={`font-semibold ${avgResolve !== null && avgResolve > 48 ? "text-red-400" : "text-green-400"}`}>
                  {fmtHours(avgResolve)}
                  <span className="text-muted font-normal"> / เป้า 48h</span>
                </span>
              </div>
              <div className="border-t border-border pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted">ค้างรอรับ &gt; SLA</span>
                  <span className={`font-bold ${overdueAccept.length > 0 ? "text-red-400" : "text-green-400"}`}>{overdueAccept.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">เลย SLA แก้งาน</span>
                  <span className={`font-bold ${slaBreachedResolve.length > 0 ? "text-red-400" : "text-green-400"}`}>{slaBreachedResolve.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: ประเภทงาน Active */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-0.5">📊 ประเภทงาน (Active)</h2>
            <p className="text-[10px] text-muted mb-4">งานที่ยังอยู่ระหว่างดำเนินการ</p>
            {(() => {
              const totalA = Object.values(typeActive).reduce((a, b) => a + b, 0);
              const rows = [
                { label: "Repair (CM)",      count: typeActive.repair,  color: "bg-red-400",    icon: "🔧" },
                { label: "PM Service",        count: typeActive.pm,      color: "bg-blue-400",   icon: "📅" },
                { label: "Installation",      count: typeActive.install, color: "bg-green-400",  icon: "🔌" },
                { label: "Site / Tech Survey",count: typeActive.survey,  color: "bg-yellow-400", icon: "📍" },
                { label: "After-Sales / MA",  count: typeActive.after,   color: "bg-purple-400", icon: "🛡️" },
              ];
              return (
                <div className="space-y-3">
                  {rows.map(r => (
                    <div key={r.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">{r.icon} {r.label}</span>
                        <span className="text-sm font-bold">{r.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <div className={`h-full rounded-full ${r.color} transition-all`}
                          style={{ width: totalA > 0 ? `${(r.count / totalA) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted pt-1 border-t border-border">รวม {totalA} งาน active จาก {list.length} ทั้งหมด</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Urgent & Schedule Details (2 columns) ── */}
      {!loading && (overdueList.length > 0 || overdueAccept.length > 0 || todayList.length > 0 || pmUpcoming.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Left: งานค้าง / เลยกำหนด */}
          <div className="space-y-3">
            {overdueList.length > 0 && (
              <div className="rounded-xl bg-card border border-red-800/40 p-4">
                <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ งานเลยกำหนดนัด ({overdueList.length})</h3>
                <div className="space-y-0">
                  {overdueList.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2 border-b border-border last:border-0">
                      <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                      <p className="text-[11px] text-muted">นัด {t.service_date}{t.technician && ` · ${t.technician}`}</p>
                    </div>
                  ))}
                  {overdueList.length > 5 && <p className="text-[10px] text-muted pt-1">+{overdueList.length - 5} รายการ</p>}
                </div>
              </div>
            )}
            {overdueAccept.length > 0 && (
              <div className="rounded-xl bg-card border border-amber-800/40 p-4">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">⏱ รอรับงาน &gt; SLA ({overdueAccept.length})</h3>
                <div className="space-y-0">
                  {overdueAccept.slice(0, 4).map(t => {
                    const elapsed = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000;
                    return (
                      <div key={t.id} className="py-2 border-b border-border last:border-0 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                          <p className="text-[11px] text-muted">
                            {t.assignment_mode === "all" ? "📢 broadcast" : t.technician ? `👤 ${t.technician}` : "ไม่ได้ระบุ"}
                          </p>
                        </div>
                        <span className="text-red-400 font-semibold text-xs shrink-0">{fmtHours(elapsed)}</span>
                      </div>
                    );
                  })}
                  {overdueAccept.length > 4 && <p className="text-[10px] text-muted pt-1">+{overdueAccept.length - 4} รายการ</p>}
                </div>
              </div>
            )}
          </div>

          {/* Right: งานวันนี้ + PM ใกล้ครบ */}
          <div className="space-y-3">
            {todayList.length > 0 && (
              <div className="rounded-xl bg-card border border-amber-800/40 p-4">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">📅 งานวันนี้ ({todayList.length})</h3>
                <div className="space-y-0">
                  {todayList.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2 border-b border-border last:border-0">
                      <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                      <p className="text-[11px] text-muted">{t.technician || "ยังไม่มอบหมาย"}</p>
                    </div>
                  ))}
                  {todayList.length > 5 && <p className="text-[10px] text-muted pt-1">+{todayList.length - 5} รายการ</p>}
                </div>
              </div>
            )}
            {pmUpcoming.length > 0 && (
              <div className="rounded-xl bg-card border border-blue-800/40 p-4">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">🔵 PM ครบกำหนด 14 วัน ({pmUpcoming.length})</h3>
                <div className="space-y-0">
                  {pmUpcoming.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2 border-b border-border last:border-0 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{t.customer_name}</p>
                        <p className="text-[11px] text-muted">{t.technician || "ยังไม่มอบหมาย"}</p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${t.service_date === today ? "text-red-400" : "text-blue-400"}`}>{t.service_date}</span>
                    </div>
                  ))}
                  {pmUpcoming.length > 5 && <p className="text-[10px] text-muted pt-1">+{pmUpcoming.length - 5} รายการ</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Advanced Stats Toggles (Revenue & SLA Detail hidden by default) ── */}
      {!loading && list.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {/* Revenue toggle */}
          <button onClick={() => setShowRevenue(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${showRevenue ? "border-purple-500/50 bg-purple-900/10 text-purple-300" : "border-border bg-card text-muted hover:bg-card-hover"}`}>
            <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showRevenue ? "bg-purple-500" : "bg-border"}`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${showRevenue ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </span>
            💎 ยอดขาย / Revenue &amp; GP
          </button>
          {/* SLA Detail toggle */}
          <button onClick={() => setShowSlaDetail(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${showSlaDetail ? "border-rose-500/50 bg-rose-900/10 text-rose-300" : "border-border bg-card text-muted hover:bg-card-hover"}`}>
            <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showSlaDetail ? "bg-rose-500" : "bg-border"}`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${showSlaDetail ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </span>
            ⏱️ SLA Analysis รายละเอียด
          </button>
        </div>
      )}

      {/* ── Revenue / Profit Section (HIDDEN BY DEFAULT — ห้ามลบโค้ด) ── */}
      {!loading && list.length > 0 && showRevenue && (
        <div className="rounded-xl bg-purple-900/10 border border-purple-800/40 p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-purple-300">💎 ยอดที่ทีม Service สร้างให้บริษัท</p>
              <p className="text-[10px] text-purple-300/60">รายได้ + กำไรจากงานที่ปิดแล้ว · ใส่ตัวเลขในฟอร์มเมื่อปิดงาน</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">รายได้รวม (เดือนนี้)</p><p className="text-lg font-bold text-purple-400">{(monthRevenue / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">{monthCompleted.length} งาน</p></div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">กำไรเดือนนี้</p><p className="text-lg font-bold text-green-400">{(monthProfit / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">{monthRevenue > 0 ? `${(monthProfit / monthRevenue * 100).toFixed(1)}% GP` : "—"}</p></div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">รายได้สะสมทั้งหมด</p><p className="text-lg font-bold">{(completedRevenue / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">{completed.length} งานปิด</p></div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">กำไรสะสม</p><p className="text-lg font-bold text-green-400">{(completedProfit / 1000).toLocaleString()}K</p><p className={`text-[10px] ${completedGP >= 20 ? "text-green-400" : completedGP >= 10 ? "text-yellow-400" : "text-muted"}`}>{completedGP > 0 ? `GP ${completedGP.toFixed(1)}%` : "—"}</p></div>
            <div className="rounded-lg bg-card border border-amber-800/40 p-3"><p className="text-[10px] text-muted">รอปิดงาน</p><p className="text-lg font-bold text-amber-400">{(pendingRevenue / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">กำไรคาด {(pendingProfit / 1000).toLocaleString()}K</p></div>
          </div>
          {(techRevenue.length > 0 || typeRevenue.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-purple-400 mb-2">🏆 Top ช่างที่สร้างยอด</h3>
                {techRevenue.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีตัวเลขรายได้</p> : (
                  <div className="space-y-1.5">{techRevenue.map((t, i) => { const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "; return (<div key={t.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span>{medal}</span><span className="flex-1 truncate font-medium">{t.name}</span><span className="text-muted">{t.jobs} งาน</span><span className="text-purple-400 font-semibold w-16 text-right">{(t.revenue / 1000).toLocaleString()}K</span><span className="text-green-400 w-14 text-right">{(t.profit / 1000).toLocaleString()}K</span><span className={`text-[10px] w-12 text-right ${t.gp >= 20 ? "text-green-400" : t.gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{t.gp.toFixed(1)}%</span></div>); })}<p className="text-[10px] text-muted pt-1">รายได้ · กำไร · GP%</p></div>
                )}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-purple-400 mb-2">📊 แยกตามประเภทงาน</h3>
                {typeRevenue.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีตัวเลขรายได้</p> : (
                  <div className="space-y-1.5">{typeRevenue.map(t => (<div key={t.type} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate font-medium">{t.label}</span><span className="text-muted">{t.jobs} งาน</span><span className="text-purple-400 font-semibold w-16 text-right">{(t.revenue / 1000).toLocaleString()}K</span><span className="text-green-400 w-14 text-right">{(t.profit / 1000).toLocaleString()}K</span><span className={`text-[10px] w-12 text-right ${t.gp >= 20 ? "text-green-400" : t.gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{t.gp.toFixed(1)}%</span></div>))}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SLA Analysis Detail Section (HIDDEN BY DEFAULT — ห้ามลบโค้ด) ── */}
      {!loading && list.length > 0 && showSlaDetail && (
        <div className="rounded-xl bg-rose-900/10 border border-rose-800/40 p-3 mb-4">
          <p className="text-xs font-semibold text-rose-300 mb-3">⏱️ Delay Analysis รายละเอียด (ความล่าช้า + SLA) — ใช้ทำแผนพัฒนา</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-[10px] text-muted">เวลาตอบรับเฉลี่ย</p><p className={`text-lg font-bold ${avgResponse !== null && avgResponse > 4 ? "text-red-400" : avgResponse !== null && avgResponse > 2 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(avgResponse)}</p><p className="text-[10px] text-muted">{ticketsWithAccept.length} งาน · เป้า ≤4h</p></div>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-[10px] text-muted">เวลาแก้งานเฉลี่ย</p><p className={`text-lg font-bold ${avgResolve !== null && avgResolve > 48 ? "text-red-400" : avgResolve !== null && avgResolve > 24 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(avgResolve)}</p><p className="text-[10px] text-muted">{ticketsWithResolve.length} งาน · เป้า ≤48h</p></div>
            <button onClick={() => setStatusFilter("open")} className="rounded-lg bg-card border border-rose-800/30 p-3 text-left hover:bg-card-hover"><p className="text-lg font-bold text-red-400">{overdueAccept.length}</p><p className="text-[10px] text-muted">เลย SLA ตอบรับ (open)</p></button>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-lg font-bold text-red-400">{slaBreachedResolve.length}</p><p className="text-[10px] text-muted">เลย SLA แก้งาน</p></div>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-lg font-bold text-amber-400">{list.filter(t => t.status === "open" && !t.accepted_at).length}</p><p className="text-[10px] text-muted">งานรอตอบรับ</p></div>
          </div>
          {(techResponse.length > 0 || typeResolve.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-rose-400 mb-2">⏱️ เวลาตอบรับเฉลี่ย ต่อช่าง <span className="text-muted font-normal">(ช้า → เร็ว)</span></h3>
                {techResponse.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีข้อมูลตอบรับ</p> : (<div className="space-y-1.5">{techResponse.map(t => (<div key={t.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate font-medium">{t.name}</span><span className="text-muted">{t.count} งาน</span><span className={`font-semibold w-16 text-right ${t.avgHours > 4 ? "text-red-400" : t.avgHours > 2 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(t.avgHours)}</span></div>))}</div>)}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-rose-400 mb-2">⏱️ เวลาแก้งานเฉลี่ย ต่อประเภท <span className="text-muted font-normal">(นาน → สั้น)</span></h3>
                {typeResolve.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีข้อมูลแก้งาน</p> : (<div className="space-y-1.5">{typeResolve.map(t => (<div key={t.type} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate font-medium">{t.label}</span><span className="text-muted">{t.count} งาน</span><span className={`font-semibold w-16 text-right ${t.avgHours > 48 ? "text-red-400" : t.avgHours > 24 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(t.avgHours)}</span><span className="text-muted text-[10px] w-14 text-right">{fmtHours(t.maxHours)}</span></div>))}<p className="text-[10px] text-muted pt-1">เฉลี่ย · นานสุด</p></div>)}
              </div>
            </div>
          )}
          {overdueAccept.length > 0 && (
            <div className="rounded-xl bg-card border border-red-800/50 p-3">
              <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ งานค้างรอรับ &gt; SLA ({overdueAccept.length})</h3>
              <div className="space-y-1">
                {overdueAccept.slice(0, 5).map(t => { const elapsed = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000; const sla = t.sla_response_hours || 4; return (<div key={t.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate"><span className="font-medium">{typeLabels[t.type]}</span><span className="text-muted"> — {t.customer_name}</span></span><span className="text-muted">{t.assignment_mode === "all" ? "📢 broadcast" : t.assignment_mode === "by_skill" ? `🛠️ ${t.target_skill}` : t.assignment_mode === "by_area" ? `📍 ${t.target_area}` : t.technician ? `👤 ${t.technician}` : "ไม่ได้ระบุ"}</span><span className="text-red-400 font-semibold w-20 text-right">{fmtHours(elapsed)} (เลย {fmtHours(elapsed - sla)})</span></div>); })}
                {overdueAccept.length > 5 && <p className="text-[10px] text-muted pt-1">และอีก {overdueAccept.length - 5} รายการ...</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New Ticket Form (unchanged) ── */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <p className="text-xs text-muted uppercase mb-2">📞 ข้อมูลแจ้ง <span className="normal-case text-muted/60">(Admin บันทึกเมื่อรับแจ้ง)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">Admin ผู้รับแจ้ง</label><input placeholder="ชื่อ admin" value={form.reported_by} onChange={(e) => setForm({ ...form, reported_by: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">ช่องทางแจ้ง</label><select value={form.report_channel} onChange={(e) => setForm({ ...form, report_channel: e.target.value as NonNullable<ServiceTicket["report_channel"]> })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{Object.entries(channelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">วันที่ลูกค้าแจ้ง</label><input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลงาน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">ประเภทงาน</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ServiceTicket["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{svcTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">ความสำคัญ</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as NonNullable<ServiceTicket["priority"]> })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="low">🟢 ต่ำ</option><option value="medium">🟡 ปกติ</option><option value="high">🟠 สูง</option><option value="critical">🔴 วิกฤต</option></select></div>
            <div><label className="text-[10px] text-muted">ลูกค้า</label><select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">โปรเจค</label><select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">วันนัด</label><input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div>
              <label className="text-[10px] text-muted">🖥️ Asset / อุปกรณ์ที่เกี่ยวข้อง</label>
              <select value={form.asset_id} onChange={e => selectAsset(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                <option value="">-- ไม่ระบุ --</option>
                {assetList.filter(a => !form.customer_id || a.customer_id === form.customer_id).filter(a => a.status !== "decommissioned").map(a => (<option key={a.id} value={a.id}>{a.km_number} — {a.device_model} ({a.serial_number})</option>))}
              </select>
              {form.asset_id && <p className="text-[10px] text-accent mt-0.5">KM: {form.km_number} · <a href={`/assets/${form.asset_id}`} target="_blank" rel="noreferrer" className="hover:underline">ดู Asset →</a></p>}
            </div>
            <div className="col-span-full"><label className="text-[10px] text-muted">รายละเอียด *</label><textarea placeholder="Issue / Description" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-20 resize-y mt-1" /></div>
          </div>
          <p className="text-xs text-muted uppercase mb-2">📤 มอบหมายงาน <span className="normal-case text-accent">— เลือกวิธีกระจายงานให้ทีม Service</span></p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {(Object.keys(modeLabel) as Array<NonNullable<ServiceTicket["assignment_mode"]>>).map(m => (
              <button key={m} onClick={() => setForm({ ...form, assignment_mode: m })} className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${form.assignment_mode === m ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                <p className="text-base">{modeIcon[m]}</p>
                <p className="font-medium">{modeLabel[m].replace(/^[^\s]+ /, "")}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {form.assignment_mode === "individual" && (<div className="md:col-span-2"><label className="text-[10px] text-muted">เลือกช่าง</label><select value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกช่าง --</option>{svcUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.position && ` (${u.position})`}</option>)}</select></div>)}
            {form.assignment_mode === "all" && (<p className="md:col-span-2 text-[11px] text-muted bg-background rounded-lg border border-border px-3 py-2">📢 งานนี้จะกระจายให้ <b>{svcUsers.length} ช่าง Active</b> ทุกคน — ใครรับก่อน คนนั้นได้งาน</p>)}
            {form.assignment_mode === "by_skill" && (<div className="md:col-span-2"><label className="text-[10px] text-muted">ความถนัดที่ต้องการ</label><input placeholder="เช่น CCTV, Network, Solar, ไฟฟ้า" value={form.target_skill} onChange={(e) => setForm({ ...form, target_skill: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>)}
            {form.assignment_mode === "by_area" && (<div className="md:col-span-2"><label className="text-[10px] text-muted">พื้นที่รับผิดชอบ</label><input placeholder="เช่น สุราษฎร์ฯ, ภาคใต้ตอนบน, อ.เมือง" value={form.target_area} onChange={(e) => setForm({ ...form, target_area: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>)}
          </div>
          <p className="text-xs text-muted uppercase mb-2">⏱️ SLA <span className="normal-case text-muted/60">(เวลาเป้าหมาย)</span></p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">เวลาตอบรับเป้าหมาย (ชม.)</label><input type="number" placeholder="4" value={form.sla_response_hours || ""} onChange={(e) => setForm({ ...form, sla_response_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">เวลาแก้งานเป้าหมาย (ชม.)</label><input type="number" placeholder="48" value={form.sla_resolve_hours || ""} onChange={(e) => setForm({ ...form, sla_resolve_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>
          <p className="text-xs text-muted uppercase mb-2">💎 รายได้ <span className="normal-case text-purple-400">— กรอกเมื่อปิดงาน (ไม่บังคับ)</span></p>
          <div className="rounded-lg border border-purple-800/20 bg-purple-900/5 px-3 py-2 text-[11px] text-purple-300/70 mb-3">
            💡 ต้นทุนรายการ (ค่าแรง · เดินทาง · อะไหล่) บันทึกได้ใน <span className="font-semibold text-purple-300">👁 Detail → 💰 ต้นทุน</span> หลังสร้าง Ticket แล้ว
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">รายได้เรียกเก็บ (THB)</label><input type="number" placeholder="0" value={form.service_value || ""} onChange={(e) => updateMoney("service_value", Number(e.target.value))} className="w-full rounded-lg bg-background border border-purple-800/40 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 mt-1" /></div>
            <div><label className="text-[10px] text-muted">ชั่วโมงทำงาน (ไม่บังคับ)</label><input type="number" step="0.5" placeholder="0" value={form.hours_spent || ""} onChange={(e) => updateMoney("hours_spent", Number(e.target.value))} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>
          <button onClick={handleSave} disabled={saving || !form.issue.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}

      {/* ── Search + Filter ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          placeholder="ค้นหา issue / ลูกค้า..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-40 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent text-muted">
          <option value="">ทุกประเภท</option>
          {svcTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | ServiceStatus)}
          className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent text-muted">
          <option value="all">ทุกสถานะ</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{statusIcon[s]} {statusLabel[s]}</option>)}
        </select>
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ</p>
      </div>

      {/* ── Ticket Detail Drawer ── */}
      {selectedTicket && (
        <ServiceTicketDetail
          ticket={selectedTicket}
          allTickets={list}
          currentUserName={currentUser?.name || ""}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={(t, s) => changeStatus(t, s)}
        />
      )}

      {/* ── Ticket List ── */}
      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">ไม่พบงาน</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const overdue = t.service_date && t.service_date < today && isActive(t.status);
            const responseH = hoursBetween(t.opened_at, t.accepted_at ?? t.acknowledged_at);
            const workH     = hoursBetween(t.started_at ?? t.repair_start_at, t.resolved_at);
            const totalH    = hoursBetween(t.opened_at, t.resolved_at);
            const slaResp   = t.sla_response_hours || 4;
            const slaResolve = t.sla_resolve_hours || 48;
            const pendingH  = t.status === "open" && t.opened_at ? (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 : null;
            return (
              <div key={t.id} className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium">{typeLabels[t.type]}</p>
                      {t.priority && t.priority !== "medium" && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${priorityBadge[t.priority]}`}>{priorityLabel[t.priority]}</span>
                      )}
                      {t.assignment_mode && (
                        <span className="text-[10px] text-muted" title={modeLabel[t.assignment_mode]}>{modeIcon[t.assignment_mode]}{t.assignment_mode === "by_skill" && t.target_skill ? ` ${t.target_skill}` : t.assignment_mode === "by_area" && t.target_area ? ` ${t.target_area}` : ""}</span>
                      )}
                      {overdue && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">⚠ เลยกำหนด</span>}
                    </div>
                    <p className="text-sm text-muted">{t.issue}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {t.km_number && t.asset_id && (<Link href={`/assets/${t.asset_id}`} className="rounded px-1.5 py-0.5 bg-cyan-900/50 text-cyan-400 text-[10px] font-mono hover:underline">🖥️ {t.km_number}</Link>)}
                      {t.km_number && !t.asset_id && (<span className="rounded px-1.5 py-0.5 bg-cyan-900/30 text-cyan-400/70 text-[10px] font-mono">🖥️ {t.km_number}</span>)}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {t.customer_name}{t.project_name && ` · ${t.project_name}`}
                      {t.technician && ` · 🔧 ${t.technician}`}
                      {t.service_date && <> · <span className={overdue ? "text-red-400" : ""}>📅 {t.service_date}</span></>}
                      {t.reported_by && <> · 📞 {t.reported_by}{t.report_channel && ` (${channelLabel[t.report_channel]})`}</>}
                    </p>
                    {t.opened_at && (
                      <div className="flex items-center gap-1 text-[10px] mt-1.5 flex-wrap">
                        <span className="text-muted">⏱️</span>
                        {responseH !== null ? (
                          <span className={`rounded px-1.5 py-0.5 ${responseH > slaResp ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`}>รับใน {fmtHours(responseH)}</span>
                        ) : pendingH !== null && (
                          <span className={`rounded px-1.5 py-0.5 ${pendingH > slaResp ? "bg-red-900/50 text-red-400" : "bg-amber-900/50 text-amber-400"}`}>รอรับ {fmtHours(pendingH)}{pendingH > slaResp && " ⚠"}</span>
                        )}
                        {workH !== null && <span className="rounded px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400">ทำ {fmtHours(workH)}</span>}
                        {totalH !== null && <span className={`rounded px-1.5 py-0.5 ${totalH > slaResolve ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>รวม {fmtHours(totalH)}{totalH > slaResolve && " ⚠"}</span>}
                        {t.accepted_by && t.accepted_by !== t.technician && <span className="text-muted">· รับโดย {t.accepted_by}</span>}
                      </div>
                    )}
                    {(t.service_value || 0) > 0 && showRevenue && (
                      <p className="text-xs mt-1">
                        💎 รายได้ <span className="text-purple-400 font-semibold">{(t.service_value || 0).toLocaleString()}</span>
                        {(t.service_cost || 0) > 0 && <> · ต้นทุน {(t.service_cost || 0).toLocaleString()}</>}
                        <span className={`ml-1 font-semibold ${(t.gross_profit || 0) > 0 ? "text-green-400" : "text-red-400"}`}>
                          · กำไร {(t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))).toLocaleString()}
                          {(t.service_value || 0) > 0 && <> ({((t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))) / (t.service_value || 1) * 100).toFixed(1)}%)</>}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 ml-3 items-end">
                    <select value={t.status} onChange={(e) => changeStatus(t, e.target.value as ServiceStatus)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${statusColor[t.status] || "bg-gray-700 text-gray-300"}`}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{statusIcon[s]} {statusLabel[s]}</option>)}
                    </select>
                    <button onClick={() => setSelectedTicket(t)} className="text-[10px] text-accent hover:underline">👁 Detail</button>
                    <button onClick={() => handleDelete(t.id!)} className="text-[10px] text-danger hover:underline">ลบ</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
