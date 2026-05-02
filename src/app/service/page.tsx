"use client";
import { useEffect, useState } from "react";
import type { ServiceTicket, Customer, Project } from "@/lib/types";

const svcTypes = ["installation","site_survey","technical_survey","after_sales","repair","pm_service"] as const;
const typeLabels: Record<string, string> = { installation: "Installation", site_survey: "Site Survey", technical_survey: "Technical Survey", after_sales: "After-Sales", repair: "Repair", pm_service: "PM Service" };
const empty = { customer_id: "", customer_name: "", project_id: "", project_name: "", type: "installation" as ServiceTicket["type"], issue: "", technician: "", service_date: "", status: "open" as ServiceTicket["status"] };

export default function ServicePage() {
  const [list, setList] = useState<ServiceTicket[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<ServiceTicket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try { const [t, c, p] = await Promise.all([fs.serviceTickets.list(), fs.customers.list(), fs.projects.list()]); setList(t); setFiltered(t); setCusts(c); setProjs(p); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => { const s = search.toLowerCase(); setFiltered(s ? list.filter((t) => t.issue.toLowerCase().includes(s) || t.customer_name.toLowerCase().includes(s)) : list); }, [search, list]);

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
      <div className="flex items-center justify-between mb-5"><h1 className="text-xl font-bold">Service Tickets</h1><button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Ticket"}</button></div>
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
      <input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No tickets found.</p> : (
        <div className="space-y-2">{filtered.map((t) => (
          <div key={t.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between">
            <div><p className="text-sm font-medium">{typeLabels[t.type]}</p><p className="text-sm text-muted mt-0.5">{t.issue}</p><p className="text-xs text-muted mt-1">{t.customer_name}{t.technician && ` &middot; Tech: ${t.technician}`}{t.service_date && ` &middot; ${t.service_date}`}</p></div>
            <div className="flex items-center gap-2 shrink-0"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.status === "resolved" || t.status === "closed" ? "bg-green-900/50 text-green-400" : t.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}>{t.status}</span><button onClick={() => handleDelete(t.id!)} className="text-xs text-danger hover:underline">Del</button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
