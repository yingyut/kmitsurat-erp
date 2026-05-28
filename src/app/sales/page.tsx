"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { SalesActivity, SalesQuota, Project, Customer, User, JobRequest } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import { isOwnRecord, isOwner, canSeeAll, canManageQuota } from "@/lib/ownership";
import { showSalesDashboardMenu } from "@/lib/featureFlags";

const actTypes = ["phone_call","visit","quotation_created","quotation_sent","follow_up","meeting","customer_update"] as const;
const typeLabels: Record<string, string> = { phone_call: "โทร", visit: "เยี่ยม", quotation_created: "สร้าง QT", quotation_sent: "ส่ง QT", follow_up: "Follow-up", meeting: "ประชุม", customer_update: "Update" };
const resultLabels: Record<string, string> = { success: "สำเร็จ", no_answer: "ไม่รับสาย", interested: "สนใจ", rejected: "ปฏิเสธ", pending: "รอผล", "": "—" };
const resultColor: Record<string, string> = { success: "text-emerald-300 font-medium", interested: "text-sky-300 font-medium", no_answer: "text-amber-300", rejected: "text-red-300 font-medium", pending: "text-zinc-400" };
const stages = ["lead","opportunity","proposal","negotiation","won","lost"] as const;
const stageColor: Record<string, string> = { lead: "bg-zinc-700/80 text-zinc-200", opportunity: "bg-blue-800/70 text-blue-200", proposal: "bg-violet-800/70 text-violet-200", negotiation: "bg-amber-800/70 text-amber-200", won: "bg-emerald-800/70 text-emerald-200", lost: "bg-red-800/70 text-red-200" };

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);
const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 7);

export default function SalesPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [tab, setTab] = useState<"dashboard" | "plan" | "workplan" | "activities" | "pipeline" | "requests">(showSalesDashboardMenu ? "dashboard" : "workplan");
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
  const [apView, setApView] = useState<"year" | "month" | "week" | "day" | "list">("month");
  const [apPersonFilter, setApPersonFilter] = useState("");
  const [showRepeatReport, setShowRepeatReport] = useState(false);
  const [expandedRepeatRow, setExpandedRepeatRow] = useState<string | null>(null);
  const [actValidate, setActValidate] = useState(false);
  const [calNavDate, setCalNavDate] = useState(today.slice(0, 7));
  const [calWeekStart, setCalWeekStart] = useState(() => {
    const dow = new Date().getDay();
    const monOff = dow === 0 ? 6 : dow - 1;
    return new Date(Date.now() - monOff * 86400000).toISOString().slice(0, 10);
  });
  const [calDayDate, setCalDayDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState("");
  const [drawerDay, setDrawerDay] = useState<string | null>(null);
  const [showMgDash, setShowMgDash] = useState(false);
  const [mgDate, setMgDate] = useState(today);

  // Derived calendar values — lifted out of IIFE so nav functions are cheap
  const [calY, calM] = useMemo(() => calNavDate.split("-").map(Number), [calNavDate]);
  function navPrev() {
    if (apView === "year") { setCalNavDate(`${calY - 1}-${String(calM).padStart(2, "0")}`); }
    else if (apView === "month") { const d = new Date(calY, calM - 2, 1); setCalNavDate(d.toISOString().slice(0, 7)); }
    else if (apView === "week") { const d = new Date(new Date(calWeekStart + "T12:00:00").getTime() - 7 * 86400000); setCalWeekStart(d.toISOString().slice(0, 10)); }
    else if (apView === "day") { const d = new Date(new Date(calDayDate + "T12:00:00").getTime() - 86400000); setCalDayDate(d.toISOString().slice(0, 10)); }
  }
  function navNext() {
    if (apView === "year") { setCalNavDate(`${calY + 1}-${String(calM).padStart(2, "0")}`); }
    else if (apView === "month") { const d = new Date(calY, calM, 1); setCalNavDate(d.toISOString().slice(0, 7)); }
    else if (apView === "week") { const d = new Date(new Date(calWeekStart + "T12:00:00").getTime() + 7 * 86400000); setCalWeekStart(d.toISOString().slice(0, 10)); }
    else if (apView === "day") { const d = new Date(new Date(calDayDate + "T12:00:00").getTime() + 86400000); setCalDayDate(d.toISOString().slice(0, 10)); }
  }
  function navToday() {
    setCalNavDate(today.slice(0, 7));
    const dow = new Date().getDay(); const monOff = dow === 0 ? 6 : dow - 1;
    setCalWeekStart(new Date(Date.now() - monOff * 86400000).toISOString().slice(0, 10));
    setCalDayDate(today);
  }

  // Activity/Plan form
  const [actForm, setActForm] = useState({ type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", customer_type: "existing" as "existing" | "prospect", project_id: "", project_name: "", assigned_to: "", contact_person: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "", result: "" as SalesActivity["result"], next_action: "", next_action_type: "", next_action_by: "", next_action_date: "", is_plan: false, plan_date: today, expected_outcome: "", reminder_date: "", request_support: false, support_team: "presale" as "presale" | "service", support_note: "", objective: "", outcome: "", plan_status: "planned" as "planned" | "in_progress" | "completed" | "rescheduled", rescheduled_to: "", auto_followup: false });

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

  // Admin / Avenger เท่านั้นที่เห็นข้อมูลรวมทุกคนได้
  const ownSalesOnly = !canSeeAll(currentUser);
  const canReassign = hasPermission("assign_job");
  const myName = currentUser?.name ?? "";

  // Memoized plan lists — avoids re-filtering on every calendar nav click
  const allPlans = useMemo(() => activities.filter(a => {
    if (!a.is_plan) return false;
    if (apPersonFilter) return a.assigned_to === apPersonFilter;
    if (ownSalesOnly) return !a.assigned_to || isOwnRecord(a, currentUser);
    return true;
  }), [activities, apPersonFilter, ownSalesOnly, currentUser]);
  const viewPlans = useMemo(() => typeFilter ? allPlans.filter(a => a.type === typeFilter) : allPlans, [allPlans, typeFilter]);

  // KPIs — scoped to own data when ownSalesOnly (isOwner รองรับ name + email)
  const monthQuota = quotas.filter(q => q.month === currentMonth && (!ownSalesOnly || isOwnRecord({ user_name: q.user_name }, currentUser)));
  const totalTarget = monthQuota.reduce((s, q) => s + (q.quota_target || 0), 0);
  const totalActual = monthQuota.reduce((s, q) => s + (q.actual_sales || 0), 0);
  const pipelineValue = projects.filter(p => !["won","lost"].includes(p.status) && (!ownSalesOnly || !p.assigned_to || isOwnRecord(p, currentUser))).reduce((s, p) => s + (p.value || 0), 0);
  const wonDeals = projects.filter(p => p.status === "won" && (!ownSalesOnly || !p.assigned_to || isOwnRecord(p, currentUser))).length;

  // Plans & Activities — scoped to own data when ownSalesOnly
  const plans = activities.filter(a => a.is_plan && a.status !== "done" && (!ownSalesOnly || !a.assigned_to || isOwnRecord(a, currentUser)));
  const realActivities = activities.filter(a => !a.is_plan && (!ownSalesOnly || !a.assigned_to || isOwnRecord(a, currentUser)));
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
    if (!actForm.objective?.trim() && !actForm.description.trim() && !actForm.expected_outcome?.trim()) return;
    setSaving(true);
    const { salesActivities, projects: projectsCol, logActivity, jobRequests } = await import("@/lib/firestore");
    const { request_support, support_team, support_note, auto_followup, ...actData } = actForm;
    // Map plan_status → status; rescheduled updates plan_date
    const planStatusMap = { planned: "new", in_progress: "in_progress", completed: "done", rescheduled: "new" } as const;
    const finalStatus: SalesActivity["status"] = isPlan ? planStatusMap[actData.plan_status ?? "planned"] : actData.status;
    const finalPlanDate = isPlan && actData.plan_status === "rescheduled" && actData.rescheduled_to ? actData.rescheduled_to : actData.plan_date;
    const data = { ...actData, is_plan: isPlan, status: finalStatus, plan_date: finalPlanDate, project_id: actForm.project_id === "__other__" ? "" : actForm.project_id };
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
        if (isPlan && auto_followup && actData.next_action_date) {
          await createAutoFollowup(actData);
        }
      }
      resetActForm(); setShowForm(false); setShowPlanForm(false); setEditingActId(null); setSelectedActivity(null);
      await load();
    }
    catch (e) { console.error(e); } finally { setSaving(false); }
  }

  function resetActForm() {
    setActForm({ type: "phone_call", customer_id: "", customer_name: "", customer_type: "existing", project_id: "", project_name: "", assigned_to: currentUser?.name || "", contact_person: "", description: "", status: "new", next_follow_up: "", result: "", next_action: "", next_action_type: "", next_action_by: currentUser?.name || "", next_action_date: "", is_plan: false, plan_date: today, expected_outcome: "", reminder_date: "", request_support: false, support_team: "presale" as "presale" | "service", support_note: "", objective: "", outcome: "", plan_status: "planned" as "planned" | "in_progress" | "completed" | "rescheduled", rescheduled_to: "", auto_followup: false });
    setCustSearch(""); setCustOpen(false);
  }

  function mapNextActionToType(nat: string): SalesActivity["type"] {
    const m: Record<string, SalesActivity["type"]> = { "ทำใบเสนอราคา": "quotation_created", "ส่ง QT / เอกสารเพิ่ม": "quotation_sent", "นัดประชุม / Demo": "meeting", "เข้าพบครั้งถัดไป": "visit", "โทรติดตาม": "phone_call" };
    return m[nat] || "follow_up";
  }

  async function createAutoFollowup(src: { customer_id: string; customer_name: string; customer_type?: string; project_id: string; project_name: string; assigned_to: string; next_action?: string; next_action_type?: string; next_action_date?: string; }) {
    try {
      const { salesActivities } = await import("@/lib/firestore");
      const tid = (currentUser as unknown as Record<string,string>)?.tenant_id || "";
      await salesActivities.add({ tenant_id: tid, type: mapNextActionToType(src.next_action_type || ""), customer_id: src.customer_id, customer_name: src.customer_name, customer_type: src.customer_type || "existing", project_id: src.project_id || "", project_name: src.project_name, assigned_to: src.assigned_to, description: src.next_action || src.next_action_type || "Follow-up", objective: src.next_action || src.next_action_type || "", expected_outcome: src.next_action || src.next_action_type || "", status: "new", next_follow_up: src.next_action_date || "", is_plan: true, plan_date: src.next_action_date || "", plan_status: "planned", next_action: "", next_action_type: "", next_action_date: "", result: "" } as unknown as Record<string, unknown>);
    } catch (e) { console.error("autoFollowup error", e); }
  }

  async function quickUpdatePlanStatus(id: string, planStatus: "planned" | "in_progress" | "completed" | "rescheduled", extra?: Record<string, unknown>) {
    setSaving(true);
    try {
      const { salesActivities } = await import("@/lib/firestore");
      const sm = { planned: "new", in_progress: "in_progress", completed: "done", rescheduled: "new" } as const;
      const upd: Record<string, unknown> = { plan_status: planStatus, status: sm[planStatus], ...extra };
      if (planStatus === "completed") upd.completed_at = today;
      await salesActivities.update(id, upd);
      await load(); setSelectedActivity(null);
    } finally { setSaving(false); }
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
      objective: (a.objective as string) || "", outcome: (a.outcome as string) || "",
      plan_status: ((a.plan_status as string) || "planned") as "planned" | "in_progress" | "completed" | "rescheduled",
      rescheduled_to: (a.rescheduled_to as string) || "", auto_followup: false,
    });
    setCustSearch(a.customer_name || ""); setCustOpen(false);
    if (a.is_plan) { setShowPlanForm(true); setSelectedActivity(null); }
    else { setActValidate(false); setShowForm(true); setSelectedActivity(null); setTab("activities"); }
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

  // Filtered lists — isOwner รองรับ match ทั้ง name และ email
  const filteredActs = realActivities.filter(a => {
    if (ownSalesOnly && a.assigned_to && !isOwnRecord(a, currentUser)) return false;
    const s = search.toLowerCase();
    const matchSearch = !s || a.description.toLowerCase().includes(s) || a.customer_name.toLowerCase().includes(s);
    return matchSearch && matchTimeFilter(a);
  });
  const filteredPipeline = projects.filter(p => {
    if (ownSalesOnly && p.assigned_to && !isOwnRecord(p, currentUser)) return false;
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

      {/* Tabs — workflow order: Plan → Activity → Pipeline → Request → QT */}
      <div className="flex gap-0.5 mb-5 border-b border-border overflow-x-auto">
        {([
          { id: "workplan",   label: "Action Plan", tip: "วางแผนงานทีมขาย" },
          { id: "activities", label: "Activities",  tip: "บันทึกกิจกรรมจริง" },
          { id: "pipeline",   label: "Pipeline",    tip: "ติดตามดีล" },
          { id: "requests",   label: "Requests",    tip: "ขอช่วย Presale/Service" },
          ...(showSalesDashboardMenu ? [{ id: "dashboard", label: "Dashboard", tip: "ภาพรวม" }] : []),
          ...(canManageQuota(currentUser) ? [{ id: "plan", label: "Quota Set", tip: "ตั้งเป้ายอดขายรายคน" }] : []),
        ] as { id: typeof tab; label: string; tip: string }[]).map(t => {
          const badge = t.id === "requests" ? jobReqs.filter(r => r.status === "pending").length : t.id === "activities" ? overdueActs.length : 0;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} title={t.tip}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${tab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
              {t.label}
              {badge > 0 && <span className="rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold">{badge}</span>}
            </button>
          );
        })}
        {/* Quotation — direct link, not a tab */}
        <Link href="/quotations" title="ใบเสนอราคา"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted hover:text-foreground transition-colors shrink-0 flex items-center gap-1">
          Quotation <span className="text-[10px] opacity-50">↗</span>
        </Link>
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

      {/* ═══ ACTION PLAN — CRM Calendar Planner ═══ */}
      {tab === "workplan" && (() => {
        const TC: Record<string, {bg:string;border:string;text:string;dot:string;bar:string;label:string;icon:string}> = {
          phone_call:        {bg:"bg-blue-500/10",    border:"border-blue-500/25",    text:"text-blue-500",    dot:"bg-blue-600",    bar:"bg-blue-600",    label:"โทร",       icon:"📞"},
          visit:             {bg:"bg-orange-500/10",  border:"border-orange-500/25",  text:"text-orange-500",  dot:"bg-orange-500",  bar:"bg-orange-500",  label:"เยี่ยม",    icon:"🤝"},
          meeting:           {bg:"bg-purple-500/10",  border:"border-purple-500/25",  text:"text-purple-500",  dot:"bg-purple-600",  bar:"bg-purple-600",  label:"ประชุม",    icon:"💬"},
          follow_up:         {bg:"bg-cyan-500/10",    border:"border-cyan-500/25",    text:"text-cyan-500",    dot:"bg-cyan-600",    bar:"bg-cyan-600",    label:"Follow-up", icon:"🔄"},
          quotation_created: {bg:"bg-green-500/10",   border:"border-green-500/25",   text:"text-green-500",   dot:"bg-green-600",   bar:"bg-green-600",   label:"สร้าง QT",  icon:"📄"},
          quotation_sent:    {bg:"bg-teal-500/10",    border:"border-teal-500/25",    text:"text-teal-500",    dot:"bg-teal-600",    bar:"bg-teal-600",    label:"ส่ง QT",    icon:"✉️"},
          customer_update:   {bg:"bg-indigo-500/10",  border:"border-indigo-500/25",  text:"text-indigo-500",  dot:"bg-indigo-600",  bar:"bg-indigo-600",  label:"Update",    icon:"📊"},
        };
        const thaiM = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
        const dhNames = ["จ.","อ.","พ.","พฤ.","ศ.","ส.","อา."];
        const thaiDayFull = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

        // Month grid — calY/calM come from component-level useMemo
        const firstOfMonth = new Date(calY, calM - 1, 1);
        const firstDow = (firstOfMonth.getDay() + 6) % 7;
        const daysInMonth = new Date(calY, calM, 0).getDate();
        const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
        const calCells = Array.from({length: totalCells}, (_, i) => {
          const d = new Date(firstOfMonth.getTime() - firstDow * 86400000 + i * 86400000);
          return d.toISOString().slice(0, 10);
        });

        // Week grid
        const weekDays = Array.from({length: 7}, (_, i) => {
          const d = new Date(new Date(calWeekStart + "T12:00:00").getTime() + i * 86400000);
          return d.toISOString().slice(0, 10);
        });

        // Team
        const salesRoles = ["sale","avenger","Sales Executive","Sales Manager","Branch Manager"];
        const salesTeam = users.filter(u => salesRoles.includes(u.role) || (u.extra_roles ?? []).some(r => salesRoles.includes(r)));
        const visibleTeam = ownSalesOnly ? salesTeam.filter(u => u.name === currentUser?.name) : salesTeam;

        // Plans — allPlans/viewPlans come from component-level useMemo
        const plansOn = (d: string) => viewPlans.filter(a => a.plan_date === d);

        // Side panel
        const todayItems = allPlans.filter(a => a.plan_date === today);
        const overdueItems = allPlans.filter(a => (a.plan_date || "") < today && a.status !== "done")
          .sort((a, b) => (a.plan_date || "").localeCompare(b.plan_date || ""));
        const kpiDone = allPlans.filter(p => p.status === "done").length;
        const kpiIP   = allPlans.filter(p => p.status === "in_progress").length;
        const kpiNew  = allPlans.filter(p => p.status === "new").length;

        // navPrev/navNext/navToday defined at component level

        function chip(plan: SalesActivity) {
          const tc = TC[plan.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
          const ovd = (plan.plan_date || "") < today && plan.status !== "done";
          const done = plan.status === "done";
          return (
            <button key={plan.id} onClick={e => {e.stopPropagation(); setSelectedActivity(plan);}}
              className="w-full flex items-stretch text-left rounded overflow-hidden border border-border/50 bg-card hover:bg-card-hover transition-all active:scale-[0.98]">
              <div className={`w-[3px] shrink-0 ${done ? "bg-green-500 opacity-40" : ovd ? "bg-red-600" : tc.bar}`} />
              <div className={`flex-1 px-1 py-0.5 min-w-0 ${done ? "opacity-50" : ""}`}>
                <span className={`text-[10px] truncate leading-tight font-medium block ${done ? "line-through text-muted" : ovd ? "text-red-500" : tc.text}`}>
                  {plan.customer_name?.slice(0, 13) || plan.expected_outcome?.slice(0, 13) || tc.label}
                </span>
              </div>
            </button>
          );
        }

        function planCard(plan: SalesActivity) {
          const tc = TC[plan.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
          const ovd = (plan.plan_date || "") < today && plan.status !== "done";
          const done = plan.status === "done";
          return (
            <button key={plan.id} onClick={() => setSelectedActivity(plan)}
              className={`w-full flex items-stretch text-left rounded-lg overflow-hidden border bg-card hover:shadow-sm hover:border-border transition-all active:scale-[0.98] ${ovd ? "border-red-500/40" : "border-border/60"} ${done ? "opacity-50" : ""}`}>
              <div className={`w-1 shrink-0 ${done ? "bg-green-500 opacity-60" : ovd ? "bg-red-600" : tc.bar}`} />
              <div className="flex-1 px-2 py-1.5 min-w-0">
                <p className={`text-[11px] truncate font-semibold leading-tight ${done ? "line-through text-muted" : ovd ? "text-red-500" : "text-foreground"}`}>
                  {plan.expected_outcome?.slice(0, 22) || plan.description?.slice(0, 22) || "—"}
                </p>
                {plan.customer_name && <p className={`text-[9px] truncate mt-0.5 ${ovd ? "text-red-500/70" : "text-muted"}`}>{plan.customer_name}</p>}
              </div>
            </button>
          );
        }

        // Compact card for mobile agenda
        function mobileCard(plan: SalesActivity) {
          const tc = TC[plan.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
          const ovd  = (plan.plan_date||"") < today && plan.status !== "done";
          const done = plan.status === "done";
          const linkedDeal = plan.converted_to_project_id ? projects.find(p => p.id === plan.converted_to_project_id) : null;
          return (
            <div key={plan.id} className={`rounded-xl overflow-hidden border bg-card transition-all active:scale-[0.99] ${ovd ? "border-red-500/40" : done ? "border-border/40 opacity-65" : "border-border"}`}>
              <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${ovd ? "bg-red-600" : done ? "bg-green-500 opacity-60" : tc.bar}`} />
                <div className="flex-1 px-3 py-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] rounded px-1.5 py-0.5 border font-semibold ${tc.bg} ${tc.border} ${tc.text}`}>{tc.icon} {tc.label}</span>
                    <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium border ${
                      done ? "bg-green-500/10 border-green-500/25 text-green-500" :
                      plan.status==="in_progress" ? "bg-amber-500/10 border-amber-500/25 text-amber-500" :
                      ovd ? "bg-red-500/10 border-red-500/25 text-red-500" :
                      "bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>
                      {done ? "✓ เสร็จ" : plan.status==="in_progress" ? "ทำอยู่" : ovd ? "⚠ เกิน" : "รอ"}
                    </span>
                    {plan.plan_date && <span className={`text-[10px] ml-auto shrink-0 font-medium ${ovd ? "text-red-500" : "text-muted"}`}>{plan.plan_date.slice(5)}</span>}
                  </div>
                  <p className={`text-sm font-semibold leading-tight ${done ? "line-through text-muted" : ovd ? "text-red-500" : "text-foreground"}`}>{plan.expected_outcome||plan.description||"—"}</p>
                  {(plan.customer_name||linkedDeal) && (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {plan.customer_name && <span className="text-[11px] text-muted">🏢 {plan.customer_name}</span>}
                      {linkedDeal && <span className="text-[11px] text-accent">🎯 {linkedDeal.name.slice(0,16)}</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 px-2 border-l border-border/20 shrink-0">
                  {!done && (
                    <button onClick={e=>{e.stopPropagation();updateActivity(plan.id!,{status:"done"});}}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500/15 text-green-500 text-xs active:bg-green-500/25 transition-colors font-bold" title="เสร็จ">✓</button>
                  )}
                  <button onClick={()=>setSelectedActivity(plan)} className="w-7 h-7 flex items-center justify-center text-muted/40 hover:text-muted text-xl">›</button>
                </div>
              </div>
            </div>
          );
        }

        const navLabel = apView === "year"  ? `ปี ${calY}` :
                         apView === "month" ? `${thaiM[calM-1]} ${calY}` :
                         apView === "week"  ? `${weekDays[0].slice(5)} – ${weekDays[6].slice(5)}` :
                         apView === "day"   ? calDayDate : "รายการทั้งหมด";

        return (
          <>
            {/* ══ DAILY WORKLOG FORM ══ */}
            {showPlanForm && (() => {
              const ps = actForm.plan_status ?? "planned";
              const isReporting = ps === "in_progress" || ps === "completed" || ps === "rescheduled";
              return (
                <div className="rounded-xl bg-card border border-border overflow-hidden mb-4 shadow-sm">
                  {/* Header */}
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-card-hover/20">
                    <div>
                      <h2 className="text-sm font-semibold">{editingActId ? "✏️ แก้ไขแผนงาน" : "📋 วางแผนกิจกรรม"}</h2>
                      <p className="text-[10px] text-muted">Plan → Activity → Result → Next Action</p>
                    </div>
                    <button onClick={() => { setShowPlanForm(false); setEditingActId(null); resetActForm(); }} className="text-muted hover:text-foreground text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-card-hover transition-colors">✕</button>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* ─── PHASE 1: PLANNING ─── */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">1</div>
                        <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">วางแผน (Plan)</span>
                      </div>

                      {/* Objective — primary field */}
                      <div className="mb-3">
                        <label className="text-[10px] text-muted font-medium">🎯 วัตถุประสงค์ (Objective) *</label>
                        <input placeholder="เช่น โทรนัดประชุม / เข้าพบเสนอ Solution / ปิด QT / ขอ Referral"
                          value={actForm.objective}
                          onChange={e => setActForm({...actForm, objective: e.target.value, expected_outcome: e.target.value})}
                          className="w-full rounded-lg bg-background border border-blue-500/30 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 mt-1 font-medium" />
                      </div>

                      {/* Activity type */}
                      <div className="mb-3">
                        <p className="text-[10px] text-muted mb-1.5">ประเภทกิจกรรม</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.entries(TC) as [SalesActivity["type"], typeof TC[keyof typeof TC]][]).map(([t, tc]) => (
                            <button key={t} type="button" onClick={() => setActForm({...actForm, type: t})}
                              className={`rounded-full px-3 py-1 text-[11px] border transition-colors flex items-center gap-1 ${actForm.type === t ? `${tc.bg} ${tc.border} ${tc.text} font-semibold` : "border-border text-muted hover:border-border/80 hover:text-foreground"}`}>
                              {tc.icon} {tc.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date + Customer + Assigned */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-muted">วันที่วางแผน</label>
                          <input type="date" value={actForm.plan_date || today} onChange={e => setActForm({...actForm, plan_date: e.target.value})} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-muted">ลูกค้า</label>
                            <div className="flex rounded overflow-hidden border border-border text-[9px]">
                              <button type="button" onClick={() => setActForm({...actForm, customer_type:"existing", customer_id:"", customer_name:""})} className={`px-2 py-0.5 ${actForm.customer_type !== "prospect" ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>ในระบบ</button>
                              <button type="button" onClick={() => setActForm({...actForm, customer_type:"prospect", customer_id:""})} className={`px-2 py-0.5 ${actForm.customer_type === "prospect" ? "bg-orange-600 text-white" : "text-muted hover:bg-card-hover"}`}>Prospect</button>
                            </div>
                          </div>
                          {actForm.customer_type === "prospect"
                            ? <input placeholder="ชื่อบริษัท / องค์กร" value={actForm.customer_name} onChange={e => setActForm({...actForm, customer_name: e.target.value})} className="w-full rounded-lg bg-background border border-orange-500/40 px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                            : <div className="relative">
                                <input placeholder="ค้นหาลูกค้า..." value={custSearch}
                                  onChange={e => { setCustSearch(e.target.value); setCustOpen(true); if (!e.target.value) setActForm({...actForm, customer_id:"", customer_name:""}); }}
                                  onFocus={() => setCustOpen(true)} onBlur={() => setTimeout(() => setCustOpen(false), 180)}
                                  className={`w-full rounded-lg bg-background border px-3 py-2 text-sm focus:outline-none ${actForm.customer_id ? "border-accent/50 focus:border-accent" : "border-border focus:border-accent"}`} />
                                {actForm.customer_id && <p className="text-[10px] text-accent mt-0.5">✓ {actForm.customer_name}</p>}
                                {custOpen && (
                                  <div className="absolute z-30 w-full mt-1 rounded-lg bg-card border border-border shadow-2xl max-h-52 overflow-y-auto">
                                    {customers.filter(c => !custSearch || c.company_name.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 30).map(c => (
                                      <button key={c.id} type="button" onMouseDown={() => { if (c.id) selectCust(c.id, "act"); setCustSearch(c.company_name); setCustOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-card-hover ${actForm.customer_id === c.id ? "text-accent font-medium" : ""}`}>{c.company_name}</button>
                                    ))}
                                    {customers.filter(c => !custSearch || c.company_name.toLowerCase().includes(custSearch.toLowerCase())).length === 0 && <p className="px-3 py-2 text-xs text-muted">ไม่พบลูกค้า</p>}
                                  </div>
                                )}
                              </div>
                          }
                        </div>
                        <div>
                          <label className="text-[10px] text-muted">ผู้รับผิดชอบ</label>
                          <select value={actForm.assigned_to} onChange={e => setActForm({...actForm, assigned_to: e.target.value})} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                            <option value="">— เลือก —</option>
                            {users.filter(u => salesRoles.includes(u.role) || (u.extra_roles??[]).some(r=>salesRoles.includes(r))).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Prep notes */}
                      <div className="mt-3">
                        <label className="text-[10px] text-muted">หมายเหตุ / การเตรียมตัว</label>
                        <textarea placeholder="รายละเอียดเพิ่มเติม สิ่งที่ต้องเตรียม" value={actForm.description}
                          onChange={e => setActForm({...actForm, description: e.target.value})}
                          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-[52px] resize-y" />
                      </div>
                    </div>

                    {/* ─── PHASE 2: REPORTING ─── */}
                    <div className="border-t border-border pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 ${isReporting ? "bg-green-600" : "bg-muted/30"}`}>2</div>
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${isReporting ? "text-green-500" : "text-muted"}`}>รายงานผล (Report)</span>
                        <span className="text-[10px] text-muted/60">— กรอกหลังดำเนินการ</span>
                      </div>

                      {/* Status selector */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {([
                          {v:"planned",     label:"📋 วางแผน",          bg:"bg-blue-500/10",   border:"border-blue-500/30",   text:"text-blue-500"},
                          {v:"in_progress", label:"⚡ กำลังดำเนินการ",   bg:"bg-amber-500/10",  border:"border-amber-500/30",  text:"text-amber-500"},
                          {v:"completed",   label:"✅ เสร็จแล้ว",        bg:"bg-green-500/10",  border:"border-green-500/30",  text:"text-green-500"},
                          {v:"rescheduled", label:"📅 เลื่อนนัด",        bg:"bg-orange-500/10", border:"border-orange-500/30", text:"text-orange-500"},
                        ] as const).map(s => (
                          <button key={s.v} type="button"
                            onClick={() => setActForm({...actForm, plan_status: s.v, status: s.v==="completed"?"done":s.v==="in_progress"?"in_progress":"new"})}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${ps===s.v ? `${s.bg} ${s.border} ${s.text}` : "border-border/50 text-muted hover:border-border hover:text-foreground"}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>

                      {/* Rescheduled → new date */}
                      {ps === "rescheduled" && (
                        <div className="mb-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <label className="text-[10px] text-orange-500 font-medium">เลื่อนไปวันที่</label>
                          <input type="date" value={actForm.rescheduled_to}
                            onChange={e => setActForm({...actForm, rescheduled_to: e.target.value})}
                            className="w-full rounded-lg bg-background border border-orange-500/30 px-3 py-2 text-sm focus:outline-none focus:border-orange-500 mt-1" />
                        </div>
                      )}

                      {/* Outcome + result + next action */}
                      {(ps === "in_progress" || ps === "completed") && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-muted font-medium">📝 ผลที่เกิดขึ้นจริง (Outcome){ps==="completed"?" *":""}</label>
                            <textarea placeholder="สิ่งที่เกิดขึ้น เช่น ลูกค้าสนใจ / นัดดูหน้างาน / ไม่รับสาย"
                              value={actForm.outcome}
                              onChange={e => setActForm({...actForm, outcome: e.target.value})}
                              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 min-h-[60px] resize-y" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-muted">ผลลัพธ์</label>
                              <select value={actForm.result || ""} onChange={e => setActForm({...actForm, result: e.target.value as SalesActivity["result"]})} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                                <option value="">— เลือก —</option>
                                <option value="success">✅ สำเร็จ / ปิดได้</option>
                                <option value="interested">⭐ สนใจ</option>
                                <option value="pending">⏳ รอผล</option>
                                <option value="no_answer">📵 ไม่รับสาย</option>
                                <option value="rejected">❌ ปฏิเสธ</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted">Next Action ประเภท</label>
                              <select value={actForm.next_action_type || ""} onChange={e => setActForm({...actForm, next_action_type: e.target.value})} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                                <option value="">— เลือก —</option>
                                <option value="ทำใบเสนอราคา">📄 ทำใบเสนอราคา</option>
                                <option value="นัดประชุม / Demo">💬 นัดประชุม / Demo</option>
                                <option value="เข้าพบครั้งถัดไป">🤝 เข้าพบครั้งถัดไป</option>
                                <option value="โทรติดตาม">📞 โทรติดตาม</option>
                                <option value="รอลูกค้าตัดสินใจ">⏳ รอลูกค้าตัดสินใจ</option>
                                <option value="ส่ง QT / เอกสารเพิ่ม">📎 ส่ง QT / เอกสาร</option>
                                <option value="ปิดดีล / ลงนาม">🎉 ปิดดีล</option>
                                <option value="ยุติ">🚫 ยุติ</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-muted">วันที่ Follow-up ถัดไป</label>
                              <input type="date" value={actForm.next_action_date || ""}
                                onChange={e => setActForm({...actForm, next_action_date: e.target.value, next_follow_up: e.target.value})}
                                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted">รายละเอียด Next Action</label>
                              <input placeholder="สิ่งที่ต้องทำต่อ" value={actForm.next_action || ""}
                                onChange={e => setActForm({...actForm, next_action: e.target.value})}
                                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                            </div>
                          </div>
                          {/* Auto follow-up suggestion */}
                          {actForm.next_action_date && ps === "completed" && !editingActId && (
                            <label className="flex items-start gap-2.5 text-sm cursor-pointer p-3 rounded-lg border border-dashed border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5 transition-colors">
                              <input type="checkbox" checked={actForm.auto_followup}
                                onChange={e => setActForm({...actForm, auto_followup: e.target.checked})}
                                className="w-4 h-4 rounded mt-0.5 shrink-0 accent-blue-500" />
                              <span>
                                <span className="font-medium text-blue-500 text-[12px]">สร้างแผนติดตามอัตโนมัติ</span>
                                <span className="text-muted text-[11px] block mt-0.5">วันที่ {actForm.next_action_date} · {actForm.next_action_type || "Follow-up"} · {actForm.customer_name || "ลูกค้าเดิม"}</span>
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-border flex items-center gap-2 flex-wrap bg-card-hover/10">
                    <button onClick={() => saveActivity(true)} disabled={saving || !actForm.objective?.trim()}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
                      {saving ? "..." : editingActId ? "บันทึกการแก้ไข" : ps === "completed" ? "บันทึก + รายงานผล" : "บันทึกแผน"}
                    </button>
                    <button onClick={() => { setShowPlanForm(false); setEditingActId(null); resetActForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
                    {ps === "completed" && actForm.outcome && <span className="text-[11px] text-green-500 ml-1">✓ มีผลลัพธ์บันทึก</span>}
                    {actForm.auto_followup && <span className="text-[11px] text-blue-500 ml-1">+ Auto Follow-up</span>}
                  </div>
                </div>
              );
            })()}

            {/* ══ MANAGER DASHBOARD ══ */}
            {!ownSalesOnly && (() => {
              const salesRolesM = ["sale","avenger","Sales Executive","Sales Manager","Branch Manager"];
              const salesTeamM = users.filter(u => salesRolesM.includes(u.role) || (u.extra_roles??[]).some(r=>salesRolesM.includes(r)));
              const mgPlans = activities.filter(a => a.is_plan && a.plan_date === mgDate);
              const mgRows = salesTeamM.map(u => {
                const mp = mgPlans.filter(p => p.assigned_to === u.name);
                const cmpd = mp.filter(p => p.plan_status === "completed" || p.status === "done").length;
                const inPg = mp.filter(p => p.plan_status === "in_progress").length;
                const rsch = mp.filter(p => p.plan_status === "rescheduled").length;
                const pld  = mp.filter(p => !p.plan_status || p.plan_status === "planned").length;
                const wObj = mp.filter(p => p.objective).length;
                const wOut = mp.filter(p => p.outcome).length;
                const rate = mp.length > 0 ? Math.round((cmpd / mp.length) * 100) : null;
                return { name: u.name, short: u.name.split(" ")[0], total: mp.length, pld, inPg, cmpd, rsch, wObj, wOut, rate };
              });
              const noActivity = salesTeamM.filter(u => mgPlans.filter(p => p.assigned_to === u.name).length === 0).map(u => u.name.split(" ")[0]);
              const totalPlanned = mgRows.reduce((s,r)=>s+r.total,0);
              const totalDone = mgRows.reduce((s,r)=>s+r.cmpd,0);
              return (
                <div className="mb-4">
                  <button onClick={() => setShowMgDash(v => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${showMgDash ? "bg-card border-accent/30" : "bg-card border-border/60 hover:border-border"}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold">📊 Manager Dashboard</span>
                      <span className="text-[10px] text-muted">{mgDate} · ทีม {salesTeamM.length} คน · แผน {totalPlanned} รายการ · เสร็จ {totalDone}</span>
                      {noActivity.length > 0 && <span className="rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] px-2 py-0.5">⚠ {noActivity.length} คนไม่มีแผน</span>}
                    </div>
                    <span className="text-muted text-xs">{showMgDash ? "▲" : "▼"}</span>
                  </button>

                  {showMgDash && (
                    <div className="rounded-xl bg-card border border-border overflow-hidden mt-1">
                      {/* Controls */}
                      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] text-muted font-medium uppercase tracking-wide">วันที่</span>
                        <input type="date" value={mgDate} onChange={e => setMgDate(e.target.value)}
                          className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                        <button onClick={() => setMgDate(today)} className="text-[11px] text-accent hover:underline">วันนี้</button>
                        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>วางแผน</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>กำลังทำ</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>เสร็จ</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"/>เลื่อน</span>
                        </div>
                      </div>

                      {/* No activity alert */}
                      {noActivity.length > 0 && (
                        <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
                          <span className="text-amber-500 text-sm">⚠</span>
                          <span className="text-[11px] text-amber-500">ยังไม่มีแผนวันนี้: <strong>{noActivity.join(", ")}</strong></span>
                        </div>
                      )}

                      {/* Team table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                          <thead>
                            <tr className="text-left text-[10px] text-muted uppercase tracking-wider border-b border-border bg-card-hover/30">
                              <th className="px-4 py-2.5 font-medium">ชื่อ</th>
                              <th className="px-3 py-2.5 font-medium text-blue-500">วางแผน</th>
                              <th className="px-3 py-2.5 font-medium text-amber-500">กำลังทำ</th>
                              <th className="px-3 py-2.5 font-medium text-green-500">เสร็จ</th>
                              <th className="px-3 py-2.5 font-medium text-orange-500">เลื่อน</th>
                              <th className="px-3 py-2.5 font-medium">Rate</th>
                              <th className="px-3 py-2.5 font-medium">Objective</th>
                              <th className="px-3 py-2.5 font-medium">Outcome</th>
                              <th className="px-4 py-2.5 font-medium">Progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {mgRows.map(r => (
                              <tr key={r.name} className="hover:bg-card-hover/50">
                                <td className="px-4 py-2.5">
                                  <p className="font-medium text-xs">{r.short}</p>
                                  {r.total === 0 && <p className="text-[10px] text-muted/50">ไม่มีแผน</p>}
                                </td>
                                <td className="px-3 py-2.5 text-center">{r.pld > 0 ? <span className="text-blue-500 font-semibold text-xs">{r.pld}</span> : <span className="text-muted/30 text-xs">—</span>}</td>
                                <td className="px-3 py-2.5 text-center">{r.inPg > 0 ? <span className="text-amber-500 font-semibold text-xs">{r.inPg}</span> : <span className="text-muted/30 text-xs">—</span>}</td>
                                <td className="px-3 py-2.5 text-center">{r.cmpd > 0 ? <span className="text-green-500 font-semibold text-xs">{r.cmpd}</span> : <span className="text-muted/30 text-xs">—</span>}</td>
                                <td className="px-3 py-2.5 text-center">{r.rsch > 0 ? <span className="text-orange-500 font-semibold text-xs">{r.rsch}</span> : <span className="text-muted/30 text-xs">—</span>}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {r.rate !== null ? <span className={`text-xs font-bold ${r.rate>=80?"text-green-500":r.rate>=50?"text-amber-500":"text-red-500"}`}>{r.rate}%</span> : <span className="text-muted/30 text-xs">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {r.total > 0 ? <span className={`text-xs ${r.wObj===r.total?"text-green-500":r.wObj>0?"text-amber-500":"text-red-500"}`}>{r.wObj}/{r.total}</span> : <span className="text-muted/30 text-xs">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {r.cmpd > 0 ? <span className={`text-xs ${r.wOut===r.cmpd?"text-green-500":r.wOut>0?"text-amber-500":"text-red-500"}`}>{r.wOut}/{r.cmpd}</span> : <span className="text-muted/30 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-2.5">
                                  {r.total > 0 ? (
                                    <div className="flex h-2 rounded-full overflow-hidden bg-border/30 min-w-[80px]">
                                      {r.cmpd>0&&<div className="bg-green-500" style={{width:`${r.cmpd/r.total*100}%`}}/>}
                                      {r.inPg>0&&<div className="bg-amber-500" style={{width:`${r.inPg/r.total*100}%`}}/>}
                                      {r.rsch>0&&<div className="bg-orange-500" style={{width:`${r.rsch/r.total*100}%`}}/>}
                                      {r.pld>0&&<div className="bg-blue-500/40" style={{width:`${r.pld/r.total*100}%`}}/>}
                                    </div>
                                  ) : <span className="text-muted/30 text-xs">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Quality summary */}
                      {totalPlanned > 0 && (
                        <div className="px-4 py-3 border-t border-border bg-card-hover/20 flex flex-wrap gap-5 text-[11px]">
                          <div className="flex items-center gap-1.5"><span className="text-muted">แผนทั้งหมด:</span><span className="font-semibold">{totalPlanned}</span></div>
                          <div className="flex items-center gap-1.5"><span className="text-muted">เสร็จแล้ว:</span><span className={`font-semibold ${totalDone/totalPlanned>=0.8?"text-green-500":"text-amber-500"}`}>{totalDone} ({Math.round(totalDone/totalPlanned*100)}%)</span></div>
                          <div className="flex items-center gap-1.5"><span className="text-muted">มี Objective:</span><span className="font-semibold text-blue-500">{mgRows.reduce((s,r)=>s+r.wObj,0)}/{totalPlanned}</span></div>
                          <div className="flex items-center gap-1.5"><span className="text-muted">มี Outcome:</span><span className="font-semibold text-green-500">{mgRows.reduce((s,r)=>s+r.wOut,0)}/{Math.max(totalDone,1)}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ══ MOBILE / NARROW AGENDA VIEW (@lg:hidden) ══ */}
            <div className="@lg:hidden -mx-6">
              {/* Sticky compact header */}
              <div className="sticky top-12 z-20 bg-background/95 backdrop-blur-md border-b border-border">
                {/* Month nav + add button */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-0.5">
                    <button onClick={navPrev} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:bg-card-hover text-xl leading-none active:scale-95 transition-transform">‹</button>
                    <button onClick={navToday} className="text-base font-bold text-foreground px-2 py-1 rounded-xl hover:bg-card-hover active:scale-95 transition-transform">
                      {navLabel === "รายการทั้งหมด" ? `${thaiM[calM-1]} ${calY}` : navLabel}
                    </button>
                    {apView === "year" && (
                      <button onClick={() => setApView("month")} className="text-[11px] text-accent border border-accent/30 rounded-lg px-2 py-1 ml-1">← เดือน</button>
                    )}
                    <button onClick={navNext} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:bg-card-hover text-xl leading-none active:scale-95 transition-transform">›</button>
                    {apView === "day" && (
                      <button onClick={() => setApView("month")} className="text-[11px] text-accent border border-accent/30 rounded-lg px-2 py-1 ml-1">← อเจนด้า</button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!ownSalesOnly && visibleTeam.length > 1 && (
                      <select value={apPersonFilter} onChange={e => setApPersonFilter(e.target.value)}
                        className="rounded-lg bg-background border border-border px-2 py-1 text-[11px] focus:outline-none max-w-[80px]">
                        <option value="">ทุกคน</option>
                        {visibleTeam.map(u => <option key={u.id} value={u.name}>{u.name.split(" ")[0]}</option>)}
                      </select>
                    )}
                    <button onClick={() => { resetActForm(); setActForm(f => ({...f, is_plan:true, plan_date:apView==="day"?calDayDate:today})); setShowPlanForm(true); window.scrollTo({top:0,behavior:"smooth"}); }}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-accent text-white text-2xl font-light shadow-md active:scale-95 transition-transform">+</button>
                  </div>
                </div>
                {/* Week strip */}
                <div className="overflow-x-auto border-t border-border/30">
                  <div className="flex px-2 py-1.5 gap-0.5 w-max min-w-full justify-around">
                    {weekDays.map((dateStr, i) => {
                      const isTd   = dateStr === today;
                      const isSel  = apView === "day" && calDayDate === dateStr;
                      const dp     = plansOn(dateStr);
                      const hasOvd = dp.some(p => p.status !== "done" && dateStr < today);
                      return (
                        <button key={dateStr} onClick={() => { setCalDayDate(dateStr); setApView("day"); }}
                          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 min-w-[40px] transition-all active:scale-95 ${
                            isSel ? "bg-accent text-white" : isTd ? "bg-accent/15 text-accent" : "text-muted"}`}>
                          <span className="text-[9px] uppercase font-semibold">{dhNames[i]}</span>
                          <span className={`text-sm font-bold leading-none ${isSel?"text-white":isTd?"text-accent":dateStr<today?"text-muted/50":"text-foreground"}`}>{parseInt(dateStr.slice(8))}</span>
                          <span className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
                            dp.length===0 ? "opacity-0" :
                            isSel ? "bg-white/60" :
                            hasOvd ? "bg-red-400" :
                            isTd ? "bg-accent" : "bg-muted/60"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Type filter chips (horizontal scroll) */}
                <div className="overflow-x-auto border-t border-border/30">
                  <div className="flex px-3 py-2 gap-1.5 w-max">
                    <button onClick={() => setTypeFilter("")}
                      className={`rounded-full px-3 py-1 text-[11px] border whitespace-nowrap transition-all ${!typeFilter?"bg-accent/20 border-accent/30 text-accent font-medium":"border-border text-muted"}`}>
                      ทั้งหมด
                    </button>
                    {(Object.entries(TC) as [string, typeof TC[string]][]).map(([type, tc]) => {
                      const cnt = allPlans.filter(p => p.type === type).length;
                      return (
                        <button key={type} onClick={() => setTypeFilter(typeFilter===type?"":type)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border whitespace-nowrap transition-all ${
                            typeFilter===type ? `${tc.bg} ${tc.border} ${tc.text} font-medium` : "border-border text-muted"}`}>
                          {tc.icon} {tc.label}{cnt>0?` ${cnt}`:""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Day view (tapped from week strip) ── */}
              {apView === "day" && (() => {
                const dp     = plansOn(calDayDate);
                const isTd   = calDayDate === today;
                const isPast = calDayDate < today;
                const dow    = new Date(calDayDate + "T12:00:00").getDay();
                return (
                  <div className="px-4 pt-3 pb-24">
                    <div className={`rounded-xl border p-3 mb-3 ${isTd?"border-accent/40 bg-accent/5":isPast&&dp.some(p=>p.status!=="done")?"border-red-500/20 bg-red-500/5":"border-border bg-card"}`}>
                      <p className={`text-base font-bold ${isTd?"text-accent":""}`}>วัน{thaiDayFull[dow]}ที่ {parseInt(calDayDate.slice(8))} {thaiM[parseInt(calDayDate.slice(5,7))-1]}</p>
                      <p className="text-xs text-muted">{dp.length} กิจกรรม{isTd?" · วันนี้":isPast&&dp.some(p=>p.status!=="done")?" · มีค้างอยู่":""}</p>
                    </div>
                    {dp.length===0 ? (
                      <div className="rounded-xl border border-dashed border-border p-10 text-center">
                        <p className="text-xl mb-1">📅</p><p className="text-sm text-muted">ไม่มีแผนวันนี้</p>
                      </div>
                    ) : <div className="space-y-2">{dp.map(plan => mobileCard(plan))}</div>}
                  </div>
                );
              })()}

              {/* ── Mobile Year View ── */}
              {apView === "year" && (
                <div className="px-3 pt-3 pb-24">
                  {/* Year summary */}
                  <div className="rounded-xl bg-card border border-border p-3 mb-3">
                    <p className="text-sm font-bold mb-1.5">ปี {calY} · {viewPlans.filter(p=>(p.plan_date||"").startsWith(`${calY}-`)).length} กิจกรรม</p>
                    <div className="flex gap-1 flex-wrap">
                      {(Object.entries(TC) as [string, typeof TC[string]][]).map(([type, tc]) => {
                        const cnt = viewPlans.filter(p => (p.plan_date||"").startsWith(`${calY}-`) && p.type === type).length;
                        if (!cnt) return null;
                        return <span key={type} className={`text-[10px] rounded-full px-2 py-0.5 border ${tc.bg} ${tc.border} ${tc.text}`}>{tc.icon} {cnt}</span>;
                      })}
                    </div>
                  </div>
                  {/* 12-month compact grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                      const monthStr  = `${calY}-${String(month).padStart(2,"0")}`;
                      const firstOfM  = new Date(calY, month - 1, 1);
                      const firstDowM = (firstOfM.getDay() + 6) % 7;
                      const daysInM   = new Date(calY, month, 0).getDate();
                      const totalCellsM = Math.ceil((firstDowM + daysInM) / 7) * 7;
                      const monthCells = Array.from({length: totalCellsM}, (_, i) => {
                        const d = new Date(firstOfM.getTime() - firstDowM * 86400000 + i * 86400000);
                        return d.toISOString().slice(0, 10);
                      });
                      const monthPlans = viewPlans.filter(p => (p.plan_date||"").startsWith(monthStr));
                      const isThisMonth = monthStr === today.slice(0,7);
                      const hasPastDue  = monthPlans.some(p => p.status !== "done" && (p.plan_date||"") < today);
                      return (
                        <div key={month} className={`rounded-xl border overflow-hidden ${isThisMonth?"border-accent/60":hasPastDue?"border-red-500/30":"border-border"}`}>
                          <button onClick={() => { setCalNavDate(monthStr); setApView("month"); }}
                            className={`w-full px-3 py-1.5 flex items-center justify-between ${isThisMonth?"bg-accent/10":hasPastDue?"bg-red-500/5":"bg-card"}`}>
                            <span className={`text-[11px] font-bold ${isThisMonth?"text-accent":hasPastDue?"text-red-400":"text-foreground"}`}>{thaiM[month-1]}</span>
                            {monthPlans.length > 0 && <span className={`text-[9px] font-bold rounded-full px-1.5 ${hasPastDue?"bg-red-900/40 text-red-400":"bg-accent/15 text-accent"}`}>{monthPlans.length}</span>}
                          </button>
                          <div className="grid grid-cols-7 gap-px p-1 bg-background/60 border-t border-border">
                            {monthCells.map(dateStr => {
                              const inM    = dateStr.startsWith(monthStr);
                              const isTd   = dateStr === today;
                              const isPast = dateStr < today;
                              const dp     = plansOn(dateStr);
                              const hasOvd = dp.some(p => p.status !== "done") && isPast;
                              const allDone = dp.length > 0 && dp.every(p => p.status === "done");
                              const mainType = dp.find(p => p.status !== "done")?.type || dp[0]?.type;
                              const tc = mainType ? TC[mainType] : null;
                              if (!inM) return <div key={dateStr} />;
                              return (
                                <button key={dateStr} onClick={() => { setCalDayDate(dateStr); setApView("day"); }}
                                  className={`aspect-square flex items-center justify-center rounded text-[8px] font-medium leading-none ${
                                    isTd    ? "bg-accent text-white font-bold" :
                                    hasOvd  ? "bg-red-500/30 text-red-300" :
                                    allDone ? "bg-green-500/15 text-green-400" :
                                    dp.length > 0 && tc ? `${tc.bg} ${tc.text}` :
                                    dp.length > 0 ? "bg-accent/15 text-accent" :
                                    isPast  ? "text-muted/25" : "text-muted/50"
                                  }`}>
                                  {parseInt(dateStr.slice(8))}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Agenda view (month / week / list) ── */}
              {apView !== "day" && apView !== "year" && (() => {
                const ovdList  = allPlans.filter(a => (a.plan_date||"") < today && a.status !== "done").sort((a,b)=>(a.plan_date||"").localeCompare(b.plan_date||""));
                const todayList = viewPlans.filter(a => a.plan_date === today);
                const tomorrow  = new Date(Date.now()+86400000).toISOString().slice(0,10);
                const upMap = new Map<string, SalesActivity[]>();
                viewPlans.filter(a => a.plan_date && a.plan_date > today && a.status !== "done")
                  .sort((a,b) => (a.plan_date||"").localeCompare(b.plan_date||""))
                  .forEach(a => { const d=a.plan_date||""; const l=upMap.get(d)??[]; l.push(a); upMap.set(d,l); });
                const upDates = [...upMap.keys()].slice(0, 10);
                const donePl = viewPlans.filter(a => a.status==="done").sort((a,b)=>(b.plan_date||"").localeCompare(a.plan_date||"")).slice(0,10);
                return (
                  <div className="px-4 pt-3 pb-24 space-y-4">
                    {/* Overdue */}
                    {ovdList.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"/>
                          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wide">⚠ เกินกำหนด ({ovdList.length})</h3>
                        </div>
                        <div className="space-y-1.5">{ovdList.map(p=>mobileCard(p))}</div>
                      </div>
                    )}
                    {/* Today */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0"/>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-wide">📅 วันนี้ · {parseInt(today.slice(8))} {thaiM[new Date().getMonth()]} ({todayList.length})</h3>
                      </div>
                      {todayList.length===0
                        ? <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center"><p className="text-sm text-muted">ไม่มีแผนวันนี้ ✓</p></div>
                        : <div className="space-y-1.5">{todayList.map(p=>mobileCard(p))}</div>}
                    </div>
                    {/* Upcoming by date */}
                    {upDates.map(dateStr => {
                      const list = upMap.get(dateStr)!;
                      const dayI = (new Date(dateStr+"T12:00:00").getDay()+6)%7;
                      const lbl = dateStr===tomorrow ? `พรุ่งนี้ · ${parseInt(dateStr.slice(8))} ${thaiM[parseInt(dateStr.slice(5,7))-1]}` : `${dhNames[dayI]}. ${parseInt(dateStr.slice(8))} ${thaiM[parseInt(dateStr.slice(5,7))-1]}`;
                      return (
                        <div key={dateStr}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-muted/40 shrink-0"/>
                            <h3 className="text-xs font-semibold text-muted">{lbl} ({list.length})</h3>
                          </div>
                          <div className="space-y-1.5">{list.map(p=>mobileCard(p))}</div>
                        </div>
                      );
                    })}
                    {/* Done */}
                    {donePl.length > 0 && (
                      <div>
                        <button onClick={() => setExpandedRepeatRow(expandedRepeatRow==="__done__"?null:"__done__")} className="flex items-center gap-2 mb-2 w-full text-left">
                          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"/>
                          <h3 className="text-xs font-semibold text-muted">✓ เสร็จแล้ว ({donePl.length})</h3>
                          <span className="text-[10px] text-muted ml-auto">{expandedRepeatRow==="__done__"?"▲":"▼"}</span>
                        </button>
                        {expandedRepeatRow==="__done__" && <div className="space-y-1.5">{donePl.map(p=>mobileCard(p))}</div>}
                      </div>
                    )}
                    {allPlans.length===0 && (
                      <div className="rounded-xl border border-dashed border-border p-12 text-center">
                        <p className="text-xl mb-2">📋</p><p className="text-sm text-muted">ยังไม่มีแผนงาน</p>
                        <p className="text-xs text-muted/60 mt-1">กด + เพื่อเพิ่มแผน</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ══ DESKTOP CALENDAR + SIDE PANEL (@lg:flex) ══ */}
            <div className="hidden @lg:flex gap-4">
              {/* ── Calendar main area ── */}
              <div className="flex-1 min-w-0">
                {/* Controls */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={navPrev} className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:text-foreground hover:bg-card-hover transition-colors text-lg leading-none">‹</button>
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-card border border-border min-w-[128px] text-center">{navLabel}</span>
                    <button onClick={navNext} className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:text-foreground hover:bg-card-hover transition-colors text-lg leading-none">›</button>
                    {apView !== "list" && <button onClick={navToday} className="text-[11px] text-accent border border-accent/30 rounded-lg px-2.5 py-1 hover:bg-accent/10 transition-colors">วันนี้</button>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!ownSalesOnly && visibleTeam.length > 1 && (
                      <select value={apPersonFilter} onChange={e => setApPersonFilter(e.target.value)} className="rounded-lg bg-background border border-border px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-accent">
                        <option value="">ทุกคน</option>{visibleTeam.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    )}
                    <div className="flex rounded-lg overflow-hidden border border-border">
                      {(["year","month","week","day","list"] as const).map(v => (
                        <button key={v} onClick={() => setApView(v)} className={`px-2.5 py-1.5 text-[11px] transition-colors ${apView === v ? "bg-accent text-white" : "text-muted hover:bg-card-hover"}`}>
                          {v === "year" ? "🗓 ปี" : v === "month" ? "📅 เดือน" : v === "week" ? "📆 สัปดาห์" : v === "day" ? "☀️ วัน" : "≡ รายการ"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Type filter chips */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  <span className="text-[10px] text-muted/50 font-semibold uppercase tracking-wider shrink-0 mr-0.5">กรอง:</span>
                  <button onClick={() => setTypeFilter("")} className={`rounded-full px-3 py-1 text-[11px] border transition-all font-medium ${!typeFilter ? "bg-foreground/15 border-foreground/30 text-foreground shadow-sm" : "border-border/60 text-muted/70 hover:border-border hover:text-muted"}`}>ทั้งหมด</button>
                  <span className="w-px h-4 bg-border/50 mx-0.5 shrink-0" />
                  {(Object.entries(TC) as [string, typeof TC[string]][]).map(([type, tc]) => {
                    const cnt = allPlans.filter(p => p.type === type).length;
                    return (
                      <button key={type} onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-all ${typeFilter === type ? `${tc.bg} ${tc.border} ${tc.text} font-semibold shadow-sm` : "border-border/60 text-muted/70 hover:border-border hover:text-muted"}`}>
                        {tc.icon} {tc.label}{cnt > 0 && typeFilter !== type && <span className="text-[9px] opacity-60 ml-0.5">{cnt}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* ── Month Calendar ── */}
                {apView === "month" && (
                  <div>
                    <div className="grid grid-cols-7 mb-1">
                      {dhNames.map((d, i) => <div key={d} className={`text-center text-[10px] font-bold py-1.5 tracking-wide ${i >= 5 ? "text-muted/35" : "text-muted/70"}`}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                      {calCells.map(dateStr => {
                        const inM      = dateStr.startsWith(calNavDate);
                        const isTd     = dateStr === today;
                        const isPast   = dateStr < today;
                        const dp       = plansOn(dateStr);
                        const ovdInDay = dp.some(p => p.status !== "done") && isPast && inM;
                        const allDone  = dp.length > 0 && dp.every(p => p.status === "done") && inM;
                        const vis      = dp.slice(0, 3);
                        const more     = dp.length - vis.length;
                        const isSelected = drawerDay === dateStr;
                        return (
                          <div key={dateStr} onClick={() => inM && setDrawerDay(drawerDay === dateStr ? null : dateStr)}
                            className={`min-h-[90px] p-1 cursor-pointer transition-colors ${
                              !inM ? "bg-background/50 opacity-30" :
                              isSelected ? "bg-blue-500/8 ring-2 ring-inset ring-blue-600" :
                              isTd ? "bg-blue-500/5" :
                              ovdInDay ? "bg-red-500/4" :
                              "bg-card hover:bg-card-hover/40"}`}>
                            <div className="flex items-center justify-between mb-1 px-0.5">
                              <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none ${
                                isTd ? "bg-blue-600 text-white text-[10px]" :
                                !inM ? "text-muted/20" :
                                ovdInDay ? "text-red-500" :
                                isPast ? "text-muted/50" :
                                "text-foreground"}`}>{parseInt(dateStr.slice(8))}</span>
                              {ovdInDay && <span className="text-red-600 text-[9px] font-black leading-none">!</span>}
                              {allDone  && <span className="text-green-500 text-[9px] font-bold leading-none">✓</span>}
                              {!ovdInDay && !allDone && dp.length > 1 && inM && <span className="text-[9px] text-muted/60 leading-none">{dp.length}</span>}
                            </div>
                            <div className="space-y-px">
                              {vis.map(p => chip(p))}
                              {more > 0 && <div className="text-[9px] text-blue-500 font-semibold text-center py-0.5 rounded bg-blue-500/8 hover:bg-blue-500/15">+{more}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Week View ── */}
                {apView === "week" && (
                  <div className="overflow-x-auto -mx-1 px-1">
                    <div className="min-w-[480px] grid grid-cols-7 gap-1">
                      {weekDays.map((dateStr, i) => {
                        const isTd  = dateStr === today;
                        const isPast = dateStr < today;
                        const dp    = plansOn(dateStr);
                        const hasOvd = dp.some(p => p.status !== "done" && isPast);
                        return (
                          <div key={dateStr} className={`rounded-xl border flex flex-col shadow-sm ${isTd ? "border-blue-600/40 bg-blue-500/4" : hasOvd ? "border-red-500/30" : "border-border/60 bg-card"}`}>
                            <div className={`px-2 py-2 text-center border-b cursor-pointer hover:bg-card-hover/50 transition-colors ${isTd ? "border-blue-600/30 bg-blue-600/8" : hasOvd ? "border-red-500/20 bg-red-500/4" : "border-border/40"}`}
                              onClick={() => { setCalDayDate(dateStr); setApView("day"); }}>
                              <p className={`text-[10px] font-bold uppercase tracking-wide ${isTd ? "text-blue-600" : hasOvd ? "text-red-500" : "text-muted/70"}`}>{dhNames[i]}</p>
                              <p className={`text-xl font-bold leading-tight ${isTd ? "text-blue-600" : isPast ? "text-muted/50" : "text-foreground"}`}>{parseInt(dateStr.slice(8))}</p>
                              {dp.length > 0 && <span className={`text-[9px] rounded px-1.5 py-0.5 font-bold inline-block mt-0.5 border ${hasOvd ? "bg-red-500/10 border-red-500/25 text-red-500" : isTd ? "bg-blue-500/10 border-blue-500/25 text-blue-600" : "bg-card-hover border-border text-muted"}`}>{dp.length}</span>}
                            </div>
                            <div className="p-1 flex-1 space-y-0.5 min-h-[100px]">
                              {dp.map(p => planCard(p))}
                              <button onClick={() => { resetActForm(); setActForm(f => ({...f, is_plan: true, plan_date: dateStr})); setShowPlanForm(true); window.scrollTo({top:0,behavior:"smooth"}); }}
                                className="w-full text-center text-[10px] text-muted/25 hover:text-blue-500 transition-colors py-1 rounded hover:bg-blue-500/5">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Day View ── */}
                {apView === "day" && (() => {
                  const dp    = plansOn(calDayDate);
                  const isTd  = calDayDate === today;
                  const isPast = calDayDate < today;
                  const dow   = new Date(calDayDate + "T12:00:00").getDay();
                  return (
                    <div>
                      <div className={`rounded-xl border p-4 mb-4 flex items-center justify-between gap-3 bg-card ${isTd ? "border-blue-600/30" : isPast && dp.some(p => p.status !== "done") ? "border-red-500/30" : "border-border"}`}>
                        <div>
                          <p className={`text-lg font-bold ${isTd ? "text-blue-600" : ""}`}>
                            {isTd && <span className="text-xs font-semibold bg-blue-600 text-white rounded px-1.5 py-0.5 mr-2">วันนี้</span>}
                            วัน{thaiDayFull[dow]}{isTd ? "" : `ที่ ${parseInt(calDayDate.slice(8))} ${thaiM[parseInt(calDayDate.slice(5,7))-1]} ${parseInt(calDayDate.slice(0,4))+543}`}
                          </p>
                          <p className="text-xs text-muted mt-0.5">{dp.length} กิจกรรม{isPast && dp.some(p => p.status !== "done") ? <span className="text-red-500 ml-1 font-medium">· มีค้างอยู่</span> : ""}</p>
                        </div>
                        <button onClick={() => { resetActForm(); setActForm(f => ({...f, is_plan: true, plan_date: calDayDate})); setShowPlanForm(true); window.scrollTo({top:0,behavior:"smooth"}); }}
                          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover shrink-0">+ วางแผน</button>
                      </div>
                      {dp.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-card/50">
                          <p className="text-2xl mb-2">📅</p>
                          <p className="text-sm text-muted">ไม่มีแผนวันนี้</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dp.map(plan => {
                            const tc = TC[plan.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
                            const ovd = (plan.plan_date || "") < today && plan.status !== "done";
                            const done = plan.status === "done";
                            const linkedDeal = plan.converted_to_project_id ? projects.find(p => p.id === plan.converted_to_project_id) : null;
                            return (
                              <div key={plan.id} onClick={() => setSelectedActivity(plan)}
                                className={`rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md flex overflow-hidden ${
                                  done ? "border-border/40 opacity-60" :
                                  ovd  ? "border-red-500/40 hover:border-red-500/60" :
                                  "border-border/60 hover:border-border"}`}>
                                <div className={`w-1.5 shrink-0 ${ovd ? "bg-red-600" : done ? "bg-green-500 opacity-50" : tc.bar}`} />
                                <div className="flex-1 p-4 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base shrink-0">{tc.icon}</span>
                                      <div>
                                        <p className={`text-sm font-semibold leading-snug ${done ? "line-through text-muted" : ovd ? "text-red-500" : "text-foreground"}`}>{plan.expected_outcome || plan.description || "—"}</p>
                                        {plan.customer_name && <p className="text-xs text-muted mt-0.5">🏢 {plan.customer_name}</p>}
                                      </div>
                                    </div>
                                    <span className={`text-[10px] rounded px-2 py-0.5 font-semibold shrink-0 border ${done?"bg-green-500/10 border-green-500/25 text-green-500":plan.status==="in_progress"?"bg-amber-500/10 border-amber-500/25 text-amber-500":ovd?"bg-red-500/10 border-red-500/25 text-red-500":"bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>
                                      {done ? "✓ เสร็จ" : plan.status === "in_progress" ? "ทำอยู่" : ovd ? "⚠ เกิน" : "รอ"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[11px] rounded px-2 py-0.5 border font-semibold ${tc.bg} ${tc.border} ${tc.text}`}>{tc.icon} {tc.label}</span>
                                    {plan.assigned_to && !ownSalesOnly && <span className="text-[11px] text-muted">👤 {plan.assigned_to.split(" ")[0]}</span>}
                                    {linkedDeal && <Link href="/projects" onClick={e => e.stopPropagation()} className="text-[11px] text-accent hover:underline">🎯 {linkedDeal.name}</Link>}
                                  </div>
                                  <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                    {!done && <button onClick={() => updateActivity(plan.id!, {status:"done"})} className="text-[10px] text-green-500 border border-green-500/30 rounded px-2 py-0.5 hover:bg-green-500/10">✓ เสร็จ</button>}
                                    {plan.status !== "in_progress" && !done && <button onClick={() => updateActivity(plan.id!, {status:"in_progress"})} className="text-[10px] text-amber-500 border border-amber-500/30 rounded px-2 py-0.5 hover:bg-amber-500/10">▷ เริ่ม</button>}
                                    <button onClick={() => deleteActivity(plan.id!)} className="text-[10px] text-muted border border-border rounded px-2 py-0.5 hover:bg-red-500/10 hover:text-red-500">ลบ</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Year View ── */}
                {apView === "year" && (() => {
                  const yearPlans = viewPlans.filter(p => (p.plan_date||"").startsWith(`${calY}-`));
                  const totalByType = Object.fromEntries(Object.keys(TC).map(t => [t, yearPlans.filter(p => p.type === t).length]));
                  return (
                    <div>
                      {/* Year summary bar */}
                      <div className="rounded-xl bg-card border border-border p-3 mb-4 flex items-center flex-wrap gap-3">
                        <span className="text-sm font-bold text-foreground">{yearPlans.length} กิจกรรม ปี {calY}</span>
                        <div className="flex gap-1.5 flex-wrap flex-1">
                          {(Object.entries(TC) as [string, typeof TC[string]][]).map(([type, tc]) => {
                            const cnt = totalByType[type] || 0;
                            if (!cnt) return null;
                            return <span key={type} className={`text-[10px] rounded-full px-2 py-0.5 border ${tc.bg} ${tc.border} ${tc.text}`}>{tc.icon} {tc.label} {cnt}</span>;
                          })}
                        </div>
                        {yearPlans.filter(p => p.status !== "done" && (p.plan_date||"") < today).length > 0 && (
                          <span className="text-[11px] text-red-400 font-medium">⚠ เกิน {yearPlans.filter(p => p.status !== "done" && (p.plan_date||"") < today).length}</span>
                        )}
                      </div>
                      {/* 12-month grid */}
                      <div className="grid grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4 gap-3">
                        {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                          const monthStr   = `${calY}-${String(month).padStart(2,"0")}`;
                          const firstOfM   = new Date(calY, month - 1, 1);
                          const firstDowM  = (firstOfM.getDay() + 6) % 7;
                          const daysInM    = new Date(calY, month, 0).getDate();
                          const totalCellsM = Math.ceil((firstDowM + daysInM) / 7) * 7;
                          const monthCells = Array.from({length: totalCellsM}, (_, i) => {
                            const d = new Date(firstOfM.getTime() - firstDowM * 86400000 + i * 86400000);
                            return d.toISOString().slice(0, 10);
                          });
                          const monthPlans = viewPlans.filter(p => (p.plan_date||"").startsWith(monthStr));
                          const isThisMonth = monthStr === today.slice(0,7);
                          const hasPastDue  = monthPlans.some(p => p.status !== "done" && (p.plan_date||"") < today);
                          return (
                            <div key={month} className={`rounded-xl border overflow-hidden ${isThisMonth ? "border-accent/60 shadow-sm shadow-accent/10" : hasPastDue ? "border-red-500/30" : "border-border"}`}>
                              {/* Month header */}
                              <button onClick={() => { setCalNavDate(monthStr); setApView("month"); }}
                                className={`w-full px-3 py-2 flex items-center justify-between transition-colors hover:bg-card-hover ${isThisMonth ? "bg-accent/10" : hasPastDue ? "bg-red-500/5" : "bg-card"}`}>
                                <span className={`text-[12px] font-bold ${isThisMonth ? "text-accent" : hasPastDue ? "text-red-400" : "text-foreground"}`}>{thaiM[month-1]}</span>
                                {monthPlans.length > 0 && (
                                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${hasPastDue ? "bg-red-900/40 text-red-400" : "bg-accent/15 text-accent"}`}>{monthPlans.length}</span>
                                )}
                              </button>
                              {/* Day column headers */}
                              <div className="grid grid-cols-7 border-t border-border bg-background/60">
                                {dhNames.map(d => <div key={d} className="text-center text-[7px] text-muted/50 py-0.5">{d.replace(".","")} </div>)}
                              </div>
                              {/* Day cells */}
                              <div className="grid grid-cols-7 gap-px p-1 bg-background/60">
                                {monthCells.map(dateStr => {
                                  const inM     = dateStr.startsWith(monthStr);
                                  const isTd    = dateStr === today;
                                  const isPast  = dateStr < today;
                                  const dp      = plansOn(dateStr);
                                  const hasOvd  = dp.some(p => p.status !== "done") && isPast;
                                  const allDone = dp.length > 0 && dp.every(p => p.status === "done");
                                  const mainType = dp.find(p => p.status !== "done")?.type || dp[0]?.type;
                                  const tc = mainType ? TC[mainType] : null;
                                  if (!inM) return <div key={dateStr} />;
                                  return (
                                    <button key={dateStr} onClick={() => { setCalDayDate(dateStr); setApView("day"); }}
                                      className={`aspect-square flex items-center justify-center rounded text-[9px] font-medium leading-none transition-all hover:ring-1 ring-inset ring-accent/40 ${
                                        isTd    ? "bg-accent text-white font-bold" :
                                        hasOvd  ? "bg-red-500/30 text-red-300" :
                                        allDone ? "bg-green-500/15 text-green-400" :
                                        dp.length > 0 && tc ? `${tc.bg} ${tc.text}` :
                                        dp.length > 0 ? "bg-accent/15 text-accent" :
                                        isPast ? "text-muted/30 hover:bg-card-hover" :
                                        "text-muted/60 hover:bg-card-hover"
                                      }`}>
                                      {parseInt(dateStr.slice(8))}
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Mini type bar */}
                              {monthPlans.length > 0 && (
                                <div className="flex gap-0.5 flex-wrap px-1.5 pb-1.5 pt-0.5 border-t border-border/30 bg-background/40">
                                  {(Object.entries(TC) as [string, typeof TC[string]][]).map(([type, tc]) => {
                                    const cnt = monthPlans.filter(p => p.type === type).length;
                                    if (!cnt) return null;
                                    return <span key={type} title={`${tc.label}: ${cnt}`} className={`text-[8px] rounded px-1 py-0.5 ${tc.bg} ${tc.text}`}>{tc.icon}{cnt}</span>;
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── List View ── */}
                {apView === "list" && (() => {
                  const ovdPl  = allPlans.filter(p => (p.plan_date||"") < today && p.status !== "done").sort((a,b) => (a.plan_date||"").localeCompare(b.plan_date||""));
                  const upPl   = allPlans.filter(p => (p.plan_date||"") >= today && p.status !== "done").sort((a,b) => (a.plan_date||"").localeCompare(b.plan_date||""));
                  const donePl = allPlans.filter(p => p.status === "done").sort((a,b) => (b.plan_date||"").localeCompare(a.plan_date||"")).slice(0, 20);
                  function ListCard({ plan }: { plan: SalesActivity }) {
                    const tc = TC[plan.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
                    const ovd = (plan.plan_date||"") < today && plan.status !== "done";
                    const done = plan.status === "done";
                    const linkedDeal = plan.converted_to_project_id ? projects.find(p => p.id === plan.converted_to_project_id) : null;
                    return (
                      <div onClick={() => setSelectedActivity(plan)}
                        className={`rounded-xl border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-all flex ${done ? "opacity-55" : ovd ? "border-red-500/40" : plan.plan_date===today ? "border-blue-500/40" : "border-border/60 hover:border-border"}`}>
                        <div className={`w-1.5 shrink-0 ${done ? "bg-green-500 opacity-50" : ovd ? "bg-red-600" : plan.plan_date===today ? "bg-blue-600" : tc.bar}`} />
                        <div className="flex-1 p-3.5 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold leading-snug ${done ? "line-through text-muted" : ovd ? "text-red-500" : "text-foreground"}`}>{plan.expected_outcome || plan.description || "—"}</p>
                            <span className={`text-[10px] rounded px-2 py-0.5 font-semibold shrink-0 border ${done?"bg-green-500/10 border-green-500/25 text-green-500":plan.status==="in_progress"?"bg-amber-500/10 border-amber-500/25 text-amber-500":ovd?"bg-red-500/10 border-red-500/25 text-red-500":"bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>
                              {done?"✓ เสร็จ":plan.status==="in_progress"?"ทำอยู่":ovd?"⚠ เกิน":"รอ"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] rounded px-1.5 py-0.5 border font-semibold ${tc.bg} ${tc.border} ${tc.text}`}>{tc.icon} {tc.label}</span>
                            {plan.customer_name && <span className="text-[11px] text-muted">{plan.customer_type==="prospect"?"🔍":"🏢"} {plan.customer_name}</span>}
                            {plan.plan_date && <span className={`text-[11px] font-medium ${ovd?"text-red-500":plan.plan_date===today?"text-blue-500":"text-muted"}`}>📅 {plan.plan_date}{ovd?" ⚠":plan.plan_date===today?" · วันนี้":""}</span>}
                            {plan.assigned_to && !ownSalesOnly && <span className="text-[11px] text-muted">👤 {plan.assigned_to.split(" ")[0]}</span>}
                          </div>
                          {linkedDeal && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] text-muted">→ ดีล:</span>
                              <Link href="/projects" onClick={e=>e.stopPropagation()} className="text-[11px] text-accent hover:underline">{linkedDeal.name}</Link>
                              <span className={`text-[9px] rounded px-1.5 py-0.5 font-medium ${stageColor[linkedDeal.status]||""}`}>{linkedDeal.status}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-5">
                      {ovdPl.length > 0 && (<div><div className="flex items-center gap-2 mb-2.5"><span className="w-2 h-2 rounded-full bg-red-500"/><h3 className="text-sm font-semibold text-red-400">เกินกำหนด ({ovdPl.length})</h3></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{ovdPl.map(p => <ListCard key={p.id} plan={p}/>)}</div></div>)}
                      {upPl.length > 0 ? (<div><div className="flex items-center gap-2 mb-2.5"><span className="w-2 h-2 rounded-full bg-accent"/><h3 className="text-sm font-semibold">วันนี้และกำลังจะมาถึง ({upPl.length})</h3></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{upPl.map(p => <ListCard key={p.id} plan={p}/>)}</div></div>) : (<div className="rounded-xl border border-dashed border-border p-8 text-center"><p className="text-sm text-muted">ไม่มีแผนงาน — กด &quot;+ วางแผน&quot; เพื่อเริ่มต้น</p></div>)}
                      {donePl.length > 0 && (<div><button onClick={()=>setExpandedRepeatRow(expandedRepeatRow==="__done__"?null:"__done__")} className="flex items-center gap-2 mb-2 text-sm text-muted hover:text-foreground"><span className="w-2 h-2 rounded-full bg-green-500"/><span className="font-semibold">เสร็จแล้ว ({donePl.length})</span><span className="text-xs">{expandedRepeatRow==="__done__"?"▲":"▼"}</span></button>{expandedRepeatRow==="__done__"&&<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{donePl.map(p=><ListCard key={p.id} plan={p}/>)}</div>}</div>)}
                      {allPlans.length === 0 && (<div className="rounded-xl border border-dashed border-border p-10 text-center"><p className="text-base text-muted">ยังไม่มีแผนงาน</p><p className="text-xs text-muted/60 mt-1">กด &quot;+ วางแผน&quot; เพื่อเพิ่มแผน</p></div>)}
                    </div>
                  );
                })()}
              </div>

              {/* ── Right Side Panel ── */}
              <div className="hidden xl:flex flex-col gap-3 w-44 shrink-0">
                {/* Mini KPI */}
                <div className="rounded-xl bg-card border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">ภาพรวม</p>
                    <span className="text-xs font-bold">{allPlans.length} แผน</span>
                  </div>
                  {allPlans.length > 0 && <div className="h-1.5 rounded-full bg-background overflow-hidden mb-2.5"><div className="h-full rounded-full bg-green-500 transition-all" style={{width:`${Math.round(kpiDone/allPlans.length*100)}%`}}/></div>}
                  {[{label:"✓ เสร็จ",v:kpiDone,c:"text-green-500"},{label:"▷ ทำอยู่",v:kpiIP,c:"text-amber-500"},{label:"○ รอ",v:kpiNew,c:"text-blue-500"},{label:"⚠ เกิน",v:overdueItems.length,c:overdueItems.length>0?"text-red-500 font-black":"text-muted"}].map(s=>(
                    <div key={s.label} className="flex items-center justify-between text-[11px] py-0.5"><span className="text-muted">{s.label}</span><span className={`font-bold tabular-nums ${s.c}`}>{s.v}</span></div>
                  ))}
                </div>

                {/* Today */}
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"/><p className="text-[11px] font-semibold">วันนี้</p></div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">{todayItems.length}</span>
                  </div>
                  <div className="p-1.5 space-y-0.5 max-h-52 overflow-y-auto">
                    {todayItems.length === 0
                      ? <p className="text-[11px] text-muted text-center py-2.5">ไม่มีแผนวันนี้ ✓</p>
                      : todayItems.map(p => {
                          const tc = TC[p.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
                          return (
                            <button key={p.id} onClick={() => setSelectedActivity(p)}
                              className="w-full flex items-stretch text-left rounded overflow-hidden border border-border/50 bg-card hover:bg-card-hover transition-all">
                              <div className={`w-[3px] shrink-0 ${tc.bar}`} />
                              <div className="flex-1 px-2 py-1 min-w-0">
                                <p className={`text-[11px] truncate font-semibold ${tc.text}`}>{p.expected_outcome || p.customer_name || "—"}</p>
                              </div>
                            </button>
                          );
                        })}
                  </div>
                </div>

                {/* Overdue */}
                {overdueItems.length > 0 && (
                  <div className="rounded-xl bg-card border border-red-500/30 overflow-hidden">
                    <div className="px-3 py-2 border-b border-red-500/20 flex items-center justify-between bg-red-500/5">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600"/><p className="text-[11px] font-semibold text-red-500">เกินกำหนด</p></div>
                      <span className="text-[10px] text-red-600 font-black bg-red-500/10 border border-red-500/25 rounded px-1.5 py-0.5">{overdueItems.length}</span>
                    </div>
                    <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                      {overdueItems.slice(0, 8).map(p => (
                        <button key={p.id} onClick={() => setSelectedActivity(p)}
                          className="w-full flex items-stretch text-left rounded overflow-hidden border border-red-500/25 bg-card hover:bg-red-500/5 transition-all">
                          <div className="w-[3px] shrink-0 bg-red-600" />
                          <div className="flex-1 px-2 py-1 min-w-0">
                            <p className="text-[11px] truncate font-semibold text-red-500">⚠ {p.expected_outcome || p.customer_name || "—"}</p>
                            <p className="text-[9px] text-muted mt-0.5 truncate">{p.plan_date}{p.customer_name ? ` · ${p.customer_name}` : ""}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity type legend + filter */}
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">ประเภท</p>
                  <div className="space-y-px">
                    {(Object.entries(TC) as [string, typeof TC[string]][]).map(([type, tc]) => {
                      const cnt = allPlans.filter(p => p.type === type).length;
                      const isActive = typeFilter === type;
                      return (
                        <button key={type} onClick={() => setTypeFilter(isActive ? "" : type)}
                          className={`w-full flex items-center gap-2 rounded px-2 py-1 transition-all text-left ${isActive ? `${tc.bg} border ${tc.border}` : "hover:bg-card-hover"}`}>
                          <span className={`w-2 h-2 rounded-sm shrink-0 ${tc.dot}`}/><span className={`text-[11px] flex-1 ${isActive ? tc.text : "text-muted"}`}>{tc.label}</span>
                          {cnt > 0 && <span className={`text-[10px] font-bold tabular-nums ${isActive ? tc.text : "text-muted/60"}`}>{cnt}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Repeat report */}
            <div className="mt-4 rounded-xl bg-card border border-border overflow-hidden">
              <button onClick={() => setShowRepeatReport(!showRepeatReport)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-card-hover transition-colors">
                <div className="flex items-center gap-2"><span className="text-sm font-semibold">📊 สถิติการวางแผนซ้ำ</span><span className="text-[10px] text-muted">ดูว่าลูกค้าแต่ละรายถูกวางแผนกี่ครั้ง</span></div>
                <span className="text-muted text-xs">{showRepeatReport ? "▲" : "▼"}</span>
              </button>
              {showRepeatReport && (() => {
                const allPlansStat = activities.filter(a => a.is_plan);
                type RepeatRow = { name: string; customerId: string; total: number; done: number; lastDate: string; persons: Set<string>; types: string[]; items: SalesActivity[] };
                const custMap = new Map<string, RepeatRow>();
                allPlansStat.forEach(p => {
                  const key = p.customer_name || "(ยังไม่ระบุลูกค้า)";
                  const ex = custMap.get(key) ?? { name: key, customerId: p.customer_id || "", total: 0, done: 0, lastDate: "", persons: new Set<string>(), types: [], items: [] };
                  if (!ex.customerId && p.customer_id) ex.customerId = p.customer_id;
                  ex.total++; if (p.status === "done") ex.done++;
                  if ((p.plan_date || "") > ex.lastDate) ex.lastDate = p.plan_date || "";
                  if (p.assigned_to) ex.persons.add(p.assigned_to);
                  if (p.expected_outcome || p.description) ex.types.push(p.expected_outcome || p.description || "");
                  ex.items.push(p); custMap.set(key, ex);
                });
                const rows = [...custMap.values()].sort((a, b) => b.total - a.total);
                return (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-left text-[10px] text-muted uppercase bg-background/50">
                        <th className="px-4 py-2">ลูกค้า / Prospect</th><th className="px-4 py-2 text-center">ทั้งหมด</th><th className="px-4 py-2 text-center">วางแผนซ้ำ</th><th className="px-4 py-2 text-center">✓ เสร็จ</th><th className="px-4 py-2 hidden md:table-cell">กิจกรรมล่าสุด</th><th className="px-4 py-2 hidden md:table-cell">เซลล์</th><th className="px-4 py-2">วันล่าสุด</th>
                      </tr></thead>
                      <tbody>
                        {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted italic">ยังไม่มีข้อมูลแผนงาน</td></tr>}
                        {rows.map(r => {
                          const repeat = Math.max(0, r.total - 1);
                          const isExpanded = expandedRepeatRow === r.name;
                          const sortedItems = [...r.items].sort((a, b) => (a.plan_date||"").localeCompare(b.plan_date||""));
                          return (<>
                            <tr key={r.name} onClick={() => setExpandedRepeatRow(isExpanded ? null : r.name)} className="border-b border-border/50 last:border-0 hover:bg-card-hover transition-colors cursor-pointer select-none">
                              <td className="px-4 py-2.5 font-medium"><span className="mr-1.5 text-muted text-[10px]">{isExpanded?"▼":"▶"}</span>{r.customerId?<Link href={`/customers/${r.customerId}`} onClick={e=>e.stopPropagation()} className="text-accent hover:underline">{r.name}</Link>:r.name}</td>
                              <td className="px-4 py-2.5 text-center"><span className={`rounded-full px-2 py-0.5 font-bold text-[11px] ${r.total>=5?"bg-red-900/50 text-red-400":r.total>=3?"bg-orange-900/50 text-orange-400":r.total>=2?"bg-yellow-900/50 text-yellow-400":"bg-blue-900/50 text-blue-400"}`}>{r.total}</span></td>
                              <td className="px-4 py-2.5 text-center">{repeat>0?<span className="text-orange-400 font-semibold">+{repeat} ครั้ง</span>:<span className="text-muted">—</span>}</td>
                              <td className="px-4 py-2.5 text-center text-green-400 font-semibold">{r.done}</td>
                              <td className="px-4 py-2.5 text-muted hidden md:table-cell truncate max-w-[180px]">{r.types[r.types.length-1]||"—"}</td>
                              <td className="px-4 py-2.5 text-muted hidden md:table-cell">{[...r.persons].join(", ")||"—"}</td>
                              <td className="px-4 py-2.5 text-muted">{r.lastDate||"—"}</td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${r.name}-detail`} className="bg-background/40">
                                <td colSpan={7} className="px-4 py-2">
                                  <div className="space-y-1">
                                    {sortedItems.map((item, i) => (
                                      <div key={item.id ?? i} className={`flex items-start gap-3 py-1.5 px-2 rounded-lg text-[11px] ${item.status==="done"?"opacity-60":""}`}>
                                        <span className="text-muted w-4 shrink-0">{i+1}.</span>
                                        <span className="text-muted w-20 shrink-0">{item.plan_date||"—"}</span>
                                        <span className="bg-card border border-border rounded px-1.5 py-0.5 shrink-0">{typeLabels[item.type]||item.type}</span>
                                        <span className="text-accent shrink-0">{item.assigned_to||"—"}</span>
                                        <span className="text-foreground flex-1 truncate">{item.expected_outcome||item.description||"—"}</span>
                                        <span className={`shrink-0 ${item.status==="done"?"text-green-400":(item.status as string)==="cancelled"?"text-red-400":"text-yellow-400"}`}>{item.status==="done"?"✓ เสร็จ":(item.status as string)==="cancelled"?"ยกเลิก":"รอดำเนิน"}</span>
                                        {item.customer_id && <Link href={`/customers/${item.customer_id}`} onClick={e=>e.stopPropagation()} className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-accent hover:border-accent transition-colors" title={`ข้อมูลลูกค้า: ${item.customer_name}`}>🏢 ลูกค้า</Link>}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>);
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
                {canManageQuota(currentUser) && <button onClick={() => setShowQuotaForm(!showQuotaForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showQuotaForm ? "Cancel" : "+ ตั้งเป้า"}</button>}
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
        {showQuotaForm && canManageQuota(currentUser) && (
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

                    {/* Actions — only for managers/admin */}
                    {canManageQuota(currentUser) && (
                      <div className="flex flex-col gap-1.5 px-4 shrink-0">
                        <button onClick={() => { setQuotaForm({ user_name: q.user_name, role: q.role || "sale", month: q.month || currentMonth, quota_target: q.quota_target, actual_sales: q.actual_sales, profit_target: q.profit_target || 0, actual_profit: q.actual_profit || 0, target_gp_percent: q.target_gp_percent || 0, won_deals: q.won_deals || 0, total_activities: q.total_activities || 0 }); setShowQuotaForm(true); }} title="แก้ไข" className="text-[10px] bg-accent/10 text-accent rounded-lg px-3 py-1.5 hover:bg-accent/20">✏️ แก้ไข</button>
                        <button onClick={async () => { if (!confirm(`ลบเป้า ${q.user_name}?`)) return; const { salesQuotas } = await import("@/lib/firestore"); await salesQuotas.remove(q.id!); await load(); }} title="ลบ" className="text-[10px] text-danger/70 rounded-lg px-3 py-1.5 hover:bg-red-900/20">🗑 ลบ</button>
                      </div>
                    )}
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

      {/* ═══ DAY DETAIL DRAWER ═══ */}
      {drawerDay && tab === "workplan" && (() => {
        const thaiDayFullG = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
        const thaiMG = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
        const TCG: Record<string, {bg:string;border:string;text:string;dot:string;bar:string;label:string;icon:string}> = {
          phone_call:        {bg:"bg-blue-500/10",    border:"border-blue-500/25",    text:"text-blue-500",    dot:"bg-blue-600",    bar:"bg-blue-600",    label:"โทร",       icon:"📞"},
          visit:             {bg:"bg-orange-500/10",  border:"border-orange-500/25",  text:"text-orange-500",  dot:"bg-orange-500",  bar:"bg-orange-500",  label:"เยี่ยม",    icon:"🤝"},
          meeting:           {bg:"bg-purple-500/10",  border:"border-purple-500/25",  text:"text-purple-500",  dot:"bg-purple-600",  bar:"bg-purple-600",  label:"ประชุม",    icon:"💬"},
          follow_up:         {bg:"bg-cyan-500/10",    border:"border-cyan-500/25",    text:"text-cyan-500",    dot:"bg-cyan-600",    bar:"bg-cyan-600",    label:"Follow-up", icon:"🔄"},
          quotation_created: {bg:"bg-green-500/10",   border:"border-green-500/25",   text:"text-green-500",   dot:"bg-green-600",   bar:"bg-green-600",   label:"สร้าง QT",  icon:"📄"},
          quotation_sent:    {bg:"bg-teal-500/10",    border:"border-teal-500/25",    text:"text-teal-500",    dot:"bg-teal-600",    bar:"bg-teal-600",    label:"ส่ง QT",    icon:"✉️"},
          customer_update:   {bg:"bg-indigo-500/10",  border:"border-indigo-500/25",  text:"text-indigo-500",  dot:"bg-indigo-600",  bar:"bg-indigo-600",  label:"Update",    icon:"📊"},
        };
        const allPlansG = activities.filter(a => a.is_plan && (!apPersonFilter || a.assigned_to === apPersonFilter) && (!ownSalesOnly || !a.assigned_to || isOwnRecord(a, currentUser)));
        const dp = (typeFilter ? allPlansG.filter(a => a.type === typeFilter) : allPlansG).filter(a => a.plan_date === drawerDay);
        const isTd = drawerDay === today;
        const isPast = drawerDay < today;
        const dow = new Date(drawerDay + "T12:00:00").getDay();
        const overdueInDay = dp.filter(p => p.status !== "done" && isPast);
        const doneInDay = dp.filter(p => p.status === "done");
        const activeInDay = dp.filter(p => p.status !== "done" && !isPast);
        return (
          <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawerDay(null)}>
            <div className="w-full max-w-xs lg:max-w-sm bg-card border-l border-border shadow-2xl h-full overflow-y-auto flex flex-col"
                 style={{animation:"slideInRight 0.2s ease-out"}} onClick={e => e.stopPropagation()}>
              {/* Drawer header */}
              <div className={`px-4 py-3 border-b shrink-0 ${isTd ? "border-accent/30 bg-accent/8" : isPast && overdueInDay.length > 0 ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-bold leading-tight ${isTd ? "text-accent" : ""}`}>
                      {isTd && <span className="text-[10px] rounded-full bg-accent text-white px-2 py-0.5 mr-1.5 font-semibold">วันนี้</span>}
                      วัน{thaiDayFullG[dow]}{isTd ? "" : `ที่ ${parseInt(drawerDay.slice(8))} ${thaiMG[parseInt(drawerDay.slice(5,7))-1]}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {overdueInDay.length > 0 && <span className="text-[10px] text-red-300 font-semibold">⚠ เกิน {overdueInDay.length}</span>}
                      {activeInDay.length > 0 && <span className="text-[10px] text-accent">{activeInDay.length} กำลังจะมา</span>}
                      {doneInDay.length > 0 && <span className="text-[10px] text-emerald-400">✓ {doneInDay.length} เสร็จ</span>}
                      {dp.length === 0 && <span className="text-[10px] text-muted">ไม่มีแผน</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setDrawerDay(null); const form = { type: "phone_call" as SalesActivity["type"], customer_id: "", customer_name: "", customer_type: "existing" as "existing"|"prospect", project_id: "", project_name: "", assigned_to: currentUser?.name || "", contact_person: "", description: "", status: "new" as SalesActivity["status"], next_follow_up: "", result: "" as SalesActivity["result"], next_action: "", next_action_type: "", next_action_by: currentUser?.name || "", next_action_date: "", is_plan: true, plan_date: drawerDay, expected_outcome: "", reminder_date: "", request_support: false, support_team: "presale" as "presale"|"service", support_note: "", objective: "", outcome: "", plan_status: "planned" as "planned"|"in_progress"|"completed"|"rescheduled", rescheduled_to: "", auto_followup: false }; setActForm(form); setShowPlanForm(true); window.scrollTo({top:0,behavior:"smooth"}); }}
                      className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-hover">+ เพิ่ม</button>
                    <button onClick={() => setDrawerDay(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-card-hover text-lg">✕</button>
                  </div>
                </div>
              </div>
              {/* Drawer content */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {dp.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-sm text-muted">ยังไม่มีแผนวันนี้</p>
                    <p className="text-[11px] text-muted/60 mt-1">กด &quot;+ เพิ่ม&quot; เพื่อเพิ่มแผน</p>
                  </div>
                ) : dp.map(plan => {
                  const tc = TCG[plan.type] ?? {bg:"bg-card",border:"border-border",text:"text-muted",dot:"bg-muted",bar:"bg-muted",label:"",icon:"📌"};
                  const ovd = isPast && plan.status !== "done";
                  const done = plan.status === "done";
                  const linkedDeal = plan.converted_to_project_id ? projects.find(p => p.id === plan.converted_to_project_id) : null;
                  return (
                    <div key={plan.id} onClick={() => setSelectedActivity(plan)}
                      className={`rounded-xl border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                        done ? "border-border/30 opacity-55" :
                        ovd  ? "border-red-500/40 hover:border-red-500/60" :
                        "border-border/60 hover:border-border"}`}>
                      <div className="flex items-stretch">
                        <div className={`w-1.5 shrink-0 ${ovd ? "bg-red-600" : done ? "bg-green-500 opacity-50" : tc.bar}`} />
                        <div className="flex-1 px-3 py-2.5 min-w-0">
                          {/* Type badge + status */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`text-[10px] rounded px-1.5 py-0.5 border font-semibold ${tc.bg} ${tc.border} ${tc.text}`}>
                              {tc.icon} {tc.label}
                            </span>
                            <span className={`text-[10px] rounded px-1.5 py-0.5 font-semibold border ${
                              done ? "bg-green-500/10 border-green-500/25 text-green-500" :
                              plan.status === "in_progress" ? "bg-amber-500/10 border-amber-500/25 text-amber-500" :
                              ovd ? "bg-red-500/10 border-red-500/25 text-red-500" : "bg-blue-500/10 border-blue-500/25 text-blue-500"}`}>
                              {done ? "✓ เสร็จ" : plan.status === "in_progress" ? "ทำอยู่" : ovd ? "⚠ เกิน" : "รอ"}
                            </span>
                          </div>
                          {/* Description */}
                          <p className={`text-sm font-semibold leading-tight ${done ? "line-through text-muted" : ovd ? "text-red-500" : "text-foreground"}`}>
                            {plan.expected_outcome || plan.description || "—"}
                          </p>
                          {/* Meta */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {plan.customer_name && <span className="text-[11px] text-muted">🏢 {plan.customer_name}</span>}
                            {plan.assigned_to && !ownSalesOnly && <span className="text-[11px] text-muted">👤 {plan.assigned_to.split(" ")[0]}</span>}
                            {linkedDeal && <span className="text-[11px] text-accent">🎯 {linkedDeal.name.slice(0, 16)}</span>}
                          </div>
                        </div>
                        {/* Quick actions */}
                        <div className="flex flex-col items-center justify-center gap-1 px-2 border-l border-border/20 shrink-0" onClick={e => e.stopPropagation()}>
                          {!done && (
                            <button onClick={() => { updateActivity(plan.id!, {status:"done"}); }}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500/15 text-green-500 text-xs hover:bg-green-500/25 transition-colors font-bold" title="เสร็จ">✓</button>
                          )}
                          {!done && plan.status !== "in_progress" && (
                            <button onClick={() => updateActivity(plan.id!, {status:"in_progress"})}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-500 text-xs hover:bg-amber-500/25 transition-colors font-bold" title="เริ่มทำ">▷</button>
                          )}
                          <button onClick={() => setSelectedActivity(plan)}
                            className="w-7 h-7 flex items-center justify-center text-muted/40 hover:text-muted text-xl">›</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ ACTIVITY DETAIL MODAL ═══ */}
      {selectedActivity && (() => {
        const a = selectedActivity;
        const isPlan = a.is_plan;
        const ps = (a.plan_status as string) || (a.status === "done" ? "completed" : a.status === "in_progress" ? "in_progress" : "planned");
        const isOverdue = ((a.next_follow_up && a.next_follow_up < today) || (a.plan_date && a.plan_date < today && a.next_action_date && a.next_action_date < today)) && a.status !== "done";
        const psLabel: Record<string, string> = { planned:"วางแผน", in_progress:"กำลังทำ", completed:"เสร็จแล้ว", rescheduled:"เลื่อนนัด" };
        const psCls: Record<string, string> = { planned:"bg-blue-500/10 border-blue-500/25 text-blue-500", in_progress:"bg-amber-500/10 border-amber-500/25 text-amber-500", completed:"bg-green-500/10 border-green-500/25 text-green-500", rescheduled:"bg-orange-500/10 border-orange-500/25 text-orange-500" };
        const tc = (a.type in (selectedActivity as unknown as Record<string,unknown>)) ? undefined : undefined; // just for reference
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedActivity(null)}>
            <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-5 py-3.5 border-b border-border flex items-start justify-between gap-3 shrink-0">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="rounded-full bg-card-hover px-2.5 py-1 text-xs font-medium">{typeLabels[a.type]}</span>
                  {isPlan ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium border ${psCls[ps] || psCls.planned}`}>{psLabel[ps] || ps}</span>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.status === "done" ? "bg-green-500/10 border-green-500/25 text-green-500 border" : a.status === "in_progress" ? "bg-amber-500/10 border-amber-500/25 text-amber-500 border" : "bg-blue-500/10 border-blue-500/25 text-blue-500 border"}`}>
                      {a.status === "done" ? "เสร็จแล้ว" : a.status === "in_progress" ? "กำลังทำ" : "ใหม่"}
                    </span>
                  )}
                  {a.result && <span className={`text-xs font-medium ${resultColor[a.result] || "text-muted"}`}>{resultLabels[a.result]}</span>}
                  {isOverdue && <span className="rounded-full bg-red-500/10 border border-red-500/25 text-red-500 px-2.5 py-1 text-xs">⚠ Overdue</span>}
                  {a.converted_to_project_id && <span className="rounded-full bg-green-500/10 border border-green-500/25 text-green-500 px-2.5 py-1 text-xs">→ Pipeline</span>}
                  {(a.auto_followup_created as boolean) && <span className="rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 px-2.5 py-1 text-xs">↻ Auto FU สร้างแล้ว</span>}
                </div>
                <button onClick={() => setSelectedActivity(null)} className="text-muted hover:text-foreground text-xl leading-none shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-card-hover transition-colors">✕</button>
              </div>

              {/* Status flow bar (plans only) */}
              {isPlan && (
                <div className="px-5 py-3 border-b border-border bg-background/60 flex items-center gap-1">
                  {(["planned","in_progress","completed","rescheduled"] as const).map((s, i) => {
                    const active = ps === s;
                    const past = (["planned","in_progress","completed"].indexOf(ps) > i) && s !== "rescheduled";
                    return (
                      <div key={s} className={`flex items-center ${i < 3 ? "flex-1" : ""} gap-1`}>
                        <button onClick={() => { if (a.id) quickUpdatePlanStatus(a.id, s); }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border transition-all hover:opacity-80 ${active ? psCls[s] : past ? "bg-green-500/5 border-green-500/15 text-green-500/60" : "border-border/40 text-muted/40 hover:border-border hover:text-muted"}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${active ? "bg-current/20" : ""}`}>
                            {past ? "✓" : i+1}
                          </span>
                          <span className="hidden sm:inline">{psLabel[s]}</span>
                        </button>
                        {i < 3 && <div className={`flex-1 h-px mx-1 ${past || active ? "bg-border" : "bg-border/30"}`} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">

                {/* Objective — prominent for plans */}
                {isPlan && (a.objective as string) && (
                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3.5">
                    <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider mb-1.5">🎯 วัตถุประสงค์ (Objective)</p>
                    <p className="text-sm font-medium">{a.objective as string}</p>
                  </div>
                )}

                {/* Main title */}
                <div>
                  <p className="text-base font-semibold leading-snug">{a.description || a.expected_outcome}</p>
                  {a.customer_type === "prospect" && <span className="text-[10px] rounded bg-orange-500/10 border border-orange-500/25 text-orange-500 px-1.5 py-0.5 mt-1.5 inline-block">🔍 Prospect</span>}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {a.assigned_to && <div><p className="text-[10px] text-muted mb-0.5 uppercase">ผู้รับผิดชอบ</p><p className="font-medium">👤 {a.assigned_to}</p></div>}
                  {a.customer_name && <div><p className="text-[10px] text-muted mb-0.5 uppercase">ลูกค้า</p><p className="font-medium">🏢 {a.customer_name}</p></div>}
                  {a.contact_person && <div><p className="text-[10px] text-muted mb-0.5 uppercase">ติดต่อ</p><p>👤 {a.contact_person as string}</p></div>}
                  {a.project_name && <div><p className="text-[10px] text-muted mb-0.5 uppercase">โปรเจค</p><p>📁 {a.project_name}</p></div>}
                  {isPlan && a.plan_date && <div><p className="text-[10px] text-muted mb-0.5 uppercase">วันที่แผน</p><p className={(a.plan_date < today && a.status !== "done") ? "text-red-500 font-medium" : ""}>📅 {a.plan_date}</p></div>}
                  {!isPlan && a.next_follow_up && <div><p className="text-[10px] text-muted mb-0.5 uppercase">Follow-up</p><p className={a.next_follow_up < today && a.status !== "done" ? "text-red-500 font-medium" : ""}>📅 {a.next_follow_up}</p></div>}
                </div>

                {/* Outcome — highlighted when filled */}
                {(a.outcome as string) && (
                  <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3.5">
                    <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider mb-1.5">📝 ผลที่เกิดขึ้นจริง (Outcome)</p>
                    <p className="text-sm">{a.outcome as string}</p>
                  </div>
                )}

                {/* Rescheduled info */}
                {ps === "rescheduled" && (a.rescheduled_to as string) && (
                  <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3">
                    <p className="text-[10px] text-orange-500 font-semibold uppercase mb-1">📅 เลื่อนไปวันที่</p>
                    <p className="text-sm font-medium">{a.rescheduled_to as string}</p>
                  </div>
                )}

                {/* Next Action block */}
                {(a.next_action || a.next_action_type || a.next_action_date) && (
                  <div className="rounded-xl bg-background border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-muted uppercase font-semibold">Next Action</p>
                      {!(a.auto_followup_created as boolean) && (a.next_action_date as string) && a.status === "done" && !editingActId && (
                        <button onClick={async () => { await createAutoFollowup({ customer_id: a.customer_id, customer_name: a.customer_name, customer_type: a.customer_type, project_id: a.project_id, project_name: a.project_name, assigned_to: a.assigned_to, next_action: a.next_action as string, next_action_type: a.next_action_type as string, next_action_date: a.next_action_date as string }); await quickUpdatePlanStatus(a.id!, (a.plan_status as "planned"|"in_progress"|"completed"|"rescheduled") || "completed", { auto_followup_created: true }); }}
                          className="text-[10px] text-blue-500 hover:underline font-medium">+ สร้าง Follow-up</button>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {a.next_action_type && <p>→ <span className="text-blue-500 font-medium">{a.next_action_type as string}</span></p>}
                      {a.next_action && <p className="text-muted">{a.next_action as string}</p>}
                      {(a.next_action_date || a.next_action_by) && (
                        <p className="text-xs text-muted">
                          {a.next_action_date && <>📅 {a.next_action_date as string}</>}
                          {a.next_action_by && <> · โดย {a.next_action_by as string}</>}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick report prompt — when plan is planned/in_progress and no outcome yet */}
                {isPlan && ps !== "completed" && ps !== "rescheduled" && !(a.outcome as string) && (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <p className="text-[11px] text-muted mb-2">ดำเนินการแล้ว? บันทึกผลและ next action</p>
                    <button onClick={() => openEditActivity(a)} className="rounded-lg bg-green-500/10 border border-green-500/25 text-green-500 px-4 py-1.5 text-xs font-medium hover:bg-green-500/20 transition-colors">✏️ รายงานผล</button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-border flex items-center gap-2 shrink-0 flex-wrap">
                {/* Quick status buttons for plans */}
                {isPlan && ps !== "completed" && (
                  <button onClick={() => { if (a.id) quickUpdatePlanStatus(a.id, "completed"); }}
                    className="rounded-lg bg-green-500/10 border border-green-500/25 text-green-500 px-3 py-1.5 text-xs font-medium hover:bg-green-500/20 transition-colors" disabled={saving}>
                    {saving ? "..." : "✓ เสร็จแล้ว"}
                  </button>
                )}
                {isPlan && ps !== "in_progress" && ps !== "completed" && (
                  <button onClick={() => { if (a.id) quickUpdatePlanStatus(a.id, "in_progress"); }}
                    className="rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/20 transition-colors" disabled={saving}>
                    ⚡ เริ่มแล้ว
                  </button>
                )}
                <button onClick={() => openEditActivity(a)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover">✏️ แก้ไข</button>
                {!a.converted_to_project_id && a.status !== "done" && (
                  <button onClick={() => { setSelectedActivity(null); convertActivityToPipeline(a); }} className="rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-500 px-3 py-1.5 text-xs hover:bg-blue-500/20">→ สร้างดีล</button>
                )}
                {canReassign && (
                  <button onClick={() => { setSelectedActivity(null); setReassigningId(a.id!); setReassignTarget(a.assigned_to || ""); setTab("activities"); }} className="rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 px-3 py-1.5 text-xs hover:bg-amber-500/20">โยกงาน</button>
                )}
                <div className="flex-1" />
                <button onClick={() => { setSelectedActivity(null); deleteActivity(a.id!); }} className="rounded-lg border border-red-500/30 text-red-500 px-3 py-1.5 text-xs hover:bg-red-500/10">ลบ</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
