"use client";
import { useEffect, useState } from "react";
import type { Project, Customer } from "@/lib/types";

const statuses = ["lead","opportunity","proposal","negotiation","won","lost"] as const;
const empty = { name: "", customer_id: "", customer_name: "", type: "", value: 0, status: "lead" as Project["status"], assigned_to: "", notes: "" };

export default function ProjectsPage() {
  const [list, setList] = useState<Project[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try { const [p, c] = await Promise.all([fs.projects.list(), fs.customers.list()]); setList(p); setFiltered(p); setCusts(c); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => { const s = search.toLowerCase(); setFiltered(s ? list.filter((p) => p.name.toLowerCase().includes(s) || p.customer_name.toLowerCase().includes(s)) : list); }, [search, list]);

  function selectCustomer(id: string) {
    const c = custs.find((x) => x.id === id);
    setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" });
  }

  async function handleSave() {
    if (!form.name.trim()) return; setSaving(true);
    const { projects } = await import("@/lib/firestore");
    try { await projects.add(form as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { projects } = await import("@/lib/firestore"); await projects.remove(id); await load(); }

  const statusColor: Record<string, string> = { lead: "bg-gray-700", opportunity: "bg-blue-900/50 text-blue-400", proposal: "bg-purple-900/50 text-purple-400", negotiation: "bg-yellow-900/50 text-yellow-400", won: "bg-green-900/50 text-green-400", lost: "bg-red-900/50 text-red-400" };

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Projects / Opportunities</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Project"}</button>
      </div>
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Project Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.customer_id} onChange={(e) => selectCustomer(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- Select Customer --</option>
              {custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            <input placeholder="Type (WiFi, CCTV, Network...)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Value (THB)" value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      <input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No projects found.</p> : (
        <div className="space-y-2">{filtered.map((p) => (
          <div key={p.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between">
            <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted mt-0.5">{p.customer_name} &middot; {p.type} &middot; {p.value.toLocaleString()} THB</p>{p.assigned_to && <p className="text-xs text-muted">Assigned: {p.assigned_to}</p>}</div>
            <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[p.status] || "bg-gray-700"}`}>{p.status}</span><button onClick={() => handleDelete(p.id!)} className="text-xs text-danger hover:underline">Del</button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
