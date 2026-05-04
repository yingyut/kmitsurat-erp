"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { NotificationChannel, NotificationWorkflow, NotifyChannelType, NotifyTrigger, User } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";

// === CONSTANTS ===
const channelTypes: { value: NotifyChannelType; label: string; icon: string; thai: string }[] = [
  { value: "email", label: "Email", icon: "📧", thai: "อีเมล" },
  { value: "line_notify", label: "LINE Notify", icon: "💚", thai: "LINE Notify (ส่งเข้ากลุ่ม)" },
  { value: "line_messaging", label: "LINE Messaging", icon: "💬", thai: "LINE Messaging API" },
  { value: "ms_teams", label: "Microsoft Teams", icon: "🟦", thai: "Teams Webhook" },
  { value: "webhook", label: "Webhook", icon: "🔗", thai: "Custom Webhook" },
];

const triggers: { value: NotifyTrigger; label: string; thai: string; module: string }[] = [
  { value: "quotation_created", label: "New Quotation Created", thai: "สร้างใบเสนอราคาใหม่", module: "quotations" },
  { value: "quotation_gp_below", label: "GP Below Threshold", thai: "GP ต่ำกว่าเกณฑ์ (เช่น < 15%)", module: "quotations" },
  { value: "quotation_sent_review", label: "Quotation Sent for Review", thai: "ส่งใบเสนอราคาเพื่อตรวจสอบ", module: "quotations" },
  { value: "quotation_approved", label: "Quotation Approved", thai: "ใบเสนอราคาอนุมัติ", module: "quotations" },
  { value: "quotation_rejected", label: "Quotation Rejected", thai: "ใบเสนอราคาถูกปฏิเสธ", module: "quotations" },
  { value: "project_opened", label: "New Project/Job Opened", thai: "เปิดโปรเจค/งานใหม่", module: "projects" },
  { value: "contract_expiring", label: "Contract Expiring Soon", thai: "สัญญาใกล้หมดอายุ", module: "contracts" },
  { value: "service_ticket_created", label: "Service Ticket Created", thai: "สร้าง Service Ticket ใหม่", module: "service" },
  { value: "ticket_status_changed", label: "Ticket Status Changed", thai: "เปลี่ยนสถานะ Ticket", module: "service" },
];

const roles = ["admin", "sale", "presale", "service", "avenger"];

const emptyChannel: Omit<NotificationChannel, "id" | "tenant_id"> = {
  type: "email", name: "", active: true,
  smtp_host: "", smtp_port: 587, smtp_user: "", smtp_pass: "", from_email: "", from_name: "",
  line_notify_token: "", line_channel_token: "", line_channel_secret: "", line_group_id: "",
  teams_webhook_url: "", webhook_url: "", webhook_method: "POST", webhook_headers: "",
};

const emptyWorkflow: Omit<NotificationWorkflow, "id" | "tenant_id"> = {
  name: "", module: "", trigger: "quotation_created", condition: "",
  recipient_roles: [], recipient_users: [], recipient_emails: [], recipient_line_group: "",
  channels: [], channel_ids: [], subject_template: "", body_template: "", active: true,
};

// === COMPONENT ===
export default function NotificationsPage() {
  const [tab, setTab] = useState<"workflows" | "channels">("workflows");
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [workflows, setWorkflows] = useState<NotificationWorkflow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Channel form
  const [showChForm, setShowChForm] = useState(false);
  const [editChId, setEditChId] = useState<string | null>(null);
  const [chForm, setChForm] = useState(emptyChannel);

  // Workflow form
  const [showWfForm, setShowWfForm] = useState(false);
  const [editWfId, setEditWfId] = useState<string | null>(null);
  const [wfForm, setWfForm] = useState(emptyWorkflow);

  // Test result
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testSending, setTestSending] = useState(false);
  const { currentUser } = useCurrentUser();

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [ch, wf, u] = await Promise.all([fs.notificationChannels.list(), fs.notificationWorkflows.list(), fs.users.list()]);
      setChannels(ch); setWorkflows(wf); setUsers(u.filter(x => x.active));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // === CHANNEL CRUD ===
  function openAddCh() { setEditChId(null); setChForm({ ...emptyChannel }); setShowChForm(true); }
  function openEditCh(ch: NotificationChannel) {
    setEditChId(ch.id!);
    setChForm({
      type: ch.type, name: ch.name, active: ch.active,
      smtp_host: ch.smtp_host || "", smtp_port: ch.smtp_port || 587, smtp_user: ch.smtp_user || "", smtp_pass: ch.smtp_pass || "", from_email: ch.from_email || "", from_name: ch.from_name || "",
      line_notify_token: ch.line_notify_token || "", line_channel_token: ch.line_channel_token || "", line_channel_secret: ch.line_channel_secret || "", line_group_id: ch.line_group_id || "",
      teams_webhook_url: ch.teams_webhook_url || "", webhook_url: ch.webhook_url || "", webhook_method: ch.webhook_method || "POST", webhook_headers: ch.webhook_headers || "",
    });
    setShowChForm(true);
  }
  async function saveCh() {
    if (!chForm.name.trim()) return; setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editChId) await fs.notificationChannels.update(editChId, chForm as unknown as Record<string, unknown>);
      else await fs.notificationChannels.add(chForm as unknown as Record<string, unknown>);
      setChForm({ ...emptyChannel }); setShowChForm(false); setEditChId(null); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function deleteCh(id: string, name: string) {
    if (!confirm(`ลบ channel "${name}" ?`)) return;
    const fs = await import("@/lib/firestore"); await fs.notificationChannels.remove(id); await load();
  }

  // === WORKFLOW CRUD ===
  function openAddWf() { setEditWfId(null); setWfForm({ ...emptyWorkflow }); setShowWfForm(true); }
  function openEditWf(wf: NotificationWorkflow) {
    setEditWfId(wf.id!);
    setWfForm({
      name: wf.name, module: wf.module, trigger: wf.trigger, condition: wf.condition || "",
      recipient_roles: wf.recipient_roles || [], recipient_users: wf.recipient_users || [],
      recipient_emails: wf.recipient_emails || [], recipient_line_group: wf.recipient_line_group || "",
      channels: wf.channels || [], channel_ids: wf.channel_ids || [],
      subject_template: wf.subject_template || "", body_template: wf.body_template || "", active: wf.active,
    });
    setShowWfForm(true);
  }
  async function saveWf() {
    if (!wfForm.name.trim()) return; setSaving(true);
    const trig = triggers.find(t => t.value === wfForm.trigger);
    const data = { ...wfForm, module: trig?.module || wfForm.module };
    const fs = await import("@/lib/firestore");
    try {
      if (editWfId) await fs.notificationWorkflows.update(editWfId, data as unknown as Record<string, unknown>);
      else await fs.notificationWorkflows.add(data as unknown as Record<string, unknown>);
      setWfForm({ ...emptyWorkflow }); setShowWfForm(false); setEditWfId(null); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function deleteWf(id: string, name: string) {
    if (!confirm(`ลบ workflow "${name}" ?`)) return;
    const fs = await import("@/lib/firestore"); await fs.notificationWorkflows.remove(id); await load();
  }
  async function toggleWf(id: string, active: boolean) {
    const fs = await import("@/lib/firestore"); await fs.notificationWorkflows.update(id, { active }); await load();
  }

  // Test notification — send real email if channel configured
  async function testNotification(wf: NotificationWorkflow) {
    // Find email channel
    const emailChannel = wf.channel_ids
      .map(id => channels.find(c => c.id === id))
      .find(c => c?.type === "email" && c.active)
      || channels.find(c => c.type === "email" && c.active);

    if (!emailChannel || !emailChannel.smtp_host) {
      // No email channel — show simulation
      const chNames = wf.channel_ids.map(id => channels.find(c => c.id === id)?.name || id).join(", ");
      setTestResult(`[จำลอง] ยังไม่ได้ตั้งค่า Email Channel\n\nWorkflow: "${wf.name}"\nChannels: ${chNames || wf.channels.join(", ")}\nRecipients: ${[...wf.recipient_roles, ...wf.recipient_users, ...wf.recipient_emails].join(", ")}\n\n→ กรุณาสร้าง Email Channel ก่อนใน tab "Channels"`);
      setTimeout(() => setTestResult(null), 8000);
      return;
    }

    // Send real test email
    setTestSending(true);
    const sender = currentUser;
    const testSubject = `[TEST] ${wf.subject_template.replace(/\{[^}]+\}/g, "(ตัวอย่าง)")}`;
    const testBody = `🧪 ทดสอบแจ้งเตือนจากระบบ KMITSURAT\n\nWorkflow: ${wf.name}\nTrigger: ${wf.trigger}\n${wf.condition ? `Condition: ${wf.condition}\n` : ""}\nส่งโดย: ${sender?.name || "System"} (${sender?.email || ""})\n\n--- Template ---\n${wf.body_template.replace(/\{([^}]+)\}/g, "($1)")}`;

    // Recipients: use workflow emails, or fallback to current user
    const toEmails = wf.recipient_emails.length > 0 ? wf.recipient_emails : [sender?.email || ""];

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: emailChannel.smtp_host,
          smtp_port: emailChannel.smtp_port,
          smtp_user: emailChannel.smtp_user,
          smtp_pass: emailChannel.smtp_pass,
          from_email: sender?.email || emailChannel.from_email,
          from_name: sender?.name || emailChannel.from_name || "KMITSURAT System",
          to: toEmails,
          subject: testSubject,
          body: testBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ ส่งอีเมลสำเร็จ!\n\nจาก: ${sender?.name} (${sender?.email})\nถึง: ${toEmails.join(", ")}\nSubject: ${testSubject}\nMessage ID: ${data.messageId}`);
      } else {
        setTestResult(`❌ ส่งไม่สำเร็จ: ${data.error}\n\nตรวจสอบ SMTP settings ใน tab "Channels"`);
      }
    } catch (err) {
      setTestResult(`❌ Error: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setTestSending(false);
      setTimeout(() => setTestResult(null), 10000);
    }
  }

  // Helpers
  function toggleArrayItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  const chIcon = (t: NotifyChannelType) => channelTypes.find(c => c.value === t)?.icon || "📨";
  const chLabel = (t: NotifyChannelType) => channelTypes.find(c => c.value === t)?.label || t;
  const trigLabel = (t: NotifyTrigger) => triggers.find(x => x.value === t)?.thai || t;

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="ตั้งค่าการแจ้งเตือน">Notification Workflows</h1>
          <p className="text-xs text-muted">ตั้งค่า Workflow แจ้งเตือนอัตโนมัติผ่าน Email, LINE, Teams, Webhook</p>
        </div>
        <Link href="/settings" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Settings</Link>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className="rounded-lg bg-green-900/20 border border-green-800 px-4 py-3 mb-4 text-xs text-green-400 whitespace-pre-wrap">
          ✓ {testResult}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        <button onClick={() => setTab("workflows")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "workflows" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
          Workflows ({workflows.length})
        </button>
        <button onClick={() => setTab("channels")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "channels" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
          Channels ({channels.length})
        </button>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* ═══════════ WORKFLOWS TAB ═══════════ */}
      {tab === "workflows" && (<>
        <div className="flex justify-end mb-3">
          <button onClick={openAddWf} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่ม Workflow</button>
        </div>

        {showWfForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <h2 className="text-base font-semibold mb-3">{editWfId ? "แก้ไข Workflow" : "เพิ่ม Workflow ใหม่"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div><label className="text-[10px] text-muted">ชื่อ Workflow *</label><input placeholder="เช่น แจ้งเตือน GP ต่ำ" value={wfForm.name} onChange={e => setWfForm({ ...wfForm, name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">Trigger Event *</label><select value={wfForm.trigger} onChange={e => { const t = e.target.value as NotifyTrigger; const trig = triggers.find(x => x.value === t); setWfForm({ ...wfForm, trigger: t, module: trig?.module || "" }); }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                {triggers.map(t => <option key={t.value} value={t.value}>{t.thai}</option>)}
              </select></div>
              <div><label className="text-[10px] text-muted">Module (auto)</label><input value={triggers.find(t => t.value === wfForm.trigger)?.module || ""} readOnly className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-muted mt-1" /></div>
              <div><label className="text-[10px] text-muted">Condition (ไม่บังคับ)</label><input placeholder='เช่น gp_percent < 15' value={wfForm.condition} onChange={e => setWfForm({ ...wfForm, condition: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            </div>

            {/* Recipients */}
            <p className="text-xs text-muted uppercase mb-2">ผู้รับแจ้งเตือน</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] text-muted">Roles (เลือกได้หลาย)</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {roles.map(r => (
                    <button key={r} onClick={() => setWfForm({ ...wfForm, recipient_roles: toggleArrayItem(wfForm.recipient_roles, r) })}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${wfForm.recipient_roles.includes(r) ? "bg-accent text-white" : "bg-background border border-border text-muted hover:bg-card-hover"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted">Users (เลือกได้หลาย)</label>
                <div className="max-h-[100px] overflow-y-auto mt-1 rounded-lg bg-background border border-border p-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer hover:bg-card-hover rounded px-1">
                      <input type="checkbox" checked={wfForm.recipient_users.includes(u.name)} onChange={() => setWfForm({ ...wfForm, recipient_users: toggleArrayItem(wfForm.recipient_users, u.name) })} />
                      {u.name} <span className="text-muted">({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="text-[10px] text-muted">อีเมลเพิ่มเติม (คั่นด้วย ,)</label><input placeholder="manager@company.com, boss@company.com" value={wfForm.recipient_emails.join(", ")} onChange={e => setWfForm({ ...wfForm, recipient_emails: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">LINE Group (ถ้ามี)</label><input placeholder="เช่น Sales Team" value={wfForm.recipient_line_group || ""} onChange={e => setWfForm({ ...wfForm, recipient_line_group: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            </div>

            {/* Channels */}
            <p className="text-xs text-muted uppercase mb-2">ช่องทางแจ้งเตือน</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {channelTypes.map(ct => (
                <button key={ct.value} onClick={() => setWfForm({ ...wfForm, channels: toggleArrayItem(wfForm.channels, ct.value) })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${wfForm.channels.includes(ct.value) ? "bg-accent text-white" : "bg-background border border-border text-muted hover:bg-card-hover"}`}>
                  {ct.icon} {ct.label}
                </button>
              ))}
            </div>
            {wfForm.channels.length > 0 && channels.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] text-muted">เลือก Channel ที่ตั้งค่าแล้ว</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {channels.filter(c => wfForm.channels.includes(c.type) && c.active).map(c => (
                    <button key={c.id} onClick={() => setWfForm({ ...wfForm, channel_ids: toggleArrayItem(wfForm.channel_ids, c.id!) })}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${wfForm.channel_ids.includes(c.id!) ? "bg-green-800/50 text-green-400" : "bg-background border border-border text-muted hover:bg-card-hover"}`}>
                      {chIcon(c.type)} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Templates */}
            <p className="text-xs text-muted uppercase mb-2">Template ข้อความ</p>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div><label className="text-[10px] text-muted">Subject Template</label><input placeholder='เช่น [KMITSURAT] ใบเสนอราคาใหม่: {quotation_number}' value={wfForm.subject_template} onChange={e => setWfForm({ ...wfForm, subject_template: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">Body Template (ใช้ {"{variable}"} สำหรับข้อมูลอัตโนมัติ)</label><textarea placeholder={'เช่น\nลูกค้า: {customer_name}\nโปรเจค: {project_name}\nมูลค่า: {total_selling} THB\nGP: {gp_percent}%\n\nสร้างโดย: {created_by}'} value={wfForm.body_template} onChange={e => setWfForm({ ...wfForm, body_template: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-24 resize-y mt-1 font-mono" /></div>
              <div className="text-[10px] text-muted">
                ตัวแปรที่ใช้ได้: {"{customer_name}"}, {"{project_name}"}, {"{quotation_number}"}, {"{total_selling}"}, {"{gp_percent}"}, {"{assigned_to}"}, {"{status}"}, {"{created_by}"}, {"{due_date}"}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wfForm.active} onChange={e => setWfForm({ ...wfForm, active: e.target.checked })} /> เปิดใช้งาน</label>
            </div>

            <div className="flex gap-2">
              <button onClick={saveWf} disabled={saving || !wfForm.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
              <button onClick={() => { setShowWfForm(false); setEditWfId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Workflow List */}
        {workflows.length === 0 ? <p className="text-muted text-sm">ยังไม่มี Workflow — กด &quot;+ เพิ่ม Workflow&quot;</p> : (
          <div className="space-y-2">
            {workflows.map(wf => (
              <div key={wf.id} className={`rounded-xl bg-card border ${wf.active ? "border-border" : "border-border opacity-50"} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm">{wf.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${wf.active ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>{wf.active ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="text-xs text-muted">Trigger: {trigLabel(wf.trigger)}{wf.condition && ` · Condition: ${wf.condition}`}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wf.channels.map(ch => <span key={ch} className="rounded bg-card-hover px-1.5 py-0.5 text-[10px]">{chIcon(ch)} {chLabel(ch)}</span>)}
                    </div>
                    <p className="text-[10px] text-muted mt-1">
                      ส่งถึง: {[...wf.recipient_roles.map(r => `[${r}]`), ...wf.recipient_users, ...wf.recipient_emails].join(", ") || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => testNotification(wf)} disabled={testSending} title="ทดสอบส่งอีเมลจริง" className="text-[10px] bg-blue-800/50 text-blue-400 rounded px-2 py-1 hover:bg-blue-800 disabled:opacity-50">{testSending ? "⏳ Sending..." : "🧪 Test"}</button>
                    <button onClick={() => toggleWf(wf.id!, !wf.active)} title={wf.active ? "ปิด" : "เปิด"} className="text-[10px] bg-card-hover rounded px-2 py-1 hover:bg-border">{wf.active ? "⏸ ปิด" : "▶ เปิด"}</button>
                    <button onClick={() => openEditWf(wf)} className="text-xs text-accent hover:underline">แก้ไข</button>
                    <button onClick={() => deleteWf(wf.id!, wf.name)} className="text-xs text-danger hover:underline">ลบ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </>)}

      {/* ═══════════ CHANNELS TAB ═══════════ */}
      {tab === "channels" && (<>
        <div className="flex justify-end mb-3">
          <button onClick={openAddCh} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่ม Channel</button>
        </div>

        {showChForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <h2 className="text-base font-semibold mb-3">{editChId ? "แก้ไข Channel" : "เพิ่ม Channel ใหม่"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div><label className="text-[10px] text-muted">ชื่อ Channel *</label><input placeholder="เช่น Sales LINE Group, IT Teams" value={chForm.name} onChange={e => setChForm({ ...chForm, name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
              <div><label className="text-[10px] text-muted">ประเภท</label><select value={chForm.type} onChange={e => setChForm({ ...chForm, type: e.target.value as NotifyChannelType })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                {channelTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.icon} {ct.label} — {ct.thai}</option>)}
              </select></div>
            </div>

            {/* Type-specific fields */}
            {chForm.type === "email" && (
              <div className="rounded-lg bg-background border border-border p-3 mb-4">
                <p className="text-xs text-muted font-semibold mb-2">📧 Email Settings (SMTP)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div><label className="text-[10px] text-muted">SMTP Host</label><input placeholder="smtp.gmail.com" value={chForm.smtp_host} onChange={e => setChForm({ ...chForm, smtp_host: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                  <div><label className="text-[10px] text-muted">SMTP Port</label><input type="number" value={chForm.smtp_port} onChange={e => setChForm({ ...chForm, smtp_port: Number(e.target.value) })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                  <div><label className="text-[10px] text-muted">Username</label><input placeholder="user@gmail.com" value={chForm.smtp_user} onChange={e => setChForm({ ...chForm, smtp_user: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                  <div><label className="text-[10px] text-muted">Password</label><input type="password" value={chForm.smtp_pass} onChange={e => setChForm({ ...chForm, smtp_pass: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                  <div><label className="text-[10px] text-muted">From Email</label><input placeholder="noreply@kmitsurat.com" value={chForm.from_email} onChange={e => setChForm({ ...chForm, from_email: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                  <div><label className="text-[10px] text-muted">From Name</label><input placeholder="KMITSURAT System" value={chForm.from_name} onChange={e => setChForm({ ...chForm, from_name: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
                </div>
              </div>
            )}
            {chForm.type === "line_notify" && (
              <div className="rounded-lg bg-background border border-border p-3 mb-4">
                <p className="text-xs text-muted font-semibold mb-2">💚 LINE Notify</p>
                <div><label className="text-[10px] text-muted">LINE Notify Token</label><input placeholder="ได้จาก notify-bot.line.me" value={chForm.line_notify_token} onChange={e => setChForm({ ...chForm, line_notify_token: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono" /></div>
              </div>
            )}
            {chForm.type === "line_messaging" && (
              <div className="rounded-lg bg-background border border-border p-3 mb-4">
                <p className="text-xs text-muted font-semibold mb-2">💬 LINE Messaging API</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted">Channel Access Token</label><input value={chForm.line_channel_token} onChange={e => setChForm({ ...chForm, line_channel_token: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono" /></div>
                  <div><label className="text-[10px] text-muted">Channel Secret</label><input value={chForm.line_channel_secret} onChange={e => setChForm({ ...chForm, line_channel_secret: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono" /></div>
                  <div><label className="text-[10px] text-muted">Group ID (ส่งเข้ากลุ่ม)</label><input value={chForm.line_group_id} onChange={e => setChForm({ ...chForm, line_group_id: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono" /></div>
                </div>
              </div>
            )}
            {chForm.type === "ms_teams" && (
              <div className="rounded-lg bg-background border border-border p-3 mb-4">
                <p className="text-xs text-muted font-semibold mb-2">🟦 Microsoft Teams</p>
                <div><label className="text-[10px] text-muted">Incoming Webhook URL</label><input placeholder="https://xxx.webhook.office.com/..." value={chForm.teams_webhook_url} onChange={e => setChForm({ ...chForm, teams_webhook_url: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono" /></div>
              </div>
            )}
            {chForm.type === "webhook" && (
              <div className="rounded-lg bg-background border border-border p-3 mb-4">
                <p className="text-xs text-muted font-semibold mb-2">🔗 Custom Webhook</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted">Webhook URL</label><input placeholder="https://api.example.com/notify" value={chForm.webhook_url} onChange={e => setChForm({ ...chForm, webhook_url: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1 font-mono" /></div>
                  <div><label className="text-[10px] text-muted">Method</label><select value={chForm.webhook_method} onChange={e => setChForm({ ...chForm, webhook_method: e.target.value as "POST" | "GET" })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="POST">POST</option><option value="GET">GET</option></select></div>
                  <div className="col-span-full"><label className="text-[10px] text-muted">Custom Headers (JSON)</label><textarea placeholder='{"Authorization": "Bearer xxx"}' value={chForm.webhook_headers} onChange={e => setChForm({ ...chForm, webhook_headers: e.target.value })} className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y mt-1 font-mono" /></div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={chForm.active} onChange={e => setChForm({ ...chForm, active: e.target.checked })} /> เปิดใช้งาน</label>
            </div>

            <div className="flex gap-2">
              <button onClick={saveCh} disabled={saving || !chForm.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
              <button onClick={() => { setShowChForm(false); setEditChId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Channel List */}
        {channels.length === 0 ? <p className="text-muted text-sm">ยังไม่มี Channel — กด &quot;+ เพิ่ม Channel&quot; เพื่อตั้งค่า Email, LINE, Teams</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {channels.map(ch => (
              <div key={ch.id} className={`rounded-xl bg-card border ${ch.active ? "border-border" : "border-border opacity-50"} p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{chIcon(ch.type)}</span>
                    <div><p className="font-medium text-sm">{ch.name}</p><p className="text-[10px] text-muted">{chLabel(ch.type)}</p></div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ch.active ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>{ch.active ? "Active" : "Off"}</span>
                </div>
                <div className="text-xs text-muted mb-2">
                  {ch.type === "email" && `SMTP: ${ch.smtp_host || "ยังไม่ตั้งค่า"}`}
                  {ch.type === "line_notify" && `Token: ${ch.line_notify_token ? "***" + ch.line_notify_token.slice(-6) : "ยังไม่ตั้งค่า"}`}
                  {ch.type === "line_messaging" && `Group: ${ch.line_group_id || "ยังไม่ตั้งค่า"}`}
                  {ch.type === "ms_teams" && `Webhook: ${ch.teams_webhook_url ? "✓ ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}`}
                  {ch.type === "webhook" && `URL: ${ch.webhook_url || "ยังไม่ตั้งค่า"}`}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditCh(ch)} className="text-xs text-accent hover:underline">แก้ไข</button>
                  <button onClick={() => deleteCh(ch.id!, ch.name)} className="text-xs text-danger hover:underline">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>)}

      </>)}
    </div>
  );
}
