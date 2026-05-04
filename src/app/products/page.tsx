"use client";
import { useEffect, useState, Suspense, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Product, ProductCategory, Vendor, VendorPrice, PriceHistory } from "@/lib/types";

const empty = { code: "", name: "", brand: "", category: "", unit: "pcs", cost_price: 0, selling_price: 0, price_member: 0, price_special: 0, default_discount: 0, active: true, type: "product" as Product["type"] };
const emptyVp = { vendor_id: "", current_price: 0, min_qty: 1, lead_time_days: 0, notes: "" };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [list, setList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorPrices, setVendorPrices] = useState<VendorPrice[]>([]);
  const [priceHistories, setPriceHistories] = useState<PriceHistory[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "service">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Vendor panel state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vpEditId, setVpEditId] = useState<string | null>(null);
  const [vpForm, setVpForm] = useState(emptyVp);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [d, c, vd, vp, ph] = await Promise.all([
        fs.products.list(), fs.productCategories.list(),
        fs.vendors.list(), fs.vendorPrices.list(), fs.priceHistories.list(),
      ]);
      setList(d); setCategories(c); setVendors(vd); setVendorPrices(vp); setPriceHistories(ph);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Vendor price helpers
  const vendorPricesFor = (pid: string) => vendorPrices.filter(vp => vp.product_id === pid);
  const cheapestFor = (pid: string): VendorPrice | null => {
    const prices = vendorPricesFor(pid).filter(vp => vp.active !== false && vp.current_price > 0);
    if (prices.length === 0) return null;
    return prices.reduce((min, vp) => vp.current_price < min.current_price ? vp : min);
  };
  const historyFor = (pid: string) => priceHistories
    .filter(h => h.product_id === pid)
    .sort((a, b) => (b.recorded_at || "").localeCompare(a.recorded_at || ""));
  const trendForVendor = (pid: string, vid: string): { pct: number; direction: "up" | "down" | "flat" } | null => {
    const hist = priceHistories
      .filter(h => h.product_id === pid && h.vendor_id === vid && h.old_price > 0)
      .sort((a, b) => (b.recorded_at || "").localeCompare(a.recorded_at || ""));
    if (hist.length === 0) return null;
    const latest = hist[0];
    return { pct: latest.change_pct, direction: latest.change_pct < 0 ? "down" : latest.change_pct > 0 ? "up" : "flat" };
  };
  // Trend for the cheapest price (overall product trend)
  const productTrend = (pid: string) => {
    const c = cheapestFor(pid);
    if (!c) return null;
    return trendForVendor(pid, c.vendor_id);
  };

  // Vendor price actions
  async function saveVendorPrice(productId: string, productName: string) {
    if (!vpForm.vendor_id || vpForm.current_price <= 0) return;
    const vendor = vendors.find(v => v.id === vpForm.vendor_id);
    if (!vendor) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    const now = new Date().toISOString();
    const dt = todayStr();
    try {
      if (vpEditId) {
        const old = vendorPrices.find(vp => vp.id === vpEditId);
        if (old && old.current_price !== vpForm.current_price) {
          const change_pct = old.current_price > 0 ? ((vpForm.current_price - old.current_price) / old.current_price) * 100 : 0;
          await fs.priceHistories.add({
            product_id: productId, product_name: productName,
            vendor_id: vendor.id!, vendor_name: vendor.name,
            old_price: old.current_price, new_price: vpForm.current_price, change_pct,
            effective_date: dt, recorded_at: now, note: "",
          });
        }
        await fs.vendorPrices.update(vpEditId, {
          ...vpForm, vendor_name: vendor.name, last_updated: dt, active: true,
          product_id: productId, product_name: productName,
        } as unknown as Record<string, unknown>);
      } else {
        await fs.vendorPrices.add({
          ...vpForm, vendor_name: vendor.name, last_updated: dt, active: true,
          product_id: productId, product_name: productName,
        } as unknown as Record<string, unknown>);
        await fs.priceHistories.add({
          product_id: productId, product_name: productName,
          vendor_id: vendor.id!, vendor_name: vendor.name,
          old_price: 0, new_price: vpForm.current_price, change_pct: 0,
          effective_date: dt, recorded_at: now, note: "เพิ่มครั้งแรก",
        });
      }
      setVpForm(emptyVp); setVpEditId(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function deleteVendorPrice(id: string, vname: string) {
    if (!confirm(`ลบราคาของ vendor "${vname}" ?\n(ประวัติราคาจะยังเก็บไว้)`)) return;
    const fs = await import("@/lib/firestore");
    await fs.vendorPrices.remove(id);
    await load();
  }

  function openVpEdit(vp: VendorPrice) {
    setVpEditId(vp.id!);
    setVpForm({
      vendor_id: vp.vendor_id, current_price: vp.current_price,
      min_qty: vp.min_qty || 1, lead_time_days: vp.lead_time_days || 0, notes: vp.notes || "",
    });
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null); setVpForm(emptyVp); setVpEditId(null); setShowHistoryFor(null);
    } else {
      setExpandedId(id); setVpForm(emptyVp); setVpEditId(null); setShowHistoryFor(null);
    }
  }

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
    const matchCategory = categoryFilter === "all" || (p.category || "(ไม่มีหมวด)") === categoryFilter;
    return matchSearch && matchType && matchCategory;
  });

  // Lookup map for icon by category name
  const categoryIcon: Record<string, string> = Object.fromEntries(categories.map(c => [c.name, c.icon || "📁"]));

  // Categories actually used (for filter dropdown — include from products that aren't in catalog)
  const usedCategories = [...new Set(list.map(p => p.category).filter(Boolean))].sort();
  const allFilterCategories = [...new Set([...categories.map(c => c.name), ...usedCategories])].sort();
  const hasUncategorized = list.some(p => !p.category);

  function openAdd() { setEditId(null); setForm(empty); setShowForm(true); }
  function openEdit(p: Product) {
    setEditId(p.id!);
    setForm({
      code: p.code || "", name: p.name, brand: p.brand || "", category: p.category || "",
      unit: p.unit || "pcs", cost_price: p.cost_price || 0, selling_price: p.selling_price || 0,
      price_member: p.price_member || 0, price_special: p.price_special || 0, default_discount: p.default_discount || 0,
      active: p.active !== false, type: p.type || "product",
    });
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

  async function quickSetCategory(id: string, category: string) {
    const { products } = await import("@/lib/firestore");
    // Optimistic update
    setList(list.map(p => p.id === id ? { ...p, category } : p));
    try { await products.update(id, { category }); }
    catch (e) { console.error(e); await load(); /* revert on error */ }
  }

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
              <div className="flex gap-1.5 mt-1">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="">-- เลือกหมวด --</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.icon || "📁"} {c.name}</option>)}
                </select>
                <Link href="/settings/product-categories" target="_blank" title="เพิ่ม/แก้ไขหมวดหมู่" className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-sm text-accent hover:bg-card-hover">+</Link>
              </div>
              {categories.length === 0 && <p className="text-[10px] text-amber-400 mt-1">ยังไม่มีหมวด <Link href="/settings/product-categories" className="underline">คลิกเพื่อเพิ่ม</Link></p>}
            </div>
            <div>
              <label className="text-[10px] text-muted">หน่วย</label>
              <input placeholder={form.type === "service" ? "เช่น งาน / ครั้ง / ชม." : "เช่น pcs / set / ชุด"} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ราคาทุน {form.type === "service" && <span className="text-muted/60">(ตั้งเป็น 0 ได้)</span>}</label>
              <input type="number" placeholder="0" value={form.cost_price || ""} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div className="flex items-center gap-2 mt-5"><input type="checkbox" id="active-cb" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><label htmlFor="active-cb" className="text-sm">Active (พร้อมขาย)</label></div>
            <div />
          </div>

          {/* Price tiers */}
          <p className="text-xs text-muted uppercase mb-2 mt-2">ราคาขายแยกระดับ <span className="normal-case text-muted/60">(เลือกใช้ได้ตอนสร้างใบเสนอราคา)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted">👤 ราคาบุคคลทั่วไป (Default) *</label>
              <input type="number" placeholder="0" value={form.selling_price || ""} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">⭐ ราคาสมาชิก</label>
              <input type="number" placeholder="ปล่อยว่าง = ใช้ราคาทั่วไป" value={form.price_member || ""} onChange={(e) => setForm({ ...form, price_member: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              {form.price_member > 0 && form.selling_price > 0 && (
                <p className="text-[10px] text-muted mt-0.5">
                  {form.price_member < form.selling_price
                    ? `ลด ${(((form.selling_price - form.price_member) / form.selling_price) * 100).toFixed(1)}%`
                    : form.price_member > form.selling_price ? `สูงกว่าทั่วไป ${(((form.price_member - form.selling_price) / form.selling_price) * 100).toFixed(1)}%` : "เท่าราคาทั่วไป"}
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted">💎 ราคาพิเศษ / VIP</label>
              <input type="number" placeholder="ปล่อยว่าง = ใช้ราคาทั่วไป" value={form.price_special || ""} onChange={(e) => setForm({ ...form, price_special: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              {form.price_special > 0 && form.selling_price > 0 && (
                <p className="text-[10px] text-muted mt-0.5">
                  {form.price_special < form.selling_price
                    ? `ลด ${(((form.selling_price - form.price_special) / form.selling_price) * 100).toFixed(1)}%`
                    : form.price_special > form.selling_price ? `สูงกว่าทั่วไป ${(((form.price_special - form.selling_price) / form.selling_price) * 100).toFixed(1)}%` : "เท่าราคาทั่วไป"}
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted">🎁 ส่วนลดตั้งต้น (ต่อหน่วย, THB)</label>
              <input type="number" placeholder="0 = ไม่มี" value={form.default_discount || ""} onChange={(e) => setForm({ ...form, default_discount: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
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
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | "product" | "service")} title="กรองตามประเภท" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกประเภท</option>
          <option value="product">📦 สินค้า</option>
          <option value="service">🛠️ บริการ</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} title="กรองตามหมวด" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกหมวด</option>
          {allFilterCategories.map(c => {
            const count = list.filter(p => p.category === c).length;
            return <option key={c} value={c}>{categoryIcon[c] || "📁"} {c} ({count})</option>;
          })}
          {hasUncategorized && <option value="(ไม่มีหมวด)">— ไม่มีหมวด ({list.filter(p => !p.category).length})</option>}
        </select>
        <Link href="/settings/product-categories" title="จัดการหมวดหมู่" className="rounded-lg border border-border px-3 py-2 text-xs text-accent hover:bg-card-hover">⚙️</Link>
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
              <th className="px-4 py-2.5 text-right" title="ราคาขายและระดับราคา">Sell / Tiers</th>
              <th className="px-4 py-2.5 text-right" title="อัตรากำไร (Margin จากราคาทั่วไป)">Margin</th>
              <th className="px-4 py-2.5 w-20"></th>
            </tr></thead>
            <tbody>{filtered.map((p) => {
              const margin = p.selling_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(1) : "0";
              const t = p.type || "product";
              const vps = vendorPricesFor(p.id!);
              const cheapest = cheapestFor(p.id!);
              const trend = productTrend(p.id!);
              const isExpanded = expandedId === p.id;
              return (
                <Fragment key={p.id}>
                <tr className={`border-b border-border last:border-0 hover:bg-card-hover ${isExpanded ? "bg-card-hover" : ""}`}>
                  <td className="px-4 py-2.5" title={t === "service" ? "บริการ" : "สินค้า"}>{t === "service" ? "🛠️" : "📦"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{p.code || <span className="italic">—</span>}</td>
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted">{p.brand || "-"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <span title="หมวดปัจจุบัน">{p.category ? (categoryIcon[p.category] || "📁") : "❓"}</span>
                      <select
                        value={p.category || ""}
                        onChange={(e) => quickSetCategory(p.id!, e.target.value)}
                        title="เปลี่ยนหมวด (บันทึกอัตโนมัติ)"
                        className={`rounded border border-transparent bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:border-accent hover:border-border cursor-pointer ${!p.category ? "text-amber-400 italic" : "text-muted"}`}
                      >
                        <option value="">— ไม่มีหมวด —</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.icon || "📁"} {c.name}</option>)}
                        {p.category && !categories.find(c => c.name === p.category) && (
                          <option value={p.category}>⚠ {p.category} (ไม่อยู่ในระบบ)</option>
                        )}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{p.unit || "-"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <p className="text-muted">{(p.cost_price || 0).toLocaleString()}</p>
                    {cheapest ? (
                      <p className="text-[10px] mt-0.5">
                        <span className="text-yellow-400" title={`ราคาถูกสุดจาก ${cheapest.vendor_name}`}>🥇 {cheapest.current_price.toLocaleString()}</span>
                        {trend && (
                          <span className={`ml-1 ${trend.direction === "down" ? "text-green-400" : trend.direction === "up" ? "text-red-400" : "text-muted"}`} title={`เทรนด์ราคาล่าสุด`}>
                            {trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→"}{Math.abs(trend.pct).toFixed(1)}%
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted/50 mt-0.5 italic">ยังไม่มี vendor</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <p>{(p.selling_price || 0).toLocaleString()}</p>
                    {(p.price_member || p.price_special || p.default_discount) ? (
                      <p className="text-[10px] text-muted mt-0.5 space-x-1">
                        {p.price_member ? <span title="ราคาสมาชิก">⭐{p.price_member.toLocaleString()}</span> : null}
                        {p.price_special ? <span title="ราคาพิเศษ">💎{p.price_special.toLocaleString()}</span> : null}
                        {p.default_discount ? <span title="ส่วนลดตั้งต้น" className="text-amber-400">🎁-{p.default_discount.toLocaleString()}</span> : null}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-400">{margin}%</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => toggleExpand(p.id!)} title={isExpanded ? "ปิด" : "ดูราคา vendor"} className={`text-xs rounded px-1.5 py-0.5 border ${isExpanded ? "bg-accent text-white border-accent" : "border-border hover:bg-card-hover"}`}>
                        🏪 {vps.length}{isExpanded ? " ▴" : " ▾"}
                      </button>
                      <button onClick={() => openEdit(p)} className="text-xs text-accent hover:underline">แก้</button>
                      <button onClick={() => handleDelete(p.id!)} className="text-xs text-danger hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-border bg-background/50">
                    <td colSpan={10} className="px-4 py-3">
                      <VendorPanel
                        product={p}
                        vendors={vendors}
                        vendorPrices={vps}
                        history={historyFor(p.id!)}
                        cheapest={cheapest}
                        vpForm={vpForm}
                        setVpForm={setVpForm}
                        vpEditId={vpEditId}
                        openVpEdit={openVpEdit}
                        cancelVpEdit={() => { setVpEditId(null); setVpForm(emptyVp); }}
                        saveVendorPrice={saveVendorPrice}
                        deleteVendorPrice={deleteVendorPrice}
                        saving={saving}
                        showHistory={showHistoryFor === p.id}
                        toggleHistory={() => setShowHistoryFor(showHistoryFor === p.id ? null : p.id!)}
                        trendForVendor={(vid) => trendForVendor(p.id!, vid)}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type VendorPanelProps = {
  product: Product;
  vendors: Vendor[];
  vendorPrices: VendorPrice[];
  history: PriceHistory[];
  cheapest: VendorPrice | null;
  vpForm: typeof emptyVp;
  setVpForm: (f: typeof emptyVp) => void;
  vpEditId: string | null;
  openVpEdit: (vp: VendorPrice) => void;
  cancelVpEdit: () => void;
  saveVendorPrice: (productId: string, productName: string) => Promise<void>;
  deleteVendorPrice: (id: string, vendorName: string) => Promise<void>;
  saving: boolean;
  showHistory: boolean;
  toggleHistory: () => void;
  trendForVendor: (vid: string) => { pct: number; direction: "up" | "down" | "flat" } | null;
};

function VendorPanel(props: VendorPanelProps) {
  const { product, vendors, vendorPrices, history, cheapest, vpForm, setVpForm, vpEditId, openVpEdit, cancelVpEdit, saveVendorPrice, deleteVendorPrice, saving, showHistory, toggleHistory, trendForVendor } = props;

  const activeVendors = vendors.filter(v => v.active);
  // Sort vendor prices: cheapest first
  const sortedVps = [...vendorPrices].sort((a, b) => (a.current_price || 0) - (b.current_price || 0));

  // Vendor IDs already linked (so we can disable in dropdown when adding new)
  const linkedVendorIds = new Set(vendorPrices.map(vp => vp.vendor_id));
  const isEditing = !!vpEditId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold">🏪 ราคาจาก Vendor — <span className="text-muted">{product.name}</span></p>
          <p className="text-[10px] text-muted">{vendorPrices.length} vendor · {history.length} entries ในประวัติ</p>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && (
            <button onClick={toggleHistory} className="text-xs rounded border border-border px-2.5 py-1 hover:bg-card-hover">
              📊 {showHistory ? "ซ่อน" : "ดู"}ประวัติราคา ({history.length})
            </button>
          )}
        </div>
      </div>

      {/* Vendor price form (always visible) */}
      <div className="rounded-lg bg-card border border-border p-3">
        <p className="text-[11px] font-semibold mb-2">{isEditing ? "✏️ แก้ราคา / อัปเดตราคา" : "+ เพิ่มราคาจาก Vendor"}</p>
        {activeVendors.length === 0 ? (
          <p className="text-xs text-amber-400">ยังไม่มี Vendor ในระบบ — <Link href="/vendors" className="underline">ไปเพิ่ม Vendor ก่อน</Link></p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-muted">Vendor *</label>
              <select
                value={vpForm.vendor_id}
                onChange={e => setVpForm({ ...vpForm, vendor_id: e.target.value })}
                className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent mt-0.5"
              >
                <option value="">-- เลือก Vendor --</option>
                {activeVendors.map(v => (
                  <option key={v.id} value={v.id} disabled={!isEditing && linkedVendorIds.has(v.id!)}>
                    {v.name} {linkedVendorIds.has(v.id!) && !isEditing ? "(มีอยู่แล้ว)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">ราคา (THB) *</label>
              <input type="number" value={vpForm.current_price || ""} onChange={e => setVpForm({ ...vpForm, current_price: Number(e.target.value) })} className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-muted">Min Qty</label>
              <input type="number" value={vpForm.min_qty || ""} onChange={e => setVpForm({ ...vpForm, min_qty: Number(e.target.value) })} className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-muted">Lead time (วัน)</label>
              <input type="number" value={vpForm.lead_time_days || ""} onChange={e => setVpForm({ ...vpForm, lead_time_days: Number(e.target.value) })} className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-muted">หมายเหตุ</label>
              <input value={vpForm.notes} onChange={e => setVpForm({ ...vpForm, notes: e.target.value })} placeholder="เงื่อนไขพิเศษ..." className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent mt-0.5" />
            </div>
            <div className="col-span-full flex gap-2 mt-1">
              <button
                onClick={() => saveVendorPrice(product.id!, product.name)}
                disabled={saving || !vpForm.vendor_id || vpForm.current_price <= 0}
                className="rounded bg-accent text-white px-3 py-1 text-xs hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : isEditing ? "💾 บันทึกการเปลี่ยนแปลง" : "+ เพิ่มราคา"}
              </button>
              {isEditing && (
                <button onClick={cancelVpEdit} className="rounded border border-border px-3 py-1 text-xs text-muted hover:bg-card-hover">ยกเลิก</button>
              )}
              <p className="text-[10px] text-muted self-center ml-auto">
                {isEditing ? "💡 ถ้าราคาเปลี่ยน ระบบจะบันทึกประวัติให้อัตโนมัติ" : "💡 เพิ่มราคาแล้ว ระบบจะบันทึกเป็น entry แรกของประวัติ"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Vendor prices table */}
      {sortedVps.length > 0 && (
        <div className="rounded-lg bg-card border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border text-left text-[10px] text-muted uppercase">
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2 text-right">ราคา</th>
              <th className="px-3 py-2 text-center">Trend</th>
              <th className="px-3 py-2 text-center">Min Qty</th>
              <th className="px-3 py-2 text-center">Lead</th>
              <th className="px-3 py-2">อัปเดตล่าสุด</th>
              <th className="px-3 py-2">หมายเหตุ</th>
              <th className="px-3 py-2 w-20"></th>
            </tr></thead>
            <tbody>
              {sortedVps.map(vp => {
                const isCheapest = cheapest?.id === vp.id;
                const trend = trendForVendor(vp.vendor_id);
                return (
                  <tr key={vp.id} className={`border-b border-border last:border-0 ${isCheapest ? "bg-yellow-900/10" : ""}`}>
                    <td className="px-3 py-2 font-medium">{isCheapest && <span className="mr-1" title="ราคาถูกสุด">🥇</span>}{vp.vendor_name}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${isCheapest ? "text-yellow-400" : ""}`}>{(vp.current_price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      {trend ? (
                        <span className={trend.direction === "down" ? "text-green-400" : trend.direction === "up" ? "text-red-400" : "text-muted"} title={`เทียบกับราคาก่อนหน้า`}>
                          {trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→"}{Math.abs(trend.pct).toFixed(1)}%
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-muted">{vp.min_qty || "-"}</td>
                    <td className="px-3 py-2 text-center text-muted">{vp.lead_time_days ? `${vp.lead_time_days}d` : "-"}</td>
                    <td className="px-3 py-2 text-muted">{vp.last_updated || "-"}</td>
                    <td className="px-3 py-2 text-muted truncate max-w-[200px]" title={vp.notes}>{vp.notes || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openVpEdit(vp)} className="text-[10px] text-accent hover:underline">แก้</button>
                        <button onClick={() => deleteVendorPrice(vp.id!, vp.vendor_name)} className="text-[10px] text-danger hover:underline">ลบ</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="rounded-lg bg-card border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-[11px] font-semibold">📊 ประวัติการเปลี่ยนแปลงราคา</p>
            <p className="text-[10px] text-muted">เรียงจากใหม่ไปเก่า · {history.length} entries</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-left text-[10px] text-muted uppercase">
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 text-right">ราคาเดิม</th>
                <th className="px-3 py-2 text-center">→</th>
                <th className="px-3 py-2 text-right">ราคาใหม่</th>
                <th className="px-3 py-2 text-right">เปลี่ยนแปลง</th>
                <th className="px-3 py-2">หมายเหตุ</th>
              </tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{h.effective_date}</td>
                    <td className="px-3 py-2">{h.vendor_name}</td>
                    <td className="px-3 py-2 text-right text-muted">{h.old_price > 0 ? h.old_price.toLocaleString() : <span className="italic">—</span>}</td>
                    <td className="px-3 py-2 text-center text-muted">→</td>
                    <td className="px-3 py-2 text-right font-semibold">{h.new_price.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-medium ${h.old_price === 0 ? "text-blue-400" : h.change_pct < 0 ? "text-green-400" : h.change_pct > 0 ? "text-red-400" : "text-muted"}`}>
                      {h.old_price === 0 ? "NEW" : `${h.change_pct < 0 ? "↓" : h.change_pct > 0 ? "↑" : "→"}${Math.abs(h.change_pct).toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-2 text-muted text-[10px]">{h.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
