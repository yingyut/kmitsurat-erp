"use client";
import { useEffect, useState } from "react";
import type { ProjectType } from "@/lib/types";
import Link from "next/link";

export default function ProjectTypesPage() {
  const [list, setList] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function load() {
    const fs = await import("@/lib/firestore");
    try { setList(await fs.projectTypes.list()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  function openAdd() { setEditId(null); setName(""); setDesc(""); setShowForm(true); }
  function openEdit(t: ProjectType) { setEditId(t.id!); setName(t.name); setDesc(t.description || ""); setShowForm(true); }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editId) { await fs.projectTypes.update(editId, { name: name.trim(), description: desc.trim() }); }
      else { await fs.projectTypes.add({ name: name.trim(), description: desc.trim() }); }
      setName(""); setDesc(""); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, n: string) {
    if (!confirm(`ลบประเภท "${n}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.projectTypes.remove(id); await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="จัดการประเภทงาน">Project Types</h1>
          <p className="text-xs text-muted">จัดการประเภทงาน / โปรเจค — ใช้ใน dropdown ตอนสร้างโปรเจค</p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">← กลับไปหน้าโปรเจค</Link>
          <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มประเภท</button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขประเภทงาน" : "เพิ่มประเภทงานใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted">ชื่อประเภทงาน *</label>
              <input placeholder="เช่น WiFi, CCTV, Network, Server, Access Control" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">คำอธิบาย</label>
              <input placeholder="เช่น งานติดตั้งระบบ WiFi ทั้งอาคาร" value={desc} onChange={e => setDesc(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
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
          <p className="text-muted mb-2">ยังไม่มีประเภทงาน</p>
          <p className="text-xs text-muted">กด &quot;+ เพิ่มประเภท&quot; เพื่อเพิ่ม เช่น WiFi, CCTV, Network</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2.5">ชื่อประเภท</th>
              <th className="px-4 py-2.5">คำอธิบาย</th>
              <th className="px-4 py-2.5 w-28">จัดการ</th>
            </tr></thead>
            <tbody>{list.map(t => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                <td className="px-4 py-2.5 font-medium">{t.name}</td>
                <td className="px-4 py-2.5 text-muted">{t.description || "-"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(t)} className="text-xs text-accent hover:underline">แก้ไข</button>
                    <button onClick={() => handleDelete(t.id!, t.name)} className="text-xs text-danger hover:underline">ลบ</button>
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
