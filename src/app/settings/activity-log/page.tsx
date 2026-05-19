"use client";
import { useEffect, useState } from "react";
import type { ActivityLog } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";

const moduleLabels: Record<string, string> = {
  auth: "เข้าสู่ระบบ",
  projects: "โปรเจกต์",
  service: "Service",
  customers: "ลูกค้า",
  sales: "Sales",
  presale: "Presale",
  quotations: "ใบเสนอราคา",
  users: "ผู้ใช้",
  settings: "ตั้งค่า",
};

const actionLabels: Record<string, string> = {
  login: "เข้าสู่ระบบ",
  logout: "ออกจากระบบ",
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  approve: "อนุมัติ",
  reject: "ปฏิเสธ",
  export: "ส่งออก",
};

const actionColor: Record<string, string> = {
  login: "bg-green-900/50 text-green-400",
  create: "bg-blue-900/50 text-blue-400",
  update: "bg-yellow-900/50 text-yellow-400",
  delete: "bg-red-900/50 text-red-400",
  approve: "bg-emerald-900/50 text-emerald-400",
  reject: "bg-rose-900/50 text-rose-400",
  logout: "bg-gray-700 text-gray-400",
};

function formatTime(ts: unknown): string {
  if (!ts) return "—";
  const t = ts as { toMillis?: () => number; seconds?: number };
  let ms = 0;
  if (typeof t.toMillis === "function") ms = t.toMillis();
  else if (typeof t.seconds === "number") ms = t.seconds * 1000;
  if (!ms) return "—";
  return new Date(ms).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityLogPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const data = await fs.activityLogs.list();
      setLogs(data.sort((a, b) => {
        const ta = (a.created_at as { seconds?: number })?.seconds ?? 0;
        const tb = (b.created_at as { seconds?: number })?.seconds ?? 0;
        return tb - ta;
      }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  const usedModules = [...new Set(logs.map(l => l.module).filter(Boolean))].sort();
  const usedActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();
  const usedUsers = [...new Set(logs.map(l => l.user_name).filter(Boolean))].sort();

  const filtered = logs.filter(l => {
    const s = search.toLowerCase();
    const matchSearch = !s || l.user_name?.toLowerCase().includes(s) || l.details?.toLowerCase().includes(s) || l.resource_name?.toLowerCase().includes(s);
    const matchModule = moduleFilter === "all" || l.module === moduleFilter;
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchUser = userFilter === "all" || l.user_name === userFilter;
    let matchDate = true;
    if (dateFrom || dateTo) {
      const ts = (l.created_at as { seconds?: number })?.seconds ?? 0;
      const d = new Date(ts * 1000).toISOString().slice(0, 10);
      if (dateFrom && d < dateFrom) matchDate = false;
      if (dateTo && d > dateTo) matchDate = false;
    }
    return matchSearch && matchModule && matchAction && matchUser && matchDate;
  });

  const canView = currentUser?.role === "admin" || currentUser?.role === "Administrator"
    || hasPermission("view_reports") || hasPermission("manage_system");

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;
  if (mounted && !currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (mounted && !canView) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" title="บันทึกกิจกรรมในระบบ">Activity Log</h1>
          <p className="text-xs text-muted">บันทึกการใช้งานระบบ — Login, สร้าง, แก้ไข, ลบ</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} disabled={loading} title="โหลดข้อมูลใหม่" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover disabled:opacity-50">
          {loading ? "..." : "↺ Refresh"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[180px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกโมดูล</option>
          {usedModules.map(m => <option key={m} value={m}>{moduleLabels[m] ?? m}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุก Action</option>
          {usedActions.map(a => <option key={a} value={a}>{actionLabels[a] ?? a}</option>)}
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกคน</option>
          {usedUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="วันเริ่มต้น" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="วันสิ้นสุด" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        {(search || moduleFilter !== "all" || actionFilter !== "all" || userFilter !== "all" || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setModuleFilter("all"); setActionFilter("all"); setUserFilter("all"); setDateFrom(""); setDateTo(""); }} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">✕ ล้าง</button>
        )}
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">บันทึก ({filtered.length})</p>
            <p className="text-xs text-muted">ทั้งหมด {logs.length} รายการ</p>
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted text-sm p-4">ไม่พบบันทึก</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted uppercase">
                    <th className="px-4 py-2.5">เวลา</th>
                    <th className="px-4 py-2.5">ผู้ใช้</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Module</th>
                    <th className="px-4 py-2.5">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((l, i) => (
                    <tr key={l.id ?? i} className="border-b border-border last:border-0 hover:bg-card-hover">
                      <td className="px-4 py-2 text-xs text-muted whitespace-nowrap">{formatTime(l.created_at)}</td>
                      <td className="px-4 py-2 font-medium text-xs">{l.user_name || "—"}</td>
                      <td className="px-4 py-2 text-xs text-muted">{l.user_role || "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actionColor[l.action] || "bg-gray-700 text-gray-400"}`}>
                          {actionLabels[l.action] ?? l.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted">{moduleLabels[l.module] ?? l.module}</td>
                      <td className="px-4 py-2 text-xs text-muted max-w-xs truncate" title={l.details}>{l.details || l.resource_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 500 && <p className="text-xs text-muted p-4">แสดง 500 รายการล่าสุด จาก {filtered.length} รายการ</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
