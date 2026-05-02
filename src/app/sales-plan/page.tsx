"use client";
import { useEffect, useState } from "react";
import type { SalesQuota } from "@/lib/types";

const currentMonth = new Date().toISOString().slice(0, 7); // "2026-05"

export default function SalesPlanPage() {
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"admin" | "sale">("admin");
  const [selectedUser, setSelectedUser] = useState("");
  const [month, setMonth] = useState(currentMonth);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_name: "", role: "sale" as "sale" | "avenger", month: currentMonth, quota_target: 0, actual_sales: 0, won_deals: 0, total_activities: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { salesQuotas } = await import("@/lib/firestore");
    try {
      const all = await salesQuotas.list();
      setQuotas(all);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  // Filter by month and user
  const filtered = quotas.filter((q) => {
    const matchMonth = q.month === month;
    const matchUser = viewMode === "admin" ? true : q.user_name === selectedUser;
    return matchMonth && matchUser;
  });

  // Summary totals
  const totalTarget = filtered.reduce((s, q) => s + q.quota_target, 0);
  const totalActual = filtered.reduce((s, q) => s + q.actual_sales, 0);
  const totalRemaining = totalTarget - totalActual;
  const totalPercent = totalTarget > 0 ? (totalActual / totalTarget * 100) : 0;

  // Unique users for filter
  const allUsers = [...new Set(quotas.map((q) => q.user_name))];

  async function handleSave() {
    if (!form.user_name.trim() || form.quota_target <= 0) return;
    setSaving(true);
    const { salesQuotas } = await import("@/lib/firestore");
    const remaining = form.quota_target - form.actual_sales;
    const percent = form.quota_target > 0 ? (form.actual_sales / form.quota_target * 100) : 0;
    try {
      await salesQuotas.add({ ...form, remaining, percent } as unknown as Record<string, unknown>);
      setForm({ user_name: "", role: "sale", month: currentMonth, quota_target: 0, actual_sales: 0, won_deals: 0, total_activities: 0 });
      setShowForm(false);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    const { salesQuotas } = await import("@/lib/firestore");
    await salesQuotas.remove(id);
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Sales Plan / Quota</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === "admin" ? "sale" : "admin")}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">
            {viewMode === "admin" ? "View: All (Admin)" : "View: My Plan"}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
            {showForm ? "Cancel" : "+ Set Quota"}
          </button>
        </div>
      </div>

      {/* View mode & month filter */}
      <div className="flex items-center gap-3 mb-5">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        {viewMode === "sale" && (
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
            className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
            <option value="">-- Select User --</option>
            {allUsers.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs text-muted">Target</p>
          <p className="text-2xl font-bold">{totalTarget.toLocaleString()}</p>
          <p className="text-xs text-muted">THB</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs text-muted">Actual Sales</p>
          <p className="text-2xl font-bold text-green-400">{totalActual.toLocaleString()}</p>
          <p className="text-xs text-muted">THB</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs text-muted">Remaining</p>
          <p className={`text-2xl font-bold ${totalRemaining > 0 ? "text-yellow-400" : "text-green-400"}`}>{totalRemaining.toLocaleString()}</p>
          <p className="text-xs text-muted">THB</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs text-muted">Achievement</p>
          <p className={`text-2xl font-bold ${totalPercent >= 100 ? "text-green-400" : totalPercent >= 70 ? "text-yellow-400" : "text-red-400"}`}>{totalPercent.toFixed(1)}%</p>
          <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
            <div className={`h-full rounded-full ${totalPercent >= 100 ? "bg-green-500" : totalPercent >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(totalPercent, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Add quota form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <h2 className="text-base font-semibold mb-3">Set Sales Quota</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Sales Person Name *" value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "sale" | "avenger" })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="sale">Sale</option>
              <option value="avenger">Avenger</option>
            </select>
            <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Quota Target (THB) *" value={form.quota_target || ""} onChange={(e) => setForm({ ...form, quota_target: Number(e.target.value) })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Actual Sales (THB)" value={form.actual_sales || ""} onChange={(e) => setForm({ ...form, actual_sales: Number(e.target.value) })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Won Deals" value={form.won_deals || ""} onChange={(e) => setForm({ ...form, won_deals: Number(e.target.value) })}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.user_name.trim() || form.quota_target <= 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
            {saving ? "Saving..." : "Save Quota"}
          </button>
        </div>
      )}

      {/* Sales plan table */}
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? (
        <p className="text-muted text-sm">No quota data for {month}. Click &quot;+ Set Quota&quot; to add.</p>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th className="px-4 py-2.5">Sales Person</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5 text-right">Target</th>
                <th className="px-4 py-2.5 text-right">Actual</th>
                <th className="px-4 py-2.5 text-right">Remaining</th>
                <th className="px-4 py-2.5 text-right">%</th>
                <th className="px-4 py-2.5">Progress</th>
                <th className="px-4 py-2.5 text-center">Deals</th>
                <th className="px-4 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const pct = q.quota_target > 0 ? (q.actual_sales / q.quota_target * 100) : 0;
                const rem = q.quota_target - q.actual_sales;
                return (
                  <tr key={q.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-4 py-3 font-medium">{q.user_name}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${q.role === "avenger" ? "bg-purple-900/50 text-purple-400" : "bg-blue-900/50 text-blue-400"}`}>{q.role}</span></td>
                    <td className="px-4 py-3 text-right">{q.quota_target.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-400">{q.actual_sales.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${rem > 0 ? "text-yellow-400" : "text-green-400"}`}>{rem.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{pct.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-24 rounded-full bg-background overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{q.won_deals}</td>
                    <td className="px-4 py-3"><button onClick={() => handleDelete(q.id!)} className="text-xs text-danger hover:underline">Del</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
