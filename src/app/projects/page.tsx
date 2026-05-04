"use client";
import { useEffect, useState } from "react";
import type { Project, Customer, User, ProjectType, ServiceContract } from "@/lib/types";
import Link from "next/link";

const contractTypeMeta: Record<string, { label: string; icon: string; color: string }> = {
  product_warranty:      { label: "รับประกันสินค้า",     icon: "🛡️", color: "bg-blue-900/50 text-blue-400" },
  installation_warranty: { label: "รับประกันงานติดตั้ง", icon: "🔧", color: "bg-purple-900/50 text-purple-400" },
  service_contract:      { label: "สัญญา MA",            icon: "📋", color: "bg-green-900/50 text-green-400" },
};
function daysUntilDate(date?: string): number | null {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(date);
  if (isNaN(t.getTime())) return null;
  return Math.floor((t.getTime() - today.getTime()) / 86400000);
}

const statuses = ["lead", "opportunity", "proposal", "negotiation", "won", "lost"] as const;
const statusLabels: Record<string, string> = { lead: "Lead", opportunity: "Opportunity", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const statusColor: Record<string, string> = { lead: "bg-gray-700 text-gray-300", opportunity: "bg-blue-900/50 text-blue-400", proposal: "bg-purple-900/50 text-purple-400", negotiation: "bg-yellow-900/50 text-yellow-400", won: "bg-green-900/50 text-green-400", lost: "bg-red-900/50 text-red-400" };

const emptyForm = {
  name: "", customer_id: "", customer_name: "", type: "", job_types: [] as string[], value: 0,
  status: "lead" as Project["status"], assigned_to: "", notes: "",
  win_loss_reason: "", lost_competitor: "",
  re_engage: false, re_engage_date: "", re_engage_note: "",
  reminder_date: "", reminder_type: "none" as Project["reminder_type"], reminder_sent: false,
  reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "",
};

export default function ProjectsPage() {
  const [list, setList] = useState<Project[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pTypes, setPTypes] = useState<ProjectType[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Detail
  const [detail, setDetail] = useState<Project | null>(null);

  // Customer quick-create
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCust, setNewCust] = useState({ company_name: "", contact_name: "", phone: "", email: "" });
  const [custSearch, setCustSearch] = useState("");

  // Job type inline add
  const [newTypeName, setNewTypeName] = useState("");

  // Filtered customers for search
  const filteredCusts = custSearch ? custs.filter(c => c.company_name.toLowerCase().includes(custSearch.toLowerCase()) || c.contact_name.toLowerCase().includes(custSearch.toLowerCase())) : custs;

  // Alerts
  const today = new Date().toISOString().slice(0, 10);
  const reEngageAlerts = list.filter(p => p.re_engage && p.re_engage_date && p.re_engage_date <= today && p.status === "lost");
  const reminderAlerts = list.filter(p => p.reminder_date && p.reminder_date <= today && !p.reminder_sent);

  // Dashboard stats
  const isClosed = (s: string) => s === "won" || s === "lost";
  const stats = {
    total: list.length,
    totalValue: list.reduce((s, p) => s + (p.value || 0), 0),
    active: list.filter(p => !isClosed(p.status)).length,
    activeValue: list.filter(p => !isClosed(p.status)).reduce((s, p) => s + (p.value || 0), 0),
    won: list.filter(p => p.status === "won").length,
    wonValue: list.filter(p => p.status === "won").reduce((s, p) => s + (p.value || 0), 0),
    lost: list.filter(p => p.status === "lost").length,
    lostValue: list.filter(p => p.status === "lost").reduce((s, p) => s + (p.value || 0), 0),
  };
  const closedCount = stats.won + stats.lost;
  const winRate = closedCount > 0 ? Math.round((stats.won / closedCount) * 100) : 0;

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [p, c, u, pt, ct] = await Promise.all([fs.projects.list(), fs.customers.list(), fs.users.list(), fs.projectTypes.list(), fs.serviceContracts.list()]);
      setList(p); setCusts(c); setUsers(u.filter(x => x.active)); setPTypes(pt); setContracts(ct);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Helpers for project ↔ contracts
  function contractsForProject(projectId: string): ServiceContract[] {
    return contracts.filter(c => c.project_id === projectId);
  }
  function contractCountForProject(projectId: string): number {
    return contractsForProject(projectId).length;
  }

  useEffect(() => { setMounted(true); load(); }, []);

  const filtered = list.filter(p => {
    const matchSearch = search ? (p.name.toLowerCase().includes(search.toLowerCase()) || p.customer_name.toLowerCase().includes(search.toLowerCase())) : true;
    const matchStatus = statusFilter === "all" ? true : p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function selectCustomer(id: string) {
    const c = custs.find(x => x.id === id);
    setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" });
  }

  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true); setDetail(null); }
  function openEdit(p: Project) {
    setEditId(p.id!);
    setForm({
      name: p.name, customer_id: p.customer_id, customer_name: p.customer_name,
      type: p.type, job_types: p.job_types || (p.type ? [p.type] : []), value: p.value, status: p.status, assigned_to: p.assigned_to, notes: p.notes,
      win_loss_reason: p.win_loss_reason || "", lost_competitor: p.lost_competitor || "",
      re_engage: p.re_engage || false, re_engage_date: p.re_engage_date || "", re_engage_note: p.re_engage_note || "",
      reminder_date: p.reminder_date || "", reminder_type: p.reminder_type || "none", reminder_sent: p.reminder_sent || false,
      reminder_to_name: p.reminder_to_name || "", reminder_to_email: p.reminder_to_email || "", reminder_cc_email: p.reminder_cc_email || "", reminder_note: p.reminder_note || "",
    });
    setShowForm(true); setDetail(null);
  }

  async function quickCreateCustomer() {
    if (!newCust.company_name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const ref = await fs.customers.add({ ...newCust, address: "", province: "", org_type: "private", notes: "" } as unknown as Record<string, unknown>);
      setForm({ ...form, customer_id: ref.id, customer_name: newCust.company_name });
      setNewCust({ company_name: "", contact_name: "", phone: "", email: "" });
      setShowNewCust(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function quickAddJobType() {
    if (!newTypeName.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      await fs.projectTypes.add({ name: newTypeName.trim(), description: "" });
      setForm({ ...form, job_types: [...(form.job_types || []), newTypeName.trim()] });
      setNewTypeName("");
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  function toggleJobType(typeName: string) {
    const arr = form.job_types || [];
    setForm({ ...form, job_types: arr.includes(typeName) ? arr.filter(t => t !== typeName) : [...arr, typeName] });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    // Sync type field for backward compat
    const saveData = { ...form, type: form.job_types?.length ? form.job_types.join(", ") : form.type };
    try {
      if (editId) { await fs.projects.update(editId, saveData as unknown as Record<string, unknown>); }
      else { await fs.projects.add(saveData as unknown as Record<string, unknown>); }
      setForm(emptyForm); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบโปรเจค "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.projects.remove(id);
    if (detail?.id === id) setDetail(null);
    await load();
  }

  async function markReminderSent(id: string) {
    const fs = await import("@/lib/firestore");
    await fs.projects.update(id, { reminder_sent: true });
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="Sales Pipeline / โอกาสขาย">Sales Pipeline</h1>
          <p className="text-xs text-muted">โอกาสขาย / ดีล — ติดตามสถานะ Lead → Won/Lost วางแผน Re-engage</p>
        </div>
        <button onClick={openAdd} title="เพิ่มโปรเจคใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ โปรเจคใหม่</button>
      </div>

      {/* Alerts */}
      {(reEngageAlerts.length > 0 || reminderAlerts.length > 0) && (
        <div className="space-y-2 mb-4">
          {reEngageAlerts.map(p => (
            <div key={`re-${p.id}`} className="rounded-lg bg-amber-900/20 border border-amber-800 px-4 py-3 text-sm text-amber-400 flex items-center justify-between">
              <span>🔔 ถึงเวลา Re-engage: <b>{p.name}</b> ({p.customer_name}) — {p.re_engage_note}</span>
              <button onClick={() => openEdit(p)} className="text-xs bg-amber-800/50 rounded px-2 py-1 hover:bg-amber-800">เปิดแก้ไข</button>
            </div>
          ))}
          {reminderAlerts.map(p => (
            <div key={`rm-${p.id}`} className="rounded-lg bg-blue-900/20 border border-blue-800 px-4 py-3 text-sm text-blue-400 flex items-center justify-between">
              <div>
                <span>📧 แจ้งเตือน: <b>{p.name}</b> — กำหนด {p.reminder_date}</span>
                <span className="text-xs text-muted ml-2">
                  {p.reminder_to_name ? `→ ${p.reminder_to_name}` : ""}
                  {p.reminder_to_email ? ` (${p.reminder_to_email})` : ""}
                  {p.reminder_type === "both" ? " [อีเมล+ระบบ]" : p.reminder_type === "email" ? " [อีเมล]" : " [ระบบ]"}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => markReminderSent(p.id!)} className="text-xs bg-blue-800/50 rounded px-2 py-1 hover:bg-blue-800">✓ ส่งแล้ว</button>
                <button onClick={() => openEdit(p)} className="text-xs bg-blue-800/50 rounded px-2 py-1 hover:bg-blue-800">แก้ไข</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard */}
      {!loading && list.length > 0 && (
        <div className="space-y-3 mb-4">
          {/* Overall metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted">ดีลทั้งหมด</p>
              <p className="text-lg font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">{(stats.totalValue / 1000).toLocaleString()}K THB</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted" title="ดีลที่ยังไม่ปิด (Lead/Opportunity/Proposal/Negotiation)">Pipeline (Active)</p>
              <p className="text-lg font-bold text-blue-400">{stats.active}</p>
              <p className="text-[10px] text-muted">{(stats.activeValue / 1000).toLocaleString()}K THB</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted">Won</p>
              <p className="text-lg font-bold text-green-400">{stats.won}</p>
              <p className="text-[10px] text-muted">{(stats.wonValue / 1000).toLocaleString()}K THB</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted" title="อัตราชนะ = Won / (Won + Lost)">Win Rate</p>
              <p className="text-lg font-bold">{winRate}%</p>
              <p className="text-[10px] text-muted">{stats.won}/{closedCount} closed</p>
            </div>
          </div>

          {/* Pipeline by status — clickable filter */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            {statuses.map(s => {
              const count = list.filter(p => p.status === s).length;
              const value = list.filter(p => p.status === s).reduce((sum, p) => sum + (p.value || 0), 0);
              return (
                <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={`rounded-lg border p-3 text-center transition-colors ${statusFilter === s ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-muted">{statusLabels[s]}</p>
                  <p className="text-[10px] text-muted">{(value / 1000).toFixed(0)}K</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input placeholder="ค้นหาโปรเจค..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title="กรองตามสถานะ" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกสถานะ</option>
          {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <p className="text-xs text-muted self-center ml-1">{filtered.length} รายการ</p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขโปรเจค" : "เพิ่มโปรเจคใหม่"}</h2>

          {/* Basic info */}
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลทั่วไป</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">ชื่อโปรเจค *</label><input placeholder="เช่น WiFi โรงเรียน ABC" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div>
              <label className="text-[10px] text-muted">ลูกค้า</label>
              <div className="flex gap-1.5 mt-1">
                <div className="flex-1">
                  <input placeholder="ค้นหาลูกค้า..." value={custSearch} onChange={e => setCustSearch(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-[10px] focus:outline-none focus:border-accent mb-1" />
                  <select value={form.customer_id} onChange={e => selectCustomer(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                    <option value="">-- เลือกลูกค้า --</option>
                    {filteredCusts.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => setShowNewCust(!showNewCust)} title="สร้างลูกค้าใหม่" className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-sm text-accent hover:bg-card-hover self-end">+</button>
              </div>
              {showNewCust && (
                <div className="mt-2 p-3 rounded-lg bg-background border border-accent/50">
                  <p className="text-[10px] text-accent font-medium mb-2">สร้างลูกค้าใหม่</p>
                  <div className="space-y-1.5">
                    <input placeholder="ชื่อบริษัท *" value={newCust.company_name} onChange={e => setNewCust({ ...newCust, company_name: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <input placeholder="ชื่อผู้ติดต่อ" value={newCust.contact_name} onChange={e => setNewCust({ ...newCust, contact_name: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <input placeholder="เบอร์โทร" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <input placeholder="อีเมล" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={quickCreateCustomer} disabled={saving || !newCust.company_name.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "สร้าง"}</button>
                      <button type="button" onClick={() => setShowNewCust(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ยกเลิก</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="col-span-full">
              <label className="text-[10px] text-muted">ประเภทงาน (เลือกได้หลายชนิด)</label>
              {/* Selected tags */}
              {(form.job_types || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                  {(form.job_types || []).map(t => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-accent/20 text-accent px-2.5 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => toggleJobType(t)} className="hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Checkbox grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 mt-1 p-2 rounded-lg bg-background border border-border max-h-[120px] overflow-y-auto">
                {pTypes.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-card-hover rounded px-1.5 py-1">
                    <input type="checkbox" checked={(form.job_types || []).includes(t.name)} onChange={() => toggleJobType(t.name)} />
                    {t.name}
                  </label>
                ))}
              </div>
              {/* Inline add new type */}
              <div className="flex gap-1.5 mt-1.5">
                <input placeholder="เพิ่มประเภทใหม่..." value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent" />
                <button type="button" onClick={quickAddJobType} disabled={!newTypeName.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50">+ เพิ่ม</button>
              </div>
            </div>
            <div><label className="text-[10px] text-muted">มูลค่า (THB)</label><input type="number" placeholder="เช่น 500000" value={form.value || ""} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">สถานะ</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project["status"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">ผู้รับผิดชอบ</label><select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกผู้รับผิดชอบ --</option>{users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}</select></div>
            <div className="col-span-full"><label className="text-[10px] text-muted">หมายเหตุ</label><textarea placeholder="รายละเอียดเพิ่มเติม" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" /></div>
          </div>

          {/* Win/Loss reason */}
          {(form.status === "won" || form.status === "lost") && (<>
            <p className="text-xs text-muted uppercase mb-2">{form.status === "won" ? "เหตุผลที่ชนะงาน" : "เหตุผลที่แพ้งาน"}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <textarea placeholder={form.status === "won" ? "เหตุผลที่ชนะ เช่น ราคาดี, Solution ตรงความต้องการ" : "เหตุผลที่แพ้ เช่น ราคาสูงกว่าคู่แข่ง, ไม่ตรง Spec"} value={form.win_loss_reason} onChange={e => setForm({ ...form, win_loss_reason: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y" />
              {form.status === "lost" && (
                <input placeholder="คู่แข่งที่ชนะ เช่น บริษัท XYZ" value={form.lost_competitor} onChange={e => setForm({ ...form, lost_competitor: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              )}
            </div>
          </>)}

          {/* Re-engage plan (show for lost) */}
          {form.status === "lost" && (<>
            <p className="text-xs text-muted uppercase mb-2">แผนติดตามกลับ (Re-engage)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.re_engage} onChange={e => setForm({ ...form, re_engage: e.target.checked })} id="re-engage" />
                <label htmlFor="re-engage" className="text-sm">ต้องการติดตามกลับ</label>
              </div>
              {form.re_engage && (<>
                <input type="date" value={form.re_engage_date} onChange={e => setForm({ ...form, re_engage_date: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" title="วันที่จะเสนอใหม่" />
                <textarea placeholder="แผน Re-engage เช่น แพ้งาน MA ปีนี้ ปีหน้าจะเสนอใหม่ เตรียมราคาพิเศษ" value={form.re_engage_note} onChange={e => setForm({ ...form, re_engage_note: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-12 resize-y" />
              </>)}
            </div>
          </>)}

          {/* Reminder */}
          <p className="text-xs text-muted uppercase mb-2">แจ้งเตือนล่วงหน้า</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div><label className="text-[10px] text-muted">วันที่แจ้งเตือน</label><input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">ช่องทางแจ้งเตือน</label><select value={form.reminder_type} onChange={e => setForm({ ...form, reminder_type: e.target.value as Project["reminder_type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="none">ไม่แจ้งเตือน</option><option value="email">อีเมลเท่านั้น</option><option value="system">ระบบ (Dashboard) เท่านั้น</option><option value="both">ทั้งอีเมลและระบบ</option></select></div>
            <div><label className="text-[10px] text-muted">ผู้รับผิดชอบหลัก</label><select value={form.reminder_to_name} onChange={e => { const u = users.find(x => x.name === e.target.value); setForm({ ...form, reminder_to_name: e.target.value, reminder_to_email: u?.email || form.reminder_to_email }); }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกผู้รับแจ้งเตือน --</option>{users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}</select></div>
          </div>

          {(form.reminder_type === "email" || form.reminder_type === "both") && (<>
            {/* Email recipients */}
            <div className="rounded-lg bg-background border border-border p-3 mb-3">
              <label className="text-[10px] text-muted font-semibold">เลือกผู้รับอีเมลแจ้งเตือน (เลือกได้หลายคน)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 mt-2 max-h-[140px] overflow-y-auto">
                {users.map(u => {
                  const emails = form.reminder_to_email.split(",").map(e => e.trim()).filter(Boolean);
                  const checked = emails.includes(u.email || "");
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-card-hover rounded px-2 py-1">
                      <input type="checkbox" checked={checked} onChange={e => {
                        const set = new Set(emails);
                        if (e.target.checked) set.add(u.email || ""); else set.delete(u.email || "");
                        setForm({ ...form, reminder_to_email: [...set].join(", ") });
                      }} />
                      <span>{u.name}</span>
                      <span className="text-muted">({u.email})</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2">
                <label className="text-[10px] text-muted">อีเมลเพิ่มเติม (พิมพ์เพิ่มได้ คั่นด้วย , )</label>
                <input placeholder="เช่น manager@company.com, boss@company.com" value={form.reminder_to_email} onChange={e => setForm({ ...form, reminder_to_email: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-muted">CC อีเมล (ผู้บริหาร / หัวหน้าทีม)</label>
                <input placeholder="เช่น yingyut@kmitsurat.com" value={form.reminder_cc_email} onChange={e => setForm({ ...form, reminder_cc_email: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
            </div>
          </>)}

          <div><label className="text-[10px] text-muted">หมายเหตุแจ้งเตือน</label><textarea placeholder="เช่น ติดตาม MA ปีหน้า เตรียมราคาพิเศษ, เสนองาน WiFi Phase 2" value={form.reminder_note} onChange={e => setForm({ ...form, reminder_note: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1 mb-4" /></div>

          {form.reminder_date && form.reminder_type !== "none" && (
            <div className="rounded-lg bg-blue-900/10 border border-blue-800/30 px-3 py-2 text-xs text-blue-400 mb-4">
              ✓ ตั้งแจ้งเตือน <b>{form.reminder_date}</b>
              {form.reminder_to_name && <> ผู้รับผิดชอบ: <b>{form.reminder_to_name}</b></>}
              {form.reminder_to_email && <><br/>📧 ส่งถึง: {form.reminder_to_email}</>}
              {form.reminder_cc_email && <><br/>CC: {form.reminder_cc_email}</>}
              <br/>ช่องทาง: {form.reminder_type === "email" ? "อีเมล" : form.reminder_type === "system" ? "ระบบ" : "อีเมล+ระบบ"}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">{detail.name}</h2>
              <p className="text-sm text-muted">{detail.customer_name} · {detail.type} · {(detail.value || 0).toLocaleString()} THB</p>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[detail.status]}`}>{statusLabels[detail.status]}</span>
              <button onClick={() => openEdit(detail)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-card-hover">แก้ไข</button>
              <button onClick={() => setDetail(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ปิด</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {detail.assigned_to && <div><p className="text-xs text-muted">ผู้รับผิดชอบ</p><p>{detail.assigned_to}</p></div>}
            {detail.notes && <div><p className="text-xs text-muted">หมายเหตุ</p><p>{detail.notes}</p></div>}

            {/* Win/Loss */}
            {detail.win_loss_reason && (
              <div className="col-span-full">
                <p className="text-xs text-muted">{detail.status === "won" ? "เหตุผลที่ชนะ" : "เหตุผลที่แพ้"}</p>
                <p className={detail.status === "won" ? "text-green-400" : "text-red-400"}>{detail.win_loss_reason}</p>
                {detail.lost_competitor && <p className="text-xs text-muted mt-1">คู่แข่ง: {detail.lost_competitor}</p>}
              </div>
            )}

            {/* Re-engage */}
            {detail.re_engage && (
              <div className="col-span-full rounded-lg bg-amber-900/10 border border-amber-800/30 p-3">
                <p className="text-xs text-amber-400 font-semibold mb-1">📌 แผน Re-engage</p>
                <p className="text-sm">{detail.re_engage_note}</p>
                <p className="text-xs text-muted mt-1">กำหนดเสนอใหม่: <b className="text-amber-400">{detail.re_engage_date}</b></p>
              </div>
            )}

            {/* Reminder */}
            {detail.reminder_date && detail.reminder_type !== "none" && (
              <div className="col-span-full rounded-lg bg-blue-900/10 border border-blue-800/30 p-3">
                <p className="text-xs text-blue-400 font-semibold mb-1">🔔 การแจ้งเตือน</p>
                <p className="text-sm">วันที่ {detail.reminder_date} ผ่าน{detail.reminder_type === "email" ? "อีเมล" : detail.reminder_type === "system" ? "ระบบ" : "อีเมล+ระบบ"} {detail.reminder_sent ? <span className="text-green-400">(ส่งแล้ว ✓)</span> : <span className="text-yellow-400">(ยังไม่ส่ง)</span>}</p>
                {detail.reminder_to_name && <p className="text-xs text-muted mt-1">ถึง: {detail.reminder_to_name} {detail.reminder_to_email && `(${detail.reminder_to_email})`}</p>}
                {detail.reminder_cc_email && <p className="text-xs text-muted">CC: {detail.reminder_cc_email}</p>}
                {detail.reminder_note && <p className="text-xs text-muted mt-1">หมายเหตุ: {detail.reminder_note}</p>}
              </div>
            )}

            {/* Contracts attached to this project */}
            {(() => {
              const projContracts = contractsForProject(detail.id!);
              const activeContracts = projContracts.filter(c => c.status === "active");
              const totalContractValue = activeContracts.reduce((s, c) => s + (c.contract_value || 0), 0);
              return (
                <div className="col-span-full rounded-lg bg-emerald-900/10 border border-emerald-800/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-emerald-400 font-semibold">🛡️ สัญญา / รับประกัน ({projContracts.length}{projContracts.length > 0 && ` · active ${activeContracts.length}`})</p>
                    <Link href="/contracts" className="text-[10px] text-accent hover:underline">+ เพิ่มสัญญาใหม่ →</Link>
                  </div>
                  {projContracts.length === 0 ? (
                    <p className="text-xs text-muted">ยังไม่มีสัญญา/รับประกันสำหรับโปรเจคนี้ — <Link href="/contracts" className="text-accent hover:underline">เพิ่มเลย</Link></p>
                  ) : (
                    <>
                      {totalContractValue > 0 && <p className="text-[10px] text-muted mb-1">มูลค่ารวม Active: <b className="text-emerald-400">{totalContractValue.toLocaleString()} THB</b></p>}
                      <div className="space-y-1">
                        {projContracts.map(c => {
                          const meta = contractTypeMeta[c.type];
                          const days = daysUntilDate(c.end_date);
                          const dayColor = days === null ? "text-muted" : days < 0 ? "text-red-400 font-semibold" : days <= 30 ? "text-red-400" : days <= 90 ? "text-amber-400" : "text-green-400";
                          return (
                            <div key={c.id} className="flex items-center gap-2 text-xs py-1 border-b border-emerald-800/30 last:border-0">
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.icon} {meta.label}</span>
                              <span className="font-medium flex-1 truncate">{c.title}</span>
                              {c.type === "service_contract" && c.service_level && <span className="text-[10px] text-muted shrink-0">{c.service_level}</span>}
                              <span className="text-muted shrink-0 text-[10px]">{c.start_date} → {c.end_date}</span>
                              <span className={`shrink-0 text-[10px] ${dayColor}`}>{days === null ? "—" : days < 0 ? `เลย ${Math.abs(days)}d` : `${days}d`}</span>
                              {c.contract_value ? <span className="text-emerald-400 shrink-0 w-20 text-right text-[10px]">{c.contract_value.toLocaleString()}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* Project list */}
      {filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบโปรเจค</p> : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover cursor-pointer transition-colors" onClick={() => setDetail(p)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[p.status]}`}>{statusLabels[p.status]}</span>
                    {p.re_engage && <span className="shrink-0 rounded-full bg-amber-900/50 px-2 py-0.5 text-[10px] text-amber-400" title={`Re-engage: ${p.re_engage_date}`}>📌 Re-engage</span>}
                    {p.reminder_date && p.reminder_type !== "none" && !p.reminder_sent && <span className="shrink-0 rounded-full bg-blue-900/50 px-2 py-0.5 text-[10px] text-blue-400" title={`Reminder: ${p.reminder_date}`}>🔔</span>}
                    {contractCountForProject(p.id!) > 0 && <span className="shrink-0 rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] text-emerald-400" title={`${contractCountForProject(p.id!)} สัญญา/รับประกัน`}>🛡️ {contractCountForProject(p.id!)}</span>}
                  </div>
                  <p className="text-xs text-muted">{p.customer_name} · {(p.job_types?.length ? p.job_types.join(", ") : p.type) || "—"} · {(p.value || 0).toLocaleString()} THB{p.assigned_to && ` · ${p.assigned_to}`}</p>
                  {p.win_loss_reason && <p className="text-xs mt-1 text-muted italic">{p.status === "won" ? "✓" : "✗"} {p.win_loss_reason.slice(0, 60)}{p.win_loss_reason.length > 60 ? "..." : ""}</p>}
                  {p.re_engage && p.re_engage_date && <p className="text-[10px] text-amber-400 mt-0.5">เสนอใหม่: {p.re_engage_date} — {p.re_engage_note?.slice(0, 40)}</p>}
                </div>
                <div className="flex gap-2 shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(p)} title="แก้ไข" className="text-xs text-accent hover:underline">แก้ไข</button>
                  <button onClick={() => handleDelete(p.id!, p.name)} title="ลบ" className="text-xs text-danger hover:underline">ลบ</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </>)}
    </div>
  );
}
