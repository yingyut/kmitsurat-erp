"use client";

import { useEffect, useState } from "react";
import type { ServiceTicket } from "@/lib/firestore";

export default function ServicePage() {
  const [list, setList] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", issue: "" });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() { const { serviceTickets } = await import("@/lib/firestore"); try { setList(await serviceTickets.list()); } catch (err) { console.error(err); } finally { setLoading(false); } }
  useEffect(() => { setMounted(true); load(); }, []);

  async function handleSave() {
    if (!form.customer_name.trim() || !form.issue.trim()) return; setSaving(true);
    const { serviceTickets } = await import("@/lib/firestore");
    try { await serviceTickets.add({ customer_name: form.customer_name.trim(), issue: form.issue.trim(), status: "open" }); setForm({ customer_name: "", issue: "" }); setShowForm(false); await load(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { serviceTickets } = await import("@/lib/firestore"); await serviceTickets.remove(id); await load(); }

  if (!mounted) return <div className="p-8"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold">Service Tickets</h1><button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">{showForm ? "Cancel" : "+ New Ticket"}</button></div>
      {showForm && (<div className="rounded-xl bg-card border border-border p-6 mb-6"><div className="space-y-3 mb-4"><input placeholder="Customer Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" /><textarea placeholder="Issue *" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} className="w-full min-h-24 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent resize-y" /></div><button onClick={handleSave} disabled={saving || !form.customer_name.trim() || !form.issue.trim()} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Save"}</button></div>)}
      {loading ? <p className="text-muted">Loading...</p> : list.length === 0 ? <p className="text-muted">No tickets yet.</p> : (<div className="space-y-3">{list.map((t) => (<div key={t.id} className="rounded-xl bg-card border border-border p-5"><p className="font-medium text-sm">{t.customer_name}</p><p className="text-sm text-muted mt-1">{t.issue}</p><p className="text-xs text-muted mt-1">Status: {t.status}</p><button onClick={() => handleDelete(t.id!)} className="text-xs text-danger hover:underline mt-2">Delete</button></div>))}</div>)}
    </div>
  );
}
