"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { PresaleRequest, PresaleApprovalSettings, Customer, Project, JobRequest, User, Product, QuotationItem, BomItem, PresaleAttachment, IntegrationSetting } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { generateNumber } from "@/lib/numbering";
import { buildProjectFolderUrl, buildSubfolderUrl } from "@/lib/integrations";

const reqTypes = ["solution_design","requirement_summary","boq","technical_proposal","site_survey","project_planning"] as const;
const typeLabels: Record<string, string> = { solution_design: "Solution Design", requirement_summary: "Requirement Summary", boq: "BOQ Preparation", technical_proposal: "Technical Proposal", site_survey: "Site Survey", project_planning: "Project Planning" };
const typeDetails: Record<string, { icon: string; thai: string }> = {
  solution_design:     { icon: "🏗", thai: "ออกแบบระบบ" },
  requirement_summary: { icon: "📝", thai: "สรุปความต้องการ" },
  boq:                 { icon: "📊", thai: "จัดทำ BOQ" },
  technical_proposal:  { icon: "📄", thai: "เขียน Proposal" },
  site_survey:         { icon: "🔍", thai: "สำรวจหน้างาน" },
  project_planning:    { icon: "📅", thai: "วางแผนโครงการ" },
};

const empty = {
  activity_id: "", customer_id: "", customer_name: "", project_id: "", project_name: "",
  type: "boq" as PresaleRequest["type"], requirement: "", assigned_to: "", due_date: "",
  status: "new" as PresaleRequest["status"], value: 0,
  priority: "normal" as NonNullable<PresaleRequest["priority"]>,
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const statusLabel: Record<string, string> = {
  new: "ใหม่", pending: "ยังไม่เริ่ม", assigned: "มอบหมายแล้ว", in_progress: "กำลังทำ",
  waiting_info: "รอข้อมูล", waiting_approval: "รออนุมัติ", completed: "เสร็จแล้ว", cancelled: "ยกเลิก",
};
const statusColor: Record<string, string> = {
  new: "bg-slate-800/60 text-slate-300", pending: "bg-blue-900/50 text-blue-400",
  assigned: "bg-indigo-900/50 text-indigo-400", in_progress: "bg-yellow-900/50 text-yellow-400",
  waiting_info: "bg-orange-900/50 text-orange-400", waiting_approval: "bg-purple-900/50 text-purple-400",
  completed: "bg-green-900/50 text-green-400", cancelled: "bg-gray-900/50 text-gray-500",
};
const priorityLabel: Record<string, string> = { low: "ต่ำ", normal: "ปกติ", high: "สูง", urgent: "ด่วน!" };
const priorityColor: Record<string, string> = {
  low: "text-gray-400", normal: "text-blue-400", high: "text-amber-400", urgent: "text-red-400",
};

const ATTACHMENT_TYPE_META: Record<string, { icon: string; label: string }> = {
  design:       { icon: "🎨", label: "Design Drawing" },
  drawing:      { icon: "📐", label: "Floor Plan / Diagram" },
  presentation: { icon: "🎤", label: "Presentation" },
  spec:         { icon: "📄", label: "Spec Sheet" },
  image:        { icon: "🖼️", label: "Image / Photo" },
  document:     { icon: "📑", label: "Document" },
  other:        { icon: "📎", label: "Other" },
};

const emptyBomItem: BomItem = { code: "", name: "", brand: "", qty: 1, unit: "pcs", vendor: "", ref_url: "", notes: "" };
const emptyBoqItem: QuotationItem = { product_id: "", product_code: "", product_name: "", qty: 1, unit: "pcs", cost_price: 0, selling_price: 0, discount: 0, total_cost: 0, total_selling: 0, margin_percent: 0, ref_url: "" };
const emptyAttachment: PresaleAttachment = { type: "design", name: "", url: "", uploaded_at: "", uploaded_by: "", notes: "" };

type DetailTab = "summary" | "bom" | "boq" | "artifacts";

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function avatarBg(name: string): string {
  const palette = ["bg-blue-600","bg-violet-600","bg-pink-600","bg-indigo-600","bg-teal-600","bg-emerald-600","bg-amber-600","bg-rose-600"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return palette[Math.abs(h) % palette.length];
}

type SelectOption = { value: string; label: string; sublabel?: string };

function SearchableSelect({ value, options, onChange, placeholder = "เลือก...", emptyLabel, renderTrigger, renderItem }: {
  value: string; options: SelectOption[]; onChange: (v: string) => void;
  placeholder?: string; emptyLabel?: string;
  renderTrigger?: (sel: SelectOption | undefined) => ReactNode;
  renderItem?: (o: SelectOption, isSel: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  const selected = options.find(o => o.value === value);
  const filtered = q ? options.filter(o =>
    o.label.toLowerCase().includes(q.toLowerCase()) ||
    (o.sublabel || "").toLowerCase().includes(q.toLowerCase())
  ) : options;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(x => !x)}
        className="w-full flex items-center justify-between gap-2 rounded-lg bg-background border border-border px-3 py-2 text-sm text-left hover:border-accent/60 focus:outline-none focus:border-accent transition-colors min-h-[38px]">
        <span className="flex-1 min-w-0 truncate">
          {selected
            ? (renderTrigger ? renderTrigger(selected) : <span className="text-foreground">{selected.label}</span>)
            : <span className="text-muted">{placeholder}</span>}
        </span>
        <svg className={`w-3.5 h-3.5 text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl bg-card border border-border shadow-2xl overflow-hidden min-w-48">
          <div className="p-1.5 border-b border-border/40">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} onClick={e => e.stopPropagation()}
              placeholder="ค้นหา..." className="w-full rounded-lg bg-background border border-border/60 px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent" />
          </div>
          <div className="max-h-56 overflow-y-auto overscroll-contain">
            {emptyLabel !== undefined && (
              <button type="button" onClick={() => { onChange(""); setQ(""); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${!value ? "bg-accent/10 text-accent" : "text-muted hover:bg-card-hover"}`}>
                {emptyLabel}
              </button>
            )}
            {filtered.length === 0
              ? <p className="px-3 py-4 text-xs text-muted text-center">ไม่พบรายการ</p>
              : filtered.map(o => (
                <button type="button" key={o.value} onClick={() => { onChange(o.value); setQ(""); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 transition-colors ${o.value === value ? "bg-accent/10 text-accent" : "hover:bg-card-hover"}`}>
                  {renderItem ? renderItem(o, o.value === value) : <>
                    <p className="text-sm leading-tight">{o.label}</p>
                    {o.sublabel && <p className="text-[11px] text-muted mt-0.5">{o.sublabel}</p>}
                  </>}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

function detectUrlProvider(url: string): { icon: string; label: string; color: string } {
  if (!url) return { icon: "🔗", label: "Link", color: "text-muted" };
  const u = url.toLowerCase();
  if (u.includes("sharepoint.com"))                             return { icon: "📁", label: "SharePoint",   color: "text-blue-400" };
  if (u.includes("onedrive.live.com") || u.includes("1drv.ms")) return { icon: "☁️", label: "OneDrive",    color: "text-blue-400" };
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return { icon: "📂", label: "Google Drive", color: "text-yellow-400" };
  if (u.includes("dropbox.com"))                                return { icon: "📦", label: "Dropbox",     color: "text-blue-400" };
  return { icon: "🔗", label: "External URL", color: "text-muted" };
}

function extractFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    // Try last meaningful path segment
    const segments = u.pathname.split("/").map(s => decodeURIComponent(s)).filter(s => s && s.length > 1);
    const last = segments[segments.length - 1] || "";
    // Accept if it looks like a filename (has extension or non-hash text)
    if (last && !/^[A-Za-z0-9_-]{20,}$/.test(last)) return last.replace(/\?.*$/, "");
    // Fall back to hostname
    return u.hostname.replace(/^www\./, "");
  } catch { return ""; }
}

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
function renderNotesWithLinks(text: string) {
  const parts = text.split(URL_RE);
  return parts.map((part, idx) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0;
      const href = part.startsWith("http") ? part : `https://${part}`;
      return <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 break-all hover:text-blue-300">{part}</a>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function PriorityBadge({ priority }: { priority?: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    low:    { label: "Low",    cls: "bg-slate-800/60 text-slate-400 border-slate-700/50" },
    normal: { label: "Normal", cls: "bg-blue-900/40 text-blue-400 border-blue-800/40" },
    high:   { label: "High",   cls: "bg-amber-900/40 text-amber-400 border-amber-800/50" },
    urgent: { label: "Urgent", cls: "bg-red-900/50 text-red-400 border-red-800/50 font-bold" },
  };
  const p = priority || "normal";
  if (p === "normal") return null;
  const c = cfg[p] || cfg.normal;
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] tracking-wide ${c.cls}`}>{c.label}</span>;
}

// === SAMPLE TEMPLATES ===

const SOLUTION_SAMPLE = `# Server Room Solution — Phase 1

## 1. ขอบเขตโครงการ
- จัดทำห้อง Server ขนาด 30 ตร.ม. รองรับตู้ Rack 4 ตู้
- ครอบคลุม: โครงสร้าง · ระบบไฟฟ้า · Cooling · Network · Security

## 2. หลักการออกแบบ
- มาตรฐาน: ANSI/TIA-942-B Tier II, EN 50600
- Power: N+1 redundancy
- Cooling: N+1 redundancy (Hot/Cold aisle)
- รองรับขยาย Rack เพิ่ม 2 ตู้ในอนาคต

## 3. โครงสร้างห้อง
- พื้น Raised Floor 60 cm
- ฝ้า Suspended ceiling 30 cm
- ผนัง Fire-rated 2 ชม.
- ประตูทนไฟ + Access Control

## 4. ระบบไฟฟ้า
- UPS Online 80kVA × 2 (N+1) — runtime 15 นาที
- Generator Standby 100kVA — auto start
- PDU 32A × 8 ชุด (rack mount)
- ATS (Auto Transfer Switch)

## 5. ระบบ Cooling
- Precision Air 25kW × 2 (N+1)
- Hot Aisle Containment
- Temp/Humidity Monitoring 24x7
- Setpoint 22°C ± 2°C

## 6. ระบบ Network
- Core Switch: Cisco Nexus 9K-C9336C-FX2
- ToR Switch: Cisco N9K-C93180YC-FX × 2
- Cable Tray: Overhead 300mm
- Patch Panel + Label ตามมาตรฐาน

## 7. ระบบความปลอดภัย
- CCTV: IP Camera 4MP × 4 จุด + NVR 8TB
- Access Control: Card + Fingerprint
- Fire Suppression: FM-200 (Clean Agent)
- Water Leak Detection
- Environment Monitoring (Temp/Humidity/Smoke)

## 8. ระยะเวลาดำเนินการ
- เตรียมพื้นที่: 2 สัปดาห์
- ติดตั้งระบบ: 4 สัปดาห์
- ทดสอบ + Burn-in: 1 สัปดาห์
- รวมประมาณ 7 สัปดาห์

## 9. การรับประกัน
- สินค้าทั้งหมด: 3 ปี (วันที่ส่งมอบ)
- งานติดตั้ง: 1 ปี
- MA Service: เลือกได้ 8x5 / 24x7 (แยกใบเสนอราคา)

## 10. มูลค่าโครงการ (เบื้องต้น)
ดูรายละเอียดใน BOQ tab — แบ่งเป็น:
- Hardware + Software
- ค่าแรง + ค่าติดตั้ง (ตามมาตรฐานราชการ)
- ค่าควบคุมงาน + ดำเนินการ + กำไร`;

// Government / standard labor lines for BOQ — appended on demand
const GOV_LABOR_TEMPLATE: QuotationItem[] = [
  { product_id: "", product_code: "LABOR-TECH",      product_name: "ค่าแรงช่างเทคนิค",                       qty: 40, unit: "ชม.",   cost_price: 200,  selling_price: 250,  discount: 0, total_cost: 8000,  total_selling: 10000, margin_percent: 20 },
  { product_id: "", product_code: "LABOR-FOREMAN",   product_name: "ค่าแรงหัวหน้าช่าง / ผู้ควบคุมงาน",        qty: 16, unit: "ชม.",   cost_price: 280,  selling_price: 350,  discount: 0, total_cost: 4480,  total_selling: 5600,  margin_percent: 20 },
  { product_id: "", product_code: "TRAVEL",          product_name: "ค่าเดินทาง + ที่พัก (เหมา / Round trip)", qty: 4,  unit: "เที่ยว", cost_price: 1500, selling_price: 2000, discount: 0, total_cost: 6000,  total_selling: 8000,  margin_percent: 25 },
  { product_id: "", product_code: "SUPERVISION",     product_name: "ค่าควบคุมงาน (Supervision)",            qty: 1,  unit: "งาน",  cost_price: 5000, selling_price: 8000, discount: 0, total_cost: 5000,  total_selling: 8000,  margin_percent: 37.5 },
  { product_id: "", product_code: "OVERHEAD",        product_name: "ค่าดำเนินการ + ค่าใช้จ่ายส่วนกลาง (4% ของยอดวัสดุ)", qty: 1, unit: "งาน", cost_price: 0, selling_price: 0, discount: 0, total_cost: 0, total_selling: 0, margin_percent: 0 },
  { product_id: "", product_code: "PROFIT",          product_name: "ค่ากำไรของผู้รับเหมา (10% ของยอดวัสดุ + แรง)", qty: 1, unit: "งาน", cost_price: 0, selling_price: 0, discount: 0, total_cost: 0, total_selling: 0, margin_percent: 0 },
];

export default function PresalePage() {
  const { currentUser, hasPermission } = useCurrentUser();

  const [list, setList] = useState<PresaleRequest[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [integration, setIntegration] = useState<IntegrationSetting | null>(null);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [presaleUsers, setPresaleUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "my" | "overdue" | "today" | "in_progress" | "waiting" | "completed" | "cancelled">("all");
  const [typeFilter, setTypeFilter] = useState<"" | PresaleRequest["type"]>("");
  const [personFilter, setPersonFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Approval settings
  const [approvalSettings, setApprovalSettings] = useState<PresaleApprovalSettings | null>(null);
  const [showApprovalSettings, setShowApprovalSettings] = useState(false);
  const [savingAps, setSavingAps] = useState(false);
  const [apForm, setApForm] = useState({
    require_for_types: [] as string[],
    value_threshold: 0,
    primary_approver: "",
    substitute_approvers: [] as string[],
  });

  // Detail panel state
  const [detail, setDetail] = useState<PresaleRequest | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");

  // Inline editing state for artifacts (kept in detail context)
  const [bomLinks, setBomLinks] = useState<{ label: string; url: string }[]>([]);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [boqLinks, setBoqLinks] = useState<{ label: string; url: string }[]>([]);
  const [boqItems, setBoqItems] = useState<QuotationItem[]>([]);
  const [attachments, setAttachments] = useState<PresaleAttachment[]>([]);
  const [solutionSummary, setSolutionSummary] = useState("");
  const [artifactSearch, setArtifactSearch] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editingNotesIdx, setEditingNotesIdx] = useState<number | null>(null);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [r, c, p, jr, u, pd, ints, aps] = await Promise.all([
        fs.presaleRequests.list(), fs.customers.list(), fs.projects.list(),
        fs.jobRequests.list(), fs.users.list(), fs.products.list(),
        fs.integrationSettings.list(), fs.presaleApprovalSettings.list(),
      ]);
      setList(r); setCusts(c); setProjs(p);
      setProds(pd.filter(x => x.active));
      setAllUsers(u.filter(x => x.active));
      setIncomingReqs(jr.filter(j => j.request_to_team === "presale"));
      const presaleRoles = new Set(["presale", "Presales Engineer", "Presales Manager"]);
      setPresaleUsers(u.filter(x => x.active && (presaleRoles.has(x.role) || (x.extra_roles ?? []).some(r => presaleRoles.has(r)))));
      // Pick the first active integration (UX: simplicity)
      setIntegration(ints.find(i => i.active) || null);
      const latestAps = aps[0] || null;
      setApprovalSettings(latestAps);
      if (latestAps) setApForm({ require_for_types: latestAps.require_for_types || [], value_threshold: latestAps.value_threshold || 0, primary_approver: latestAps.primary_approver || "", substitute_approvers: latestAps.substitute_approvers || [] });
      // Refresh detail panel if open
      if (detail) {
        const updated = r.find(x => x.id === detail.id);
        if (updated) hydrateDetail(updated);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function hydrateDetail(r: PresaleRequest) {
    setDetail(r);
    setSolutionSummary(r.solution_summary || "");
    setBomLinks(r.bom_links || []);
    setBomItems(r.bom_items || []);
    setBoqLinks(r.boq_links || []);
    setBoqItems(r.boq_items || []);
    setAttachments(r.attachments || []);
  }
  function closeDetail() {
    setDetail(null);
    setDetailTab("summary");
    setSolutionSummary("");
    setBomLinks([]); setBomItems([]);
    setBoqLinks([]); setBoqItems([]);
    setAttachments([]);
  }

  // Role detection
  const myName = currentUser?.name || "";
  const myRole = currentUser?.role || "";
  const isAdmin = !currentUser || myRole === "admin" || myRole === "Administrator";
  const canApprove = isAdmin || hasPermission("approve_presale") ||
    approvalSettings?.primary_approver === myName ||
    (approvalSettings?.substitute_approvers || []).includes(myName);
  const isManager = canApprove || hasPermission("manage_presale");
  const ownOnly = !isManager && !!currentUser;

  function checkNeedsApproval(type: string, value: number): boolean {
    if (!approvalSettings) return false;
    const typeMatch = (approvalSettings.require_for_types || []).includes(type);
    const valueMatch = approvalSettings.value_threshold > 0 && value >= approvalSettings.value_threshold;
    return typeMatch || valueMatch;
  }

  // Filter
  const filtered = list.filter((r) => {
    if (ownOnly && r.assigned_to !== myName) return false;
    if (personFilter && r.assigned_to !== personFilter) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    const s = search.toLowerCase();
    if (s && !r.requirement.toLowerCase().includes(s) && !r.customer_name.toLowerCase().includes(s) &&
        !(r.project_name || "").toLowerCase().includes(s) && !(r.assigned_to || "").toLowerCase().includes(s)) return false;
    if (viewFilter === "my") return r.assigned_to === myName;
    if (viewFilter === "overdue") return !!(r.due_date && r.due_date < today && r.status !== "completed" && r.status !== "cancelled");
    if (viewFilter === "today") return r.due_date === today && r.status !== "completed" && r.status !== "cancelled";
    if (viewFilter === "in_progress") return r.status === "in_progress";
    if (viewFilter === "waiting") return r.status === "waiting_info" || r.status === "waiting_approval";
    if (viewFilter === "completed") return r.status === "completed";
    if (viewFilter === "cancelled") return r.status === "cancelled";
    return true;
  });

  // Dashboard stats (scoped to what user can see)
  const today = todayStr();
  const scopedList = ownOnly ? list.filter(r => r.assigned_to === myName) : list;
  const overdueList = scopedList.filter(r => r.due_date && r.due_date < today && r.status !== "completed" && r.status !== "cancelled");
  const dueTodayList = scopedList.filter(r => r.due_date === today && r.status !== "completed" && r.status !== "cancelled");
  const pendingApprovalList = list.filter(r => r.approval_status === "pending_review");
  const stats = {
    total: scopedList.length,
    myTasks: list.filter(r => r.assigned_to === myName && r.status !== "completed" && r.status !== "cancelled").length,
    inProgress: scopedList.filter(r => r.status === "in_progress").length,
    waiting: scopedList.filter(r => r.status === "waiting_info" || r.status === "waiting_approval").length,
    completed: scopedList.filter(r => r.status === "completed").length,
    overdue: overdueList.length,
    dueToday: dueTodayList.length,
    pendingReqs: incomingReqs.filter(r => r.status === "pending").length,
    pendingApproval: pendingApprovalList.length,
  };

  // Per-person workload — union of presaleUsers + actual assignees (so members with 0 tasks still show)
  const assigneeNames = [...new Set([
    ...presaleUsers.map(u => u.name),
    ...list.map(r => r.assigned_to).filter(Boolean),
  ])];
  const byPerson = assigneeNames.map(name => {
    const user = presaleUsers.find(u => u.name === name) ?? allUsers.find(u => u.name === name) ?? { id: name, name, role: "", active: true, tenant_id: "", email: "" } as unknown as User;
    return {
      user,
      active: list.filter(r => r.assigned_to === name && r.status !== "completed").length,
      overdue: list.filter(r => r.assigned_to === name && r.due_date && r.due_date < today && r.status !== "completed").length,
      pendingApproval: list.filter(r => r.assigned_to === name && r.approval_status === "pending_review").length,
      total: list.filter(r => r.assigned_to === name).length,
    };
  }).sort((a, b) => b.active - a.active);

  // Legacy workload (small widget — keep for non-manager)
  const workload = byPerson.slice(0, 5).map(w => ({ name: w.user.name, active: w.active }));

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); }

  function openAdd() { setEditId(null); setForm(empty); setShowForm(true); closeDetail(); }
  function openEdit(r: PresaleRequest) {
    setEditId(r.id!);
    setForm({
      activity_id: r.activity_id || "", customer_id: r.customer_id, customer_name: r.customer_name,
      project_id: r.project_id || "", project_name: r.project_name || "",
      type: r.type, requirement: r.requirement, assigned_to: r.assigned_to || "",
      due_date: r.due_date || "", status: r.status, value: r.value || 0,
      priority: (r.priority || "normal") as NonNullable<PresaleRequest["priority"]>,
    });
    setShowForm(true);
    closeDetail();
  }

  async function handleSave() {
    if (!form.requirement.trim()) return; setSaving(true);
    const { presaleRequests } = await import("@/lib/firestore");
    try {
      if (editId) {
        await presaleRequests.update(editId, form as unknown as Record<string, unknown>);
      } else {
        const needsApproval = checkNeedsApproval(form.type, form.value || 0);
        await presaleRequests.add({
          ...form,
          approval_status: needsApproval ? "pending_review" : "not_required",
          approval_requested_at: needsApproval ? todayStr() : "",
          co_approvers: [],
        } as unknown as Record<string, unknown>);
      }
      setForm(empty); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }
  async function handleDelete(id: string) {
    if (!confirm("ลบ task นี้?")) return;
    const { presaleRequests } = await import("@/lib/firestore");
    await presaleRequests.remove(id);
    if (detail?.id === id) closeDetail();
    await load();
  }

  async function handleApprove(r: PresaleRequest) {
    const note = prompt("หมายเหตุการอนุมัติ (ไม่บังคับ)") ?? "";
    const { presaleRequests } = await import("@/lib/firestore");
    await presaleRequests.update(r.id!, { approval_status: "approved", reviewed_by: myName, reviewed_at: todayStr(), review_note: note });
    if (detail?.id === r.id) setDetail({ ...r, approval_status: "approved", reviewed_by: myName, reviewed_at: todayStr(), review_note: note });
    await load();
  }
  async function handleReject(r: PresaleRequest) {
    const note = prompt("เหตุผลที่ส่งกลับแก้ไข:");
    if (!note) return;
    const { presaleRequests } = await import("@/lib/firestore");
    await presaleRequests.update(r.id!, { approval_status: "rejected", reviewed_by: myName, reviewed_at: todayStr(), review_note: note });
    if (detail?.id === r.id) setDetail({ ...r, approval_status: "rejected", reviewed_by: myName, reviewed_at: todayStr(), review_note: note });
    await load();
  }
  async function requestApproval(r: PresaleRequest) {
    const { presaleRequests } = await import("@/lib/firestore");
    await presaleRequests.update(r.id!, { approval_status: "pending_review", approval_requested_at: todayStr() });
    await load();
  }
  async function addCoApprover(r: PresaleRequest) {
    const name = prompt("ชื่อผู้ตรวจสอบร่วม:");
    if (!name) return;
    const existing = r.co_approvers || [];
    if (existing.includes(name)) { alert("มีชื่อนี้อยู่แล้ว"); return; }
    const { presaleRequests } = await import("@/lib/firestore");
    await presaleRequests.update(r.id!, { co_approvers: [...existing, name] });
    await load();
  }

  async function saveApprovalSettings() {
    setSavingAps(true);
    const { presaleApprovalSettings } = await import("@/lib/firestore");
    try {
      if (approvalSettings?.id) await presaleApprovalSettings.update(approvalSettings.id, apForm as unknown as Record<string, unknown>);
      else await presaleApprovalSettings.add(apForm as unknown as Record<string, unknown>);
      await load();
      setShowApprovalSettings(false);
    } catch (e) { console.error(e); }
    finally { setSavingAps(false); }
  }

  async function changeStatus(r: PresaleRequest, status: PresaleRequest["status"]) {
    const fs = await import("@/lib/firestore");
    await fs.presaleRequests.update(r.id!, { status });
    await load();
  }

  // === BOQ totals (auto) ===
  const boqTotals = (() => {
    const totalCost = boqItems.reduce((s, i) => s + (i.total_cost || 0), 0);
    const totalSelling = boqItems.reduce((s, i) => s + (i.total_selling || 0), 0);
    const grossProfit = totalSelling - totalCost;
    const gpPercent = totalSelling > 0 ? (grossProfit / totalSelling * 100) : 0;
    return { totalCost, totalSelling, grossProfit, gpPercent };
  })();

  // === Save artifacts (called from detail tabs) ===
  async function saveArtifacts() {
    if (!detail) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      await fs.presaleRequests.update(detail.id!, {
        solution_summary: solutionSummary,
        bom_links: bomLinks,
        bom_items: bomItems,
        boq_links: boqLinks,
        boq_items: boqItems,
        boq_total_cost: boqTotals.totalCost,
        boq_total_selling: boqTotals.totalSelling,
        boq_gp_percent: boqTotals.gpPercent,
        attachments,
      } as unknown as Record<string, unknown>);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  // === Sample loaders ===
  function loadSolutionSample() {
    if (solutionSummary && !confirm("จะเขียนทับ Solution Summary ที่มีอยู่หรือไม่?")) return;
    setSolutionSummary(SOLUTION_SAMPLE);
  }

  function addLaborTemplate() {
    // Skip codes that already exist to prevent duplicates
    const existingCodes = new Set(boqItems.map(i => i.product_code));
    const toAdd = GOV_LABOR_TEMPLATE.filter(t => !existingCodes.has(t.product_code)).map(t => ({ ...t }));
    if (toAdd.length === 0) { alert("รายการค่าแรงทั้งหมดอยู่ใน BOQ แล้ว"); return; }
    setBoqItems([...boqItems, ...toAdd]);
  }

  // Auto-compute % rows (OVERHEAD 4% / PROFIT 10%) based on subtotal of non-% rows
  function recalcLaborPercents() {
    const baseRows = boqItems.filter(i => i.product_code !== "OVERHEAD" && i.product_code !== "PROFIT");
    const baseSelling = baseRows.reduce((s, i) => s + (i.total_selling || 0), 0);
    const baseCost = baseRows.reduce((s, i) => s + (i.total_cost || 0), 0);
    setBoqItems(boqItems.map(i => {
      if (i.product_code === "OVERHEAD") {
        const sell = Math.round(baseSelling * 0.04);
        return { ...i, qty: 1, selling_price: sell, cost_price: Math.round(baseCost * 0.04), total_selling: sell, total_cost: Math.round(baseCost * 0.04), margin_percent: sell > 0 ? ((sell - Math.round(baseCost * 0.04)) / sell * 100) : 0 };
      }
      if (i.product_code === "PROFIT") {
        const sell = Math.round(baseSelling * 0.10);
        return { ...i, qty: 1, selling_price: sell, cost_price: 0, total_selling: sell, total_cost: 0, margin_percent: 100 };
      }
      return i;
    }));
  }

  // === BOM editor ===
  function addBomRow() { setBomItems([...bomItems, { ...emptyBomItem }]); }
  function updateBomRow(idx: number, field: keyof BomItem, val: string | number) {
    setBomItems(bomItems.map((b, i) => i === idx ? { ...b, [field]: val } : b));
  }
  function removeBomRow(idx: number) { setBomItems(bomItems.filter((_, i) => i !== idx)); }

  // === BOQ editor ===
  function addBoqRow() { setBoqItems([...boqItems, { ...emptyBoqItem }]); }
  function updateBoqRow(idx: number, field: string, val: string | number) {
    setBoqItems(boqItems.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      updated.total_cost = (updated.cost_price || 0) * (updated.qty || 0);
      updated.total_selling = ((updated.selling_price || 0) - (updated.discount || 0)) * (updated.qty || 0);
      updated.margin_percent = updated.selling_price > 0 ? ((updated.selling_price - updated.cost_price) / updated.selling_price * 100) : 0;
      return updated;
    }));
  }
  function selectBoqProduct(idx: number, productId: string) {
    const p = prods.find(x => x.id === productId);
    if (!p) return;
    setBoqItems(boqItems.map((it, i) => i === idx ? {
      ...it,
      product_id: p.id || "",
      product_code: p.code || "",
      product_name: p.name,
      unit: p.unit || it.unit,
      cost_price: p.cost_price || 0,
      selling_price: p.selling_price || 0,
      total_cost: (p.cost_price || 0) * it.qty,
      total_selling: ((p.selling_price || 0) - it.discount) * it.qty,
      margin_percent: p.selling_price > 0 ? ((p.selling_price - (p.cost_price || 0)) / p.selling_price * 100) : 0,
    } : it));
  }
  function removeBoqRow(idx: number) { setBoqItems(boqItems.filter((_, i) => i !== idx)); }

  // === Attachment editor ===
  function addAttachmentRow() {
    setAttachments([...attachments, { ...emptyAttachment, uploaded_at: todayStr(), uploaded_by: detail?.assigned_to || "" }]);
  }
  function addAttachmentWithUrl(url: string, name: string, type: PresaleAttachment["type"] = "other") {
    setAttachments([...attachments, { type, name, url, uploaded_at: todayStr(), uploaded_by: detail?.assigned_to || "", notes: "" }]);
  }
  function updateAttachment(idx: number, field: keyof PresaleAttachment, val: string) {
    setAttachments(attachments.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  }
  function removeAttachment(idx: number) { setAttachments(attachments.filter((_, i) => i !== idx)); }

  function copyLink(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  }

  // === Convert BOQ → Quotation ===
  async function convertToQuotation() {
    if (!detail) return;
    if (boqItems.length === 0) { alert("ยังไม่มี BOQ items"); return; }
    if (!detail.customer_id) { alert("Task นี้ยังไม่ได้ผูก customer"); return; }
    if (detail.converted_to_quotation_id) {
      if (!confirm("Task นี้ถูก convert เป็น QT แล้ว — สร้างใบใหม่อีกใบ?")) return;
    } else {
      if (!confirm(`สร้าง Quotation จาก BOQ (${boqItems.length} รายการ, ${boqTotals.totalSelling.toLocaleString()} THB) ?`)) return;
    }
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const qNum = (await generateNumber("quotation", { user_code: "" })) || `QT-${Date.now().toString(36).toUpperCase()}`;
      // Save artifacts first
      await fs.presaleRequests.update(detail.id!, {
        solution_summary: solutionSummary, bom_links: bomLinks, bom_items: bomItems, boq_links: boqLinks, boq_items: boqItems,
        boq_total_cost: boqTotals.totalCost, boq_total_selling: boqTotals.totalSelling, boq_gp_percent: boqTotals.gpPercent,
        attachments,
      } as unknown as Record<string, unknown>);
      // Create quotation
      const docRef = await fs.quotations.add({
        quotation_number: qNum,
        customer_id: detail.customer_id, customer_name: detail.customer_name,
        project_id: detail.project_id || "", project_name: detail.project_name || "",
        items: boqItems,
        total_cost: boqTotals.totalCost, total_selling: boqTotals.totalSelling, total_discount: boqItems.reduce((s, i) => s + (i.discount || 0) * (i.qty || 0), 0),
        gross_profit: boqTotals.grossProfit, gp_percent: boqTotals.gpPercent,
        vat_mode: "exclusive", vat_rate: 7, vat_amount: boqTotals.totalSelling * 0.07, grand_total: boqTotals.totalSelling * 1.07,
        status: "draft", notes: `สร้างจาก Presale Task: ${typeLabels[detail.type]} — ${detail.requirement.slice(0, 80)}`,
        created_by: detail.assigned_to || "",
      } as unknown as Record<string, unknown>);
      // Link back
      await fs.presaleRequests.update(detail.id!, {
        converted_to_quotation_id: docRef.id,
        converted_quotation_number: qNum,
        converted_at: todayStr(),
      });
      await load();
      alert(`✓ สร้าง Quotation ${qNum} เรียบร้อย — เปิด /quotations เพื่อดู`);
    } catch (e) { console.error(e); alert("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      {/* Incoming Job Requests */}
      {incomingReqs.filter(r => r.status === "pending").length > 0 && (
        <div className="rounded-xl bg-purple-900/10 border border-purple-800/50 p-4 mb-4">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">📥 Job Requests จากทีม Sales ({incomingReqs.filter(r => r.status === "pending").length} รายการรออนุมัติ)</h3>
          <div className="space-y-2">
            {incomingReqs.filter(r => r.status === "pending").map(r => (
              <div key={r.id} className="rounded-lg bg-card border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted mt-0.5">{r.description}</p>
                    <p className="text-xs text-muted mt-1">จาก: {r.request_from} · ลูกค้า: {r.customer_name} · มูลค่า: {(r.value || 0).toLocaleString()} THB · กำหนด: {r.due_date || "-"}</p>
                    <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.priority === "urgent" ? "bg-red-900/50 text-red-400" : r.priority === "high" ? "bg-amber-900/50 text-amber-400" : "bg-blue-900/50 text-blue-400"}`}>{r.priority}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <select id={`assign-${r.id}`} defaultValue="" className="rounded bg-background border border-border px-2 py-1 text-xs"><option value="">-- มอบหมายให้ --</option>{presaleUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
                    <div className="flex gap-1">
                      <button onClick={async () => {
                        const assignTo = (document.getElementById(`assign-${r.id}`) as HTMLSelectElement)?.value;
                        const note = prompt("หมายเหตุรับงาน (ไม่บังคับ)") || "";
                        const { jobRequests } = await import("@/lib/firestore");
                        await jobRequests.update(r.id!, { status: "accepted", assigned_to: assignTo, accept_note: note }); await load();
                      }} className="text-[10px] bg-green-800/50 text-green-400 rounded px-2 py-1 hover:bg-green-800">✓ รับงาน</button>
                      <button onClick={async () => {
                        const reason = prompt("เหตุผลที่ปฏิเสธ:");
                        if (!reason) return;
                        const { jobRequests } = await import("@/lib/firestore");
                        await jobRequests.update(r.id!, { status: "rejected", reject_reason: reason }); await load();
                      }} className="text-[10px] bg-red-800/50 text-red-400 rounded px-2 py-1 hover:bg-red-800">✗ ปฏิเสธ</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="งานพรีเซลล์ — BOQ / Solution Design / Site Survey">Presale Tasks</h1>
          <p className="text-xs text-muted">งาน BOQ / Solution Design / Site Survey — รับงานจาก Sales และติดตามสถานะ</p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <button onClick={() => setShowApprovalSettings(v => !v)} className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-card-hover" title="ตั้งค่าการอนุมัติ">⚙ Approval</button>
          )}
          <Link href="/presale/calendar" title="ปฏิทินงาน Presale" className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-card-hover">📅 ปฏิทิน</Link>
          <button onClick={() => { if (showForm) { setShowForm(false); setEditId(null); } else openAdd(); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Task"}</button>
        </div>
      </div>

      {/* Approval Settings Panel */}
      {showApprovalSettings && isManager && (
        <div className="rounded-xl bg-card border border-accent/40 p-5 mb-4">
          <h2 className="text-sm font-semibold mb-3">⚙ ตั้งค่าการอนุมัติงาน Presale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted mb-1.5">ประเภทงานที่ต้องขออนุมัติ</p>
              <div className="flex flex-wrap gap-1.5">
                {reqTypes.map(t => (
                  <button key={t} type="button"
                    onClick={() => setApForm(f => ({ ...f, require_for_types: f.require_for_types.includes(t) ? f.require_for_types.filter(x => x !== t) : [...f.require_for_types, t] }))}
                    className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${apForm.require_for_types.includes(t) ? "bg-accent text-white border-accent" : "border-border text-muted hover:border-accent/60"}`}>
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">มูลค่างานขั้นต่ำที่ต้องขออนุมัติ (0 = ทุกงาน)</p>
              <input type="number" value={apForm.value_threshold} onChange={e => setApForm(f => ({ ...f, value_threshold: Number(e.target.value) }))} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="เช่น 500000" />
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">ผู้อนุมัติหลัก (Presale Manager)</p>
              <select value={apForm.primary_approver} onChange={e => setApForm(f => ({ ...f, primary_approver: e.target.value }))} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="">-- เลือกผู้อนุมัติ --</option>
                {allUsers.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">ผู้ตรวจสอบแทน (เมื่อผู้อนุมัติหลักไม่อยู่)</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {apForm.substitute_approvers.map(n => (
                  <span key={n} className="rounded-full bg-card border border-border px-2 py-0.5 text-[11px] flex items-center gap-1">
                    {n}
                    <button onClick={() => setApForm(f => ({ ...f, substitute_approvers: f.substitute_approvers.filter(x => x !== n) }))} className="text-danger hover:opacity-70">✕</button>
                  </span>
                ))}
              </div>
              <select onChange={e => { if (!e.target.value || apForm.substitute_approvers.includes(e.target.value)) return; setApForm(f => ({ ...f, substitute_approvers: [...f.substitute_approvers, e.target.value] })); e.target.value = ""; }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="">+ เพิ่มผู้ตรวจสอบแทน</option>
                {allUsers.filter(u => !apForm.substitute_approvers.includes(u.name) && u.name !== apForm.primary_approver).map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={saveApprovalSettings} disabled={savingAps} className="rounded-lg bg-accent text-white px-4 py-1.5 text-sm hover:bg-accent-hover disabled:opacity-50">{savingAps ? "บันทึก..." : "💾 บันทึกการตั้งค่า"}</button>
            <button onClick={() => setShowApprovalSettings(false)} className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Dashboard KPIs */}
      {!loading && (
        <div className="mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <button onClick={() => setViewFilter("all")} className={`rounded-xl border p-3 text-left transition-colors ${viewFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted mt-0.5">ทั้งหมด</p>
            </button>
            <button onClick={() => setViewFilter("my")} className={`rounded-xl border p-3 text-left transition-colors ${viewFilter === "my" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-2xl font-bold text-accent">{stats.myTasks}</p>
              <p className="text-xs text-muted mt-0.5">งานของฉัน</p>
            </button>
            <button onClick={() => setViewFilter("overdue")} className={`rounded-xl border p-3 text-left transition-colors ${viewFilter === "overdue" ? "border-red-500 bg-red-900/10" : stats.overdue > 0 ? "border-red-800/50 bg-card hover:bg-card-hover" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
              <p className="text-xs text-muted mt-0.5">เกินกำหนด</p>
            </button>
            <button onClick={() => setViewFilter("today")} className={`rounded-xl border p-3 text-left transition-colors ${viewFilter === "today" ? "border-amber-500 bg-amber-900/10" : stats.dueToday > 0 ? "border-amber-800/40 bg-card hover:bg-card-hover" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-2xl font-bold text-amber-400">{stats.dueToday}</p>
              <p className="text-xs text-muted mt-0.5">ครบกำหนดวันนี้</p>
            </button>
            <button onClick={() => setViewFilter("in_progress")} className={`rounded-xl border p-3 text-left transition-colors ${viewFilter === "in_progress" ? "border-yellow-500 bg-yellow-900/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-2xl font-bold text-yellow-400">{stats.inProgress}</p>
              <p className="text-xs text-muted mt-0.5">กำลังทำ</p>
            </button>
            <button onClick={() => setViewFilter("completed")} className={`rounded-xl border p-3 text-left transition-colors ${viewFilter === "completed" ? "border-green-500 bg-green-900/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              <p className="text-xs text-muted mt-0.5">เสร็จแล้ว</p>
            </button>
          </div>
          {isManager && byPerson.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted">👥 ภาระงานแต่ละคน</p>
                {personFilter && <button onClick={() => setPersonFilter("")} className="text-[10px] text-accent hover:underline">× ล้างตัวกรอง</button>}
              </div>
              <div className="flex flex-wrap gap-2">
                {byPerson.map(w => (
                  <button key={w.user.id} onClick={() => setPersonFilter(prev => prev === w.user.name ? "" : w.user.name)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${personFilter === w.user.name ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
                    <p className="text-xs font-semibold">{w.user.name}</p>
                    <p className="text-[10px] text-muted">{w.user.role}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] text-yellow-400">{w.active} งาน</span>
                      {w.overdue > 0 && <span className="text-[10px] text-red-400">⚠ {w.overdue}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{editId ? "✏ แก้ไข Task" : "+ Task ใหม่"}</h2>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="w-7 h-7 rounded-lg border border-border text-muted hover:bg-card-hover flex items-center justify-center text-sm leading-none">✕</button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">ประเภทงาน <span className="text-red-400">*</span></p>
                <SearchableSelect
                  value={form.type}
                  options={reqTypes.map(t => ({ value: t, label: `${typeDetails[t]?.icon} ${typeLabels[t]}`, sublabel: typeDetails[t]?.thai }))}
                  onChange={v => setForm({ ...form, type: v as PresaleRequest["type"] })}
                  placeholder="เลือกประเภทงาน"
                />
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">Priority</p>
                <SearchableSelect
                  value={form.priority}
                  options={[
                    { value: "low",    label: "Low",    sublabel: "ความสำคัญต่ำ" },
                    { value: "normal", label: "Normal", sublabel: "ปกติ" },
                    { value: "high",   label: "High",   sublabel: "ความสำคัญสูง" },
                    { value: "urgent", label: "Urgent", sublabel: "ด่วน — ต้องดำเนินการทันที" },
                  ]}
                  onChange={v => setForm({ ...form, priority: v as NonNullable<PresaleRequest["priority"]> })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">ลูกค้า</p>
                <SearchableSelect
                  value={form.customer_id}
                  options={custs.map(c => ({ value: c.id || "", label: c.company_name, sublabel: c.province || "" }))}
                  onChange={v => selectCust(v)}
                  emptyLabel="— ไม่ระบุลูกค้า —"
                  placeholder="เลือกลูกค้า"
                />
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">
                  โปรเจค {form.customer_id && <span className="text-accent/70 font-normal">· filter ตามลูกค้า</span>}
                </p>
                <SearchableSelect
                  value={form.project_id}
                  options={(form.customer_id ? projs.filter(p => p.customer_id === form.customer_id) : projs).map(p => ({ value: p.id || "", label: p.name, sublabel: p.customer_name }))}
                  onChange={v => selectProj(v)}
                  emptyLabel="— ไม่ระบุโปรเจค —"
                  placeholder="เลือกโปรเจค"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">มอบหมายให้</p>
                <SearchableSelect
                  value={form.assigned_to}
                  options={presaleUsers.map(u => ({ value: u.name, label: u.name, sublabel: u.role }))}
                  onChange={v => setForm({ ...form, assigned_to: v })}
                  emptyLabel="— ยังไม่มอบหมาย —"
                  placeholder="เลือกผู้รับผิดชอบ"
                  renderTrigger={sel => sel ? (
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full ${avatarBg(sel.value)} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>{sel.value.slice(0,2).toUpperCase()}</span>
                      <span className="text-foreground truncate">{sel.label}</span>
                      <span className="text-muted text-[11px] shrink-0">{sel.sublabel}</span>
                    </span>
                  ) : undefined}
                  renderItem={(o, isSel) => (
                    <div className="flex items-center gap-2.5 py-0.5">
                      <div className={`w-7 h-7 rounded-full ${avatarBg(o.value)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>{o.value.slice(0,2).toUpperCase()}</div>
                      <div>
                        <p className={`text-sm leading-tight ${isSel ? "font-medium" : ""}`}>{o.label}</p>
                        <p className="text-[11px] text-muted">{o.sublabel}</p>
                      </div>
                    </div>
                  )}
                />
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">Due Date</p>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">Status</p>
                <SearchableSelect
                  value={form.status}
                  options={[
                    { value: "new",              label: "ใหม่",          sublabel: "New" },
                    { value: "pending",          label: "ยังไม่เริ่ม",   sublabel: "Pending" },
                    { value: "assigned",         label: "มอบหมายแล้ว",   sublabel: "Assigned" },
                    { value: "in_progress",      label: "กำลังทำ",       sublabel: "In Progress" },
                    { value: "waiting_info",     label: "รอข้อมูล",      sublabel: "Waiting Info" },
                    { value: "waiting_approval", label: "รออนุมัติ",     sublabel: "Waiting Approval" },
                    { value: "completed",        label: "เสร็จแล้ว",     sublabel: "Completed" },
                    { value: "cancelled",        label: "ยกเลิก",        sublabel: "Cancelled" },
                  ]}
                  onChange={v => setForm({ ...form, status: v as PresaleRequest["status"] })}
                />
              </div>
              <div>
                <p className="text-xs text-muted mb-1.5 font-medium">มูลค่าโครงการ (THB)</p>
                <input type="number" placeholder="0" value={form.value || ""} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
                {!editId && checkNeedsApproval(form.type, form.value || 0) && (
                  <p className="text-[10px] text-orange-400 mt-1">⚠ งานนี้จะต้องผ่านการอนุมัติ</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5 font-medium">Requirement <span className="text-red-400">*</span></p>
              <textarea placeholder="อธิบายความต้องการ / สิ่งที่ต้องทำ..." value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent hover:border-accent/50 transition-colors min-h-24 resize-y" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving || !form.requirement.trim()} className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : editId ? "💾 บันทึก" : "➕ สร้าง Task"}
            </button>
          </div>
        </div>
      )}

      {/* Detail panel — artifacts */}
      {detail && (
        <div className="rounded-xl bg-card border border-accent/40 p-5 mb-4">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>{typeDetails[detail.type]?.icon}</span>
                  <span>{typeLabels[detail.type]}</span>
                  <span className="text-sm font-normal text-muted">{typeDetails[detail.type]?.thai}</span>
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[detail.status]}`}>{statusLabel[detail.status]}</span>
                {/* Approval badge */}
                {detail.approval_status === "pending_review" && <span className="rounded-full bg-orange-900/50 text-orange-400 px-2 py-0.5 text-[10px]">🔍 รอตรวจสอบ</span>}
                {detail.approval_status === "approved" && <span className="rounded-full bg-green-900/50 text-green-400 px-2 py-0.5 text-[10px]" title={`อนุมัติโดย ${detail.reviewed_by} — ${detail.reviewed_at}${detail.review_note ? ` · ${detail.review_note}` : ""}`}>✅ อนุมัติแล้ว</span>}
                {detail.approval_status === "rejected" && <span className="rounded-full bg-red-900/50 text-red-400 px-2 py-0.5 text-[10px]" title={detail.review_note || ""}>❌ ส่งกลับแก้ไข{detail.review_note ? ` — ${detail.review_note}` : ""}</span>}
                {detail.converted_to_quotation_id && (
                  <Link href="/quotations" className="rounded-full bg-emerald-900/50 text-emerald-400 px-2 py-0.5 text-[10px] hover:underline" title={`Converted to ${detail.converted_quotation_number}`}>✓ → {detail.converted_quotation_number}</Link>
                )}
              </div>
              <p className="text-sm text-muted flex flex-wrap gap-x-2 items-center">
                {detail.customer_id ? <Link href={`/customers/${detail.customer_id}`} className="hover:text-accent hover:underline">{detail.customer_name}</Link> : <span>{detail.customer_name}</span>}
                {detail.project_name && <span>· {detail.project_name}</span>}
                {detail.assigned_to && <span>· 👤 {detail.assigned_to}</span>}
                {detail.due_date && <span>· 📅 <span className={detail.due_date < today && detail.status !== "completed" ? "text-red-400" : ""}>{detail.due_date}</span></span>}
                {(detail.value || 0) > 0 && <span>· 💰 {(detail.value || 0).toLocaleString()} THB</span>}
              </p>
              <p className="text-xs text-muted mt-1 italic">📋 {detail.requirement}</p>
              {/* Approval actions for approvers */}
              {canApprove && detail.approval_status === "pending_review" && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleApprove(detail)} className="rounded-lg bg-green-700/60 text-green-200 px-3 py-1 text-xs hover:bg-green-700">✅ อนุมัติ</button>
                  <button onClick={() => handleReject(detail)} className="rounded-lg bg-red-700/60 text-red-200 px-3 py-1 text-xs hover:bg-red-700">❌ ส่งกลับแก้ไข</button>
                  <button onClick={() => addCoApprover(detail)} className="rounded-lg border border-border text-muted px-3 py-1 text-xs hover:bg-card-hover">+ ผู้ตรวจสอบร่วม</button>
                </div>
              )}
              {detail.co_approvers && detail.co_approvers.length > 0 && (
                <p className="text-[10px] text-muted mt-1">ผู้ตรวจสอบร่วม: {detail.co_approvers.join(", ")}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <select value={detail.status} onChange={e => changeStatus(detail, e.target.value as PresaleRequest["status"])} className={`rounded-full px-3 py-1 text-xs border-0 focus:outline-none cursor-pointer ${statusColor[detail.status] || ""}`}>
                <option value="new">ใหม่</option>
                <option value="pending">ยังไม่เริ่ม</option>
                <option value="assigned">มอบหมายแล้ว</option>
                <option value="in_progress">กำลังทำ</option>
                <option value="waiting_info">รอข้อมูล</option>
                <option value="waiting_approval">รออนุมัติ</option>
                <option value="completed">เสร็จแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
              <button onClick={() => openEdit(detail)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-card-hover">แก้ไข Task</button>
              <button onClick={closeDetail} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ปิด</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 border-b border-border overflow-x-auto">
            {(["summary","bom","boq","artifacts"] as const).map(t => {
              const summarySections = solutionSummary.trim() ? ((solutionSummary.match(/^#{1,3}\s/gm) || []).length || 1) : 0;
              const labels: Record<DetailTab, string> = {
                summary: `📋 Solution${summarySections > 0 ? ` (${summarySections})` : ""}`,
                bom: `🛒 BOM${bomItems.length > 0 ? ` (${bomItems.length})` : ""}`,
                boq: `💰 BOQ${boqItems.length > 0 ? ` (${boqItems.length})` : ""}`,
                artifacts: `📎 Artifacts${attachments.length > 0 ? ` (${attachments.length})` : ""}`,
              };
              return (
                <button key={t} onClick={() => setDetailTab(t)} className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${detailTab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>{labels[t]}</button>
              );
            })}
          </div>

          {/* Summary tab */}
          {detailTab === "summary" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted">แนวทางแก้ปัญหา / Solution Concept (รองรับ markdown — ใช้ #, ##, -, *, ฯลฯ)</p>
                <button onClick={loadSolutionSample} className="text-[10px] text-accent hover:underline">📥 โหลดตัวอย่าง Server Room</button>
              </div>
              <textarea
                value={solutionSummary}
                onChange={e => setSolutionSummary(e.target.value)}
                placeholder="เช่น: ออกแบบระบบ Server Room ขนาด 30 ตู้ พร้อม UPS 80kVA ใช้ Dell PowerEdge R750 + NetApp Storage..."
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-64 resize-y font-mono"
              />
              <p className="text-[10px] text-muted">💡 ใช้ Markdown แสดงผลเป็นโครงสร้าง: # หัวข้อหลัก · ## หัวข้อรอง · - bullet · **เด่น** · `code`</p>
            </div>
          )}

          {/* BOM tab */}
          {detailTab === "bom" && (
            <div className="space-y-3">
              {/* BOM Links */}
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted">📎 ไฟล์ BOM</span>
                  <button onClick={() => setBomLinks([...bomLinks, { label: "", url: "" }])} className="text-[10px] text-accent hover:underline">+ เพิ่มลิงก์</button>
                </div>
                {bomLinks.length === 0 && (
                  <p className="text-[10px] text-muted/60 italic">ยังไม่มีไฟล์ — กด "+ เพิ่มลิงก์" เพื่อแนบไฟล์ BOM</p>
                )}
                {bomLinks.map((fl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={fl.label}
                      onChange={e => setBomLinks(bomLinks.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
                      placeholder="ชื่อไฟล์ เช่น BOM_CCTV V1"
                      className="w-48 shrink-0 rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    />
                    <input
                      value={fl.url}
                      onChange={e => {
                        const url = e.target.value;
                        const auto = fl.label ? fl.label : extractFilenameFromUrl(url);
                        setBomLinks(bomLinks.map((x, i) => i === idx ? { ...x, url, label: auto || fl.label } : x));
                      }}
                      placeholder="วางลิงก์ไฟล์ (OneDrive / SharePoint / Google Drive…)"
                      className="flex-1 rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent font-mono"
                    />
                    {fl.url && /^(https?:\/\/|www\.)\S+/.test(fl.url.trim()) && (
                      <a href={fl.url.trim().startsWith("http") ? fl.url.trim() : `https://${fl.url.trim()}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap" title="เปิดไฟล์">↗ {fl.label || "เปิด"}</a>
                    )}
                    <button onClick={() => setBomLinks(bomLinks.filter((_, i) => i !== idx))} className="text-danger text-xs shrink-0">✕</button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted">รายการอุปกรณ์ (เน้นการสั่งซื้อ — ไม่ต้องมีราคา)</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-left text-[10px] text-muted uppercase">
                    <th className="px-2 py-1.5 w-28">รหัส</th>
                    <th className="px-2 py-1.5">ชื่อ</th>
                    <th className="px-2 py-1.5 w-28">Brand</th>
                    <th className="px-2 py-1.5 w-16">Qty</th>
                    <th className="px-2 py-1.5 w-16">Unit</th>
                    <th className="px-2 py-1.5 w-32">ผู้จำหน่าย</th>
                    <th className="px-2 py-1.5 w-36">ลิงก์ไฟล์</th>
                    <th className="px-2 py-1.5">หมายเหตุ</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr></thead>
                  <tbody>{bomItems.map((b, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-1 py-1"><input value={b.code} onChange={e => updateBomRow(i, "code", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs font-mono focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input value={b.name} onChange={e => updateBomRow(i, "name", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input value={b.brand} onChange={e => updateBomRow(i, "brand", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input type="number" value={b.qty || ""} onChange={e => updateBomRow(i, "qty", Number(e.target.value))} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input value={b.unit} onChange={e => updateBomRow(i, "unit", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input value={b.vendor ?? ""} onChange={e => updateBomRow(i, "vendor", e.target.value)} placeholder="ชื่อผู้จำหน่าย" className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-1">
                          <input value={b.ref_url ?? ""} onChange={e => updateBomRow(i, "ref_url", e.target.value)} placeholder="วางลิงก์..." className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" />
                          {b.ref_url && /^(https?:\/\/|www\.)\S+/.test(b.ref_url.trim()) && (
                            <a href={b.ref_url.trim().startsWith("http") ? b.ref_url.trim() : `https://${b.ref_url.trim()}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-300 text-sm leading-none" title="เปิดลิงก์">↗</a>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-1">
                        {editingNotesIdx === i ? (
                          <input autoFocus value={b.notes} onChange={e => updateBomRow(i, "notes", e.target.value)} onBlur={() => setEditingNotesIdx(null)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" />
                        ) : (
                          <div onClick={() => setEditingNotesIdx(i)} className="min-h-[26px] w-full rounded border border-transparent hover:border-border px-1.5 py-1 text-xs cursor-text leading-relaxed">
                            {b.notes ? renderNotesWithLinks(b.notes) : <span className="text-muted/40">หมายเหตุ</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1"><button onClick={() => removeBomRow(i)} className="text-danger text-xs">✕</button></td>
                    </tr>
                  ))}{bomItems.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-3 text-xs text-muted text-center">ยังไม่มี BOM items — กดเพิ่มได้เลย</td></tr>
                  )}</tbody>
                </table>
              </div>
              <button onClick={addBomRow} className="text-xs text-accent hover:underline">+ เพิ่มรายการ</button>
            </div>
          )}

          {/* BOQ tab */}
          {detailTab === "boq" && (
            <div className="space-y-3">
              {/* BOQ Links */}
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted">📎 ไฟล์ BOQ</span>
                  <button onClick={() => setBoqLinks([...boqLinks, { label: "", url: "" }])} className="text-[10px] text-accent hover:underline">+ เพิ่มลิงก์</button>
                </div>
                {boqLinks.length === 0 && (
                  <p className="text-[10px] text-muted/60 italic">ยังไม่มีไฟล์ — กด "+ เพิ่มลิงก์" เพื่อแนบไฟล์ BOQ</p>
                )}
                {boqLinks.map((fl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={fl.label}
                      onChange={e => setBoqLinks(boqLinks.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
                      placeholder="ชื่อไฟล์ เช่น BOQ_Solar V2"
                      className="w-48 shrink-0 rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    />
                    <input
                      value={fl.url}
                      onChange={e => {
                        const url = e.target.value;
                        const auto = fl.label ? fl.label : extractFilenameFromUrl(url);
                        setBoqLinks(boqLinks.map((x, i) => i === idx ? { ...x, url, label: auto || fl.label } : x));
                      }}
                      placeholder="วางลิงก์ไฟล์ (OneDrive / SharePoint / Google Drive…)"
                      className="flex-1 rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent font-mono"
                    />
                    {fl.url && /^(https?:\/\/|www\.)\S+/.test(fl.url.trim()) && (
                      <a href={fl.url.trim().startsWith("http") ? fl.url.trim() : `https://${fl.url.trim()}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap" title="เปิดไฟล์">↗ {fl.label || "เปิด"}</a>
                    )}
                    <button onClick={() => setBoqLinks(boqLinks.filter((_, i) => i !== idx))} className="text-danger text-xs shrink-0">✕</button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted">BOQ พร้อมราคา — สามารถ Convert เป็น Quotation ได้ตรงๆ</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-left text-[10px] text-muted uppercase">
                    <th className="px-2 py-1.5">สินค้า / บริการ</th>
                    <th className="px-2 py-1.5 w-20">รหัส</th>
                    <th className="px-2 py-1.5 w-14">หน่วย</th>
                    <th className="px-2 py-1.5 w-14">Qty</th>
                    <th className="px-2 py-1.5 w-20">ทุน</th>
                    <th className="px-2 py-1.5 w-20">ขาย</th>
                    <th className="px-2 py-1.5 w-16">ส่วนลด</th>
                    <th className="px-2 py-1.5 w-20 text-right">รวม</th>
                    <th className="px-2 py-1.5 w-14 text-right">Margin</th>
                    <th className="px-2 py-1.5 w-36">ลิงก์ไฟล์</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr></thead>
                  <tbody>{boqItems.map((it, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-1 py-1">
                        <select value={it.product_id} onChange={e => selectBoqProduct(i, e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent mb-1">
                          <option value="">-- เลือกจากระบบ --</option>
                          {prods.map(p => <option key={p.id} value={p.id}>{p.code || "—"} · {p.name}</option>)}
                        </select>
                        <input value={it.product_name} onChange={e => updateBoqRow(i, "product_name", e.target.value)} placeholder="หรือพิมพ์เอง (Custom)" className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" />
                      </td>
                      <td className="px-1 py-1"><input value={it.product_code} onChange={e => updateBoqRow(i, "product_code", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs font-mono focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input value={it.unit} onChange={e => updateBoqRow(i, "unit", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input type="number" value={it.qty || ""} onChange={e => updateBoqRow(i, "qty", Number(e.target.value))} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input type="number" value={it.cost_price || ""} onChange={e => updateBoqRow(i, "cost_price", Number(e.target.value))} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input type="number" value={it.selling_price || ""} onChange={e => updateBoqRow(i, "selling_price", Number(e.target.value))} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><input type="number" value={it.discount || ""} onChange={e => updateBoqRow(i, "discount", Number(e.target.value))} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-2 py-1 text-right">{it.total_selling.toLocaleString()}</td>
                      <td className={`px-2 py-1 text-right ${it.margin_percent >= 20 ? "text-green-400" : it.margin_percent >= 0 ? "text-yellow-400" : "text-red-400"}`}>{it.margin_percent.toFixed(1)}%</td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-1">
                          <input value={it.ref_url ?? ""} onChange={e => updateBoqRow(i, "ref_url", e.target.value)} placeholder="วางลิงก์..." className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" />
                          {it.ref_url && /^(https?:\/\/|www\.)\S+/.test(it.ref_url.trim()) && (
                            <a href={it.ref_url.trim().startsWith("http") ? it.ref_url.trim() : `https://${it.ref_url.trim()}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-300 text-sm leading-none" title="เปิดลิงก์">↗</a>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-1"><button onClick={() => removeBoqRow(i)} className="text-danger text-xs">✕</button></td>
                    </tr>
                  ))}{boqItems.length === 0 && (
                    <tr><td colSpan={11} className="px-3 py-3 text-xs text-muted text-center">ยังไม่มี BOQ items</td></tr>
                  )}</tbody>
                  {boqItems.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-background/50 font-semibold text-xs">
                        <td colSpan={4}></td>
                        <td className="px-2 py-1.5 text-right text-muted">{boqTotals.totalCost.toLocaleString()}</td>
                        <td colSpan={2}></td>
                        <td className="px-2 py-1.5 text-right text-green-400">{boqTotals.totalSelling.toLocaleString()}</td>
                        <td className={`px-2 py-1.5 text-right ${boqTotals.gpPercent >= 20 ? "text-green-400" : boqTotals.gpPercent >= 10 ? "text-yellow-400" : "text-red-400"}`}>{boqTotals.gpPercent.toFixed(1)}%</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={addBoqRow} className="text-xs text-accent hover:underline">+ เพิ่มรายการ</button>
                <button onClick={addLaborTemplate} className="text-xs text-amber-400 hover:underline" title="เพิ่มรายการค่าแรง 6 บรรทัดมาตรฐานราชการ — ช่าง/หัวหน้า/เดินทาง/ควบคุมงาน/ดำเนินการ 4%/กำไร 10%">🔨 เพิ่มค่าแรงราชการ</button>
                {boqItems.some(i => i.product_code === "OVERHEAD" || i.product_code === "PROFIT") && (
                  <button onClick={recalcLaborPercents} className="text-xs text-blue-400 hover:underline" title="คำนวณค่าดำเนินการ 4% และค่ากำไร 10% จากยอดรายการอื่น">↻ คำนวณ % Overhead/Profit</button>
                )}
                {boqItems.length > 0 && (
                  <button onClick={convertToQuotation} disabled={saving} className="ml-auto rounded-lg bg-emerald-600 text-white px-4 py-1.5 text-xs hover:bg-emerald-700 disabled:opacity-50">
                    📤 Convert BOQ → Quotation
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted">💡 ค่าแรงราชการ: ช่าง 250฿/ชม. · หัวหน้าช่าง 350฿/ชม. · เดินทาง 2,000฿/เที่ยว · ดำเนินการ 4% · กำไร 10% — กดปุ่ม ↻ คำนวณ % เมื่อแก้ไขรายการเสร็จ</p>
              {detail.converted_to_quotation_id && (
                <p className="text-[11px] text-emerald-400">
                  ✓ Convert แล้วเป็น <Link href="/quotations" className="underline">{detail.converted_quotation_number}</Link>
                  {detail.converted_at && ` เมื่อ ${detail.converted_at}`}
                </p>
              )}
            </div>
          )}

          {/* Artifacts tab */}
          {detailTab === "artifacts" && (
            <div className="space-y-3">
              {/* Stats row */}
              {attachments.length > 0 && (() => {
                const withLink = attachments.filter(a => !!a.url).length;
                const last = [...attachments].filter(a => a.uploaded_at).sort((x, y) => y.uploaded_at.localeCompare(x.uploaded_at))[0];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg bg-background border border-border px-3 py-2">
                      <p className="text-xl font-bold">{attachments.length}</p>
                      <p className="text-[10px] text-muted">รายการทั้งหมด</p>
                    </div>
                    <div className="rounded-lg bg-background border border-border px-3 py-2">
                      <p className="text-xl font-bold text-accent">{withLink}</p>
                      <p className="text-[10px] text-muted">มี URL</p>
                    </div>
                    {last ? (
                      <div className="rounded-lg bg-background border border-border px-3 py-2 col-span-2">
                        <p className="text-xs font-medium truncate">👤 {last.uploaded_by || "—"}</p>
                        <p className="text-[10px] text-muted">อัปโหลดล่าสุด · {last.uploaded_at}</p>
                      </div>
                    ) : <div className="col-span-2" />}
                  </div>
                );
              })()}

              {/* Integration folder suggestions (unchanged) */}
              {integration && detail.customer_name && (
                <div className="rounded-lg bg-emerald-900/10 border border-emerald-800/40 p-3">
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-emerald-400">
                      📁 Folder ใน {integration.label}
                      {detail.project_name ? ` — ${detail.project_name}` : ` — ${detail.customer_name}`}
                    </p>
                    <a href={buildProjectFolderUrl(integration, { customer_name: detail.customer_name, project_name: detail.project_name, customer_id: detail.customer_id, project_id: detail.project_id })}
                      target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:underline">🔗 เปิด root folder ↗</a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {(integration.default_subfolders || []).map(sub => {
                      const url = buildSubfolderUrl(integration, { customer_name: detail.customer_name, project_name: detail.project_name, customer_id: detail.customer_id, project_id: detail.project_id }, sub);
                      const guessType: PresaleAttachment["type"] = /solution/i.test(sub) ? "design" : /BOM|BOQ/i.test(sub) ? "spec" : /draw/i.test(sub) ? "drawing" : /present/i.test(sub) ? "presentation" : /photo|image|site/i.test(sub) ? "image" : /contract|hand/i.test(sub) ? "document" : "other";
                      const alreadyAdded = attachments.some(a => a.url === url);
                      return (
                        <div key={sub} className="flex items-center gap-1.5 rounded bg-card border border-border px-2 py-1.5 text-[11px]">
                          <span className="flex-1 truncate font-mono">{sub}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline shrink-0">↗</a>
                          {alreadyAdded ? <span className="text-[10px] text-muted shrink-0">✓</span> : <button onClick={() => addAttachmentWithUrl(url, sub, guessType)} className="text-emerald-400 hover:underline shrink-0">+ เพิ่ม</button>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted mt-2">💡 ลิงก์อ้างอิงโครงสร้าง folder — สร้าง folder ใน SharePoint ก่อนใช้งาน</p>
                </div>
              )}
              {!integration && (
                <div className="rounded-lg bg-blue-900/10 border border-blue-800/40 p-3 text-[11px]">
                  💡 ตั้งค่า SharePoint / OneDrive ที่ <Link href="/settings/integrations" className="text-accent hover:underline">/settings/integrations</Link>
                </div>
              )}

              {/* Search */}
              {attachments.length > 2 && (
                <input value={artifactSearch} onChange={e => setArtifactSearch(e.target.value)}
                  placeholder="🔍 ค้นหา ชื่อไฟล์ / URL..."
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
              )}

              {/* Artifact cards */}
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <div className="text-center py-10 rounded-xl bg-background border border-border/50">
                    <p className="text-3xl mb-2">📎</p>
                    <p className="text-sm font-medium">ยังไม่มีไฟล์หรือลิงก์</p>
                    <p className="text-xs text-muted mt-1">รองรับ OneDrive · SharePoint · Google Drive · Dropbox · External URL</p>
                  </div>
                ) : attachments.map((a, i) => {
                  if (artifactSearch && !a.name.toLowerCase().includes(artifactSearch.toLowerCase()) && !a.url.toLowerCase().includes(artifactSearch.toLowerCase())) return null;
                  const provider = detectUrlProvider(a.url);
                  const meta = ATTACHMENT_TYPE_META[a.type] || ATTACHMENT_TYPE_META.other;
                  const isCopied = copiedUrl === a.url;
                  return (
                    <div key={i} className="rounded-xl bg-background border border-border p-3 hover:border-border/80 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* File type icon */}
                        <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-lg shrink-0 mt-0.5">{meta.icon}</div>
                        {/* Main content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Provider + uploader meta */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <select value={a.type} onChange={e => updateAttachment(i, "type", e.target.value)}
                              className="rounded bg-card border border-border px-2 py-0.5 text-xs focus:outline-none focus:border-accent text-muted">
                              {Object.entries(ATTACHMENT_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
                            </select>
                            {a.url && <span className={`text-[10px] font-medium ${provider.color}`}>{provider.icon} {provider.label}</span>}
                            {a.uploaded_by && <span className="text-[10px] text-muted">👤 {a.uploaded_by}</span>}
                            {a.uploaded_at && <span className="text-[10px] text-muted">📅 {a.uploaded_at}</span>}
                          </div>
                          {/* Name */}
                          <input value={a.name} onChange={e => updateAttachment(i, "name", e.target.value)}
                            placeholder="ชื่อไฟล์ / คำอธิบาย"
                            className="w-full rounded-lg bg-card border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
                          {/* URL row */}
                          <div className="flex gap-1.5 items-center">
                            <input value={a.url} onChange={e => updateAttachment(i, "url", e.target.value)}
                              placeholder="https://..."
                              className="flex-1 rounded-lg bg-card border border-border px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
                            {a.url && <>
                              <a href={a.url} target="_blank" rel="noopener noreferrer" title="เปิดในแท็บใหม่"
                                className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-accent hover:bg-card-hover transition-colors">↗</a>
                              <button onClick={() => copyLink(a.url)} title="คัดลอก URL"
                                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${isCopied ? "border-green-700 text-green-400 bg-green-900/20" : "border-border text-muted hover:bg-card-hover"}`}>
                                {isCopied ? "✓" : "📋"}
                              </button>
                            </>}
                          </div>
                          {/* Notes */}
                          <input value={a.notes || ""} onChange={e => updateAttachment(i, "notes", e.target.value)}
                            placeholder="หมายเหตุ (ไม่บังคับ)"
                            className="w-full rounded-lg bg-card border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
                        </div>
                        {/* Delete */}
                        <button onClick={() => removeAttachment(i)} className="shrink-0 w-7 h-7 rounded-lg border border-red-900/50 text-danger hover:bg-red-900/20 flex items-center justify-center text-xs mt-0.5">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={addAttachmentRow} className="text-xs text-accent hover:underline">+ เพิ่มไฟล์ / ลิงก์</button>

              {/* Activity log — derived from existing uploaded_by/uploaded_at fields */}
              {attachments.some(a => a.uploaded_by || a.uploaded_at) && (
                <div className="rounded-xl bg-background border border-border/50 p-3 mt-1">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">Activity Log</p>
                  <div className="space-y-2">
                    {[...attachments]
                      .filter(a => a.uploaded_by || a.uploaded_at)
                      .sort((x, y) => (y.uploaded_at || "").localeCompare(x.uploaded_at || ""))
                      .slice(0, 5)
                      .map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <div className={`w-5 h-5 rounded-full ${avatarBg(a.uploaded_by || "?")} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
                            {(a.uploaded_by || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-muted flex-1 min-w-0">
                            <span className="text-foreground font-medium">{a.uploaded_by || "—"}</span>{" "}
                            เพิ่ม {ATTACHMENT_TYPE_META[a.type]?.icon}{" "}
                            <span className="text-foreground">{a.name || a.url || "ไฟล์"}</span>
                          </span>
                          {a.uploaded_at && <span className="text-muted/70 shrink-0">{a.uploaded_at}</span>}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save artifacts button */}
          {detailTab !== "boq" && (
            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <button onClick={saveArtifacts} disabled={saving} className="rounded-lg bg-accent text-white px-4 py-1.5 text-xs hover:bg-accent-hover disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : "💾 บันทึก Artifacts"}
              </button>
            </div>
          )}
          {detailTab === "boq" && (
            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <button onClick={saveArtifacts} disabled={saving} className="rounded-lg border border-border px-4 py-1.5 text-xs text-muted hover:bg-card-hover">
                💾 บันทึก BOQ (ไม่สร้าง QT)
              </button>
            </div>
          )}
        </div>
      )}
      {/* Filter Bar */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(["all","my","overdue","today","in_progress","waiting","completed","cancelled"] as const).map(v => {
            const vLabels: Record<string, string> = { all: "ทั้งหมด", my: "ของฉัน", overdue: "⚠ เกินกำหนด", today: "📅 วันนี้", in_progress: "กำลังทำ", waiting: "⏳ รอ", completed: "✅ เสร็จ", cancelled: "ยกเลิก" };
            const vCounts: Record<string, number> = { all: list.length, my: stats.myTasks, overdue: stats.overdue, today: stats.dueToday, in_progress: stats.inProgress, waiting: stats.waiting, completed: stats.completed, cancelled: list.filter(r => r.status === "cancelled").length };
            return (
              <button key={v} onClick={() => setViewFilter(v)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${viewFilter === v ? "bg-accent text-white border-accent" : "border-border text-muted hover:border-accent/50 hover:text-foreground"}`}>
                {vLabels[v]}{vCounts[v] > 0 ? <span className="ml-1 opacity-60">({vCounts[v]})</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="w-52 shrink-0">
            <SearchableSelect
              value={typeFilter}
              options={reqTypes.map(t => ({ value: t, label: `${typeDetails[t]?.icon} ${typeLabels[t]}`, sublabel: typeDetails[t]?.thai }))}
              onChange={v => setTypeFilter(v as "" | PresaleRequest["type"])}
              emptyLabel="ทุกประเภทงาน"
              placeholder="ทุกประเภทงาน"
            />
          </div>
          {isManager && (
            <div className="w-44 shrink-0">
              <SearchableSelect
                value={personFilter}
                options={assigneeNames.map(n => {
                  const u = presaleUsers.find(u => u.name === n) || allUsers.find(u => u.name === n);
                  return { value: n, label: n, sublabel: u?.role || "" };
                })}
                onChange={v => setPersonFilter(v)}
                emptyLabel="ทุกคน"
                placeholder="ทุกคน"
                renderTrigger={sel => sel ? (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-4 h-4 rounded-full ${avatarBg(sel.value)} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>{sel.value.slice(0,2).toUpperCase()}</span>
                    <span className="text-foreground truncate">{sel.label}</span>
                  </span>
                ) : undefined}
                renderItem={(o, isSel) => (
                  <div className="flex items-center gap-2 py-0.5">
                    <div className={`w-6 h-6 rounded-full ${avatarBg(o.value)} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>{o.value.slice(0,2).toUpperCase()}</div>
                    <div>
                      <p className={`text-sm leading-tight ${isSel ? "font-medium" : ""}`}>{o.label}</p>
                      <p className="text-[11px] text-muted">{o.sublabel}</p>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
          <input placeholder="🔍 ค้นหา requirement / ลูกค้า / โปรเจค..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-40 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent hover:border-accent/50 transition-colors" />
          <p className="text-xs text-muted shrink-0">{filtered.length} รายการ</p>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-base font-medium">ไม่มีงานในขณะนี้</p>
          <p className="text-sm text-muted mt-1">
            {viewFilter !== "all" ? "ลองเปลี่ยน filter หรือกดที่ \"ทั้งหมด\"" : "กด + New Task เพื่อสร้างงานใหม่"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">{filtered.map((r) => {
          const isOverdue = !!(r.due_date && r.due_date < today && r.status !== "completed" && r.status !== "cancelled");
          const isDueToday = r.due_date === today && r.status !== "completed" && r.status !== "cancelled";
          const bomCount = (r.bom_items || []).length;
          const boqCount = (r.boq_items || []).length;
          const fileCount = (r.attachments || []).length;
          const isOpen = detail?.id === r.id;
          const prio = r.priority || "normal";
          return (
            <div key={r.id}
              className={`rounded-xl bg-card border p-4 cursor-pointer transition-colors hover:bg-card-hover ${isOpen ? "border-accent bg-accent/5" : isOverdue ? "border-red-800/50" : isDueToday ? "border-amber-800/40" : r.approval_status === "pending_review" ? "border-orange-800/50" : "border-border"}`}
              onClick={() => isOpen ? closeDetail() : hydrateDetail(r)}>

              {/* Row 1: type + badges */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 text-accent px-2 py-0.5 text-[11px] font-semibold shrink-0">
                  <span>{typeDetails[r.type]?.icon}</span>
                  <span>{typeLabels[r.type]}</span>
                </span>
                <PriorityBadge priority={prio} />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[r.status] || "bg-card text-muted"}`}>{statusLabel[r.status] || r.status}</span>
                {isOverdue && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400 font-medium">⚠ เกินกำหนด</span>}
                {isDueToday && <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-[10px] text-amber-400">📅 ครบวันนี้</span>}
                {r.approval_status === "pending_review" && <span className="rounded-full bg-orange-900/50 px-2 py-0.5 text-[10px] text-orange-400">🔍 รอตรวจสอบ</span>}
                {r.approval_status === "approved" && <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] text-green-400" title={`อนุมัติโดย ${r.reviewed_by}`}>✅ อนุมัติ</span>}
                {r.approval_status === "rejected" && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400" title={r.review_note || ""}>❌ ส่งกลับ</span>}
                {r.converted_to_quotation_id && (
                  <Link href="/quotations" className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] text-emerald-400 hover:underline" title={`Converted to ${r.converted_quotation_number}`} onClick={e => e.stopPropagation()}>✓ → {r.converted_quotation_number}</Link>
                )}
              </div>

              {/* Row 2: requirement */}
              <p className="text-sm font-medium text-foreground line-clamp-2 mb-1.5">{r.requirement}</p>

              {/* Row 3: meta info */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mb-2">
                {r.customer_id
                  ? <Link href={`/customers/${r.customer_id}`} className="hover:text-accent hover:underline" onClick={e => e.stopPropagation()}>🏢 {r.customer_name}</Link>
                  : r.customer_name ? <span>🏢 {r.customer_name}</span> : null}
                {r.project_id
                  ? <Link href={`/projects/${r.project_id}`} className="hover:text-accent hover:underline" onClick={e => e.stopPropagation()}>📁 {r.project_name}</Link>
                  : r.project_name ? <span>📁 {r.project_name}</span> : null}
                {r.assigned_to && <span>👤 {r.assigned_to}</span>}
                {r.due_date && <span className={isOverdue ? "text-red-400 font-medium" : isDueToday ? "text-amber-400" : ""}>📅 {r.due_date}</span>}
                {(r.value || 0) > 0 && <span>💰 {(r.value || 0).toLocaleString()} THB</span>}
              </div>

              {/* Row 4: artifacts + actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 flex-wrap">
                  {r.solution_summary && <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-400">📋 Solution</span>}
                  {bomCount > 0 && <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-[10px] text-amber-400">🛒 BOM {bomCount}</span>}
                  {boqCount > 0 && <span className="rounded bg-emerald-900/30 px-1.5 py-0.5 text-[10px] text-emerald-400" title={`${(r.boq_total_selling || 0).toLocaleString()} THB`}>💰 BOQ {boqCount}</span>}
                  {fileCount > 0 && <span className="rounded bg-purple-900/30 px-1.5 py-0.5 text-[10px] text-purple-400">📎 {fileCount}</span>}
                </div>
                <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {canApprove && r.approval_status === "pending_review" && (
                    <>
                      <button onClick={() => handleApprove(r)} className="text-[10px] bg-green-800/50 text-green-400 rounded px-2 py-1 hover:bg-green-800">✅</button>
                      <button onClick={() => handleReject(r)} className="text-[10px] bg-red-800/50 text-red-400 rounded px-2 py-1 hover:bg-red-800">❌</button>
                    </>
                  )}
                  {!r.approval_status && checkNeedsApproval(r.type, r.value || 0) && (
                    <button onClick={() => requestApproval(r)} className="text-[10px] text-orange-400 border border-orange-800/50 rounded px-2 py-1 hover:bg-orange-900/20">ขออนุมัติ</button>
                  )}
                  <button onClick={() => isOpen ? closeDetail() : hydrateDetail(r)} className="text-[10px] rounded border border-border px-2 py-1 text-accent hover:bg-card-hover">{isOpen ? "ปิด" : "📋 Artifacts"}</button>
                  <button onClick={() => openEdit(r)} className="text-[10px] rounded border border-border px-2 py-1 text-muted hover:bg-card-hover">✏ แก้ไข</button>
                  <button onClick={() => handleDelete(r.id!)} className="text-[10px] rounded border border-red-900/50 px-2 py-1 text-danger hover:bg-red-900/20">🗑</button>
                </div>
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
