"use client";
import { useEffect, useState } from "react";
import type { ServiceTicket, Customer, Project, JobRequest, User } from "@/lib/types";

const svcTypes = ["installation","site_survey","technical_survey","after_sales","repair","pm_service"] as const;
const typeLabels: Record<string, string> = { installation: "Installation", site_survey: "Site Survey", technical_survey: "Technical Survey", after_sales: "After-Sales", repair: "Repair", pm_service: "PM Service" };
const empty = { customer_id: "", customer_name: "", project_id: "", project_name: "", type: "installation" as ServiceTicket["type"], issue: "", technician: "", service_date: "", status: "open" as ServiceTicket["status"] };

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

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); }

  async function handleSave() {
    if (!form.issue.trim()) return; setSaving(true);
    const { serviceTickets } = await import("@/lib/firestore");
    try { await serviceTickets.add(form as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { serviceTickets } = await import("@/lib/firestore"); await serviceTickets.remove(id); await load(); }

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

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ServiceTicket["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">{svcTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select>
            <select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
            <select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input placeholder="Technician" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceTicket["status"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
            <textarea placeholder="Issue / Description *" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-20 resize-y" />
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
          return (
            <div key={t.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between hover:bg-card-hover">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium">{typeLabels[t.type]}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
                  {overdue && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">⚠ เลยกำหนด</span>}
                </div>
                <p className="text-sm text-muted">{t.issue}</p>
                <p className="text-xs text-muted mt-1">
                  {t.customer_name}{t.project_name && ` · ${t.project_name}`}
                  {t.technician && ` · 🔧 ${t.technician}`}
                  {t.service_date && <> · <span className={overdue ? "text-red-400" : ""}>📅 {t.service_date}</span></>}
                </p>
              </div>
              <button onClick={() => handleDelete(t.id!)} className="text-xs text-danger hover:underline shrink-0 ml-3">ลบ</button>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
