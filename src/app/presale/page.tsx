"use client";
import { useEffect, useState } from "react";
import type { PresaleRequest, Customer, Project, JobRequest, User } from "@/lib/types";

const reqTypes = ["solution_design","requirement_summary","boq","technical_proposal","site_survey","project_planning"] as const;
const typeLabels: Record<string, string> = { solution_design: "Solution Design", requirement_summary: "Requirement Summary", boq: "BOQ Preparation", technical_proposal: "Technical Proposal", site_survey: "Site Survey", project_planning: "Project Planning" };
const empty: { activity_id: string; customer_id: string; customer_name: string; project_id: string; project_name: string; type: PresaleRequest["type"]; requirement: string; assigned_to: string; due_date: string; status: PresaleRequest["status"] } = { activity_id: "", customer_id: "", customer_name: "", project_id: "", project_name: "", type: "boq", requirement: "", assigned_to: "", due_date: "", status: "pending" };

const todayStr = () => new Date().toISOString().slice(0, 10);

const statusLabel: Record<string, string> = { pending: "ยังไม่เริ่ม", in_progress: "กำลังทำ", completed: "เสร็จแล้ว" };
const statusColor: Record<string, string> = { pending: "bg-blue-900/50 text-blue-400", in_progress: "bg-yellow-900/50 text-yellow-400", completed: "bg-green-900/50 text-green-400" };

export default function PresalePage() {
  const [list, setList] = useState<PresaleRequest[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [presaleUsers, setPresaleUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PresaleRequest["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [r, c, p, jr, u] = await Promise.all([fs.presaleRequests.list(), fs.customers.list(), fs.projects.list(), fs.jobRequests.list(), fs.users.list()]);
      setList(r); setCusts(c); setProjs(p);
      setIncomingReqs(jr.filter(j => j.request_to_team === "presale"));
      setPresaleUsers(u.filter(x => x.active && x.role === "presale"));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Filter
  const filtered = list.filter((r) => {
    const s = search.toLowerCase();
    const matchSearch = !s || r.requirement.toLowerCase().includes(s) || r.customer_name.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Dashboard stats (from full list)
  const today = todayStr();
  const overdueList = list.filter(r => r.due_date && r.due_date < today && r.status !== "completed");
  const dueTodayList = list.filter(r => r.due_date === today && r.status !== "completed");
  const stats = {
    total: list.length,
    pending: list.filter(r => r.status === "pending").length,
    inProgress: list.filter(r => r.status === "in_progress").length,
    completed: list.filter(r => r.status === "completed").length,
    overdue: overdueList.length,
    dueToday: dueTodayList.length,
    pendingReqs: incomingReqs.filter(r => r.status === "pending").length,
  };

  // Workload per person
  const workload = presaleUsers.map(u => ({
    name: u.name,
    active: list.filter(r => r.assigned_to === u.name && r.status !== "completed").length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active).slice(0, 5);

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); }

  async function handleSave() {
    if (!form.requirement.trim()) return; setSaving(true);
    const { presaleRequests } = await import("@/lib/firestore");
    try { await presaleRequests.add(form as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { presaleRequests } = await import("@/lib/firestore"); await presaleRequests.remove(id); await load(); }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      {/* Incoming Job Requests */}
      {incomingReqs.filter(r => r.status === "pending").length > 0 && (
        <div className="rounded-xl bg-purple-900/10 border border-purple-800/50 p-4 mb-4">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">📥 Job Requests จากทีม Sales ({incomingReqs.filter(r => r.status === "pending").length} รายการรออนุมัติ)</h3>
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
                    <select id={`assign-${r.id}`} defaultValue="" className="rounded bg-background border border-border px-2 py-1 text-xs"><option value="">-- มอบหมายให้ --</option>{presaleUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
                    <div className="flex gap-1">
                      <button onClick={async () => {
                        const assignTo = (document.getElementById(`assign-${r.id}`) as HTMLSelectElement)?.value;
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
          <h1 className="text-xl font-bold" title="งานพรีเซลล์ — BOQ / Solution Design / Site Survey">Presale Tasks</h1>
          <p className="text-xs text-muted">งาน BOQ / Solution Design / Site Survey — รับงานจาก Sales และติดตามสถานะ</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Task"}</button>
      </div>

      {/* Dashboard */}
      {!loading && (
        <div className="space-y-3 mb-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <button onClick={() => setStatusFilter("all")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">ทั้งหมด</p>
            </button>
            <button onClick={() => setStatusFilter("pending")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "pending" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-blue-400">{stats.pending}</p>
              <p className="text-[10px] text-muted">ยังไม่เริ่ม</p>
            </button>
            <button onClick={() => setStatusFilter("in_progress")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "in_progress" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-yellow-400">{stats.inProgress}</p>
              <p className="text-[10px] text-muted">กำลังทำ</p>
            </button>
            <button onClick={() => setStatusFilter("completed")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "completed" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-green-400">{stats.completed}</p>
              <p className="text-[10px] text-muted">เสร็จแล้ว</p>
            </button>
            <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-2.5">
              <p className="text-base font-bold text-red-400">{stats.overdue}</p>
              <p className="text-[10px] text-muted">เลยกำหนด</p>
            </div>
            <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-2.5">
              <p className="text-base font-bold text-amber-400">{stats.dueToday}</p>
              <p className="text-[10px] text-muted">ครบกำหนดวันนี้</p>
            </div>
            <div className="rounded-lg border border-purple-800/50 bg-purple-900/10 p-2.5">
              <p className="text-base font-bold text-purple-400">{stats.pendingReqs}</p>
              <p className="text-[10px] text-muted">Job Requests รอรับ</p>
            </div>
          </div>

          {/* Alerts + workload */}
          {(overdueList.length > 0 || dueTodayList.length > 0 || workload.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ เลยกำหนด ({overdueList.length})</h3>
                {overdueList.length === 0 ? <p className="text-[11px] text-muted">ไม่มี</p> : overdueList.slice(0, 3).map(r => (
                  <div key={r.id} className="text-[11px] py-1 border-b border-border last:border-0">
                    <p className="truncate">{typeLabels[r.type]} — {r.customer_name}</p>
                    <p className="text-muted">กำหนด {r.due_date}{r.assigned_to && ` · ${r.assigned_to}`}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">📅 ครบวันนี้ ({dueTodayList.length})</h3>
                {dueTodayList.length === 0 ? <p className="text-[11px] text-muted">ไม่มี</p> : dueTodayList.slice(0, 3).map(r => (
                  <div key={r.id} className="text-[11px] py-1 border-b border-border last:border-0">
                    <p className="truncate">{typeLabels[r.type]} — {r.customer_name}</p>
                    <p className="text-muted">{r.assigned_to || "ยังไม่มอบหมาย"}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">👤 ภาระงานต่อคน (Active)</h3>
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
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PresaleRequest["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">{reqTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select>
            <select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
            <select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input placeholder="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PresaleRequest["status"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select>
            <textarea placeholder="Requirement *" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-20 resize-y" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.requirement.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mb-3">
        <input placeholder="ค้นหา requirement / ลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ {statusFilter !== "all" && <span className="text-accent">· {statusLabel[statusFilter]}</span>}</p>
      </div>
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบงาน</p> : (
        <div className="space-y-2">{filtered.map((r) => {
          const overdue = r.due_date && r.due_date < today && r.status !== "completed";
          return (
            <div key={r.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between hover:bg-card-hover">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium">{typeLabels[r.type]}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[r.status]}`}>{statusLabel[r.status]}</span>
                  {overdue && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">⚠ เลยกำหนด</span>}
                </div>
                <p className="text-sm text-muted">{r.requirement}</p>
                <p className="text-xs text-muted mt-1">
                  {r.customer_name}{r.project_name && ` · ${r.project_name}`}
                  {r.assigned_to && ` · 👤 ${r.assigned_to}`}
                  {r.due_date && <> · <span className={overdue ? "text-red-400" : ""}>📅 {r.due_date}</span></>}
                </p>
              </div>
              <button onClick={() => handleDelete(r.id!)} className="text-xs text-danger hover:underline shrink-0 ml-3">ลบ</button>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
