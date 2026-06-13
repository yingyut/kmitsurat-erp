"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/UserContext";
import type { CustomerIndustry } from "@/lib/types";

const ORG_SECTORS = [
  { value: "private",    label: "เอกชน" },
  { value: "government", label: "ราชการ/รัฐบาล" },
  { value: "ngo",        label: "NGO/มูลนิธิ" },
  { value: "all",        label: "ทุกภาคส่วน" },
];

const COLOR_OPTIONS = [
  { value: "bg-orange-900/50 text-orange-400",  label: "ส้ม" },
  { value: "bg-amber-900/50 text-amber-400",    label: "เหลืองอำพัน" },
  { value: "bg-yellow-900/50 text-yellow-400",  label: "เหลือง" },
  { value: "bg-emerald-900/50 text-emerald-400",label: "เขียว" },
  { value: "bg-cyan-900/50 text-cyan-400",      label: "ฟ้าคราม" },
  { value: "bg-sky-900/50 text-sky-400",        label: "ฟ้า" },
  { value: "bg-blue-900/50 text-blue-400",      label: "น้ำเงิน" },
  { value: "bg-indigo-900/50 text-indigo-400",  label: "คราม" },
  { value: "bg-violet-900/50 text-violet-400",  label: "ม่วง" },
  { value: "bg-purple-900/50 text-purple-400",  label: "ม่วงเข้ม" },
  { value: "bg-pink-900/50 text-pink-400",      label: "ชมพู" },
  { value: "bg-rose-900/50 text-rose-400",      label: "แดง" },
  { value: "bg-lime-900/50 text-lime-400",      label: "เขียวมะนาว" },
  { value: "bg-teal-900/50 text-teal-400",      label: "เขียวน้ำ" },
  { value: "bg-slate-700 text-slate-300",       label: "เทา" },
  { value: "bg-gray-700 text-gray-400",         label: "เทาเข้ม" },
];

const emptyForm = { label: "", sector: "private", color: "bg-orange-900/50 text-orange-400", order: 99 };

export default function CustomerIndustriesPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const canManage = hasPermission("manage_system") || ["admin","avenger"].includes(currentUser?.role ?? "");
  const [list, setList]     = useState<CustomerIndustry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState({ ...emptyForm });
  const [filterSector, setFilterSector] = useState("all");

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const data = await fs.customerIndustries.list();
      setList(data.sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); }
  function openEdit(i: CustomerIndustry) {
    setEditId(i.id!);
    setForm({ label: i.label, sector: i.sector || "private", color: i.color || emptyForm.color, order: i.order ?? 99 });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.label.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const data = { label: form.label.trim(), sector: form.sector, color: form.color, order: Number(form.order), active: true };
      if (editId) { await fs.customerIndustries.update(editId, data); }
      else { await fs.customerIndustries.add(data as Record<string, unknown>); }
      setShowForm(false); setEditId(null); setForm({ ...emptyForm }); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`ลบกลุ่มธุรกิจ "${label}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.customerIndustries.remove(id); await load();
  }

  const displayed = filterSector === "all" ? list : list.filter(i => i.sector === filterSector || i.sector === "all");

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canManage) return <div className="p-6"><p className="text-rose-400 text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">กลุ่มธุรกิจลูกค้า</h1>
          <p className="text-xs text-muted">จัดการหมวดธุรกิจ — ใช้ใน dropdown ตอนเพิ่มลูกค้า เพื่อวิเคราะห์ข้อมูลในอนาคต</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">← กลับหน้าลูกค้า</Link>
          <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มกลุ่มธุรกิจ</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขกลุ่มธุรกิจ" : "เพิ่มกลุ่มธุรกิจใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted">ชื่อกลุ่มธุรกิจ *</label>
              <input placeholder="เช่น โรงงาน, โรงแรม, ค้าปลีก" value={form.label} onChange={e => setForm({...form, label: e.target.value})}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">ภาคส่วน</label>
              <select value={form.sector} onChange={e => setForm({...form, sector: e.target.value})}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                {ORG_SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">สีป้าย</label>
              <select value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">ลำดับ (น้อย = ขึ้นก่อน)</label>
              <input type="number" value={form.order} onChange={e => setForm({...form, order: Number(e.target.value)})}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving || !form.label.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            {/* Preview */}
            {form.label && (
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${form.color}`}>
                {form.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-3">
        {["all", "private", "government", "ngo"].map(s => (
          <button key={s} onClick={() => setFilterSector(s)}
            className={`rounded-full px-3 py-1 text-xs border transition-colors ${filterSector === s ? "bg-accent border-accent text-white" : "border-border text-muted hover:bg-card-hover"}`}>
            {s === "all" ? "ทั้งหมด" : ORG_SECTORS.find(x => x.value === s)?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-sm font-semibold">กลุ่มธุรกิจทั้งหมด ({displayed.length})</p>
          </div>
          {displayed.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted text-sm">ยังไม่มีกลุ่มธุรกิจ</p>
              <button onClick={openAdd} className="mt-2 text-accent text-sm underline">+ เพิ่มกลุ่มแรก</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="px-4 py-2.5">ชื่อกลุ่มธุรกิจ</th>
                  <th className="px-4 py-2.5">ภาคส่วน</th>
                  <th className="px-4 py-2.5 text-center">ลำดับ</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(i => (
                  <tr key={i.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${i.color ?? "bg-gray-700 text-gray-400"}`}>{i.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">
                      {ORG_SECTORS.find(s => s.value === (i.sector || "all"))?.label ?? i.sector}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted text-xs">{i.order ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(i)} className="text-xs text-muted hover:text-accent">แก้ไข</button>
                        <button onClick={() => handleDelete(i.id!, i.label)} className="text-xs text-muted hover:text-rose-400">ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
