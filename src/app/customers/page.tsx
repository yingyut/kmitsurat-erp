"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@/lib/firestore";

export default function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const { customers } = await import("@/lib/firestore");
    try { setList(await customers.list()); } catch (err) { console.error(err); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  async function handleSave() {
    if (!form.company_name.trim()) return;
    setSaving(true);
    const { customers } = await import("@/lib/firestore");
    try { await customers.add(form); setForm({ company_name: "", contact_name: "", phone: "" }); setShowForm(false); await load(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    const { customers } = await import("@/lib/firestore");
    await customers.remove(id); await load();
  }

  if (!mounted) return <div className="p-8"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">{showForm ? "Cancel" : "+ Add Customer"}</button>
      </div>
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input placeholder="Company Name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Contact Name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.company_name.trim()} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      {loading ? <p className="text-muted">Loading...</p> : list.length === 0 ? <p className="text-muted">No customers yet.</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wider"><th className="px-5 py-3">Company</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3 w-20"></th></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium">{c.company_name}</td><td className="px-5 py-3.5 text-sm text-muted">{c.contact_name}</td><td className="px-5 py-3.5 text-sm text-muted">{c.phone}</td>
                <td className="px-5 py-3.5"><button onClick={() => handleDelete(c.id!)} className="text-xs text-danger hover:underline">Delete</button></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
