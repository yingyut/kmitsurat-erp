"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Asset } from "@/lib/firestore";
import { useCurrentUser } from "@/lib/UserContext";

const PM_INTERVAL_LABEL: Record<number, string> = { 1: "รายเดือน", 3: "3 เดือน", 6: "6 เดือน", 12: "รายปี" };

function dayDiff(date?: string): number | null {
  if (!date) return null;
  const t = new Date(date); t.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((t.getTime() - now.getTime()) / 86400000);
}

function pmStatusBadge(d: number | null) {
  if (d === null) return <span className="text-muted text-xs">—</span>;
  if (d < 0) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-900/50 text-red-400">เลยกำหนด {Math.abs(d)} วัน</span>;
  if (d === 0) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-900/50 text-red-400">วันนี้!</span>;
  if (d <= 14) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-900/40 text-red-300">ใน {d} วัน</span>;
  if (d <= 30) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-amber-900/50 text-amber-400">ใน {d} วัน</span>;
  if (d <= 90) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-yellow-900/50 text-yellow-400">ใน {d} วัน</span>;
  return <span className="rounded-full px-2 py-0.5 text-[10px] bg-green-900/50 text-green-400">ใน {d} วัน</span>;
}

function calcNextPM(lastDate: string, intervalMonths: number): string {
  const d = new Date(lastDate);
  d.setMonth(d.getMonth() + intervalMonths);
  return d.toISOString().slice(0, 10);
}

async function exportPMScheduleToExcel(rows: Asset[], filename = "pm_schedule") {
  const XLSX = await import("xlsx");
  const today = new Date().toISOString().slice(0, 10);
  const data = rows.map(a => {
    const d = a.pm_next_date ? Math.floor((new Date(a.pm_next_date).getTime() - Date.now()) / 86400000) : null;
    return {
      "KM Number": a.km_number ?? "",
      "Serial Number": a.serial_number ?? "",
      "รุ่นอุปกรณ์": a.device_model ?? "",
      "ประเภท": a.category ?? "",
      "ลูกค้า": a.customer_name ?? "",
      "สถานที่": a.location ?? "",
      "ความถี่ PM": a.pm_interval_months ? (PM_INTERVAL_LABEL[a.pm_interval_months] ?? `${a.pm_interval_months}m`) : "",
      "PM ล่าสุด": a.pm_last_date ?? "",
      "PM ถัดไป": a.pm_next_date ?? "",
      "วันเหลือ": d !== null ? d : "",
      "สถานะ PM": d === null ? "" : d < 0 ? "เลยกำหนด" : d <= 7 ? "เร่งด่วน" : d <= 30 ? "ใกล้ถึง" : d <= 90 ? "ปกติ" : "เหลือเวลา",
      "ช่าง PM": a.pm_assigned_to ?? "",
      "หมายเหตุ PM": a.pm_notes ?? "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [14, 18, 24, 12, 24, 20, 12, 12, 12, 10, 12, 14, 24].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PM Schedule");
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
}

export default function PMSchedulePage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [techFilter, setTechFilter] = useState("all");
  const [custFilter, setCustFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creatingTicket, setCreatingTicket] = useState<string | null>(null);

  const canManage = hasPermission("manage_assets");
  const canView = hasPermission("view_assets") || canManage;

  async function load() {
    const fs = await import("@/lib/firestore");
    const data = await fs.assets.list();
    setAssets(data.filter(a => a.pm_interval_months && a.status !== "decommissioned"));
    setLoading(false);
  }

  useEffect(() => { setMounted(true); load(); }, []);

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canView) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  const user = currentUser!;

  const filtered = assets.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s || a.km_number?.toLowerCase().includes(s) || a.device_model?.toLowerCase().includes(s) || a.customer_name?.toLowerCase().includes(s);
    const matchTech = techFilter === "all" || a.pm_assigned_to === techFilter;
    const matchCust = custFilter === "all" || a.customer_id === custFilter;
    return matchSearch && matchTech && matchCust;
  });

  // Buckets
  const overdue = filtered.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d < 0; });
  const due7 = filtered.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d >= 0 && d <= 7; });
  const due30 = filtered.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d > 7 && d <= 30; });
  const due90 = filtered.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d > 30 && d <= 90; });
  const future = filtered.filter(a => { const d = dayDiff(a.pm_next_date); return d !== null && d > 90; });
  const noDate = filtered.filter(a => !a.pm_next_date);

  const usedTechs = [...new Set(assets.map(a => a.pm_assigned_to).filter(Boolean))].sort() as string[];
  const usedCusts = [...new Set(assets.map(a => ({ id: a.customer_id, name: a.customer_name })))].filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i).sort((a, b) => a.name.localeCompare(b.name));

  async function createPMTicket(a: Asset) {
    if (!a.id) return;
    setCreatingTicket(a.id);
    const fs = await import("@/lib/firestore");
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    try {
      await fs.serviceTickets.add({
        customer_id: a.customer_id,
        customer_name: a.customer_name,
        project_id: a.project_id ?? "",
        project_name: a.project_name ?? "",
        type: "pm_service",
        issue: `PM Service: ${a.device_model}${a.km_number ? ` (${a.km_number})` : ""} — ${a.location ?? a.customer_name}`,
        technician: a.pm_assigned_to ?? "",
        service_date: today,
        status: "open",
        asset_id: a.id,
        km_number: a.km_number ?? "",
        opened_at: now,
        sla_response_hours: 4,
        sla_resolve_hours: 48,
        assignment_mode: a.pm_assigned_to ? "individual" : "all",
        reported_by: user.name,
        report_date: today,
        report_channel: "system",
        service_value: 0, service_cost: 0, gross_profit: 0, hours_spent: 0,
      } as Record<string, unknown>);

      // Update asset pm_last_date and pm_next_date
      const nextDate = a.pm_interval_months ? calcNextPM(today, a.pm_interval_months) : "";
      await fs.assets.update(a.id, { pm_last_date: today, pm_next_date: nextDate, updated_at: today });

      await fs.logActivity({
        user_name: user.name, user_role: user.role,
        module: "assets", action: "create",
        resource_id: a.id, resource_name: a.km_number,
        details: `สร้าง PM Ticket: ${a.km_number} — ${a.device_model}`,
      });

      await load();
      router.push("/service");
    } catch (e) {
      console.error(e);
      alert("❌ สร้าง PM Ticket ไม่สำเร็จ กรุณาลองใหม่");
    } finally { setCreatingTicket(null); }
  }

  function AssetTable({ items, emptyMsg }: { items: Asset[]; emptyMsg: string }) {
    if (items.length === 0) return <p className="text-xs text-muted p-3">{emptyMsg}</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2">KM Number</th>
              <th className="px-4 py-2">อุปกรณ์</th>
              <th className="px-4 py-2">ลูกค้า / สถานที่</th>
              <th className="px-4 py-2">ความถี่</th>
              <th className="px-4 py-2">PM ล่าสุด</th>
              <th className="px-4 py-2">PM ถัดไป</th>
              <th className="px-4 py-2">ช่าง</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a, i) => {
              const d = dayDiff(a.pm_next_date);
              return (
                <tr key={a.id ?? i} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2">
                    <button onClick={() => router.push(`/assets/${a.id}`)} className="font-mono text-xs font-semibold text-accent hover:underline">
                      {a.km_number || "—"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-xs font-medium">{a.device_model}</p>
                    <p className="text-[10px] text-muted">{a.category} · {a.brand}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-xs">{a.customer_name}</p>
                    {a.location && <p className="text-[10px] text-muted truncate max-w-[120px]">{a.location}</p>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {a.pm_interval_months ? PM_INTERVAL_LABEL[a.pm_interval_months] ?? `${a.pm_interval_months}m` : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">{a.pm_last_date || "—"}</td>
                  <td className="px-4 py-2">
                    <div>{pmStatusBadge(d)}</div>
                    <p className="text-[10px] text-muted mt-0.5">{a.pm_next_date || "—"}</p>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">{a.pm_assigned_to || "—"}</td>
                  <td className="px-4 py-2">
                    {canManage && (
                      <button
                        onClick={() => createPMTicket(a)}
                        disabled={creatingTicket === a.id}
                        className="rounded px-2 py-1 text-[10px] bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 disabled:opacity-50 whitespace-nowrap"
                      >
                        {creatingTicket === a.id ? "..." : "🔧 สร้าง PM Ticket"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/assets")} className="text-muted hover:text-foreground text-sm">← Assets</button>
            <span className="text-muted">/</span>
            <h1 className="text-xl font-bold" title="ตารางงาน PM อุปกรณ์">PM Schedule</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">ตารางงานบำรุงรักษาเชิงป้องกัน — ติดตาม PM ที่เลย/ใกล้ครบกำหนด</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await exportPMScheduleToExcel(filtered, "pm_schedule_report");
              const fs = await import("@/lib/firestore");
              await fs.logActivity({ user_name: user.name, user_role: user.role, module: "assets", action: "export", resource_name: "pm_schedule_report", details: `Export PM Schedule Excel ${filtered.length} รายการ` });
            }}
            className="rounded-lg border border-green-700/50 px-3 py-2 text-xs text-green-400 hover:bg-green-900/20"
            title="Export PM Schedule ที่กรองแล้วเป็น Excel"
          >
            📥 Export Excel
          </button>
          <button onClick={() => { setLoading(true); load(); }} disabled={loading} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover disabled:opacity-50">
            {loading ? "..." : "↺ Refresh"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: "เลยกำหนด", val: overdue.length, color: "text-red-400", bg: "bg-red-900/10 border-red-800/40" },
          { label: "ใน 7 วัน", val: due7.length, color: "text-red-300", bg: "bg-red-900/10 border-red-800/20" },
          { label: "ใน 30 วัน", val: due30.length, color: "text-amber-400", bg: "border-border" },
          { label: "ใน 90 วัน", val: due90.length, color: "text-yellow-400", bg: "border-border" },
          { label: "รอตั้งกำหนด", val: noDate.length, color: "text-muted", bg: "border-border" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl bg-card border ${s.bg} p-3`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input placeholder="ค้นหา KM, รุ่น, ลูกค้า..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={techFilter} onChange={e => setTechFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกช่าง</option>
          {usedTechs.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={custFilter} onChange={e => setCustFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกลูกค้า</option>
          {usedCusts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || techFilter !== "all" || custFilter !== "all") && (
          <button onClick={() => { setSearch(""); setTechFilter("all"); setCustFilter("all"); }} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">✕ ล้าง</button>
        )}
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm">ยังไม่มีอุปกรณ์ที่ตั้ง PM Schedule</p>
          <p className="text-xs text-muted mt-1">ไปที่ <button onClick={() => router.push("/assets")} className="text-accent hover:underline">Assets</button> → แก้ไขอุปกรณ์ → ตั้ง PM Schedule</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div className="rounded-xl bg-card border border-red-800/50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-red-800/50 bg-red-900/10">
                <p className="text-sm font-semibold text-red-400">🔴 เลยกำหนด PM ({overdue.length})</p>
              </div>
              <AssetTable items={overdue} emptyMsg="" />
            </div>
          )}

          {(due7.length > 0) && (
            <div className="rounded-xl bg-card border border-amber-800/50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-amber-800/50 bg-amber-900/10">
                <p className="text-sm font-semibold text-amber-400">🟠 PM ใน 7 วัน ({due7.length})</p>
              </div>
              <AssetTable items={due7} emptyMsg="" />
            </div>
          )}

          {due30.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-sm font-semibold text-amber-300">🟡 PM ใน 30 วัน ({due30.length})</p>
              </div>
              <AssetTable items={due30} emptyMsg="" />
            </div>
          )}

          {due90.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-sm font-semibold text-yellow-400">📅 PM ใน 90 วัน ({due90.length})</p>
              </div>
              <AssetTable items={due90} emptyMsg="" />
            </div>
          )}

          {future.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-sm font-semibold text-green-400">✅ PM ยังเหลือเวลา ({future.length})</p>
              </div>
              <AssetTable items={future} emptyMsg="" />
            </div>
          )}

          {noDate.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-sm font-semibold text-muted">⬜ รอตั้งวัน PM ({noDate.length})</p>
              </div>
              <AssetTable items={noDate} emptyMsg="" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
