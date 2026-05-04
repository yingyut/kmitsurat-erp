"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PresaleRequest, Customer, Project, JobRequest, User, Product, QuotationItem, BomItem, PresaleAttachment, IntegrationSetting } from "@/lib/types";
import { generateNumber } from "@/lib/numbering";
import { buildProjectFolderUrl, buildSubfolderUrl } from "@/lib/integrations";

const reqTypes = ["solution_design","requirement_summary","boq","technical_proposal","site_survey","project_planning"] as const;
const typeLabels: Record<string, string> = { solution_design: "Solution Design", requirement_summary: "Requirement Summary", boq: "BOQ Preparation", technical_proposal: "Technical Proposal", site_survey: "Site Survey", project_planning: "Project Planning" };

const empty = {
  activity_id: "", customer_id: "", customer_name: "", project_id: "", project_name: "",
  type: "boq" as PresaleRequest["type"], requirement: "", assigned_to: "", due_date: "",
  status: "pending" as PresaleRequest["status"],
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const statusLabel: Record<string, string> = { pending: "ยังไม่เริ่ม", in_progress: "กำลังทำ", completed: "เสร็จแล้ว" };
const statusColor: Record<string, string> = { pending: "bg-blue-900/50 text-blue-400", in_progress: "bg-yellow-900/50 text-yellow-400", completed: "bg-green-900/50 text-green-400" };

const ATTACHMENT_TYPE_META: Record<string, { icon: string; label: string }> = {
  design:       { icon: "🎨", label: "Design Drawing" },
  drawing:      { icon: "📐", label: "Floor Plan / Diagram" },
  presentation: { icon: "🎤", label: "Presentation" },
  spec:         { icon: "📄", label: "Spec Sheet" },
  image:        { icon: "🖼️", label: "Image / Photo" },
  document:     { icon: "📑", label: "Document" },
  other:        { icon: "📎", label: "Other" },
};

const emptyBomItem: BomItem = { code: "", name: "", brand: "", qty: 1, unit: "pcs", notes: "" };
const emptyBoqItem: QuotationItem = { product_id: "", product_code: "", product_name: "", qty: 1, unit: "pcs", cost_price: 0, selling_price: 0, discount: 0, total_cost: 0, total_selling: 0, margin_percent: 0 };
const emptyAttachment: PresaleAttachment = { type: "design", name: "", url: "", uploaded_at: "", uploaded_by: "", notes: "" };

type DetailTab = "summary" | "bom" | "boq" | "files";

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
  const [list, setList] = useState<PresaleRequest[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [integration, setIntegration] = useState<IntegrationSetting | null>(null);
  const [incomingReqs, setIncomingReqs] = useState<JobRequest[]>([]);
  const [presaleUsers, setPresaleUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PresaleRequest["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detail panel state
  const [detail, setDetail] = useState<PresaleRequest | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");

  // Inline editing state for artifacts (kept in detail context)
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [boqItems, setBoqItems] = useState<QuotationItem[]>([]);
  const [attachments, setAttachments] = useState<PresaleAttachment[]>([]);
  const [solutionSummary, setSolutionSummary] = useState("");

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [r, c, p, jr, u, pd, ints] = await Promise.all([
        fs.presaleRequests.list(), fs.customers.list(), fs.projects.list(),
        fs.jobRequests.list(), fs.users.list(), fs.products.list(),
        fs.integrationSettings.list(),
      ]);
      setList(r); setCusts(c); setProjs(p);
      setProds(pd.filter(x => x.active));
      setIncomingReqs(jr.filter(j => j.request_to_team === "presale"));
      setPresaleUsers(u.filter(x => x.active && x.role === "presale"));
      // Pick the first active integration (UX: simplicity)
      setIntegration(ints.find(i => i.active) || null);
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
    setBomItems(r.bom_items || []);
    setBoqItems(r.boq_items || []);
    setAttachments(r.attachments || []);
  }
  function closeDetail() {
    setDetail(null);
    setDetailTab("summary");
    setSolutionSummary("");
    setBomItems([]);
    setBoqItems([]);
    setAttachments([]);
  }

  // Filter
  const filtered = list.filter((r) => {
    const s = search.toLowerCase();
    const matchSearch = !s || r.requirement.toLowerCase().includes(s) || r.customer_name.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Dashboard stats (from full list)
  const today = todayStr();
  const overdueList = list.filter(r => r.due_date && r.due_date < today && r.status !== "completed");
  const dueTodayList = list.filter(r => r.due_date === today && r.status !== "completed");
  const stats = {
    total: list.length,
    pending: list.filter(r => r.status === "pending").length,
    inProgress: list.filter(r => r.status === "in_progress").length,
    completed: list.filter(r => r.status === "completed").length,
    overdue: overdueList.length,
    dueToday: dueTodayList.length,
    pendingReqs: incomingReqs.filter(r => r.status === "pending").length,
  };

  // Workload per person
  const workload = presaleUsers.map(u => ({
    name: u.name,
    active: list.filter(r => r.assigned_to === u.name && r.status !== "completed").length,
  })).filter(w => w.active > 0).sort((a, b) => b.active - a.active).slice(0, 5);

  function selectCust(id: string) { const c = custs.find((x) => x.id === id); setForm({ ...form, customer_id: id, customer_name: c?.company_name || "" }); }
  function selectProj(id: string) { const p = projs.find((x) => x.id === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); }

  function openAdd() { setEditId(null); setForm(empty); setShowForm(true); closeDetail(); }
  function openEdit(r: PresaleRequest) {
    setEditId(r.id!);
    setForm({
      activity_id: r.activity_id || "", customer_id: r.customer_id, customer_name: r.customer_name,
      project_id: r.project_id || "", project_name: r.project_name || "",
      type: r.type, requirement: r.requirement, assigned_to: r.assigned_to || "",
      due_date: r.due_date || "", status: r.status,
    });
    setShowForm(true);
    closeDetail();
  }

  async function handleSave() {
    if (!form.requirement.trim()) return; setSaving(true);
    const { presaleRequests } = await import("@/lib/firestore");
    try {
      if (editId) await presaleRequests.update(editId, form as unknown as Record<string, unknown>);
      else await presaleRequests.add(form as unknown as Record<string, unknown>);
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
        bom_items: bomItems,
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
        solution_summary: solutionSummary, bom_items: bomItems, boq_items: boqItems,
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
          <Link href="/presale/calendar" title="ปฏิทินงาน Presale" className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-card-hover">📅 ปฏิทิน</Link>
          <button onClick={() => { if (showForm) { setShowForm(false); setEditId(null); } else openAdd(); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Task"}</button>
        </div>
      </div>

      {/* Dashboard */}
      {!loading && (
        <div className="space-y-3 mb-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <button onClick={() => setStatusFilter("all")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">ทั้งหมด</p>
            </button>
            <button onClick={() => setStatusFilter("pending")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "pending" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-blue-400">{stats.pending}</p>
              <p className="text-[10px] text-muted">ยังไม่เริ่ม</p>
            </button>
            <button onClick={() => setStatusFilter("in_progress")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "in_progress" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-yellow-400">{stats.inProgress}</p>
              <p className="text-[10px] text-muted">กำลังทำ</p>
            </button>
            <button onClick={() => setStatusFilter("completed")} className={`rounded-lg border p-2.5 text-left transition-colors ${statusFilter === "completed" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-green-400">{stats.completed}</p>
              <p className="text-[10px] text-muted">เสร็จแล้ว</p>
            </button>
            <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-2.5">
              <p className="text-base font-bold text-red-400">{stats.overdue}</p>
              <p className="text-[10px] text-muted">เลยกำหนด</p>
            </div>
            <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-2.5">
              <p className="text-base font-bold text-amber-400">{stats.dueToday}</p>
              <p className="text-[10px] text-muted">ครบกำหนดวันนี้</p>
            </div>
            <div className="rounded-lg border border-purple-800/50 bg-purple-900/10 p-2.5">
              <p className="text-base font-bold text-purple-400">{stats.pendingReqs}</p>
              <p className="text-[10px] text-muted">Job Requests รอรับ</p>
            </div>
          </div>

          {/* Alerts + workload */}
          {(overdueList.length > 0 || dueTodayList.length > 0 || workload.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-red-400 mb-2">⚠ เลยกำหนด ({overdueList.length})</h3>
                {overdueList.length === 0 ? <p className="text-[11px] text-muted">ไม่มี</p> : overdueList.slice(0, 3).map(r => (
                  <div key={r.id} className="text-[11px] py-1 border-b border-border last:border-0">
                    <p className="truncate">{typeLabels[r.type]} — {r.customer_name}</p>
                    <p className="text-muted">กำหนด {r.due_date}{r.assigned_to && ` · ${r.assigned_to}`}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">📅 ครบวันนี้ ({dueTodayList.length})</h3>
                {dueTodayList.length === 0 ? <p className="text-[11px] text-muted">ไม่มี</p> : dueTodayList.slice(0, 3).map(r => (
                  <div key={r.id} className="text-[11px] py-1 border-b border-border last:border-0">
                    <p className="truncate">{typeLabels[r.type]} — {r.customer_name}</p>
                    <p className="text-muted">{r.assigned_to || "ยังไม่มอบหมาย"}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">👤 ภาระงานต่อคน (Active)</h3>
                {workload.length === 0 ? <p className="text-[11px] text-muted">ไม่มีงาน Active</p> : workload.map(w => (
                  <div key={w.name} className="flex justify-between text-[11px] py-1 border-b border-border last:border-0">
                    <span>{w.name}</span>
                    <span className="font-semibold">{w.active} งาน</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไข Task" : "เพิ่ม Task ใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PresaleRequest["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">{reqTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select>
            <select value={form.customer_id} onChange={(e) => selectCust(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
            <select value={form.project_id} onChange={(e) => selectProj(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input placeholder="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PresaleRequest["status"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select>
            <textarea placeholder="Requirement *" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-20 resize-y" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.requirement.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : editId ? "บันทึก" : "เพิ่ม"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Detail panel — artifacts */}
      {detail && (
        <div className="rounded-xl bg-card border border-accent/40 p-5 mb-4">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg font-bold">{typeLabels[detail.type]}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[detail.status]}`}>{statusLabel[detail.status]}</span>
                {detail.converted_to_quotation_id && (
                  <span className="rounded-full bg-emerald-900/50 text-emerald-400 px-2 py-0.5 text-[10px]" title={`Converted to ${detail.converted_quotation_number}`}>✓ {detail.converted_quotation_number}</span>
                )}
              </div>
              <p className="text-sm text-muted">{detail.customer_name}{detail.project_name && ` · ${detail.project_name}`}{detail.assigned_to && ` · 👤 ${detail.assigned_to}`}{detail.due_date && ` · 📅 ${detail.due_date}`}</p>
              <p className="text-xs text-muted mt-1 italic">📋 {detail.requirement}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <select value={detail.status} onChange={e => changeStatus(detail, e.target.value as PresaleRequest["status"])} className={`rounded-full px-3 py-1 text-xs border-0 focus:outline-none cursor-pointer ${statusColor[detail.status]}`}>
                <option value="pending">ยังไม่เริ่ม</option>
                <option value="in_progress">กำลังทำ</option>
                <option value="completed">เสร็จแล้ว</option>
              </select>
              <button onClick={() => openEdit(detail)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-card-hover">แก้ไข Task</button>
              <button onClick={closeDetail} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ปิด</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 border-b border-border overflow-x-auto">
            {(["summary","bom","boq","files"] as const).map(t => {
              const labels: Record<DetailTab, string> = {
                summary: "📋 Solution Summary",
                bom: `🛒 BOM (${bomItems.length})`,
                boq: `💰 BOQ (${boqItems.length})`,
                files: `📎 Files (${attachments.length})`,
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
            <div className="space-y-2">
              <p className="text-[10px] text-muted">รายการอุปกรณ์ (เน้นการสั่งซื้อ — ไม่ต้องมีราคา)</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-left text-[10px] text-muted uppercase">
                    <th className="px-2 py-1.5 w-28">รหัส</th>
                    <th className="px-2 py-1.5">ชื่อ</th>
                    <th className="px-2 py-1.5 w-32">Brand</th>
                    <th className="px-2 py-1.5 w-16">Qty</th>
                    <th className="px-2 py-1.5 w-16">Unit</th>
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
                      <td className="px-1 py-1"><input value={b.notes} onChange={e => updateBomRow(i, "notes", e.target.value)} className="w-full rounded bg-background border border-border px-1.5 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                      <td className="px-1 py-1"><button onClick={() => removeBomRow(i)} className="text-danger text-xs">✕</button></td>
                    </tr>
                  ))}{bomItems.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-3 text-xs text-muted text-center">ยังไม่มี BOM items — กดเพิ่มได้เลย</td></tr>
                  )}</tbody>
                </table>
              </div>
              <button onClick={addBomRow} className="text-xs text-accent hover:underline">+ เพิ่มรายการ</button>
            </div>
          )}

          {/* BOQ tab */}
          {detailTab === "boq" && (
            <div className="space-y-2">
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
                      <td className="px-1 py-1"><button onClick={() => removeBoqRow(i)} className="text-danger text-xs">✕</button></td>
                    </tr>
                  ))}{boqItems.length === 0 && (
                    <tr><td colSpan={10} className="px-3 py-3 text-xs text-muted text-center">ยังไม่มี BOQ items</td></tr>
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

          {/* Files tab */}
          {detailTab === "files" && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted">ลิงก์ไฟล์ภายนอก (Google Drive, OneDrive, Dropbox, etc.) — ไม่อัพโหลดเข้าระบบ</p>

              {/* Suggested folders from integration */}
              {integration && detail.customer_name && (
                <div className="rounded-lg bg-emerald-900/10 border border-emerald-800/40 p-3">
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-emerald-400">
                      📁 Folder ใน {integration.label}
                      {detail.project_name ? ` — ${detail.project_name}` : ` — ${detail.customer_name}`}
                    </p>
                    <a
                      href={buildProjectFolderUrl(integration, { customer_name: detail.customer_name, project_name: detail.project_name, customer_id: detail.customer_id, project_id: detail.project_id })}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-accent hover:underline"
                      title="เปิด root folder ของโปรเจคนี้"
                    >🔗 เปิด root folder ↗</a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {(integration.default_subfolders || []).map(sub => {
                      const url = buildSubfolderUrl(integration, { customer_name: detail.customer_name, project_name: detail.project_name, customer_id: detail.customer_id, project_id: detail.project_id }, sub);
                      const guessType: PresaleAttachment["type"] =
                        /solution/i.test(sub) ? "design" :
                        /BOM|BOQ/i.test(sub) ? "spec" :
                        /draw/i.test(sub) ? "drawing" :
                        /present/i.test(sub) ? "presentation" :
                        /photo|image|site/i.test(sub) ? "image" :
                        /contract|hand/i.test(sub) ? "document" : "other";
                      const alreadyAdded = attachments.some(a => a.url === url);
                      return (
                        <div key={sub} className="flex items-center gap-1.5 rounded bg-card border border-border px-2 py-1.5 text-[11px]">
                          <span className="flex-1 truncate font-mono">{sub}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline shrink-0" title={url}>↗ เปิด</a>
                          {alreadyAdded ? (
                            <span className="text-[10px] text-muted shrink-0">✓ added</span>
                          ) : (
                            <button onClick={() => addAttachmentWithUrl(url, sub, guessType)} className="text-emerald-400 hover:underline shrink-0" title="เพิ่มเป็น attachment">+ ใช้ลิงก์นี้</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted mt-2">💡 ลิงก์อ้างอิงโครงสร้าง folder ที่ตั้งค่าไว้ — สร้าง folder ใน SharePoint ตามที่ template กำหนด ก่อนใช้งาน</p>
                </div>
              )}
              {!integration && (
                <div className="rounded-lg bg-blue-900/10 border border-blue-800/40 p-3 text-[11px]">
                  💡 ตั้งค่า SharePoint / OneDrive ที่ <Link href="/settings/integrations" className="text-accent hover:underline">/settings/integrations</Link> เพื่อให้ระบบสร้างลิงก์ folder อัตโนมัติ
                </div>
              )}

              <div className="space-y-1.5">
                {attachments.map((a, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-lg bg-background border border-border p-2">
                    <select value={a.type} onChange={e => updateAttachment(i, "type", e.target.value)} className="col-span-2 rounded bg-card border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent">
                      {Object.entries(ATTACHMENT_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
                    </select>
                    <input value={a.name} onChange={e => updateAttachment(i, "name", e.target.value)} placeholder="ชื่อไฟล์ / คำอธิบาย" className="col-span-3 rounded bg-card border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
                    <input value={a.url} onChange={e => updateAttachment(i, "url", e.target.value)} placeholder="https://drive.google.com/..." className="col-span-4 rounded bg-card border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent" />
                    <input value={a.notes || ""} onChange={e => updateAttachment(i, "notes", e.target.value)} placeholder="หมายเหตุ" className="col-span-2 rounded bg-card border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
                    <div className="col-span-1 flex gap-1.5 justify-end">
                      {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline" title="เปิดในแท็บใหม่">↗</a>}
                      <button onClick={() => removeAttachment(i)} className="text-danger text-xs">✕</button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && <p className="text-xs text-muted text-center py-3">ยังไม่มีไฟล์ — เพิ่มลิงก์ Google Drive / OneDrive / etc.</p>}
              </div>
              <button onClick={addAttachmentRow} className="text-xs text-accent hover:underline">+ เพิ่มไฟล์ / ลิงก์</button>
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
      <div className="flex items-center justify-between gap-2 mb-3">
        <input placeholder="ค้นหา requirement / ลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ {statusFilter !== "all" && <span className="text-accent">· {statusLabel[statusFilter]}</span>}</p>
      </div>
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบงาน</p> : (
        <div className="space-y-2">{filtered.map((r) => {
          const overdue = r.due_date && r.due_date < today && r.status !== "completed";
          const bomCount = (r.bom_items || []).length;
          const boqCount = (r.boq_items || []).length;
          const fileCount = (r.attachments || []).length;
          const isOpen = detail?.id === r.id;
          return (
            <div key={r.id} className={`rounded-xl bg-card border p-4 hover:bg-card-hover cursor-pointer transition-colors ${isOpen ? "border-accent bg-accent/5" : "border-border"}`} onClick={() => isOpen ? closeDetail() : hydrateDetail(r)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-medium">{typeLabels[r.type]}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[r.status]}`}>{statusLabel[r.status]}</span>
                    {overdue && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">⚠ เลยกำหนด</span>}
                    {/* Artifact badges */}
                    {r.solution_summary && <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-[10px] text-blue-400" title="มี Solution Summary">📋</span>}
                    {bomCount > 0 && <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-[10px] text-amber-400" title={`${bomCount} BOM items`}>🛒 {bomCount}</span>}
                    {boqCount > 0 && <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] text-emerald-400" title={`${boqCount} BOQ items · ${(r.boq_total_selling || 0).toLocaleString()} THB`}>💰 {boqCount}</span>}
                    {fileCount > 0 && <span className="rounded-full bg-purple-900/50 px-2 py-0.5 text-[10px] text-purple-400" title={`${fileCount} files`}>📎 {fileCount}</span>}
                    {r.converted_to_quotation_id && (
                      <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] text-emerald-400" title={`Converted to ${r.converted_quotation_number}`}>✓ → {r.converted_quotation_number}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted">{r.requirement}</p>
                  <p className="text-xs text-muted mt-1">
                    {r.customer_name}{r.project_name && ` · ${r.project_name}`}
                    {r.assigned_to && ` · 👤 ${r.assigned_to}`}
                    {r.due_date && <> · <span className={overdue ? "text-red-400" : ""}>📅 {r.due_date}</span></>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => isOpen ? closeDetail() : hydrateDetail(r)} className="text-xs text-accent hover:underline">{isOpen ? "ปิด" : "ดู Artifacts"}</button>
                  <button onClick={() => openEdit(r)} className="text-xs text-accent hover:underline">แก้ไข</button>
                  <button onClick={() => handleDelete(r.id!)} className="text-xs text-danger hover:underline">ลบ</button>
                </div>
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
