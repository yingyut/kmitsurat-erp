"use client";

import { useEffect, useState } from "react";
import type { Quotation } from "@/lib/firestore";

interface LineItem { description: string; qty: number; unit_price: number; }
const emptyItem: LineItem = { description: "", qty: 1, unit_price: 0 };

export default function QuotationsPage() {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() { const { quotations } = await import("@/lib/firestore"); try { setList(await quotations.list()); } catch (err) { console.error(err); } finally { setLoading(false); } }
  useEffect(() => { setMounted(true); load(); }, []);
  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);

  async function handleSave() {
    if (!customerName.trim()) return; setSaving(true);
    const { quotations } = await import("@/lib/firestore");
    try { await quotations.add({ customer_name: customerName.trim(), items: items.filter((i) => i.description.trim()), total_price: total, status: "draft" }); setCustomerName(""); setItems([{ ...emptyItem }]); setShowForm(false); await load(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { quotations } = await import("@/lib/firestore"); await quotations.remove(id); await load(); }

  if (!mounted) return <div className="p-8"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold">Quotations</h1><button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">{showForm ? "Cancel" : "+ New Quotation"}</button></div>
      {showForm && (<div className="rounded-xl bg-card border border-border p-6 mb-6"><input placeholder="Customer Name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mb-4 w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent" /><div className="space-y-2 mb-3">{items.map((item, idx) => (<div key={idx} className="flex gap-2 items-center"><input placeholder="Description" value={item.description} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" /><input type="number" placeholder="Qty" value={item.qty} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) } : it))} className="w-20 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" /><input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, unit_price: Number(e.target.value) } : it))} className="w-28 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" /><span className="w-24 text-right text-sm text-muted">{(item.qty * item.unit_price).toLocaleString()}</span>{items.length > 1 && <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-danger text-sm">x</button>}</div>))}</div><button onClick={() => setItems([...items, { ...emptyItem }])} className="text-sm text-accent hover:underline mb-4 block">+ Add item</button><div className="flex items-center justify-between"><p className="font-semibold">Total: {total.toLocaleString()} THB</p><button onClick={handleSave} disabled={saving || !customerName.trim()} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Save"}</button></div></div>)}
      {loading ? <p className="text-muted">Loading...</p> : list.length === 0 ? <p className="text-muted">No quotations yet.</p> : (<div className="space-y-3">{list.map((q) => (<div key={q.id} className="rounded-xl bg-card border border-border p-5"><p className="font-medium text-sm">{q.customer_name}</p><p className="text-xs text-muted mt-1">{q.items.length} items - {q.total_price.toLocaleString()} THB - {q.status}</p><button onClick={() => handleDelete(q.id!)} className="text-xs text-danger hover:underline mt-2">Delete</button></div>))}</div>)}
    </div>
  );
}
