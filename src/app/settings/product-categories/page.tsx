"use client";
import { useEffect, useState } from "react";
import type { ProductCategory } from "@/lib/types";
import Link from "next/link";

const SEED: Array<{ name: string; description: string; icon: string }> = [
  { name: "กล้อง CCTV", description: "กล้องวงจรปิด, NVR, Storage", icon: "📹" },
  { name: "Server", description: "เซิร์ฟเวอร์, Storage, Rack", icon: "🖥️" },
  { name: "Network", description: "Switch, Router, Firewall, AP", icon: "🌐" },
  { name: "WiFi", description: "Access Point, Controller, Antenna", icon: "📶" },
  { name: "Access Control", description: "เครื่องทาบบัตร, ประตู, Lock", icon: "🔐" },
  { name: "งานติดตั้ง", description: "ค่าแรงติดตั้ง, Site Survey, Configuration", icon: "🛠️" },
  { name: "ไฟฟ้า", description: "สายไฟ, Breaker, ตู้ MDB, UPS", icon: "⚡" },
  { name: "Cabling", description: "สาย UTP, Fiber, Conduit, Cable Tray", icon: "🔌" },
  { name: "Software / License", description: "License, Subscription, Cloud", icon: "💿" },
  { name: "อุปกรณ์เสริม", description: "Bracket, Adapter, Mounting", icon: "🔧" },
  { name: "MA / Service", description: "Maintenance Agreement, PM Service", icon: "📋" },
];

export default function ProductCategoriesPage() {
  const [list, setList] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("");

  async function load() {
    const fs = await import("@/lib/firestore");
    try { setList(await fs.productCategories.list()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  function openAdd() { setEditId(null); setName(""); setDesc(""); setIcon(""); setShowForm(true); }
  function openEdit(c: ProductCategory) { setEditId(c.id!); setName(c.name); setDesc(c.description || ""); setIcon(c.icon || ""); setShowForm(true); }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const data = { name: name.trim(), description: desc.trim(), icon: icon.trim() };
      if (editId) await fs.productCategories.update(editId, data);
      else await fs.productCategories.add(data);
      setName(""); setDesc(""); setIcon(""); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, n: string) {
    if (!confirm(`ลบหมวด "${n}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.productCategories.remove(id); await load();
  }

  async function seedTemplates() {
    if (!confirm(`เพิ่ม ${SEED.length} หมวดมาตรฐาน (กล้อง CCTV, Server, Network, ฯลฯ) ?`)) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const existingNames = new Set(list.map(c => c.name.toLowerCase()));
      for (const s of SEED) {
        if (existingNames.has(s.name.toLowerCase())) continue;
        await fs.productCategories.add(s);
      }
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="จัดการหมวดหมู่สินค้า">Product Categories</h1>
          <p className="text-xs text-muted">จัดการหมวดหมู่สินค้า / บริการ — ใช้ใน dropdown ตอนเพิ่มสินค้า และ filter</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">← กลับไปหน้าสินค้า</Link>
          {list.length === 0 && (
            <button onClick={seedTemplates} disabled={saving} className="rounded-lg border border-accent text-accent px-4 py-2 text-sm hover:bg-accent/10 disabled:opacity-50">📦 โหลดหมวดมาตรฐาน</button>
          )}
          <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มหมวด</button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขหมวด" : "เพิ่มหมวดใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted">Icon (Emoji, ไม่บังคับ)</label>
              <input placeholder="📹" value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ชื่อหมวด *</label>
              <input placeholder="เช่น กล้อง CCTV, Network" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">คำอธิบาย</label>
              <input placeholder="เช่น กล้องวงจรปิด, NVR, Storage" value={desc} onChange={e => setDesc(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : list.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted mb-2">ยังไม่มีหมวดหมู่สินค้า</p>
          <p className="text-xs text-muted mb-4">กด &quot;📦 โหลดหมวดมาตรฐาน&quot; เพื่อเพิ่ม 11 หมวดที่ใช้บ่อย หรือเพิ่มเอง</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2.5 w-12">Icon</th>
              <th className="px-4 py-2.5">ชื่อหมวด</th>
              <th className="px-4 py-2.5">คำอธิบาย</th>
              <th className="px-4 py-2.5 w-28">จัดการ</th>
            </tr></thead>
            <tbody>{list.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                <td className="px-4 py-2.5 text-lg">{c.icon || "📁"}</td>
                <td className="px-4 py-2.5 font-medium">{c.name}</td>
                <td className="px-4 py-2.5 text-muted">{c.description || "-"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-xs text-accent hover:underline">แก้ไข</button>
                    <button onClick={() => handleDelete(c.id!, c.name)} className="text-xs text-danger hover:underline">ลบ</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
