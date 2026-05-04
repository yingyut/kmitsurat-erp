"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { IntegrationSetting } from "@/lib/types";
import { TYPE_META, PLACEHOLDERS, DEFAULT_SUBFOLDERS, buildProjectFolderUrl, buildSubfolderUrl } from "@/lib/integrations";

const SEED_O365: Omit<IntegrationSetting, "id" | "tenant_id"> = {
  type: "o365_sharepoint",
  label: "SharePoint - Sales",
  base_url: "https://yourcompany.sharepoint.com/sites/Sales/Shared%20Documents",
  folder_template: "{year}/{customer}/{project}",
  default_subfolders: DEFAULT_SUBFOLDERS,
  active: true,
  notes: "เปลี่ยน yourcompany เป็นโดเมน O365 ของคุณ + ตรวจ Site/Library ให้ถูก",
};

const emptyForm: Omit<IntegrationSetting, "id" | "tenant_id"> = {
  type: "o365_sharepoint",
  label: "",
  base_url: "",
  folder_template: "{year}/{customer}/{project}",
  default_subfolders: [...DEFAULT_SUBFOLDERS],
  active: true,
  notes: "",
};

const previewCtx = {
  customer_name: "ABC Co., Ltd.",
  project_name: "Server Room Phase 1",
  customer_id: "cust123",
  project_id: "proj456",
};

export default function IntegrationsSettingsPage() {
  const [list, setList] = useState<IntegrationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [subfoldersText, setSubfoldersText] = useState(DEFAULT_SUBFOLDERS.join("\n"));

  async function load() {
    const fs = await import("@/lib/firestore");
    try { setList(await fs.integrationSettings.list()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setSubfoldersText(DEFAULT_SUBFOLDERS.join("\n"));
    setShowForm(true);
  }
  function openEdit(s: IntegrationSetting) {
    setEditId(s.id!);
    setForm({
      type: s.type, label: s.label, base_url: s.base_url, folder_template: s.folder_template,
      default_subfolders: s.default_subfolders, active: s.active, notes: s.notes || "",
    });
    setSubfoldersText((s.default_subfolders || []).join("\n"));
    setShowForm(true);
  }
  function cancelEdit() { setShowForm(false); setEditId(null); }

  async function handleSave() {
    if (!form.label.trim() || !form.base_url.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const subs = subfoldersText.split("\n").map(s => s.trim()).filter(Boolean);
      const payload = { ...form, default_subfolders: subs };
      if (editId) await fs.integrationSettings.update(editId, payload as Record<string, unknown>);
      else await fs.integrationSettings.add(payload as Record<string, unknown>);
      setShowForm(false); setEditId(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`ลบ integration "${label}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.integrationSettings.remove(id);
    await load();
  }

  async function seedO365() {
    if (!confirm("เพิ่ม SharePoint default setting?\n\nหลังจากนั้นต้องไปแก้ base_url เป็นโดเมนของบริษัทคุณ")) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try { await fs.integrationSettings.add(SEED_O365 as Record<string, unknown>); await load(); }
    finally { setSaving(false); }
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="ตั้งค่าการเชื่อมต่อระบบเก็บไฟล์">File Storage Integrations</h1>
          <p className="text-xs text-muted">ตั้งค่า base URL ของ SharePoint / OneDrive / Drive — ใช้สร้างลิงก์อัตโนมัติในงาน Presale</p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">← กลับ Settings</Link>
          {list.length === 0 && (
            <button onClick={seedO365} disabled={saving} className="rounded-lg border border-accent text-accent px-4 py-2 text-sm hover:bg-accent/10 disabled:opacity-50">📥 ตัวอย่าง SharePoint</button>
          )}
          <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่ม Integration</button>
        </div>
      </div>

      {/* Placeholders reference */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <p className="text-xs font-semibold mb-2">📘 Placeholders ใน Folder Template</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1 text-[11px]">
          {PLACEHOLDERS.map(p => (
            <div key={p.key} className="flex items-center gap-1.5">
              <code className="rounded bg-background border border-border px-1.5 py-0.5 text-accent text-[10px]">{p.key}</code>
              <span className="text-muted truncate">{p.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-2 italic">💡 ใช้ <code className="text-accent">{"{year}/{customer}/{project}"}</code> เพื่อสร้างโครงสร้าง folder ที่ดีต่อ archive — ค้นหาง่ายและไม่ปะปนกัน</p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไข Integration" : "เพิ่ม Integration ใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted">ประเภท</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as IntegrationSetting["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                {(Object.keys(TYPE_META) as IntegrationSetting["type"][]).map(t => <option key={t} value={t}>{TYPE_META[t].icon} {TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">ชื่อ (label)</label>
              <input placeholder="เช่น SharePoint - Sales Site" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div className="col-span-full">
              <label className="text-[10px] text-muted">Base URL *</label>
              <input
                placeholder="เช่น https://kmitsurat.sharepoint.com/sites/Sales/Shared%20Documents"
                value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono"
              />
              <p className="text-[10px] text-muted mt-0.5">root URL ของ document library — ปกติคือเส้นทางถึง /Shared Documents</p>
            </div>
            <div className="col-span-full">
              <label className="text-[10px] text-muted">Folder Template</label>
              <input
                placeholder="{year}/{customer}/{project}"
                value={form.folder_template} onChange={e => setForm({ ...form, folder_template: e.target.value })}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono"
              />
            </div>
            <div className="col-span-full">
              <label className="text-[10px] text-muted">Default Subfolders (1 ชื่อต่อบรรทัด)</label>
              <textarea
                value={subfoldersText} onChange={e => setSubfoldersText(e.target.value)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-32 resize-y mt-1 font-mono"
              />
              <p className="text-[10px] text-muted mt-0.5">ระบบจะแสดงปุ่มลิงก์ subfolder เหล่านี้ในงาน Presale Files tab</p>
            </div>
            <div className="col-span-full flex items-center gap-2">
              <input type="checkbox" id="int-active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
              <label htmlFor="int-active" className="text-sm">Active (ใช้งาน)</label>
            </div>
            <div className="col-span-full">
              <label className="text-[10px] text-muted">หมายเหตุ</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" />
            </div>
          </div>

          {/* Live preview */}
          {form.base_url && form.folder_template && (
            <div className="rounded-lg bg-emerald-900/10 border border-emerald-800/40 p-3 mb-3">
              <p className="text-[10px] text-muted mb-1">Live Preview (สมมติว่า ลูกค้า = "ABC Co., Ltd." · โปรเจค = "Server Room Phase 1")</p>
              <p className="text-xs font-mono text-emerald-400 break-all">📁 {buildProjectFolderUrl({ ...form, id: "x", tenant_id: "x" } as IntegrationSetting, previewCtx)}</p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {subfoldersText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4).map(sub => (
                  <p key={sub} className="text-[10px] font-mono text-muted truncate">↳ {buildSubfolderUrl({ ...form, id: "x", tenant_id: "x" } as IntegrationSetting, previewCtx, sub)}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.label.trim() || !form.base_url.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่ม"}</button>
            <button onClick={cancelEdit} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : list.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm mb-2">ยังไม่มี Integration</p>
          <p className="text-[11px] text-muted">กด <b className="text-accent">📥 ตัวอย่าง SharePoint</b> เพื่อโหลด default หรือเพิ่มเอง</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(s => {
            const meta = TYPE_META[s.type];
            const previewUrl = buildProjectFolderUrl(s, previewCtx);
            return (
              <div key={s.id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{meta.icon} {s.label} {!s.active && <span className="ml-2 text-[10px] text-muted">(inactive)</span>}</p>
                    <p className="text-[10px] text-muted">{meta.label}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="rounded-lg border border-border px-3 py-1 text-xs text-accent hover:bg-card-hover">แก้ไข</button>
                    <button onClick={() => handleDelete(s.id!, s.label)} className="rounded-lg border border-border px-3 py-1 text-xs text-danger hover:bg-card-hover">ลบ</button>
                  </div>
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="text-muted">Base URL:</span> <span className="font-mono break-all">{s.base_url}</span></p>
                  <p><span className="text-muted">Template:</span> <span className="font-mono text-accent">{s.folder_template}</span></p>
                  <p><span className="text-muted">Subfolders ({s.default_subfolders.length}):</span></p>
                  <ul className="list-none ml-4 text-[10px] font-mono text-muted">
                    {s.default_subfolders.map(sub => <li key={sub}>↳ {sub}</li>)}
                  </ul>
                  {s.notes && <p className="text-muted italic mt-1">📝 {s.notes}</p>}
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted mb-1">Preview (ลูกค้า "ABC Co.,Ltd." · โปรเจค "Server Room Phase 1"):</p>
                  <p className="text-[11px] font-mono text-emerald-400 break-all">📁 {previewUrl}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
