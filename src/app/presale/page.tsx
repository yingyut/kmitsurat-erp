"use client";
import { useEffect, useState } from "react";
import type { PresaleRequest, Customer, Project, JobRequest, User } from "@/lib/types";

const reqTypes = ["solution_design","requirement_summary","boq","technical_proposal","site_survey","project_planning"] as const;
const typeLabels: Record<string, string> = { solution_design: "Solution Design", requirement_summary: "Requirement Summary", boq: "BOQ Preparation", technical_proposal: "Technical Proposal", site_survey: "Site Survey", project_planning: "Project Planning" };
const empty: { activity_id: string; customer_id: string; customer_name: string; project_id: string; project_name: string; type: PresaleRequest["type"]; requirement: string; assigned_to: string; due_date: string; status: PresaleRequest["status"] } = { activity_id: "", customer_id: "", customer_name: "", project_id: "", project_name: "", type: "boq", requirement: "", assigned_to: "", due_date: "", status: "pending" };

export default function PresalePage() {
  const [list, setList] = useState<PresaleRequest[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [presaleUsers, setPresaleUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<PresaleRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [r, c, p, jr, u] = await Promise.all([fs.presaleRequests.list(), fs.customers.list(), fs.projects.list(), fs.jobRequests.list(), fs.users.list()]);
      setList(r); setFiltered(r); setCusts(c); setProjs(p);
      setIncomingReqs(jr.filter(j => j.request_to_team === "presale"));
      setPresaleUsers(u.filter(x => x.active && x.role === "presale"));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => { const s = search.toLowerCase(); setFiltered(s ? list.filter((r) => r.requirement.toLowerCase().includes(s) || r.customer_name.toLowerCase().includes(s)) : list); }, [search, list]);

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

      <div className="flex items-center justify-between mb-5"><h1 className="text-xl font-bold" title="คำขอพรีเซลล์">Presale Requests</h1><button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Request"}</button></div>
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
      <input placeholder="Search presale requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No requests found.</p> : (
        <div className="space-y-2">{filtered.map((r) => (
          <div key={r.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between">
            <div><p className="text-sm font-medium">{typeLabels[r.type]}</p><p className="text-sm text-muted mt-0.5">{r.requirement}</p><p className="text-xs text-muted mt-1">{r.customer_name} &middot; {r.project_name}{r.due_date && ` &middot; Due: ${r.due_date}`}</p></div>
            <div className="flex items-center gap-2 shrink-0"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "completed" ? "bg-green-900/50 text-green-400" : r.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>{r.status}</span><button onClick={() => handleDelete(r.id!)} className="text-xs text-danger hover:underline">Del</button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
