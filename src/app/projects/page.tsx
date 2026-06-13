"use client";
import { useEffect, useState, useMemo } from "react";
import type { Project, Customer, User, ProjectType, ServiceContract } from "@/lib/types";
import Link from "next/link";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import CsvImportExport from "@/components/CsvImportExport";

const PROJ_COLS = [
  { key: "name",          label: "ชื่อโปรเจค" },
  { key: "customer_name", label: "ลูกค้า" },
  { key: "status",        label: "สถานะ" },
  { key: "value",         label: "มูลค่า (THB)" },
  { key: "assigned_to",   label: "เจ้าของ" },
  { key: "type",          label: "ประเภทงาน" },
  { key: "probability",   label: "โอกาสชนะ (%)" },
  { key: "expected_close_date", label: "วันปิดดีล" },
  { key: "notes",         label: "หมายเหตุ" },
];

const OVERVIEW_DATE_LABELS = { all: "ทั้งหมด", month: "เดือนนี้", quarter: "ไตรมาสนี้", year: "ปีนี้" } as const;
type OverviewDateMode = keyof typeof OVERVIEW_DATE_LABELS;

// Ownership thresholds (days without activity)
const AT_RISK_DAYS = 30;
const OPEN_DAYS = 60;

type OwnershipStatus = "active" | "at_risk" | "open" | "pending_transfer" | "none";

function ownershipOf(p: Project): OwnershipStatus {
  if (p.ownership_status === "pending_transfer") return "pending_transfer";
  if (p.assigned_to_inactive) return "open";
  if (!p.last_activity_date) return "none";
  const days = Math.floor((Date.now() - new Date(p.last_activity_date).getTime()) / 86400000);
  if (days <= AT_RISK_DAYS) return "active";
  if (days <= OPEN_DAYS) return "at_risk";
  return "open";
}

const OWNERSHIP_BADGE: Record<OwnershipStatus, { label: string; cls: string } | null> = {
  active:           null,
  none:             null,
  at_risk:          { label: "⚠ ขาดการอัปเดต", cls: "bg-amber-600 text-white border-amber-700" },
  open:             { label: "🔓 ไม่มีเจ้าของ",  cls: "bg-red-700 text-white border-red-800" },
  pending_transfer: { label: "📋 รอโอนงาน",     cls: "bg-blue-700 text-white border-blue-800" },
};

function getProjDate(p: Project): Date | null {
  const v = (p as unknown as Record<string, unknown>).created_at;
  if (!v) return null;
  if (typeof v === "object" && "toDate" in (v as object)) return (v as { toDate(): Date }).toDate();
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

const contractTypeMeta: Record<string, { label: string; icon: string; color: string }> = {
  product_warranty:      { label: "รับประกันสินค้า",     icon: "🛡️", color: "bg-blue-700 text-white" },
  installation_warranty: { label: "รับประกันงานติดตั้ง", icon: "🔧", color: "bg-purple-700 text-white" },
  service_contract:      { label: "สัญญา MA",            icon: "📋", color: "bg-green-700 text-white" },
};
function daysUntilDate(date?: string): number | null {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(date);
  if (isNaN(t.getTime())) return null;
  return Math.floor((t.getTime() - today.getTime()) / 86400000);
}

const statuses = ["lead", "opportunity", "proposal", "negotiation", "won", "lost"] as const;
const statusLabels: Record<string, string> = { lead: "Lead", opportunity: "Opportunity", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const statusColor: Record<string, string> = { lead: "bg-slate-500 text-white", opportunity: "bg-blue-700 text-white", proposal: "bg-purple-700 text-white", negotiation: "bg-amber-700 text-white", won: "bg-green-700 text-white", lost: "bg-red-700 text-white" };

const emptyForm = {
  name: "", customer_id: "", customer_name: "", type: "", job_types: [] as string[], value: 0,
  status: "lead" as Project["status"], assigned_to: "", notes: "",
  win_loss_reason: "", lost_competitor: "",
  re_engage: false, re_engage_date: "", re_engage_note: "",
  reminder_date: "", reminder_type: "none" as Project["reminder_type"], reminder_sent: false,
  reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "",
};

export default function ProjectsPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [list, setList] = useState<Project[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pTypes, setPTypes] = useState<ProjectType[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Detail
  const [detail, setDetail] = useState<Project | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const [showSummary, setShowSummary] = useState(() => { try { return localStorage.getItem("pipeline_showSummary") !== "false"; } catch { return true; } });
  const [ownerFilter, setOwnerFilter] = useState("all");

  // Customer quick-create
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCust, setNewCust] = useState({ company_name: "", contact_name: "", phone: "", email: "" });
  const [custSearch, setCustSearch] = useState("");

  // Job type inline add
  const [newTypeName, setNewTypeName] = useState("");

  // Overview / drill-down
  const [pipelineView, setPipelineView] = useState<"overview" | "list">("overview");
  const [drillUser, setDrillUser] = useState<string | null>(null);
  const [overviewDateMode, setOverviewDateMode] = useState<OverviewDateMode>("month");

  // Ownership transfer
  const [showTransferModal, setShowTransferModal] = useState<Project | null>(null);
  const [transferNote, setTransferNote] = useState("");

  // Multi-sale overlap detection
  const [custOverlap, setCustOverlap] = useState<Project[]>([]);

  // Filtered customers for search
  const filteredCusts = custSearch ? custs.filter(c => c.company_name.toLowerCase().includes(custSearch.toLowerCase()) || c.contact_name.toLowerCase().includes(custSearch.toLowerCase())) : custs;

  // Data isolation: legacy sale/avenger + new roles without view_all_projects see own pipeline only
  const myRole = currentUser?.role ?? "";
  const ownProjectsOnly = !!currentUser && !hasPermission("view_all_projects") &&
    (myRole === "sale" || myRole === "avenger" || isNewRole(myRole));
  const canManage = hasPermission("view_all_projects");
  const baseList = ownProjectsOnly ? list.filter(p => p.assigned_to === currentUser?.name) : list;

  // Alerts
  const today = new Date().toISOString().slice(0, 10);
  const reEngageAlerts = baseList.filter(p => p.re_engage && p.re_engage_date && p.re_engage_date <= today && p.status === "lost");
  const reminderAlerts = baseList.filter(p => p.reminder_date && p.reminder_date <= today && !p.reminder_sent);

  // Dashboard stats — scoped to own data when ownProjectsOnly
  const isClosed = (s: string) => s === "won" || s === "lost";
  const stats = {
    total: baseList.length,
    totalValue: baseList.reduce((s, p) => s + (p.value || 0), 0),
    active: baseList.filter(p => !isClosed(p.status)).length,
    activeValue: baseList.filter(p => !isClosed(p.status)).reduce((s, p) => s + (p.value || 0), 0),
    won: baseList.filter(p => p.status === "won").length,
    wonValue: baseList.filter(p => p.status === "won").reduce((s, p) => s + (p.value || 0), 0),
    lost: baseList.filter(p => p.status === "lost").length,
    lostValue: baseList.filter(p => p.status === "lost").reduce((s, p) => s + (p.value || 0), 0),
  };
  const closedCount = stats.won + stats.lost;
  const winRate = closedCount > 0 ? Math.round((stats.won / closedCount) * 100) : 0;

  // no-op — ข้อมูลอัปเดตอัตโนมัติผ่าน onSnapshot subscriptions
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function load() {}

  // Helpers for project ↔ contracts
  function contractsForProject(projectId: string): ServiceContract[] {
    return contracts.filter(c => c.project_id === projectId);
  }
  function contractCountForProject(projectId: string): number {
    return contractsForProject(projectId).length;
  }

  useEffect(() => {
    setMounted(true);
    const unsubs: Array<() => void> = [];
    let firstSnap = true;
    (async () => {
      const fs = await import("@/lib/firestore");
      unsubs.push(
        fs.projects.subscribe(data => {
          setList(data);
          if (firstSnap) { setLoading(false); firstSnap = false; }
        }),
        fs.customers.subscribe(data => setCusts(data)),
        fs.users.subscribe(data => setUsers(data.filter(x => x.active !== false))),
        fs.projectTypes.subscribe(data => setPTypes(data)),
        fs.serviceContracts.subscribe(data => setContracts(data)),
      );
    })();
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ownProjectsOnly) setPipelineView("list"); }, [ownProjectsOnly]);

  // Auto-expand project from ?open=<id> query param (e.g. deep-linked from Pipeline tab)
  useEffect(() => {
    if (list.length === 0) return;
    const openId = new URLSearchParams(window.location.search).get("open");
    if (!openId) return;
    setExpandedIds(prev => new Set([...prev, openId]));
    setPipelineView("list");
    setTimeout(() => {
      document.getElementById(`project-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const filtered = baseList.filter(p => {
    const matchSearch = search ? (p.name.toLowerCase().includes(search.toLowerCase()) || p.customer_name.toLowerCase().includes(search.toLowerCase())) : true;
    const matchStatus = statusFilter === "all" ? true : p.status === statusFilter;
    const matchOwner = ownerFilter === "all" ? true : p.assigned_to === ownerFilter;
    return matchSearch && matchStatus && matchOwner;
  });

  function selectCustomer(id: string) {
    const c = custs.find(x => x.id === id);
    setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" });
    // Check for active projects from other salespeople on the same customer
    if (id && currentUser) {
      const overlap = list.filter(p =>
        (p.customer_id === id || p.customer_name === c?.company_name) &&
        p.assigned_to !== currentUser.name &&
        !["won", "lost"].includes(p.status)
      );
      setCustOverlap(overlap);
    } else {
      setCustOverlap([]);
    }
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, assigned_to: ownProjectsOnly ? (currentUser?.name || "") : "" });
    setShowForm(true); setDetail(null);
  }
  function openEdit(p: Project) {
    setEditId(p.id!);
    setForm({
      name: p.name, customer_id: p.customer_id, customer_name: p.customer_name,
      type: p.type, job_types: p.job_types || (p.type ? [p.type] : []), value: p.value, status: p.status,
      assigned_to: ownProjectsOnly ? (currentUser?.name || p.assigned_to) : p.assigned_to,
      notes: p.notes,
      win_loss_reason: p.win_loss_reason || "", lost_competitor: p.lost_competitor || "",
      re_engage: p.re_engage || false, re_engage_date: p.re_engage_date || "", re_engage_note: p.re_engage_note || "",
      reminder_date: p.reminder_date || "", reminder_type: p.reminder_type || "none", reminder_sent: p.reminder_sent || false,
      reminder_to_name: p.reminder_to_name || "", reminder_to_email: p.reminder_to_email || "", reminder_cc_email: p.reminder_cc_email || "", reminder_note: p.reminder_note || "",
    });
    setShowForm(true); setDetail(null);
  }

  async function quickCreateCustomer() {
    if (!newCust.company_name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const ref = await fs.customers.add({ ...newCust, address: "", province: "", org_type: "private", notes: "" } as unknown as Record<string, unknown>);
      setForm({ ...form, customer_id: ref.id, customer_name: newCust.company_name });
      setNewCust({ company_name: "", contact_name: "", phone: "", email: "" });
      setShowNewCust(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function quickAddJobType() {
    if (!newTypeName.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      await fs.projectTypes.add({ name: newTypeName.trim(), description: "" });
      setForm({ ...form, job_types: [...(form.job_types || []), newTypeName.trim()] });
      setNewTypeName("");
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  function toggleJobType(typeName: string) {
    const arr = form.job_types || [];
    setForm({ ...form, job_types: arr.includes(typeName) ? arr.filter(t => t !== typeName) : [...arr, typeName] });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    // Sync type field for backward compat
    const saveData = { ...form, type: form.job_types?.length ? form.job_types.join(", ") : form.type };
    try {
      if (editId) {
        await fs.projects.update(editId, saveData as unknown as Record<string, unknown>);
      } else {
        const newData = { ...saveData, last_activity_date: today, ownership_status: "active" as const };
        await fs.projects.add(newData as unknown as Record<string, unknown>);
        try { await fs.logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "create", module: "projects", resource_name: form.name, details: `สร้างโปรเจกต์: ${form.name}` }); } catch {}
      }
      setForm(emptyForm); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบโปรเจค "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.projects.remove(id);
    if (detail?.id === id) setDetail(null);
    await load();
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function expandAll() { setExpandedIds(new Set(filtered.map(p => p.id!).filter(Boolean))); }
  function collapseAll() { setExpandedIds(new Set()); }
  function toggleSummary() { const v = !showSummary; setShowSummary(v); try { localStorage.setItem("pipeline_showSummary", String(v)); } catch {} }

  // Owner filter — only active users who have at least one project
  const activeUserNames = new Set(users.map(u => u.name));
  const owners = [...new Set(list.map(p => p.assigned_to).filter(Boolean))]
    .filter(name => activeUserNames.has(name));
  const filteredFinal = filtered.filter(p =>
    drillUser ? p.assigned_to === drillUser : (ownerFilter === "all" || p.assigned_to === ownerFilter)
  );

  // Overview stats
  const overviewFiltered = useMemo(() => {
    if (overviewDateMode === "all") return list;
    const now = new Date();
    const starts: Record<OverviewDateMode, Date> = {
      all: new Date(0),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      year: new Date(now.getFullYear(), 0, 1),
    };
    const s = starts[overviewDateMode];
    return list.filter(p => { const d = getProjDate(p); return !d || d >= s; });
  }, [list, overviewDateMode]);

  const salesStats = useMemo(() => {
    const names = [...new Set(overviewFiltered.map(p => p.assigned_to).filter(Boolean))]
      .filter(name => activeUserNames.size === 0 || activeUserNames.has(name));
    return names.map(name => {
      const ps = overviewFiltered.filter(p => p.assigned_to === name);
      const active = ps.filter(p => !isClosed(p.status));
      const won = ps.filter(p => p.status === "won");
      const lost = ps.filter(p => p.status === "lost");
      const closed = won.length + lost.length;
      return {
        name,
        total: ps.length,
        totalValue: ps.reduce((s, p) => s + (p.value || 0), 0),
        active: active.length,
        activeValue: active.reduce((s, p) => s + (p.value || 0), 0),
        won: won.length, wonValue: won.reduce((s, p) => s + (p.value || 0), 0),
        lost: lost.length, lostValue: lost.reduce((s, p) => s + (p.value || 0), 0),
        winRate: closed > 0 ? Math.round((won.length / closed) * 100) : 0,
        byStatus: Object.fromEntries(statuses.map(st => {
          const sp = ps.filter(p => p.status === st);
          return [st, { count: sp.length, value: sp.reduce((a, p) => a + (p.value || 0), 0) }];
        })) as Record<string, { count: number; value: number }>,
      };
    }).sort((a, b) => b.activeValue - a.activeValue);
  }, [overviewFiltered, users]);

  const teamKPIs = useMemo(() => {
    const lost = salesStats.reduce((s, x) => s + x.lost, 0);
    const won = salesStats.reduce((s, x) => s + x.won, 0);
    const closed = won + lost;
    return {
      active: salesStats.reduce((s, x) => s + x.active, 0),
      activeValue: salesStats.reduce((s, x) => s + x.activeValue, 0),
      won, wonValue: salesStats.reduce((s, x) => s + x.wonValue, 0),
      lost, total: salesStats.reduce((s, x) => s + x.total, 0),
      winRate: closed > 0 ? Math.round((won / closed) * 100) : 0,
    };
  }, [salesStats]);

  async function handleRequestTransfer(project: Project) {
    if (!transferNote.trim()) return;
    const fs = await import("@/lib/firestore");
    await fs.projects.update(project.id!, {
      ownership_status: "pending_transfer",
      transfer_requested_by: currentUser?.name ?? "",
      transfer_requested_at: today,
      transfer_note: transferNote,
    });
    setShowTransferModal(null);
    setTransferNote("");
    await load();
  }

  async function handleApproveTransfer(project: Project) {
    if (!confirm(`อนุมัติโอนงาน "${project.name}" ให้ ${project.transfer_requested_by} ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.projects.update(project.id!, {
      assigned_to: project.transfer_requested_by,
      assigned_to_inactive: false,
      ownership_status: "active",
      transfer_requested_by: "",
      transfer_requested_at: "",
      transfer_note: "",
      last_activity_date: today,
    });
    try { await fs.logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "update", module: "projects", resource_name: project.name, details: `โอนงาน: ${project.name} → ${project.transfer_requested_by}` }); } catch {}
    await load();
  }

  async function handleRejectTransfer(project: Project) {
    if (!confirm(`ปฏิเสธคำขอโอนงาน "${project.name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.projects.update(project.id!, {
      ownership_status: project.assigned_to_inactive ? "open" : "active",
      transfer_requested_by: "",
      transfer_requested_at: "",
      transfer_note: "",
    });
    await load();
  }

  async function markReminderSent(id: string) {
    const fs = await import("@/lib/firestore");
    await fs.projects.update(id, { reminder_sent: true });
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold" title="Sales Pipeline / โอกาสขาย">Sales Pipeline</h1>
          <p className="text-xs text-muted">โอกาสขาย / ดีล — ติดตามสถานะ Lead → Won/Lost วางแผน Re-engage</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!ownProjectsOnly && (
            <div className="flex bg-card border border-border/50 rounded-lg p-0.5">
              <button onClick={() => { setPipelineView("overview"); setDrillUser(null); }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${pipelineView === "overview" ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"}`}>
                🏢 ภาพรวมทีม
              </button>
              <button onClick={() => setPipelineView("list")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${pipelineView === "list" ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"}`}>
                📋 Pipeline
              </button>
            </div>
          )}
          <button onClick={openAdd} title="เพิ่มโปรเจคใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ โปรเจคใหม่</button>
        </div>
      </div>

      {/* ── TEAM OVERVIEW ── */}
      {pipelineView === "overview" && !ownProjectsOnly && !loading && (
        <div className="space-y-4">
          {/* Date filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-medium">ช่วงเวลา:</span>
            {(Object.keys(OVERVIEW_DATE_LABELS) as OverviewDateMode[]).map(m => (
              <button key={m} onClick={() => setOverviewDateMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${overviewDateMode === m ? "bg-accent text-white" : "bg-muted/10 text-muted/70 hover:bg-muted/20"}`}>
                {OVERVIEW_DATE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Team KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted/60 mb-1 truncate">Pipeline</p>
              <p className="text-2xl font-bold text-blue-400">{teamKPIs.active}</p>
              <p className="text-xs text-muted mt-0.5">฿{(teamKPIs.activeValue / 1e6).toFixed(1)}M</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted/60 mb-1 truncate">Won</p>
              <p className="text-2xl font-bold text-green-400">{teamKPIs.won}</p>
              <p className="text-xs text-muted mt-0.5">฿{(teamKPIs.wonValue / 1e6).toFixed(1)}M</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted/60 mb-1 truncate">Win Rate</p>
              <p className="text-2xl font-bold">{teamKPIs.winRate}<span className="text-base">%</span></p>
              <p className="text-xs text-muted mt-0.5 truncate">{teamKPIs.won}W / {teamKPIs.won + teamKPIs.lost} closed</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted/60 mb-1">ดีลทั้งหมด</p>
              <p className="text-2xl font-bold">{teamKPIs.total}</p>
              <p className="text-xs text-muted mt-0.5">{salesStats.length} เซลล์</p>
            </div>
          </div>

          {/* Sales rep cards */}
          {salesStats.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center text-muted text-sm">
              ยังไม่มีข้อมูลสำหรับช่วงเวลานี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salesStats.map(s => (
                <button key={s.name}
                  onClick={() => { setDrillUser(s.name); setPipelineView("list"); setOwnerFilter("all"); setStatusFilter("all"); setSearch(""); }}
                  className="text-left rounded-xl bg-card border border-border p-5 hover:border-accent/50 hover:bg-card-hover transition-all group">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-base shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted">{s.total} deals · {OVERVIEW_DATE_LABELS[overviewDateMode]}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.winRate >= 60 ? "bg-green-700 text-white" : s.winRate >= 40 ? "bg-amber-600 text-white" : "bg-slate-500 text-white"}`}>
                      {s.winRate}%
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="rounded-lg bg-card-hover border border-border py-2">
                      <p className="text-lg font-bold text-blue-400 leading-tight">{s.active}</p>
                      <p className="text-[10px] text-muted">Active</p>
                      <p className="text-[10px] text-muted">฿{(s.activeValue / 1e6).toFixed(1)}M</p>
                    </div>
                    <div className="rounded-lg bg-card-hover border border-border py-2">
                      <p className="text-lg font-bold text-green-400 leading-tight">{s.won}</p>
                      <p className="text-[10px] text-muted">Won</p>
                      <p className="text-[10px] text-muted">฿{(s.wonValue / 1e6).toFixed(1)}M</p>
                    </div>
                    <div className="rounded-lg bg-card-hover border border-border py-2">
                      <p className="text-lg font-bold text-red-400 leading-tight">{s.lost}</p>
                      <p className="text-[10px] text-muted">Lost</p>
                      <p className="text-[10px] text-muted">฿{(s.lostValue / 1e6).toFixed(1)}M</p>
                    </div>
                  </div>

                  {/* Mini funnel */}
                  {s.total > 0 && (
                    <div>
                      <div className="flex rounded-md overflow-hidden h-4 mb-1.5">
                        {statuses.filter(st => s.byStatus[st]?.count > 0).map(st => {
                          const cnt = s.byStatus[st]?.count ?? 0;
                          const pct = (cnt / s.total) * 100;
                          const colors: Record<string, string> = { lead: "bg-gray-500", opportunity: "bg-blue-500", proposal: "bg-purple-500", negotiation: "bg-yellow-500", won: "bg-green-500", lost: "bg-red-500" };
                          return <div key={st} className={`${colors[st]} flex items-center justify-center text-[8px] text-white font-medium`}
                            style={{ width: `${Math.max(pct, 8)}%` }} title={`${statusLabels[st]}: ${cnt}`}>{cnt}</div>;
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {statuses.filter(st => s.byStatus[st]?.count > 0).map(st => (
                          <span key={st} className={`text-[9px] px-1 rounded ${statusColor[st]}`}>{statusLabels[st]} {s.byStatus[st].count}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active share bar */}
                  {teamKPIs.activeValue > 0 && s.active > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-muted/60 mb-1">
                        <span>สัดส่วน Active</span>
                        <span>{Math.round((s.activeValue / teamKPIs.activeValue) * 100)}%</span>
                      </div>
                      <div className="bg-muted/15 rounded-full h-1">
                        <div className="bg-accent rounded-full h-1 transition-all"
                          style={{ width: `${Math.min((s.activeValue / teamKPIs.activeValue) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-accent/60 group-hover:text-accent mt-3 text-right">คลิกเพื่อดู Pipeline →</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIPELINE VIEW ── */}
      {(pipelineView === "list" || ownProjectsOnly) && (<>

      {/* Drill-down header */}
      {drillUser && (
        <div className="flex items-center gap-3 mb-4 rounded-xl bg-card border border-border px-4 py-3">
          <button onClick={() => { setDrillUser(null); setPipelineView("overview"); }}
            className="text-sm text-accent hover:underline shrink-0">← ภาพรวมทีม</button>
          <span className="text-muted/30">|</span>
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
            {drillUser.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{drillUser}</p>
            <p className="text-[11px] text-muted">
              {list.filter(p => p.assigned_to === drillUser).length} deals ·&nbsp;
              Active {list.filter(p => p.assigned_to === drillUser && !isClosed(p.status)).length} ·&nbsp;
              Won {list.filter(p => p.assigned_to === drillUser && p.status === "won").length}
            </p>
          </div>
        </div>
      )}

      {/* Pending Transfer Requests — manager/admin only */}
      {canManage && !drillUser && (() => {
        const pending = list.filter(p => p.ownership_status === "pending_transfer");
        if (pending.length === 0) return null;
        return (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-blue-400">📋 คำขอโอนงาน ({pending.length} รายการ)</p>
            {pending.map(p => (
              <div key={p.id} className="rounded-lg bg-blue-900/20 border border-blue-800 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted">{p.customer_name} · เจ้าของเดิม: {p.assigned_to || "ไม่มีเจ้าของ"}</p>
                  <p className="text-xs text-blue-400 mt-0.5">คำขอจาก: <b>{p.transfer_requested_by}</b>{p.transfer_requested_at && ` · ${p.transfer_requested_at}`}</p>
                  {p.transfer_note && <p className="text-xs text-muted mt-0.5">เหตุผล: {p.transfer_note}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApproveTransfer(p)} className="text-xs bg-green-800/50 text-green-400 border border-green-700/50 rounded px-3 py-1.5 hover:bg-green-800/80">✓ อนุมัติ</button>
                  <button onClick={() => handleRejectTransfer(p)} className="text-xs bg-red-800/50 text-red-400 border border-red-700/50 rounded px-3 py-1.5 hover:bg-red-800/80">✗ ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Alerts */}
      {(reEngageAlerts.length > 0 || reminderAlerts.length > 0) && (
        <div className="space-y-2 mb-4">
          {reEngageAlerts.map(p => (
            <div key={`re-${p.id}`} className="rounded-lg bg-amber-900/20 border border-amber-800 px-4 py-3 text-sm text-amber-400 flex items-center justify-between">
              <span>🔔 ถึงเวลา Re-engage: <b>{p.name}</b> ({p.customer_name}) — {p.re_engage_note}</span>
              <button onClick={() => openEdit(p)} className="text-xs bg-amber-800/50 rounded px-2 py-1 hover:bg-amber-800">เปิดแก้ไข</button>
            </div>
          ))}
          {reminderAlerts.map(p => (
            <div key={`rm-${p.id}`} className="rounded-lg bg-blue-900/20 border border-blue-800 px-4 py-3 text-sm text-blue-400 flex items-center justify-between">
              <div>
                <span>📧 แจ้งเตือน: <b>{p.name}</b> — กำหนด {p.reminder_date}</span>
                <span className="text-xs text-muted ml-2">
                  {p.reminder_to_name ? `→ ${p.reminder_to_name}` : ""}
                  {p.reminder_to_email ? ` (${p.reminder_to_email})` : ""}
                  {p.reminder_type === "both" ? " [อีเมล+ระบบ]" : p.reminder_type === "email" ? " [อีเมล]" : " [ระบบ]"}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => markReminderSent(p.id!)} className="text-xs bg-blue-800/50 rounded px-2 py-1 hover:bg-blue-800">✓ ส่งแล้ว</button>
                <button onClick={() => openEdit(p)} className="text-xs bg-blue-800/50 rounded px-2 py-1 hover:bg-blue-800">แก้ไข</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary + Pipeline — collapsible */}
      {!loading && list.length > 0 && showSummary && (
        <div className="rounded-xl bg-card border border-border p-4 mb-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div><p className="text-xs text-muted mb-0.5 truncate">Total Deals</p><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted">{(stats.totalValue/1e6).toFixed(1)}M THB</p></div>
            <div><p className="text-xs text-muted mb-0.5 truncate">Pipeline</p><p className="text-2xl font-bold text-blue-400">{stats.active}</p><p className="text-xs text-muted">{(stats.activeValue/1e6).toFixed(1)}M THB</p></div>
            <div><p className="text-xs text-muted mb-0.5 truncate">Won</p><p className="text-2xl font-bold text-green-400">{stats.won}</p><p className="text-xs text-muted">{(stats.wonValue/1e6).toFixed(1)}M THB</p></div>
            <div><p className="text-xs text-muted mb-0.5 truncate">Win Rate</p><p className="text-2xl font-bold">{winRate}<span className="text-lg">%</span></p><p className="text-xs text-muted truncate">{stats.won}W / {closedCount} closed</p></div>
          </div>

          {/* Stage buttons */}
          {(() => {
            const stageStyle: Record<string, { active: string; inactive: string; num: string }> = {
              lead:        { active: "border-slate-500 bg-slate-500/10",   inactive: "border-slate-500/30 bg-background hover:bg-slate-500/5",   num: "text-slate-400" },
              opportunity: { active: "border-blue-500 bg-blue-500/10",     inactive: "border-blue-500/30 bg-background hover:bg-blue-500/5",     num: "text-blue-400" },
              proposal:    { active: "border-purple-500 bg-purple-500/10", inactive: "border-purple-500/30 bg-background hover:bg-purple-500/5", num: "text-purple-400" },
              negotiation: { active: "border-yellow-500 bg-yellow-500/10", inactive: "border-yellow-500/30 bg-background hover:bg-yellow-500/5", num: "text-yellow-400" },
              won:         { active: "border-green-500 bg-green-500/10",   inactive: "border-green-500/30 bg-background hover:bg-green-500/5",   num: "text-green-400" },
              lost:        { active: "border-red-500 bg-red-500/10",       inactive: "border-red-500/30 bg-background hover:bg-red-500/5",       num: "text-red-400" },
            };
            return (
              <div className="overflow-x-auto -mx-1 px-1 pb-0.5">
                <div className="flex gap-1.5 w-max min-w-full">
                  {statuses.map(s => {
                    const count = list.filter(p => p.status === s).length;
                    const value = list.filter(p => p.status === s).reduce((sum, p) => sum + (p.value || 0), 0);
                    const st = stageStyle[s];
                    return (
                      <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                        className={`flex-1 min-w-[56px] rounded-lg border-2 px-2 py-2 text-center transition-all ${statusFilter === s ? st.active : st.inactive}`}>
                        <p className={`text-lg font-bold ${st.num}`}>{count}</p>
                        <p className="text-[9px] text-muted leading-tight">{statusLabels[s]}</p>
                        <p className="text-[9px] text-muted">{(value/1000).toFixed(0)}K</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Control bar */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <input placeholder="🔍 ค้นหาดีล..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[180px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg bg-card border border-border px-2 py-2 text-xs focus:outline-none focus:border-accent">
          <option value="all">ทุกสถานะ</option>
          {statuses.map(s => <option key={s} value={s}>{statusLabels[s]} ({list.filter(p => p.status === s).length})</option>)}
        </select>
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="rounded-lg bg-card border border-border px-2 py-2 text-xs focus:outline-none focus:border-accent">
          <option value="all">ทุกเซลล์</option>
          {owners.map(o => <option key={o} value={o}>{o.split(" ")[0]}</option>)}
        </select>
        <div className="flex gap-1 border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("compact")} title="Compact" className={`px-2.5 py-1.5 text-[10px] ${viewMode === "compact" ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>▤</button>
          <button onClick={() => setViewMode("detailed")} title="Detailed" className={`px-2.5 py-1.5 text-[10px] ${viewMode === "detailed" ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>☰</button>
        </div>
        <button onClick={toggleSummary} title={showSummary ? "ซ่อน Summary" : "แสดง Summary"} className="rounded-lg border border-border px-2 py-1.5 text-[10px] text-muted hover:bg-card-hover">{showSummary ? "▲ ซ่อน" : "▼ แสดง"}</button>
        <button onClick={expandAll} title="กางทั้งหมด" className="rounded-lg border border-border px-2 py-1.5 text-[10px] text-muted hover:bg-card-hover">⊞</button>
        <button onClick={collapseAll} title="หุบทั้งหมด" className="rounded-lg border border-border px-2 py-1.5 text-[10px] text-muted hover:bg-card-hover">⊟</button>
        <p className="text-[10px] text-muted">{filteredFinal.length} รายการ</p>
        <CsvImportExport
          filename={`pipeline-${new Date().toISOString().slice(0,10)}`}
          columns={PROJ_COLS}
          getData={() => filteredFinal as unknown as Record<string, unknown>[]}
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขโปรเจค" : "เพิ่มโปรเจคใหม่"}</h2>

          {/* Basic info */}
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลทั่วไป</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">ชื่อโปรเจค *</label><input placeholder="เช่น WiFi โรงเรียน ABC" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div>
              <label className="text-[10px] text-muted">ลูกค้า</label>
              <div className="flex gap-1.5 mt-1">
                <div className="flex-1">
                  <input placeholder="ค้นหาลูกค้า..." value={custSearch} onChange={e => setCustSearch(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-[10px] focus:outline-none focus:border-accent mb-1" />
                  <select value={form.customer_id} onChange={e => selectCustomer(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                    <option value="">-- เลือกลูกค้า --</option>
                    {filteredCusts.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => setShowNewCust(!showNewCust)} title="สร้างลูกค้าใหม่" className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-sm text-accent hover:bg-card-hover self-end">+</button>
              </div>
              {/* Multi-sale overlap warning */}
              {custOverlap.length > 0 && (
                <div className="mt-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 px-3 py-2">
                  <p className="text-[11px] text-amber-400 font-medium mb-1">⚡ ลูกค้านี้มีโปรเจคเปิดอยู่จากเซลล์อื่น ({custOverlap.length})</p>
                  <div className="space-y-0.5">
                    {custOverlap.map(p => (
                      <p key={p.id} className="text-[10px] text-amber-300/70">• {p.assigned_to}: {p.name} · <span className="opacity-60">{statusLabels[p.status]}</span></p>
                    ))}
                  </div>
                  <p className="text-[9px] text-amber-400/40 mt-1.5">คุณยังสร้างโปรเจคได้ — ระบบจะบันทึกแยกตามผู้รับผิดชอบ</p>
                </div>
              )}
              {showNewCust && (
                <div className="mt-2 p-3 rounded-lg bg-background border border-accent/50">
                  <p className="text-[10px] text-accent font-medium mb-2">สร้างลูกค้าใหม่</p>
                  <div className="space-y-1.5">
                    <input placeholder="ชื่อบริษัท *" value={newCust.company_name} onChange={e => setNewCust({ ...newCust, company_name: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <input placeholder="ชื่อผู้ติดต่อ" value={newCust.contact_name} onChange={e => setNewCust({ ...newCust, contact_name: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <input placeholder="เบอร์โทร" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <input placeholder="อีเมล" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={quickCreateCustomer} disabled={saving || !newCust.company_name.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "สร้าง"}</button>
                      <button type="button" onClick={() => setShowNewCust(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ยกเลิก</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="col-span-full">
              <label className="text-[10px] text-muted">ประเภทงาน (เลือกได้หลายชนิด)</label>
              {/* Selected tags */}
              {(form.job_types || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                  {(form.job_types || []).map(t => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-accent/20 text-accent px-2.5 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => toggleJobType(t)} className="hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Checkbox grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 mt-1 p-2 rounded-lg bg-background border border-border max-h-[120px] overflow-y-auto">
                {pTypes.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-card-hover rounded px-1.5 py-1">
                    <input type="checkbox" checked={(form.job_types || []).includes(t.name)} onChange={() => toggleJobType(t.name)} />
                    {t.name}
                  </label>
                ))}
              </div>
              {/* Inline add new type */}
              <div className="flex gap-1.5 mt-1.5">
                <input placeholder="เพิ่มประเภทใหม่..." value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent" />
                <button type="button" onClick={quickAddJobType} disabled={!newTypeName.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50">+ เพิ่ม</button>
              </div>
            </div>
            <div><label className="text-[10px] text-muted">มูลค่า (THB)</label><input type="number" placeholder="เช่น 500000" value={form.value || ""} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">สถานะ</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project["status"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
            <div>
              <label className="text-[10px] text-muted">ผู้รับผิดชอบ</label>
              {ownProjectsOnly ? (
                <div className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mt-1 flex items-center gap-2 text-muted">
                  <span className="text-xs">🔒</span>
                  <span className="text-foreground font-medium">{currentUser?.name}</span>
                </div>
              ) : (
                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">-- เลือกผู้รับผิดชอบ --</option>
                  {users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              )}
            </div>
            <div className="col-span-full"><label className="text-[10px] text-muted">หมายเหตุ</label><textarea placeholder="รายละเอียดเพิ่มเติม" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" /></div>
          </div>

          {/* Win/Loss reason */}
          {(form.status === "won" || form.status === "lost") && (<>
            <p className="text-xs text-muted uppercase mb-2">{form.status === "won" ? "เหตุผลที่ชนะงาน" : "เหตุผลที่แพ้งาน"}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <textarea placeholder={form.status === "won" ? "เหตุผลที่ชนะ เช่น ราคาดี, Solution ตรงความต้องการ" : "เหตุผลที่แพ้ เช่น ราคาสูงกว่าคู่แข่ง, ไม่ตรง Spec"} value={form.win_loss_reason} onChange={e => setForm({ ...form, win_loss_reason: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y" />
              {form.status === "lost" && (
                <input placeholder="คู่แข่งที่ชนะ เช่น บริษัท XYZ" value={form.lost_competitor} onChange={e => setForm({ ...form, lost_competitor: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              )}
            </div>
          </>)}

          {/* Re-engage plan (show for lost) */}
          {form.status === "lost" && (<>
            <p className="text-xs text-muted uppercase mb-2">แผนติดตามกลับ (Re-engage)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.re_engage} onChange={e => setForm({ ...form, re_engage: e.target.checked })} id="re-engage" />
                <label htmlFor="re-engage" className="text-sm">ต้องการติดตามกลับ</label>
              </div>
              {form.re_engage && (<>
                <input type="date" value={form.re_engage_date} onChange={e => setForm({ ...form, re_engage_date: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" title="วันที่จะเสนอใหม่" />
                <textarea placeholder="แผน Re-engage เช่น แพ้งาน MA ปีนี้ ปีหน้าจะเสนอใหม่ เตรียมราคาพิเศษ" value={form.re_engage_note} onChange={e => setForm({ ...form, re_engage_note: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-12 resize-y" />
              </>)}
            </div>
          </>)}

          {/* Reminder */}
          <p className="text-xs text-muted uppercase mb-2">แจ้งเตือนล่วงหน้า</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div><label className="text-[10px] text-muted">วันที่แจ้งเตือน</label><input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">ช่องทางแจ้งเตือน</label><select value={form.reminder_type} onChange={e => setForm({ ...form, reminder_type: e.target.value as Project["reminder_type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="none">ไม่แจ้งเตือน</option><option value="email">อีเมลเท่านั้น</option><option value="system">ระบบ (Dashboard) เท่านั้น</option><option value="both">ทั้งอีเมลและระบบ</option></select></div>
            <div><label className="text-[10px] text-muted">ผู้รับผิดชอบหลัก</label><select value={form.reminder_to_name} onChange={e => { const u = users.find(x => x.name === e.target.value); setForm({ ...form, reminder_to_name: e.target.value, reminder_to_email: u?.email || form.reminder_to_email }); }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกผู้รับแจ้งเตือน --</option>{users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}</select></div>
          </div>

          {(form.reminder_type === "email" || form.reminder_type === "both") && (<>
            {/* Email recipients */}
            <div className="rounded-lg bg-background border border-border p-3 mb-3">
              <label className="text-[10px] text-muted font-semibold">เลือกผู้รับอีเมลแจ้งเตือน (เลือกได้หลายคน)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 mt-2 max-h-[140px] overflow-y-auto">
                {users.map(u => {
                  const emails = form.reminder_to_email.split(",").map(e => e.trim()).filter(Boolean);
                  const checked = emails.includes(u.email || "");
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-card-hover rounded px-2 py-1">
                      <input type="checkbox" checked={checked} onChange={e => {
                        const set = new Set(emails);
                        if (e.target.checked) set.add(u.email || ""); else set.delete(u.email || "");
                        setForm({ ...form, reminder_to_email: [...set].join(", ") });
                      }} />
                      <span>{u.name}</span>
                      <span className="text-muted">({u.email})</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2">
                <label className="text-[10px] text-muted">อีเมลเพิ่มเติม (พิมพ์เพิ่มได้ คั่นด้วย , )</label>
                <input placeholder="เช่น manager@company.com, boss@company.com" value={form.reminder_to_email} onChange={e => setForm({ ...form, reminder_to_email: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-muted">CC อีเมล (ผู้บริหาร / หัวหน้าทีม)</label>
                <input placeholder="เช่น yingyut@kmitsurat.com" value={form.reminder_cc_email} onChange={e => setForm({ ...form, reminder_cc_email: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
            </div>
          </>)}

          <div><label className="text-[10px] text-muted">หมายเหตุแจ้งเตือน</label><textarea placeholder="เช่น ติดตาม MA ปีหน้า เตรียมราคาพิเศษ, เสนองาน WiFi Phase 2" value={form.reminder_note} onChange={e => setForm({ ...form, reminder_note: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1 mb-4" /></div>

          {form.reminder_date && form.reminder_type !== "none" && (
            <div className="rounded-lg bg-blue-900/10 border border-blue-800/30 px-3 py-2 text-xs text-blue-400 mb-4">
              ✓ ตั้งแจ้งเตือน <b>{form.reminder_date}</b>
              {form.reminder_to_name && <> ผู้รับผิดชอบ: <b>{form.reminder_to_name}</b></>}
              {form.reminder_to_email && <><br/>📧 ส่งถึง: {form.reminder_to_email}</>}
              {form.reminder_cc_email && <><br/>CC: {form.reminder_cc_email}</>}
              <br/>ช่องทาง: {form.reminder_type === "email" ? "อีเมล" : form.reminder_type === "system" ? "ระบบ" : "อีเมล+ระบบ"}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">{detail.name}</h2>
              <p className="text-sm text-muted">{detail.customer_name} · {detail.type} · {(detail.value || 0).toLocaleString()} THB</p>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[detail.status]}`}>{statusLabels[detail.status]}</span>
              <button onClick={() => openEdit(detail)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-card-hover">แก้ไข</button>
              <button onClick={() => setDetail(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ปิด</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {detail.assigned_to && <div><p className="text-xs text-muted">ผู้รับผิดชอบ</p><p>{detail.assigned_to}</p></div>}
            {detail.notes && <div><p className="text-xs text-muted">หมายเหตุ</p><p>{detail.notes}</p></div>}

            {/* Win/Loss */}
            {detail.win_loss_reason && (
              <div className="col-span-full">
                <p className="text-xs text-muted">{detail.status === "won" ? "เหตุผลที่ชนะ" : "เหตุผลที่แพ้"}</p>
                <p className={detail.status === "won" ? "text-green-400" : "text-red-400"}>{detail.win_loss_reason}</p>
                {detail.lost_competitor && <p className="text-xs text-muted mt-1">คู่แข่ง: {detail.lost_competitor}</p>}
              </div>
            )}

            {/* Re-engage */}
            {detail.re_engage && (
              <div className="col-span-full rounded-lg bg-amber-900/10 border border-amber-800/30 p-3">
                <p className="text-xs text-amber-400 font-semibold mb-1">📌 แผน Re-engage</p>
                <p className="text-sm">{detail.re_engage_note}</p>
                <p className="text-xs text-muted mt-1">กำหนดเสนอใหม่: <b className="text-amber-400">{detail.re_engage_date}</b></p>
              </div>
            )}

            {/* Reminder */}
            {detail.reminder_date && detail.reminder_type !== "none" && (
              <div className="col-span-full rounded-lg bg-blue-900/10 border border-blue-800/30 p-3">
                <p className="text-xs text-blue-400 font-semibold mb-1">🔔 การแจ้งเตือน</p>
                <p className="text-sm">วันที่ {detail.reminder_date} ผ่าน{detail.reminder_type === "email" ? "อีเมล" : detail.reminder_type === "system" ? "ระบบ" : "อีเมล+ระบบ"} {detail.reminder_sent ? <span className="text-green-400">(ส่งแล้ว ✓)</span> : <span className="text-yellow-400">(ยังไม่ส่ง)</span>}</p>
                {detail.reminder_to_name && <p className="text-xs text-muted mt-1">ถึง: {detail.reminder_to_name} {detail.reminder_to_email && `(${detail.reminder_to_email})`}</p>}
                {detail.reminder_cc_email && <p className="text-xs text-muted">CC: {detail.reminder_cc_email}</p>}
                {detail.reminder_note && <p className="text-xs text-muted mt-1">หมายเหตุ: {detail.reminder_note}</p>}
              </div>
            )}

            {/* Contracts attached to this project */}
            {(() => {
              const projContracts = contractsForProject(detail.id!);
              const activeContracts = projContracts.filter(c => c.status === "active");
              const totalContractValue = activeContracts.reduce((s, c) => s + (c.contract_value || 0), 0);
              return (
                <div className="col-span-full rounded-lg bg-emerald-900/10 border border-emerald-800/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-emerald-400 font-semibold">🛡️ สัญญา / รับประกัน ({projContracts.length}{projContracts.length > 0 && ` · active ${activeContracts.length}`})</p>
                    <Link href="/contracts" className="text-[10px] text-accent hover:underline">+ เพิ่มสัญญาใหม่ →</Link>
                  </div>
                  {projContracts.length === 0 ? (
                    <p className="text-xs text-muted">ยังไม่มีสัญญา/รับประกันสำหรับโปรเจคนี้ — <Link href="/contracts" className="text-accent hover:underline">เพิ่มเลย</Link></p>
                  ) : (
                    <>
                      {totalContractValue > 0 && <p className="text-[10px] text-muted mb-1">มูลค่ารวม Active: <b className="text-emerald-400">{totalContractValue.toLocaleString()} THB</b></p>}
                      <div className="space-y-1">
                        {projContracts.map(c => {
                          const meta = contractTypeMeta[c.type];
                          const days = daysUntilDate(c.end_date);
                          const dayColor = days === null ? "text-muted" : days < 0 ? "text-red-400 font-semibold" : days <= 30 ? "text-red-400" : days <= 90 ? "text-amber-400" : "text-green-400";
                          return (
                            <div key={c.id} className="flex items-center gap-2 text-xs py-1 border-b border-emerald-800/30 last:border-0">
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.icon} {meta.label}</span>
                              <span className="font-medium flex-1 truncate">{c.title}</span>
                              {c.type === "service_contract" && c.service_level && <span className="text-[10px] text-muted shrink-0">{c.service_level}</span>}
                              <span className="text-muted shrink-0 text-[10px]">{c.start_date} → {c.end_date}</span>
                              <span className={`shrink-0 text-[10px] ${dayColor}`}>{days === null ? "—" : days < 0 ? `เลย ${Math.abs(days)}d` : `${days}d`}</span>
                              {c.contract_value ? <span className="text-emerald-400 shrink-0 w-20 text-right text-[10px]">{c.contract_value.toLocaleString()}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* Project list */}
      {filteredFinal.length === 0 ? <p className="text-muted text-sm">ไม่พบโปรเจค</p> : (
        <div className="space-y-2.5">
          {filteredFinal.map(p => {
            const isExpanded = expandedIds.has(p.id!) || viewMode === "detailed";
            const types = p.job_types?.length ? p.job_types : p.type ? [p.type] : [];
            const cCount = contractCountForProject(p.id!);
            return (
              <div key={p.id} id={`project-${p.id}`} className="rounded-xl bg-card border border-border overflow-hidden hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all">
                {/* Compact row */}
                <div className="flex items-stretch cursor-pointer" onClick={() => toggleExpand(p.id!)}>
                  {/* Status bar */}
                  <div className={`w-1.5 shrink-0 ${p.status === "won" ? "bg-green-500" : p.status === "lost" ? "bg-red-500" : p.status === "negotiation" ? "bg-yellow-500" : p.status === "proposal" ? "bg-purple-500" : p.status === "opportunity" ? "bg-blue-500" : "bg-gray-600"}`} />

                  <div className="flex-1 min-w-0 px-4 py-3">
                    {/* Row 1: name + value */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-bold text-[15px] truncate leading-tight">{p.name}</p>
                          {p.re_engage && <span className="text-xs text-amber-400 shrink-0">📌</span>}
                          {p.reminder_date && p.reminder_type !== "none" && !p.reminder_sent && <span className="text-xs text-blue-400 shrink-0">🔔</span>}
                          {cCount > 0 && <span className="text-xs text-emerald-400 shrink-0">🛡️</span>}
                        </div>
                        <p className="text-sm text-muted truncate mt-0.5">
                          {p.customer_name}{p.assigned_to ? ` · ${p.assigned_to.split(" ")[0]}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold tabular-nums ${p.status === "won" ? "text-green-400" : p.status === "lost" ? "text-red-400/50" : "text-foreground"}`}>{(p.value || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted">THB</p>
                      </div>
                    </div>
                    {/* Row 2: tags (desktop) + status badge + actions */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {types.length > 0 && (
                        <div className="hidden lg:flex gap-1">
                          {types.slice(0, 3).map(t => <span key={t} className="rounded-md bg-accent/10 text-accent px-2 py-0.5 text-[10px] whitespace-nowrap">{t}</span>)}
                          {types.length > 3 && <span className="text-[10px] text-muted">+{types.length - 3}</span>}
                        </div>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[p.status]}`}>{statusLabels[p.status]}</span>
                      {(() => { const b = OWNERSHIP_BADGE[ownershipOf(p)]; return b ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${b.cls}`}>{b.label}</span> : null; })()}
                      <div className="ml-auto flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(p)} className="text-[10px] text-accent hover:underline">แก้ไข</button>
                        <button onClick={() => handleDelete(p.id!, p.name)} className="text-[10px] text-danger hover:underline">ลบ</button>
                        <span className="text-muted/30 text-sm">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 bg-background/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Left: Info */}
                      <div className="space-y-2">
                        {types.length > 0 && (
                          <div><p className="text-[10px] text-muted mb-1">ประเภทงาน</p><div className="flex flex-wrap gap-1">{types.map(t => <span key={t} className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px]">{t}</span>)}</div></div>
                        )}
                        {p.assigned_to && <div><p className="text-[10px] text-muted">ผู้รับผิดชอบ</p><p>{p.assigned_to}</p></div>}
                        {p.probability != null && <div><p className="text-[10px] text-muted">โอกาสปิด</p><p>{p.probability}%</p></div>}
                        {p.expected_close_date && <div><p className="text-[10px] text-muted">คาดว่าปิด</p><p>{p.expected_close_date}</p></div>}
                      </div>
                      {/* Middle: Actions & Notes */}
                      <div className="space-y-2">
                        {p.next_action && <div><p className="text-[10px] text-muted">Next Action</p><p>{p.next_action}{p.next_action_date && ` (${p.next_action_date})`}</p></div>}
                        {p.notes && <div><p className="text-[10px] text-muted">หมายเหตุ</p><p className="text-muted">{p.notes}</p></div>}
                        {p.win_loss_reason && <div><p className="text-[10px] text-muted">{p.status === "won" ? "เหตุผลที่ชนะ" : "เหตุผลที่แพ้"}</p><p className={p.status === "won" ? "text-green-400" : "text-red-400"}>{p.win_loss_reason}</p>{p.lost_competitor && <p className="text-muted">คู่แข่ง: {p.lost_competitor}</p>}</div>}
                      </div>
                      {/* Right: Re-engage & Reminder */}
                      <div className="space-y-2">
                        {p.re_engage && (
                          <div className="rounded-lg bg-amber-900/10 border border-amber-800/30 p-2">
                            <p className="text-[10px] text-amber-400 font-medium">📌 Re-engage</p>
                            <p className="text-muted">{p.re_engage_note}</p>
                            <p className="text-amber-400 text-[10px]">เสนอใหม่: {p.re_engage_date}</p>
                          </div>
                        )}
                        {p.reminder_date && p.reminder_type !== "none" && (
                          <div className="rounded-lg bg-blue-900/10 border border-blue-800/30 p-2">
                            <p className="text-[10px] text-blue-400 font-medium">🔔 Reminder</p>
                            <p className="text-muted">{p.reminder_date} · {p.reminder_to_name || "—"}</p>
                            {p.reminder_sent ? <p className="text-green-400 text-[10px]">✓ ส่งแล้ว</p> : <p className="text-yellow-400 text-[10px]">ยังไม่ส่ง</p>}
                          </div>
                        )}
                        {/* Quick actions */}
                        <div className="flex gap-1.5 pt-1 flex-wrap">
                          <button onClick={() => setDetail(p)} className="text-[10px] bg-card border border-border rounded px-2 py-1 hover:bg-card-hover">📄 Detail</button>
                          <Link href="/quotations" className="text-[10px] bg-card border border-border rounded px-2 py-1 hover:bg-card-hover">💰 QT</Link>
                          <Link href="/presale" className="text-[10px] bg-card border border-border rounded px-2 py-1 hover:bg-card-hover">📋 PS</Link>
                          <Link href="/service" className="text-[10px] bg-card border border-border rounded px-2 py-1 hover:bg-card-hover">🔧 SV</Link>
                          {(() => {
                            const os = ownershipOf(p);
                            const isOwner = p.assigned_to === currentUser?.name && !p.assigned_to_inactive;
                            if (isOwner || os === "active" || os === "none") return null;
                            if (p.ownership_status === "pending_transfer") {
                              return p.transfer_requested_by === currentUser?.name
                                ? <span className="text-[10px] text-blue-400 border border-blue-500/30 rounded px-2 py-1">📋 รออนุมัติ</span>
                                : null;
                            }
                            return (
                              <button onClick={e => { e.stopPropagation(); setShowTransferModal(p); setTransferNote(""); }}
                                className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded px-2 py-1 hover:bg-amber-500/20">
                                🙋 ขอรับงาน
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </>)}

      </>)}

      {/* Transfer Request Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setShowTransferModal(null); setTransferNote(""); }}>
          <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">ขอรับงาน</h3>
            <p className="text-sm text-muted mb-4">{showTransferModal.name} · {showTransferModal.customer_name}</p>
            <div className="mb-4">
              <label className="text-xs text-muted block mb-1.5">เหตุผลในการขอรับงาน *</label>
              <textarea
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                placeholder="เช่น มีความสัมพันธ์กับลูกค้า, เคยทำโปรเจคที่คล้ายกัน, ต้องการช่วยดูแลลูกค้ารายนี้"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-[80px] resize-y"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRequestTransfer(showTransferModal)} disabled={!transferNote.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
                ส่งคำขอ
              </button>
              <button onClick={() => { setShowTransferModal(null); setTransferNote(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
