"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Quotation, QuotationTimelineEntry, PostPOStep, TeamAssignment, User } from "@/lib/types";

// Status flow
const statusFlow = ["draft", "sent", "follow_up", "revised", "approved", "rejected", "expired"] as const;
const statusMeta: Record<string, { label: string; thai: string; color: string; bg: string }> = {
  draft: { label: "Draft", thai: "ร่าง", color: "text-gray-400", bg: "bg-gray-700" },
  sent: { label: "Sent", thai: "ส่งแล้ว", color: "text-blue-400", bg: "bg-blue-900/50" },
  follow_up: { label: "Follow-up", thai: "ติดตาม", color: "text-yellow-400", bg: "bg-yellow-900/50" },
  revised: { label: "Revised", thai: "แก้ไขใหม่", color: "text-purple-400", bg: "bg-purple-900/50" },
  approved: { label: "Won / PO", thai: "ชนะ / ได้ PO", color: "text-green-400", bg: "bg-green-900/50" },
  rejected: { label: "Lost", thai: "แพ้", color: "text-red-400", bg: "bg-red-900/50" },
  expired: { label: "Expired", thai: "หมดอายุ", color: "text-gray-500", bg: "bg-gray-800" },
};

const actionMeta: Record<string, { icon: string; label: string }> = {
  created: { icon: "📝", label: "สร้างใบเสนอราคา" },
  sent: { icon: "📧", label: "ส่งให้ลูกค้า" },
  follow_up: { icon: "📞", label: "ติดตาม" },
  revised: { icon: "✏️", label: "แก้ไข / Revision" },
  approved: { icon: "✅", label: "อนุมัติ" },
  rejected: { icon: "❌", label: "ปฏิเสธ" },
  po_received: { icon: "📦", label: "ได้รับ PO" },
  lost: { icon: "💔", label: "แพ้งาน" },
  note: { icon: "💬", label: "หมายเหตุ" },
};

const postPOSteps: { step: PostPOStep["step"]; title: string; team: string }[] = [
  { step: "open_po", title: "เปิด PO สั่งซื้อ", team: "procurement" },
  { step: "order_tracking", title: "ติดตามการสั่งซื้อ", team: "procurement" },
  { step: "delivery", title: "จัดส่ง / รับของ", team: "procurement" },
  { step: "project_kickoff", title: "Kickoff โปรเจค", team: "sale" },
  { step: "installation", title: "ติดตั้ง / ดำเนินการ", team: "service" },
  { step: "handover", title: "ส่งมอบ / ปิดงาน", team: "service" },
];

const teamLabels: Record<string, string> = { presale: "Presale", procurement: "Procurement", service: "Service", sale: "Sales" };
const teamColor: Record<string, string> = { presale: "bg-purple-900/50 text-purple-400", procurement: "bg-cyan-900/50 text-cyan-400", service: "bg-rose-900/50 text-rose-400", sale: "bg-blue-900/50 text-blue-400" };

const today = new Date().toISOString().slice(0, 10);

export default function SalesWorkflowPage() {
  const [quots, setQuots] = useState<Quotation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);

  // Action form
  const [actionNote, setActionNote] = useState("");

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [q, u] = await Promise.all([fs.quotations.list(), fs.users.list()]);
      setQuots(q); setUsers(u.filter(x => x.active));
      if (selected) { const updated = q.find(x => x.id === selected.id); if (updated) setSelected(updated); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  const filtered = quots.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = !s || q.customer_name.toLowerCase().includes(s) || q.quotation_number.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Pipeline counts
  const pipeline = statusFlow.map(s => ({ status: s, count: quots.filter(q => q.status === s).length, value: quots.filter(q => q.status === s).reduce((sum, q) => sum + (q.grand_total || q.total_selling || 0), 0) }));
  const overdueFollowups = quots.filter(q => q.follow_up_date && q.follow_up_date < today && q.status !== "approved" && q.status !== "rejected");
  const waitingAction = quots.filter(q => q.status === "sent" || q.status === "follow_up");

  // Actions
  async function addTimelineEntry(qId: string, action: QuotationTimelineEntry["action"], statusUpdate?: string, extraFields?: Record<string, unknown>) {
    setSaving(true);
    const fs = await import("@/lib/firestore");
    const q = quots.find(x => x.id === qId);
    if (!q) return;
    const entry: QuotationTimelineEntry = { action, date: new Date().toISOString(), user: "พี่กรด", note: actionNote };
    const timeline = [...(q.timeline || []), entry];
    const update: Record<string, unknown> = { timeline, ...extraFields || {} };
    if (statusUpdate) update.status = statusUpdate;
    await fs.quotations.update(qId, update);
    setActionNote("");
    await load();
    setSaving(false);
  }

  async function doSend(q: Quotation) {
    const note = prompt("หมายเหตุการส่ง (ไม่บังคับ)") || "";
    setActionNote(note);
    await addTimelineEntry(q.id!, "sent", "sent", { sent_date: today });
  }

  async function doFollowUp(q: Quotation) {
    const note = prompt("หมายเหตุ Follow-up") || "";
    const nextDate = prompt("วัน Follow-up ถัดไป (YYYY-MM-DD)", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)) || "";
    setActionNote(note);
    await addTimelineEntry(q.id!, "follow_up", "follow_up", { follow_up_date: nextDate });
  }

  async function doRevise(q: Quotation) {
    const note = prompt("หมายเหตุ Revision") || "";
    setActionNote(note);
    await addTimelineEntry(q.id!, "revised", "revised", { version: (q.version || 1) + 1 });
  }

  async function doApprove(q: Quotation) {
    const poNum = prompt("เลข PO (ถ้ามี)") || "";
    const note = prompt("หมายเหตุ") || "";
    setActionNote(note);
    // Auto-create post-PO steps
    const steps: PostPOStep[] = postPOSteps.map(s => ({ step: s.step, title: s.title, assigned_to: "", assigned_team: s.team, status: "pending" as const, due_date: "", completed_date: "", note: "" }));
    await addTimelineEntry(q.id!, "po_received", "approved", { po_number: poNum, po_date: today, po_received: true, post_po_steps: steps });
  }

  async function doLost(q: Quotation) {
    const reason = prompt("เหตุผลที่แพ้") || "";
    setActionNote(reason);
    await addTimelineEntry(q.id!, "lost", "rejected", { lost_reason: reason });
  }

  async function doAddNote(q: Quotation) {
    const note = prompt("เพิ่มหมายเหตุ") || "";
    if (!note) return;
    setActionNote(note);
    await addTimelineEntry(q.id!, "note");
  }

  async function updatePostPOStep(qId: string, stepIdx: number, updates: Partial<PostPOStep>) {
    setSaving(true);
    const fs = await import("@/lib/firestore");
    const q = quots.find(x => x.id === qId);
    if (!q || !q.post_po_steps) return;
    const steps = [...q.post_po_steps];
    steps[stepIdx] = { ...steps[stepIdx], ...updates };
    if (updates.status === "completed") steps[stepIdx].completed_date = today;
    await fs.quotations.update(qId, { post_po_steps: steps });
    await load();
    setSaving(false);
  }

  async function updateTeamAssignment(qId: string, team: string, person: string, roleDesc: string) {
    const fs = await import("@/lib/firestore");
    const q = quots.find(x => x.id === qId);
    if (!q) return;
    const assignments = [...(q.team_assignments || [])];
    const idx = assignments.findIndex(a => a.team === team);
    if (idx >= 0) assignments[idx] = { ...assignments[idx], person, role_desc: roleDesc };
    else assignments.push({ team: team as TeamAssignment["team"], person, role_desc: roleDesc });
    await fs.quotations.update(qId, { team_assignments: assignments });
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="Sales Workflow — ติดตามสถานะใบเสนอราคา">Sales Workflow</h1>
          <p className="text-xs text-muted">ติดตาม Timeline ใบเสนอราคา ตั้งแต่ Draft → ส่ง → Follow-up → PO → ส่งมอบ</p>
        </div>
        <Link href="/quotations" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Quotations</Link>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* Pipeline summary */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {pipeline.map(p => (
          <button key={p.status} onClick={() => setStatusFilter(statusFilter === p.status ? "all" : p.status)}
            className={`shrink-0 rounded-lg border p-2.5 text-center min-w-[90px] transition-colors ${statusFilter === p.status ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
            <p className={`text-lg font-bold ${statusMeta[p.status].color}`}>{p.count}</p>
            <p className="text-[9px] text-muted">{statusMeta[p.status].thai}</p>
            <p className="text-[9px] text-muted">{(p.value / 1000).toFixed(0)}K</p>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(overdueFollowups.length > 0 || waitingAction.length > 0) && (
        <div className="flex gap-3 mb-4">
          {overdueFollowups.length > 0 && <div className="rounded-lg bg-red-900/20 border border-red-800 px-3 py-2 text-xs text-red-400">⚠ {overdueFollowups.length} follow-up เลยกำหนด</div>}
          {waitingAction.length > 0 && <div className="rounded-lg bg-yellow-900/20 border border-yellow-800 px-3 py-2 text-xs text-yellow-400">⏳ {waitingAction.length} งานรอ action ถัดไป</div>}
        </div>
      )}

      <input placeholder="ค้นหา QT number / ลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: QT list */}
        <div className="lg:col-span-1 space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบใบเสนอราคา</p> : filtered.map(q => {
            const isOverdue = q.follow_up_date && q.follow_up_date < today && q.status !== "approved" && q.status !== "rejected";
            return (
              <button key={q.id} onClick={() => setSelected(q)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${selected?.id === q.id ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-medium">{q.quotation_number}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${statusMeta[q.status]?.bg} ${statusMeta[q.status]?.color}`}>{statusMeta[q.status]?.thai}</span>
                </div>
                <p className="text-xs truncate">{q.customer_name}</p>
                <p className="text-[10px] text-muted">{(q.grand_total || q.total_selling || 0).toLocaleString()} THB{q.version && q.version > 1 ? ` · v${q.version}` : ""}</p>
                {isOverdue && <p className="text-[10px] text-red-400 mt-0.5">⚠ Follow-up overdue: {q.follow_up_date}</p>}
              </button>
            );
          })}
        </div>

        {/* Right: Detail panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center"><p className="text-muted text-sm">← เลือกใบเสนอราคาเพื่อดู Workflow</p></div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-lg font-bold font-mono">{selected.quotation_number}</p>
                    <p className="text-sm text-muted">{selected.customer_name} · {selected.project_name}</p>
                    <p className="text-xs text-muted">{(selected.grand_total || selected.total_selling || 0).toLocaleString()} THB · GP {(selected.gp_percent || 0).toFixed(1)}%{selected.version && selected.version > 1 ? ` · Version ${selected.version}` : ""}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusMeta[selected.status]?.bg} ${statusMeta[selected.status]?.color}`}>{statusMeta[selected.status]?.thai}</span>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selected.status === "draft" && <button onClick={() => doSend(selected)} disabled={saving} className="rounded-lg bg-blue-800/50 text-blue-400 px-3 py-1.5 text-xs hover:bg-blue-800">📧 ส่งให้ลูกค้า</button>}
                  {["sent", "follow_up"].includes(selected.status) && <button onClick={() => doFollowUp(selected)} disabled={saving} className="rounded-lg bg-yellow-800/50 text-yellow-400 px-3 py-1.5 text-xs hover:bg-yellow-800">📞 Follow-up</button>}
                  {["sent", "follow_up", "revised"].includes(selected.status) && <button onClick={() => doRevise(selected)} disabled={saving} className="rounded-lg bg-purple-800/50 text-purple-400 px-3 py-1.5 text-xs hover:bg-purple-800">✏️ Revise</button>}
                  {["sent", "follow_up", "revised"].includes(selected.status) && <button onClick={() => doApprove(selected)} disabled={saving} className="rounded-lg bg-green-800/50 text-green-400 px-3 py-1.5 text-xs hover:bg-green-800">✅ ได้ PO / Won</button>}
                  {["sent", "follow_up", "revised"].includes(selected.status) && <button onClick={() => doLost(selected)} disabled={saving} className="rounded-lg bg-red-800/50 text-red-400 px-3 py-1.5 text-xs hover:bg-red-800">💔 Lost</button>}
                  <button onClick={() => doAddNote(selected)} disabled={saving} className="rounded-lg bg-card-hover text-muted px-3 py-1.5 text-xs hover:text-foreground">💬 Note</button>
                </div>
              </div>

              {/* Status flow visual */}
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-xs text-muted uppercase mb-2">Status Flow</h3>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {statusFlow.filter(s => s !== "expired").map((s, i) => {
                    const isCurrent = selected.status === s;
                    const isPast = statusFlow.indexOf(selected.status) > statusFlow.indexOf(s);
                    return (
                      <div key={s} className="flex items-center gap-1 shrink-0">
                        {i > 0 && <div className={`w-4 h-0.5 ${isPast || isCurrent ? "bg-accent" : "bg-border"}`} />}
                        <div className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${isCurrent ? "bg-accent text-white" : isPast ? statusMeta[s].bg + " " + statusMeta[s].color : "bg-background text-muted border border-border"}`}>
                          {statusMeta[s].thai}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-xs text-muted uppercase mb-3">Activity Timeline</h3>
                {(!selected.timeline || selected.timeline.length === 0) ? (
                  <p className="text-xs text-muted">ยังไม่มี activity — กดปุ่ม action ด้านบนเพื่อเริ่ม</p>
                ) : (
                  <div className="relative pl-4 border-l-2 border-border space-y-3">
                    {[...selected.timeline].reverse().map((t, i) => {
                      const meta = actionMeta[t.action] || { icon: "📌", label: t.action };
                      return (
                        <div key={i} className="relative">
                          <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-card border-2 border-accent" />
                          <div className="ml-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span>{meta.icon}</span>
                              <span className="font-medium">{meta.label}</span>
                              <span className="text-muted">{new Date(t.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</span>
                              <span className="text-muted">โดย {t.user}</span>
                            </div>
                            {t.note && <p className="text-[10px] text-muted mt-0.5 ml-5">{t.note}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Post-PO Steps (only when approved) */}
              {selected.status === "approved" && selected.post_po_steps && (
                <div className="rounded-xl bg-card border border-border p-4">
                  <h3 className="text-xs text-muted uppercase mb-3">ขั้นตอนหลังได้ PO</h3>
                  <div className="space-y-2">
                    {selected.post_po_steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-background border border-border p-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${step.status === "completed" ? "bg-green-500 text-white" : step.status === "in_progress" ? "bg-yellow-500 text-white" : "bg-border text-muted"}`}>
                          {step.status === "completed" ? "✓" : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{step.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                            <span className={`rounded px-1.5 py-0.5 ${teamColor[step.assigned_team] || "bg-gray-700 text-gray-400"}`}>{teamLabels[step.assigned_team] || step.assigned_team}</span>
                            {step.assigned_to && <span>→ {step.assigned_to}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select value={step.assigned_to} onChange={e => updatePostPOStep(selected.id!, i, { assigned_to: e.target.value })}
                            className="rounded bg-card border border-border px-1.5 py-0.5 text-[10px] focus:outline-none w-24">
                            <option value="">— มอบหมาย —</option>
                            {users.filter(u => u.role === step.assigned_team || step.assigned_team === "procurement").map(u => <option key={u.id} value={u.name}>{(u.nickname || u.name).split(" ")[0]}</option>)}
                          </select>
                          <select value={step.status} onChange={e => updatePostPOStep(selected.id!, i, { status: e.target.value as PostPOStep["status"] })}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${step.status === "completed" ? "bg-green-900/50 text-green-400" : step.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>
                            <option value="pending">รอ</option>
                            <option value="in_progress">กำลังทำ</option>
                            <option value="completed">เสร็จ</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team assignments */}
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-xs text-muted uppercase mb-3">ทีมที่เกี่ยวข้อง</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["presale", "sale", "procurement", "service"] as const).map(team => {
                    const assignment = (selected.team_assignments || []).find(a => a.team === team);
                    return (
                      <div key={team} className="rounded-lg bg-background border border-border p-2.5">
                        <p className={`text-[10px] font-medium mb-1 ${teamColor[team]?.split(" ")[1] || "text-muted"}`}>{teamLabels[team]}</p>
                        <select value={assignment?.person || ""} onChange={e => updateTeamAssignment(selected.id!, team, e.target.value, assignment?.role_desc || "")}
                          className="w-full rounded bg-card border border-border px-2 py-1 text-xs focus:outline-none mb-1">
                          <option value="">— เลือก —</option>
                          {users.map(u => <option key={u.id} value={u.name}>{(u.nickname || u.name).split(" ")[0]} ({u.role})</option>)}
                        </select>
                        {assignment?.person && <p className="text-[10px] text-muted">{assignment.person}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lost reason */}
              {selected.status === "rejected" && selected.lost_reason && (
                <div className="rounded-xl bg-red-900/10 border border-red-800/30 p-4">
                  <h3 className="text-xs text-red-400 font-semibold mb-1">💔 เหตุผลที่แพ้</h3>
                  <p className="text-sm">{selected.lost_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      </>)}
    </div>
  );
}
