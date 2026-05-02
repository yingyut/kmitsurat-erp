"use client";

import { useEffect, useState } from "react";
import type { PresaleRequest } from "@/lib/firestore";

export default function PresalePage() {
  const [list, setList] = useState<PresaleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", requirement: "", assigned_to: "" });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() { const { presaleRequests } = await import("@/lib/firestore"); try { setList(await presaleRequests.list()); } catch (err) { console.error(err); } finally { setLoading(false); } }
  useEffect(() => { setMounted(true); load(); }, []);

  async function handleSave() {
    if (!form.customer_name.trim() || !form.requirement.trim()) return; setSaving(true);
    const { presaleRequests } = await import("@/lib/firestore");
    try { await presaleRequests.add({ customer_name: form.customer_name.trim(), requirement: form.requirement.trim(), assigned_to: form.assigned_to.trim(), status: "pending" }); setForm({ customer_name: "", requirement: "", assigned_to: "" }); setShowForm(false); await load(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { presaleRequests } = await import("@/lib/firestore"); await presaleRequests.remove(id); await load(); }

  if (!mounted) return <div className="p-8"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold">Presale Requests</h1><button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">{showForm ? "Cancel" : "+ New Request"}</button></div>
      {showForm && (<div className="rounded-xl bg-card border border-border p-6 mb-6"><div className="space-y-3 mb-4"><input placeholder="Customer Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" /><textarea placeholder="Requirement *" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} className="w-full min-h-24 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent resize-y" /><input placeholder="Assigned to" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" /></div><button onClick={handleSave} disabled={saving || !form.customer_name.trim() || !form.requirement.trim()} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Save"}</button></div>)}
      {loading ? <p className="text-muted">Loading...</p> : list.length === 0 ? <p className="text-muted">No requests yet.</p> : (<div className="space-y-3">{list.map((r) => (<div key={r.id} className="rounded-xl bg-card border border-border p-5"><p className="font-medium text-sm">{r.customer_name}</p><p className="text-sm text-muted mt-1">{r.requirement}</p><p className="text-xs text-muted mt-1">Status: {r.status}</p><button onClick={() => handleDelete(r.id!)} className="text-xs text-danger hover:underline mt-2">Delete</button></div>))}</div>)}
    </div>
  );
}
