"use client";
import { useEffect, useState } from "react";
import type { Quotation, QuotationItem, Customer, Project, Product } from "@/lib/types";

const emptyItem: QuotationItem = { product_id: "", product_code: "", product_name: "", qty: 1, unit: "pcs", cost_price: 0, selling_price: 0, discount: 0, total_cost: 0, total_selling: 0, margin_percent: 0 };

export default function QuotationsPage() {
  const [list, setList] = useState<Quotation[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [custId, setCustId] = useState("");
  const [custName, setCustName] = useState("");
  const [projId, setProjId] = useState("");
  const [projName, setProjName] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState("");

  async function load() {
    const fs = await import("@/lib/firestore");
    try { const [q, c, p, pr] = await Promise.all([fs.quotations.list(), fs.customers.list(), fs.projects.list(), fs.products.list()]); setList(q); setFiltered(q); setCusts(c); setProjs(p); setProds(pr.filter((x) => x.active)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => { const s = search.toLowerCase(); setFiltered(s ? list.filter((q) => q.customer_name.toLowerCase().includes(s) || q.quotation_number.toLowerCase().includes(s)) : list); }, [search, list]);

  function selectProduct(idx: number, prodId: string) {
    const p = prods.find((x) => x.id === prodId);
    if (!p) return;
    setItems(items.map((it, i) => i === idx ? { ...it, product_id: prodId, product_code: p.code, product_name: p.name, unit: p.unit, cost_price: p.cost_price, selling_price: p.selling_price, total_cost: p.cost_price * it.qty, total_selling: (p.selling_price - it.discount) * it.qty, margin_percent: p.selling_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100) : 0 } : it));
  }

  function updateItem(idx: number, field: string, val: number) {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      updated.total_cost = updated.cost_price * updated.qty;
      updated.total_selling = (updated.selling_price - updated.discount) * updated.qty;
      updated.margin_percent = updated.selling_price > 0 ? ((updated.selling_price - updated.cost_price) / updated.selling_price * 100) : 0;
      return updated;
    }));
  }

  const totalCost = items.reduce((s, i) => s + i.total_cost, 0);
  const totalSelling = items.reduce((s, i) => s + i.total_selling, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount * i.qty, 0);
  const grossProfit = totalSelling - totalCost;
  const gpPercent = totalSelling > 0 ? (grossProfit / totalSelling * 100) : 0;

  async function handleSave() {
    if (!custId || items.length === 0) return; setSaving(true);
    const { quotations } = await import("@/lib/firestore");
    const qNum = `QT-${Date.now().toString(36).toUpperCase()}`;
    try {
      await quotations.add({ quotation_number: qNum, customer_id: custId, customer_name: custName, project_id: projId, project_name: projName, items, total_cost: totalCost, total_selling: totalSelling, total_discount: totalDiscount, gross_profit: grossProfit, gp_percent: gpPercent, status: "draft", notes, created_by: "" } as unknown as Record<string, unknown>);
      setCustId(""); setCustName(""); setProjId(""); setProjName(""); setItems([{ ...emptyItem }]); setNotes(""); setShowForm(false); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { quotations } = await import("@/lib/firestore"); await quotations.remove(id); await load(); }

  const statusColor: Record<string, string> = { draft: "bg-gray-700", sent: "bg-blue-900/50 text-blue-400", approved: "bg-green-900/50 text-green-400", rejected: "bg-red-900/50 text-red-400", expired: "bg-yellow-900/50 text-yellow-400" };

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5"><h1 className="text-xl font-bold" title="ใบเสนอราคา">Quotations</h1>
        <div className="flex gap-2">
          <button title="ส่งออกไฟล์ CSV" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">Export CSV</button>
          <button title="ส่งออกไฟล์ PDF" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">Export PDF</button>
          <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Quotation"}</button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <h2 className="text-base font-semibold mb-3">New Quotation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select value={custId} onChange={(e) => { setCustId(e.target.value); setCustName(custs.find((c) => c.id === e.target.value)?.company_name || ""); }} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
            <select value={projId} onChange={(e) => { setProjId(e.target.value); setProjName(projs.find((p) => p.id === e.target.value)?.name || ""); }} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>

          <p className="text-sm font-medium mb-2">Line Items</p>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted uppercase"><th className="px-2 py-1">Product</th><th className="px-2 py-1 w-16">Qty</th><th className="px-2 py-1 w-24">Cost</th><th className="px-2 py-1 w-24">Sell</th><th className="px-2 py-1 w-20">Disc</th><th className="px-2 py-1 w-24 text-right">Total</th><th className="px-2 py-1 w-16 text-right">Margin</th><th className="px-2 py-1 w-8"></th></tr></thead>
              <tbody>{items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1"><select value={item.product_id} onChange={(e) => selectProduct(idx, e.target.value)} className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none"><option value="">-- Select --</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select></td>
                  <td className="px-2 py-1"><input type="number" value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.cost_price} onChange={(e) => updateItem(idx, "cost_price", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.selling_price} onChange={(e) => updateItem(idx, "selling_price", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.discount} onChange={(e) => updateItem(idx, "discount", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1 text-right">{item.total_selling.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right text-green-400">{item.margin_percent.toFixed(1)}%</td>
                  <td className="px-2 py-1">{items.length > 1 && <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-danger">x</button>}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <button onClick={() => setItems([...items, { ...emptyItem }])} className="text-xs text-accent hover:underline mb-4 block">+ Add Line Item</button>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Total Cost</p><p className="font-semibold">{totalCost.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Total Selling</p><p className="font-semibold">{totalSelling.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Discount</p><p className="font-semibold">{totalDiscount.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Gross Profit</p><p className="font-semibold text-green-400">{grossProfit.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">GP %</p><p className="font-semibold text-green-400">{gpPercent.toFixed(1)}%</p></div>
          </div>

          <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-3 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y" />
          <button onClick={handleSave} disabled={saving || !custId} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save Quotation"}</button>
        </div>
      )}

      <input placeholder="Search quotations..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No quotations found.</p> : (
        <div className="space-y-2">{filtered.map((q) => (
          <div key={q.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">{q.quotation_number}</p>
              <p className="text-xs text-muted mt-0.5">{q.customer_name}{q.project_name && ` &middot; ${q.project_name}`}</p>
              <p className="text-xs text-muted">{q.items.length} items &middot; Selling: {q.total_selling.toLocaleString()} THB &middot; GP: <span className="text-green-400">{q.gp_percent.toFixed(1)}%</span></p>
            </div>
            <div className="flex items-center gap-2 shrink-0"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[q.status] || "bg-gray-700"}`}>{q.status}</span><button onClick={() => handleDelete(q.id!)} className="text-xs text-danger hover:underline">Del</button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
