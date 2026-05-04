"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { ServiceContract, Customer, Project } from "@/lib/types";

type ContractType = ServiceContract["type"];
type ContractStatus = ServiceContract["status"];

const typeMeta: Record<ContractType, { label: string; thai: string; icon: string; color: string }> = {
  product_warranty:      { label: "Product Warranty",      thai: "รับประกันสินค้า",       icon: "🛡️", color: "bg-blue-900/50 text-blue-400" },
  installation_warranty: { label: "Installation Warranty", thai: "รับประกันงานติดตั้ง",   icon: "🔧", color: "bg-purple-900/50 text-purple-400" },
  service_contract:      { label: "Service Contract / MA", thai: "สัญญาบริการ (MA)",     icon: "📋", color: "bg-green-900/50 text-green-400" },
};

const statusMeta: Record<ContractStatus, { label: string; color: string }> = {
  active:    { label: "Active",    color: "bg-green-900/50 text-green-400" },
  pending:   { label: "Pending",   color: "bg-yellow-900/50 text-yellow-400" },
  expired:   { label: "Expired",   color: "bg-red-900/50 text-red-400" },
  cancelled: { label: "Cancelled", color: "bg-gray-700 text-gray-400" },
};

function daysUntil(date?: string): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  if (isNaN(target.getTime())) return null;
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

// Tier classification by days remaining
function expiryTier(days: number | null, status: ContractStatus): "expired" | "urgent" | "soon" | "later" | "safe" | "other" {
  if (status !== "active") return "other";
  if (days === null) return "other";
  if (days < 0) return "expired";
  if (days <= 30) return "urgent";
  if (days <= 60) return "soon";
  if (days <= 90) return "later";
  return "safe";
}

const emptyForm = {
  customer_id: "", customer_name: "", project_id: "", project_name: "",
  type: "service_contract" as ContractType,
  title: "", description: "", scope_items: "",
  start_date: "", end_date: "",
  service_level: "8x5", visits_per_year: 4, response_time_hours: 4,
  contract_value: 0,
  status: "active" as ContractStatus,
  reminder_days_before: 30,
  notes: "",
};

export default function ContractsPage() {
  const [list, setList] = useState<ServiceContract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ContractType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus | "expiring_30" | "expiring_60" | "expiring_90">("all");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [c, cust, proj] = await Promise.all([
        fs.serviceContracts.list(),
        fs.customers.list(),
        fs.projects.list(),
      ]);
      setList(c); setCustomers(cust); setProjects(proj);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Auto-mark expired
  const enriched = useMemo(() => list.map(c => {
    const days = daysUntil(c.end_date);
    const isExpired = days !== null && days < 0 && c.status === "active";
    const effectiveStatus = (isExpired ? "expired" : c.status) as ContractStatus;
    return { ...c, _days: days, _tier: expiryTier(days, effectiveStatus), _effectiveStatus: effectiveStatus };
  }), [list]);

  // Stats
  const stats = useMemo(() => {
    const active = enriched.filter(c => c._effectiveStatus === "active");
    const expiring30 = active.filter(c => c._tier === "urgent");
    const expiring60 = active.filter(c => c._tier === "urgent" || c._tier === "soon");
    const expiring90 = active.filter(c => c._tier === "urgent" || c._tier === "soon" || c._tier === "later");
    const expired = enriched.filter(c => c._tier === "expired");
    const totalValue = active.reduce((s, c) => s + (c.contract_value || 0), 0);
    const expiringValue = expiring30.reduce((s, c) => s + (c.contract_value || 0), 0);
    return {
      total: list.length,
      active: active.length,
      expiring30: expiring30.length,
      expiring60: expiring60.length,
      expiring90: expiring90.length,
      expired: expired.length,
      totalValue,
      expiringValue,
      byType: {
        product_warranty: active.filter(c => c.type === "product_warranty").length,
        installation_warranty: active.filter(c => c.type === "installation_warranty").length,
        service_contract: active.filter(c => c.type === "service_contract").length,
      },
    };
  }, [enriched, list]);

  // Filter
  const filtered = useMemo(() => {
    return enriched.filter(c => {
      const s = search.toLowerCase();
      const matchSearch = !s || c.title.toLowerCase().includes(s) || c.customer_name.toLowerCase().includes(s);
      const matchType = typeFilter === "all" || c.type === typeFilter;
      let matchStatus = true;
      if (statusFilter === "expiring_30") matchStatus = c._tier === "urgent";
      else if (statusFilter === "expiring_60") matchStatus = c._tier === "urgent" || c._tier === "soon";
      else if (statusFilter === "expiring_90") matchStatus = c._tier === "urgent" || c._tier === "soon" || c._tier === "later";
      else if (statusFilter !== "all") matchStatus = c._effectiveStatus === statusFilter;
      return matchSearch && matchType && matchStatus;
    }).sort((a, b) => {
      // Sort by end_date asc (soonest first)
      return (a.end_date || "9999").localeCompare(b.end_date || "9999");
    });
  }, [enriched, search, typeFilter, statusFilter]);

  // Renewal alerts (expiring ≤ reminder window) — for proactive sales
  const renewalAlerts = enriched
    .filter(c => c._effectiveStatus === "active" && c._days !== null && c._days <= (c.reminder_days_before || 30) && c._days >= 0)
    .sort((a, b) => (a._days ?? 0) - (b._days ?? 0));

  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(c: ServiceContract) {
    setEditId(c.id!);
    setForm({
      customer_id: c.customer_id, customer_name: c.customer_name,
      project_id: c.project_id || "", project_name: c.project_name || "",
      type: c.type, title: c.title, description: c.description || "", scope_items: c.scope_items || "",
      start_date: c.start_date || "", end_date: c.end_date || "",
      service_level: c.service_level || "8x5",
      visits_per_year: c.visits_per_year || 0,
      response_time_hours: c.response_time_hours || 0,
      contract_value: c.contract_value || 0,
      status: c.status,
      reminder_days_before: c.reminder_days_before || 30,
      notes: c.notes || "",
    });
    setShowForm(true);
  }

  function selectCustomer(id: string) {
    const c = customers.find(x => x.id === id);
    setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" });
  }
  function selectProject(id: string) {
    const p = projects.find(x => x.id === id);
    setForm({ ...form, project_id: id, project_name: p?.name || "" });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.customer_id) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editId) await fs.serviceContracts.update(editId, form as unknown as Record<string, unknown>);
      else await fs.serviceContracts.add(form as unknown as Record<string, unknown>);
      setForm(emptyForm); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`ลบสัญญา "${title}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.serviceContracts.remove(id);
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="สัญญาและการรับประกัน">Contracts / Warranty</h1>
          <p className="text-xs text-muted">รับประกันสินค้า · งานติดตั้ง · MA — ติดตามวันหมดอายุเพื่อ renewal</p>
        </div>
        <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มสัญญา</button>
      </div>

      {!loading && list.length > 0 && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-3">
            <button onClick={() => setStatusFilter("all")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">ทั้งหมด</p>
            </button>
            <button onClick={() => setStatusFilter("active")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "active" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-green-400">{stats.active}</p>
              <p className="text-[10px] text-muted">Active</p>
            </button>
            <button onClick={() => setStatusFilter("expiring_30")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "expiring_30" ? "border-accent bg-accent/10" : "border-red-800/50 bg-red-900/10 hover:bg-red-900/20"}`}>
              <p className="text-base font-bold text-red-400">{stats.expiring30}</p>
              <p className="text-[10px] text-muted">≤30 วัน</p>
            </button>
            <button onClick={() => setStatusFilter("expiring_60")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "expiring_60" ? "border-accent bg-accent/10" : "border-amber-800/50 bg-amber-900/10 hover:bg-amber-900/20"}`}>
              <p className="text-base font-bold text-amber-400">{stats.expiring60}</p>
              <p className="text-[10px] text-muted">≤60 วัน</p>
            </button>
            <button onClick={() => setStatusFilter("expiring_90")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "expiring_90" ? "border-accent bg-accent/10" : "border-yellow-800/50 bg-yellow-900/10 hover:bg-yellow-900/20"}`}>
              <p className="text-base font-bold text-yellow-400">{stats.expiring90}</p>
              <p className="text-[10px] text-muted">≤90 วัน</p>
            </button>
            <button onClick={() => setStatusFilter("expired")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "expired" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-gray-400">{stats.expired}</p>
              <p className="text-[10px] text-muted">หมดอายุ</p>
            </button>
            <div className="rounded-lg border border-border bg-card p-2.5">
              <p className="text-base font-bold">{(stats.totalValue / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">มูลค่ารวม Active</p>
            </div>
          </div>

          {/* By type chips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            {(Object.keys(typeMeta) as ContractType[]).map(t => {
              const meta = typeMeta[t];
              const selected = typeFilter === t;
              return (
                <button key={t} onClick={() => setTypeFilter(selected ? "all" : t)} className={`rounded-lg border p-2.5 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
                  <p className="text-sm font-medium">{meta.icon} {meta.thai} ({stats.byType[t]})</p>
                  <p className="text-[10px] text-muted">{meta.label}</p>
                </button>
              );
            })}
          </div>

          {/* Renewal alerts (CRM lead) */}
          {renewalAlerts.length > 0 && (
            <div className="rounded-xl bg-red-900/10 border border-red-800/50 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-red-400">⚠ Renewal Alert — สัญญาใกล้หมดอายุ ({renewalAlerts.length})</h3>
                  <p className="text-[10px] text-red-300/70">รวมมูลค่า {(renewalAlerts.reduce((s, c) => s + (c.contract_value || 0), 0) / 1000).toLocaleString()}K — ติดต่อลูกค้าเสนอ renewal</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {renewalAlerts.slice(0, 8).map(c => {
                  const meta = typeMeta[c.type];
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs py-1 border-b border-red-800/30 last:border-0">
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${meta.color}`}>{meta.icon}</span>
                      <span className="font-medium truncate flex-1">{c.title}</span>
                      <Link href={`/customers/${c.customer_id}`} className="text-muted hover:text-accent shrink-0">{c.customer_name}</Link>
                      <span className="text-muted shrink-0">หมด {c.end_date}</span>
                      <span className={`shrink-0 font-bold ${c._days! <= 7 ? "text-red-400" : c._days! <= 30 ? "text-amber-400" : "text-yellow-400"}`}>เหลือ {c._days} วัน</span>
                      {c.contract_value ? <span className="text-green-400 shrink-0 w-20 text-right">{c.contract_value.toLocaleString()}</span> : null}
                      <button onClick={() => openEdit(c)} className="text-[10px] text-accent hover:underline shrink-0">แก้ไข</button>
                    </div>
                  );
                })}
                {renewalAlerts.length > 8 && <p className="text-[10px] text-muted pt-1">และอีก {renewalAlerts.length - 8} รายการ — ใช้ filter "≤30/60/90 วัน" ดูทั้งหมด</p>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขสัญญา" : "เพิ่มสัญญาใหม่"}</h2>

          {/* Type selector */}
          <p className="text-xs text-muted uppercase mb-2">ประเภทสัญญา *</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            {(Object.keys(typeMeta) as ContractType[]).map(t => {
              const meta = typeMeta[t];
              const selected = form.type === t;
              return (
                <button key={t} onClick={() => setForm({ ...form, type: t })} className={`rounded-lg border p-2.5 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                  <p className="text-sm font-medium">{meta.icon} {meta.thai}</p>
                  <p className="text-[10px] text-muted">{meta.label}</p>
                </button>
              );
            })}
          </div>

          {/* Basic info */}
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลทั่วไป</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted">ลูกค้า *</label>
              <select value={form.customer_id} onChange={e => selectCustomer(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">โปรเจคที่เกี่ยวข้อง</label>
              <select value={form.project_id} onChange={e => selectProject(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                <option value="">-- ไม่ระบุ --</option>
                {projects.filter(p => !form.customer_id || p.customer_id === form.customer_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted">สถานะ</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ContractStatus })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                {(Object.keys(statusMeta) as ContractStatus[]).map(s => <option key={s} value={s}>{statusMeta[s].label}</option>)}
              </select>
            </div>
            <div className="lg:col-span-3">
              <label className="text-[10px] text-muted">หัวข้อสัญญา *</label>
              <input placeholder="เช่น MA Server Room 2026, รับประกัน CCTV 32 จุด" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div className="lg:col-span-3">
              <label className="text-[10px] text-muted">รายละเอียด</label>
              <textarea placeholder="เงื่อนไขการรับประกัน / ขอบเขตงาน" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" />
            </div>
            <div className="lg:col-span-3">
              <label className="text-[10px] text-muted">รายการที่คุ้มครอง (เช่น list อุปกรณ์ / SN)</label>
              <textarea placeholder="เช่น Server Dell R750 SN: ABC123, Switch Cisco x4" value={form.scope_items} onChange={e => setForm({ ...form, scope_items: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" />
            </div>
          </div>

          {/* Period + value */}
          <p className="text-xs text-muted uppercase mb-2">ระยะเวลา / มูลค่า</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted">วันเริ่ม *</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">วันสิ้นสุด *</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              {form.start_date && form.end_date && (() => {
                const d = daysUntil(form.end_date);
                return d !== null && <p className="text-[10px] text-muted mt-0.5">{d >= 0 ? `อีก ${d} วัน` : `เลยมา ${Math.abs(d)} วัน`}</p>;
              })()}
            </div>
            <div>
              <label className="text-[10px] text-muted">มูลค่าสัญญา (THB)</label>
              <input type="number" placeholder="0" value={form.contract_value || ""} onChange={e => setForm({ ...form, contract_value: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted">แจ้งเตือนล่วงหน้า (วัน)</label>
              <input type="number" placeholder="30" value={form.reminder_days_before || ""} onChange={e => setForm({ ...form, reminder_days_before: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>
          </div>

          {/* MA fields (only for service_contract) */}
          {form.type === "service_contract" && (
            <>
              <p className="text-xs text-muted uppercase mb-2">เงื่อนไขบริการ (MA)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-muted">ระดับบริการ</label>
                  <select value={form.service_level} onChange={e => setForm({ ...form, service_level: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                    <option value="8x5">8x5 (เวลาราชการ)</option>
                    <option value="12x5">12x5 (8:00-20:00 จ-ศ)</option>
                    <option value="24x7">24x7 (ตลอด 24 ชม.)</option>
                    <option value="On-site">On-site (เข้าหน้างาน)</option>
                    <option value="Remote">Remote เท่านั้น</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted">PM Visits / ปี</label>
                  <input type="number" placeholder="4" value={form.visits_per_year || ""} onChange={e => setForm({ ...form, visits_per_year: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-muted">Response Time (ชม.)</label>
                  <input type="number" placeholder="4" value={form.response_time_hours || ""} onChange={e => setForm({ ...form, response_time_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] text-muted">หมายเหตุ</label>
            <textarea placeholder="ข้อตกลงพิเศษอื่นๆ" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1 mb-4" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.customer_id} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่ม"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <input placeholder="ค้นหาหัวข้อ / ลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ</p>
      </div>

      {/* Table */}
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm mb-2">{list.length === 0 ? "ยังไม่มีสัญญา" : "ไม่พบสัญญาตามตัวกรอง"}</p>
          {list.length === 0 && <p className="text-[11px] text-muted">กด <b className="text-accent">+ เพิ่มสัญญา</b> เพื่อเริ่ม</p>}
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2.5">ประเภท</th>
              <th className="px-4 py-2.5">หัวข้อ</th>
              <th className="px-4 py-2.5">ลูกค้า</th>
              <th className="px-4 py-2.5">เริ่ม → สิ้นสุด</th>
              <th className="px-4 py-2.5 text-center">วันคงเหลือ</th>
              <th className="px-4 py-2.5 text-right">มูลค่า</th>
              <th className="px-4 py-2.5">สถานะ</th>
              <th className="px-4 py-2.5 w-24"></th>
            </tr></thead>
            <tbody>{filtered.map(c => {
              const meta = typeMeta[c.type];
              const sm = statusMeta[c._effectiveStatus];
              const dayColor = c._tier === "expired" ? "text-red-500 font-bold" : c._tier === "urgent" ? "text-red-400 font-semibold" : c._tier === "soon" ? "text-amber-400" : c._tier === "later" ? "text-yellow-400" : "text-muted";
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`} title={meta.label}>{meta.icon} {meta.thai}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-sm">{c.title}</p>
                    {c.type === "service_contract" && (
                      <p className="text-[10px] text-muted">
                        {c.service_level && `${c.service_level}`}
                        {c.visits_per_year ? ` · PM ${c.visits_per_year}/ปี` : ""}
                        {c.response_time_hours ? ` · Response ${c.response_time_hours}h` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/customers/${c.customer_id}`} className="text-muted hover:text-accent hover:underline">{c.customer_name}</Link>
                    {c.project_name && <p className="text-[10px] text-muted">{c.project_name}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs whitespace-nowrap">
                    <p>{c.start_date || "-"}</p>
                    <p>→ {c.end_date || "-"}</p>
                  </td>
                  <td className={`px-4 py-2.5 text-center text-xs ${dayColor}`}>
                    {c._days === null ? "—" : c._days < 0 ? `เลย ${Math.abs(c._days)}d` : `${c._days}d`}
                  </td>
                  <td className="px-4 py-2.5 text-right">{c.contract_value ? c.contract_value.toLocaleString() : "-"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sm.color}`}>{sm.label}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs text-accent hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(c.id!, c.title)} className="text-xs text-danger hover:underline">ลบ</button>
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
