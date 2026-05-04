"use client";
import { useEffect, useState } from "react";
import type { Vendor, VendorPrice } from "@/lib/types";

type VendorType = Vendor["vendor_type"];

const TYPE_META: Record<VendorType, { label: string; thai: string; icon: string; color: string; defaultVat: boolean; defaultWht: number; note: string }> = {
  distributor: { label: "Vendor / Distributor", thai: "ผู้ขายอุปกรณ์ (Distributor)", icon: "🏭", color: "bg-blue-900/50 text-blue-400", defaultVat: true, defaultWht: 0, note: "ผู้ขายอุปกรณ์ทั่วไป จด VAT มีเครดิต" },
  contractor_company: { label: "Contractor (บริษัท)", thai: "ผู้รับเหมาบริษัท", icon: "🏗️", color: "bg-purple-900/50 text-purple-400", defaultVat: true, defaultWht: 1, note: "บริษัทรับเหมา จด VAT — หัก ณ ที่จ่าย 1% (บริการ)" },
  contractor_personal: { label: "Contractor (บุคคล/ร้าน)", thai: "ผู้รับเหมาบุคคล / ร้านไม่จด VAT", icon: "👷", color: "bg-amber-900/50 text-amber-400", defaultVat: false, defaultWht: 3, note: "ไม่มี VAT — หัก ณ ที่จ่าย 3% (บริการบุคคล)" },
  internal_team: { label: "KMIT Internal", thai: "ทีม Service ภายใน KMIT", icon: "🧑‍🔧", color: "bg-green-900/50 text-green-400", defaultVat: false, defaultWht: 0, note: "ทีมภายใน — ไม่มี VAT, ไม่หัก ณ ที่จ่าย" },
};

const empty = {
  name: "", contact_name: "", phone: "", email: "", address: "", notes: "", active: true,
  payment_terms: "", tax_id: "",
  vendor_type: "distributor" as VendorType, has_vat: true, withholding_tax_rate: 0,
};

export default function VendorsPage() {
  const [list, setList] = useState<Vendor[]>([]);
  const [vendorPrices, setVendorPrices] = useState<VendorPrice[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VendorType>("all");
  const [sortBy, setSortBy] = useState<"newest" | "name_asc" | "products_desc">("newest");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [v, vp] = await Promise.all([fs.vendors.list(), fs.vendorPrices.list()]);
      setList(v); setVendorPrices(vp);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Stats
  const productCount = (vendorId: string) => vendorPrices.filter(vp => vp.vendor_id === vendorId && vp.active !== false).length;
  const stats = {
    total: list.length,
    active: list.filter(v => v.active).length,
    inactive: list.filter(v => !v.active).length,
    totalLinks: vendorPrices.length,
    avgProductsPerVendor: list.length > 0 ? (vendorPrices.length / list.length).toFixed(1) : "0",
  };
  const typeStats: Record<VendorType, number> = {
    distributor: list.filter(v => (v.vendor_type || "distributor") === "distributor").length,
    contractor_company: list.filter(v => v.vendor_type === "contractor_company").length,
    contractor_personal: list.filter(v => v.vendor_type === "contractor_personal").length,
    internal_team: list.filter(v => v.vendor_type === "internal_team").length,
  };

  // Filter + sort
  const filtered = list.filter(v => {
    const s = search.toLowerCase();
    const matchSearch = !s || v.name.toLowerCase().includes(s) || (v.contact_name || "").toLowerCase().includes(s);
    const matchActive = activeFilter === "all" || (activeFilter === "active" ? v.active : !v.active);
    const vType = v.vendor_type || "distributor";
    const matchType = typeFilter === "all" || vType === typeFilter;
    return matchSearch && matchActive && matchType;
  });

  function applyTypeDefaults(t: VendorType) {
    const meta = TYPE_META[t];
    setForm({ ...form, vendor_type: t, has_vat: meta.defaultVat, withholding_tax_rate: meta.defaultWht });
  }

  function getCreatedTime(v: Vendor): number {
    const ts = (v as unknown as { created_at?: { toMillis?: () => number; seconds?: number } }).created_at;
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return 0;
  }
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return (a.name || "").localeCompare(b.name || "", "th");
      case "products_desc": return productCount(b.id!) - productCount(a.id!);
      default: return getCreatedTime(b) - getCreatedTime(a);
    }
  });

  function openAdd() { setEditId(null); setForm(empty); setShowForm(true); }
  function openEdit(v: Vendor) {
    setEditId(v.id!);
    setForm({
      name: v.name, contact_name: v.contact_name || "", phone: v.phone || "", email: v.email || "",
      address: v.address || "", notes: v.notes || "", active: v.active !== false,
      payment_terms: v.payment_terms || "", tax_id: v.tax_id || "",
      vendor_type: v.vendor_type || "distributor",
      has_vat: v.has_vat !== undefined ? v.has_vat : true,
      withholding_tax_rate: v.withholding_tax_rate || 0,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editId) await fs.vendors.update(editId, form as unknown as Record<string, unknown>);
      else await fs.vendors.add(form as unknown as Record<string, unknown>);
      setForm(empty); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    const links = productCount(id);
    if (links > 0) {
      if (!confirm(`Vendor "${name}" มี ${links} รายการสินค้าที่ผูกอยู่ — ลบไม่ได้\n\n(แนะนำให้ตั้ง Inactive แทน)`)) return;
      return;
    }
    if (!confirm(`ลบ vendor "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.vendors.remove(id); await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="ผู้ขาย / Suppliers">Vendors / Suppliers</h1>
          <p className="text-xs text-muted">จัดการข้อมูลผู้ขาย — ใช้ผูกราคาในแต่ละสินค้า เพื่อเทียบราคาและดูประวัติ</p>
        </div>
        <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่ม Vendor</button>
      </div>

      {/* Dashboard */}
      {!loading && list.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button onClick={() => { setActiveFilter("all"); setTypeFilter("all"); }} className={`rounded-lg border p-2.5 text-left transition-colors ${activeFilter === "all" && typeFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">Vendors ทั้งหมด</p>
            </button>
            <button onClick={() => setActiveFilter("active")} className={`rounded-lg border p-2.5 text-left transition-colors ${activeFilter === "active" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-green-400">{stats.active}</p>
              <p className="text-[10px] text-muted">Active</p>
            </button>
            <button onClick={() => setActiveFilter("inactive")} className={`rounded-lg border p-2.5 text-left transition-colors ${activeFilter === "inactive" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-gray-400">{stats.inactive}</p>
              <p className="text-[10px] text-muted">Inactive</p>
            </button>
            <div className="rounded-lg border border-border bg-card p-2.5">
              <p className="text-base font-bold text-blue-400">{stats.totalLinks}</p>
              <p className="text-[10px] text-muted">รายการสินค้า · เฉลี่ย {stats.avgProductsPerVendor} ต่อ vendor</p>
            </div>
          </div>

          {/* Type filter chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(TYPE_META) as VendorType[]).map(t => {
              const meta = TYPE_META[t];
              const selected = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(selected ? "all" : t)}
                  className={`rounded-lg border p-2 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}
                  title={meta.note}
                >
                  <p className="text-sm font-bold">{meta.icon} {typeStats[t]}</p>
                  <p className="text-[10px] text-muted truncate">{meta.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไข Vendor" : "เพิ่ม Vendor ใหม่"}</h2>

          {/* Vendor type selector */}
          <p className="text-xs text-muted uppercase mb-2">ประเภท Vendor *</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {(Object.keys(TYPE_META) as VendorType[]).map(t => {
              const meta = TYPE_META[t];
              const selected = form.vendor_type === t;
              return (
                <button
                  key={t}
                  onClick={() => applyTypeDefaults(t)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}
                  title={meta.note}
                >
                  <p className="text-base">{meta.icon} <span className="text-xs font-medium">{meta.label}</span></p>
                  <p className="text-[10px] text-muted mt-0.5">{meta.thai}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mb-4">💡 {TYPE_META[form.vendor_type].note}</p>

          {/* Basic info */}
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลพื้นฐาน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div><label className="text-[10px] text-muted">ชื่อบริษัท / ผู้ขาย *</label><input placeholder={form.vendor_type === "internal_team" ? "เช่น KMIT Service Team" : form.vendor_type === "contractor_personal" ? "เช่น ช่างสมชาย / ร้านลุงนิด" : "เช่น บริษัท ABC จำกัด"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">{form.has_vat ? "เลขผู้เสียภาษี (13 หลัก)" : "เลข ปชช. (13 หลัก) — ถ้ามี"}</label><input placeholder={form.has_vat ? "13 หลัก" : "ไม่บังคับ"} value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">เงื่อนไขชำระเงิน</label><input placeholder={form.vendor_type === "internal_team" ? "ไม่มี (ภายใน)" : "เช่น เครดิต 30 วัน, เงินสด"} value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">ผู้ติดต่อ</label><input placeholder="ชื่อผู้ติดต่อ" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">เบอร์โทร</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">อีเมล</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div className="col-span-full"><label className="text-[10px] text-muted">ที่อยู่</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div className="col-span-full"><label className="text-[10px] text-muted">หมายเหตุ</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" /></div>
          </div>

          {/* Tax + status */}
          <p className="text-xs text-muted uppercase mb-2">ภาษี / สถานะ</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <label className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={form.has_vat} onChange={e => setForm({ ...form, has_vat: e.target.checked })} />
              <span className="text-sm">จด VAT (มีใบกำกับภาษี)</span>
            </label>
            <div>
              <label className="text-[10px] text-muted">หัก ณ ที่จ่าย (%)</label>
              <input type="number" step="0.5" placeholder="0 = ไม่หัก" value={form.withholding_tax_rate || ""} onChange={e => setForm({ ...form, withholding_tax_rate: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              <p className="text-[10px] text-muted mt-0.5">3% บริการบุคคล · 1% บริการบริษัท · 5% ค่าเช่า</p>
            </div>
            <label className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2 cursor-pointer">
              <input type="checkbox" id="vendor-active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
              <span className="text-sm">Active (พร้อมใช้งาน)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่ม"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input placeholder="ค้นหาชื่อ / ผู้ติดต่อ..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} title="จัดเรียง" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="newest">เรียง: ใหม่ที่สุด</option>
          <option value="name_asc">ชื่อ ก-ฮ</option>
          <option value="products_desc">สินค้าเยอะที่สุด</option>
        </select>
        <p className="text-xs text-muted self-center">{sorted.length} รายการ</p>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : sorted.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm mb-2">{list.length === 0 ? "ยังไม่มี Vendor" : "ไม่พบ Vendor ตามตัวกรอง"}</p>
          {list.length === 0 && <p className="text-[11px] text-muted">กด &quot;+ เพิ่ม Vendor&quot; เพื่อเริ่ม</p>}
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2.5">ประเภท</th>
              <th className="px-4 py-2.5">ชื่อ Vendor</th>
              <th className="px-4 py-2.5">ผู้ติดต่อ</th>
              <th className="px-4 py-2.5">เบอร์ / อีเมล</th>
              <th className="px-4 py-2.5">VAT / WHT</th>
              <th className="px-4 py-2.5">เงื่อนไข</th>
              <th className="px-4 py-2.5 text-center" title="จำนวนสินค้าที่ vendor นี้ขาย">📦</th>
              <th className="px-4 py-2.5 text-center">สถานะ</th>
              <th className="px-4 py-2.5 w-24"></th>
            </tr></thead>
            <tbody>{sorted.map(v => {
              const cnt = productCount(v.id!);
              const vt = v.vendor_type || "distributor";
              const meta = TYPE_META[vt];
              return (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`} title={meta.note}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{v.name}{v.tax_id && <p className="text-[10px] text-muted font-mono">{v.tax_id}</p>}</td>
                  <td className="px-4 py-2.5 text-muted">{v.contact_name || "-"}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">
                    {v.phone && <p>📞 {v.phone}</p>}
                    {v.email && <p>✉️ {v.email}</p>}
                    {!v.phone && !v.email && "-"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <p>{v.has_vat ? <span className="text-green-400">✓ มี VAT</span> : <span className="text-muted">— ไม่มี VAT</span>}</p>
                    {v.withholding_tax_rate ? <p className="text-amber-400">หัก ณ ที่จ่าย {v.withholding_tax_rate}%</p> : null}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{v.payment_terms || "-"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cnt > 0 ? "bg-blue-900/50 text-blue-400" : "bg-gray-700 text-gray-400"}`}>{cnt}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {v.active ? <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">Active</span> : <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">Inactive</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(v)} className="text-xs text-accent hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(v.id!, v.name)} className="text-xs text-danger hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
