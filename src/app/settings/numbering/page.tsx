"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { NumberingSetting, User } from "@/lib/types";
import { PLACEHOLDERS, previewNext } from "@/lib/numbering";

const docTypeMeta: Record<NumberingSetting["doc_type"], { icon: string; label: string }> = {
  quotation:      { icon: "💰", label: "ใบเสนอราคา (Quotation)" },
  contract:       { icon: "🛡️", label: "สัญญา / รับประกัน (Contract)" },
  invoice:        { icon: "📄", label: "ใบแจ้งหนี้ (Invoice)" },
  po:             { icon: "📋", label: "ใบสั่งซื้อ (PO)" },
  service_ticket: { icon: "🔧", label: "ใบงานบริการ (Service Ticket)" },
};

const SEED_DEFAULTS: Array<Omit<NumberingSetting, "id" | "tenant_id">> = [
  {
    doc_type: "quotation", label: "ใบเสนอราคา",
    prefix: "QON",
    template: "{prefix}{user_code}{year_ce_2}{month}-{seq3}",
    current_seq: 0,
    reset_cycle: "monthly",
    active: true,
  },
  {
    doc_type: "contract", label: "สัญญา / รับประกัน",
    prefix: "KM",
    template: "{prefix}-{year_be_2}{month}-{seq4}",
    current_seq: 0,
    reset_cycle: "yearly",
    active: true,
  },
  {
    doc_type: "invoice", label: "ใบแจ้งหนี้",
    prefix: "INV",
    template: "{prefix}{year_be_4}/{seq4}",
    current_seq: 0,
    reset_cycle: "yearly",
    active: true,
  },
  {
    doc_type: "po", label: "ใบสั่งซื้อ",
    prefix: "PO",
    template: "{prefix}-{year_ce_2}{month}-{seq3}",
    current_seq: 0,
    reset_cycle: "monthly",
    active: true,
  },
  {
    doc_type: "service_ticket", label: "ใบงานบริการ",
    prefix: "ST",
    template: "{prefix}{year_ce_2}{month}{day}-{seq3}",
    current_seq: 0,
    reset_cycle: "monthly",
    active: true,
  },
];

export default function NumberingSettingsPage() {
  const [list, setList] = useState<NumberingSetting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [previewUserCode, setPreviewUserCode] = useState("SPLC");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NumberingSetting>>({});

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [s, u] = await Promise.all([fs.numberingSettings.list(), fs.users.list()]);
      setList(s);
      setUsers(u.filter(x => x.active));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Seed defaults if none exist
  async function seedDefaults() {
    if (!confirm(`โหลด setting มาตรฐาน 5 ประเภท ?\n\n• QONSPLC2404-056 (Quotation)\n• KM-6704-0023 (Contract)\n• INV2567/0156 (Invoice)\n• PO-2404-001 (PO)\n• ST240415-001 (Service Ticket)`)) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const existing = new Set(list.map(s => s.doc_type));
      for (const s of SEED_DEFAULTS) {
        if (existing.has(s.doc_type)) continue;
        await fs.numberingSettings.add(s as unknown as Record<string, unknown>);
      }
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  function startEdit(s: NumberingSetting) {
    setEditId(s.id!);
    setEditForm({
      prefix: s.prefix, template: s.template, current_seq: s.current_seq,
      reset_cycle: s.reset_cycle, active: s.active !== false,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      await fs.numberingSettings.update(editId, editForm as Record<string, unknown>);
      setEditId(null); setEditForm({});
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  function cancelEdit() { setEditId(null); setEditForm({}); }

  async function resetSeq(s: NumberingSetting) {
    const newSeq = prompt(`Reset เลขลำดับของ "${s.label}" เป็นเท่าไหร่ ?\n(ปัจจุบัน: ${s.current_seq})`, "0");
    if (newSeq === null) return;
    const n = Number(newSeq);
    if (isNaN(n) || n < 0) return;
    const fs = await import("@/lib/firestore");
    await fs.numberingSettings.update(s.id!, { current_seq: n, last_reset_period: "" });
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  const userCodes = [...new Set(users.map(u => u.sales_code).filter(Boolean) as string[])];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="ตั้งค่าเลขเอกสาร">Document Numbering</h1>
          <p className="text-xs text-muted">ตั้งค่า prefix + รูปแบบเลขที่เอกสารแต่ละประเภท</p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">← กลับหน้า Settings</Link>
          {list.length === 0 && (
            <button onClick={seedDefaults} disabled={saving} className="rounded-lg border border-accent text-accent px-4 py-2 text-sm hover:bg-accent/10 disabled:opacity-50">📥 โหลด Setting มาตรฐาน</button>
          )}
        </div>
      </div>

      {/* Placeholder reference */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <p className="text-xs font-semibold mb-2">📘 Placeholders ที่ใช้ได้ใน Template</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1 text-[11px]">
          {PLACEHOLDERS.map(p => (
            <div key={p.key} className="flex items-center gap-1.5">
              <code className="rounded bg-background border border-border px-1.5 py-0.5 text-accent text-[10px]">{p.key}</code>
              <span className="text-muted truncate">{p.desc}</span>
              <span className="text-muted/60 shrink-0">→ {p.example}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <label className="text-[10px] text-muted">รหัสเซลล์ที่ใช้ใน preview:</label>
          <div className="flex items-center gap-2 mt-1">
            <input value={previewUserCode} onChange={e => setPreviewUserCode(e.target.value)} maxLength={5} className="rounded bg-background border border-border px-2 py-1 text-xs font-mono w-24" />
            {userCodes.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {userCodes.map(c => (
                  <button key={c} onClick={() => setPreviewUserCode(c)} className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-card-hover">{c}</button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted ml-auto">ตั้งค่า sales_code ใน <Link href="/users" className="text-accent hover:underline">/users</Link></p>
          </div>
        </div>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : list.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm mb-2">ยังไม่มี Setting เลขเอกสาร</p>
          <p className="text-[11px] text-muted">กด <b className="text-accent">📥 โหลด Setting มาตรฐาน</b> เพื่อเริ่มอย่างเร็ว</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.sort((a, b) => a.doc_type.localeCompare(b.doc_type)).map(s => {
            const isEditing = editId === s.id;
            const meta = docTypeMeta[s.doc_type];
            const previewing = isEditing ? { ...s, ...editForm } as NumberingSetting : s;
            const preview = previewNext(previewing, { user_code: previewUserCode || "USER" });
            return (
              <div key={s.id} className={`rounded-xl bg-card border p-4 ${isEditing ? "border-accent" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <p className="text-sm font-semibold">{meta.icon} {meta.label}</p>
                    <p className="text-[10px] text-muted font-mono">{s.doc_type}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && <button onClick={() => startEdit(s)} className="rounded-lg border border-border px-3 py-1 text-xs text-accent hover:bg-card-hover">แก้ไข</button>}
                    {!isEditing && <button onClick={() => resetSeq(s)} className="rounded-lg border border-border px-3 py-1 text-xs text-muted hover:bg-card-hover">↺ Reset Seq</button>}
                  </div>
                </div>

                {/* Live preview */}
                <div className="rounded-lg bg-emerald-900/10 border border-emerald-800/40 p-3 mb-3">
                  <p className="text-[10px] text-muted mb-1">เลขถัดไปที่จะออก (Live Preview)</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">{preview}</p>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-muted">Prefix</label>
                    <input
                      value={isEditing ? editForm.prefix ?? "" : s.prefix}
                      onChange={isEditing ? e => setEditForm({ ...editForm, prefix: e.target.value }) : undefined}
                      readOnly={!isEditing}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-muted">Template</label>
                    <input
                      value={isEditing ? editForm.template ?? "" : s.template}
                      onChange={isEditing ? e => setEditForm({ ...editForm, template: e.target.value }) : undefined}
                      readOnly={!isEditing}
                      placeholder="เช่น {prefix}{user_code}{year_ce_2}{month}-{seq3}"
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Reset Cycle</label>
                    <select
                      value={isEditing ? editForm.reset_cycle ?? "never" : s.reset_cycle}
                      onChange={isEditing ? e => setEditForm({ ...editForm, reset_cycle: e.target.value as NumberingSetting["reset_cycle"] }) : undefined}
                      disabled={!isEditing}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"
                    >
                      <option value="never">ไม่ Reset</option>
                      <option value="yearly">รายปี</option>
                      <option value="monthly">รายเดือน</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-2 text-[10px] text-muted">
                  <div>เลขล่าสุดที่ออก: <b className="text-foreground">{s.current_seq || 0}</b></div>
                  {s.last_reset_period && <div>Reset ครั้งล่าสุด: <b className="text-foreground">{s.last_reset_period}</b></div>}
                </div>

                {isEditing && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button onClick={saveEdit} disabled={saving} className="rounded-lg bg-accent text-white px-4 py-1.5 text-xs hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "💾 บันทึก"}</button>
                    <button onClick={cancelEdit} className="rounded-lg border border-border px-4 py-1.5 text-xs text-muted hover:bg-card-hover">ยกเลิก</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
