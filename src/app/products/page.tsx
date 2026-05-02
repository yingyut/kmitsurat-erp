"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

const empty = { code: "", name: "", brand: "", category: "", unit: "pcs", cost_price: 0, selling_price: 0, active: true };

export default function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const { products } = await import("@/lib/firestore");
    try { const d = await products.list(); setList(d); setFiltered(d); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => { const s = search.toLowerCase(); setFiltered(s ? list.filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s)) : list); }, [search, list]);

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) return; setSaving(true);
    const { products } = await import("@/lib/firestore");
    try { await products.add(form as unknown as Record<string, unknown>); setForm(empty); setShowForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { products } = await import("@/lib/firestore"); await products.remove(id); await load(); }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5"><h1 className="text-xl font-bold" title="สินค้า / รายการราคา">Products / Price List</h1><button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ Add Product"}</button></div>
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Product Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <div />
            <input type="number" placeholder="Cost Price" value={form.cost_price || ""} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Selling Price" value={form.selling_price || ""} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span className="text-sm">Active</span></div>
          </div>
          <button onClick={handleSave} disabled={saving || !form.code.trim() || !form.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}
      <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">No products found.</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase"><th className="px-4 py-2.5" title="รหัสสินค้า">Code</th><th className="px-4 py-2.5" title="ชื่อสินค้า">Name</th><th className="px-4 py-2.5" title="ยี่ห้อ">Brand</th><th className="px-4 py-2.5" title="หมวดหมู่">Category</th><th className="px-4 py-2.5 text-right" title="ราคาทุน">Cost</th><th className="px-4 py-2.5 text-right" title="ราคาขาย">Sell</th><th className="px-4 py-2.5 text-right" title="อัตรากำไร">Margin</th><th className="px-4 py-2.5 w-16"></th></tr></thead>
            <tbody>{filtered.map((p) => {
              const margin = p.selling_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(1) : "0";
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5 font-mono text-xs">{p.code}</td><td className="px-4 py-2.5 font-medium">{p.name}</td><td className="px-4 py-2.5 text-muted">{p.brand}</td><td className="px-4 py-2.5 text-muted">{p.category}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{p.cost_price.toLocaleString()}</td><td className="px-4 py-2.5 text-right">{p.selling_price.toLocaleString()}</td><td className="px-4 py-2.5 text-right text-green-400">{margin}%</td>
                  <td className="px-4 py-2.5"><button onClick={() => handleDelete(p.id!)} className="text-xs text-danger hover:underline">Del</button></td>
                </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
