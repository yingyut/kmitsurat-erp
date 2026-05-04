"use client";
import { useEffect, useState } from "react";
import type { SalesActivity, SalesQuota, Project, Customer, User, JobRequest } from "@/lib/types";

const actTypes = ["phone_call","visit","quotation_created","quotation_sent","follow_up","meeting","customer_update"] as const;
const typeLabels: Record<string, string> = { phone_call: "Phone Call", visit: "Visit", quotation_created: "QT Created", quotation_sent: "QT Sent", follow_up: "Follow-up", meeting: "Meeting", customer_update: "Update" };

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);

export default function SalesPage() {
  const [tab, setTab] = useState<"dashboard" | "pipeline" | "activities" | "requests" | "plan">("dashboard");

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ user_name: "", role: "sale" as "sale"|"avenger", month: new Date().toISOString().slice(0, 7), quota_target: 0, actual_sales: 0, profit_target: 0, actual_profit: 0, target_gp_percent: 0, won_deals: 0, total_activities: 0 });

  // Pipeline filter
  const [stageFilter, setStageFilter] = useState("all");
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobReqs, setJobReqs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [search, setSearch] = useState("");

  // Forms
  const [showActForm, setShowActForm] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [actForm, setActForm] = useState({ type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "" });
  const [reqForm, setReqForm] = useState({ request_from: "", request_to_team: "presale" as JobRequest["request_to_team"], request_to_person: "", customer_id: "", customer_name: "", project_id: "", project_name: "", title: "", description: "", value: 0, due_date: "", priority: "medium" as JobRequest["priority"], status: "pending" as JobRequest["status"], assigned_to: "", reject_reason: "", accept_note: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const fs = await import("@/lib/firestore");
      const [a, p, c, q, u, jr] = await Promise.all([fs.salesActivities.list(), fs.projects.list(), fs.customers.list(), fs.salesQuotas.list(), fs.users.list(), fs.jobRequests.list()]);
      setActivities(a); setProjects(p); setCustomers(c); setQuotas(q); setUsers(u.filter(x => x.active)); setJobReqs(jr);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  // KPI calculations
  const monthQuota = quotas.find((q) => q.month === currentMonth);
  const target = monthQuota?.quota_target || 0;
  const actualSales = monthQuota?.actual_sales || 0;
  // Profit (เป้าหมายหลักของบริษัท)
  const profitTarget = monthQuota?.profit_target || 0;
  const actualProfit = monthQuota?.actual_profit || 0;
  const profitPct = profitTarget > 0 ? (actualProfit / profitTarget * 100) : 0;
  const gpPct = actualSales > 0 ? (actualProfit / actualSales * 100) : 0;
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

  // Filtered activities
  const filteredActivities = search ? activities.filter((a) => a.description.toLowerCase().includes(search.toLowerCase()) || a.customer_name.toLowerCase().includes(search.toLowerCase())) : activities;

  function selectCust(id: string) { const c = customers.find((x) => x.id === id); setActForm({ ...actForm, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projects.find((x) => x.id === id); setActForm({ ...actForm, project_id: id, project_name: p?.name || "" }); }

  async function saveActivity() {
    if (!actForm.description.trim()) return; setSaving(true);
    const { salesActivities } = await import("@/lib/firestore");
    try { await salesActivities.add(actForm as unknown as Record<string, unknown>); setActForm({ type: "phone_call", customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new", next_follow_up: "" }); setShowActForm(false); await load(); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function updateActivityStatus(id: string, status: string) {
    const { salesActivities: sa } = await import("@/lib/firestore");
    await sa.update(id, { status }); await load();
  }

  async function deleteActivity(id: string) {
    if (!confirm("Delete?")) return;
    const { salesActivities: sa } = await import("@/lib/firestore"); await sa.remove(id); await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="กิจกรรมงานขาย — บันทึก follow-up และส่ง Job Request">Sales Activities</h1>
          <p className="text-xs text-muted">บันทึกการโทร/เยี่ยมลูกค้า และส่ง Job Request ไปทีม Presale/Service</p>
        </div>
        <div className="flex gap-2">
          {tab === "activities" && <button onClick={() => setShowActForm(!showActForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showActForm ? "Cancel" : "+ New Activity"}</button>}
          {tab === "requests" && <button onClick={() => setShowReqForm(!showReqForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showReqForm ? "Cancel" : "+ Job Request"}</button>}
          {tab === "plan" && <button onClick={() => setShowPlanForm(!showPlanForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showPlanForm ? "Cancel" : "+ Set Quota"}</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {(["dashboard","pipeline","activities","requests","plan"] as const).map((t) => {
          const labels: Record<string, string> = { dashboard: "Dashboard", pipeline: "Pipeline", activities: "Activities", requests: "Requests", plan: "Plan / Quota" };
          const thaiTitles: Record<string, string> = { dashboard: "แดชบอร์ดภาพรวมทีมขาย", pipeline: "ท่อขาย / ดีลทั้งหมด", activities: "บันทึกกิจกรรมขาย", requests: "ขอความช่วยเหลือจากทีมอื่น", plan: "แผนยอดขาย / โควต้า" };
          const reqCount = t === "requests" ? jobReqs.filter(r => r.status === "pending").length : 0;
          return (
          <button key={t} onClick={() => setTab(t)} title={thaiTitles[t]} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
            {labels[t]}
            {t === "requests" && reqCount > 0 && <span className="rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold">{reqCount}</span>}
          </button>
        );})}
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

          {/* Profit row — เป้าหมายหลักของบริษัท */}
          <div className="rounded-xl bg-purple-900/10 border border-purple-800/40 p-3 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-purple-300">💎 Profit (กำไรขั้นต้น)</p>
              <p className="text-[10px] text-purple-300/60">— เป้าหมายหลักของบริษัท · ข้อมูลจาก Sales Plan / Quota</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-card border border-purple-800/40 p-4">
                <p className="text-xs text-muted mb-1">Profit Target</p>
                <p className="text-2xl font-bold">{profitTarget.toLocaleString()}</p>
                <p className="text-xs text-muted">THB</p>
              </div>
              <div className="rounded-xl bg-card border border-purple-800/40 p-4">
                <p className="text-xs text-muted mb-1">Actual Profit</p>
                <p className="text-2xl font-bold text-purple-400">{actualProfit.toLocaleString()}</p>
                {profitTarget > 0 && <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${profitPct >= 100 ? "bg-green-500" : profitPct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(profitPct, 100)}%` }} /></div>}
              </div>
              <div className="rounded-xl bg-card border border-purple-800/40 p-4">
                <p className="text-xs text-muted mb-1">Profit Achievement</p>
                <p className={`text-2xl font-bold ${profitPct >= 100 ? "text-green-400" : profitPct >= 70 ? "text-yellow-400" : profitPct > 0 ? "text-red-400" : "text-muted"}`}>{profitPct > 0 ? `${profitPct.toFixed(1)}%` : "—"}</p>
                <p className="text-xs text-muted">เทียบเป้ากำไร</p>
              </div>
              <div className="rounded-xl bg-card border border-purple-800/40 p-4" title="กำไรขั้นต้นจริง / ยอดขายจริง">
                <p className="text-xs text-muted mb-1">Actual GP%</p>
                <p className={`text-2xl font-bold ${gpPct >= 20 ? "text-green-400" : gpPct >= 10 ? "text-yellow-400" : gpPct > 0 ? "text-red-400" : "text-muted"}`}>{gpPct > 0 ? `${gpPct.toFixed(1)}%` : "—"}</p>
                <p className="text-xs text-muted">margin จริง</p>
              </div>
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
            <input placeholder="ค้นหาดีล..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="all">ทุกสถานะ</option>
              {["lead","opportunity","proposal","negotiation","won","lost"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(() => {
            const stages = ["lead","opportunity","proposal","negotiation","won","lost"];
            const stageColor: Record<string,string> = { lead:"bg-gray-700", opportunity:"bg-blue-900/50 text-blue-400", proposal:"bg-purple-900/50 text-purple-400", negotiation:"bg-yellow-900/50 text-yellow-400", won:"bg-green-900/50 text-green-400", lost:"bg-red-900/50 text-red-400" };
            const fp = projects.filter(p => {
              const ms = search ? (p.name.toLowerCase().includes(search.toLowerCase()) || p.customer_name.toLowerCase().includes(search.toLowerCase())) : true;
              const mst = stageFilter === "all" || p.status === stageFilter;
              return ms && mst;
            });
            return (<>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                {stages.map(s => {
                  const c = projects.filter(p => p.status === s).length;
                  const v = projects.filter(p => p.status === s).reduce((sum, p) => sum + (p.value || 0), 0);
                  return <button key={s} onClick={() => setStageFilter(stageFilter === s ? "all" : s)} className={`rounded-lg border p-2.5 text-center transition-colors ${stageFilter === s ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}><p className="text-lg font-bold">{c}</p><p className="text-[10px] text-muted">{s}</p><p className="text-[10px] text-muted">{(v/1000).toFixed(0)}K</p></button>;
                })}
              </div>
              {fp.length === 0 ? <p className="text-muted text-sm">ไม่พบดีล</p> : (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left text-xs text-muted uppercase"><th className="px-4 py-2.5" title="ชื่อโปรเจค">Project</th><th className="px-4 py-2.5" title="ลูกค้า">Customer</th><th className="px-4 py-2.5 text-right" title="มูลค่า">Value</th><th className="px-4 py-2.5" title="สถานะ">Stage</th><th className="px-4 py-2.5" title="ผู้รับผิดชอบ">Owner</th></tr></thead>
                    <tbody>{fp.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                        <td className="px-4 py-2.5 font-medium">{p.name}</td>
                        <td className="px-4 py-2.5 text-muted">{p.customer_name}</td>
                        <td className="px-4 py-2.5 text-right">{(p.value||0).toLocaleString()}</td>
                        <td className="px-4 py-2.5"><select value={p.status} onChange={async e => { const fs = await import("@/lib/firestore"); await fs.projects.update(p.id!, { status: e.target.value }); await load(); }} className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none ${stageColor[p.status] || "bg-gray-700"}`}>{stages.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                        <td className="px-4 py-2.5 text-muted text-xs">{p.assigned_to || "-"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>);
          })()}
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

        {/* ===== REQUESTS TAB ===== */}
        {tab === "requests" && (<>
          {showReqForm && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <h2 className="text-base font-semibold mb-3">สร้าง Job Request</h2>
              <p className="text-[10px] text-muted mb-3">ขอความช่วยเหลือจากทีม Presale หรือ Service</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div><label className="text-[10px] text-muted">หัวข้องาน *</label><input placeholder="เช่น ขอ BOQ กล้อง CCTV 32 จุด" value={reqForm.title} onChange={e => setReqForm({ ...reqForm, title: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">ส่งถึงทีม *</label><select value={reqForm.request_to_team} onChange={e => setReqForm({ ...reqForm, request_to_team: e.target.value as JobRequest["request_to_team"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="presale">Presale (พรีเซลล์)</option><option value="service">Service (บริการ)</option></select></div>
                <div><label className="text-[10px] text-muted">ส่งถึงใคร (ถ้าระบุ)</label><select value={reqForm.request_to_person} onChange={e => setReqForm({ ...reqForm, request_to_person: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- ให้ทีมจัดการ --</option>{users.filter(u => u.role === reqForm.request_to_team).map(u => <option key={u.id} value={u.name}>{u.name} ({u.position})</option>)}</select></div>
                <div><label className="text-[10px] text-muted">ลูกค้า</label><select value={reqForm.customer_id} onChange={e => { const c = customers.find(x => x.id === e.target.value); setReqForm({ ...reqForm, customer_id: e.target.value, customer_name: c?.company_name || "" }); }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกลูกค้า --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
                <div><label className="text-[10px] text-muted">โปรเจค</label><select value={reqForm.project_id} onChange={e => { const p = projects.find(x => x.id === e.target.value); setReqForm({ ...reqForm, project_id: e.target.value, project_name: p?.name || "" }); }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกโปรเจค --</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label className="text-[10px] text-muted">มูลค่างาน (THB)</label><input type="number" placeholder="เช่น 500000" value={reqForm.value || ""} onChange={e => setReqForm({ ...reqForm, value: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">วันที่ต้องการ</label><input type="date" value={reqForm.due_date} onChange={e => setReqForm({ ...reqForm, due_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">ความเร่งด่วน</label><select value={reqForm.priority} onChange={e => setReqForm({ ...reqForm, priority: e.target.value as JobRequest["priority"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="low">Low (ปกติ)</option><option value="medium">Medium (ค่อนข้างด่วน)</option><option value="high">High (ด่วน)</option><option value="urgent">Urgent (ด่วนมาก)</option></select></div>
                <div><label className="text-[10px] text-muted">ผู้ขอ</label><select value={reqForm.request_from} onChange={e => setReqForm({ ...reqForm, request_from: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- ชื่อผู้ขอ --</option>{users.filter(u => u.role === "sale" || u.role === "avenger").map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                <div className="col-span-full"><label className="text-[10px] text-muted">รายละเอียดงาน *</label><textarea placeholder="อธิบายรายละเอียดที่ต้องการ เช่น ออกแบบระบบ WiFi 3 อาคาร, จัดทำ BOQ พร้อมแผนผัง" value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-20 resize-y mt-1" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { if (!reqForm.title.trim() || !reqForm.description.trim()) return; setSaving(true); try { const { jobRequests } = await import("@/lib/firestore"); await jobRequests.add(reqForm as unknown as Record<string, unknown>); setReqForm({ request_from: "", request_to_team: "presale", request_to_person: "", customer_id: "", customer_name: "", project_id: "", project_name: "", title: "", description: "", value: 0, due_date: "", priority: "medium", status: "pending", assigned_to: "", reject_reason: "", accept_note: "" }); setShowReqForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); } }} disabled={saving || !reqForm.title.trim() || !reqForm.description.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังส่ง..." : "ส่ง Request"}</button>
                <button onClick={() => setShowReqForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              </div>
            </div>
          )}

          {/* Request list */}
          <div className="space-y-2">
            {jobReqs.length === 0 ? <p className="text-muted text-sm">ยังไม่มี Job Request — กด &quot;+ Job Request&quot; เพื่อขอความช่วยเหลือจากทีมอื่น</p> : jobReqs.map(r => {
              const prioColor: Record<string, string> = { low: "bg-gray-700 text-gray-300", medium: "bg-blue-900/50 text-blue-400", high: "bg-amber-900/50 text-amber-400", urgent: "bg-red-900/50 text-red-400" };
              const statusColor: Record<string, string> = { pending: "bg-yellow-900/50 text-yellow-400", accepted: "bg-blue-900/50 text-blue-400", in_progress: "bg-blue-900/50 text-blue-400", completed: "bg-green-900/50 text-green-400", rejected: "bg-red-900/50 text-red-400" };
              return (
                <div key={r.id} className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm">{r.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.request_to_team === "presale" ? "bg-purple-900/50 text-purple-400" : "bg-rose-900/50 text-rose-400"}`}>→ {r.request_to_team}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${prioColor[r.priority]}`}>{r.priority}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[r.status]}`}>{r.status}</span>
                      </div>
                      <p className="text-xs text-muted">{r.description}</p>
                      <p className="text-xs text-muted mt-1">
                        {r.customer_name && `ลูกค้า: ${r.customer_name} · `}
                        {r.project_name && `โปรเจค: ${r.project_name} · `}
                        {r.value > 0 && `มูลค่า: ${r.value.toLocaleString()} THB · `}
                        {r.due_date && `กำหนด: ${r.due_date} · `}
                        ผู้ขอ: {r.request_from || "-"}
                        {r.request_to_person && ` · ถึง: ${r.request_to_person}`}
                      </p>
                      {r.assigned_to && <p className="text-xs text-green-400 mt-1">มอบหมายให้: {r.assigned_to}</p>}
                      {r.reject_reason && <p className="text-xs text-red-400 mt-1">เหตุผลปฏิเสธ: {r.reject_reason}</p>}
                      {r.accept_note && <p className="text-xs text-blue-400 mt-1">หมายเหตุรับงาน: {r.accept_note}</p>}
                    </div>
                    <button onClick={async () => { if (!confirm("ลบ Request นี้?")) return; const { jobRequests } = await import("@/lib/firestore"); await jobRequests.remove(r.id!); await load(); }} className="text-xs text-danger hover:underline shrink-0">ลบ</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ===== PLAN / QUOTA TAB ===== */}
        {tab === "plan" && (<>
          {showPlanForm && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <h2 className="text-base font-semibold mb-3">ตั้งเป้ายอดขาย</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div><label className="text-[10px] text-muted">ชื่อเซลล์ *</label><select value={planForm.user_name} onChange={e => setPlanForm({ ...planForm, user_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือก --</option>{users.filter(u => u.role === "sale" || u.role === "avenger").map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                <div><label className="text-[10px] text-muted">Role</label><select value={planForm.role} onChange={e => setPlanForm({ ...planForm, role: e.target.value as "sale"|"avenger" })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="sale">Sale</option><option value="avenger">Avenger</option></select></div>
                <div><label className="text-[10px] text-muted">เดือน</label><input type="month" value={planForm.month} onChange={e => setPlanForm({ ...planForm, month: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">เป้ายอดขาย (THB)</label><input type="number" placeholder="เช่น 2000000" value={planForm.quota_target || ""} onChange={e => setPlanForm({ ...planForm, quota_target: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">ยอดจริง (THB)</label><input type="number" value={planForm.actual_sales || ""} onChange={e => setPlanForm({ ...planForm, actual_sales: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">เป้ากำไร (THB)</label><input type="number" value={planForm.profit_target || ""} onChange={e => setPlanForm({ ...planForm, profit_target: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">กำไรจริง (THB)</label><input type="number" value={planForm.actual_profit || ""} onChange={e => setPlanForm({ ...planForm, actual_profit: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                <div><label className="text-[10px] text-muted">Won Deals</label><input type="number" value={planForm.won_deals || ""} onChange={e => setPlanForm({ ...planForm, won_deals: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!planForm.user_name.trim() || planForm.quota_target <= 0) return; setSaving(true);
                  const { salesQuotas } = await import("@/lib/firestore");
                  const remaining = planForm.quota_target - planForm.actual_sales;
                  const percent = planForm.quota_target > 0 ? (planForm.actual_sales / planForm.quota_target * 100) : 0;
                  const profit_percent = planForm.profit_target > 0 ? (planForm.actual_profit / planForm.profit_target * 100) : 0;
                  try { await salesQuotas.add({ ...planForm, remaining, percent, profit_percent } as unknown as Record<string, unknown>); setPlanForm({ user_name: "", role: "sale", month: new Date().toISOString().slice(0, 7), quota_target: 0, actual_sales: 0, profit_target: 0, actual_profit: 0, target_gp_percent: 0, won_deals: 0, total_activities: 0 }); setShowPlanForm(false); await load(); }
                  catch (e) { console.error(e); } finally { setSaving(false); }
                }} disabled={saving || !planForm.user_name.trim() || planForm.quota_target <= 0} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
                <button onClick={() => setShowPlanForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              </div>
            </div>
          )}

          {/* Summary */}
          {(() => {
            const month = new Date().toISOString().slice(0, 7);
            const monthQ = quotas.filter(q => q.month === month);
            const totalTarget = monthQ.reduce((s, q) => s + (q.quota_target || 0), 0);
            const totalActual = monthQ.reduce((s, q) => s + (q.actual_sales || 0), 0);
            const totalProfitTarget = monthQ.reduce((s, q) => s + (q.profit_target || 0), 0);
            const totalActualProfit = monthQ.reduce((s, q) => s + (q.actual_profit || 0), 0);
            const pct = totalTarget > 0 ? (totalActual / totalTarget * 100) : 0;
            const profitPct = totalProfitTarget > 0 ? (totalActualProfit / totalProfitTarget * 100) : 0;
            return (<>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl bg-card border border-border p-4"><p className="text-xs text-muted" title="เป้ายอดขายรวม">Target</p><p className="text-2xl font-bold">{totalTarget.toLocaleString()}</p><p className="text-xs text-muted">THB</p></div>
                <div className="rounded-xl bg-card border border-border p-4"><p className="text-xs text-muted" title="ยอดจริง">Actual</p><p className={`text-2xl font-bold ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{totalActual.toLocaleString()}</p><div className="mt-2 h-2 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><p className="text-[10px] text-muted mt-1">{pct.toFixed(0)}%</p></div>
                <div className="rounded-xl bg-card border border-border p-4"><p className="text-xs text-muted" title="เป้ากำไร">Profit Target</p><p className="text-2xl font-bold">{totalProfitTarget.toLocaleString()}</p><p className="text-xs text-muted">THB</p></div>
                <div className="rounded-xl bg-card border border-border p-4"><p className="text-xs text-muted" title="กำไรจริง">Actual Profit</p><p className={`text-2xl font-bold ${profitPct >= 100 ? "text-green-400" : profitPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{totalActualProfit.toLocaleString()}</p><p className="text-[10px] text-muted">{profitPct.toFixed(0)}%</p></div>
              </div>

              {/* Quota table */}
              {monthQ.length === 0 ? <p className="text-muted text-sm">ยังไม่มีข้อมูลเดือนนี้ กด &quot;+ Set Quota&quot;</p> : (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                      <th className="px-4 py-2.5" title="ชื่อเซลล์">Person</th>
                      <th className="px-4 py-2.5 text-right" title="เป้ายอดขาย">Target</th>
                      <th className="px-4 py-2.5 text-right" title="ยอดจริง">Actual</th>
                      <th className="px-4 py-2.5 text-right" title="เหลือ">Remaining</th>
                      <th className="px-4 py-2.5" title="ความคืบหน้า">Progress</th>
                      <th className="px-4 py-2.5 text-center" title="ดีลที่ปิดได้">Deals</th>
                      <th className="px-4 py-2.5 w-12"></th>
                    </tr></thead>
                    <tbody>{monthQ.map(q => {
                      const p = q.quota_target > 0 ? (q.actual_sales / q.quota_target * 100) : 0;
                      const rem = q.quota_target - q.actual_sales;
                      return (
                        <tr key={q.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                          <td className="px-4 py-2.5 font-medium">{q.user_name} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${q.role === "avenger" ? "bg-purple-900/50 text-purple-400" : "bg-blue-900/50 text-blue-400"}`}>{q.role}</span></td>
                          <td className="px-4 py-2.5 text-right">{q.quota_target.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-green-400">{q.actual_sales.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right ${rem > 0 ? "text-yellow-400" : "text-green-400"}`}>{rem.toLocaleString()}</td>
                          <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full ${p >= 100 ? "bg-green-500" : p >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(p, 100)}%` }} /></div><span className="text-xs text-muted">{p.toFixed(0)}%</span></div></td>
                          <td className="px-4 py-2.5 text-center">{q.won_deals || 0}</td>
                          <td className="px-4 py-2.5"><button onClick={async () => { if (!confirm("ลบ?")) return; const { salesQuotas } = await import("@/lib/firestore"); await salesQuotas.remove(q.id!); await load(); }} className="text-xs text-danger hover:underline">ลบ</button></td>
                        </tr>);
                    })}</tbody>
                  </table>
                </div>
              )}
            </>);
          })()}
        </>)}

      </>)}
    </div>
  );
}
