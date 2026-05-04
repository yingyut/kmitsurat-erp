"use client";
import { useEffect, useState } from "react";
import type { ServiceTicket, Customer, Project, JobRequest, User } from "@/lib/types";

const svcTypes = ["installation","site_survey","technical_survey","after_sales","repair","pm_service"] as const;
const typeLabels: Record<string, string> = { installation: "Installation", site_survey: "Site Survey", technical_survey: "Technical Survey", after_sales: "After-Sales", repair: "Repair", pm_service: "PM Service" };
const empty = {
  customer_id: "", customer_name: "", project_id: "", project_name: "",
  type: "installation" as ServiceTicket["type"], issue: "", technician: "", service_date: "",
  status: "open" as ServiceTicket["status"],
  service_value: 0, service_cost: 0, gross_profit: 0, hours_spent: 0,
  // Reporter
  reported_by: "", report_date: "", report_channel: "phone" as NonNullable<ServiceTicket["report_channel"]>,
  // Routing
  assignment_mode: "individual" as NonNullable<ServiceTicket["assignment_mode"]>,
  target_skill: "", target_area: "",
  // SLA defaults
  sla_response_hours: 4, sla_resolve_hours: 48,
};

const channelLabel: Record<string, string> = { phone: "📞 โทรศัพท์", line: "💬 Line", email: "✉️ อีเมล", walk_in: "🚶 มาที่หน้าร้าน", system: "💻 ระบบ" };
const modeLabel: Record<string, string> = { individual: "👤 ระบุช่าง", all: "📢 ทุกคนในทีม", by_skill: "🛠️ ตามความถนัด", by_area: "📍 ตามพื้นที่" };
const modeIcon: Record<string, string> = { individual: "👤", all: "📢", by_skill: "🛠️", by_area: "📍" };

// Time helpers
function parseISO(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}
function hoursBetween(from?: string, to?: string): number | null {
  const a = parseISO(from);
  const b = parseISO(to);
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
const statusLabel: Record<string, string> = { open: "เปิดใหม่", in_progress: "กำลังทำ", resolved: "แก้ไขแล้ว", closed: "ปิดงาน" };
const statusColor: Record<string, string> = { open: "bg-red-900/50 text-red-400", in_progress: "bg-yellow-900/50 text-yellow-400", resolved: "bg-green-900/50 text-green-400", closed: "bg-gray-700 text-gray-300" };

export default function ServicePage() {
  const [list, setList] = useState<ServiceTicket[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [svcUsers, setSvcUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceTicket["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [t, c, p, jr, u] = await Promise.all([fs.serviceTickets.list(), fs.customers.list(), fs.projects.list(), fs.jobRequests.list(), fs.users.list()]);
      setList(t); setCusts(c); setProjs(p);
      setIncomingReqs(jr.filter(j => j.request_to_team === "service"));
      setSvcUsers(u.filter(x => x.active && x.role === "service"));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Filter
  const filtered = list.filter((t) => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.issue.toLowerCase().includes(s) || t.customer_name.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Dashboard stats (from full list)
  const today = todayStr();
  const isActive = (st: ServiceTicket["status"]) => st !== "resolved" && st !== "closed";
  const overdueList = list.filter(t => t.service_date && t.service_date < today && isActive(t.status));
  const todayList = list.filter(t => t.service_date === today && isActive(t.status));
  const stats = {
    total: list.length,
    open: list.filter(t => t.status === "open").length,
    inProgress: list.filter(t => t.status === "in_progress").length,
    resolved: list.filter(t => t.status === "resolved").length,
    closed: list.filter(t => t.status === "closed").length,
    overdue: overdueList.length,
    today: todayList.length,
    pendingReqs: incomingReqs.filter(r => r.status === "pending").length,
    pmCount: list.filter(t => t.type === "pm_service" && isActive(t.status)).length,
  };

  // Workload per technician
  const workload = svcUsers.map(u => ({
    name: u.name,
    active: list.filter(t => t.technician === u.name && isActive(t.status)).length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active).slice(0, 5);

  // === Revenue / Profit (เป้าหมายหลักของบริษัท) ===
  // Money is realized once ticket is resolved/closed. Track from full list, separate completed vs pending.
  const completed = list.filter(t => t.status === "resolved" || t.status === "closed");
  const pending = list.filter(t => isActive(t.status));
  const sumValue = (arr: ServiceTicket[]) => arr.reduce((s, t) => s + (t.service_value || 0), 0);
  const sumProfit = (arr: ServiceTicket[]) => arr.reduce((s, t) => s + (t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))), 0);
  const completedRevenue = sumValue(completed);
  const completedProfit = sumProfit(completed);
  const completedGP = completedRevenue > 0 ? (completedProfit / completedRevenue * 100) : 0;
  const pendingRevenue = sumValue(pending);
  const pendingProfit = sumProfit(pending);
  // Current-month subset
  const currentMonth = today.slice(0, 7);
  const monthCompleted = completed.filter(t => (t.service_date || "").slice(0, 7) === currentMonth);
  const monthRevenue = sumValue(monthCompleted);
  const monthProfit = sumProfit(monthCompleted);

  // Per-technician revenue
  const techRevenue = svcUsers.map(u => {
    const mine = completed.filter(t => t.technician === u.name);
    const rev = sumValue(mine);
    const profit = sumProfit(mine);
    return { name: u.name, jobs: mine.length, revenue: rev, profit, gp: rev > 0 ? (profit / rev * 100) : 0 };
  }).filter(t => t.revenue > 0 || t.jobs > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Per-type breakdown
  const typeRevenue = svcTypes.map(tt => {
    const mine = completed.filter(t => t.type === tt);
    const rev = sumValue(mine);
    const profit = sumProfit(mine);
    return { type: tt, label: typeLabels[tt], jobs: mine.length, revenue: rev, profit, gp: rev > 0 ? (profit / rev * 100) : 0 };
  }).filter(x => x.revenue > 0 || x.jobs > 0).sort((a, b) => b.revenue - a.revenue);

  // === DELAY / SLA ANALYSIS (เพื่อทำแผนพัฒนา) ===
  const ticketsWithAccept = list.filter(t => t.opened_at && t.accepted_at);
  const responseHours = ticketsWithAccept.map(t => hoursBetween(t.opened_at, t.accepted_at) ?? 0);
  const avgResponse = responseHours.length > 0 ? avg(responseHours) : null;

  const ticketsWithResolve = list.filter(t => t.opened_at && t.resolved_at);
  const resolveHours = ticketsWithResolve.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
  const avgResolve = resolveHours.length > 0 ? avg(resolveHours) : null;

  const nowMs = Date.now();
  const overdueAccept = list.filter(t => {
    if (t.status !== "open" || !t.opened_at) return false;
    const sla = t.sla_response_hours || 4;
    const h = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000;
    return h > sla;
  });

  const slaBreachedResolve = list.filter(t => {
    if (!t.opened_at || !t.resolved_at) return false;
    const sla = t.sla_resolve_hours || 48;
    const h = hoursBetween(t.opened_at, t.resolved_at);
    return h !== null && h > sla;
  });

  // Per-technician response performance
  const techResponse = svcUsers.map(u => {
    const mine = ticketsWithAccept.filter(t => (t.accepted_by || t.technician) === u.name);
    const hours = mine.map(t => hoursBetween(t.opened_at, t.accepted_at) ?? 0);
    return { name: u.name, count: mine.length, avgHours: hours.length > 0 ? avg(hours) : 0 };
  }).filter(x => x.count > 0).sort((a, b) => b.avgHours - a.avgHours);

  // Per-type resolve performance
  const typeResolve = svcTypes.map(tt => {
    const mine = ticketsWithResolve.filter(t => t.type === tt);
    const hours = mine.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
    return {
      type: tt, label: typeLabels[tt], count: mine.length,
      avgHours: hours.length > 0 ? avg(hours) : 0,
      maxHours: hours.length > 0 ? Math.max(...hours) : 0,
      slaTarget: 48, // default; could pull from tickets if uniform
    };
  }).filter(x => x.count > 0).sort((a, b) => b.avgHours - a.avgHours);

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); }

  function updateMoney(field: "service_value" | "service_cost" | "hours_spent", val: number) {
    const next = { ...form, [field]: val };
    next.gross_profit = (next.service_value || 0) - (next.service_cost || 0);
    setForm(next);
  }

  async function handleSave() {
    if (!form.issue.trim()) return; setSaving(true);
    const { serviceTickets } = await import("@/lib/firestore");
    const now = new Date().toISOString();
    const payload = {
      ...form,
      gross_profit: (form.service_value || 0) - (form.service_cost || 0),
      opened_at: now, // record creation timestamp for delay tracking
    };
    try { await serviceTickets.add(payload as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { serviceTickets } = await import("@/lib/firestore"); await serviceTickets.remove(id); await load(); }

  // Change status with auto-timestamps. Optional `who` for accepted_by tracking.
  async function changeStatus(t: ServiceTicket, newStatus: ServiceTicket["status"], who?: string) {
    if (newStatus === t.status) return;
    const fs = await import("@/lib/firestore");
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status: newStatus };
    // Cumulative timestamp setting — fill any earlier transitions that didn't happen yet
    if (["in_progress", "resolved", "closed"].includes(newStatus) && !t.accepted_at) {
      update.accepted_at = now;
      if (who && !t.accepted_by) update.accepted_by = who;
    }
    if (["in_progress", "resolved", "closed"].includes(newStatus) && !t.started_at) update.started_at = now;
    if (["resolved", "closed"].includes(newStatus) && !t.resolved_at) update.resolved_at = now;
    if (newStatus === "closed" && !t.closed_at) update.closed_at = now;
    // Backfill opened_at if missing (legacy tickets)
    if (!t.opened_at) update.opened_at = now;
    await fs.serviceTickets.update(t.id!, update);
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      {/* Incoming Job Requests */}
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
                      <button onClick={async () => {
                        const assignTo = (document.getElementById(`svc-assign-${r.id}`) as HTMLSelectElement)?.value;
                        const note = prompt("หมายเหตุรับงาน (ไม่บังคับ)") || "";
                        const { jobRequests } = await import("@/lib/firestore");
                        await jobRequests.update(r.id!, { status: "accepted", assigned_to: assignTo, accept_note: note }); await load();
                      }} className="text-[10px] bg-green-800/50 text-green-400 rounded px-2 py-1 hover:bg-green-800">✓ รับงาน</button>
                      <button onClick={async () => {
                        const reason = prompt("เหตุผลที่ปฏิเสธ:");
                        if (!reason) return;
                        const { jobRequests } = await import("@/lib/firestore");
                        await jobRequests.update(r.id!, { status: "rejected", reject_reason: reason }); await load();
                      }} className="text-[10px] bg-red-800/50 text-red-400 rounded px-2 py-1 hover:bg-red-800">✗ ปฏิเสธ</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="งานบริการ — ติดตั้ง / ซ่อม / PM">Service Tickets</h1>
          <p className="text-xs text-muted">ใบแจ้งงานบริการ — ติดตั้ง, Site Survey, ซ่อม, PM Service</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Ticket"}</button>
      </div>

      {/* Dashboard */}
      {!loading && (
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <button onClick={() => setStatusFilter("all")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">ทั้งหมด</p>
            </button>
            <button onClick={() => setStatusFilter("open")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "open" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-red-400">{stats.open}</p>
              <p className="text-[10px] text-muted">เปิดใหม่</p>
            </button>
            <button onClick={() => setStatusFilter("in_progress")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "in_progress" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-yellow-400">{stats.inProgress}</p>
              <p className="text-[10px] text-muted">กำลังทำ</p>
            </button>
            <button onClick={() => setStatusFilter("resolved")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "resolved" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-green-400">{stats.resolved}</p>
              <p className="text-[10px] text-muted">แก้ไขแล้ว</p>
            </button>
            <button onClick={() => setStatusFilter("closed")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "closed" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-gray-300">{stats.closed}</p>
              <p className="text-[10px] text-muted">ปิดงาน</p>
            </button>
            <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-2.5">
              <p className="text-base font-bold text-red-400">{stats.overdue}</p>
              <p className="text-[10px] text-muted">เลยกำหนด</p>
            </div>
            <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-2.5">
              <p className="text-base font-bold text-amber-400">{stats.today}</p>
              <p className="text-[10px] text-muted">งานวันนี้</p>
            </div>
            <div className="rounded-lg border border-purple-800/50 bg-purple-900/10 p-2.5">
              <p className="text-base font-bold text-purple-400">{stats.pendingReqs}</p>
              <p className="text-[10px] text-muted">Job Requests รอรับ</p>
            </div>
          </div>

          {(overdueList.length > 0 || todayList.length > 0 || workload.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ เลยกำหนด ({overdueList.length})</h3>
                {overdueList.length === 0 ? <p className="text-[11px] text-muted">ไม่มี</p> : overdueList.slice(0, 3).map(t => (
                  <div key={t.id} className="text-[11px] py-1 border-b border-border last:border-0">
                    <p className="truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                    <p className="text-muted">นัด {t.service_date}{t.technician && ` · ${t.technician}`}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">📅 งานวันนี้ ({todayList.length})</h3>
                {todayList.length === 0 ? <p className="text-[11px] text-muted">ไม่มี</p> : todayList.slice(0, 3).map(t => (
                  <div key={t.id} className="text-[11px] py-1 border-b border-border last:border-0">
                    <p className="truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                    <p className="text-muted">{t.technician || "ยังไม่มอบหมาย"}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">👤 ภาระงานต่อช่าง (Active)</h3>
                {workload.length === 0 ? <p className="text-[11px] text-muted">ไม่มีงาน Active</p> : workload.map(w => (
                  <div key={w.name} className="flex justify-between text-[11px] py-1 border-b border-border last:border-0">
                    <span>{w.name}</span>
                    <span className="font-semibold">{w.active} งาน</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === REVENUE / PROFIT (ทีม Service สร้างยอดให้บริษัท) === */}
      {!loading && list.length > 0 && (
        <div className="rounded-xl bg-purple-900/10 border border-purple-800/40 p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-purple-300">💎 ยอดที่ทีม Service สร้างให้บริษัท</p>
              <p className="text-[10px] text-purple-300/60">รายได้ + กำไรจากงานที่ปิดแล้ว · ใส่ตัวเลขในฟอร์มเมื่อปิดงาน</p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg bg-card border border-purple-800/40 p-3">
              <p className="text-[10px] text-muted">รายได้รวม (เดือนนี้)</p>
              <p className="text-lg font-bold text-purple-400">{(monthRevenue / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">{monthCompleted.length} งาน</p>
            </div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3">
              <p className="text-[10px] text-muted">กำไรเดือนนี้</p>
              <p className="text-lg font-bold text-green-400">{(monthProfit / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">{monthRevenue > 0 ? `${(monthProfit / monthRevenue * 100).toFixed(1)}% GP` : "—"}</p>
            </div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3">
              <p className="text-[10px] text-muted">รายได้สะสมทั้งหมด</p>
              <p className="text-lg font-bold">{(completedRevenue / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">{completed.length} งานปิด</p>
            </div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3">
              <p className="text-[10px] text-muted">กำไรสะสม</p>
              <p className="text-lg font-bold text-green-400">{(completedProfit / 1000).toLocaleString()}K</p>
              <p className={`text-[10px] ${completedGP >= 20 ? "text-green-400" : completedGP >= 10 ? "text-yellow-400" : "text-muted"}`}>{completedGP > 0 ? `GP ${completedGP.toFixed(1)}%` : "—"}</p>
            </div>
            <div className="rounded-lg bg-card border border-amber-800/40 p-3" title="งาน active ที่มีตัวเลขรายได้แล้ว แต่ยังไม่ปิด">
              <p className="text-[10px] text-muted">รอปิดงาน</p>
              <p className="text-lg font-bold text-amber-400">{(pendingRevenue / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">กำไรคาด {(pendingProfit / 1000).toLocaleString()}K</p>
            </div>
          </div>

          {/* Per-technician + Per-type */}
          {(techRevenue.length > 0 || typeRevenue.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-purple-400 mb-2">🏆 Top ช่างที่สร้างยอด</h3>
                {techRevenue.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีตัวเลขรายได้</p> : (
                  <div className="space-y-1.5">
                    {techRevenue.map((t, i) => {
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
                      return (
                        <div key={t.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0">
                          <span>{medal}</span>
                          <span className="flex-1 truncate font-medium">{t.name}</span>
                          <span className="text-muted">{t.jobs} งาน</span>
                          <span className="text-purple-400 font-semibold w-16 text-right">{(t.revenue / 1000).toLocaleString()}K</span>
                          <span className="text-green-400 w-14 text-right">{(t.profit / 1000).toLocaleString()}K</span>
                          <span className={`text-[10px] w-12 text-right ${t.gp >= 20 ? "text-green-400" : t.gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{t.gp.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted pt-1">รายได้ · กำไร · GP%</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-purple-400 mb-2">📊 แยกตามประเภทงาน</h3>
                {typeRevenue.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีตัวเลขรายได้</p> : (
                  <div className="space-y-1.5">
                    {typeRevenue.map(t => (
                      <div key={t.type} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0">
                        <span className="flex-1 truncate font-medium">{t.label}</span>
                        <span className="text-muted">{t.jobs} งาน</span>
                        <span className="text-purple-400 font-semibold w-16 text-right">{(t.revenue / 1000).toLocaleString()}K</span>
                        <span className="text-green-400 w-14 text-right">{(t.profit / 1000).toLocaleString()}K</span>
                        <span className={`text-[10px] w-12 text-right ${t.gp >= 20 ? "text-green-400" : t.gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{t.gp.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === DELAY / SLA ANALYSIS === */}
      {!loading && list.length > 0 && (
        <div className="rounded-xl bg-rose-900/10 border border-rose-800/40 p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-rose-300">⏱️ Delay Analysis (ความล่าช้า + SLA)</p>
              <p className="text-[10px] text-rose-300/60">วิเคราะห์เวลาตอบรับและแก้งาน — ใช้ทำแผนพัฒนา</p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg bg-card border border-rose-800/30 p-3">
              <p className="text-[10px] text-muted">เวลาตอบรับเฉลี่ย</p>
              <p className={`text-lg font-bold ${avgResponse !== null && avgResponse > 4 ? "text-red-400" : avgResponse !== null && avgResponse > 2 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(avgResponse)}</p>
              <p className="text-[10px] text-muted">{ticketsWithAccept.length} งาน · เป้า ≤4h</p>
            </div>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3">
              <p className="text-[10px] text-muted">เวลาแก้งานเฉลี่ย</p>
              <p className={`text-lg font-bold ${avgResolve !== null && avgResolve > 48 ? "text-red-400" : avgResolve !== null && avgResolve > 24 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(avgResolve)}</p>
              <p className="text-[10px] text-muted">{ticketsWithResolve.length} งาน · เป้า ≤48h</p>
            </div>
            <button onClick={() => setStatusFilter("open")} className="rounded-lg bg-card border border-rose-800/30 p-3 text-left hover:bg-card-hover">
              <p className="text-lg font-bold text-red-400">{overdueAccept.length}</p>
              <p className="text-[10px] text-muted">เลย SLA ตอบรับ (open)</p>
            </button>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3">
              <p className="text-lg font-bold text-red-400">{slaBreachedResolve.length}</p>
              <p className="text-[10px] text-muted">เลย SLA แก้งาน</p>
            </div>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3" title="งาน open ที่ยังไม่มีใครรับ">
              <p className="text-lg font-bold text-amber-400">{list.filter(t => t.status === "open" && !t.accepted_at).length}</p>
              <p className="text-[10px] text-muted">งานรอตอบรับ</p>
            </div>
          </div>

          {/* Per-tech / Per-type */}
          {(techResponse.length > 0 || typeResolve.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-rose-400 mb-2">⏱️ เวลาตอบรับเฉลี่ย ต่อช่าง <span className="text-muted font-normal">(ช้า → เร็ว)</span></h3>
                {techResponse.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีข้อมูลตอบรับ</p> : (
                  <div className="space-y-1.5">
                    {techResponse.map(t => (
                      <div key={t.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0">
                        <span className="flex-1 truncate font-medium">{t.name}</span>
                        <span className="text-muted">{t.count} งาน</span>
                        <span className={`font-semibold w-16 text-right ${t.avgHours > 4 ? "text-red-400" : t.avgHours > 2 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(t.avgHours)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-rose-400 mb-2">⏱️ เวลาแก้งานเฉลี่ย ต่อประเภท <span className="text-muted font-normal">(นาน → สั้น)</span></h3>
                {typeResolve.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีข้อมูลแก้งาน</p> : (
                  <div className="space-y-1.5">
                    {typeResolve.map(t => (
                      <div key={t.type} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0">
                        <span className="flex-1 truncate font-medium">{t.label}</span>
                        <span className="text-muted">{t.count} งาน</span>
                        <span className={`font-semibold w-16 text-right ${t.avgHours > 48 ? "text-red-400" : t.avgHours > 24 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(t.avgHours)}</span>
                        <span className="text-muted text-[10px] w-14 text-right" title="ใช้เวลานานสุด">{fmtHours(t.maxHours)}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted pt-1">เฉลี่ย · นานสุด</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending acceptance overdue */}
          {overdueAccept.length > 0 && (
            <div className="rounded-xl bg-card border border-red-800/50 p-3">
              <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ งานค้างรอรับ &gt; SLA ({overdueAccept.length})</h3>
              <div className="space-y-1">
                {overdueAccept.slice(0, 5).map(t => {
                  const elapsed = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000;
                  const sla = t.sla_response_hours || 4;
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0">
                      <span className="flex-1 truncate">
                        <span className="font-medium">{typeLabels[t.type]}</span>
                        <span className="text-muted"> — {t.customer_name}</span>
                      </span>
                      <span className="text-muted">
                        {t.assignment_mode === "all" ? "📢 broadcast" : t.assignment_mode === "by_skill" ? `🛠️ ${t.target_skill}` : t.assignment_mode === "by_area" ? `📍 ${t.target_area}` : t.technician ? `👤 ${t.technician}` : "ไม่ได้ระบุ"}
                      </span>
                      <span className="text-red-400 font-semibold w-20 text-right">{fmtHours(elapsed)} (เลย {fmtHours(elapsed - sla)})</span>
                    </div>
                  );
                })}
                {overdueAccept.length > 5 && <p className="text-[10px] text-muted pt-1">และอีก {overdueAccept.length - 5} รายการ...</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          {/* Reporter */}
          <p className="text-xs text-muted uppercase mb-2">📞 ข้อมูลแจ้ง <span className="normal-case text-muted/60">(Admin บันทึกเมื่อรับแจ้ง)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">Admin ผู้รับแจ้ง</label><input placeholder="ชื่อ admin" value={form.reported_by} onChange={(e) => setForm({ ...form, reported_by: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">ช่องทางแจ้ง</label><select value={form.report_channel} onChange={(e) => setForm({ ...form, report_channel: e.target.value as NonNullable<ServiceTicket["report_channel"]> })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{Object.entries(channelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">วันที่ลูกค้าแจ้ง</label><input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>

          {/* Job info */}
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลงาน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">ประเภทงาน</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ServiceTicket["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{svcTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">สถานะ</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceTicket["status"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
            <div><label className="text-[10px] text-muted">ลูกค้า</label><select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">โปรเจค</label><select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">วันนัด</label><input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div></div>
            <div className="col-span-full"><label className="text-[10px] text-muted">รายละเอียด *</label><textarea placeholder="Issue / Description" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-20 resize-y mt-1" /></div>
          </div>

          {/* Routing */}
          <p className="text-xs text-muted uppercase mb-2">📤 มอบหมายงาน <span className="normal-case text-accent">— เลือกวิธีกระจายงานให้ทีม Service</span></p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {(Object.keys(modeLabel) as Array<NonNullable<ServiceTicket["assignment_mode"]>>).map(m => (
              <button
                key={m}
                onClick={() => setForm({ ...form, assignment_mode: m })}
                className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${form.assignment_mode === m ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}
              >
                <p className="text-base">{modeIcon[m]}</p>
                <p className="font-medium">{modeLabel[m].replace(/^[^\s]+ /, "")}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {form.assignment_mode === "individual" && (
              <div className="md:col-span-2">
                <label className="text-[10px] text-muted">เลือกช่าง</label>
                <select value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">-- เลือกช่าง --</option>
                  {svcUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.position && ` (${u.position})`}</option>)}
                </select>
              </div>
            )}
            {form.assignment_mode === "all" && (
              <p className="md:col-span-2 text-[11px] text-muted bg-background rounded-lg border border-border px-3 py-2">📢 งานนี้จะกระจายให้ <b>{svcUsers.length} ช่าง Active</b> ทุกคน — ใครรับก่อน คนนั้นได้งาน (ระบบจะเซ็ต technician = คนรับ)</p>
            )}
            {form.assignment_mode === "by_skill" && (
              <div className="md:col-span-2">
                <label className="text-[10px] text-muted">ความถนัดที่ต้องการ</label>
                <input placeholder="เช่น CCTV, Network, Solar, ไฟฟ้า" value={form.target_skill} onChange={(e) => setForm({ ...form, target_skill: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                <p className="text-[10px] text-muted mt-0.5">ระบบจะกระจายเฉพาะช่างที่มีทักษะนี้ (อนาคต — ตอนนี้ใช้ดูประกอบ)</p>
              </div>
            )}
            {form.assignment_mode === "by_area" && (
              <div className="md:col-span-2">
                <label className="text-[10px] text-muted">พื้นที่รับผิดชอบ</label>
                <input placeholder="เช่น สุราษฎร์ฯ, ภาคใต้ตอนบน, อ.เมือง" value={form.target_area} onChange={(e) => setForm({ ...form, target_area: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                <p className="text-[10px] text-muted mt-0.5">ระบบจะกระจายเฉพาะช่างที่ดูแลพื้นที่นี้ (อนาคต)</p>
              </div>
            )}
          </div>

          {/* SLA */}
          <p className="text-xs text-muted uppercase mb-2">⏱️ SLA <span className="normal-case text-muted/60">(เวลาเป้าหมาย — ใช้ตรวจ delay)</span></p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">เวลาตอบรับเป้าหมาย (ชม.)</label><input type="number" placeholder="4" value={form.sla_response_hours || ""} onChange={(e) => setForm({ ...form, sla_response_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">เวลาแก้งานเป้าหมาย (ชม.)</label><input type="number" placeholder="48" value={form.sla_resolve_hours || ""} onChange={(e) => setForm({ ...form, sla_resolve_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>

          {/* Money section */}
          <p className="text-xs text-muted uppercase mb-2">💎 มูลค่างาน <span className="normal-case text-purple-400">— กรอกเมื่อปิดงานเพื่อสรุปยอดทีม Service</span></p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted">รายได้เรียกเก็บ (THB)</label>
              <input type="number" placeholder="0" value={form.service_value || ""} onChange={(e) => updateMoney("service_value", Number(e.target.value))} className="w-full rounded-lg bg-background border border-purple-800/40 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ต้นทุน (อะไหล่+แรง+เดินทาง)</label>
              <input type="number" placeholder="0" value={form.service_cost || ""} onChange={(e) => updateMoney("service_cost", Number(e.target.value))} className="w-full rounded-lg bg-background border border-purple-800/40 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">กำไรขั้นต้น (auto)</label>
              <div className="w-full rounded-lg bg-background border border-purple-800/20 px-3 py-2 text-sm mt-1">
                <span className={`font-semibold ${(form.gross_profit || 0) > 0 ? "text-green-400" : (form.gross_profit || 0) < 0 ? "text-red-400" : "text-muted"}`}>{(form.gross_profit || 0).toLocaleString()}</span>
                {form.service_value > 0 && <span className="text-[10px] text-muted ml-1">({((form.gross_profit || 0) / form.service_value * 100).toFixed(1)}%)</span>}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted">ชั่วโมงทำงาน</label>
              <input type="number" step="0.5" placeholder="0" value={form.hours_spent || ""} onChange={(e) => updateMoney("hours_spent", Number(e.target.value))} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !form.issue.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mb-3">
        <input placeholder="ค้นหา issue / ลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ {statusFilter !== "all" && <span className="text-accent">· {statusLabel[statusFilter]}</span>}</p>
      </div>
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบงาน</p> : (
        <div className="space-y-2">{filtered.map((t) => {
          const overdue = t.service_date && t.service_date < today && isActive(t.status);
          // Timeline calculations
          const responseH = hoursBetween(t.opened_at, t.accepted_at);
          const workH = hoursBetween(t.started_at, t.resolved_at);
          const totalH = hoursBetween(t.opened_at, t.resolved_at);
          const slaResp = t.sla_response_hours || 4;
          const slaResolve = t.sla_resolve_hours || 48;
          // Pending acceptance elapsed
          const pendingH = t.status === "open" && t.opened_at ? (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 : null;
          return (
            <div key={t.id} className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-medium">{typeLabels[t.type]}</p>
                    {t.assignment_mode && (
                      <span className="text-[10px] text-muted" title={modeLabel[t.assignment_mode]}>{modeIcon[t.assignment_mode]}{t.assignment_mode === "by_skill" && t.target_skill ? ` ${t.target_skill}` : t.assignment_mode === "by_area" && t.target_area ? ` ${t.target_area}` : ""}</span>
                    )}
                    {overdue && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">⚠ เลยกำหนด</span>}
                  </div>
                  <p className="text-sm text-muted">{t.issue}</p>
                  <p className="text-xs text-muted mt-1">
                    {t.customer_name}{t.project_name && ` · ${t.project_name}`}
                    {t.technician && ` · 🔧 ${t.technician}`}
                    {t.service_date && <> · <span className={overdue ? "text-red-400" : ""}>📅 {t.service_date}</span></>}
                    {t.reported_by && <> · 📞 {t.reported_by}{t.report_channel && ` (${channelLabel[t.report_channel]})`}</>}
                  </p>

                  {/* Timeline */}
                  {t.opened_at && (
                    <div className="flex items-center gap-1 text-[10px] mt-1.5 flex-wrap">
                      <span className="text-muted">⏱️</span>
                      {responseH !== null ? (
                        <span className={`rounded px-1.5 py-0.5 ${responseH > slaResp ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`} title={`เปิด → รับงาน${responseH > slaResp ? ` (เลย SLA ${slaResp}h)` : ""}`}>รับใน {fmtHours(responseH)}</span>
                      ) : pendingH !== null && (
                        <span className={`rounded px-1.5 py-0.5 ${pendingH > slaResp ? "bg-red-900/50 text-red-400" : "bg-amber-900/50 text-amber-400"}`} title={`รอรับ ${fmtHours(pendingH)}, SLA ${slaResp}h`}>รอรับ {fmtHours(pendingH)}{pendingH > slaResp && " ⚠"}</span>
                      )}
                      {workH !== null && (
                        <span className="rounded px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400" title="เริ่ม → เสร็จ">ทำ {fmtHours(workH)}</span>
                      )}
                      {totalH !== null && (
                        <span className={`rounded px-1.5 py-0.5 ${totalH > slaResolve ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`} title={`เปิด → เสร็จ${totalH > slaResolve ? ` (เลย SLA ${slaResolve}h)` : ""}`}>รวม {fmtHours(totalH)}{totalH > slaResolve && " ⚠"}</span>
                      )}
                      {t.accepted_by && t.accepted_by !== t.technician && <span className="text-muted">· รับโดย {t.accepted_by}</span>}
                    </div>
                  )}

                  {(t.service_value || 0) > 0 && (
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

                {/* Status dropdown + delete */}
                <div className="flex flex-col gap-1.5 shrink-0 ml-3 items-end">
                  <select
                    value={t.status}
                    onChange={(e) => changeStatus(t, e.target.value as ServiceTicket["status"])}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${statusColor[t.status]}`}
                    title="เปลี่ยนสถานะ — ระบบบันทึก timestamp อัตโนมัติ"
                  >
                    <option value="open">เปิดใหม่</option>
                    <option value="in_progress">กำลังทำ</option>
                    <option value="resolved">แก้ไขแล้ว</option>
                    <option value="closed">ปิดงาน</option>
                  </select>
                  <button onClick={() => handleDelete(t.id!)} className="text-[10px] text-danger hover:underline">ลบ</button>
                </div>
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
