"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SalesActivity, SalesQuota, Project, Customer, User, JobRequest } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";

const actTypes = ["phone_call","visit","quotation_created","quotation_sent","follow_up","meeting","customer_update"] as const;
const typeLabels: Record<string, string> = { phone_call: "โทร", visit: "เยี่ยม", quotation_created: "สร้าง QT", quotation_sent: "ส่ง QT", follow_up: "Follow-up", meeting: "ประชุม", customer_update: "Update" };
const resultLabels: Record<string, string> = { success: "สำเร็จ", no_answer: "ไม่รับสาย", interested: "สนใจ", rejected: "ปฏิเสธ", pending: "รอผล", "": "—" };
const resultColor: Record<string, string> = { success: "text-green-400", interested: "text-blue-400", no_answer: "text-yellow-400", rejected: "text-red-400", pending: "text-muted" };
const stages = ["lead","opportunity","proposal","negotiation","won","lost"] as const;
const stageColor: Record<string, string> = { lead: "bg-gray-700", opportunity: "bg-blue-900/50 text-blue-400", proposal: "bg-purple-900/50 text-purple-400", negotiation: "bg-yellow-900/50 text-yellow-400", won: "bg-green-900/50 text-green-400", lost: "bg-red-900/50 text-red-400" };

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);
const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 7);

export default function SalesPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [tab, setTab] = useState<"dashboard" | "plan" | "workplan" | "activities" | "pipeline" | "requests">("dashboard");
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
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<SalesActivity | null>(null);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [custOpen, setCustOpen] = useState(false);

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showQuotaForm, setShowQuotaForm] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all"|"today"|"week"|"overdue">("all");
  const [planMonthFilter, setPlanMonthFilter] = useState(currentMonth);
  const [apView, setApView] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [apPersonFilter, setApPersonFilter] = useState("");
  const [showRepeatReport, setShowRepeatReport] = useState(false);
  const [actValidate, setActValidate] = useState(false);

  // Activity/Plan form
  const [actForm, setActForm] = useState({ type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", customer_type: "existing" as "existing" | "prospect", project_id: "", project_name: "", assigned_to: "", contact_person: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "", result: "" as SalesActivity["result"], next_action: "", next_action_type: "", next_action_by: "", next_action_date: "", is_plan: false, plan_date: today, expected_outcome: "", reminder_date: "", request_support: false, support_team: "presale" as "presale" | "service", support_note: "" });

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
    const { salesActivities, projects: projectsCol, logActivity, jobRequests } = await import("@/lib/firestore");
    const { request_support, support_team, support_note, ...actData } = actForm;
    const data = { ...actData, is_plan: isPlan, project_id: actForm.project_id === "__other__" ? "" : actForm.project_id };
    try {
      if (editingActId) {
        await salesActivities.update(editingActId, data as unknown as Record<string, unknown>);
        try { await logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "update", module: "sales", resource_id: editingActId, resource_name: actForm.customer_name || actForm.description.slice(0, 50), details: `แก้ไขกิจกรรม: ${actForm.description.slice(0, 80)}` }); } catch {}
      } else {
        await salesActivities.add(data as unknown as Record<string, unknown>);
        if (!isPlan && actForm.project_id && actForm.customer_type !== "prospect") {
          try { await projectsCol.update(actForm.project_id, { last_activity_date: today, ownership_status: "active" }); } catch { /* non-blocking */ }
        }
        if (!isPlan) {
          try { await logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "create", module: "sales", resource_name: actForm.customer_name || actForm.description.slice(0, 50), details: `บันทึกกิจกรรม: ${actForm.description.slice(0, 80)}` }); } catch {}
        }
        if (!isPlan && request_support) {
          try {
            await jobRequests.add({ request_from: currentUser?.name ?? "", request_to_team: support_team, request_to_person: "", customer_id: data.customer_id, customer_name: data.customer_name, project_id: data.project_id, project_name: data.project_name, title: `ขอสนับสนุน: ${data.description.slice(0, 60)}`, description: support_note || data.description, value: 0, due_date: data.next_action_date || "", priority: "medium", status: "pending", assigned_to: "", reject_reason: "", accept_note: "" } as unknown as Record<string, unknown>);
          } catch (e) { console.error("job request error", e); }
        }
      }
      resetActForm(); setShowForm(false); setShowPlanForm(false); setEditingActId(null); setSelectedActivity(null);
      await load();
    }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  function resetActForm() {
    setActForm({ type: "phone_call", customer_id: "", customer_name: "", customer_type: "existing", project_id: "", project_name: "", assigned_to: currentUser?.name || "", contact_person: "", description: "", status: "new", next_follow_up: "", result: "", next_action: "", next_action_type: "", next_action_by: currentUser?.name || "", next_action_date: "", is_plan: false, plan_date: today, expected_outcome: "", reminder_date: "", request_support: false, support_team: "presale" as "presale" | "service", support_note: "" });
    setCustSearch(""); setCustOpen(false);
  }

  function openEditActivity(a: SalesActivity) {
    setEditingActId(a.id!);
    setActForm({
      type: a.type, customer_id: a.customer_id || "", customer_name: a.customer_name || "",
      customer_type: (a.customer_type as "existing" | "prospect") || "existing",
      project_id: a.project_id || "", project_name: a.project_name || "",
      assigned_to: a.assigned_to || "", contact_person: a.contact_person || "",
      description: a.description || "", status: a.status,
      next_follow_up: a.next_follow_up || "", result: (a.result || "") as SalesActivity["result"],
      next_action: (a.next_action as string) || "", next_action_type: (a.next_action_type as string) || "",
      next_action_by: (a.next_action_by as string) || (currentUser?.name || ""), next_action_date: (a.next_action_date as string) || "",
      is_plan: a.is_plan || false, plan_date: a.plan_date || today, expected_outcome: a.expected_outcome || "",
      reminder_date: (a.reminder_date as string) || "", request_support: false,
      support_team: "presale" as "presale" | "service", support_note: "",
    });
    setCustSearch(a.customer_name || ""); setCustOpen(false);
    setActValidate(false); setShowForm(true); setSelectedActivity(null); setTab("activities");
  }

  async function updateActivity(id: string, data: Record<string, unknown>) {
    const { salesActivities } = await import("@/lib/firestore");
    await salesActivities.update(id, data); await load();
  }

  async function deleteActivity(id: string) {
    if (!confirm("ลบ?")) return;
    const { salesActivities } = await import("@/lib/firestore"); await salesActivities.remove(id); await load();
  }

  async function reassignActivity(id: string, newAssignee: string, oldAssignee: string) {
    if (!newAssignee) return;
    setSaving(true);
    try {
      const { salesActivities, logActivity } = await import("@/lib/firestore");
      await salesActivities.update(id, { assigned_to: newAssignee });
      await logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "update", module: "sales", resource_id: id, details: `โยกงานจาก ${oldAssignee || "ไม่ระบุ"} → ${newAssignee}` });
      setReassigningId(null); setReassignTarget("");
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
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

  // Data isolation for new roles without view_all_projects
  const ownSalesOnly = isNewRole(currentUser?.role ?? "") && !hasPermission("view_all_projects");
  const canReassign = hasPermission("assign_job");

  // Filtered lists
  const filteredActs = realActivities.filter(a => {
    if (ownSalesOnly && a.assigned_to && a.assigned_to !== currentUser?.name) return false;
    const s = search.toLowerCase();
    const matchSearch = !s || a.description.toLowerCase().includes(s) || a.customer_name.toLowerCase().includes(s);
    return matchSearch && matchTimeFilter(a);
  });
  const filteredPipeline = projects.filter(p => {
    if (ownSalesOnly && p.assigned_to && p.assigned_to !== currentUser?.name) return false;
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
          {tab === "workplan" && <button onClick={() => { resetActForm(); setActForm(f => ({ ...f, is_plan: true, plan_date: today })); setShowPlanForm(!showPlanForm); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showPlanForm ? "Cancel" : "+ วางแผน"}</button>}
          {tab === "activities" && <button onClick={() => { resetActForm(); setActValidate(false); setShowForm(!showForm); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ บันทึกกิจกรรม"}</button>}
          {tab === "requests" && <button onClick={() => setShowReqForm(!showReqForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showReqForm ? "Cancel" : "+ Job Request"}</button>}
          {tab === "pipeline" && <Link href="/quotations" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">→ สร้าง QT</Link>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {(["dashboard","plan","workplan","activities","pipeline","requests"] as const).map(t => {
          const labels: Record<string,string> = { dashboard: "Dashboard", plan: "Quota Set", workplan: "Action Plan", activities: "Activities", pipeline: "Pipeline", requests: "Requests" };
          const thaiTips: Record<string,string> = { dashboard: "ภาพรวม", plan: "ตั้งเป้ายอดขายรายคน", workplan: "แผนงานทีมขาย — หัวหน้าติดตามได้", activities: "บันทึกกิจกรรมจริง", pipeline: "ติดตามดีล", requests: "ขอช่วย Presale/Service" };
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
              { label: "Plans", value: plans.length, color: "from-gray-700 to-gray-600", tab: "workplan" as const },
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
            <button onClick={() => setTab("workplan")} className="w-full px-5 py-3 border-b border-border flex items-center justify-between hover:bg-card-hover transition-colors">
              <h3 className="text-sm font-semibold">📋 Plans</h3>
              <span className="rounded-full bg-blue-900/50 text-blue-400 px-2.5 py-0.5 text-xs font-bold">{plans.length}</span>
            </button>
            <div className="p-4">
              {plans.length === 0 ? <p className="text-sm text-muted text-center py-3">ไม่มีแผนค้าง</p> : (
                <div className="space-y-2">{plans.slice(0, 5).map(a => (
                  <button key={a.id} onClick={() => setTab("workplan")} className="flex items-start gap-3 w-full text-left rounded-lg px-2 py-1.5 hover:bg-card-hover transition-colors -mx-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div><p className="text-sm leading-snug">{a.expected_outcome || a.description}</p><p className="text-xs text-muted mt-0.5">{a.plan_date} · {typeLabels[a.type]}</p></div>
                  </button>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      </>)}

      {/* ═══ ACTION PLAN ═══ */}
      {tab === "workplan" && (() => {
        const dow = new Date().getDay();
        const monday = new Date(Date.now() - ((dow === 0 ? 6 : dow - 1) * 86400000));
        const weekDates = Array.from({length: 6}, (_, i) => new Date(monday.getTime() + i * 86400000).toISOString().slice(0, 10));
        const dayNames = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
        const typeIcons: Record<string, string> = { phone_call: "📞", visit: "🤝", quotation_created: "📄", quotation_sent: "✉️", follow_up: "🔄", meeting: "💬", customer_update: "📊" };
        const salesRoles = ["sale","avenger","Sales Executive","Sales Manager","Branch Manager"];
        const salesTeam = users.filter(u => salesRoles.includes(u.role) || (u.extra_roles ?? []).some(r => salesRoles.includes(r)));
        const visibleTeam = ownSalesOnly ? salesTeam.filter(u => u.name === currentUser?.name) : salesTeam;
        const displayTeam = apPersonFilter ? visibleTeam.filter(u => u.name === apPersonFilter) : visibleTeam;
        const viewPlans = activities.filter(a => {
          if (!a.is_plan) return false;
          if (apView === "daily") return a.plan_date === today;
          if (apView === "weekly") return weekDates.includes(a.plan_date || "");
          return !a.plan_date || a.plan_date.startsWith(currentMonth);
        });
        const kpiTotal = viewPlans.length;
        const kpiDone = viewPlans.filter(p => p.status === "done").length;
        const kpiInProgress = viewPlans.filter(p => p.status === "in_progress").length;
        const kpiNew = viewPlans.filter(p => p.status === "new").length;
        const kpiOverdue = viewPlans.filter(p => (p.plan_date || "") < today && p.status !== "done").length;
        const kpiDeals = viewPlans.filter(p => p.converted_to_project_id).length;

        return (
          <>
            {/* Plan form */}
            {showPlanForm && (
              <div className="rounded-xl bg-card border border-border p-5 mb-4">
                <h2 className="text-base font-semibold mb-1">วางแผนกิจกรรม</h2>
                <p className="text-[10px] text-muted mb-3">วางแผนว่าจะทำอะไร วันไหน — ไม่บังคับต้องครบทุกช่อง</p>

                {/* Quick-select preset chips */}
                <div className="mb-3">
                  <p className="text-[10px] text-muted mb-1.5">เลือกกิจกรรม <span className="opacity-60">(คลิกเพื่อเติมอัตโนมัติ)</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {["โทรแนะนำตัว","โทรติดตามงาน","เข้าพบแนะนำบริษัท","เข้าพบนำเสนอ Solution","ส่งข้อมูล / Catalog","ติดตามใบเสนอราคา","นัดประชุม / Demo","ติดตามปิดดีล"].map(p => (
                      <button key={p} type="button"
                        onClick={() => setActForm({...actForm, expected_outcome: p, description: p})}
                        className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${actForm.expected_outcome === p ? "bg-accent text-white border-accent" : "border-border text-muted hover:border-accent/60 hover:text-foreground"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <div><label className="text-[10px] text-muted">วันที่วางแผน</label><input type="date" value={actForm.plan_date || today} onChange={e => setActForm({ ...actForm, plan_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                  <div><label className="text-[10px] text-muted">ประเภท</label><select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value as SalesActivity["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{actTypes.map(t => <option key={t} value={t}>{typeIcons[t]} {typeLabels[t]}</option>)}</select></div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted">ลูกค้า (ไม่บังคับ)</label>
                      <div className="flex rounded overflow-hidden border border-border text-[9px]">
                        <button type="button" onClick={() => setActForm({...actForm, customer_type:"existing", customer_id:"", customer_name:""})} className={`px-2 py-0.5 ${actForm.customer_type !== "prospect" ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>ในระบบ</button>
                        <button type="button" onClick={() => setActForm({...actForm, customer_type:"prospect", customer_id:""})} className={`px-2 py-0.5 ${actForm.customer_type === "prospect" ? "bg-orange-600 text-white" : "text-muted hover:bg-card-hover"}`}>Prospect</button>
                      </div>
                    </div>
                    {actForm.customer_type === "prospect"
                      ? <input placeholder="ชื่อบริษัท / องค์กร" value={actForm.customer_name} onChange={e => setActForm({...actForm, customer_name: e.target.value})} className="w-full rounded-lg bg-background border border-orange-800/50 px-3 py-2 text-sm focus:outline-none focus:border-orange-500 mt-1" />
                      : <select value={actForm.customer_id} onChange={e => selectCust(e.target.value, "act")} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">— ยังไม่ระบุ —</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
                    }
                  </div>
                  <div><label className="text-[10px] text-muted">ผู้รับผิดชอบ</label><select value={actForm.assigned_to} onChange={e => setActForm({ ...actForm, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">— เลือก —</option>{users.filter(u => u.role === "sale" || u.role === "avenger").map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                  <div className="col-span-full">
                    <label className="text-[10px] text-muted">รายละเอียดเพิ่มเติม <span className="opacity-60">(หรือพิมพ์กิจกรรมเองได้เลย)</span></label>
                    <textarea placeholder="เช่น โทรหา คุณสมชาย เพื่อนัดประชุมสัปดาห์หน้า" value={actForm.expected_outcome} onChange={e => setActForm({ ...actForm, expected_outcome: e.target.value, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-14 resize-y" />
                  </div>
                </div>

                {/* Result reporting (optional) */}
                <div className="border-t border-border pt-3 mt-1">
                  <p className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-2.5">
                    รายงานผล <span className="font-normal opacity-60 normal-case">(กรณีทำแล้ว — ไม่บังคับ)</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted">ผลลัพธ์</label>
                      <select value={actForm.result || ""} onChange={e => setActForm({ ...actForm, result: e.target.value as SalesActivity["result"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                        <option value="">— ยังไม่รายงาน —</option>
                        <option value="success">✅ สำเร็จ / ปิดได้</option>
                        <option value="interested">⭐ สนใจ</option>
                        <option value="pending">⏳ รอผล</option>
                        <option value="no_answer">📵 ไม่รับสาย / ไม่ตอบ</option>
                        <option value="rejected">❌ ปฏิเสธ</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">ขั้นตอนถัดไป</label>
                      <select value={actForm.next_action_type || ""} onChange={e => setActForm({ ...actForm, next_action_type: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                        <option value="">— เลือก —</option>
                        <option value="ทำใบเสนอราคา">📄 ทำใบเสนอราคา</option>
                        <option value="นัดประชุม / Demo">💬 นัดประชุม / Demo</option>
                        <option value="เข้าพบครั้งถัดไป">🤝 เข้าพบครั้งถัดไป</option>
                        <option value="โทรติดตาม">📞 โทรติดตาม</option>
                        <option value="รอลูกค้าตัดสินใจ">⏳ รอลูกค้าตัดสินใจ</option>
                        <option value="ส่ง QT / เอกสารเพิ่ม">📎 ส่ง QT / เอกสารเพิ่ม</option>
                        <option value="ปิดดีล / ลงนาม">🎉 ปิดดีล / ลงนาม</option>
                        <option value="ยุติ">🚫 ยุติ</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => saveActivity(true)} disabled={saving || (!actForm.expected_outcome?.trim() && !actForm.next_action_type)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : "บันทึกแผน"}</button>
                  <button onClick={() => setShowPlanForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold">Action Plan — การวางแผนงาน</h2>
                <p className="text-[10px] text-muted">
                  {apView === "daily" ? `วันนี้ — ${today}` : apView === "weekly" ? `สัปดาห์นี้ — ${weekDates[0]} ถึง ${weekDates[5]}` : `เดือนนี้ — ${currentMonth}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!ownSalesOnly && visibleTeam.length > 1 && (
                  <select value={apPersonFilter} onChange={e => setApPersonFilter(e.target.value)}
                    className="rounded-lg bg-background border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent">
                    <option value="">ทุกคน</option>
                    {visibleTeam.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                )}
                <div className="flex rounded-lg overflow-hidden border border-border text-[11px]">
                  {(["daily","weekly","monthly"] as const).map(v => (
                    <button key={v} onClick={() => setApView(v)}
                      className={`px-3 py-1.5 transition-colors ${apView === v ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>
                      {v === "daily" ? "วันนี้" : v === "weekly" ? "สัปดาห์นี้" : "เดือนนี้"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI Summary */}
            <div className="rounded-xl bg-card border border-border p-4 mb-5">
              <div className="flex items-center gap-5 flex-wrap">
                <div>
                  <p className="text-2xl font-bold">{kpiTotal}</p>
                  <p className="text-[10px] text-muted">แผนทั้งหมด</p>
                </div>
                <div className="w-px h-10 bg-border hidden sm:block" />
                <div className="flex gap-5 flex-wrap text-xs">
                  <div className="text-center"><p className="text-green-400 font-bold text-lg leading-tight">{kpiDone}</p><p className="text-muted">✓ เสร็จ</p></div>
                  <div className="text-center"><p className="text-yellow-400 font-bold text-lg leading-tight">{kpiInProgress}</p><p className="text-muted">ทำอยู่</p></div>
                  <div className="text-center"><p className="text-blue-400 font-bold text-lg leading-tight">{kpiNew}</p><p className="text-muted">รอ</p></div>
                  {kpiOverdue > 0 && <div className="text-center"><p className="text-red-400 font-bold text-lg leading-tight">{kpiOverdue}</p><p className="text-muted">⚠ เกิน</p></div>}
                  {kpiDeals > 0 && <div className="text-center"><p className="text-accent font-bold text-lg leading-tight">{kpiDeals}</p><p className="text-muted">→ ดีล</p></div>}
                </div>
                {kpiTotal > 0 && (
                  <div className="ml-auto flex items-center gap-2 min-w-[140px] flex-1 max-w-xs">
                    <div className="h-2 flex-1 rounded-full bg-background overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(kpiDone/kpiTotal*100, 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">{(kpiDone/kpiTotal*100).toFixed(0)}% เสร็จ</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Daily View ── */}
            {apView === "daily" && (
              <div className="space-y-3">
                {displayTeam.length === 0 && <p className="text-sm text-muted">ไม่พบข้อมูลทีมขาย</p>}
                {displayTeam.map(u => {
                  const myPlans = viewPlans.filter(p => p.assigned_to === u.name);
                  const done = myPlans.filter(p => p.status === "done").length;
                  return (
                    <div key={u.id} className="rounded-xl bg-card border border-border overflow-hidden">
                      <div className="px-4 py-3 bg-card-hover border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">{u.name.charAt(0)}</div>
                          <div><p className="text-sm font-semibold">{u.name}</p><p className="text-[10px] text-muted">{u.position || u.role}</p></div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {myPlans.length === 0
                            ? <span className="text-muted italic">ไม่มีแผนวันนี้</span>
                            : <span className={done === myPlans.length ? "text-green-400 font-medium" : "text-blue-400"}>{done}/{myPlans.length} เสร็จ</span>}
                          {(!ownSalesOnly || currentUser?.name === u.name) && (
                            <button onClick={() => { resetActForm(); setActForm(f => ({ ...f, is_plan: true, plan_date: today, assigned_to: u.name })); setShowPlanForm(true); }}
                              className="text-[10px] bg-accent/10 text-accent rounded-lg px-2.5 py-1 hover:bg-accent/20">+ เพิ่ม</button>
                          )}
                        </div>
                      </div>
                      {myPlans.length === 0
                        ? <p className="text-xs text-muted px-4 py-3 italic">ยังไม่มีแผนสำหรับวันนี้</p>
                        : <div>{myPlans.map(plan => (
                            <div key={plan.id} onClick={() => setSelectedActivity(plan)}
                              className={`px-4 py-2.5 flex items-start gap-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-card-hover transition-colors ${plan.status === "done" ? "opacity-50" : ""}`}>
                              <span className="text-base shrink-0 mt-0.5">{typeIcons[plan.type] || "📌"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs leading-snug">{plan.expected_outcome || plan.description}</p>
                                {plan.customer_name && <p className="text-[10px] text-muted mt-0.5">{plan.customer_type === "prospect" ? "🔍" : "🏢"} {plan.customer_name}</p>}
                              </div>
                              <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium shrink-0 ${plan.status === "done" ? "bg-green-900/50 text-green-400" : plan.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>
                                {plan.status === "done" ? "✓ เสร็จ" : plan.status === "in_progress" ? "ทำอยู่" : "รอ"}
                              </span>
                            </div>
                          ))}</div>
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Weekly View ── */}
            {apView === "weekly" && (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Column headers */}
                  <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: "156px repeat(6, 1fr)" }}>
                    <div />
                    {weekDates.map((d, i) => (
                      <div key={d} className={`text-center rounded-lg py-1.5 text-[10px] font-semibold ${d === today ? "bg-accent/20 text-accent" : "text-muted"}`}>
                        <p>{dayNames[i]}</p>
                        <p className="text-[9px] font-normal opacity-70">{d.slice(5)}</p>
                      </div>
                    ))}
                  </div>
                  {/* Person rows */}
                  <div className="space-y-1">
                    {displayTeam.length === 0 && <p className="text-sm text-muted py-4">ไม่พบข้อมูลทีมขาย</p>}
                    {displayTeam.map(u => {
                      const weekTotal = viewPlans.filter(p => p.assigned_to === u.name).length;
                      return (
                        <div key={u.id} className="grid gap-1 items-stretch" style={{ gridTemplateColumns: "156px repeat(6, 1fr)" }}>
                          <div className="rounded-lg bg-card border border-border px-3 py-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">{u.name.charAt(0)}</div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{u.name.split(" ")[0]}</p>
                              <p className="text-[9px] text-muted">{weekTotal} แผน</p>
                            </div>
                          </div>
                          {weekDates.map(d => {
                            const dayPlans = viewPlans.filter(p => p.assigned_to === u.name && p.plan_date === d);
                            const isToday = d === today;
                            return (
                              <div key={d} className={`rounded-lg border min-h-[56px] p-1 ${isToday ? "border-accent/40 bg-accent/5" : "border-border bg-card"}`}>
                                {dayPlans.length === 0
                                  ? <div className="h-full flex items-center justify-center">
                                      {(!ownSalesOnly || currentUser?.name === u.name) && (
                                        <button onClick={() => { resetActForm(); setActForm(f => ({ ...f, is_plan: true, plan_date: d, assigned_to: u.name })); setShowPlanForm(true); }}
                                          className="text-[10px] text-muted/30 hover:text-accent transition-colors leading-none">+</button>
                                      )}
                                    </div>
                                  : <div className="space-y-0.5">
                                      {dayPlans.map(plan => (
                                        <button key={plan.id} onClick={() => setSelectedActivity(plan)}
                                          className={`w-full text-left rounded px-1 py-0.5 text-[9px] leading-snug hover:bg-card-hover transition-colors ${plan.status === "done" ? "line-through opacity-40" : ""}`}
                                          title={plan.expected_outcome || plan.description}>
                                          {typeIcons[plan.type] || "📌"} {(plan.customer_name || plan.expected_outcome || plan.description || "").slice(0, 16)}
                                        </button>
                                      ))}
                                    </div>
                                }
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Monthly View ── */}
            {apView === "monthly" && (
              <div className="space-y-3">
                {displayTeam.length === 0 && <p className="text-sm text-muted">ไม่พบข้อมูลทีมขาย</p>}
                {displayTeam.map(u => {
                  const myPlans = viewPlans.filter(p => p.assigned_to === u.name).sort((a, b) => (a.plan_date || "").localeCompare(b.plan_date || ""));
                  const done = myPlans.filter(p => p.status === "done").length;
                  const pct = myPlans.length > 0 ? (done / myPlans.length * 100) : 0;
                  return (
                    <div key={u.id} className="rounded-xl bg-card border border-border overflow-hidden">
                      <div className="px-4 py-3 bg-card-hover border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">{u.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-semibold">{u.name}</p>
                            <p className="text-[10px] text-muted">{u.position || u.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs">
                            <span className={done === myPlans.length && myPlans.length > 0 ? "text-green-400 font-medium" : "text-blue-400"}>{done}/{myPlans.length} แผน</span>
                            {myPlans.length > 0 && <span className="text-muted ml-1">({pct.toFixed(0)}%)</span>}
                          </div>
                          {(!ownSalesOnly || currentUser?.name === u.name) && (
                            <button onClick={() => { resetActForm(); setActForm(f => ({ ...f, is_plan: true, plan_date: today, assigned_to: u.name })); setShowPlanForm(true); }}
                              className="text-[10px] bg-accent/10 text-accent rounded-lg px-2.5 py-1 hover:bg-accent/20 whitespace-nowrap">+ เพิ่มแผน</button>
                          )}
                        </div>
                      </div>
                      {myPlans.length > 0 && (
                        <div className="h-1.5 bg-background overflow-hidden">
                          <div className={`h-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-accent"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      )}
                      {myPlans.length === 0
                        ? <p className="text-xs text-muted px-4 py-3 italic">ยังไม่มีแผนเดือนนี้</p>
                        : <div>{myPlans.map(plan => {
                            const isOvd = (plan.plan_date || "") < today && plan.status !== "done";
                            return (
                              <div key={plan.id} onClick={() => setSelectedActivity(plan)}
                                className={`px-4 py-2.5 flex items-start gap-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-card-hover transition-colors ${plan.status === "done" ? "opacity-50" : ""}`}>
                                <div className={`text-[10px] w-14 shrink-0 pt-0.5 tabular-nums ${isOvd ? "text-red-400 font-medium" : "text-muted"}`}>{plan.plan_date?.slice(5) || "—"}{isOvd && " ⚠"}</div>
                                <span className="text-base shrink-0">{typeIcons[plan.type] || "📌"}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs leading-snug">{plan.expected_outcome || plan.description}</p>
                                  {plan.customer_name && <p className="text-[10px] text-muted mt-0.5">{plan.customer_type === "prospect" ? "🔍" : "🏢"} {plan.customer_name}</p>}
                                </div>
                                <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium shrink-0 ${plan.status === "done" ? "bg-green-900/50 text-green-400" : plan.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>
                                  {plan.status === "done" ? "✓ เสร็จ" : plan.status === "in_progress" ? "ทำอยู่" : "รอ"}
                                </span>
                              </div>
                            );
                          })}</div>
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Repeat Plan Report ── */}
            <div className="mt-5 rounded-xl bg-card border border-border overflow-hidden">
              <button onClick={() => setShowRepeatReport(!showRepeatReport)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-card-hover transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">📊 สถิติการวางแผนซ้ำ</span>
                  <span className="text-[10px] text-muted">ดูว่าลูกค้าแต่ละรายถูกวางแผนกี่ครั้ง</span>
                </div>
                <span className="text-muted text-xs">{showRepeatReport ? "▲" : "▼"}</span>
              </button>
              {showRepeatReport && (() => {
                const allPlans = activities.filter(a => a.is_plan);
                type RepeatRow = { name: string; total: number; done: number; lastDate: string; persons: Set<string>; types: string[] };
                const custMap = new Map<string, RepeatRow>();
                allPlans.forEach(p => {
                  const key = p.customer_name || "(ยังไม่ระบุลูกค้า)";
                  const ex = custMap.get(key) ?? { name: key, total: 0, done: 0, lastDate: "", persons: new Set<string>(), types: [] };
                  ex.total++;
                  if (p.status === "done") ex.done++;
                  if ((p.plan_date || "") > ex.lastDate) ex.lastDate = p.plan_date || "";
                  if (p.assigned_to) ex.persons.add(p.assigned_to);
                  if (p.expected_outcome || p.description) ex.types.push(p.expected_outcome || p.description || "");
                  custMap.set(key, ex);
                });
                const rows = [...custMap.values()].sort((a, b) => b.total - a.total);
                return (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-[10px] text-muted uppercase bg-background/50">
                          <th className="px-4 py-2">ลูกค้า / Prospect</th>
                          <th className="px-4 py-2 text-center">ทั้งหมด</th>
                          <th className="px-4 py-2 text-center">วางแผนซ้ำ</th>
                          <th className="px-4 py-2 text-center">✓ เสร็จ</th>
                          <th className="px-4 py-2 hidden md:table-cell">กิจกรรมล่าสุด</th>
                          <th className="px-4 py-2 hidden md:table-cell">เซลล์</th>
                          <th className="px-4 py-2">วันล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-6 text-center text-muted italic">ยังไม่มีข้อมูลแผนงาน</td></tr>
                        )}
                        {rows.map(r => {
                          const repeat = Math.max(0, r.total - 1);
                          return (
                            <tr key={r.name} className="border-b border-border/50 last:border-0 hover:bg-card-hover transition-colors">
                              <td className="px-4 py-2.5 font-medium">{r.name}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`rounded-full px-2 py-0.5 font-bold text-[11px] ${r.total >= 5 ? "bg-red-900/50 text-red-400" : r.total >= 3 ? "bg-orange-900/50 text-orange-400" : r.total >= 2 ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>{r.total}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {repeat > 0
                                  ? <span className="text-orange-400 font-semibold">+{repeat} ครั้ง</span>
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center text-green-400 font-semibold">{r.done}</td>
                              <td className="px-4 py-2.5 text-muted hidden md:table-cell truncate max-w-[180px]">{r.types[r.types.length - 1] || "—"}</td>
                              <td className="px-4 py-2.5 text-muted hidden md:table-cell">{[...r.persons].join(", ") || "—"}</td>
                              <td className="px-4 py-2.5 text-muted">{r.lastDate || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </>
        );
      })()}

      {/* ═══ QUOTA SET ═══ */}
      {tab === "plan" && (<>
        {/* ── Quota section ── */}
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
            <h2 className="text-base font-semibold mb-4">{editingActId ? "แก้ไขกิจกรรม" : "บันทึกกิจกรรม"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">

              {/* ── ประเภท ── */}
              <div>
                <label className="text-[10px] text-muted">ประเภท</label>
                <select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value as SalesActivity["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  {actTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
                </select>
              </div>

              {/* ── ลูกค้า (searchable combobox) ── */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted">ลูกค้า</label>
                  <div className="flex rounded overflow-hidden border border-border text-[9px]">
                    <button type="button" onClick={() => { setActForm({...actForm, customer_type:"existing", customer_id:"", customer_name:""}); setCustSearch(""); }} className={`px-2 py-0.5 ${actForm.customer_type !== "prospect" ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>ในระบบ</button>
                    <button type="button" onClick={() => { setActForm({...actForm, customer_type:"prospect", customer_id:""}); setCustSearch(""); }} className={`px-2 py-0.5 ${actForm.customer_type === "prospect" ? "bg-orange-600 text-white" : "text-muted hover:bg-card-hover"}`}>🔍 Prospect</button>
                  </div>
                </div>
                {actForm.customer_type === "prospect"
                  ? <input placeholder="ชื่อบริษัท / องค์กร (ยังไม่มีในระบบ)" value={actForm.customer_name} onChange={e => setActForm({...actForm, customer_name: e.target.value})} className="w-full rounded-lg bg-background border border-orange-800/50 px-3 py-2 text-sm focus:outline-none focus:border-orange-500 mt-1" />
                  : <div className="relative mt-1">
                      <input placeholder="ค้นหาลูกค้า..." value={custSearch}
                        onChange={e => { setCustSearch(e.target.value); setCustOpen(true); if (!e.target.value) setActForm({...actForm, customer_id:"", customer_name:""}); }}
                        onFocus={() => setCustOpen(true)}
                        onBlur={() => setTimeout(() => setCustOpen(false), 180)}
                        className={`w-full rounded-lg bg-background border px-3 py-2 text-sm focus:outline-none ${actForm.customer_id ? "border-accent/50 focus:border-accent" : "border-border focus:border-accent"}`} />
                      {actForm.customer_id && <p className="text-[10px] text-accent mt-0.5">✓ {actForm.customer_name}</p>}
                      {custOpen && (
                        <div className="absolute z-30 w-full mt-1 rounded-lg bg-card border border-border shadow-2xl max-h-52 overflow-y-auto">
                          {customers.filter(c => !custSearch || c.company_name.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 30).map(c => (
                            <button key={c.id} type="button" onMouseDown={() => { if (c.id) selectCust(c.id, "act"); setCustSearch(c.company_name); setCustOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-card-hover ${actForm.customer_id === c.id ? "text-accent font-medium" : ""}`}>
                              {c.company_name}
                            </button>
                          ))}
                          {customers.filter(c => !custSearch || c.company_name.toLowerCase().includes(custSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-xs text-muted">ไม่พบลูกค้า</p>
                          )}
                        </div>
                      )}
                    </div>
                }
              </div>

              {/* ── โปรเจค (existing + สร้างใหม่) ── */}
              <div>
                <label className="text-[10px] text-muted">โปรเจค {actForm.customer_type === "prospect" && <span className="text-orange-400/70">(พิมพ์ได้เลย)</span>}</label>
                {actForm.customer_type === "prospect"
                  ? <input placeholder="ชื่อโครงการ / ดีล (ถ้ามี)" value={actForm.project_name} onChange={e => setActForm({...actForm, project_name: e.target.value})} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  : <>
                      <select value={actForm.project_id} onChange={e => { e.target.value === "__other__" ? setActForm({...actForm, project_id:"__other__", project_name:""}) : selectProj(e.target.value, "act"); }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                        <option value="">— ไม่ระบุ —</option>
                        {(() => {
                          const custProjects = actForm.customer_id ? projects.filter(p => p.customer_id === actForm.customer_id) : projects;
                          const list = custProjects.length > 0 ? custProjects : projects;
                          return list.map(p => <option key={p.id} value={p.id}>{p.name}</option>);
                        })()}
                        <option value="__other__">➕ สร้างโครงการใหม่</option>
                      </select>
                      {actForm.project_id === "__other__" && (
                        <input placeholder="ชื่อโครงการ / ดีลใหม่" value={actForm.project_name} onChange={e => setActForm({...actForm, project_name: e.target.value})} className="w-full rounded-lg bg-background border border-accent/40 px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                      )}
                    </>
                }
              </div>

              {/* ── ผู้รับผิดชอบ (auto-fill; manager/admin can change) ── */}
              <div>
                <label className="text-[10px] text-muted">ผู้รับผิดชอบ</label>
                {canReassign
                  ? <select value={actForm.assigned_to} onChange={e => setActForm({ ...actForm, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                      <option value="">— เลือก —</option>
                      {users.filter(u => u.role === "sale" || u.role === "avenger" || isNewRole(u.role ?? "")).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  : <div className="w-full rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-sm mt-1 text-foreground">{actForm.assigned_to || "—"}</div>
                }
              </div>

              {/* ── ติดต่อใคร ── */}
              <div>
                <label className="text-[10px] text-muted">ติดต่อใคร</label>
                <input placeholder="ชื่อ / ตำแหน่งผู้ติดต่อ" value={actForm.contact_person || ""} onChange={e => setActForm({ ...actForm, contact_person: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>

              {/* ── ผลลัพธ์ ── */}
              <div>
                <label className="text-[10px] text-muted">ผลลัพธ์</label>
                <select value={actForm.result || ""} onChange={e => setActForm({ ...actForm, result: e.target.value as SalesActivity["result"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">— เลือก —</option><option value="success">สำเร็จ</option><option value="interested">สนใจ</option><option value="no_answer">ไม่รับสาย</option><option value="rejected">ปฏิเสธ</option><option value="pending">รอผล</option>
                </select>
              </div>

              {/* ── Next Follow-up ── */}
              <div>
                <label className="text-[10px] text-muted">Next Follow-up</label>
                <input type="date" value={actForm.next_follow_up} onChange={e => setActForm({ ...actForm, next_follow_up: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>

              {/* ── แจ้งเตือน (Reminder) ── */}
              <div>
                <label className="text-[10px] text-muted">🔔 แจ้งเตือน (Reminder)</label>
                <input type="date" min={today} value={actForm.reminder_date || ""} onChange={e => setActForm({ ...actForm, reminder_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                {actForm.reminder_date && <p className="text-[10px] text-amber-400 mt-0.5">🔔 จะแจ้งเตือน {actForm.reminder_date}</p>}
              </div>

              {/* ── รายละเอียด ── */}
              <div className="col-span-full">
                <label className="text-[10px] text-muted">รายละเอียด <span className="text-red-400">*</span></label>
                <textarea placeholder="สิ่งที่ทำ / ผลการพูดคุย" value={actForm.description}
                  onChange={e => { setActForm({ ...actForm, description: e.target.value }); setActValidate(false); }}
                  className={`w-full rounded-lg bg-background border px-3 py-2 text-sm focus:outline-none mt-1 min-h-20 resize-y ${actValidate && !actForm.description.trim() ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
                {actValidate && !actForm.description.trim() && <p className="text-[10px] text-red-400 mt-1">กรุณากรอกรายละเอียด</p>}
              </div>

              {/* ── Next Action header ── */}
              <div className="col-span-full pt-1">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider border-t border-border pt-3">Next Action</p>
              </div>

              {/* ── ประเภท Next Action ── */}
              <div>
                <label className="text-[10px] text-muted">ประเภท</label>
                <select value={actForm.next_action_type || ""} onChange={e => setActForm({ ...actForm, next_action_type: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">— เลือก —</option>
                  <option value="เข้าพบ">🤝 เข้าพบ</option>
                  <option value="พรีเซนต์ Company Profile">📊 พรีเซนต์ Company Profile</option>
                  <option value="นำเสนอ Solution">💡 นำเสนอ Solution</option>
                  <option value="โทรติดตาม">📞 โทรติดตาม</option>
                  <option value="ส่งใบเสนอราคา">📄 ส่งใบเสนอราคา</option>
                  <option value="Demo / ทดสอบ">🖥 Demo / ทดสอบ</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              {/* ── Next Action Date ── */}
              <div>
                <label className="text-[10px] text-muted">วันที่ทำ</label>
                <input type="date" value={actForm.next_action_date || ""} onChange={e => setActForm({ ...actForm, next_action_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>

              {/* ── Next Action โดยใคร (auto-fill logged-in user) ── */}
              <div>
                <label className="text-[10px] text-muted">โดยใคร <span className="text-muted/60">(default: ตัวเอง)</span></label>
                <select value={actForm.next_action_by || ""} onChange={e => setActForm({ ...actForm, next_action_by: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">— เลือก —</option>
                  {users.map(u => <option key={u.id} value={u.name}>{u.name}{u.name === currentUser?.name ? " (ฉัน)" : ""}</option>)}
                </select>
              </div>

              {/* ── Next Action รายละเอียด (full-width textarea) ── */}
              <div className="col-span-full">
                <label className="text-[10px] text-muted">รายละเอียด Next Action</label>
                <textarea placeholder="สิ่งที่ต้องทำต่อ / เป้าหมายของการนัดครั้งหน้า" value={actForm.next_action || ""}
                  onChange={e => setActForm({ ...actForm, next_action: e.target.value })}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-20 resize-y" />
              </div>

              {/* ── ขอทีมสนับสนุน ── */}
              <div className="col-span-full rounded-xl border border-dashed border-border bg-background/40 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={actForm.request_support || false} onChange={e => setActForm({ ...actForm, request_support: e.target.checked })} className="mt-0.5 w-4 h-4 accent-purple-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">ขอทีมสนับสนุน</p>
                    <p className="text-[10px] text-muted mt-0.5">ระบบจะสร้าง Job Request ส่งให้ทีมที่เลือกโดยอัตโนมัติเมื่อบันทึก</p>
                  </div>
                </label>
                {actForm.request_support && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pl-7">
                    <div>
                      <label className="text-[10px] text-muted">ส่งถึงทีม</label>
                      <select value={actForm.support_team || "presale"} onChange={e => setActForm({ ...actForm, support_team: e.target.value as "presale" | "service" })} className="w-full rounded-lg bg-background border border-purple-800/60 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 mt-1">
                        <option value="presale">Presale — ขอ Solution / ใบเสนอราคา</option>
                        <option value="service">Service — ติดตั้ง / แก้ปัญหา</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">รายละเอียดที่ต้องการ</label>
                      <input placeholder="ต้องการความช่วยเหลืออะไรจากทีม?" value={actForm.support_note || ""} onChange={e => setActForm({ ...actForm, support_note: e.target.value })} className="w-full rounded-lg bg-background border border-purple-800/60 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 mt-1" />
                    </div>
                  </div>
                )}
              </div>

            </div>
            <div className="flex gap-2">
              <button onClick={() => { if (!actForm.description.trim()) { setActValidate(true); return; } saveActivity(false); }} disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "..." : editingActId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
              <button onClick={() => { setShowForm(false); setActValidate(false); setEditingActId(null); resetActForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
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
            const isReassigning = reassigningId === a.id;
            return (
              <div key={a.id} className={`rounded-xl bg-card border p-3 cursor-pointer hover:border-accent/30 transition-all ${isOverdue ? "border-red-800/50 hover:border-red-700/60" : "border-border"}`} onClick={() => setSelectedActivity(a)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm">{a.description}</p>
                      {a.assigned_to && (
                        <span className="text-[10px] rounded-full bg-indigo-900/50 text-indigo-300 px-2 py-0.5 shrink-0">👤 {a.assigned_to}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-[10px]">
                      <span className="rounded bg-card-hover px-1.5 py-0.5">{typeLabels[a.type]}</span>
                      {a.customer_type === "prospect"
                        ? <span className="rounded bg-orange-900/40 text-orange-400 px-1.5 py-0.5">🔍 Prospect</span>
                        : null
                      }
                      {a.customer_name && <span className="text-muted">{a.customer_name}</span>}
                      {a.contact_person && <span className="text-muted">· 👤 {a.contact_person}</span>}
                      {a.result && <span className={resultColor[a.result] || "text-muted"}>{resultLabels[a.result]}</span>}
                      {a.next_follow_up && <span className={isOverdue ? "text-red-400" : "text-muted"}>{isOverdue ? "⚠ " : ""}Follow: {a.next_follow_up}</span>}
                      {a.next_action_type && <span className="text-blue-300">→ {a.next_action_type}</span>}
                      {a.next_action && <span className="text-blue-400">{a.next_action}</span>}
                      {a.next_action_by && <span className="text-muted">โดย {a.next_action_by}</span>}
                      {a.converted_to_project_id && <span className="text-green-400">→ Pipeline</span>}
                    </div>
                    {isReassigning && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                        <span className="text-[10px] text-muted shrink-0">โยกงานให้:</span>
                        <select value={reassignTarget} onChange={e => setReassignTarget(e.target.value)}
                          className="flex-1 rounded-lg bg-background border border-accent/50 px-2 py-1 text-xs focus:outline-none focus:border-accent">
                          <option value="">— เลือกเซลล์ —</option>
                          {users.filter(u => ["sale","avenger"].includes(u.role) && u.active).map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                        <button onClick={() => reassignActivity(a.id!, reassignTarget, a.assigned_to || "")}
                          disabled={!reassignTarget || saving}
                          className="text-[10px] bg-accent text-white rounded px-2 py-1 hover:bg-accent-hover disabled:opacity-50">
                          {saving ? "..." : "ยืนยัน"}
                        </button>
                        <button onClick={() => { setReassigningId(null); setReassignTarget(""); }}
                          className="text-[10px] text-muted hover:text-foreground">ยกเลิก</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <select value={a.status} onChange={e => updateActivity(a.id!, { status: e.target.value })} className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${a.status === "done" ? "bg-green-900/50 text-green-400" : a.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}><option value="new">New</option><option value="in_progress">ทำอยู่</option><option value="done">เสร็จ</option></select>
                    {!a.converted_to_project_id && a.status !== "done" && <button onClick={() => convertActivityToPipeline(a)} title="สร้างดีล → Pipeline" className="text-[10px] bg-blue-800/50 text-blue-400 rounded px-2 py-1 hover:bg-blue-800">→ ดีล</button>}
                    {canReassign && !isReassigning && (
                      <button onClick={() => { setReassigningId(a.id!); setReassignTarget(a.assigned_to || ""); }}
                        title="โยกงานให้เซลล์คนอื่น"
                        className="text-[10px] bg-amber-900/50 text-amber-400 rounded px-2 py-1 hover:bg-amber-800">โยก</button>
                    )}
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

      {/* ═══ ACTIVITY DETAIL MODAL ═══ */}
      {selectedActivity && (() => {
        const a = selectedActivity;
        const isOverdue = ((a.next_follow_up && a.next_follow_up < today) || (a.next_action_date && a.next_action_date < today)) && a.status !== "done";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedActivity(null)}>
            <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="rounded-full bg-card-hover px-2.5 py-1 text-xs">{typeLabels[a.type]}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.status === "done" ? "bg-green-900/50 text-green-400" : a.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>
                    {a.status === "done" ? "เสร็จแล้ว" : a.status === "in_progress" ? "กำลังทำ" : "ใหม่"}
                  </span>
                  {a.result && <span className={`text-xs font-medium ${resultColor[a.result] || "text-muted"}`}>{resultLabels[a.result]}</span>}
                  {isOverdue && <span className="rounded-full bg-red-900/50 text-red-400 px-2.5 py-1 text-xs">⚠ Overdue</span>}
                  {a.converted_to_project_id && <span className="rounded-full bg-green-900/50 text-green-400 px-2.5 py-1 text-xs">→ Pipeline</span>}
                </div>
                <button onClick={() => setSelectedActivity(null)} className="text-muted hover:text-foreground text-xl leading-none shrink-0">✕</button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Description */}
                <div>
                  <p className="text-base font-semibold leading-snug">{a.description || a.expected_outcome}</p>
                  {a.customer_type === "prospect" && <span className="text-[10px] rounded bg-orange-900/40 text-orange-400 px-1.5 py-0.5 mt-1.5 inline-block">🔍 Prospect</span>}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {a.assigned_to && (
                    <div>
                      <p className="text-[10px] text-muted mb-0.5 uppercase">ผู้รับผิดชอบ</p>
                      <p className="font-medium">👤 {a.assigned_to}</p>
                    </div>
                  )}
                  {a.customer_name && (
                    <div>
                      <p className="text-[10px] text-muted mb-0.5 uppercase">ลูกค้า</p>
                      <p className="font-medium">🏢 {a.customer_name}</p>
                    </div>
                  )}
                  {a.contact_person && (
                    <div>
                      <p className="text-[10px] text-muted mb-0.5 uppercase">ติดต่อ</p>
                      <p>👤 {a.contact_person}</p>
                    </div>
                  )}
                  {a.project_name && (
                    <div>
                      <p className="text-[10px] text-muted mb-0.5 uppercase">โปรเจค</p>
                      <p>📁 {a.project_name}</p>
                    </div>
                  )}
                  {a.next_follow_up && (
                    <div>
                      <p className="text-[10px] text-muted mb-0.5 uppercase">Follow-up</p>
                      <p className={a.next_follow_up < today && a.status !== "done" ? "text-red-400 font-medium" : ""}>📅 {a.next_follow_up}</p>
                    </div>
                  )}
                </div>

                {/* Next Action block */}
                {(a.next_action || a.next_action_type || a.next_action_date) && (
                  <div className="rounded-xl bg-background border border-border p-4">
                    <p className="text-[10px] text-muted uppercase mb-2">Next Action</p>
                    <div className="space-y-1 text-sm">
                      {a.next_action_type && <p>→ <span className="text-blue-400 font-medium">{a.next_action_type as string}</span></p>}
                      {a.next_action && <p>{a.next_action as string}</p>}
                      {(a.next_action_date || a.next_action_by) && (
                        <p className="text-xs text-muted">
                          {a.next_action_date && <>📅 {a.next_action_date as string}</>}
                          {a.next_action_by && <> · โดย {a.next_action_by as string}</>}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border flex items-center gap-2 shrink-0 flex-wrap">
                <button onClick={() => openEditActivity(a)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">✏️ แก้ไข</button>
                {!a.converted_to_project_id && a.status !== "done" && (
                  <button onClick={() => { setSelectedActivity(null); convertActivityToPipeline(a); }} className="rounded-lg bg-blue-900/50 text-blue-400 border border-blue-700/50 px-4 py-2 text-sm hover:bg-blue-900">→ สร้างดีล</button>
                )}
                {canReassign && (
                  <button onClick={() => { setSelectedActivity(null); setReassigningId(a.id!); setReassignTarget(a.assigned_to || ""); setTab("activities"); }} className="rounded-lg bg-amber-900/50 text-amber-400 border border-amber-700/50 px-4 py-2 text-sm hover:bg-amber-900">โยกงาน</button>
                )}
                <div className="flex-1" />
                <button onClick={() => { setSelectedActivity(null); deleteActivity(a.id!); }} className="rounded-lg border border-red-800/50 text-red-400 px-4 py-2 text-sm hover:bg-red-900/20">ลบ</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
