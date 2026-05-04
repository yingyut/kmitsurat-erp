"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Product } from "@/lib/types";

const empty = { code: "", name: "", brand: "", category: "", unit: "pcs", cost_price: 0, selling_price: 0, active: true, type: "product" as Product["type"] };

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [list, setList] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "service">("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const { products } = await import("@/lib/firestore");
    try { const d = await products.list(); setList(d); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Prefill from URL ?new=name&type=service
  useEffect(() => {
    const newName = searchParams.get("new");
    const newType = searchParams.get("type") as "product" | "service" | null;
    if (newName) {
      setForm({ ...empty, name: newName, type: newType === "service" ? "service" : "product" });
      setShowForm(true);
      setEditId(null);
      // Clean URL so refresh doesn't re-trigger
      router.replace("/products");
    }
  }, [searchParams, router]);

  // Filter
  const filtered = list.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || (p.code || "").toLowerCase().includes(s) || (p.brand || "").toLowerCase().includes(s);
    const t = p.type || "product";
    const matchType = typeFilter === "all" || t === typeFilter;
    return matchSearch && matchType;
  });

  function openAdd() { setEditId(null); setForm(empty); setShowForm(true); }
  function openEdit(p: Product) {
    setEditId(p.id!);
    setForm({ code: p.code || "", name: p.name, brand: p.brand || "", category: p.category || "", unit: p.unit || "pcs", cost_price: p.cost_price || 0, selling_price: p.selling_price || 0, active: p.active !== false, type: p.type || "product" });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return; // only name is required now
    setSaving(true);
    const { products } = await import("@/lib/firestore");
    try {
      if (editId) await products.update(editId, form as unknown as Record<string, unknown>);
      else await products.add(form as unknown as Record<string, unknown>);
      setForm(empty); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { products } = await import("@/lib/firestore"); await products.remove(id); await load(); }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="สินค้า / บริการ / รายการราคา">Products / Services</h1>
          <p className="text-xs text-muted">รายการสินค้าและบริการ — ใช้ในใบเสนอราคา</p>
        </div>
        <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ เพิ่มสินค้า/บริการ"}</button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไข" : "เพิ่มสินค้า/บริการใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted">ประเภท</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Product["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                <option value="product">📦 สินค้า (Product)</option>
                <option value="service">🛠️ บริการ (Service)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">รหัส (ไม่บังคับสำหรับบริการ)</label>
              <input placeholder="เช่น CCTV-001 / เว้นว่างได้" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ชื่อ *</label>
              <input placeholder="ชื่อสินค้า / บริการ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ยี่ห้อ</label>
              <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">หมวดหมู่</label>
              <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">หน่วย</label>
              <input placeholder={form.type === "service" ? "เช่น งาน / ครั้ง / ชม." : "เช่น pcs / set / ชุด"} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ราคาทุน {form.type === "service" && <span className="text-muted/60">(ตั้งเป็น 0 ได้)</span>}</label>
              <input type="number" placeholder="0" value={form.cost_price || ""} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ราคาขายตั้งต้น {form.type === "service" && <span className="text-muted/60">(ปรับใน QT ได้)</span>}</label>
              <input type="number" placeholder="0" value={form.selling_price || ""} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div className="flex items-center gap-2 mt-5"><input type="checkbox" id="active-cb" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><label htmlFor="active-cb" className="text-sm">Active (พร้อมขาย)</label></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่ม"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input placeholder="ค้นหาชื่อ / รหัส / ยี่ห้อ..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | "product" | "service")} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกประเภท</option>
          <option value="product">📦 สินค้า</option>
          <option value="service">🛠️ บริการ</option>
        </select>
        <p className="text-xs text-muted self-center">{filtered.length} รายการ</p>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบรายการ</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2.5 w-10" title="ประเภท">ประเภท</th>
              <th className="px-4 py-2.5" title="รหัสสินค้า">Code</th>
              <th className="px-4 py-2.5" title="ชื่อสินค้า/บริการ">Name</th>
              <th className="px-4 py-2.5" title="ยี่ห้อ">Brand</th>
              <th className="px-4 py-2.5" title="หมวดหมู่">Category</th>
              <th className="px-4 py-2.5" title="หน่วย">Unit</th>
              <th className="px-4 py-2.5 text-right" title="ราคาทุน">Cost</th>
              <th className="px-4 py-2.5 text-right" title="ราคาขาย">Sell</th>
              <th className="px-4 py-2.5 text-right" title="อัตรากำไร">Margin</th>
              <th className="px-4 py-2.5 w-20"></th>
            </tr></thead>
            <tbody>{filtered.map((p) => {
              const margin = p.selling_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(1) : "0";
              const t = p.type || "product";
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5" title={t === "service" ? "บริการ" : "สินค้า"}>{t === "service" ? "🛠️" : "📦"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{p.code || <span className="italic">—</span>}</td>
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted">{p.brand || "-"}</td>
                  <td className="px-4 py-2.5 text-muted">{p.category || "-"}</td>
                  <td className="px-4 py-2.5 text-muted">{p.unit || "-"}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{(p.cost_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">{(p.selling_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-green-400">{margin}%</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-accent hover:underline">แก้</button>
                      <button onClick={() => handleDelete(p.id!)} className="text-xs text-danger hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-6"><p className="text-muted">Loading...</p></div>}>
      <ProductsContent />
    </Suspense>
  );
}
