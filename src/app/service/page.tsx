"use client";
import { useEffect, useRef, useState } from "react";
import type { ServiceTicket, ServiceStatus, Customer, Project, JobRequest, User, Asset, InAppNotification } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import Link from "next/link";
import { ServiceTicketDetail } from "@/components/ServiceTicketDetail";

const svcTypes = ["installation","site_survey","technical_survey","after_sales","repair","pm_service"] as const;
const typeLabels: Record<string, string> = { installation: "Installation", site_survey: "Site Survey", technical_survey: "Technical Survey", after_sales: "After-Sales", repair: "Repair", pm_service: "PM Service" };
const empty = {
  customer_id: "", customer_name: "", project_id: "", project_name: "",
  type: "installation" as ServiceTicket["type"], issue: "", technician: "", service_date: "",
  status: "open" as ServiceStatus,
  priority: "medium" as NonNullable<ServiceTicket["priority"]>,
  service_value: 0, service_cost: 0, gross_profit: 0, hours_spent: 0,
  reported_by: "", report_date: "", report_channel: "phone" as NonNullable<ServiceTicket["report_channel"]>,
  assignment_mode: "individual" as NonNullable<ServiceTicket["assignment_mode"]>,
  target_skill: "", target_area: "",
  sla_response_hours: 4, sla_resolve_hours: 48,
  asset_id: "", km_number: "",
};

const channelLabel: Record<string, string> = { phone: "📞 โทรศัพท์", line: "💬 Line", email: "✉️ อีเมล", walk_in: "🚶 มาที่หน้าร้าน", system: "💻 ระบบ" };
const modeLabel: Record<string, string> = { individual: "👤 ระบุช่าง", all: "📢 ทุกคนในทีม", by_skill: "🛠️ ตามความถนัด", by_area: "📍 ตามพื้นที่" };
const modeIcon: Record<string, string> = { individual: "👤", all: "📢", by_skill: "🛠️", by_area: "📍" };

function parseISO(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}
function hoursBetween(from?: string, to?: string): number | null {
  const a = parseISO(from); const b = parseISO(to);
  if (a === null || b === null) return null;
  return (b - a) / 3600000;
}
function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const statusLabel: Record<string, string> = {
  open: "เปิดใหม่", acknowledged: "รับทราบแล้ว", traveling: "เดินทาง",
  on_site: "ถึงสถานที่", repair_start: "เริ่มซ่อม", in_progress: "กำลังทำ",
  waiting_parts: "รอชิ้นส่วน", resume: "กลับมาทำต่อ", resolved: "แก้ไขแล้ว",
  closed: "ปิดงาน", cancelled: "ยกเลิก", waiting_approval: "รออนุมัติ",
};
const statusIcon: Record<string, string> = {
  open: "🆕", acknowledged: "👁️", traveling: "🚗", on_site: "📍",
  repair_start: "🔧", in_progress: "⚙️", waiting_parts: "📦", resume: "▶️",
  resolved: "✅", closed: "🔒", cancelled: "❌", waiting_approval: "⏳",
};
const statusColor: Record<string, string> = {
  open: "bg-red-900/50 text-red-400",
  acknowledged: "bg-indigo-900/50 text-indigo-400",
  traveling: "bg-orange-900/50 text-orange-400",
  on_site: "bg-amber-900/50 text-amber-400",
  repair_start: "bg-yellow-900/50 text-yellow-300",
  in_progress: "bg-yellow-900/50 text-yellow-400",
  waiting_parts: "bg-purple-900/50 text-purple-400",
  resume: "bg-blue-900/50 text-blue-400",
  resolved: "bg-green-900/50 text-green-400",
  closed: "bg-gray-700 text-gray-300",
  cancelled: "bg-gray-800/80 text-gray-500",
  waiting_approval: "bg-rose-900/50 text-rose-400",
};
const priorityBadge: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-gray-500/20 text-gray-400",
};
const priorityLabel: Record<string, string> = { critical: "🔴 วิกฤต", high: "🟠 สูง", medium: "🟡 ปกติ", low: "🟢 ต่ำ" };

const ALL_STATUSES: ServiceStatus[] = [
  "open","acknowledged","traveling","on_site","repair_start","in_progress",
  "waiting_parts","resume","resolved","closed","cancelled","waiting_approval",
];

// ─── Service view tabs ────────────────────────────────────────────────────────

type ServiceView = "all" | "new" | "doing" | "parts" | "overdue" | "today" | "pm" | "sla" | "waiting" | "history";

const VIEWS: Array<{ id: ServiceView; label: string; icon: string }> = [
  { id: "all",     label: "ทั้งหมด",   icon: "📋" },
  { id: "new",     label: "งานใหม่",   icon: "🆕" },
  { id: "doing",   label: "กำลังทำ",  icon: "⚙️" },
  { id: "overdue", label: "งานค้าง",  icon: "⚠️" },
  { id: "sla",     label: "เกิน SLA",  icon: "🚨" },
  { id: "today",   label: "วันนี้",    icon: "📅" },
  { id: "pm",      label: "PM วันนี้", icon: "🔵" },
  { id: "parts",   label: "รออะไหล่", icon: "📦" },
  { id: "waiting", label: "รอนัด",    icon: "📆" },
  { id: "history", label: "ย้อนหลัง", icon: "📁" },
];

// Quick action buttons per status (Timer system: เปิดงาน→รับงาน→เริ่มงาน→หยุดรอ→ปิดงาน)
function getQuickActions(status: ServiceStatus): Array<{ status: ServiceStatus; label: string; primary: boolean }> {
  switch (status) {
    case "open":         return [{ status: "acknowledged", label: "📲 รับงาน",      primary: true  }, { status: "traveling",    label: "🚗 เดินทาง",   primary: false }];
    case "acknowledged": return [{ status: "traveling",    label: "🚗 เดินทาง",    primary: true  }, { status: "on_site",      label: "📍 ถึงที่แล้ว", primary: false }];
    case "traveling":    return [{ status: "on_site",      label: "📍 ถึงที่แล้ว", primary: true  }];
    case "on_site":      return [{ status: "repair_start", label: "🔧 เริ่มซ่อม",  primary: true  }];
    case "repair_start":
    case "in_progress":
    case "resume":       return [{ status: "resolved",     label: "✅ แก้งานแล้ว", primary: true  }, { status: "waiting_parts", label: "📦 รออะไหล่", primary: false }];
    case "waiting_parts":return [{ status: "resume",       label: "▶️ ทำต่อ",      primary: true  }];
    case "resolved":     return [{ status: "closed",       label: "🔒 ปิดงาน",     primary: true  }];
    default:             return [];
  }
}

// ─── Status Update Modal ─────────────────────────────────────────────────────

type PendingFile = { name: string; dataUrl: string; fileType: "photo" | "document" };

async function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

function StatusUpdateModal({
  ticket, newStatus, onConfirm, onCancel,
}: {
  ticket: ServiceTicket;
  newStatus: ServiceStatus;
  onConfirm: (note: string, files: PendingFile[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);

  async function addFiles(e: React.ChangeEvent<HTMLInputElement>, kind: "photo" | "document") {
    const list = Array.from(e.target.files ?? []);
    const added: PendingFile[] = [];
    for (const f of list) {
      const isImg = f.type.startsWith("image/");
      let dataUrl: string;
      if (isImg) {
        dataUrl = await compressImage(f);
      } else {
        dataUrl = await new Promise(res => {
          const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
        });
      }
      added.push({ name: f.name, dataUrl, fileType: isImg ? "photo" : kind });
    }
    setFiles(prev => [...prev, ...added]);
    e.target.value = "";
  }

  async function confirm() {
    setSaving(true);
    await onConfirm(note, files);
    setSaving(false);
  }

  const label = statusLabel[newStatus] || newStatus;
  const icon  = statusIcon[newStatus]  || "⚙️";
  const color = statusColor[newStatus] || "bg-card text-muted";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[11px] text-muted mb-1">อัปเดตสถานะ — {ticket.customer_name}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{icon} {label}</span>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Memo */}
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-widest block mb-1.5">📝 บันทึก / Memo</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="ระบุสิ่งที่พบ, ขั้นตอนที่ทำ, หรือหมายเหตุ..."
              rows={3}
              className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" />
          </div>

          {/* Upload buttons */}
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-widest block mb-1.5">📎 แนบไฟล์ / รูปภาพ</label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-border hover:border-accent/60 px-3 py-3 text-xs text-muted text-center transition-colors hover:bg-accent/5 flex flex-col items-center gap-1">
                <span className="text-xl">📷</span>
                <span>ถ่าย / เลือกรูป</span>
                <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                  onChange={e => addFiles(e, "photo")} />
              </label>
              <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-border hover:border-accent/60 px-3 py-3 text-xs text-muted text-center transition-colors hover:bg-accent/5 flex flex-col items-center gap-1">
                <span className="text-xl">📄</span>
                <span>แนบไฟล์เอกสาร</span>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" multiple className="hidden"
                  onChange={e => addFiles(e, "document")} />
              </label>
            </div>
          </div>

          {/* Previews */}
          {files.length > 0 && (
            <div>
              <p className="text-[10px] text-muted mb-1.5">ไฟล์ที่จะแนบ ({files.length})</p>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative group">
                    {f.fileType === "photo"
                      ? <img src={f.dataUrl} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                      : <div className="w-16 h-16 rounded-lg border border-border bg-background flex flex-col items-center justify-center gap-0.5 p-1">
                          <span className="text-xl">📄</span>
                          <span className="text-[8px] text-muted truncate w-full text-center leading-tight">{f.name}</span>
                        </div>
                    }
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] hidden group-hover:flex items-center justify-center shadow">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-muted hover:bg-card-hover transition-colors disabled:opacity-50">
            ยกเลิก
          </button>
          <button onClick={confirm} disabled={saving}
            className="flex-[2] rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? "กำลังบันทึก..." : "✓ ยืนยันอัปเดต"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocLinkAdder({ onAdd }: { onAdd: (link: { label: string; url: string }) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  function add() {
    if (!label.trim() || !url.trim()) return;
    onAdd({ label: label.trim(), url: url.trim() });
    setLabel(""); setUrl("");
  }
  return (
    <div className="flex gap-2 flex-wrap pt-2">
      <input placeholder="ชื่อเอกสาร เช่น Network Diagram" value={label} onChange={e => setLabel(e.target.value)}
        className="flex-1 min-w-[140px] rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      <input placeholder="URL (https://...)" value={url} onChange={e => setUrl(e.target.value)}
        className="flex-1 min-w-[200px] rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      <button onClick={add} disabled={!label.trim() || !url.trim()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
        + เพิ่ม
      </button>
    </div>
  );
}

function NotifBell({ myName, notifs, show, setShow, soundEnabled, setSoundEnabled, playSound }: {
  myName: string; notifs: InAppNotification[];
  show: boolean; setShow: (v: boolean) => void;
  soundEnabled: boolean; setSoundEnabled: (v: boolean) => void;
  playSound: () => void;
}) {
  const mine = notifs.filter(n => n.recipients.includes(myName));
  const unread = mine.filter(n => !n.read_by.includes(myName)).length;
  return (
    <div className="relative">
      <button onClick={() => setShow(!show)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted hover:bg-card-hover transition-colors">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
      {show && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold">🔔 การแจ้งเตือน</p>
            <div className="flex items-center gap-2">
              <button onClick={() => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem("svc_notif_sound", next ? "on" : "off"); if (next) playSound(); }}
                title={soundEnabled ? "ปิดเสียงแจ้งเตือน" : "เปิดเสียงแจ้งเตือน"} className="text-sm text-muted hover:text-foreground">
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              {unread > 0 && (
                <button onClick={async () => {
                  const fs = await import("@/lib/firestore");
                  await Promise.all(mine.filter(n => !n.read_by.includes(myName)).map(n =>
                    fs.inAppNotifications.update(n.id!, { read_by: [...n.read_by, myName] })
                  ));
                }} className="text-[10px] text-accent hover:underline">อ่านทั้งหมด</button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {mine.length === 0 && <p className="text-xs text-muted text-center py-6">ไม่มีการแจ้งเตือน</p>}
            {mine.slice(0, 20).map(n => {
              const isRead = n.read_by.includes(myName);
              return (
                <div key={n.id} className={`px-3 py-2.5 hover:bg-card-hover transition-colors ${isRead ? "opacity-60" : "cursor-pointer"}`}
                  onClick={async () => {
                    if (!isRead && myName) {
                      const fs = await import("@/lib/firestore");
                      await fs.inAppNotifications.update(n.id!, { read_by: [...n.read_by, myName] });
                    }
                    setShow(false);
                  }}>
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isRead ? "" : "bg-accent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">{n.title}</p>
                      <p className="text-[10px] text-muted mt-0.5 line-clamp-3">{n.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicePage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [list, setList]               = useState<ServiceTicket[]>([]);
  const [custs, setCusts]             = useState<Customer[]>([]);
  const [projs, setProjs]             = useState<Project[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [svcUsers, setSvcUsers]       = useState<User[]>([]);
  const [assetList, setAssetList]     = useState<Asset[]>([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [typeFilter, setTypeFilter]   = useState("");
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(empty);
  const [saving, setSaving]           = useState(false);
  const [mounted, setMounted]         = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cid = p.get("customer_id"); const cname = p.get("customer_name");
    const pid = p.get("project_id");  const pname = p.get("project_name");
    if (cid || cname) {
      setForm(f => ({ ...f, customer_id: cid||"", customer_name: cname||"", project_id: pid||"", project_name: pname||"" }));
      setShowForm(true);
    }
  }, []);
  // visibility toggles — ห้ามลบ, ใช้เปิด/ปิดใน config อนาคต
  const [showRevenue, setShowRevenue]       = useState(false);
  const [showSlaDetail, setShowSlaDetail]   = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [activeView, setActiveView]         = useState<ServiceView>("all");
  const [managerSection, setManagerSection] = useState<"tickets" | "team" | "assets" | "docs" | "costs" | "analytics" | "report">("tickets");
  const [rptDateFrom, setRptDateFrom] = useState("");
  const [rptDateTo,   setRptDateTo]   = useState("");
  const [rptTech,     setRptTech]     = useState("");
  const [rptStatus,   setRptStatus]   = useState("");
  const [pendingChange, setPendingChange] = useState<{ ticket: ServiceTicket; newStatus: ServiceStatus } | null>(null);
  const [myNotifs, setMyNotifs] = useState<InAppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => typeof window !== "undefined" ? localStorage.getItem("svc_notif_sound") !== "off" : true);
  const prevUnreadRef = useRef(0);
  const [openSect, setOpenSect] = useState<Record<string,boolean>>({});
  function toggleSect(k: string) { setOpenSect(v => ({ ...v, [k]: !v[k] })); }
  function sectOpen(k: string, def = true) { return k in openSect ? openSect[k] : def; }
  const [docLinks, setDocLinks] = useState<{label:string;url:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem("kmit_svc_doclinks") || "[]"); } catch { return []; }
  });
  function saveDocLinks(links: {label:string;url:string}[]) {
    setDocLinks(links);
    try { localStorage.setItem("kmit_svc_doclinks", JSON.stringify(links)); } catch {}
  }

  // no-op — ข้อมูลอัปเดตอัตโนมัติผ่าน onSnapshot subscriptions
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function load() {}

  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    } catch { /* ไม่รองรับ */ }
  }

  useEffect(() => {
    const myName = currentUser?.name ?? "";
    if (!myName) return;
    const unread = myNotifs.filter(n => n.recipients.includes(myName) && !n.read_by.includes(myName)).length;
    if (unread > prevUnreadRef.current && soundEnabled) playNotifSound();
    prevUnreadRef.current = unread;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myNotifs]);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as ServiceView | null;
    if (tab && VIEWS.some(v => v.id === tab)) setActiveView(tab);
    const unsubs: Array<() => void> = [];
    let firstSnap = true;
    (async () => {
      const fs = await import("@/lib/firestore");
      unsubs.push(
        fs.serviceTickets.subscribe(data => {
          setList(data);
          if (firstSnap) { setLoading(false); firstSnap = false; }
        }),
        fs.customers.subscribe(data => setCusts(data)),
        fs.projects.subscribe(data => setProjs(data)),
        fs.jobRequests.subscribe(data => setIncomingReqs(data.filter(j => j.request_to_team === "service"))),
        fs.users.subscribe(data => setSvcUsers(data.filter(x => x.active !== false && (x.role === "service" || x.role === "Service Technician" || x.role === "Service Manager")))),
        fs.assets.subscribe(data => setAssetList(data)),
        fs.inAppNotifications.subscribe(data => setMyNotifs(data.filter(n => n.module === "service"))),
      );
    })();
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownTicketsOnly = isNewRole(currentUser?.role ?? "") && !hasPermission("view_all_tickets");
  const isTechView = ownTicketsOnly;
  const myIdent = currentUser?.name || currentUser?.email || "";
  // รวม tickets ที่ assigned ให้ตัวเอง + tickets ที่ลิ้งกับ job request ที่เราเคยรับ (ป้องกัน name mismatch เก่า)
  const myAcceptedReqIds = new Set(
    incomingReqs
      .filter(r => r.status === "accepted" && (r.accepted_by === myIdent || r.assigned_to === myIdent))
      .map(r => r.id!)
      .filter(Boolean)
  );
  const baseTickets = ownTicketsOnly
    ? list.filter(t => t.technician === myIdent || (t.job_request_id && myAcceptedReqIds.has(t.job_request_id)))
    : list;
  const canSeeFinance = hasPermission("view_finance");
  const custMap = new Map(custs.map(c => [c.id, c]));

  const today  = todayStr();
  const nowMs  = Date.now();
  const isActive = (st: ServiceStatus) => !["resolved","closed","cancelled"].includes(st);

  const viewBase = (() => {
    switch (activeView) {
      case "new":     return baseTickets.filter(t => ["open","acknowledged"].includes(t.status));
      case "doing":   return baseTickets.filter(t => ["traveling","on_site","repair_start","in_progress","resume"].includes(t.status));
      case "parts":   return baseTickets.filter(t => t.status === "waiting_parts");
      case "overdue": return baseTickets.filter(t => isActive(t.status) && !!t.service_date && t.service_date < today);
      case "today":   return baseTickets.filter(t => t.service_date === today && isActive(t.status));
      case "pm":      return baseTickets.filter(t => t.type === "pm_service" && t.service_date === today);
      case "sla":     return baseTickets.filter(t => {
        if (!isActive(t.status) || !t.opened_at) return false;
        return (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 > (t.sla_resolve_hours || 48);
      });
      case "waiting": return baseTickets.filter(t => isActive(t.status) && !!t.service_date && t.service_date > today);
      case "history": return baseTickets.filter(t => ["resolved","closed"].includes(t.status));
      default:        return baseTickets.filter(t => isActive(t.status));
    }
  })();

  const filtered = viewBase.filter((t) => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.issue.toLowerCase().includes(s) || t.customer_name.toLowerCase().includes(s)
      || (t.km_number || "").toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchType   = !typeFilter || t.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  const overdueList = list.filter(t => t.service_date && t.service_date < today && isActive(t.status));
  const todayList   = list.filter(t => t.service_date === today && isActive(t.status));
  const stats = {
    total:      list.length,
    open:       list.filter(t => t.status === "open").length,
    inProgress: list.filter(t => t.status === "in_progress").length,
    resolved:   list.filter(t => t.status === "resolved").length,
    closed:     list.filter(t => t.status === "closed").length,
    overdue:    overdueList.length,
    today:      todayList.length,
    pendingReqs: incomingReqs.filter(r => r.status === "pending").length,
    pmCount:    list.filter(t => t.type === "pm_service" && isActive(t.status)).length,
  };

  // ── Workload (existing — kept for Revenue section) ───────────────────────────
  const workload = svcUsers.map(u => ({
    name: u.name,
    active: list.filter(t => t.technician === u.name && isActive(t.status)).length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active).slice(0, 5);

  // ── Revenue / Profit (HIDDEN BY DEFAULT — ห้ามลบ) ──────────────────────────
  const completed = list.filter(t => t.status === "resolved" || t.status === "closed");
  const pending   = list.filter(t => isActive(t.status));
  const sumValue  = (arr: ServiceTicket[]) => arr.reduce((s, t) => s + (t.service_value || 0), 0);
  const sumProfit = (arr: ServiceTicket[]) => arr.reduce((s, t) => s + (t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))), 0);
  const completedRevenue = sumValue(completed);
  const completedProfit  = sumProfit(completed);
  const completedGP      = completedRevenue > 0 ? (completedProfit / completedRevenue * 100) : 0;
  const pendingRevenue   = sumValue(pending);
  const pendingProfit    = sumProfit(pending);
  const currentMonth     = today.slice(0, 7);
  const monthCompleted   = completed.filter(t => (t.service_date || "").slice(0, 7) === currentMonth);
  const monthRevenue     = sumValue(monthCompleted);
  const monthProfit      = sumProfit(monthCompleted);
  const techRevenue = svcUsers.map(u => {
    const mine = completed.filter(t => t.technician === u.name);
    const rev = sumValue(mine); const profit = sumProfit(mine);
    return { name: u.name, jobs: mine.length, revenue: rev, profit, gp: rev > 0 ? (profit / rev * 100) : 0 };
  }).filter(t => t.revenue > 0 || t.jobs > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const typeRevenue = svcTypes.map(tt => {
    const mine = completed.filter(t => t.type === tt);
    const rev = sumValue(mine); const profit = sumProfit(mine);
    return { type: tt, label: typeLabels[tt], jobs: mine.length, revenue: rev, profit, gp: rev > 0 ? (profit / rev * 100) : 0 };
  }).filter(x => x.revenue > 0 || x.jobs > 0).sort((a, b) => b.revenue - a.revenue);

  // ── SLA Analysis (HIDDEN BY DEFAULT — ห้ามลบ) ──────────────────────────────
  const ticketsWithAccept  = list.filter(t => t.opened_at && t.accepted_at);
  const responseHours      = ticketsWithAccept.map(t => hoursBetween(t.opened_at, t.accepted_at) ?? 0);
  const avgResponse        = responseHours.length > 0 ? avg(responseHours) : null;
  const ticketsWithResolve = list.filter(t => t.opened_at && t.resolved_at);
  const resolveHours       = ticketsWithResolve.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
  const avgResolve         = resolveHours.length > 0 ? avg(resolveHours) : null;
  const overdueAccept = list.filter(t => {
    if (t.status !== "open" || !t.opened_at) return false;
    const sla = t.sla_response_hours || 4;
    const h = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000;
    return h > sla;
  });
  const slaBreachedResolve = list.filter(t => {
    if (!t.opened_at || !t.resolved_at) return false;
    const h = hoursBetween(t.opened_at, t.resolved_at);
    return h !== null && h > (t.sla_resolve_hours || 48);
  });
  const techResponse = svcUsers.map(u => {
    const mine = ticketsWithAccept.filter(t => (t.accepted_by || t.technician) === u.name);
    const hours = mine.map(t => hoursBetween(t.opened_at, t.accepted_at) ?? 0);
    return { name: u.name, count: mine.length, avgHours: hours.length > 0 ? avg(hours) : 0 };
  }).filter(x => x.count > 0).sort((a, b) => b.avgHours - a.avgHours);
  const typeResolve = svcTypes.map(tt => {
    const mine = ticketsWithResolve.filter(t => t.type === tt);
    const hours = mine.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
    return { type: tt, label: typeLabels[tt], count: mine.length, avgHours: hours.length > 0 ? avg(hours) : 0, maxHours: hours.length > 0 ? Math.max(...hours) : 0, slaTarget: 48 };
  }).filter(x => x.count > 0).sort((a, b) => b.avgHours - a.avgHours);

  // ── NEW: Dashboard enhancements ──────────────────────────────────────────────
  const unassigned = list.filter(t => t.status === "open" && !t.technician && t.assignment_mode === "individual");

  const workloadDetailed = svcUsers.map(u => ({
    name:    u.name,
    active:  list.filter(t => t.technician === u.name && isActive(t.status)).length,
    overdue: list.filter(t => t.technician === u.name && isActive(t.status) && t.service_date && t.service_date < today).length,
    waitSla: overdueAccept.filter(t => t.technician === u.name).length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active);

  const next14Str = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })();
  const pmUpcoming = list.filter(t =>
    t.type === "pm_service" && isActive(t.status) && t.service_date && t.service_date >= today && t.service_date <= next14Str
  ).sort((a, b) => (a.service_date || "").localeCompare(b.service_date || ""));

  const slaOnTimeCount = ticketsWithResolve.filter(t => {
    const h = hoursBetween(t.opened_at, t.resolved_at);
    return h !== null && h <= (t.sla_resolve_hours || 48);
  }).length;
  const slaOnTimeRate = ticketsWithResolve.length > 0
    ? Math.round(slaOnTimeCount / ticketsWithResolve.length * 100)
    : null;

  const typeActive = {
    repair:  list.filter(t => t.type === "repair"            && isActive(t.status)).length,
    pm:      list.filter(t => t.type === "pm_service"        && isActive(t.status)).length,
    install: list.filter(t => t.type === "installation"      && isActive(t.status)).length,
    survey:  list.filter(t => (t.type === "site_survey" || t.type === "technical_survey") && isActive(t.status)).length,
    after:   list.filter(t => t.type === "after_sales"       && isActive(t.status)).length,
  };

  // ── Team Performance ────────────────────────────────────────────────────────
  const teamPerf = svcUsers.map(u => {
    const mine       = list.filter(t => t.technician === u.name);
    const myActive   = mine.filter(t => isActive(t.status));
    const withRes    = mine.filter(t => t.opened_at && t.resolved_at);
    const onTime     = withRes.filter(t => { const h = hoursBetween(t.opened_at, t.resolved_at); return h !== null && h <= (t.sla_resolve_hours || 48); });
    const closeHrs   = withRes.map(t => hoursBetween(t.opened_at, t.resolved_at) ?? 0);
    return {
      name:      u.name,
      active:    myActive.length,
      resolved:  mine.filter(t => ["resolved","closed"].includes(t.status)).length,
      overdue:   myActive.filter(t => t.service_date && t.service_date < today).length,
      waitParts: myActive.filter(t => t.status === "waiting_parts").length,
      slaRate:   withRes.length > 0 ? Math.round(onTime.length / withRes.length * 100) : null,
      avgClose:  closeHrs.length > 0 ? avg(closeHrs) : null,
      repair:    mine.filter(t => t.type === "repair").length,
    };
  }).filter(u => u.active > 0 || u.resolved > 0).sort((a, b) => b.active - a.active);

  // ── Cost Data ───────────────────────────────────────────────────────────────
  const totalCost    = list.reduce((s, t) => s + (t.service_cost || 0), 0);
  const monthCost    = list.filter(t => (t.service_date || "").startsWith(currentMonth)).reduce((s, t) => s + (t.service_cost || 0), 0);
  const costPerTech  = svcUsers.map(u => {
    const mine = list.filter(t => t.technician === u.name);
    const cost = mine.reduce((s, t) => s + (t.service_cost || 0), 0);
    return { name: u.name, cost, jobs: mine.length, avgCost: mine.length > 0 ? cost / mine.length : 0 };
  }).filter(u => u.jobs > 0).sort((a, b) => b.cost - a.cost);

  // ── Analytics ───────────────────────────────────────────────────────────────
  const repeatCusts = Object.entries(
    list.reduce((acc: Record<string, number>, t) => {
      if (t.customer_name) acc[t.customer_name] = (acc[t.customer_name] || 0) + 1;
      return acc;
    }, {})
  ).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const slaBreachActive = list.filter(t => {
    if (!isActive(t.status) || !t.opened_at) return false;
    return (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 > (t.sla_resolve_hours || 48);
  }).sort((a, b) => (nowMs - (parseISO(b.opened_at)||nowMs)) - (nowMs - (parseISO(a.opened_at)||nowMs)));

  const pendingApproval = list.filter(t => t.status === "waiting_approval");
  const waitingCust     = list.filter(t => t.status === "waiting_approval" && isActive(t.status));
  const pmMaActive      = list.filter(t => (t.type === "pm_service" || t.type === "after_sales") && isActive(t.status));
  const reworkList      = list.filter(t => {
    if (t.type !== "repair" || !isActive(t.status)) return false;
    const cutoff = new Date(nowMs - 30 * 24 * 3600_000).toISOString();
    return list.some(p => p.id !== t.id && p.customer_id === t.customer_id &&
      ["resolved","closed"].includes(p.status) && (p.resolved_at || "") > cutoff);
  });

  // Tickets with no status update in >48h
  const noUpdateTickets = list.filter(t => {
    if (!isActive(t.status)) return false;
    const history = t.status_history;
    const refTs = history?.length
      ? parseISO(history[history.length - 1].timestamp)
      : parseISO(t.opened_at);
    if (refTs === null) return false;
    return (nowMs - refTs) / 3600000 > 48;
  });

  // Last activity timestamp per technician
  const techLastActivity: Record<string, number> = {};
  for (const u of svcUsers) {
    let latestMs = 0;
    for (const t of list.filter(x => x.technician === u.name)) {
      const h = t.status_history;
      if (h?.length) {
        const ts = parseISO(h[h.length - 1].timestamp);
        if (ts && ts > latestMs) latestMs = ts;
      }
    }
    techLastActivity[u.name] = latestMs;
  }

  // Asset failure frequency (from ticket data)
  const assetTicketMap: Record<string, { km: string; model: string; sn: string; cust: string; count: number; repairCount: number; lastDate: string }> = {};
  for (const t of list) {
    if (!t.asset_id) continue;
    const a = assetList.find(x => x.id === t.asset_id);
    if (!assetTicketMap[t.asset_id]) {
      assetTicketMap[t.asset_id] = {
        km: a?.km_number || t.asset_id, model: a?.device_model || "",
        sn: a?.serial_number || "", cust: t.customer_name,
        count: 0, repairCount: 0, lastDate: "",
      };
    }
    assetTicketMap[t.asset_id].count++;
    if (t.type === "repair") assetTicketMap[t.asset_id].repairCount++;
    if (t.service_date && t.service_date > assetTicketMap[t.asset_id].lastDate)
      assetTicketMap[t.asset_id].lastDate = t.service_date;
  }
  const frequentlyBroken = Object.values(assetTicketMap)
    .filter(x => x.repairCount >= 2).sort((a, b) => b.repairCount - a.repairCount).slice(0, 10);
  const highTicketAssets = Object.values(assetTicketMap)
    .filter(x => x.count >= 3).sort((a, b) => b.count - a.count).slice(0, 8);

  function exportCSV() {
    const rows = [
      ["ID","Type","Customer","Technician","Status","Priority","Date","SLA(h)","Cost","Value"],
      ...list.map(t => [t.id||"", typeLabels[t.type]||"", t.customer_name||"", t.technician||"",
        statusLabel[t.status]||"", t.priority||"", t.service_date||"",
        String(t.sla_resolve_hours||48), String(t.service_cost||0), String(t.service_value||0)])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `service_tickets_${today}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  // ── Report tab: filtered rows with duration fields ──────────────────────────
  const reportRows = (() => {
    let rows = baseTickets;
    if (rptDateFrom) rows = rows.filter(t => (t.opened_at || t.service_date || "") >= rptDateFrom);
    if (rptDateTo)   rows = rows.filter(t => (t.opened_at || t.service_date || "").slice(0,10) <= rptDateTo);
    if (rptTech)     rows = rows.filter(t => t.technician === rptTech);
    if (rptStatus)   rows = rows.filter(t => t.status === rptStatus);
    return rows.map(t => {
      const r = t as unknown as Record<string,unknown>;
      const finishedAt = (r.resolved_at as string|undefined) || (r.closed_at as string|undefined) || "";
      const dh = t.opened_at && finishedAt
        ? Math.round((new Date(finishedAt).getTime() - new Date(t.opened_at).getTime()) / 3600000 * 10) / 10
        : null;
      const responseHours = hoursBetween(t.opened_at, r.accepted_at as string|undefined);
      const slaRespOk = responseHours !== null && t.sla_response_hours
        ? responseHours <= t.sla_response_hours ? "✅ ผ่าน" : "❌ เกิน" : "—";
      const slaResOk  = dh !== null && t.sla_resolve_hours
        ? dh <= t.sla_resolve_hours ? "✅ ผ่าน" : "❌ เกิน" : finishedAt ? "— (ไม่กำหนด)" : "🔄 ยังไม่จบ";
      return { ...t, finishedAt, durationHours: dh, durationDays: dh !== null ? Math.round(dh/24*10)/10 : null, responseHours, slaRespOk, slaResOk };
    });
  })();

  function exportReportCSV() {
    const hdr = ["Customer","Type","Technician","Status","Priority","วันรับแจ้ง","Service Date","วันจบงาน","Response(ชม.)","ระยะเวลา(ชม.)","ระยะเวลา(วัน)","ชม.ทำงาน","Value(THB)","GP(THB)","SLA Response","SLA Resolve"];
    const data = reportRows.map(t => [
      t.customer_name||"", typeLabels[t.type]||t.type, t.technician||"",
      statusLabel[t.status]||t.status, t.priority||"",
      t.opened_at?.slice(0,16)||"", t.service_date||"", t.finishedAt?.slice(0,16)||"",
      t.responseHours ?? "", t.durationHours ?? "", t.durationDays ?? "",
      t.hours_spent||"", t.service_value||0, t.gross_profit||0,
      t.slaRespOk, t.slaResOk,
    ]);
    const csv = [hdr,...data].map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`service_team_report_${today}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  async function exportReportExcel() {
    const XLSX = await import("xlsx");
    const hdr = ["Customer","Type","Technician","Status","Priority","วันรับแจ้ง","Service Date","วันจบงาน","Response(ชม.)","ระยะเวลา(ชม.)","ระยะเวลา(วัน)","ชม.ทำงาน","Value(THB)","GP(THB)","SLA Response","SLA Resolve"];
    const data = reportRows.map(t => [
      t.customer_name||"", typeLabels[t.type]||t.type, t.technician||"",
      statusLabel[t.status]||t.status, t.priority||"",
      t.opened_at?.slice(0,16)||"", t.service_date||"", t.finishedAt?.slice(0,16)||"",
      t.responseHours ?? "", t.durationHours ?? "", t.durationDays ?? "",
      t.hours_spent||"", t.service_value||0, t.gross_profit||0,
      t.slaRespOk, t.slaResOk,
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([hdr,...data]);
    ws["!cols"] = hdr.map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb, ws, "Service Report");
    XLSX.writeFile(wb, `service_team_report_${today}.xlsx`);
  }

  function exportReportPDF() {
    const hdr = ["Customer","Type","Tech","Status","รับแจ้ง","จบงาน","ระยะเวลา(ชม.)","ระยะเวลา(วัน)","SLA Resolve"];
    const th = hdr.map(h=>`<th>${h}</th>`).join("");
    const trs = reportRows.map(t=>`<tr>
      <td>${t.customer_name||""}</td><td>${typeLabels[t.type]||t.type}</td><td>${t.technician||""}</td>
      <td>${statusLabel[t.status]||t.status}</td>
      <td>${t.opened_at?.slice(0,16)||"—"}</td><td>${t.finishedAt?.slice(0,16)||"—"}</td>
      <td>${t.durationHours ?? "—"}</td><td>${t.durationDays ?? "—"}</td><td>${t.slaResOk}</td>
    </tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Team Report</title>
<style>body{font-family:"Segoe UI",sans-serif;font-size:10px;margin:20px}h2{font-size:14px}
table{width:100%;border-collapse:collapse}thead th{background:#0e1e3c;color:#fff;padding:6px 8px;text-align:left;font-size:9px}
td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:9px}tr:nth-child(even) td{background:#f8fafc}
@media print{body{margin:0}}</style></head>
<body><h2>Service Team Report</h2>
<p style="font-size:9px;color:#666">Export: ${new Date().toLocaleString("th-TH")} &nbsp;|&nbsp; ${reportRows.length} รายการ</p>
<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
    const w = window.open("","_blank");
    if (!w){alert("กรุณาอนุญาต Pop-up");return;}
    w.document.write(html); w.document.close(); w.print();
  }

  // ── Handler functions (unchanged) ────────────────────────────────────────────
  async function confirmStatusChange(note: string, files: PendingFile[]) {
    if (!pendingChange) return;
    const { ticket, newStatus } = pendingChange;
    await changeStatus(ticket, newStatus, undefined, note || undefined);
    if (files.length > 0) {
      const { serviceAttachments } = await import("@/lib/firestore");
      await Promise.all(files.map(f =>
        serviceAttachments.add({
          ticket_id: ticket.id!,
          type: f.fileType === "photo" ? "photo" : "document",
          name: f.name,
          url: f.dataUrl,
          notes: note.trim(),
          created_by: currentUser?.name || "",
        })
      ));
    }
    setPendingChange(null);
  }

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm(f => ({ ...f, customer_id: id, customer_name: c?.company_name || "", asset_id: "", km_number: "" })); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm(f => ({ ...f, project_id: id, project_name: p?.name || "" })); }
  function selectAsset(id: string) {
    if (!id) { setForm(f => ({ ...f, asset_id: "", km_number: "" })); return; }
    const a = assetList.find(x => x.id === id);
    if (!a) return;
    setForm(f => ({ ...f, asset_id: id, km_number: a.km_number ?? "", customer_id: f.customer_id || a.customer_id, customer_name: f.customer_name || a.customer_name }));
  }
  function updateMoney(field: "service_value" | "service_cost" | "hours_spent", val: number) {
    const next = { ...form, [field]: val };
    next.gross_profit = (next.service_value || 0) - (next.service_cost || 0);
    setForm(next);
  }
  async function handleSave() {
    if (!form.issue.trim()) return; setSaving(true);
    const { serviceTickets } = await import("@/lib/firestore");
    const now = new Date().toISOString();
    // ธุรการ/Manager เปิดงานพร้อมระบุช่าง → auto-accept ทันที ไม่ต้องรอช่างกดรับ
    const autoAccept = !isTechView && !!form.technician.trim();
    const initStatus = autoAccept ? "acknowledged" : form.status;
    const initHistory = autoAccept
      ? [
          { status: "open",         timestamp: now, by: currentUser?.name || "", note: "เปิดงาน" },
          { status: "acknowledged", timestamp: now, by: currentUser?.name || "", note: `มอบหมายช่าง: ${form.technician}` },
        ]
      : [{ status: form.status, timestamp: now, by: currentUser?.name || "", note: "สร้าง Ticket" }];
    const payload = {
      ...form,
      status: initStatus,
      gross_profit: (form.service_value || 0) - (form.service_cost || 0),
      opened_at: now,
      ...(autoAccept ? { accepted_at: now, accepted_by: currentUser?.name || "" } : {}),
      status_history: initHistory,
    };
    try {
      await serviceTickets.add(payload as unknown as Record<string, unknown>);
      try { const { logActivity } = await import("@/lib/firestore"); await logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "create", module: "service", resource_name: form.issue, details: `สร้าง Ticket: ${form.customer_name}` }); } catch {}
      setForm(empty); setShowForm(false); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { serviceTickets } = await import("@/lib/firestore"); await serviceTickets.remove(id); await load(); }
  async function changeStatus(t: ServiceTicket, newStatus: ServiceStatus, who?: string, note?: string) {
    if (newStatus === t.status) return;
    const { serviceTickets } = await import("@/lib/firestore");
    const { arrayUnion } = await import("firebase/firestore");
    const now = new Date().toISOString();
    const by = who || currentUser?.name || "";
    const histEntry: Record<string, string> = { status: newStatus, timestamp: now, by };
    if (note) histEntry.note = note;

    const update: Record<string, unknown> = {
      status: newStatus,
      status_history: arrayUnion(histEntry),
    };
    if (!t.opened_at) update.opened_at = now;

    // Extended status → timestamp field mapping
    const tsMap: Partial<Record<ServiceStatus, string>> = {
      acknowledged: "acknowledged_at", traveling: "traveling_at",
      on_site: "on_site_at", repair_start: "repair_start_at",
      waiting_parts: "waiting_parts_at", resume: "resume_at",
      cancelled: "cancelled_at", waiting_approval: "waiting_approval_at",
    };
    if (tsMap[newStatus]) update[tsMap[newStatus]!] = now;

    // Legacy compat timestamps
    const acceptTriggers: ServiceStatus[] = ["acknowledged","in_progress","repair_start","traveling","on_site","resolved","closed","waiting_approval"];
    if (acceptTriggers.includes(newStatus) && !t.accepted_at) {
      update.accepted_at = now;
      if (by && !t.accepted_by) update.accepted_by = by;
    }
    const startTriggers: ServiceStatus[] = ["in_progress","repair_start","on_site","resolved","closed"];
    if (startTriggers.includes(newStatus) && !t.started_at) update.started_at = now;
    if (["resolved","closed"].includes(newStatus) && !t.resolved_at) update.resolved_at = now;
    if (newStatus === "closed" && !t.closed_at) update.closed_at = now;

    await serviceTickets.update(t.id!, update);
    if (selectedTicket?.id === t.id) setSelectedTicket({ ...t, ...update, status_history: [...(t.status_history || []), histEntry as unknown as import("@/lib/types").ServiceStatusHistory] });
    await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Service Control Center
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">

      {/* ── Job Requests from Sales (ทุก Role เห็นเหมือนกัน) ── */}
      {incomingReqs.length > 0 && (() => {
        const pending  = incomingReqs.filter(r => r.status === "pending");
        const accepted = incomingReqs.filter(r => r.status === "accepted");
        const rejected = incomingReqs.filter(r => r.status === "rejected");
        const showDone = sectOpen("req_done", false);
        const priorityStyle = (p: string) =>
          p === "urgent" ? "bg-red-900/50 text-red-400" :
          p === "high"   ? "bg-amber-900/50 text-amber-400" :
                           "bg-blue-900/50 text-blue-400";

        async function acceptReq(r: JobRequest, techName: string, acceptNote: string) {
          const myName = currentUser?.name || currentUser?.email || "";
          const now = new Date().toISOString();
          const { jobRequests, serviceTickets } = await import("@/lib/firestore");
          await jobRequests.update(r.id!, {
            status: "accepted",
            assigned_to: techName,
            accept_note: acceptNote || undefined,
            accepted_by: myName,
            accepted_at: now,
          });
          const initHistory = [{ status: "open", timestamp: now, by: myName, note: `รับงานจาก Sales: ${r.title}${acceptNote ? ` · ${acceptNote}` : ""}` }];
          await serviceTickets.add({
            customer_id: r.customer_id || "",
            customer_name: r.customer_name || "",
            project_id: r.project_id || "",
            project_name: r.project_name || "",
            type: "after_sales",
            issue: r.title + (r.description ? `\n${r.description}` : ""),
            technician: techName,
            service_date: now.slice(0, 10),
            status: "open",
            priority: (r.priority === "urgent" || r.priority === "high") ? r.priority : "medium",
            service_value: 0, service_cost: 0, gross_profit: 0, hours_spent: 0,
            reported_by: r.request_from || "",
            report_date: now.slice(0, 10),
            report_channel: "system",
            assignment_mode: "individual",
            target_skill: "", target_area: "",
            sla_response_hours: 4, sla_resolve_hours: 48,
            asset_id: "", km_number: "",
            opened_at: now,
            status_history: initHistory,
            job_request_id: r.id || "",
          } as unknown as Record<string, unknown>);
          // ไปที่ "งานใหม่" ทันที
          setActiveView("new");
        }

        return (
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">📥 Task จาก Sales ({pending.length} รอรับ)</h3>
              <div className="flex gap-2 text-[10px] items-center">
                {accepted.length > 0 && (
                  <button onClick={() => toggleSect("req_done")} className="rounded-full bg-green-900/40 text-green-400 px-2 py-0.5 hover:bg-green-900/60">
                    {accepted.length} รับแล้ว {showDone ? "▲" : "▼"}
                  </button>
                )}
                {rejected.length > 0 && (
                  <button onClick={() => toggleSect("req_done")} className="rounded-full bg-slate-700/50 text-slate-400 px-2 py-0.5 hover:bg-slate-700/70">
                    {rejected.length} ปฏิเสธ {showDone ? "▲" : "▼"}
                  </button>
                )}
              </div>
            </div>

            {/* Pending only */}
            {pending.length === 0 && (
              <p className="text-xs text-muted text-center py-2">ไม่มีงานรอรับ</p>
            )}
            <div className="space-y-2">
              {pending.map(r => (
                <div key={r.id} className="rounded-lg border border-rose-800/50 bg-rose-900/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium">{r.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityStyle(r.priority || "medium")}`}>{r.priority}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-900/50 text-rose-400">รอรับงาน</span>
                      </div>
                      {r.description && <p className="text-xs text-muted mb-1 line-clamp-2">{r.description}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
                        <span>จาก: <span className="text-foreground">{r.request_from}</span></span>
                        {r.customer_name && <span>ลูกค้า: <span className="text-foreground">{r.customer_name}</span></span>}
                        {r.due_date && <span>กำหนด: <span className="text-foreground">{r.due_date}</span></span>}
                      </div>
                    </div>
                    {isTechView ? (
                      <button onClick={() => acceptReq(r, myIdent, "")}
                        className="shrink-0 text-[11px] font-semibold bg-green-800/60 text-green-300 rounded-lg px-3 py-1.5 hover:bg-green-700/70 border border-green-700/40">
                        ✓ รับงาน
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <select id={`svc-assign-${r.id}`} defaultValue="" className="rounded bg-background border border-border px-2 py-1 text-xs">
                          <option value="">-- มอบหมายช่าง --</option>
                          {svcUsers.map(u => <option key={u.id} value={u.name}>{u.nickname || u.name}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={async () => {
                            const assignTo = (document.getElementById(`svc-assign-${r.id}`) as HTMLSelectElement)?.value;
                            const note = prompt("หมายเหตุรับงาน (ไม่บังคับ)") || "";
                            const techName = assignTo || myIdent;
                            await acceptReq(r, techName, note);
                          }} className="flex-1 text-[10px] bg-green-800/50 text-green-400 rounded px-2 py-1 hover:bg-green-800">✓ รับงาน</button>
                          <button onClick={async () => {
                            const reason = prompt("เหตุผลที่ปฏิเสธ:");
                            if (!reason) return;
                            const { jobRequests } = await import("@/lib/firestore");
                            await jobRequests.update(r.id!, { status: "rejected", reject_reason: reason });
                          }} className="flex-1 text-[10px] bg-red-800/50 text-red-400 rounded px-2 py-1 hover:bg-red-800">✗ ปฏิเสธ</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Accepted / Rejected — collapsed by default */}
            {showDone && (accepted.length > 0 || rejected.length > 0) && (
              <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                {[...accepted, ...rejected].map(r => {
                  const isAccepted = r.status === "accepted";
                  const acceptedTime = r.accepted_at
                    ? new Date(r.accepted_at).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                    : null;
                  return (
                    <div key={r.id} className={`rounded-lg border p-2.5 ${isAccepted ? "border-green-800/30 bg-green-900/5" : "border-border bg-background/50 opacity-60"}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-medium flex-1 min-w-0 truncate">{r.title}</p>
                        {isAccepted ? (
                          <span className="text-[10px] text-green-400 font-semibold shrink-0">✅ {r.accepted_by} {acceptedTime && `· ${acceptedTime}`}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0">✗ ปฏิเสธ{r.reject_reason ? ` · ${r.reject_reason}` : ""}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Header — role-aware ── */}
      {isTechView ? (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">🔧 งานของฉัน</h1>
              <p className="text-xs text-muted">สวัสดี {currentUser?.nickname || currentUser?.name} · งาน Service ที่รับผิดชอบ</p>
            </div>
            <div className="flex gap-2 items-center">
              <NotifBell myName={currentUser?.name ?? ""} notifs={myNotifs} show={showNotifPanel} setShow={setShowNotifPanel} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} playSound={playNotifSound} />
              <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
                {showForm ? "Cancel" : "+ New Ticket"}
              </button>
            </div>
          </div>
          {!loading && (() => {
            const myActive  = baseTickets.filter(t => isActive(t.status));
            const myNew     = baseTickets.filter(t => ["open","acknowledged"].includes(t.status));
            const myDoing   = baseTickets.filter(t => ["traveling","on_site","repair_start","in_progress","resume"].includes(t.status));
            const myParts   = baseTickets.filter(t => t.status === "waiting_parts");
            const myToday   = baseTickets.filter(t => t.service_date === today && isActive(t.status));
            const myOverdue = baseTickets.filter(t => isActive(t.status) && !!t.service_date && t.service_date < today);
            const myPm      = baseTickets.filter(t => t.type === "pm_service" && t.service_date === today);
            const mySla     = baseTickets.filter(t => {
              if (!isActive(t.status) || !t.opened_at) return false;
              return (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 > (t.sla_resolve_hours || 48);
            });
            const myUrgent  = baseTickets.filter(t => isActive(t.status) && (t.priority === "critical" || t.priority === "high"));
            return (
              <>
                {/* Row 1 — Priority actions (ต้องทำทันที) */}
                <p className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-1.5">⚡ ต้องทำทันที</p>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {([
                    { id: "today"   as ServiceView, icon: "📅", label: "วันนี้",    v: myToday.length,   cls: "text-amber-400",  bg: "border-amber-800/40 bg-amber-900/10"  },
                    { id: "overdue" as ServiceView, icon: "⚠️", label: "งานค้าง", v: myOverdue.length, cls: "text-red-400",    bg: "border-red-800/50 bg-red-900/10"      },
                    { id: "sla"     as ServiceView, icon: "🚨", label: "SLA หลุด", v: mySla.length,    cls: "text-rose-400",   bg: "border-rose-800/50 bg-rose-900/10"    },
                    { id: "pm"      as ServiceView, icon: "🔵", label: "PM วันนี้", v: myPm.length,    cls: "text-blue-400",   bg: "border-blue-800/40 bg-blue-900/10"    },
                  ]).map(k => (
                    <button key={k.id} onClick={() => setActiveView(k.id)}
                      className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.01] active:scale-100 ${k.v > 0 ? k.bg : "border-border bg-card"} ${activeView === k.id ? "ring-1 ring-accent/60" : ""}`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-base leading-none">{k.icon}</span>
                        <p className={`text-xl font-bold tabular-nums ${k.v > 0 ? k.cls : "text-muted"}`}>{k.v}</p>
                      </div>
                      <p className="text-[10px] text-muted">{k.label}</p>
                    </button>
                  ))}
                </div>

                {/* Row 2 — Status overview (informational) */}
                <p className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-1.5">สถานะงานทั้งหมด</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {([
                    { icon: "🔧", label: "Active",    v: myActive.length,  cls: "text-accent",     bg: "border-accent/30 bg-accent/5"       },
                    { icon: "🆕", label: "งานใหม่",  v: myNew.length,     cls: "text-red-400",    bg: "border-red-800/30 bg-red-900/5"     },
                    { icon: "⚙️", label: "กำลังทำ", v: myDoing.length,   cls: "text-yellow-400", bg: "border-yellow-800/30 bg-yellow-900/5" },
                    { icon: "📦", label: "รออะไหล่", v: myParts.length,   cls: "text-purple-400", bg: "border-purple-800/30 bg-purple-900/5" },
                  ]).map(k => (
                    <div key={k.label} className={`rounded-xl border p-2.5 ${k.v > 0 ? k.bg : "border-border bg-card"}`}>
                      <p className={`text-lg font-bold tabular-nums ${k.v > 0 ? k.cls : "text-muted"}`}>{k.v}</p>
                      <p className="text-[10px] text-muted mt-0.5">{k.icon} {k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Alert strip for urgent + SLA breach */}
                {(myUrgent.length > 0 || mySla.length > 0 || myOverdue.length > 0) && (
                  <div className="rounded-xl border border-red-800/50 bg-red-900/10 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="text-xs font-bold text-red-400 shrink-0">⚡ ด่วน</span>
                    {myUrgent.length > 0 && <span className="text-xs font-semibold text-red-300">🔴 {myUrgent.length} งานด่วน/วิกฤต</span>}
                    {mySla.length > 0 && <span className="text-xs font-semibold text-rose-400">🚨 {mySla.length} เกิน SLA</span>}
                    {myOverdue.length > 0 && <span className="text-xs font-semibold text-amber-400">⚠ {myOverdue.length} เลยกำหนด</span>}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="mb-4">
          {/* Manager header row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">🎛️ Service Command Center</h1>
              <p className="text-xs text-muted">สวัสดี {currentUser?.nickname || currentUser?.name} · {new Date().toLocaleDateString("th-TH",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
            </div>
            <div className="flex gap-2 items-center">
              <NotifBell myName={currentUser?.name ?? ""} notifs={myNotifs} show={showNotifPanel} setShow={setShowNotifPanel} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} playSound={playNotifSound} />
              <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover shrink-0">
                {showForm ? "Cancel" : "+ New Ticket"}
              </button>
            </div>
          </div>

          {/* 8-card quick overview — always visible */}
          {!loading && (
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {[
                { label:"งานเปิด",      n:list.filter(t=>isActive(t.status)).length,                icon:"📋", c:"text-accent",    bg:"border-accent/30 bg-accent/5",                                             onClick:()=>{setManagerSection("tickets");setActiveView("all");setStatusFilter("all");} },
                { label:"เกิน SLA",    n:slaBreachActive.length,                                   icon:"🚨", c:"text-rose-400",  bg:slaBreachActive.length>0?"border-rose-800/50 bg-rose-900/10":"border-border bg-card",    onClick:()=>{setManagerSection("tickets");setActiveView("sla");} },
                { label:"ไม่มีคนรับ",  n:unassigned.length,                                        icon:"📋", c:"text-orange-400",bg:unassigned.length>0?"border-orange-800/40 bg-orange-900/10":"border-border bg-card",     onClick:()=>{setManagerSection("team");} },
                { label:"ไม่มี Update",n:noUpdateTickets.length,                                   icon:"💤", c:"text-slate-400", bg:noUpdateTickets.length>0?"border-slate-700/50 bg-slate-800/20":"border-border bg-card",   onClick:()=>{setManagerSection("tickets");setActiveView("all");} },
                { label:"รออะไหล่",   n:list.filter(t=>t.status==="waiting_parts").length,         icon:"📦", c:"text-purple-400",bg:list.filter(t=>t.status==="waiting_parts").length>0?"border-purple-800/40 bg-purple-900/10":"border-border bg-card",  onClick:()=>{setManagerSection("tickets");setActiveView("parts");} },
                { label:"รอลูกค้า",   n:waitingCust.length,                                        icon:"⏳", c:"text-rose-300",  bg:waitingCust.length>0?"border-rose-800/30 bg-rose-900/5":"border-border bg-card",          onClick:()=>{setManagerSection("tickets");setActiveView("all");setStatusFilter("waiting_approval" as ServiceStatus);} },
                { label:"PM / MA",    n:pmMaActive.length,                                         icon:"🔵", c:"text-blue-400",  bg:"border-blue-800/30 bg-blue-900/5",                                         onClick:()=>{setManagerSection("tickets");setActiveView("pm");} },
                { label:"งานย้อนซ่อม",n:reworkList.length,                                        icon:"🔄", c:"text-amber-400", bg:reworkList.length>0?"border-amber-800/40 bg-amber-900/10":"border-border bg-card",        onClick:()=>{setManagerSection("tickets");setActiveView("all");setTypeFilter("repair");setStatusFilter("all");} },
              ].map(k => (
                <button key={k.label} onClick={k.onClick}
                  className={`rounded-xl border p-2.5 text-left transition-all hover:scale-[1.02] active:scale-100 ${k.bg}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs leading-none">{k.icon}</span>
                    <p className={`text-xl font-bold tabular-nums ${k.c}`}>{k.n}</p>
                  </div>
                  <p className="text-[10px] text-muted leading-tight">{k.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Tab bar + Export */}
          <div className="flex items-center gap-2 border-t border-border pt-3 flex-wrap">
            <div className="flex gap-1 flex-1 flex-wrap">
              {([
                {id:"tickets"   as const, icon:"🎫", label:"Tickets",   sub:"รายการงาน"},
                {id:"team"      as const, icon:"👥", label:"Team",      sub:"ทีมช่าง"},
                {id:"assets"    as const, icon:"🖥️", label:"Assets",    sub:"อุปกรณ์"},
                {id:"docs"      as const, icon:"📂", label:"Docs",      sub:"เอกสาร"},
                {id:"costs"     as const, icon:"💰", label:"Costs",     sub:"ต้นทุน"},
                {id:"analytics" as const, icon:"📈", label:"Analytics", sub:"วิเคราะห์"},
                {id:"report"    as const, icon:"📊", label:"Report",     sub:"ดึงรายงาน"},
              ]).map(s => (
                <button key={s.id} onClick={()=>setManagerSection(s.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${managerSection===s.id?"bg-accent/20 text-accent border-accent/40":"bg-card border-border text-muted hover:bg-card-hover"}`}>
                  {s.icon} {s.label}
                  <span className="text-[9px] text-muted/60 hidden md:inline">· {s.sub}</span>
                </button>
              ))}
            </div>
            <button onClick={exportCSV} className="text-xs text-muted border border-border rounded-xl px-3 py-2 hover:bg-card-hover flex items-center gap-1.5 shrink-0">
              📥 Export CSV
            </button>
          </div>
        </div>
      )}

      {/* ── Alert Bar (manager · Tickets tab) ── */}
      {!loading && !isTechView && managerSection === "tickets" && (overdueAccept.length > 0 || overdueList.length > 0 || unassigned.length > 0 || stats.pendingReqs > 0) && (
        <div className="rounded-xl border border-red-800/50 bg-red-900/10 px-4 py-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs font-bold text-red-400 shrink-0">⚡ ต้องดูแลทันที</span>
          {overdueAccept.length > 0 && (
            <button onClick={() => setStatusFilter("open")} className="flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:underline">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
              {overdueAccept.length} งานค้างรอรับ &gt; SLA
            </button>
          )}
          {overdueList.length > 0 && <span className="text-sm font-semibold text-amber-400">⚠ {overdueList.length} งานเลยกำหนดนัด</span>}
          {unassigned.length > 0 && <span className="text-sm font-semibold text-orange-400">📋 {unassigned.length} งานยังไม่มอบหมาย</span>}
          {stats.pendingReqs > 0 && <span className="text-sm font-semibold text-purple-400">📥 {stats.pendingReqs} Job Request รอรับ</span>}
        </div>
      )}

      {/* ── KPI Grid (manager · Tickets tab) ── */}
      {!loading && !isTechView && managerSection === "tickets" && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {/* Row 1: Status filters (clickable) */}
          {([
            { label: "เปิดใหม่",    v: stats.open,       f: "open",        cls: "text-red-400" },
            { label: "กำลังทำ",    v: stats.inProgress,  f: "in_progress", cls: "text-yellow-400" },
            { label: "แก้ไขแล้ว", v: stats.resolved,    f: "resolved",    cls: "text-green-400" },
            { label: "ปิดงาน",    v: stats.closed,      f: "closed",      cls: "text-muted" },
          ] as const).map(k => (
            <button key={k.f}
              onClick={() => setStatusFilter(statusFilter === k.f ? "all" : k.f as ServiceStatus)}
              className={`rounded-xl border p-3 text-left transition-colors ${statusFilter === k.f ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.v}</p>
              <p className="text-[11px] text-muted mt-0.5">{k.label}</p>
            </button>
          ))}
          {/* Row 2: Context KPIs */}
          <div className={`rounded-xl border p-3 ${stats.overdue > 0 ? "border-red-800/50 bg-red-900/10" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${stats.overdue > 0 ? "text-red-400" : "text-muted"}`}>{stats.overdue}</p>
            <p className="text-[11px] text-muted mt-0.5">เลยกำหนด</p>
          </div>
          <div className={`rounded-xl border p-3 ${stats.today > 0 ? "border-amber-800/40 bg-amber-900/10" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${stats.today > 0 ? "text-amber-400" : "text-muted"}`}>{stats.today}</p>
            <p className="text-[11px] text-muted mt-0.5">งานวันนี้</p>
          </div>
          <div className="rounded-xl border border-blue-800/40 bg-blue-900/10 p-3">
            <p className="text-2xl font-bold text-blue-400">{stats.pmCount}</p>
            <p className="text-[11px] text-muted mt-0.5">PM Active</p>
          </div>
          <div className={`rounded-xl border p-3 ${stats.pendingReqs > 0 ? "border-purple-800/40 bg-purple-900/10" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${stats.pendingReqs > 0 ? "text-purple-400" : "text-muted"}`}>{stats.pendingReqs}</p>
            <p className="text-[11px] text-muted mt-0.5">Job Req รอรับ</p>
          </div>
        </div>
      )}

      {/* ── Main 3-column Grid (manager · Tickets tab) ── */}
      {!loading && !isTechView && managerSection === "tickets" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          {/* Col 1: ภาระงานต่อช่าง */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-0.5">👤 ภาระงานต่อช่าง</h2>
            <p className="text-[10px] text-muted mb-4">Active · ⚠เลยกำหนด · ⏱รอรับ SLA</p>
            {workloadDetailed.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">ไม่มีงาน Active</p>
            ) : (() => {
              const maxA = Math.max(...workloadDetailed.map(w => w.active), 1);
              return (
                <div className="space-y-3">
                  {workloadDetailed.map(w => (
                    <div key={w.name}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium flex-1 truncate">{w.name}</span>
                        <span className="text-sm font-bold w-5 text-center">{w.active}</span>
                        {w.overdue > 0 && <span className="text-[10px] font-semibold text-red-400" title="เลยกำหนด">⚠{w.overdue}</span>}
                        {w.waitSla > 0 && <span className="text-[10px] font-semibold text-amber-400" title="รอรับ > SLA">⏱{w.waitSla}</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(w.active / maxA) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {unassigned.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[11px] font-semibold text-orange-400">📋 {unassigned.length} งานยังไม่มอบหมาย</p>
              </div>
            )}
          </div>

          {/* Col 2: SLA Performance */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-0.5">⏱️ SLA Performance</h2>
            <p className="text-[10px] text-muted mb-4">อัตราแก้งานทันเวลา · เฉลี่ย response / resolve</p>

            <div className="text-center mb-5">
              <p className={`text-5xl font-bold tabular-nums ${slaOnTimeRate === null ? "text-muted" : slaOnTimeRate >= 85 ? "text-green-400" : slaOnTimeRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                {slaOnTimeRate !== null ? `${slaOnTimeRate}%` : "—"}
              </p>
              <p className="text-[11px] text-muted mt-1">On-time ({slaOnTimeCount}/{ticketsWithResolve.length} งาน)</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">ตอบรับเฉลี่ย</span>
                <span className={`font-semibold ${avgResponse !== null && avgResponse > 4 ? "text-red-400" : "text-green-400"}`}>
                  {fmtHours(avgResponse)}
                  <span className="text-muted font-normal"> / เป้า 4h</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">แก้งานเฉลี่ย</span>
                <span className={`font-semibold ${avgResolve !== null && avgResolve > 48 ? "text-red-400" : "text-green-400"}`}>
                  {fmtHours(avgResolve)}
                  <span className="text-muted font-normal"> / เป้า 48h</span>
                </span>
              </div>
              <div className="border-t border-border pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted">ค้างรอรับ &gt; SLA</span>
                  <span className={`font-bold ${overdueAccept.length > 0 ? "text-red-400" : "text-green-400"}`}>{overdueAccept.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">เลย SLA แก้งาน</span>
                  <span className={`font-bold ${slaBreachedResolve.length > 0 ? "text-red-400" : "text-green-400"}`}>{slaBreachedResolve.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: ประเภทงาน Active */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold mb-0.5">📊 ประเภทงาน (Active)</h2>
            <p className="text-[10px] text-muted mb-4">งานที่ยังอยู่ระหว่างดำเนินการ</p>
            {(() => {
              const totalA = Object.values(typeActive).reduce((a, b) => a + b, 0);
              const rows = [
                { label: "Repair (CM)",      count: typeActive.repair,  color: "bg-red-400",    icon: "🔧" },
                { label: "PM Service",        count: typeActive.pm,      color: "bg-blue-400",   icon: "📅" },
                { label: "Installation",      count: typeActive.install, color: "bg-green-400",  icon: "🔌" },
                { label: "Site / Tech Survey",count: typeActive.survey,  color: "bg-yellow-400", icon: "📍" },
                { label: "After-Sales / MA",  count: typeActive.after,   color: "bg-purple-400", icon: "🛡️" },
              ];
              return (
                <div className="space-y-3">
                  {rows.map(r => (
                    <div key={r.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">{r.icon} {r.label}</span>
                        <span className="text-sm font-bold">{r.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <div className={`h-full rounded-full ${r.color} transition-all`}
                          style={{ width: totalA > 0 ? `${(r.count / totalA) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted pt-1 border-t border-border">รวม {totalA} งาน active จาก {list.length} ทั้งหมด</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Urgent & Schedule Details (manager · Tickets tab) ── */}
      {!loading && !isTechView && managerSection === "tickets" && (overdueList.length > 0 || overdueAccept.length > 0 || todayList.length > 0 || pmUpcoming.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Left: งานค้าง / เลยกำหนด */}
          <div className="space-y-3">
            {overdueList.length > 0 && (
              <div className="rounded-xl bg-card border border-red-800/40 p-4">
                <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ งานเลยกำหนดนัด ({overdueList.length})</h3>
                <div className="space-y-0">
                  {overdueList.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2 border-b border-border last:border-0">
                      <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                      <p className="text-[11px] text-muted">นัด {t.service_date}{t.technician && ` · ${t.technician}`}</p>
                    </div>
                  ))}
                  {overdueList.length > 5 && <p className="text-[10px] text-muted pt-1">+{overdueList.length - 5} รายการ</p>}
                </div>
              </div>
            )}
            {overdueAccept.length > 0 && (
              <div className="rounded-xl bg-card border border-amber-800/40 p-4">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">⏱ รอรับงาน &gt; SLA ({overdueAccept.length})</h3>
                <div className="space-y-0">
                  {overdueAccept.slice(0, 4).map(t => {
                    const elapsed = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000;
                    return (
                      <div key={t.id} className="py-2 border-b border-border last:border-0 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                          <p className="text-[11px] text-muted">
                            {t.assignment_mode === "all" ? "📢 broadcast" : t.technician ? `👤 ${t.technician}` : "ไม่ได้ระบุ"}
                          </p>
                        </div>
                        <span className="text-red-400 font-semibold text-xs shrink-0">{fmtHours(elapsed)}</span>
                      </div>
                    );
                  })}
                  {overdueAccept.length > 4 && <p className="text-[10px] text-muted pt-1">+{overdueAccept.length - 4} รายการ</p>}
                </div>
              </div>
            )}
          </div>

          {/* Right: งานวันนี้ + PM ใกล้ครบ */}
          <div className="space-y-3">
            {todayList.length > 0 && (
              <div className="rounded-xl bg-card border border-amber-800/40 p-4">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">📅 งานวันนี้ ({todayList.length})</h3>
                <div className="space-y-0">
                  {todayList.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2 border-b border-border last:border-0">
                      <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                      <p className="text-[11px] text-muted">{t.technician || "ยังไม่มอบหมาย"}</p>
                    </div>
                  ))}
                  {todayList.length > 5 && <p className="text-[10px] text-muted pt-1">+{todayList.length - 5} รายการ</p>}
                </div>
              </div>
            )}
            {pmUpcoming.length > 0 && (
              <div className="rounded-xl bg-card border border-blue-800/40 p-4">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">🔵 PM ครบกำหนด 14 วัน ({pmUpcoming.length})</h3>
                <div className="space-y-0">
                  {pmUpcoming.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2 border-b border-border last:border-0 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{t.customer_name}</p>
                        <p className="text-[11px] text-muted">{t.technician || "ยังไม่มอบหมาย"}</p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${t.service_date === today ? "text-red-400" : "text-blue-400"}`}>{t.service_date}</span>
                    </div>
                  ))}
                  {pmUpcoming.length > 5 && <p className="text-[10px] text-muted pt-1">+{pmUpcoming.length - 5} รายการ</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Team Performance Panel ── */}
      {!loading && !isTechView && managerSection === "team" && (
        <div className="space-y-4 mb-4">
          {/* Performance table */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="mb-4">
              <h2 className="text-sm font-bold">👥 Team Performance</h2>
              <p className="text-[10px] text-muted">Active · SLA% · เวลาปิดงานเฉลี่ย · ค้าง · รออะไหล่ · Repair jobs</p>
            </div>
            {teamPerf.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">ยังไม่มีข้อมูลช่าง</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="text-left pb-2 font-medium">ช่าง</th>
                      <th className="text-center pb-2 font-medium">Active</th>
                      <th className="text-center pb-2 font-medium">ปิดแล้ว</th>
                      <th className="text-center pb-2 font-medium">SLA%</th>
                      <th className="text-center pb-2 font-medium">ปิดเฉลี่ย</th>
                      <th className="text-center pb-2 font-medium">ค้าง⚠</th>
                      <th className="text-center pb-2 font-medium">รออะไหล่📦</th>
                      <th className="text-center pb-2 font-medium">Last Active</th>
                      <th className="text-right pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamPerf.map(u => (
                      <tr key={u.name} className="hover:bg-card-hover">
                        <td className="py-2.5 font-semibold">{u.name}</td>
                        <td className="py-2.5 text-center">
                          <span className={`font-bold ${u.active > 0 ? "text-accent" : "text-muted"}`}>{u.active}</span>
                        </td>
                        <td className="py-2.5 text-center text-muted">{u.resolved}</td>
                        <td className="py-2.5 text-center">
                          {u.slaRate !== null
                            ? <span className={`font-bold ${u.slaRate >= 85 ? "text-green-400" : u.slaRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>{u.slaRate}%</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-2.5 text-center text-muted">{fmtHours(u.avgClose)}</td>
                        <td className="py-2.5 text-center">
                          {u.overdue > 0 ? <span className="font-bold text-red-400">{u.overdue}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-2.5 text-center">
                          {u.waitParts > 0 ? <span className="font-bold text-purple-400">{u.waitParts}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-2.5 text-center">
                          {(() => {
                            const lastMs = techLastActivity[u.name] || 0;
                            if (!lastMs) return <span className="text-muted">—</span>;
                            const diffH = (nowMs - lastMs) / 3600000;
                            const cls = diffH > 48 ? "text-red-400" : diffH > 24 ? "text-amber-400" : "text-green-400";
                            return <span className={`text-[10px] font-medium ${cls}`}>{diffH < 1 ? `${Math.round(diffH*60)}m` : diffH < 24 ? `${diffH.toFixed(0)}h` : `${(diffH/24).toFixed(0)}d`}</span>;
                          })()}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setManagerSection("tickets"); setShowForm(true); setForm(f => ({ ...f, technician: u.name })); }}
                              className="text-[10px] text-accent hover:underline">+ Assign</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Assign — unassigned tickets */}
          {unassigned.length > 0 && (
            <div className="rounded-xl bg-card border border-orange-800/40 p-4">
              <h3 className="text-xs font-semibold text-orange-400 mb-3">📋 งานยังไม่มอบหมาย ({unassigned.length})</h3>
              <div className="space-y-2">
                {unassigned.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                      <p className="text-[10px] text-muted">{t.issue.slice(0, 60)}{t.issue.length > 60 ? "…" : ""}</p>
                    </div>
                    <select defaultValue="" onChange={async e => {
                      if (!e.target.value) return;
                      const { serviceTickets } = await import("@/lib/firestore");
                      await serviceTickets.update(t.id!, { technician: e.target.value });
                      await load();
                    }} className="rounded-lg bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent">
                      <option value="">มอบหมาย…</option>
                      {svcUsers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Approval */}
          {pendingApproval.length > 0 && (
            <div className="rounded-xl bg-card border border-rose-800/40 p-4">
              <h3 className="text-xs font-semibold text-rose-400 mb-3">⏳ รออนุมัติ ({pendingApproval.length})</h3>
              <div className="space-y-2">
                {pendingApproval.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                      <p className="text-[10px] text-muted">👤 {t.technician || "ไม่ระบุ"} · 📅 {t.service_date || "—"}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={async () => { const { serviceTickets } = await import("@/lib/firestore"); await serviceTickets.update(t.id!, { status: "closed" }); await load(); }}
                        className="text-[10px] bg-green-800/50 text-green-400 rounded-lg px-2.5 py-1 hover:bg-green-800">✓ Approve</button>
                      <button onClick={() => setSelectedTicket(t)}
                        className="text-[10px] text-accent border border-border rounded-lg px-2.5 py-1 hover:bg-card-hover">👁 Detail</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cost Tracking Panel ── */}
      {!loading && !isTechView && managerSection === "costs" && (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[10px] text-muted mb-1">ต้นทุนเดือนนี้</p>
              <p className="text-2xl font-bold text-amber-400">{(monthCost/1000).toLocaleString(undefined,{maximumFractionDigits:1})}K</p>
              <p className="text-[10px] text-muted">{list.filter(t=>(t.service_date||"").startsWith(currentMonth)).length} งาน</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[10px] text-muted mb-1">ต้นทุนสะสม</p>
              <p className="text-2xl font-bold">{(totalCost/1000).toLocaleString(undefined,{maximumFractionDigits:1})}K</p>
              <p className="text-[10px] text-muted">{list.length} งานทั้งหมด</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[10px] text-muted mb-1">เฉลี่ยต่องาน</p>
              <p className="text-2xl font-bold text-blue-400">{list.length > 0 ? Math.round(totalCost/list.length).toLocaleString() : 0}</p>
              <p className="text-[10px] text-muted">บาท/งาน</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[10px] text-muted mb-1">รออนุมัติ</p>
              <p className={`text-2xl font-bold ${pendingApproval.length > 0 ? "text-rose-400" : "text-muted"}`}>{pendingApproval.length}</p>
              <p className="text-[10px] text-muted">งาน</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <h2 className="text-sm font-bold mb-3">👤 ต้นทุนต่อช่าง</h2>
              {costPerTech.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">ยังไม่มีข้อมูลต้นทุน</p>
              ) : (
                <div className="space-y-3">
                  {costPerTech.map(u => {
                    const maxC = Math.max(...costPerTech.map(x => x.cost), 1);
                    return (
                      <div key={u.name}>
                        <div className="flex items-center gap-2 mb-1 text-xs">
                          <span className="font-medium flex-1 truncate">{u.name}</span>
                          <span className="text-muted">{u.jobs} งาน</span>
                          <span className="font-bold w-20 text-right">{u.cost.toLocaleString()} ฿</span>
                          <span className="text-muted w-16 text-right">~{Math.round(u.avgCost).toLocaleString()}/งาน</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${(u.cost/maxC)*100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h2 className="text-sm font-bold mb-3">📊 ต้นทุนต่อประเภทงาน</h2>
              <div className="space-y-3">
                {svcTypes.map(tt => {
                  const mine = list.filter(t => t.type === tt);
                  const cost = mine.reduce((s, t) => s + (t.service_cost || 0), 0);
                  const maxT = Math.max(...svcTypes.map(x => list.filter(t=>t.type===x).reduce((s,t)=>s+(t.service_cost||0),0)), 1);
                  if (mine.length === 0) return null;
                  return (
                    <div key={tt}>
                      <div className="flex items-center gap-2 mb-1 text-xs">
                        <span className="flex-1">{typeLabels[tt]}</span>
                        <span className="text-muted">{mine.length} งาน</span>
                        <span className="font-bold w-20 text-right">{cost.toLocaleString()} ฿</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${(cost/maxT)*100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-blue-900/10 border border-blue-800/30 p-4">
            <p className="text-xs font-semibold text-blue-400 mb-1">📌 บันทึกต้นทุนละเอียด</p>
            <p className="text-xs text-muted">ค่าเดินทาง · ค่า OT · ค่าอะไหล่ · ค่า Outsource บันทึกแยกรายการได้ใน <strong className="text-foreground">👁 Detail → 💰 ต้นทุน</strong> ของแต่ละ Ticket ค่าที่แสดงนี้มาจากช่อง service_cost รวม</p>
          </div>
        </div>
      )}

      {/* ── Analytics Panel ── */}
      {!loading && !isTechView && managerSection === "analytics" && (
        <div className="space-y-4 mb-4">
          {/* Job type breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Repair (CM)",    n: typeActive.repair,  tot: list.filter(t=>t.type==="repair").length,           color: "text-red-400",    bg: "border-red-800/40 bg-red-900/10",       icon: "🔧" },
              { label: "PM Service",     n: typeActive.pm,      tot: list.filter(t=>t.type==="pm_service").length,        color: "text-blue-400",   bg: "border-blue-800/40 bg-blue-900/10",     icon: "📅" },
              { label: "After-Sales/MA", n: typeActive.after,   tot: list.filter(t=>t.type==="after_sales").length,       color: "text-purple-400", bg: "border-purple-800/40 bg-purple-900/10", icon: "🛡️" },
              { label: "Installation",   n: typeActive.install, tot: list.filter(t=>t.type==="installation").length,      color: "text-green-400",  bg: "border-green-800/40 bg-green-900/10",   icon: "🔌" },
              { label: "Survey",         n: typeActive.survey,  tot: list.filter(t=>t.type==="site_survey"||t.type==="technical_survey").length, color: "text-yellow-400", bg: "border-yellow-800/40 bg-yellow-900/10", icon: "📍" },
              { label: "SLA Breach",     n: slaBreachActive.length, tot: list.length, color: "text-rose-400", bg: "border-rose-800/40 bg-rose-900/10", icon: "🚨" },
            ].map(r => (
              <div key={r.label} className={`rounded-xl border p-4 ${r.n > 0 ? r.bg : "border-border bg-card"}`}>
                <div className="flex items-center gap-2 mb-1"><span className="text-base">{r.icon}</span>
                  <p className={`text-2xl font-bold tabular-nums ${r.n > 0 ? r.color : "text-muted"}`}>{r.n}</p>
                </div>
                <p className="text-[10px] font-medium text-muted">{r.label}</p>
                <p className="text-[9px] text-muted/60">ทั้งหมด {r.tot} งาน</p>
              </div>
            ))}
          </div>

          {/* SLA Breach list */}
          {slaBreachActive.length > 0 && (
            <div className="rounded-xl bg-card border border-rose-800/40 p-4">
              <h2 className="text-sm font-bold text-rose-400 mb-3">🚨 งานเกิน SLA ({slaBreachActive.length})</h2>
              <div className="space-y-1">
                {slaBreachActive.slice(0, 10).map(t => {
                  const elapsed = (nowMs - (parseISO(t.opened_at)||nowMs)) / 3600000;
                  const sla = t.sla_resolve_hours || 48;
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{typeLabels[t.type]} — {t.customer_name}</p>
                        <p className="text-[10px] text-muted">👤 {t.technician || "ไม่ระบุ"} · SLA เป้า {sla}h</p>
                      </div>
                      <span className="text-rose-400 font-bold text-xs shrink-0">+{fmtHours(elapsed - sla)} เกิน</span>
                      <button onClick={() => { setSelectedTicket(t); setManagerSection("tickets"); }}
                        className="text-[10px] text-accent hover:underline shrink-0">👁 Detail</button>
                    </div>
                  );
                })}
                {slaBreachActive.length > 10 && <p className="text-[10px] text-muted pt-1">+{slaBreachActive.length - 10} รายการ</p>}
              </div>
            </div>
          )}

          {/* Repeat customers */}
          {repeatCusts.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-4">
              <h2 className="text-sm font-bold mb-3">🔄 ลูกค้าแจ้งซ้ำบ่อย</h2>
              <div className="space-y-1.5">
                {repeatCusts.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <span className="text-xs font-medium flex-1 truncate">{name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/20 overflow-hidden mx-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min((count / (repeatCusts[0][1] || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${count >= 5 ? "text-red-400" : count >= 3 ? "text-amber-400" : "text-muted"}`}>{count} ครั้ง</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLA Trend — 6 months */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-bold mb-3">📊 SLA Trend (6 เดือนล่าสุด)</h2>
            {(() => {
              const months: string[] = [];
              for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
              const trend = months.map(m => {
                const res = list.filter(t => ["resolved","closed"].includes(t.status) && (t.service_date||"").startsWith(m) && t.opened_at && t.resolved_at);
                const ok  = res.filter(t => { const h = hoursBetween(t.opened_at, t.resolved_at); return h !== null && h <= (t.sla_resolve_hours||48); });
                return { month: m.slice(5), total: res.length, rate: res.length > 0 ? Math.round(ok.length / res.length * 100) : null };
              });
              const maxT = Math.max(...trend.map(t => t.total), 1);
              return (
                <div className="space-y-2.5">
                  {trend.map(t => (
                    <div key={t.month} className="flex items-center gap-3">
                      <span className="text-[10px] text-muted w-12 shrink-0">เดือน {t.month}</span>
                      <div className="flex-1 h-5 rounded bg-muted/10 overflow-hidden relative">
                        <div className={`h-full rounded transition-all ${t.rate !== null && t.rate >= 85 ? "bg-green-400" : t.rate !== null && t.rate >= 70 ? "bg-yellow-400" : t.total > 0 ? "bg-red-400" : "bg-muted/20"}`}
                          style={{ width: `${(t.total/maxT)*100}%` }} />
                        {t.total > 0 && <span className="absolute inset-0 flex items-center px-2 text-[9px] font-bold text-white/90">{t.total} งาน</span>}
                      </div>
                      <span className={`text-[10px] font-bold w-10 text-right shrink-0 ${t.rate !== null && t.rate >= 85 ? "text-green-400" : t.rate !== null && t.rate >= 70 ? "text-yellow-400" : t.total > 0 ? "text-red-400" : "text-muted"}`}>
                        {t.rate !== null ? `${t.rate}%` : "—"}
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted pt-1">≥85% เขียว · ≥70% เหลือง · ต่ำกว่า แดง · นับจากงาน resolved/closed เดือนนั้น</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Asset Monitoring Panel ── */}
      {!loading && !isTechView && managerSection === "assets" && (
        <div className="space-y-4 mb-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[10px] text-muted mb-1">อุปกรณ์ทั้งหมด</p>
              <p className="text-2xl font-bold">{assetList.length}</p>
              <p className="text-[10px] text-muted">ในระบบ</p>
            </div>
            <div className={`rounded-xl border p-4 ${frequentlyBroken.length>0?"border-red-800/40 bg-red-900/10 bg-card":"border-border bg-card"}`}>
              <p className="text-[10px] text-muted mb-1">เสียซ้ำ (≥2 ครั้ง)</p>
              <p className={`text-2xl font-bold ${frequentlyBroken.length>0?"text-red-400":"text-muted"}`}>{frequentlyBroken.length}</p>
              <p className="text-[10px] text-muted">SN</p>
            </div>
            <div className={`rounded-xl border p-4 ${highTicketAssets.length>0?"border-amber-800/40 bg-amber-900/10":"border-border bg-card"}`}>
              <p className="text-[10px] text-muted mb-1">Ticket สูง (≥3)</p>
              <p className={`text-2xl font-bold ${highTicketAssets.length>0?"text-amber-400":"text-muted"}`}>{highTicketAssets.length}</p>
              <p className="text-[10px] text-muted">SN</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-[10px] text-muted mb-1">มี Ticket ผูกอยู่</p>
              <p className="text-2xl font-bold text-blue-400">{Object.keys(assetTicketMap).length}</p>
              <p className="text-[10px] text-muted">SN</p>
            </div>
          </div>

          {/* Frequently broken */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors"
              onClick={() => toggleSect("asset_freq")}>
              <div>
                <span className="text-sm font-bold">🔧 อุปกรณ์เสียซ้ำ (Repair ≥ 2 ครั้ง)</span>
                <span className="text-[10px] text-muted ml-2">{frequentlyBroken.length} รายการ</span>
              </div>
              <span className="text-muted text-xs" style={{ transform: sectOpen("asset_freq") ? "rotate(0deg)" : "rotate(-90deg)", display:"inline-block", transition:"transform 0.15s" }}>▾</span>
            </button>
            {sectOpen("asset_freq") && (
              <div className="border-t border-border">
                {frequentlyBroken.length === 0 ? (
                  <p className="text-sm text-muted text-center py-6">ไม่พบอุปกรณ์ที่เสียซ้ำ</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted bg-background/50">
                        <th className="text-left px-4 py-2">KM No.</th>
                        <th className="text-left px-4 py-2">Model</th>
                        <th className="text-left px-4 py-2">S/N</th>
                        <th className="text-left px-4 py-2">ลูกค้า</th>
                        <th className="text-center px-4 py-2">Repair</th>
                        <th className="text-center px-4 py-2">Ticket รวม</th>
                        <th className="text-right px-4 py-2">ล่าสุด</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {frequentlyBroken.map((a, i) => (
                          <tr key={i} className="hover:bg-card-hover">
                            <td className="px-4 py-2.5 font-mono font-semibold text-accent">{a.km}</td>
                            <td className="px-4 py-2.5 text-muted">{a.model || "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px]">{a.sn || "—"}</td>
                            <td className="px-4 py-2.5 truncate max-w-[120px]">{a.cust}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`font-bold ${a.repairCount>=4?"text-red-400":a.repairCount>=3?"text-amber-400":"text-yellow-400"}`}>{a.repairCount}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted">{a.count}</td>
                            <td className="px-4 py-2.5 text-right text-muted">{a.lastDate || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* High-ticket assets */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors"
              onClick={() => toggleSect("asset_high")}>
              <div>
                <span className="text-sm font-bold">📊 อุปกรณ์ที่มี Ticket สูง (≥ 3 ครั้ง)</span>
                <span className="text-[10px] text-muted ml-2">{highTicketAssets.length} รายการ</span>
              </div>
              <span className="text-muted text-xs" style={{ transform: sectOpen("asset_high") ? "rotate(0deg)" : "rotate(-90deg)", display:"inline-block", transition:"transform 0.15s" }}>▾</span>
            </button>
            {sectOpen("asset_high") && (
              <div className="border-t border-border">
                {highTicketAssets.length === 0 ? (
                  <p className="text-sm text-muted text-center py-6">ไม่พบอุปกรณ์ที่มี Ticket สูง</p>
                ) : (
                  <div className="space-y-0">
                    {highTicketAssets.map((a, i) => {
                      const maxC = highTicketAssets[0].count;
                      return (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-card-hover">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold font-mono text-accent">{a.km}</p>
                            <p className="text-[10px] text-muted truncate">{a.model} · {a.cust}</p>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${(a.count/maxC)*100}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${a.count>=5?"text-red-400":a.count>=4?"text-amber-400":"text-yellow-400"}`}>{a.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Asset search by SN */}
          <div className="rounded-xl bg-blue-900/10 border border-blue-800/30 p-4">
            <p className="text-xs font-semibold text-blue-400 mb-1">🔍 ค้นหาประวัติ Asset</p>
            <p className="text-xs text-muted mb-2">ดูประวัติ Ticket ทั้งหมดของอุปกรณ์แต่ละชิ้น → <Link href="/assets" className="text-accent hover:underline">เปิดหน้า Assets →</Link></p>
            <div className="flex gap-2">
              <Link href="/assets" className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent-hover">🖥️ ไปหน้า Assets</Link>
              <Link href="/service?tab=history" className="rounded-lg border border-border px-4 py-2 text-xs text-muted hover:bg-card-hover">📁 ประวัติงานทั้งหมด</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Documents Panel ── */}
      {!loading && !isTechView && managerSection === "docs" && (
        <div className="space-y-4 mb-4">
          {/* Internal links */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors"
              onClick={() => toggleSect("docs_internal")}>
              <span className="text-sm font-bold">📁 เอกสารภายในระบบ</span>
              <span className="text-muted text-xs" style={{ transform: sectOpen("docs_internal") ? "rotate(0deg)" : "rotate(-90deg)", display:"inline-block", transition:"transform 0.15s" }}>▾</span>
            </button>
            {sectOpen("docs_internal") && (
              <div className="border-t border-border p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { href: "/service/backup",   icon: "💾", label: "Config Backup",  desc: "บันทึก Config อุปกรณ์" },
                  { href: "/service/manuals",  icon: "📖", label: "Manuals",         desc: "คู่มือการใช้งาน" },
                  { href: "/service/checklist",icon: "✅", label: "Checklist",        desc: "Service Checklist" },
                  { href: "/service/remote",   icon: "🖥️", label: "Remote Support",  desc: "Remote Access Tools" },
                ].map(d => (
                  <Link key={d.href} href={d.href}
                    className="rounded-xl border border-border bg-background hover:bg-card-hover p-4 flex flex-col gap-2 transition-colors group">
                    <span className="text-2xl">{d.icon}</span>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-accent transition-colors">{d.label}</p>
                      <p className="text-[10px] text-muted">{d.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* External links (OneDrive / SharePoint / Diagram) */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors"
              onClick={() => toggleSect("docs_external")}>
              <div>
                <span className="text-sm font-bold">🔗 ลิงก์ภายนอก (OneDrive / SharePoint / Diagram)</span>
                <span className="text-[10px] text-muted ml-2">{docLinks.length} ลิงก์</span>
              </div>
              <span className="text-muted text-xs" style={{ transform: sectOpen("docs_external") ? "rotate(0deg)" : "rotate(-90deg)", display:"inline-block", transition:"transform 0.15s" }}>▾</span>
            </button>
            {sectOpen("docs_external") && (
              <div className="border-t border-border p-4 space-y-3">
                {docLinks.length === 0 && (
                  <p className="text-sm text-muted text-center py-4">ยังไม่มีลิงก์ภายนอก — เพิ่มด้านล่าง</p>
                )}
                {docLinks.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-base">🔗</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.label}</p>
                      <a href={d.url} target="_blank" rel="noreferrer"
                        className="text-[11px] text-accent hover:underline truncate block max-w-xs">{d.url}</a>
                    </div>
                    <button onClick={() => saveDocLinks(docLinks.filter((_, j) => j !== i))}
                      className="text-[10px] text-danger hover:underline shrink-0">ลบ</button>
                  </div>
                ))}
                {/* Add link form */}
                <DocLinkAdder onAdd={link => saveDocLinks([...docLinks, link])} />
              </div>
            )}
          </div>

          {/* Diagram placeholder */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors"
              onClick={() => toggleSect("docs_diagram")}>
              <span className="text-sm font-bold">🗺️ Network Diagram / แผนผัง</span>
              <span className="text-muted text-xs" style={{ transform: sectOpen("docs_diagram") ? "rotate(0deg)" : "rotate(-90deg)", display:"inline-block", transition:"transform 0.15s" }}>▾</span>
            </button>
            {sectOpen("docs_diagram") && (
              <div className="border-t border-border p-4">
                <p className="text-xs text-muted mb-3">ใส่ URL รูปภาพ / Embed Diagram (draw.io, Visio export, Miro iframe) หรือ Link ไปยัง SharePoint</p>
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-muted text-sm">🗺️ เพิ่ม Network Diagram ผ่าน External Links ด้านบน</p>
                  <p className="text-[10px] text-muted mt-1">รองรับ OneDrive · SharePoint · draw.io · Google Drive</p>
                </div>
              </div>
            )}
          </div>

          {/* Export section */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors"
              onClick={() => toggleSect("docs_export")}>
              <span className="text-sm font-bold">📥 Export Report</span>
              <span className="text-muted text-xs" style={{ transform: sectOpen("docs_export") ? "rotate(0deg)" : "rotate(-90deg)", display:"inline-block", transition:"transform 0.15s" }}>▾</span>
            </button>
            {sectOpen("docs_export") && (
              <div className="border-t border-border p-4 flex flex-wrap gap-3">
                <button onClick={exportCSV}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover flex items-center gap-2">
                  📥 Export Tickets CSV
                </button>
                <Link href="/reports" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover flex items-center gap-2">
                  📊 หน้า Reports ทั้งหมด
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Report Panel ── */}
      {!loading && !isTechView && managerSection === "report" && (
        <div className="space-y-4 mb-4">
          {/* Filter bar */}
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">🔍 กรองข้อมูล</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-muted block mb-1">จากวันที่</label>
                <input type="date" value={rptDateFrom} onChange={e=>setRptDateFrom(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">ถึงวันที่</label>
                <input type="date" value={rptDateTo} onChange={e=>setRptDateTo(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">ช่างเทคนิค</label>
                <select value={rptTech} onChange={e=>setRptTech(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="">ทุกคน</option>
                  {[...new Set(baseTickets.map(t=>t.technician).filter(Boolean))].sort().map(n=>(
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">สถานะ</label>
                <select value={rptStatus} onChange={e=>setRptStatus(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="">ทุกสถานะ</option>
                  {ALL_STATUSES.map(s=><option key={s} value={s}>{statusLabel[s]||s}</option>)}
                </select>
              </div>
            </div>
            {(rptDateFrom||rptDateTo||rptTech||rptStatus) && (
              <button onClick={()=>{setRptDateFrom("");setRptDateTo("");setRptTech("");setRptStatus("");}}
                className="mt-2 text-[10px] text-accent hover:underline">✕ ล้างตัวกรอง</button>
            )}
          </div>

          {/* Summary stats */}
          {(() => {
            const done = reportRows.filter(t=>["resolved","closed"].includes(t.status));
            const durations = reportRows.filter(t=>t.durationHours!==null).map(t=>t.durationHours as number);
            const avgDur = durations.length>0 ? avg(durations) : null;
            const slaOk = reportRows.filter(t=>t.slaResOk==="✅ ผ่าน").length;
            const slaTotal = reportRows.filter(t=>["✅ ผ่าน","❌ เกิน"].includes(t.slaResOk)).length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:"Ticket ทั้งหมด",     n:reportRows.length,                                                               icon:"🎫", c:"text-accent"   },
                  { label:"จบงานแล้ว",           n:done.length,                                                                     icon:"✅", c:"text-green-400"},
                  { label:"Avg ระยะเวลาจบงาน",  n:avgDur!==null?`${avgDur.toFixed(1)}h`:"—",                                       icon:"⏱️", c:"text-blue-400" },
                  { label:"SLA Comply",          n:slaTotal>0?`${Math.round(slaOk/slaTotal*100)}%`:"—",                            icon:"🎯", c:slaTotal>0&&slaOk/slaTotal>=0.85?"text-green-400":slaTotal>0&&slaOk/slaTotal>=0.7?"text-yellow-400":"text-red-400"},
                ].map(k=>(
                  <div key={k.label} className="rounded-xl bg-card border border-border p-4">
                    <p className="text-[10px] text-muted mb-1">{k.icon} {k.label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${k.c}`}>{k.n}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Export buttons */}
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">📥 Export ({reportRows.length} รายการ)</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportReportCSV} disabled={reportRows.length===0}
                className="rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/20 px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40">
                📥 CSV
              </button>
              <button onClick={exportReportExcel} disabled={reportRows.length===0}
                className="rounded-lg border border-blue-700/50 text-blue-400 hover:bg-blue-900/20 px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40">
                📊 Excel
              </button>
              <button onClick={exportReportPDF} disabled={reportRows.length===0}
                className="rounded-lg border border-orange-700/50 text-orange-400 hover:bg-orange-900/20 px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40">
                🖨️ PDF
              </button>
              <Link href="/reports" className="rounded-lg border border-border text-muted hover:bg-card-hover px-4 py-2 text-sm flex items-center gap-2 transition-colors">
                🔗 หน้า Reports ทั้งหมด
              </Link>
            </div>
          </div>

          {/* Preview table */}
          {reportRows.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-bold">ตัวอย่างข้อมูล (แสดง 20 แถวแรก)</p>
                <p className="text-[10px] text-muted">รวม {reportRows.length} รายการ</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      {["Customer","Type","Technician","Status","วันรับแจ้ง","วันจบงาน","ระยะเวลา(ชม.)","ระยะเวลา(วัน)","SLA Resolve"].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] text-muted font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.slice(0,20).map((t,i)=>(
                      <tr key={t.id||i} className="border-b border-border/50 last:border-0 hover:bg-card-hover">
                        <td className="px-3 py-2 truncate max-w-[140px]">{t.customer_name||"—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{typeLabels[t.type]||t.type}</td>
                        <td className="px-3 py-2">{t.technician||"—"}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[t.status]||""}`}>
                            {statusIcon[t.status]||""} {statusLabel[t.status]||t.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap text-muted">{t.opened_at?.slice(0,16)||"—"}</td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap text-muted">{t.finishedAt?.slice(0,16)||"—"}</td>
                        <td className="px-3 py-2 tabular-nums font-mono">{t.durationHours!=null?`${t.durationHours}h`:"—"}</td>
                        <td className="px-3 py-2 tabular-nums font-mono">{t.durationDays!=null?`${t.durationDays}d`:"—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{t.slaResOk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportRows.length>20 && (
                <div className="px-4 py-2.5 border-t border-border text-center text-[10px] text-muted">
                  แสดง 20 จาก {reportRows.length} รายการ — กด Export เพื่อดูข้อมูลครบทั้งหมด
                </div>
              )}
            </div>
          )}

          {reportRows.length===0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-sm text-muted">ไม่พบข้อมูลตามเงื่อนไขที่กรอง</p>
            </div>
          )}
        </div>
      )}

      {/* ── Advanced Stats Toggles (manager only — Tickets tab only) ── */}
      {!loading && !isTechView && managerSection === "tickets" && list.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {/* Revenue toggle — ซ่อนสำหรับ technician / ไม่มีสิทธิ์การเงิน */}
          {canSeeFinance && <button onClick={() => setShowRevenue(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${showRevenue ? "border-purple-500/50 bg-purple-900/10 text-purple-300" : "border-border bg-card text-muted hover:bg-card-hover"}`}>
            <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showRevenue ? "bg-purple-500" : "bg-border"}`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${showRevenue ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </span>
            💎 ยอดขาย / Revenue &amp; GP
          </button>}
          {/* SLA Detail toggle */}
          <button onClick={() => setShowSlaDetail(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${showSlaDetail ? "border-rose-500/50 bg-rose-900/10 text-rose-300" : "border-border bg-card text-muted hover:bg-card-hover"}`}>
            <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showSlaDetail ? "bg-rose-500" : "bg-border"}`}>
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${showSlaDetail ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </span>
            ⏱️ SLA Analysis รายละเอียด
          </button>
        </div>
      )}

      {/* ── Revenue / Profit Section (manager only — HIDDEN BY DEFAULT) ── */}
      {!loading && !isTechView && managerSection === "tickets" && list.length > 0 && showRevenue && (
        <div className="rounded-xl bg-purple-900/10 border border-purple-800/40 p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-purple-300">💎 ยอดที่ทีม Service สร้างให้บริษัท</p>
              <p className="text-[10px] text-purple-300/60">รายได้ + กำไรจากงานที่ปิดแล้ว · ใส่ตัวเลขในฟอร์มเมื่อปิดงาน</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">รายได้รวม (เดือนนี้)</p><p className="text-lg font-bold text-purple-400">{(monthRevenue / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">{monthCompleted.length} งาน</p></div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">กำไรเดือนนี้</p><p className="text-lg font-bold text-green-400">{(monthProfit / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">{monthRevenue > 0 ? `${(monthProfit / monthRevenue * 100).toFixed(1)}% GP` : "—"}</p></div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">รายได้สะสมทั้งหมด</p><p className="text-lg font-bold">{(completedRevenue / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">{completed.length} งานปิด</p></div>
            <div className="rounded-lg bg-card border border-purple-800/40 p-3"><p className="text-[10px] text-muted">กำไรสะสม</p><p className="text-lg font-bold text-green-400">{(completedProfit / 1000).toLocaleString()}K</p><p className={`text-[10px] ${completedGP >= 20 ? "text-green-400" : completedGP >= 10 ? "text-yellow-400" : "text-muted"}`}>{completedGP > 0 ? `GP ${completedGP.toFixed(1)}%` : "—"}</p></div>
            <div className="rounded-lg bg-card border border-amber-800/40 p-3"><p className="text-[10px] text-muted">รอปิดงาน</p><p className="text-lg font-bold text-amber-400">{(pendingRevenue / 1000).toLocaleString()}K</p><p className="text-[10px] text-muted">กำไรคาด {(pendingProfit / 1000).toLocaleString()}K</p></div>
          </div>
          {(techRevenue.length > 0 || typeRevenue.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-purple-400 mb-2">🏆 Top ช่างที่สร้างยอด</h3>
                {techRevenue.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีตัวเลขรายได้</p> : (
                  <div className="space-y-1.5">{techRevenue.map((t, i) => { const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "; return (<div key={t.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span>{medal}</span><span className="flex-1 truncate font-medium">{t.name}</span><span className="text-muted">{t.jobs} งาน</span><span className="text-purple-400 font-semibold w-16 text-right">{(t.revenue / 1000).toLocaleString()}K</span><span className="text-green-400 w-14 text-right">{(t.profit / 1000).toLocaleString()}K</span><span className={`text-[10px] w-12 text-right ${t.gp >= 20 ? "text-green-400" : t.gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{t.gp.toFixed(1)}%</span></div>); })}<p className="text-[10px] text-muted pt-1">รายได้ · กำไร · GP%</p></div>
                )}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-purple-400 mb-2">📊 แยกตามประเภทงาน</h3>
                {typeRevenue.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีตัวเลขรายได้</p> : (
                  <div className="space-y-1.5">{typeRevenue.map(t => (<div key={t.type} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate font-medium">{t.label}</span><span className="text-muted">{t.jobs} งาน</span><span className="text-purple-400 font-semibold w-16 text-right">{(t.revenue / 1000).toLocaleString()}K</span><span className="text-green-400 w-14 text-right">{(t.profit / 1000).toLocaleString()}K</span><span className={`text-[10px] w-12 text-right ${t.gp >= 20 ? "text-green-400" : t.gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{t.gp.toFixed(1)}%</span></div>))}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SLA Analysis Detail Section (manager only — HIDDEN BY DEFAULT) ── */}
      {!loading && !isTechView && managerSection === "tickets" && list.length > 0 && showSlaDetail && (
        <div className="rounded-xl bg-rose-900/10 border border-rose-800/40 p-3 mb-4">
          <p className="text-xs font-semibold text-rose-300 mb-3">⏱️ Delay Analysis รายละเอียด (ความล่าช้า + SLA) — ใช้ทำแผนพัฒนา</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-[10px] text-muted">เวลาตอบรับเฉลี่ย</p><p className={`text-lg font-bold ${avgResponse !== null && avgResponse > 4 ? "text-red-400" : avgResponse !== null && avgResponse > 2 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(avgResponse)}</p><p className="text-[10px] text-muted">{ticketsWithAccept.length} งาน · เป้า ≤4h</p></div>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-[10px] text-muted">เวลาแก้งานเฉลี่ย</p><p className={`text-lg font-bold ${avgResolve !== null && avgResolve > 48 ? "text-red-400" : avgResolve !== null && avgResolve > 24 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(avgResolve)}</p><p className="text-[10px] text-muted">{ticketsWithResolve.length} งาน · เป้า ≤48h</p></div>
            <button onClick={() => setStatusFilter("open")} className="rounded-lg bg-card border border-rose-800/30 p-3 text-left hover:bg-card-hover"><p className="text-lg font-bold text-red-400">{overdueAccept.length}</p><p className="text-[10px] text-muted">เลย SLA ตอบรับ (open)</p></button>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-lg font-bold text-red-400">{slaBreachedResolve.length}</p><p className="text-[10px] text-muted">เลย SLA แก้งาน</p></div>
            <div className="rounded-lg bg-card border border-rose-800/30 p-3"><p className="text-lg font-bold text-amber-400">{list.filter(t => t.status === "open" && !t.accepted_at).length}</p><p className="text-[10px] text-muted">งานรอตอบรับ</p></div>
          </div>
          {(techResponse.length > 0 || typeResolve.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-rose-400 mb-2">⏱️ เวลาตอบรับเฉลี่ย ต่อช่าง <span className="text-muted font-normal">(ช้า → เร็ว)</span></h3>
                {techResponse.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีข้อมูลตอบรับ</p> : (<div className="space-y-1.5">{techResponse.map(t => (<div key={t.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate font-medium">{t.name}</span><span className="text-muted">{t.count} งาน</span><span className={`font-semibold w-16 text-right ${t.avgHours > 4 ? "text-red-400" : t.avgHours > 2 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(t.avgHours)}</span></div>))}</div>)}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-rose-400 mb-2">⏱️ เวลาแก้งานเฉลี่ย ต่อประเภท <span className="text-muted font-normal">(นาน → สั้น)</span></h3>
                {typeResolve.length === 0 ? <p className="text-[11px] text-muted">ยังไม่มีข้อมูลแก้งาน</p> : (<div className="space-y-1.5">{typeResolve.map(t => (<div key={t.type} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate font-medium">{t.label}</span><span className="text-muted">{t.count} งาน</span><span className={`font-semibold w-16 text-right ${t.avgHours > 48 ? "text-red-400" : t.avgHours > 24 ? "text-yellow-400" : "text-green-400"}`}>{fmtHours(t.avgHours)}</span><span className="text-muted text-[10px] w-14 text-right">{fmtHours(t.maxHours)}</span></div>))}<p className="text-[10px] text-muted pt-1">เฉลี่ย · นานสุด</p></div>)}
              </div>
            </div>
          )}
          {overdueAccept.length > 0 && (
            <div className="rounded-xl bg-card border border-red-800/50 p-3">
              <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ งานค้างรอรับ &gt; SLA ({overdueAccept.length})</h3>
              <div className="space-y-1">
                {overdueAccept.slice(0, 5).map(t => { const elapsed = (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000; const sla = t.sla_response_hours || 4; return (<div key={t.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border last:border-0"><span className="flex-1 truncate"><span className="font-medium">{typeLabels[t.type]}</span><span className="text-muted"> — {t.customer_name}</span></span><span className="text-muted">{t.assignment_mode === "all" ? "📢 broadcast" : t.assignment_mode === "by_skill" ? `🛠️ ${t.target_skill}` : t.assignment_mode === "by_area" ? `📍 ${t.target_area}` : t.technician ? `👤 ${t.technician}` : "ไม่ได้ระบุ"}</span><span className="text-red-400 font-semibold w-20 text-right">{fmtHours(elapsed)} (เลย {fmtHours(elapsed - sla)})</span></div>); })}
                {overdueAccept.length > 5 && <p className="text-[10px] text-muted pt-1">และอีก {overdueAccept.length - 5} รายการ...</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New Ticket Form (unchanged) ── */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <p className="text-xs text-muted uppercase mb-2">📞 ข้อมูลแจ้ง <span className="normal-case text-muted/60">(Admin บันทึกเมื่อรับแจ้ง)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">Admin ผู้รับแจ้ง</label><input placeholder="ชื่อ admin" value={form.reported_by} onChange={(e) => setForm({ ...form, reported_by: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">ช่องทางแจ้ง</label><select value={form.report_channel} onChange={(e) => setForm({ ...form, report_channel: e.target.value as NonNullable<ServiceTicket["report_channel"]> })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{Object.entries(channelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">วันที่ลูกค้าแจ้ง</label><input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>
          <p className="text-xs text-muted uppercase mb-2">ข้อมูลงาน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">ประเภทงาน</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ServiceTicket["type"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">{svcTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">ความสำคัญ</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as NonNullable<ServiceTicket["priority"]> })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="low">🟢 ต่ำ</option><option value="medium">🟡 ปกติ</option><option value="high">🟠 สูง</option><option value="critical">🔴 วิกฤต</option></select></div>
            <div><label className="text-[10px] text-muted">ลูกค้า</label><select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">โปรเจค</label><select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="text-[10px] text-muted">วันนัด</label><input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div>
              <label className="text-[10px] text-muted">🖥️ Asset / อุปกรณ์ที่เกี่ยวข้อง</label>
              <select value={form.asset_id} onChange={e => selectAsset(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                <option value="">-- ไม่ระบุ --</option>
                {assetList.filter(a => !form.customer_id || a.customer_id === form.customer_id).filter(a => a.status !== "decommissioned").map(a => (<option key={a.id} value={a.id}>{a.km_number} — {a.device_model} ({a.serial_number})</option>))}
              </select>
              {form.asset_id && <p className="text-[10px] text-accent mt-0.5">KM: {form.km_number} · <a href={`/assets/${form.asset_id}`} target="_blank" rel="noreferrer" className="hover:underline">ดู Asset →</a></p>}
            </div>
            <div className="col-span-full"><label className="text-[10px] text-muted">รายละเอียด *</label><textarea placeholder="Issue / Description" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-20 resize-y mt-1" /></div>
          </div>
          <p className="text-xs text-muted uppercase mb-2">📤 มอบหมายงาน <span className="normal-case text-accent">— เลือกวิธีกระจายงานให้ทีม Service</span></p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {(Object.keys(modeLabel) as Array<NonNullable<ServiceTicket["assignment_mode"]>>).map(m => (
              <button key={m} onClick={() => setForm({ ...form, assignment_mode: m })} className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${form.assignment_mode === m ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                <p className="text-base">{modeIcon[m]}</p>
                <p className="font-medium">{modeLabel[m].replace(/^[^\s]+ /, "")}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {form.assignment_mode === "individual" && (<div className="md:col-span-2"><label className="text-[10px] text-muted">เลือกช่าง</label><select value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1"><option value="">-- เลือกช่าง --</option>{svcUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.position && ` (${u.position})`}</option>)}</select></div>)}
            {form.assignment_mode === "all" && (<p className="md:col-span-2 text-[11px] text-muted bg-background rounded-lg border border-border px-3 py-2">📢 งานนี้จะกระจายให้ <b>{svcUsers.length} ช่าง Active</b> ทุกคน — ใครรับก่อน คนนั้นได้งาน</p>)}
            {form.assignment_mode === "by_skill" && (<div className="md:col-span-2"><label className="text-[10px] text-muted">ความถนัดที่ต้องการ</label><input placeholder="เช่น CCTV, Network, Solar, ไฟฟ้า" value={form.target_skill} onChange={(e) => setForm({ ...form, target_skill: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>)}
            {form.assignment_mode === "by_area" && (<div className="md:col-span-2"><label className="text-[10px] text-muted">พื้นที่รับผิดชอบ</label><input placeholder="เช่น สุราษฎร์ฯ, ภาคใต้ตอนบน, อ.เมือง" value={form.target_area} onChange={(e) => setForm({ ...form, target_area: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>)}
          </div>
          <p className="text-xs text-muted uppercase mb-2">⏱️ SLA <span className="normal-case text-muted/60">(เวลาเป้าหมาย)</span></p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">เวลาตอบรับเป้าหมาย (ชม.)</label><input type="number" placeholder="4" value={form.sla_response_hours || ""} onChange={(e) => setForm({ ...form, sla_response_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
            <div><label className="text-[10px] text-muted">เวลาแก้งานเป้าหมาย (ชม.)</label><input type="number" placeholder="48" value={form.sla_resolve_hours || ""} onChange={(e) => setForm({ ...form, sla_resolve_hours: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>
          <p className="text-xs text-muted uppercase mb-2">💎 รายได้ <span className="normal-case text-purple-400">— กรอกเมื่อปิดงาน (ไม่บังคับ)</span></p>
          <div className="rounded-lg border border-purple-800/20 bg-purple-900/5 px-3 py-2 text-[11px] text-purple-300/70 mb-3">
            💡 ต้นทุนรายการ (ค่าแรง · เดินทาง · อะไหล่) บันทึกได้ใน <span className="font-semibold text-purple-300">👁 Detail → 💰 ต้นทุน</span> หลังสร้าง Ticket แล้ว
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div><label className="text-[10px] text-muted">รายได้เรียกเก็บ (THB)</label><input type="number" placeholder="0" value={form.service_value || ""} onChange={(e) => updateMoney("service_value", Number(e.target.value))} className="w-full rounded-lg bg-background border border-purple-800/40 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 mt-1" /></div>
            <div><label className="text-[10px] text-muted">ชั่วโมงทำงาน (ไม่บังคับ)</label><input type="number" step="0.5" placeholder="0" value={form.hours_spent || ""} onChange={(e) => updateMoney("hours_spent", Number(e.target.value))} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" /></div>
          </div>
          {/* Auto-accept notice — แสดงเมื่อ manager ระบุช่าง */}
          {!isTechView && form.assignment_mode === "individual" && form.technician && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-900/15 border border-green-800/30 px-3 py-2">
              <span className="text-green-400 text-sm">✅</span>
              <p className="text-[11px] text-green-300">งานนี้จะ <b>รับทราบอัตโนมัติ</b> และมอบหมายให้ <b>{form.technician}</b> ทันทีที่สร้าง — ไม่ต้องรอช่างกดรับ</p>
            </div>
          )}
          <button onClick={handleSave} disabled={saving || !form.issue.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}

      {/* ── View Tabs + Ticket List (tickets tab only) ── */}
      {(isTechView || managerSection === "tickets") && (<>
      {/* ── View Tabs ── */}
      <div className="flex flex-wrap gap-1 mb-3">
        {VIEWS.map(v => {
          const count = (() => {
            switch (v.id) {
              case "all":     return baseTickets.filter(t => isActive(t.status)).length;
              case "new":     return baseTickets.filter(t => ["open","acknowledged"].includes(t.status)).length;
              case "doing":   return baseTickets.filter(t => ["traveling","on_site","repair_start","in_progress","resume"].includes(t.status)).length;
              case "parts":   return baseTickets.filter(t => t.status === "waiting_parts").length;
              case "overdue": return baseTickets.filter(t => isActive(t.status) && !!t.service_date && t.service_date < today).length;
              case "sla":     return baseTickets.filter(t => { if (!isActive(t.status) || !t.opened_at) return false; return (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 > (t.sla_resolve_hours || 48); }).length;
              case "today":   return baseTickets.filter(t => t.service_date === today && isActive(t.status)).length;
              case "pm":      return baseTickets.filter(t => t.type === "pm_service" && t.service_date === today).length;
              case "waiting": return baseTickets.filter(t => isActive(t.status) && !!t.service_date && t.service_date > today).length;
              case "history": return baseTickets.filter(t => ["resolved","closed"].includes(t.status)).length;
              default:        return 0;
            }
          })();
          const isActive2 = activeView === v.id;
          return (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                isActive2 ? "bg-accent/20 text-accent border-accent/40" : "bg-card border-border text-muted hover:bg-card-hover"
              }`}>
              <span>{v.icon}</span>
              <span>{v.label}</span>
              {count > 0 && (
                <span className={`rounded-full px-1.5 min-w-[18px] text-center text-[9px] font-bold ${
                  isActive2 ? "bg-accent text-white" :
                  v.id === "overdue" ? "bg-red-500/20 text-red-400" :
                  v.id === "new"     ? "bg-red-500/20 text-red-400" :
                  v.id === "sla"     ? "bg-red-500/20 text-red-400" :
                  v.id === "parts"   ? "bg-purple-500/20 text-purple-400" :
                  "bg-muted/20 text-muted"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          placeholder="ค้นหา issue / ลูกค้า / SN..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-40 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent text-muted">
          <option value="">ทุกประเภท</option>
          {svcTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | ServiceStatus)}
          className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent text-muted">
          <option value="all">ทุกสถานะ</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{statusIcon[s]} {statusLabel[s]}</option>)}
        </select>
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ</p>
      </div>

      {/* ── Ticket Detail Drawer ── */}
      {pendingChange && (
        <StatusUpdateModal
          ticket={pendingChange.ticket}
          newStatus={pendingChange.newStatus}
          onConfirm={confirmStatusChange}
          onCancel={() => setPendingChange(null)}
        />
      )}

      {selectedTicket && (
        <ServiceTicketDetail
          ticket={selectedTicket}
          allTickets={list}
          currentUserName={currentUser?.name || ""}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={(t, s) => setPendingChange({ ticket: t, newStatus: s })}
        />
      )}

      {/* ── Ticket List ── */}
      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm">ไม่พบงานใน{activeView === "all" ? "ระบบ" : `หมวด "${VIEWS.find(v => v.id === activeView)?.label}"`}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const cust      = custMap.get(t.customer_id || "");
            const location  = (t as unknown as Record<string,string>).location || cust?.address || cust?.province || "";
            const overdue   = t.service_date && t.service_date < today && isActive(t.status);
            const responseH = hoursBetween(t.opened_at, t.accepted_at ?? t.acknowledged_at);
            const waitPartsH= hoursBetween(t.waiting_parts_at, t.resume_at);
            const workH     = hoursBetween(t.started_at ?? t.repair_start_at, t.resolved_at);
            const totalH    = hoursBetween(t.opened_at, t.resolved_at ?? (isActive(t.status) ? new Date().toISOString() : undefined));
            const slaResp   = t.sla_response_hours || 4;
            const slaResolve= t.sla_resolve_hours || 48;
            const pendingH  = t.status === "open" && t.opened_at ? (nowMs - (parseISO(t.opened_at) || nowMs)) / 3600000 : null;
            const slaBreached = totalH !== null && totalH > slaResolve && isActive(t.status);
            const quickActions = getQuickActions(t.status);
            return (
              <div key={t.id} className={`rounded-xl bg-card border p-4 hover:bg-card-hover transition-colors ${slaBreached ? "border-red-800/50" : overdue ? "border-amber-800/40" : "border-border"}`}>

                {/* Row 1: Type + priority + flags | status badge */}
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{typeLabels[t.type]}</span>
                    {t.priority && t.priority !== "medium" && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${priorityBadge[t.priority]}`}>{priorityLabel[t.priority]}</span>
                    )}
                    {overdue && <span className="text-[10px] text-amber-400 rounded-full bg-amber-900/30 px-2 py-0.5">⚠ เลยกำหนด</span>}
                    {slaBreached && <span className="text-[10px] text-red-400 rounded-full bg-red-900/30 px-2 py-0.5">🚨 เลย SLA</span>}
                    {t.assignment_mode && t.assignment_mode !== "individual" && (
                      <span className="text-[10px] text-muted">{modeIcon[t.assignment_mode]}</span>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusColor[t.status] || "bg-gray-700 text-gray-300"}`}>
                    {statusIcon[t.status]} {statusLabel[t.status]}
                  </span>
                </div>

                {/* Issue description */}
                <p className="text-sm text-foreground mb-2 leading-snug">{t.issue}</p>

                {/* Row 2: Customer · Location · Asset · Technician · Date */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mb-2">
                  <span>🏢 {t.customer_name}</span>
                  {location && <span>📍 {location}</span>}
                  {t.km_number && (
                    t.asset_id
                      ? <Link href={`/assets/${t.asset_id}`} className="text-cyan-400 hover:underline font-mono">🖥️ {t.km_number}</Link>
                      : <span className="text-cyan-400/70 font-mono">🖥️ {t.km_number}</span>
                  )}
                  {t.technician && <span className="text-accent/80">🔧 {t.technician}</span>}
                  {t.service_date && <span className={overdue ? "text-amber-400" : ""}> 📅 {t.service_date}</span>}
                  {t.project_name && <span>📂 {t.project_name}</span>}
                </div>

                {/* Row 3: Time tracking pills */}
                {t.opened_at && (
                  <div className="flex items-center gap-1 text-[10px] mb-2.5 flex-wrap">
                    <span className="text-muted shrink-0">⏱️ เวลา:</span>
                    {responseH !== null ? (
                      <span className={`rounded px-1.5 py-0.5 ${responseH > slaResp ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`}>ตอบรับ {fmtHours(responseH)}</span>
                    ) : pendingH !== null ? (
                      <span className={`rounded px-1.5 py-0.5 ${pendingH > slaResp ? "bg-red-900/50 text-red-400" : "bg-amber-900/50 text-amber-400"}`}>รอรับ {fmtHours(pendingH)}{pendingH > slaResp && " ⚠"}</span>
                    ) : null}
                    {workH !== null && <span className="rounded px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400">ซ่อม {fmtHours(workH)}</span>}
                    {waitPartsH !== null && waitPartsH > 0 && <span className="rounded px-1.5 py-0.5 bg-purple-900/50 text-purple-400">รออะไหล่ {fmtHours(waitPartsH)}</span>}
                    {totalH !== null && <span className={`rounded px-1.5 py-0.5 font-medium ${totalH > slaResolve ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>รวม {fmtHours(totalH)}</span>}
                    {t.accepted_by && t.accepted_by !== t.technician && <span className="text-muted">· รับโดย {t.accepted_by}</span>}
                  </div>
                )}

                {/* SLA progress bar — only for active tickets */}
                {isActive(t.status) && t.opened_at && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] text-muted mb-0.5">
                      <span>SLA เป้า {slaResolve}h</span>
                      <span className={slaBreached ? "text-red-400" : "text-muted"}>{fmtHours(totalH)} ผ่านแล้ว</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted/20 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        (totalH || 0) / slaResolve >= 1 ? "bg-red-500" :
                        (totalH || 0) / slaResolve >= 0.75 ? "bg-amber-500" : "bg-green-500"
                      }`} style={{ width: `${Math.min(((totalH || 0) / slaResolve) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Finance row — view_finance only */}
                {canSeeFinance && showRevenue && (t.service_value || 0) > 0 && (
                  <p className="text-xs mb-2 text-purple-400/80">
                    💎 {(t.service_value || 0).toLocaleString()} ฿
                    {(t.service_cost || 0) > 0 && <span className="text-muted"> · ต้นทุน {(t.service_cost || 0).toLocaleString()}</span>}
                    <span className={`ml-1 font-semibold ${(t.gross_profit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      · กำไร {(t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))).toLocaleString()}
                    </span>
                  </p>
                )}

                {/* Action bar: Quick status buttons (Timer system) + Detail + Delete */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                  <div className="flex gap-1.5 flex-wrap">
                    {quickActions.map(a => (
                      <button key={a.status} onClick={() => setPendingChange({ ticket: t, newStatus: a.status })}
                        className={`text-[11px] rounded-lg px-2.5 py-1 transition-colors ${
                          a.primary
                            ? "bg-accent text-white hover:bg-accent-hover"
                            : "bg-card-hover border border-border text-muted hover:text-foreground"
                        }`}>{a.label}</button>
                    ))}
                    {quickActions.length === 0 && (
                      <select value={t.status} onChange={(e) => setPendingChange({ ticket: t, newStatus: e.target.value as ServiceStatus })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${statusColor[t.status]}`}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{statusIcon[s]} {statusLabel[s]}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => setSelectedTicket(t)} className="text-[10px] text-accent hover:underline">👁 Detail</button>
                    <button onClick={() => handleDelete(t.id!)} className="text-[10px] text-danger hover:underline">ลบ</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}
    </div>
  );
}
