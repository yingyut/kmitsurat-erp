"use client";
import { useEffect, useState } from "react";
import type { SalesActivity, Customer, Project } from "@/lib/types";

const types = ["phone_call","visit","quotation_created","quotation_sent","follow_up","meeting","customer_update"] as const;
const typeLabels: Record<string, string> = { phone_call: "Phone Call", visit: "Customer Visit", quotation_created: "Quotation Created", quotation_sent: "Quotation Sent", follow_up: "Follow-up", meeting: "Meeting", customer_update: "Customer Update" };
const empty = { type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "" };

export default function SalesPage() {
  const [list, setList] = useState<SalesActivity[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<SalesActivity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try { const [a, c, p] = await Promise.all([fs.salesActivities.list(), fs.customers.list(), fs.projects.list()]); setList(a); setFiltered(a); setCusts(c); setProjs(p); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => { const s = search.toLowerCase(); setFiltered(s ? list.filter((a) => a.description.toLowerCase().includes(s) || a.customer_name.toLowerCase().includes(s)) : list); }, [search, list]);

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); }

  async function handleSave() {
    if (!form.description.trim()) return; setSaving(true);
    const { salesActivities } = await import("@/lib/firestore");
    try { await salesActivities.add(form as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { salesActivities } = await import("@/lib/firestore"); await salesActivities.remove(id); await load(); }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Sales Activities</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Activity"}</button>
      </div>
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SalesActivity["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              {types.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
            </select>
            <select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- Customer --</option>
              {custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            <select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- Project --</option>
              {projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="date" placeholder="Next Follow-up" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SalesActivity["status"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="new">New</option><option value="in_progress">In Progress</option><option value="done">Done</option>
            </select>
            <textarea placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-20 resize-y" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.description.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      <input placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No activities found.</p> : (
        <div className="space-y-2">{filtered.map((a) => (
          <div key={a.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between">
            <div><p className="text-sm">{a.description}</p><p className="text-xs text-muted mt-1">{typeLabels[a.type]} &middot; {a.customer_name} &middot; {a.project_name}</p>{a.next_follow_up && <p className="text-xs text-muted">Follow-up: {a.next_follow_up}</p>}</div>
            <div className="flex items-center gap-2 shrink-0"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "done" ? "bg-green-900/50 text-green-400" : a.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>{a.status}</span><button onClick={() => handleDelete(a.id!)} className="text-xs text-danger hover:underline">Del</button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
