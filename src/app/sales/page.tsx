"use client";
import { useEffect, useState } from "react";
import type { SalesActivity, SalesQuota, Project, Customer } from "@/lib/types";

const actTypes = ["phone_call","visit","quotation_created","quotation_sent","follow_up","meeting","customer_update"] as const;
const typeLabels: Record<string, string> = { phone_call: "Phone Call", visit: "Visit", quotation_created: "QT Created", quotation_sent: "QT Sent", follow_up: "Follow-up", meeting: "Meeting", customer_update: "Update" };
const stages = ["lead","opportunity","proposal","negotiation","won","lost"] as const;

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);

export default function SalesPage() {
  const [tab, setTab] = useState<"dashboard" | "pipeline" | "activities" | "plan">("dashboard");
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  // Forms
  const [showActForm, setShowActForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [actForm, setActForm] = useState({ type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "" });
  const [planForm, setPlanForm] = useState({ user_name: "", role: "sale" as "sale"|"avenger", month: currentMonth, quota_target: 0, actual_sales: 0, won_deals: 0, total_activities: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const fs = await import("@/lib/firestore");
      const [a, p, c, q] = await Promise.all([fs.salesActivities.list(), fs.projects.list(), fs.customers.list(), fs.salesQuotas.list()]);
      setActivities(a); setProjects(p); setCustomers(c); setQuotas(q);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  // KPI calculations
  const monthQuota = quotas.find((q) => q.month === currentMonth);
  const target = monthQuota?.quota_target || 0;
  const actualSales = monthQuota?.actual_sales || 0;
  const pipelineValue = projects.filter((p) => !["won","lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  const wonDeals = projects.filter((p) => p.status === "won").length;

  // Follow-ups
  const todayFollowups = activities.filter((a) => a.next_follow_up === today);
  const overdueFollowups = activities.filter((a) => a.next_follow_up && a.next_follow_up < today && a.status !== "done");
  const upcomingFollowups = activities.filter((a) => a.next_follow_up && a.next_follow_up > today && a.status !== "done").slice(0, 5);

  // Activity summary
  const todayActivities = activities.filter((a) => a.next_follow_up === today || (a.status === "new")).length;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = weekStart.toISOString().slice(0, 10);
  const weekActivities = activities.filter((a) => (a.next_follow_up || "") >= weekStr).length;

  // Pipeline filter
  const filteredProjects = projects.filter((p) => {
    const matchSearch = search ? (p.name.toLowerCase().includes(search.toLowerCase()) || p.customer_name.toLowerCase().includes(search.toLowerCase())) : true;
    const matchStage = stageFilter === "all" ? true : p.status === stageFilter;
    return matchSearch && matchStage;
  });

  // Filtered activities
  const filteredActivities = search ? activities.filter((a) => a.description.toLowerCase().includes(search.toLowerCase()) || a.customer_name.toLowerCase().includes(search.toLowerCase())) : activities;

  const stageColor = (s: string) => {
    if (s === "won") return "bg-green-900/50 text-green-400";
    if (s === "lost") return "bg-red-900/50 text-red-400";
    return "bg-blue-900/50 text-blue-400";
  };

  function selectCust(id: string) { const c = customers.find((x) => x.id === id); setActForm({ ...actForm, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projects.find((x) => x.id === id); setActForm({ ...actForm, project_id: id, project_name: p?.name || "" }); }

  async function saveActivity() {
    if (!actForm.description.trim()) return; setSaving(true);
    const { salesActivities } = await import("@/lib/firestore");
    try { await salesActivities.add(actForm as unknown as Record<string, unknown>); setActForm({ type: "phone_call", customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new", next_follow_up: "" }); setShowActForm(false); await load(); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function savePlan() {
    if (!planForm.user_name.trim() || planForm.quota_target <= 0) return; setSaving(true);
    const { salesQuotas } = await import("@/lib/firestore");
    const remaining = planForm.quota_target - planForm.actual_sales;
    const percent = planForm.quota_target > 0 ? (planForm.actual_sales / planForm.quota_target * 100) : 0;
    try { await salesQuotas.add({ ...planForm, remaining, percent } as unknown as Record<string, unknown>); setPlanForm({ user_name: "", role: "sale", month: currentMonth, quota_target: 0, actual_sales: 0, won_deals: 0, total_activities: 0 }); setShowPlanForm(false); await load(); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function updateProjectStatus(id: string, status: string) {
    const { projects: ps } = await import("@/lib/firestore");
    await ps.update(id, { status }); await load();
  }

  async function updateActivityStatus(id: string, status: string) {
    const { salesActivities: sa } = await import("@/lib/firestore");
    await sa.update(id, { status }); await load();
  }

  async function deleteActivity(id: string) {
    if (!confirm("Delete?")) return;
    const { salesActivities: sa } = await import("@/lib/firestore"); await sa.remove(id); await load();
  }

  async function deleteQuota(id: string) {
    if (!confirm("Delete?")) return;
    const { salesQuotas: sq } = await import("@/lib/firestore"); await sq.remove(id); await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" title="งานขาย - บริหารจัดการงานขายทั้งหมด">Sales</h1>
        <div className="flex gap-2">
          {tab === "activities" && <button onClick={() => setShowActForm(!showActForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showActForm ? "Cancel" : "+ New Activity"}</button>}
          {tab === "plan" && <button onClick={() => setShowPlanForm(!showPlanForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showPlanForm ? "Cancel" : "+ Set Quota"}</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {(["dashboard","pipeline","activities","plan"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} title={t === "dashboard" ? "แดชบอร์ดภาพรวม" : t === "pipeline" ? "ท่อขาย / ดีลทั้งหมด" : t === "activities" ? "บันทึกกิจกรรมขาย" : "แผนงาน / โควต้าเป้าขาย"} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
            {t === "dashboard" ? "Dashboard" : t === "pipeline" ? "Pipeline" : t === "activities" ? "Activities" : "Plan / Quota"}
            <span className="sr-only">{t === "dashboard" ? "แดชบอร์ด" : t === "pipeline" ? "ท่อขาย" : t === "activities" ? "กิจกรรม" : "แผน / โควต้า"}</span>
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

        {/* ===== DASHBOARD TAB ===== */}
        {tab === "dashboard" && (<>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted mb-1" title="เป้ายอดขายรายเดือน">Monthly Target</p>
              <p className="text-2xl font-bold">{target.toLocaleString()}</p>
              <p className="text-xs text-muted">THB</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted mb-1" title="ยอดขายจริงที่ปิดได้">Actual Sales (Won)</p>
              <p className="text-2xl font-bold text-green-400">{actualSales.toLocaleString()}</p>
              {target > 0 && <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${actualSales >= target ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: `${Math.min((actualSales / target) * 100, 100)}%` }} /></div>}
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted mb-1" title="มูลค่าดีลที่กำลังดำเนินการ">Pipeline Value</p>
              <p className="text-2xl font-bold text-blue-400">{pipelineValue.toLocaleString()}</p>
              <p className="text-xs text-muted">THB (active)</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted mb-1" title="จำนวนดีลที่ปิดได้">Won Deals</p>
              <p className="text-2xl font-bold text-green-400">{wonDeals}</p>
              <p className="text-xs text-muted">deals closed</p>
            </div>
          </div>

          {/* Follow-ups */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold mb-2 text-yellow-400" title="นัดติดตามวันนี้">Today ({todayFollowups.length})</h3>
              {todayFollowups.length === 0 ? <p className="text-xs text-muted">No follow-ups today</p> : todayFollowups.map((a) => (
                <div key={a.id} className="text-xs py-1.5 border-b border-border last:border-0"><p>{a.description}</p><p className="text-muted">{a.customer_name}</p></div>
              ))}
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold mb-2 text-red-400" title="เลยกำหนดติดตาม">Overdue ({overdueFollowups.length})</h3>
              {overdueFollowups.length === 0 ? <p className="text-xs text-muted">No overdue items</p> : overdueFollowups.slice(0, 5).map((a) => (
                <div key={a.id} className="text-xs py-1.5 border-b border-border last:border-0"><p>{a.description}</p><p className="text-muted">{a.customer_name} · {a.next_follow_up}</p></div>
              ))}
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold mb-2 text-blue-400" title="นัดติดตามที่จะถึง">Upcoming ({upcomingFollowups.length})</h3>
              {upcomingFollowups.length === 0 ? <p className="text-xs text-muted">No upcoming items</p> : upcomingFollowups.map((a) => (
                <div key={a.id} className="text-xs py-1.5 border-b border-border last:border-0"><p>{a.description}</p><p className="text-muted">{a.customer_name} · {a.next_follow_up}</p></div>
              ))}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-semibold mb-3" title="สรุปกิจกรรมทั้งหมด">Activity Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center"><p className="text-2xl font-bold">{todayActivities}</p><p className="text-xs text-muted">Today</p></div>
              <div className="text-center"><p className="text-2xl font-bold">{weekActivities}</p><p className="text-xs text-muted">This Week</p></div>
              <div className="text-center"><p className="text-2xl font-bold">{activities.length}</p><p className="text-xs text-muted">Total</p></div>
            </div>
          </div>
        </>)}

        {/* ===== PIPELINE TAB ===== */}
        {tab === "pipeline" && (<>
          <div className="flex gap-3 mb-4">
            <input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="all">All Stages</option>
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {filteredProjects.length === 0 ? <p className="text-muted text-sm">No deals found.</p> : (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="px-4 py-2.5">Project</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5 text-right">Value</th><th className="px-4 py-2.5">Stage</th><th className="px-4 py-2.5">Assigned</th><th className="px-4 py-2.5 w-32">Action</th>
                </tr></thead>
                <tbody>{filteredProjects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted">{p.customer_name}</td>
                    <td className="px-4 py-2.5 text-right">{(p.value || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <select value={p.status} onChange={(e) => updateProjectStatus(p.id!, e.target.value)} className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none ${stageColor(p.status)}`}>
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{p.assigned_to || "-"}</td>
                    <td className="px-4 py-2.5"><button onClick={() => setTab("activities")} className="text-xs text-accent hover:underline">View</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>)}

        {/* ===== ACTIVITIES TAB ===== */}
        {tab === "activities" && (<>
          {showActForm && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <select value={actForm.type} onChange={(e) => setActForm({ ...actForm, type: e.target.value as SalesActivity["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">{actTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select>
                <select value={actForm.customer_id} onChange={(e) => selectCust(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Customer --</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
                <select value={actForm.project_id} onChange={(e) => selectProj(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Project --</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <input placeholder="Assigned To" value={actForm.assigned_to} onChange={(e) => setActForm({ ...actForm, assigned_to: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input type="date" value={actForm.next_follow_up} onChange={(e) => setActForm({ ...actForm, next_follow_up: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <select value={actForm.status} onChange={(e) => setActForm({ ...actForm, status: e.target.value as SalesActivity["status"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="new">New</option><option value="in_progress">In Progress</option><option value="done">Done</option></select>
                <textarea placeholder="Description *" value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
              </div>
              <button onClick={saveActivity} disabled={saving || !actForm.description.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          )}
          <input placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          {filteredActivities.length === 0 ? <p className="text-muted text-sm">No activities.</p> : (
            <div className="space-y-2">{filteredActivities.map((a) => (
              <div key={a.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{a.description}</p>
                  <p className="text-xs text-muted mt-1"><span className="rounded bg-card-hover px-1.5 py-0.5">{typeLabels[a.type]}</span> · {a.customer_name}{a.next_follow_up && ` · Follow-up: ${a.next_follow_up}`}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={a.status} onChange={(e) => updateActivityStatus(a.id!, e.target.value)} className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none ${a.status === "done" ? "bg-green-900/50 text-green-400" : a.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>
                    <option value="new">New</option><option value="in_progress">In Progress</option><option value="done">Done</option>
                  </select>
                  <button onClick={() => deleteActivity(a.id!)} className="text-xs text-danger hover:underline">Del</button>
                </div>
              </div>
            ))}</div>
          )}
        </>)}

        {/* ===== PLAN / QUOTA TAB ===== */}
        {tab === "plan" && (<>
          {showPlanForm && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input placeholder="Sales Person *" value={planForm.user_name} onChange={(e) => setPlanForm({ ...planForm, user_name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <select value={planForm.role} onChange={(e) => setPlanForm({ ...planForm, role: e.target.value as "sale"|"avenger" })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="sale">Sale</option><option value="avenger">Avenger</option></select>
                <input type="month" value={planForm.month} onChange={(e) => setPlanForm({ ...planForm, month: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input type="number" placeholder="Target (THB) *" value={planForm.quota_target || ""} onChange={(e) => setPlanForm({ ...planForm, quota_target: Number(e.target.value) })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input type="number" placeholder="Actual Sales" value={planForm.actual_sales || ""} onChange={(e) => setPlanForm({ ...planForm, actual_sales: Number(e.target.value) })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input type="number" placeholder="Won Deals" value={planForm.won_deals || ""} onChange={(e) => setPlanForm({ ...planForm, won_deals: Number(e.target.value) })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <button onClick={savePlan} disabled={saving || !planForm.user_name.trim() || planForm.quota_target <= 0} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          )}
          {quotas.length === 0 ? <p className="text-muted text-sm">No quotas set. Click &quot;+ Set Quota&quot;.</p> : (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="px-4 py-2.5">Person</th><th className="px-4 py-2.5">Month</th><th className="px-4 py-2.5 text-right">Target</th><th className="px-4 py-2.5 text-right">Actual</th><th className="px-4 py-2.5 text-right">Remaining</th><th className="px-4 py-2.5">Progress</th><th className="px-4 py-2.5 w-12"></th>
                </tr></thead>
                <tbody>{quotas.map((q) => {
                  const pct = q.quota_target > 0 ? (q.actual_sales / q.quota_target * 100) : 0;
                  const rem = q.quota_target - q.actual_sales;
                  return (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                      <td className="px-4 py-2.5 font-medium">{q.user_name} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${q.role === "avenger" ? "bg-purple-900/50 text-purple-400" : "bg-blue-900/50 text-blue-400"}`}>{q.role}</span></td>
                      <td className="px-4 py-2.5 text-muted">{q.month}</td>
                      <td className="px-4 py-2.5 text-right">{q.quota_target.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-green-400">{q.actual_sales.toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right ${rem > 0 ? "text-yellow-400" : "text-green-400"}`}>{rem.toLocaleString()}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-xs text-muted">{pct.toFixed(0)}%</span></div></td>
                      <td className="px-4 py-2.5"><button onClick={() => deleteQuota(q.id!)} className="text-xs text-danger hover:underline">Del</button></td>
                    </tr>);
                })}</tbody>
              </table>
            </div>
          )}
        </>)}

      </>)}
    </div>
  );
}
