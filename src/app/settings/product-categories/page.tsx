"use client";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/UserContext";
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

const EMOJI_GROUPS: Array<{ label: string; emojis: string[] }> = [
  { label: "กล้อง / Security", emojis: ["📹", "📷", "🎥", "🔐", "🔒", "🛡️", "🚨", "🔍", "👁️", "📡"] },
  { label: "Network / IT", emojis: ["🌐", "📶", "🖥️", "💻", "🖨️", "⌨️", "🖱️", "🗄️", "📡", "🔗"] },
  { label: "ไฟฟ้า / Electrical", emojis: ["⚡", "🔋", "💡", "🔦", "🔌", "🔆", "⚙️", "🔆", "🌩️", "☀️"] },
  { label: "Service / งาน", emojis: ["🛠️", "🔧", "🔨", "🪛", "🪚", "📋", "📊", "📝", "🗂️", "📁"] },
  { label: "Software / Cloud", emojis: ["💿", "💽", "📀", "☁️", "🖧", "📲", "💾", "🔑", "🔓", "🤖"] },
  { label: "Business", emojis: ["📦", "🛒", "💼", "📌", "📍", "🗃️", "🗑️", "✅", "⭐", "🏆"] },
  { label: "อื่นๆ", emojis: ["🏗️", "🏢", "🏭", "🚗", "✈️", "🚀", "🎯", "💎", "🔑", "📏"] },
];

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="text-[10px] text-muted">Icon (Emoji)</label>
      <div className="flex gap-2 mt-1">
        {/* Preview + click to open picker */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-12 h-10 rounded-lg border text-xl flex items-center justify-center hover:bg-card-hover transition-colors ${open ? "border-accent bg-accent/5" : "border-border bg-background"}`}
          title="คลิกเพื่อเลือก emoji"
        >
          {value || "📁"}
        </button>
        {/* Manual input */}
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={4}
          placeholder="📁"
          className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} className="shrink-0 text-xs text-muted hover:text-danger px-2" title="ล้าง">✕</button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-[400px] rounded-xl bg-card border border-border shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted">เลือก Emoji</p>
            <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-foreground">✕ ปิด</button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {EMOJI_GROUPS.map(g => (
              <div key={g.label}>
                <p className="text-[10px] text-muted uppercase mb-1">{g.label}</p>
                <div className="flex flex-wrap gap-1">
                  {g.emojis.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { onChange(e); setOpen(false); }}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center hover:bg-accent/20 transition-colors ${value === e ? "bg-accent/20 ring-1 ring-accent" : "bg-background border border-border/50"}`}
                      title={e}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-2 pt-2 border-t border-border">หรือพิมพ์ emoji เองในช่องด้านบน</p>
        </div>
      )}
    </div>
  );
}

export default function ProductCategoriesPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const canManage = hasPermission("manage_system");
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

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canManage) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 items-start">
            <IconPicker value={icon} onChange={setIcon} />
            <div>
              <label className="text-[10px] text-muted">ชื่อหมวด *</label>
              <input placeholder="เช่น กล้อง CCTV, Network" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">คำอธิบาย</label>
              <input placeholder="เช่น กล้องวงจรปิด, NVR, Storage" value={desc} onChange={e => setDesc(e.target.value)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
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
                <td className="px-4 py-2.5 text-2xl">{c.icon || "📁"}</td>
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
