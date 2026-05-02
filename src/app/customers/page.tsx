"use client";
import { useEffect, useState } from "react";
import type { Customer } from "@/lib/types";

const empty = { company_name: "", contact_name: "", phone: "", email: "", address: "", notes: "" };

export default function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const { customers } = await import("@/lib/firestore");
    try { const d = await customers.list(); setList(d); setFiltered(d); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(s ? list.filter((c) => c.company_name.toLowerCase().includes(s) || c.contact_name.toLowerCase().includes(s) || c.phone.includes(s)) : list);
  }, [search, list]);

  async function handleSave() {
    if (!form.company_name.trim()) return; setSaving(true);
    const { customers } = await import("@/lib/firestore");
    try { await customers.add(form as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    const { customers } = await import("@/lib/firestore");
    await customers.remove(id); await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Customers</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">{showForm ? "Cancel" : "+ Add Customer"}</button>
      </div>
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Company Name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Contact Name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full" />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.company_name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      <input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No customers found.</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase"><th className="px-4 py-2.5">Company</th><th className="px-4 py-2.5">Contact</th><th className="px-4 py-2.5">Phone</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5 w-16"></th></tr></thead>
            <tbody>{filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover"><td className="px-4 py-2.5 font-medium">{c.company_name}</td><td className="px-4 py-2.5 text-muted">{c.contact_name}</td><td className="px-4 py-2.5 text-muted">{c.phone}</td><td className="px-4 py-2.5 text-muted">{c.email}</td><td className="px-4 py-2.5"><button onClick={() => handleDelete(c.id!)} className="text-xs text-danger hover:underline">Del</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
