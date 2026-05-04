"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SalesActivity, SalesQuota, Project, Customer, User, JobRequest } from "@/lib/types";

const actTypes = ["phone_call","visit","quotation_created","quotation_sent","follow_up","meeting","customer_update"] as const;
const typeLabels: Record<string, string> = { phone_call: "โทร", visit: "เยี่ยม", quotation_created: "สร้าง QT", quotation_sent: "ส่ง QT", follow_up: "Follow-up", meeting: "ประชุม", customer_update: "Update" };
const resultLabels: Record<string, string> = { success: "สำเร็จ", no_answer: "ไม่รับสาย", interested: "สนใจ", rejected: "ปฏิเสธ", pending: "รอผล", "": "—" };
const resultColor: Record<string, string> = { success: "text-green-400", interested: "text-blue-400", no_answer: "text-yellow-400", rejected: "text-red-400", pending: "text-muted" };
const stages = ["lead","opportunity","proposal","negotiation","won","lost"] as const;
const stageColor: Record<string, string> = { lead: "bg-gray-700", opportunity: "bg-blue-900/50 text-blue-400", proposal: "bg-purple-900/50 text-purple-400", negotiation: "bg-yellow-900/50 text-yellow-400", won: "bg-green-900/50 text-green-400", lost: "bg-red-900/50 text-red-400" };

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);
const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export default function SalesPage() {
  const [tab, setTab] = useState<"dashboard" | "plan" | "activities" | "pipeline" | "requests">("dashboard");
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotas, setQuotas] = useState<SalesQuota[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobReqs, setJobReqs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showQuotaForm, setShowQuotaForm] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all"|"today"|"week"|"overdue">("all");

  // Activity/Plan form
  const [actForm, setActForm] = useState({ type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "", result: "" as SalesActivity["result"], next_action: "", next_action_date: "", is_plan: false, plan_date: today, expected_outcome: "" });

  // Request form
  const [reqForm, setReqForm] = useState({ request_from: "", request_to_team: "presale" as JobRequest["request_to_team"], request_to_person: "", customer_id: "", customer_name: "", project_id: "", project_name: "", title: "", description: "", value: 0, due_date: "", priority: "medium" as JobRequest["priority"], status: "pending" as JobRequest["status"], assigned_to: "", reject_reason: "", accept_note: "" });

  // Quota form
  const [quotaForm, setQuotaForm] = useState({ user_name: "", role: "sale" as "sale"|"avenger", month: currentMonth, quota_target: 0, actual_sales: 0, profit_target: 0, actual_profit: 0, target_gp_percent: 0, won_deals: 0, total_activities: 0 });

  async function load() {
    try {
      const fs = await import("@/lib/firestore");
      const [a, p, c, q, u, jr] = await Promise.all([fs.salesActivities.list(), fs.projects.list(), fs.customers.list(), fs.salesQuotas.list(), fs.users.list(), fs.jobRequests.list()]);
      setActivities(a); setProjects(p); setCustomers(c); setQuotas(q); setUsers(u.filter(x => x.active)); setJobReqs(jr);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Helpers
  function selectCust(id: string, target: "act"|"req") {
    const c = customers.find(x => x.id === id);
    if (target === "act") setActForm({ ...actForm, customer_id: id, customer_name: c?.company_name || "" });
    else setReqForm({ ...reqForm, customer_id: id, customer_name: c?.company_name || "" });
  }
  function selectProj(id: string, target: "act"|"req") {
    const p = projects.find(x => x.id === id);
    if (target === "act") setActForm({ ...actForm, project_id: id, project_name: p?.name || "" });
    else setReqForm({ ...reqForm, project_id: id, project_name: p?.name || "" });
  }

  // KPIs
  const monthQuota = quotas.filter(q => q.month === currentMonth);
  const totalTarget = monthQuota.reduce((s, q) => s + (q.quota_target || 0), 0);
  const totalActual = monthQuota.reduce((s, q) => s + (q.actual_sales || 0), 0);
  const pipelineValue = projects.filter(p => !["won","lost"].includes(p.status)).reduce((s, p) => s + (p.value || 0), 0);
  const wonDeals = projects.filter(p => p.status === "won").length;

  // Plans & Activities
  const plans = activities.filter(a => a.is_plan && a.status !== "done");
  const realActivities = activities.filter(a => !a.is_plan);
  const overdueActs = realActivities.filter(a => (a.next_follow_up && a.next_follow_up < today || a.next_action_date && a.next_action_date < today) && a.status !== "done");
  const todayActs = realActivities.filter(a => a.next_follow_up === today || a.next_action_date === today);

  // Conversion stats
  const convertedToProject = realActivities.filter(a => a.converted_to_project_id).length;
  const totalActs = realActivities.length;

  // Time filter
  function matchTimeFilter(a: SalesActivity) {
    if (timeFilter === "all") return true;
    const d = a.next_follow_up || a.next_action_date || a.plan_date || "";
    if (timeFilter === "today") return d === today;
    if (timeFilter === "week") return d >= today && d <= nextWeekStr;
    if (timeFilter === "overdue") return d && d < today && a.status !== "done";
    return true;
  }

  // CRUD
  async function saveActivity(isPlan = false) {
    if (!actForm.description.trim() && !actForm.expected_outcome?.trim()) return;
    setSaving(true);
    const { salesActivities } = await import("@/lib/firestore");
    const data = { ...actForm, is_plan: isPlan };
    try { await salesActivities.add(data as unknown as Record<string, unknown>); resetActForm(); setShowForm(false); setShowPlanForm(false); await load(); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  function resetActForm() { setActForm({ type: "phone_call", customer_id: "", customer_name: "", project_id: "", project_name: "", assigned_to: "", description: "", status: "new", next_follow_up: "", result: "", next_action: "", next_action_date: "", is_plan: false, plan_date: today, expected_outcome: "" }); }

  async function updateActivity(id: string, data: Record<string, unknown>) {
    const { salesActivities } = await import("@/lib/firestore");
    await salesActivities.update(id, data); await load();
  }

  async function deleteActivity(id: string) {
    if (!confirm("ลบ?")) return;
    const { salesActivities } = await import("@/lib/firestore"); await salesActivities.remove(id); await load();
  }

  // Convert Plan → Activity
  async function convertPlanToActivity(plan: SalesActivity) {
    const { salesActivities } = await import("@/lib/firestore");
    await salesActivities.update(plan.id!, { is_plan: false, status: "in_progress", description: plan.description || plan.expected_outcome || "" });
    await load();
  }

  // Convert Activity → Pipeline
  async function convertActivityToPipeline(act: SalesActivity) {
    const name = prompt("ชื่อดีล / โปรเจค:", `${act.customer_name} - ${typeLabels[act.type]}`);
    if (!name) return;
    const value = Number(prompt("มูลค่าโดยประมาณ (THB):", "0") || 0);
    setSaving(true);
    const { projects: ps, salesActivities: sa } = await import("@/lib/firestore");
    try {
      const ref = await ps.add({ name, customer_id: act.customer_id, customer_name: act.customer_name, type: "", value, status: "lead", assigned_to: act.assigned_to, notes: act.description, probability: 20, expected_close_date: "", next_action: act.next_action || "", next_action_date: act.next_action_date || "", support_teams: [], converted_from_activity_id: act.id, win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" } as unknown as Record<string, unknown>);
      await sa.update(act.id!, { converted_to_project_id: ref.id, status: "done" });
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  // Save request
  async function saveRequest() {
    if (!reqForm.title.trim() || !reqForm.description.trim()) return;
    setSaving(true);
    const { jobRequests } = await import("@/lib/firestore");
    try { await jobRequests.add(reqForm as unknown as Record<string, unknown>); setReqForm({ request_from: "", request_to_team: "presale", request_to_person: "", customer_id: "", customer_name: "", project_id: "", project_name: "", title: "", description: "", value: 0, due_date: "", priority: "medium", status: "pending", assigned_to: "", reject_reason: "", accept_note: "" }); setShowReqForm(false); await load(); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  // Save quota
  async function saveQuota() {
    if (!quotaForm.user_name.trim() || quotaForm.quota_target <= 0) return;
    setSaving(true);
    const { salesQuotas } = await import("@/lib/firestore");
    const remaining = quotaForm.quota_target - quotaForm.actual_sales;
    const percent = quotaForm.quota_target > 0 ? (quotaForm.actual_sales / quotaForm.quota_target * 100) : 0;
    const profit_percent = quotaForm.profit_target > 0 ? (quotaForm.actual_profit / quotaForm.profit_target * 100) : 0;
    try { await salesQuotas.add({ ...quotaForm, remaining, percent, profit_percent } as unknown as Record<string, unknown>); setQuotaForm({ user_name: "", role: "sale", month: currentMonth, quota_target: 0, actual_sales: 0, profit_target: 0, actual_profit: 0, target_gp_percent: 0, won_deals: 0, total_activities: 0 }); setShowQuotaForm(false); await load(); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  // Pipeline update
  async function updateProjectStatus(id: string, status: string) {
    const { projects: ps } = await import("@/lib/firestore"); await ps.update(id, { status }); await load();
  }

  // Filtered lists
  const filteredActs = realActivities.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s || a.description.toLowerCase().includes(s) || a.customer_name.toLowerCase().includes(s);
    return matchSearch && matchTimeFilter(a);
  });
  const filteredPipeline = projects.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || p.customer_name.toLowerCase().includes(s);
    const matchStage = stageFilter === "all" || p.status === stageFilter;
    return matchSearch && matchStage;
  });

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="งานขาย — วางแผน บันทึกกิจกรรม ติดตามดีล">Sales</h1>
          <p className="text-xs text-muted">Plan → Activity → Pipeline → Quotation</p>
        </div>
        <div className="flex gap-2">
          {tab === "plan" && <button onClick={() => { resetActForm(); setActForm(f => ({ ...f, is_plan: true, plan_date: today })); setShowPlanForm(!showPlanForm); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showPlanForm ? "Cancel" : "+ วางแผน"}</button>}
          {tab === "activities" && <button onClick={() => { resetActForm(); setShowForm(!showForm); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ บันทึกกิจกรรม"}</button>}
          {tab === "requests" && <button onClick={() => setShowReqForm(!showReqForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showReqForm ? "Cancel" : "+ Job Request"}</button>}
          {tab === "pipeline" && <Link href="/quotations" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">→ สร้าง QT</Link>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {(["dashboard","plan","activities","pipeline","requests"] as const).map(t => {
          const labels: Record<string,string> = { dashboard: "Dashboard", plan: "Plan / Quota", activities: "Activities", pipeline: "Pipeline", requests: "Requests" };
          const thaiTips: Record<string,string> = { dashboard: "ภาพรวม", plan: "วางแผน + ตั้งเป้า", activities: "บันทึกกิจกรรมจริง", pipeline: "ติดตามดีล", requests: "ขอช่วย Presale/Service" };
          const badge = t === "requests" ? jobReqs.filter(r => r.status === "pending").length : t === "activities" ? overdueActs.length : 0;
          return (
            <button key={t} onClick={() => setTab(t)} title={thaiTips[t]} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
              {labels[t]}
              {badge > 0 && <span className={`rounded-full text-white text-[10px] px-1.5 py-0.5 font-bold ${t === "activities" ? "bg-red-500" : "bg-red-500"}`}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* ═══ DASHBOARD ═══ */}
      {tab === "dashboard" && (<>
        {/* KPI Cards — clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button onClick={() => setTab("plan")} className="rounded-xl bg-card border border-border p-5 text-left hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all" title="คลิกไปหน้า Plan / Quota">
            <p className="text-xs text-muted mb-1">Monthly Target</p>
            <p className="text-3xl font-bold tracking-tight">{(totalTarget / 1e6).toFixed(1)}<span className="text-lg text-muted ml-0.5">M</span></p>
            {totalTarget > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted mb-1"><span>Actual</span><span className={`font-semibold ${(totalActual/totalTarget*100) >= 100 ? "text-green-400" : (totalActual/totalTarget*100) >= 70 ? "text-yellow-400" : "text-red-400"}`}>{(totalActual/totalTarget*100).toFixed(0)}%</span></div>
                <div className="h-2 rounded-full bg-background overflow-hidden"><div className={`h-full rounded-full transition-all ${(totalActual/totalTarget*100) >= 100 ? "bg-green-500" : (totalActual/totalTarget*100) >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(totalActual/totalTarget*100, 100)}%` }} /></div>
                <p className="text-xs text-muted mt-1">{totalActual.toLocaleString()} THB</p>
              </div>
            )}
          </button>
          <button onClick={() => setTab("pipeline")} className="rounded-xl bg-card border border-border p-5 text-left hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all" title="คลิกไปหน้า Pipeline">
            <p className="text-xs text-muted mb-1">Pipeline Value</p>
            <p className="text-3xl font-bold text-blue-400 tracking-tight">{(pipelineValue/1e6).toFixed(1)}<span className="text-lg ml-0.5">M</span></p>
            <p className="text-xs text-muted mt-3">{projects.filter(p => !["won","lost"].includes(p.status)).length} active deals</p>
          </button>
          <button onClick={() => { setTab("pipeline"); setStageFilter("won"); }} className="rounded-xl bg-card border border-border p-5 text-left hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all" title="คลิกดูดีลที่ Won">
            <p className="text-xs text-muted mb-1">Won Deals</p>
            <p className="text-3xl font-bold text-green-400 tracking-tight">{wonDeals}</p>
            <p className="text-xs text-muted mt-3">{(projects.filter(p => p.status === "won").reduce((s,p) => s + (p.value||0), 0) / 1e6).toFixed(1)}M THB</p>
          </button>
          <button onClick={() => { setTab("activities"); setTimeFilter("overdue"); }} className="rounded-xl bg-card border border-border p-5 text-left hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all" title="คลิกดูงาน Overdue">
            <p className="text-xs text-muted mb-1">Overdue</p>
            <p className={`text-3xl font-bold tracking-tight ${overdueActs.length > 0 ? "text-red-400" : "text-green-400"}`}>{overdueActs.length}</p>
            <p className="text-xs text-muted mt-3">{overdueActs.length > 0 ? "ต้องติดตามด่วน!" : "ไม่มีงานค้าง ✓"}</p>
          </button>
        </div>

        {/* Conversion Flow — visual funnel */}
        <div className="rounded-xl bg-card border border-border p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">Sales Conversion Flow</h3>
          <div className="flex items-stretch gap-0">
            {[
              { label: "Plans", value: plans.length, color: "from-gray-700 to-gray-600", tab: "plan" as const },
              { label: "Activities", value: totalActs, color: "from-blue-700 to-blue-600", tab: "activities" as const },
              { label: "Pipeline", value: projects.filter(p => !["won","lost"].includes(p.status)).length, color: "from-purple-700 to-purple-600", tab: "pipeline" as const },
              { label: "Won", value: wonDeals, color: "from-green-700 to-green-600", tab: "pipeline" as const },
            ].map((step, i) => (
              <div key={step.label} className="flex items-stretch flex-1">
                <button onClick={() => { setTab(step.tab); if (step.label === "Won") setStageFilter("won"); }} className={`flex-1 bg-gradient-to-r ${step.color} rounded-lg px-3 py-4 text-center hover:brightness-125 transition-all cursor-pointer`}>
                  <p className="text-2xl font-bold text-white">{step.value}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">{step.label}</p>
                </button>
                {i < 3 && <div className="flex items-center px-1"><span className="text-muted/30 text-xl">›</span></div>}
              </div>
            ))}
          </div>
          {totalActs > 0 && <p className="text-[10px] text-muted text-center mt-3">Activity → Pipeline: <span className="text-accent font-medium">{convertedToProject}/{totalActs} ({(convertedToProject/totalActs*100).toFixed(0)}%)</span></p>}
        </div>

        {/* Today / Overdue / Plans — clean cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button onClick={() => { setTab("activities"); setTimeFilter("today"); }} className="w-full px-5 py-3 border-b border-border flex items-center justify-between hover:bg-card-hover transition-colors">
              <h3 className="text-sm font-semibold">📅 Today</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${todayActs.length > 0 ? "bg-yellow-900/50 text-yellow-400" : "bg-green-900/50 text-green-400"}`}>{todayActs.length}</span>
            </button>
            <div className="p-4">
              {todayActs.length === 0 ? <p className="text-sm text-muted text-center py-3">ไม่มีนัดวันนี้ ✓</p> : (
                <div className="space-y-2">{todayActs.slice(0, 5).map(a => (
                  <button key={a.id} onClick={() => { setTab("activities"); setTimeFilter("today"); }} className="flex items-start gap-3 w-full text-left rounded-lg px-2 py-1.5 hover:bg-card-hover transition-colors -mx-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                    <div><p className="text-sm leading-snug">{a.description}</p><p className="text-xs text-muted mt-0.5">{a.customer_name}</p></div>
                  </button>
                ))}</div>
              )}
            </div>
          </div>

          {/* Overdue */}
          <div className={`rounded-xl border overflow-hidden ${overdueActs.length > 0 ? "bg-red-950/20 border-red-800/50" : "bg-card border-border"}`}>
            <button onClick={() => { setTab("activities"); setTimeFilter("overdue"); }} className="w-full px-5 py-3 border-b border-red-800/30 flex items-center justify-between hover:bg-red-950/30 transition-colors">
              <h3 className="text-sm font-semibold">⚠️ Overdue</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${overdueActs.length > 0 ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>{overdueActs.length}</span>
            </button>
            <div className="p-4">
              {overdueActs.length === 0 ? <p className="text-sm text-muted text-center py-3">ไม่มีงานค้าง ✓</p> : (
                <div className="space-y-2">{overdueActs.slice(0, 5).map(a => (
                  <button key={a.id} onClick={() => { setTab("activities"); setTimeFilter("overdue"); }} className="flex items-start gap-3 w-full text-left rounded-lg px-2 py-1.5 hover:bg-red-950/30 transition-colors -mx-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div><p className="text-sm leading-snug">{a.description}</p><p className="text-xs text-red-400/70 mt-0.5">{a.customer_name} · {a.next_follow_up || a.next_action_date}</p></div>
                  </button>
                ))}</div>
              )}
            </div>
          </div>

          {/* Pending Plans */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button onClick={() => setTab("plan")} className="w-full px-5 py-3 border-b border-border flex items-center justify-between hover:bg-card-hover transition-colors">
              <h3 className="text-sm font-semibold">📋 Plans</h3>
              <span className="rounded-full bg-blue-900/50 text-blue-400 px-2.5 py-0.5 text-xs font-bold">{plans.length}</span>
            </button>
            <div className="p-4">
              {plans.length === 0 ? <p className="text-sm text-muted text-center py-3">ไม่มีแผนค้าง</p> : (
                <div className="space-y-2">{plans.slice(0, 5).map(a => (
                  <button key={a.id} onClick={() => setTab("plan")} className="flex items-start gap-3 w-full text-left rounded-lg px-2 py-1.5 hover:bg-card-hover transition-colors -mx-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div><p className="text-sm leading-snug">{a.expected_outcome || a.description}</p><p className="text-xs text-muted mt-0.5">{a.plan_date} · {typeLabels[a.type]}</p></div>
                  </button>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      </>)}

      {/* ═══ PLAN / QUOTA ═══ */}
      {tab === "plan" && (<>
        {/* Plan form */}
        {showPlanForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <h2 className="text-base font-semibold mb-3">วางแผนกิจกรรม</h2>
            <p className="text-[10px] text-muted mb-3">วางแผนว่าจะทำอะไร วันไหน — ยังไม่ต้องมีข้อมูลลูกค้าครบก็ได้</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div><label className="text-[10px] text-muted">วันที่วางแผน</label><input type="date" value={actForm.plan_date || today} onChange={e => setActForm({ ...actForm, plan_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">ประเภท</label><select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value as SalesActivity["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{actTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">ลูกค้า (ไม่บังคับ)</label><select value={actForm.customer_id} onChange={e => selectCust(e.target.value, "act")} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">— ยังไม่ระบุ —</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">ผู้รับผิดชอบ</label><select value={actForm.assigned_to} onChange={e => setActForm({ ...actForm, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">— เลือก —</option>{users.filter(u => u.role === "sale" || u.role === "avenger").map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div className="col-span-full"><label className="text-[10px] text-muted">ผลที่คาดหวัง / สิ่งที่จะทำ *</label><textarea placeholder="เช่น โทรนัดเข้าพบ, เยี่ยมลูกค้าเสนอ WiFi, ติดตามใบเสนอราคา" value={actForm.expected_outcome} onChange={e => setActForm({ ...actForm, expected_outcome: e.target.value, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-16 resize-y" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveActivity(true)} disabled={saving || !actForm.expected_outcome?.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "บันทึกแผน"}</button>
              <button onClick={() => setShowPlanForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Plans list */}
        <h3 className="text-sm font-semibold mb-2">แผนงานที่ยังไม่ได้ทำ ({plans.length})</h3>
        {plans.length === 0 ? <p className="text-muted text-sm mb-4">ไม่มีแผน กด &quot;+ วางแผน&quot;</p> : (
          <div className="space-y-1.5 mb-5">{plans.map(a => (
            <div key={a.id} className="rounded-xl bg-card border border-border p-3 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm">{a.expected_outcome || a.description}</p>
                <p className="text-xs text-muted mt-0.5"><span className="rounded bg-card-hover px-1.5 py-0.5">{typeLabels[a.type]}</span> · {a.plan_date || "—"}{a.customer_name && ` · ${a.customer_name}`}{a.assigned_to && ` · ${a.assigned_to}`}</p>
              </div>
              <div className="flex gap-1.5 shrink-0 ml-2">
                <button onClick={() => convertPlanToActivity(a)} title="ทำแล้ว → สร้าง Activity" className="text-[10px] bg-green-800/50 text-green-400 rounded px-2 py-1 hover:bg-green-800">✓ ทำแล้ว</button>
                <button onClick={() => deleteActivity(a.id!)} className="text-[10px] text-danger hover:underline">ลบ</button>
              </div>
            </div>
          ))}</div>
        )}

        {/* ── Quota section — redesigned ── */}
        {(() => {
          const tTarget = monthQuota.reduce((s,q) => s + (q.quota_target||0), 0);
          const tActual = monthQuota.reduce((s,q) => s + (q.actual_sales||0), 0);
          const tRemaining = tTarget - tActual;
          const tPct = tTarget > 0 ? (tActual/tTarget*100) : 0;
          const topPerformer = [...monthQuota].sort((a,b) => (b.actual_sales||0) - (a.actual_sales||0))[0];
          return (<>
            {/* KPI Summary */}
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">เป้ายอดขายเดือนนี้</h3>
                <button onClick={() => setShowQuotaForm(!showQuotaForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showQuotaForm ? "Cancel" : "+ ตั้งเป้า"}</button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-muted mb-0.5">เป้ารวม</p><p className="text-2xl font-bold">{(tTarget/1e6).toFixed(1)}<span className="text-sm text-muted ml-0.5">M</span></p></div>
                <div><p className="text-xs text-muted mb-0.5">ยอดจริง</p><p className={`text-2xl font-bold ${tPct >= 100 ? "text-green-400" : tPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{(tActual/1e6).toFixed(1)}<span className="text-sm ml-0.5">M</span></p></div>
                <div><p className="text-xs text-muted mb-0.5">เหลืออีก</p><p className={`text-2xl font-bold ${tRemaining <= 0 ? "text-green-400" : "text-yellow-400"}`}>{(Math.abs(tRemaining)/1e6).toFixed(1)}<span className="text-sm ml-0.5">M</span></p><p className="text-[10px] text-muted">{tRemaining <= 0 ? "เกินเป้าแล้ว! 🎉" : "ต้องทำเพิ่ม"}</p></div>
                <div><p className="text-xs text-muted mb-0.5">Achievement</p><p className={`text-2xl font-bold ${tPct >= 100 ? "text-green-400" : tPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{tPct.toFixed(0)}<span className="text-sm ml-0.5">%</span></p>
                  <div className="h-2 rounded-full bg-background overflow-hidden mt-2"><div className={`h-full rounded-full ${tPct >= 100 ? "bg-green-500" : tPct >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(tPct,100)}%` }} /></div>
                </div>
              </div>
              {topPerformer && <p className="text-xs text-muted">🏆 Top: <span className="text-accent font-medium">{topPerformer.user_name?.split(" ")[0]}</span> — {topPerformer.actual_sales?.toLocaleString()} THB</p>}
            </div>
          </>);
        })()}

        {/* Quota form */}
        {showQuotaForm && (
          <div className="rounded-xl bg-card border border-accent/30 p-5 mb-4">
            <h3 className="text-sm font-semibold mb-3">{quotaForm.user_name ? `แก้ไข: ${quotaForm.user_name.split(" ")[0]}` : "ตั้งเป้าใหม่"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div><label className="text-[10px] text-muted">เซลล์ *</label><select value={quotaForm.user_name} onChange={e => setQuotaForm({ ...quotaForm, user_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกเซลล์ --</option>{users.filter(u => u.role === "sale" || u.role === "avenger").map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">เป้ายอดขาย (THB)</label><input type="number" placeholder="เช่น 2000000" value={quotaForm.quota_target || ""} onChange={e => setQuotaForm({ ...quotaForm, quota_target: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">ยอดจริง (THB)</label><input type="number" placeholder="ยอดที่ปิดได้" value={quotaForm.actual_sales || ""} onChange={e => setQuotaForm({ ...quotaForm, actual_sales: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">Won Deals</label><input type="number" value={quotaForm.won_deals || ""} onChange={e => setQuotaForm({ ...quotaForm, won_deals: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveQuota} disabled={saving || !quotaForm.user_name} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "บันทึก"}</button>
              <button onClick={() => setShowQuotaForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Quota cards — modern design */}
        {monthQuota.length === 0 ? <p className="text-muted text-sm">ยังไม่มีเป้า</p> : (
          <div className="space-y-3">
            {[...monthQuota].sort((a,b) => {
              const pa = a.quota_target > 0 ? (a.actual_sales/a.quota_target*100) : 0;
              const pb = b.quota_target > 0 ? (b.actual_sales/b.quota_target*100) : 0;
              return pb - pa;
            }).map((q, rank) => {
              const pct = q.quota_target > 0 ? (q.actual_sales/q.quota_target*100) : 0;
              const remaining = q.quota_target - q.actual_sales;
              const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "";
              const barColor = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
              const textColor = pct >= 100 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-red-400";
              return (
                <div key={q.id} className="rounded-xl bg-card border border-border overflow-hidden hover:border-accent/20 transition-all">
                  <div className="flex items-center">
                    {/* Left color bar */}
                    <div className={`w-1.5 self-stretch shrink-0 ${barColor}`} />
                    <div className="flex-1 px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {medal && <span className="text-lg">{medal}</span>}
                          <div>
                            <p className="font-bold text-[15px]">{q.user_name}</p>
                            <p className="text-[10px] text-muted"><span className={`rounded-full px-1.5 py-0.5 ${q.role === "avenger" ? "bg-purple-900/50 text-purple-400" : "bg-blue-900/50 text-blue-400"}`}>{q.role}</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold tabular-nums ${textColor}`}>{pct.toFixed(0)}<span className="text-lg">%</span></p>
                        </div>
                      </div>

                      {/* Progress bar — full width */}
                      <div className="h-3 rounded-full bg-background overflow-hidden mb-3">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div><p className="text-muted">เป้า</p><p className="font-semibold tabular-nums">{q.quota_target.toLocaleString()}</p></div>
                        <div><p className="text-muted">ยอดจริง</p><p className="font-semibold text-green-400 tabular-nums">{q.actual_sales.toLocaleString()}</p></div>
                        <div><p className="text-muted">เหลือ</p><p className={`font-semibold tabular-nums ${remaining <= 0 ? "text-green-400" : "text-yellow-400"}`}>{remaining <= 0 ? "ถึงเป้า ✓" : remaining.toLocaleString()}</p></div>
                        <div><p className="text-muted">Won</p><p className="font-semibold tabular-nums">{q.won_deals || 0} deals</p></div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 px-4 shrink-0">
                      <button onClick={() => { setQuotaForm({ user_name: q.user_name, role: q.role || "sale", month: q.month || currentMonth, quota_target: q.quota_target, actual_sales: q.actual_sales, profit_target: q.profit_target || 0, actual_profit: q.actual_profit || 0, target_gp_percent: q.target_gp_percent || 0, won_deals: q.won_deals || 0, total_activities: q.total_activities || 0 }); setShowQuotaForm(true); }} title="แก้ไข" className="text-[10px] bg-accent/10 text-accent rounded-lg px-3 py-1.5 hover:bg-accent/20">✏️ แก้ไข</button>
                      <button onClick={async () => { if (!confirm(`ลบเป้า ${q.user_name}?`)) return; const { salesQuotas } = await import("@/lib/firestore"); await salesQuotas.remove(q.id!); await load(); }} title="ลบ" className="text-[10px] text-danger/70 rounded-lg px-3 py-1.5 hover:bg-red-900/20">🗑 ลบ</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>)}

      {/* ═══ ACTIVITIES ═══ */}
      {tab === "activities" && (<>
        {showForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <h2 className="text-base font-semibold mb-3">บันทึกกิจกรรม</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div><label className="text-[10px] text-muted">ประเภท</label><select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value as SalesActivity["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{actTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">ลูกค้า</label><select value={actForm.customer_id} onChange={e => selectCust(e.target.value, "act")} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">--</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">โปรเจค</label><select value={actForm.project_id} onChange={e => selectProj(e.target.value, "act")} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">--</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">ผู้รับผิดชอบ</label><select value={actForm.assigned_to} onChange={e => setActForm({ ...actForm, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">--</option>{users.filter(u => u.role === "sale" || u.role === "avenger").map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">ผลลัพธ์</label><select value={actForm.result || ""} onChange={e => setActForm({ ...actForm, result: e.target.value as SalesActivity["result"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">— เลือก —</option><option value="success">สำเร็จ</option><option value="interested">สนใจ</option><option value="no_answer">ไม่รับสาย</option><option value="rejected">ปฏิเสธ</option><option value="pending">รอผล</option></select></div>
              <div><label className="text-[10px] text-muted">Next Follow-up</label><input type="date" value={actForm.next_follow_up} onChange={e => setActForm({ ...actForm, next_follow_up: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div className="col-span-full"><label className="text-[10px] text-muted">รายละเอียด *</label><textarea placeholder="สิ่งที่ทำ / ผลการพูดคุย" value={actForm.description} onChange={e => setActForm({ ...actForm, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-16 resize-y" /></div>
              <div><label className="text-[10px] text-muted">Next Action</label><input placeholder="สิ่งที่ต้องทำต่อ" value={actForm.next_action || ""} onChange={e => setActForm({ ...actForm, next_action: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">Next Action Date</label><input type="date" value={actForm.next_action_date || ""} onChange={e => setActForm({ ...actForm, next_action_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveActivity(false)} disabled={saving || !actForm.description.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "บันทึก"}</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Time filter */}
        <div className="flex gap-2 mb-3">
          {(["all","today","week","overdue"] as const).map(f => (
            <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs ${timeFilter === f ? "bg-accent text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
              {f === "all" ? "ทั้งหมด" : f === "today" ? `วันนี้ (${todayActs.length})` : f === "week" ? "สัปดาห์นี้" : `Overdue (${overdueActs.length})`}
            </button>
          ))}
          <input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent" />
        </div>

        {filteredActs.length === 0 ? <p className="text-muted text-sm">ไม่พบกิจกรรม</p> : (
          <div className="space-y-1.5">{filteredActs.map(a => {
            const isOverdue = (a.next_follow_up && a.next_follow_up < today || a.next_action_date && a.next_action_date < today) && a.status !== "done";
            return (
              <div key={a.id} className={`rounded-xl bg-card border p-3 ${isOverdue ? "border-red-800/50" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-[10px]">
                      <span className="rounded bg-card-hover px-1.5 py-0.5">{typeLabels[a.type]}</span>
                      {a.customer_name && <span className="text-muted">{a.customer_name}</span>}
                      {a.result && <span className={resultColor[a.result] || "text-muted"}>{resultLabels[a.result]}</span>}
                      {a.next_follow_up && <span className={isOverdue ? "text-red-400" : "text-muted"}>{isOverdue ? "⚠ " : ""}Follow: {a.next_follow_up}</span>}
                      {a.next_action && <span className="text-blue-400">Next: {a.next_action}</span>}
                      {a.converted_to_project_id && <span className="text-green-400">→ Pipeline</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select value={a.status} onChange={e => updateActivity(a.id!, { status: e.target.value })} className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${a.status === "done" ? "bg-green-900/50 text-green-400" : a.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}><option value="new">New</option><option value="in_progress">ทำอยู่</option><option value="done">เสร็จ</option></select>
                    {!a.converted_to_project_id && a.status !== "done" && <button onClick={() => convertActivityToPipeline(a)} title="สร้างดีล → Pipeline" className="text-[10px] bg-blue-800/50 text-blue-400 rounded px-2 py-1 hover:bg-blue-800">→ ดีล</button>}
                    <button onClick={() => deleteActivity(a.id!)} className="text-[10px] text-danger hover:underline">ลบ</button>
                  </div>
                </div>
              </div>
            );
          })}</div>
        )}
      </>)}

      {/* ═══ PIPELINE ═══ */}
      {tab === "pipeline" && (<>
        <div className="flex gap-2 mb-3 flex-wrap">
          {stages.map(s => {
            const c = projects.filter(p => p.status === s).length;
            const v = projects.filter(p => p.status === s).reduce((sum, p) => sum + (p.value || 0), 0);
            return <button key={s} onClick={() => setStageFilter(stageFilter === s ? "all" : s)} className={`rounded-lg border p-2 text-center min-w-[80px] transition-colors ${stageFilter === s ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}><p className="text-base font-bold">{c}</p><p className="text-[9px] text-muted">{s}</p><p className="text-[9px] text-muted">{(v/1000).toFixed(0)}K</p></button>;
          })}
          <input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[150px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </div>

        {filteredPipeline.length === 0 ? <p className="text-muted text-sm">ไม่พบดีล</p> : (
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th className="px-4 py-2.5">Project</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5 text-right">Value</th><th className="px-4 py-2.5">Stage</th><th className="px-4 py-2.5">%</th><th className="px-4 py-2.5">Close Date</th><th className="px-4 py-2.5">Next Action</th><th className="px-4 py-2.5 w-24">Convert</th>
              </tr></thead>
              <tbody>{filteredPipeline.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{p.customer_name}</td>
                  <td className="px-4 py-2.5 text-right">{(p.value||0).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><select value={p.status} onChange={e => updateProjectStatus(p.id!, e.target.value)} className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${stageColor[p.status] || "bg-gray-700"}`}>{stages.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="px-4 py-2.5 text-xs text-muted">{p.probability || "—"}%</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{p.expected_close_date || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{p.next_action || "—"}{p.next_action_date && <span className="text-[9px] ml-1">({p.next_action_date})</span>}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Link href="/quotations" title="สร้างใบเสนอราคา" className="text-[9px] bg-amber-800/50 text-amber-400 rounded px-1.5 py-0.5 hover:bg-amber-800">QT</Link>
                      <Link href="/presale" title="ขอ Presale" className="text-[9px] bg-purple-800/50 text-purple-400 rounded px-1.5 py-0.5 hover:bg-purple-800">PS</Link>
                      <Link href="/service" title="สร้าง Service" className="text-[9px] bg-rose-800/50 text-rose-400 rounded px-1.5 py-0.5 hover:bg-rose-800">SV</Link>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </>)}

      {/* ═══ REQUESTS ═══ */}
      {tab === "requests" && (<>
        {showReqForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <h2 className="text-base font-semibold mb-3">สร้าง Job Request</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div><label className="text-[10px] text-muted">หัวข้อ *</label><input value={reqForm.title} onChange={e => setReqForm({ ...reqForm, title: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">ส่งถึงทีม</label><select value={reqForm.request_to_team} onChange={e => setReqForm({ ...reqForm, request_to_team: e.target.value as JobRequest["request_to_team"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="presale">Presale</option><option value="service">Service</option></select></div>
              <div><label className="text-[10px] text-muted">ลูกค้า</label><select value={reqForm.customer_id} onChange={e => selectCust(e.target.value, "req")} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">--</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="text-[10px] text-muted">วันที่ต้องการ</label><input type="date" value={reqForm.due_date} onChange={e => setReqForm({ ...reqForm, due_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">ความเร่งด่วน</label><select value={reqForm.priority} onChange={e => setReqForm({ ...reqForm, priority: e.target.value as JobRequest["priority"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="low">ปกติ</option><option value="medium">ค่อนข้างด่วน</option><option value="high">ด่วน</option><option value="urgent">ด่วนมาก</option></select></div>
              <div className="col-span-full"><label className="text-[10px] text-muted">รายละเอียด *</label><textarea value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-16 resize-y" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveRequest} disabled={saving || !reqForm.title.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "ส่ง Request"}</button>
              <button onClick={() => setShowReqForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {jobReqs.length === 0 ? <p className="text-muted text-sm">ไม่มี Request</p> : (
          <div className="space-y-1.5">{jobReqs.map(r => (
            <div key={r.id} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${r.request_to_team === "presale" ? "bg-purple-900/50 text-purple-400" : "bg-rose-900/50 text-rose-400"}`}>→ {r.request_to_team}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${r.status === "completed" ? "bg-green-900/50 text-green-400" : r.status === "accepted" || r.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : r.status === "rejected" ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-muted">{r.description}</p>
                  <p className="text-[10px] text-muted mt-0.5">{r.customer_name}{r.due_date && ` · กำหนด: ${r.due_date}`}</p>
                </div>
                <button onClick={async () => { if (!confirm("ลบ?")) return; const { jobRequests } = await import("@/lib/firestore"); await jobRequests.remove(r.id!); await load(); }} className="text-[10px] text-danger hover:underline shrink-0">ลบ</button>
              </div>
            </div>
          ))}</div>
        )}
      </>)}

      </>)}
    </div>
  );
}
