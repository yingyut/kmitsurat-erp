"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { ServiceTicket, ServiceCost, ServiceAttachment, ServiceStatus, Product, ServiceCostPreset } from "@/lib/types";

type Tab = "timeline" | "costs" | "attachments" | "asset";
type CostEntryMode = "preset" | "batch" | "percent" | "manual";

const STATUS_LABEL: Record<string, string> = {
  open: "เปิดใหม่", acknowledged: "รับทราบแล้ว", traveling: "เดินทาง",
  on_site: "ถึงสถานที่", repair_start: "เริ่มซ่อม", in_progress: "กำลังทำ",
  waiting_parts: "รอชิ้นส่วน", resume: "กลับมาทำต่อ", resolved: "แก้ไขแล้ว",
  closed: "ปิดงาน", cancelled: "ยกเลิก", waiting_approval: "รออนุมัติ",
};

const STATUS_ICON: Record<string, string> = {
  open: "🆕", acknowledged: "👁️", traveling: "🚗", on_site: "📍",
  repair_start: "🔧", in_progress: "⚙️", waiting_parts: "📦", resume: "▶️",
  resolved: "✅", closed: "🔒", cancelled: "❌", waiting_approval: "⏳",
};

const STATUS_COLOR: Record<string, string> = {
  open: "border-red-500 bg-red-500",
  acknowledged: "border-indigo-500 bg-indigo-500",
  traveling: "border-orange-400 bg-orange-400",
  on_site: "border-amber-400 bg-amber-400",
  repair_start: "border-yellow-400 bg-yellow-400",
  in_progress: "border-yellow-400 bg-yellow-400",
  waiting_parts: "border-purple-400 bg-purple-400",
  resume: "border-blue-400 bg-blue-400",
  resolved: "border-green-500 bg-green-500",
  closed: "border-gray-500 bg-gray-500",
  cancelled: "border-gray-600 bg-gray-600",
  waiting_approval: "border-rose-400 bg-rose-400",
};

const TYPE_LABELS: Record<string, string> = {
  installation: "Installation", site_survey: "Site Survey",
  technical_survey: "Technical Survey", after_sales: "After-Sales",
  repair: "Repair", pm_service: "PM Service",
};

const COST_CATS = ["labor", "travel", "fuel", "accommodation", "allowance", "parts", "outsource", "custom"] as const;
const COST_CAT_LABEL: Record<string, string> = {
  labor: "ค่าแรง/Manday", travel: "ค่าเดินทาง", fuel: "ค่าน้ำมัน",
  accommodation: "ที่พัก", allowance: "เบี้ยเลี้ยง",
  parts: "อะไหล่", outsource: "จ้างเหมา", custom: "อื่นๆ",
  percentage: "% Revenue",
};
const COST_CAT_ICON: Record<string, string> = {
  labor: "👷", travel: "🚌", fuel: "⛽", accommodation: "🏨",
  allowance: "💵", parts: "🔩", outsource: "🏭", custom: "📋",
  percentage: "💹",
};

function fmtDT(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso; }
}

function hoursBetween(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime(); const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return (b - a) / 3600000;
}

function fmtHours(h: number | null) {
  if (h === null || h < 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

interface Props {
  ticket: ServiceTicket;
  allTickets: ServiceTicket[];
  currentUserName: string;
  onClose: () => void;
  onStatusChange?: (t: ServiceTicket, s: ServiceStatus) => void;
}

export function ServiceTicketDetail({ ticket, allTickets, currentUserName, onClose, onStatusChange }: Props) {
  const [tab, setTab] = useState<Tab>("timeline");
  const [costs, setCosts] = useState<ServiceCost[]>([]);
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const [costsLoading, setCostsLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(true);

  // Cost entry mode
  const [costEntryMode, setCostEntryMode] = useState<CostEntryMode>("batch");

  // Product catalog (loaded on costs tab)
  const [svcProducts, setSvcProducts] = useState<Product[]>([]);

  // ── Preset state ──
  const [presets, setPresets] = useState<ServiceCostPreset[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [activePreset, setActivePreset] = useState<ServiceCostPreset | null>(null);
  const [presetQtyMap, setPresetQtyMap] = useState<Record<number, number>>({});
  const [presetDate, setPresetDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingPresetApply, setSavingPresetApply] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [savingNewPreset, setSavingNewPreset] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  // ── Batch state ──
  const [batchQty, setBatchQty] = useState<Record<string, number>>({});
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingBatch, setSavingBatch] = useState(false);

  // ── % Revenue state ──
  const [percentVal, setPercentVal] = useState<number>(15);
  const [percentBase, setPercentBase] = useState<"revenue" | "custom">("revenue");
  const [percentCustomBase, setPercentCustomBase] = useState<number>(0);
  const [percentDesc, setPercentDesc] = useState("ค่าแรงติดตั้ง");
  const [percentDate, setPercentDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingPercent, setSavingPercent] = useState(false);

  // ── Manual form ──
  const [costForm, setCostForm] = useState<{
    category: ServiceCost["category"]; description: string; amount: number; date: string; vendor_name: string;
  }>({ category: "labor", description: "", amount: 0, date: new Date().toISOString().slice(0, 10), vendor_name: "" });
  const [addingCost, setAddingCost] = useState(false);

  // ── Attachment state ──
  const [attForm, setAttForm] = useState<{ type: ServiceAttachment["type"]; name: string; url: string; notes: string }>({
    type: "link", name: "", url: "", notes: "",
  });
  const [addingAtt, setAddingAtt] = useState(false);
  const [deletingCostId, setDeletingCostId] = useState<string | null>(null);
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);

  const assetHistory = allTickets.filter(t =>
    t.id !== ticket.id && (
      (ticket.asset_id && t.asset_id === ticket.asset_id) ||
      (ticket.km_number && t.km_number === ticket.km_number)
    )
  ).sort((a, b) => (b.opened_at || "").localeCompare(a.opened_at || ""));

  // ── Loaders ──
  async function loadCosts() {
    setCostsLoading(true);
    try {
      const { serviceCosts } = await import("@/lib/firestore");
      setCosts(await serviceCosts.listWhere("ticket_id", ticket.id!));
    } catch {}
    setCostsLoading(false);
  }

  async function loadAttachments() {
    setAttLoading(true);
    try {
      const { serviceAttachments } = await import("@/lib/firestore");
      setAttachments(await serviceAttachments.listWhere("ticket_id", ticket.id!));
    } catch {}
    setAttLoading(false);
  }

  useEffect(() => {
    if (ticket.id) { loadCosts(); loadAttachments(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  // Load service products on costs tab
  useEffect(() => {
    if (tab !== "costs" || svcProducts.length > 0) return;
    import("@/lib/firestore").then(({ products }) =>
      products.list().then(all =>
        setSvcProducts(all.filter(p => p.type === "service" || p.category?.toLowerCase().includes("บริการ")).sort((a, b) => a.name.localeCompare(b.name, "th")))
      )
    ).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Load presets on costs tab
  useEffect(() => {
    if (tab !== "costs" || presetsLoaded) return;
    setPresetsLoaded(true);
    import("@/lib/firestore").then(({ serviceCostPresets }) =>
      serviceCostPresets.list().then(setPresets)
    ).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, presetsLoaded]);

  // ── Helpers ──
  function guessCategory(name: string): ServiceCost["category"] {
    const n = name.toLowerCase();
    if (n.includes("manday") || n.includes("senior") || n.includes("junior") || n.includes("labor") || n.includes("แรง") || n.includes("ช่าง") || n.includes("pm ")) return "labor";
    if (n.includes("น้ำมัน") || n.includes("fuel")) return "fuel";
    if (n.includes("ที่พัก") || n.includes("โรงแรม") || n.includes("hotel")) return "accommodation";
    if (n.includes("เบี้ยเลี้ยง") || n.includes("allowance")) return "allowance";
    if (n.includes("เดินทาง") || n.includes("รถ") || n.includes("เครื่องบิน") || n.includes("ขนส่ง")) return "travel";
    if (n.includes("อะไหล่") || n.includes("parts") || n.includes("spare")) return "parts";
    if (n.includes("outsource") || n.includes("จ้างเหมา")) return "outsource";
    return "custom";
  }

  function selectPreset(p: ServiceCostPreset) {
    setActivePreset(p);
    const qtyMap: Record<number, number> = {};
    p.items.forEach((item, i) => { qtyMap[i] = item.qty; });
    setPresetQtyMap(qtyMap);
  }

  // ── Actions ──
  async function applyPreset() {
    if (!activePreset) return;
    const toSave = activePreset.items
      .map((item, i) => ({ ...item, qty: presetQtyMap[i] ?? item.qty }))
      .filter(item => (item.qty || 0) > 0);
    if (!toSave.length) return;
    setSavingPresetApply(true);
    try {
      const { serviceCosts } = await import("@/lib/firestore");
      for (const item of toSave) {
        const current = item.product_id ? svcProducts.find(p => p.id === item.product_id) : null;
        const price = current ? current.cost_price : item.cost_price;
        await serviceCosts.add({
          ticket_id: ticket.id!,
          category: (item.category || guessCategory(item.product_name)) as ServiceCost["category"],
          description: item.product_name,
          amount: Math.round(price * item.qty),
          date: presetDate,
          vendor_name: `${item.qty} ${item.unit || ""}`.trim(),
          created_by: currentUserName,
        });
      }
      setActivePreset(null);
      setPresetQtyMap({});
      await loadCosts();
    } catch {}
    setSavingPresetApply(false);
  }

  async function saveBatchAsPreset() {
    const name = savePresetName.trim();
    if (!name) return;
    const items: Array<{ product_id: string; product_name: string; qty: number; unit: string; cost_price: number; category: string }> = [];
    for (const [productId, qty] of Object.entries(batchQty)) {
      if ((qty || 0) <= 0) continue;
      const p = svcProducts.find(x => x.id === productId);
      if (!p) continue;
      items.push({ product_id: p.id!, product_name: p.name, qty, unit: p.unit, cost_price: p.cost_price, category: guessCategory(p.name) });
    }
    if (!items.length) return;
    setSavingNewPreset(true);
    try {
      const { serviceCostPresets } = await import("@/lib/firestore");
      await serviceCostPresets.add({ name, items } as Record<string, unknown>);
      setShowSavePreset(false);
      setSavePresetName("");
      setPresetsLoaded(false); // triggers reload
    } catch {}
    setSavingNewPreset(false);
  }

  async function deletePreset(id: string) {
    if (!confirm("ลบชุดงานนี้?")) return;
    setDeletingPresetId(id);
    try {
      const { serviceCostPresets } = await import("@/lib/firestore");
      await serviceCostPresets.remove(id);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch {}
    setDeletingPresetId(null);
  }

  async function savePercent() {
    const desc = percentDesc.trim();
    if (!percentVal || !desc) return;
    const base = percentBase === "revenue" ? (ticket.service_value || 0) : percentCustomBase;
    const amount = Math.round(base * percentVal / 100);
    if (!amount) return;
    setSavingPercent(true);
    try {
      const { serviceCosts } = await import("@/lib/firestore");
      await serviceCosts.add({
        ticket_id: ticket.id!,
        category: "percentage",
        description: `${desc} (${percentVal}%)`,
        amount,
        date: percentDate,
        percent: percentVal,
        percent_of: "revenue",
        base_amount: base,
        created_by: currentUserName,
      });
      setPercentDesc("ค่าแรงติดตั้ง");
      await loadCosts();
    } catch {}
    setSavingPercent(false);
  }

  async function saveBatch() {
    const items = Object.entries(batchQty).filter(([, q]) => (q || 0) > 0);
    if (!items.length) return;
    setSavingBatch(true);
    try {
      const { serviceCosts } = await import("@/lib/firestore");
      for (const [productId, qty] of items) {
        const p = svcProducts.find(x => x.id === productId);
        if (!p) continue;
        await serviceCosts.add({
          ticket_id: ticket.id!, category: guessCategory(p.name),
          description: p.name, amount: Math.round(p.cost_price * qty),
          date: batchDate, vendor_name: `${qty} ${p.unit}`,
          created_by: currentUserName,
        });
      }
      setBatchQty({});
      await loadCosts();
    } catch {}
    setSavingBatch(false);
  }

  async function saveCost() {
    if (!costForm.description.trim() || !costForm.amount) return;
    setAddingCost(true);
    try {
      const { serviceCosts } = await import("@/lib/firestore");
      await serviceCosts.add({
        ticket_id: ticket.id!, category: costForm.category,
        description: costForm.description.trim(), amount: costForm.amount,
        date: costForm.date, vendor_name: costForm.vendor_name.trim(),
        created_by: currentUserName,
      });
      setCostForm({ category: "labor", description: "", amount: 0, date: new Date().toISOString().slice(0, 10), vendor_name: "" });
      await loadCosts();
    } catch {}
    setAddingCost(false);
  }

  async function deleteCost(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    setDeletingCostId(id);
    try { const { serviceCosts } = await import("@/lib/firestore"); await serviceCosts.remove(id); await loadCosts(); } catch {}
    setDeletingCostId(null);
  }

  async function saveAttachment() {
    if (!attForm.name.trim()) return;
    setAddingAtt(true);
    try {
      const { serviceAttachments } = await import("@/lib/firestore");
      await serviceAttachments.add({
        ticket_id: ticket.id!, type: attForm.type,
        name: attForm.name.trim(), url: attForm.url.trim(),
        notes: attForm.notes.trim(), created_by: currentUserName,
      });
      setAttForm({ type: "link", name: "", url: "", notes: "" });
      await loadAttachments();
    } catch {}
    setAddingAtt(false);
  }

  async function deleteAttachment(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    setDeletingAttId(id);
    try { const { serviceAttachments } = await import("@/lib/firestore"); await serviceAttachments.remove(id); await loadAttachments(); } catch {}
    setDeletingAttId(null);
  }

  // ── Derived ──
  const totalCost = costs.reduce((s, c) => s + (c.amount || 0), 0);

  type TEntry = { status: ServiceStatus; timestamp: string; by: string; note?: string };
  const histEntries: TEntry[] = ticket.status_history ?? [];
  const legacyFallback: TEntry[] = !histEntries.length ? ([
    ticket.opened_at ? { status: "open" as ServiceStatus, timestamp: ticket.opened_at, by: ticket.reported_by || "system" } : null,
    ticket.accepted_at ? { status: (ticket.acknowledged_at ? "acknowledged" : "in_progress") as ServiceStatus, timestamp: ticket.accepted_at, by: ticket.accepted_by || ticket.technician || "" } : null,
    (!ticket.accepted_at && ticket.started_at) ? { status: "in_progress" as ServiceStatus, timestamp: ticket.started_at, by: ticket.technician || "" } : null,
    ticket.resolved_at ? { status: "resolved" as ServiceStatus, timestamp: ticket.resolved_at, by: ticket.technician || "" } : null,
    ticket.closed_at ? { status: "closed" as ServiceStatus, timestamp: ticket.closed_at, by: "" } : null,
  ].filter(Boolean) as TEntry[]) : [];
  const timeline = [...histEntries, ...legacyFallback].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const respH = hoursBetween(ticket.opened_at, ticket.accepted_at ?? ticket.acknowledged_at);
  const workH = hoursBetween(ticket.started_at ?? ticket.repair_start_at, ticket.resolved_at);
  const totalH = hoursBetween(ticket.opened_at, ticket.resolved_at);
  const slaResp = ticket.sla_response_hours || 4;
  const slaRes = ticket.sla_resolve_hours || 48;

  const STATUSES_IN_WORKFLOW: ServiceStatus[] = [
    "open", "acknowledged", "traveling", "on_site", "repair_start",
    "in_progress", "waiting_parts", "resume", "resolved", "closed", "cancelled", "waiting_approval",
  ];

  const ALL_COST_DISPLAY_CATS = [...COST_CATS, "percentage"] as const;
  const costByCategory = ALL_COST_DISPLAY_CATS.map(cat => ({
    cat, label: COST_CAT_LABEL[cat] || cat, icon: COST_CAT_ICON[cat] || "💰",
    total: costs.filter(c => c.category === cat).reduce((s, c) => s + c.amount, 0),
  })).filter(x => x.total > 0);

  // Batch derived
  const batchTotal = Object.entries(batchQty).reduce((s, [id, q]) => {
    const p = svcProducts.find(x => x.id === id);
    return s + (p ? Math.round(p.cost_price * (q || 0)) : 0);
  }, 0);
  const batchCount = Object.values(batchQty).filter(q => (q || 0) > 0).length;

  // Preset derived
  const presetApplyTotal = activePreset
    ? activePreset.items.reduce((s, item, i) => {
        const qty = presetQtyMap[i] ?? item.qty;
        const current = item.product_id ? svcProducts.find(p => p.id === item.product_id) : null;
        return s + Math.round((current ? current.cost_price : item.cost_price) * qty);
      }, 0)
    : 0;

  // % derived
  const percentBaseAmount = percentBase === "revenue" ? (ticket.service_value || 0) : percentCustomBase;
  const percentComputed = Math.round(percentBaseAmount * percentVal / 100);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 cursor-pointer" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-xl bg-background border-l border-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-semibold text-accent">{TYPE_LABELS[ticket.type] || ticket.type}</span>
              {ticket.priority && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ticket.priority === "critical" ? "bg-red-500/20 text-red-400" : ticket.priority === "high" ? "bg-orange-500/20 text-orange-400" : ticket.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>
                  {ticket.priority === "critical" ? "🔴 วิกฤต" : ticket.priority === "high" ? "🟠 สูง" : ticket.priority === "medium" ? "🟡 ปกติ" : "🟢 ต่ำ"}
                </span>
              )}
            </div>
            <p className="text-sm font-bold truncate">{ticket.customer_name}</p>
            <p className="text-xs text-muted truncate">{ticket.issue}</p>
          </div>
          {onStatusChange && (
            <select value={ticket.status}
              onChange={e => onStatusChange(ticket, e.target.value as ServiceStatus)}
              className="rounded-lg bg-card border border-border px-2 py-1.5 text-xs focus:outline-none shrink-0">
              {STATUSES_IN_WORKFLOW.map(s => <option key={s} value={s}>{STATUS_ICON[s]} {STATUS_LABEL[s]}</option>)}
            </select>
          )}
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg leading-none shrink-0 mt-0.5">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 overflow-x-auto">
          {(["timeline", "costs", "attachments", "asset"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
              {t === "timeline" ? "⏱️ Timeline" : t === "costs" ? `💰 ต้นทุน ${costs.length > 0 ? `(${totalCost.toLocaleString()}฿)` : ""}` : t === "attachments" ? `📎 ไฟล์ (${attachments.length})` : `🖥️ Asset History`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── TIMELINE ── */}
          {tab === "timeline" && (
            <div className="p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">ยังไม่มีประวัติสถานะ<br /><span className="text-xs">ประวัติจะเริ่มบันทึกเมื่อมีการเปลี่ยนสถานะ</span></p>
              ) : (
                <div className="relative pl-6 mb-6">
                  <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-5">
                    {timeline.map((e, i) => {
                      const colorCls = STATUS_COLOR[e.status] || "border-gray-400 bg-gray-400";
                      const isLast = i === timeline.length - 1;
                      return (
                        <div key={i} className="relative">
                          <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 ${colorCls} ${isLast ? "ring-2 ring-offset-1 ring-offset-background ring-accent/40" : ""}`} />
                          <p className="text-sm font-semibold">{STATUS_ICON[e.status]} {STATUS_LABEL[e.status] || e.status}</p>
                          <p className="text-[11px] text-muted">{fmtDT(e.timestamp)}{e.by && ` · โดย ${e.by}`}</p>
                          {e.note && <p className="text-xs text-muted italic mt-0.5 bg-card rounded px-2 py-1">{e.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-3">⏱️ SLA Summary</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div><p className="text-muted mb-0.5">เปิดงาน</p><p className="font-medium">{fmtDT(ticket.opened_at)}</p></div>
                  <div><p className="text-muted mb-0.5">รับทราบ</p><p className="font-medium">{fmtDT(ticket.accepted_at || ticket.acknowledged_at)}</p></div>
                  <div><p className="text-muted mb-0.5">ถึงสถานที่</p><p className="font-medium">{fmtDT(ticket.on_site_at)}</p></div>
                  <div><p className="text-muted mb-0.5">เริ่มซ่อม</p><p className="font-medium">{fmtDT(ticket.repair_start_at || ticket.started_at)}</p></div>
                  <div><p className="text-muted mb-0.5">แก้ไขแล้ว</p><p className="font-medium">{fmtDT(ticket.resolved_at)}</p></div>
                  <div><p className="text-muted mb-0.5">ปิดงาน</p><p className="font-medium">{fmtDT(ticket.closed_at)}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                  <div className={`rounded-lg p-2 text-center ${respH !== null && respH > slaResp ? "bg-red-900/20" : "bg-green-900/20"}`}>
                    <p className={`text-sm font-bold ${respH !== null && respH > slaResp ? "text-red-400" : "text-green-400"}`}>{fmtHours(respH)}</p>
                    <p className="text-[10px] text-muted">ตอบรับ / เป้า {slaResp}h</p>
                  </div>
                  <div className="rounded-lg p-2 text-center bg-card-hover">
                    <p className="text-sm font-bold">{fmtHours(workH)}</p>
                    <p className="text-[10px] text-muted">เวลาซ่อม</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${totalH !== null && totalH > slaRes ? "bg-red-900/20" : "bg-green-900/20"}`}>
                    <p className={`text-sm font-bold ${totalH !== null && totalH > slaRes ? "text-red-400" : "text-green-400"}`}>{fmtHours(totalH)}</p>
                    <p className="text-[10px] text-muted">รวม / เป้า {slaRes}h</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COSTS ── */}
          {tab === "costs" && (
            <div className="p-5 space-y-4">

              {/* Entry mode selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  ["preset", "📦", "ชุดงาน"],
                  ["batch", "👥", "หลายรายการ"],
                  ["percent", "💹", "% Revenue"],
                  ["manual", "✏️", "กรอกเอง"],
                ] as const).map(([mode, icon, label]) => (
                  <button key={mode} onClick={() => setCostEntryMode(mode)}
                    className={`rounded-lg py-2 text-[11px] font-medium transition-colors border ${costEntryMode === mode ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:border-accent/40 hover:text-foreground"}`}>
                    <span className="block text-base leading-none mb-0.5">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── PRESET MODE ── */}
              {costEntryMode === "preset" && (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  {!activePreset ? (
                    <>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div>
                          <p className="text-xs font-semibold">📦 ชุดงานสำเร็จรูป</p>
                          <p className="text-[10px] text-muted">เลือก Template แล้วปรับจำนวนก่อนบันทึก</p>
                        </div>
                      </div>
                      {presets.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-muted mb-1">ยังไม่มีชุดงาน</p>
                          <p className="text-[10px] text-muted">
                            ไปที่{" "}
                            <button onClick={() => setCostEntryMode("batch")} className="text-accent underline">หลายรายการ</button>
                            {" "}ใส่จำนวน แล้วกด &ldquo;บันทึกเป็นชุดงาน&rdquo;
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {presets.map(p => {
                            const est = p.items.reduce((s, item) => {
                              const cur = item.product_id ? svcProducts.find(x => x.id === item.product_id) : null;
                              return s + Math.round((cur ? cur.cost_price : item.cost_price) * item.qty);
                            }, 0);
                            return (
                              <div key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold">{p.name}</p>
                                  <p className="text-[10px] text-muted mb-0.5">
                                    {p.items.length} รายการ · ประมาณ {est.toLocaleString()} ฿
                                  </p>
                                  <p className="text-[10px] text-muted truncate">
                                    {p.items.slice(0, 3).map(i => `${i.product_name} ×${i.qty}`).join(", ")}
                                    {p.items.length > 3 && ` +${p.items.length - 3}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button onClick={() => selectPreset(p)}
                                    className="rounded-lg bg-accent px-3 py-1 text-[11px] font-semibold text-white hover:bg-accent-hover">
                                    ใช้ →
                                  </button>
                                  <button onClick={() => deletePreset(p.id!)} disabled={deletingPresetId === p.id}
                                    className="text-[10px] text-danger hover:underline disabled:opacity-40">ลบ</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/5">
                        <div>
                          <p className="text-xs font-semibold text-accent">📦 {activePreset.name}</p>
                          <button onClick={() => { setActivePreset(null); setPresetQtyMap({}); }}
                            className="text-[10px] text-muted hover:text-foreground">← เปลี่ยนชุดงาน</button>
                        </div>
                        <input type="date" value={presetDate} onChange={e => setPresetDate(e.target.value)}
                          className="rounded-lg bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
                      </div>
                      <div className="divide-y divide-border">
                        {activePreset.items.map((item, i) => {
                          const qty = presetQtyMap[i] ?? item.qty;
                          const cur = item.product_id ? svcProducts.find(p => p.id === item.product_id) : null;
                          const price = cur ? cur.cost_price : item.cost_price;
                          const subtotal = qty > 0 ? Math.round(price * qty) : null;
                          return (
                            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${qty > 0 ? "bg-accent/5" : ""}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.product_name}</p>
                                <p className="text-[10px] text-muted">{price.toLocaleString()} ฿ / {item.unit || "หน่วย"}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {subtotal !== null && (
                                  <span className="text-xs font-semibold text-accent w-20 text-right">{subtotal.toLocaleString()} ฿</span>
                                )}
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setPresetQtyMap(m => ({ ...m, [i]: Math.max(0, (m[i] ?? item.qty) - 0.5) }))}
                                    className="w-6 h-6 rounded bg-muted/20 hover:bg-muted/40 text-xs font-bold flex items-center justify-center">−</button>
                                  <input type="number" step="0.5" min="0" value={qty || ""}
                                    onChange={e => setPresetQtyMap(m => ({ ...m, [i]: Number(e.target.value) || 0 }))}
                                    className="w-14 rounded-lg bg-background border border-border px-1.5 py-1 text-xs text-center focus:outline-none focus:border-accent" />
                                  <button onClick={() => setPresetQtyMap(m => ({ ...m, [i]: (m[i] ?? item.qty) + 0.5 }))}
                                    className="w-6 h-6 rounded bg-muted/20 hover:bg-muted/40 text-xs font-bold flex items-center justify-center">+</button>
                                </div>
                                <span className="text-[10px] text-muted w-6">{item.unit || ""}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/5">
                        <p className="text-xs font-semibold">รวม <span className="text-accent">{presetApplyTotal.toLocaleString()} ฿</span></p>
                        <button onClick={applyPreset} disabled={savingPresetApply}
                          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-accent-hover">
                          {savingPresetApply ? "บันทึก..." : "💾 บันทึกทั้งหมด"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── BATCH MODE ── */}
              {costEntryMode === "batch" && (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div>
                      <p className="text-xs font-semibold">👥 บันทึกหลายรายการพร้อมกัน</p>
                      <p className="text-[10px] text-muted">ใส่จำนวนเฉพาะรายการที่ใช้ แล้วกดบันทึกทีเดียว</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)}
                        className="rounded-lg bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
                      <Link href="/products" target="_blank" className="text-[10px] text-accent hover:underline whitespace-nowrap">แก้ไขอัตรา →</Link>
                    </div>
                  </div>

                  {svcProducts.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-muted text-center">
                      ยังไม่มีรายการบริการ —{" "}
                      <Link href="/products" target="_blank" className="text-accent hover:underline">เพิ่มสินค้าที่หน้า Products</Link>
                      {" "}ตั้งประเภทเป็น <span className="font-mono bg-muted/20 px-1 rounded">service</span>
                    </div>
                  ) : (() => {
                    const grouped: Record<string, Product[]> = {};
                    for (const p of svcProducts) {
                      const cat = guessCategory(p.name);
                      if (!grouped[cat]) grouped[cat] = [];
                      grouped[cat].push(p);
                    }
                    return (
                      <>
                        <div className="divide-y divide-border">
                          {Object.entries(grouped).map(([cat, prods]) => (
                            <div key={cat}>
                              <div className="px-4 py-1.5 bg-muted/5">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">
                                  {COST_CAT_ICON[cat]} {COST_CAT_LABEL[cat]}
                                </p>
                              </div>
                              {prods.map(p => {
                                const qty = batchQty[p.id!] || 0;
                                const subtotal = qty > 0 ? Math.round(p.cost_price * qty) : null;
                                return (
                                  <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${qty > 0 ? "bg-accent/5" : ""}`}>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{p.name}</p>
                                      <p className="text-[10px] text-muted">{p.cost_price.toLocaleString()} ฿ / {p.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {subtotal !== null && (
                                        <span className="text-xs font-semibold text-accent w-20 text-right">{subtotal.toLocaleString()} ฿</span>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => setBatchQty(b => ({ ...b, [p.id!]: Math.max(0, (b[p.id!] || 0) - 0.5) }))}
                                          className="w-6 h-6 rounded bg-muted/20 hover:bg-muted/40 text-xs font-bold flex items-center justify-center">−</button>
                                        <input type="number" step="0.5" min="0" value={qty || ""} placeholder="0"
                                          onChange={e => setBatchQty(b => ({ ...b, [p.id!]: Number(e.target.value) || 0 }))}
                                          className="w-14 rounded-lg bg-background border border-border px-1.5 py-1 text-xs text-center focus:outline-none focus:border-accent" />
                                        <button onClick={() => setBatchQty(b => ({ ...b, [p.id!]: (b[p.id!] || 0) + 0.5 }))}
                                          className="w-6 h-6 rounded bg-muted/20 hover:bg-muted/40 text-xs font-bold flex items-center justify-center">+</button>
                                      </div>
                                      <span className="text-[10px] text-muted w-6">{p.unit}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        {/* Batch footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/5">
                          <div>
                            {batchCount > 0 ? (
                              <p className="text-xs font-semibold">{batchCount} รายการ · รวม <span className="text-accent">{batchTotal.toLocaleString()} ฿</span></p>
                            ) : (
                              <p className="text-[11px] text-muted">ใส่จำนวนรายการที่ต้องการ</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {batchCount > 0 && (
                              <>
                                <button onClick={() => setBatchQty({})} className="text-[11px] text-muted hover:text-danger px-2 py-1.5">ล้าง</button>
                                <button onClick={() => { setShowSavePreset(v => !v); setSavePresetName(""); }}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-accent/50 hover:text-foreground">
                                  💾 ชุดงาน
                                </button>
                              </>
                            )}
                            <button onClick={saveBatch} disabled={savingBatch || batchCount === 0}
                              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-accent-hover">
                              {savingBatch ? "บันทึก..." : `✓ บันทึก${batchCount > 0 ? ` ${batchCount}` : ""}`}
                            </button>
                          </div>
                        </div>
                        {/* Save as preset inline form */}
                        {showSavePreset && (
                          <div className="px-4 pb-3 pt-2 border-t border-border bg-muted/5">
                            <p className="text-[10px] text-muted mb-1.5">ชื่อชุดงานสำเร็จรูป</p>
                            <div className="flex gap-2">
                              <input value={savePresetName} onChange={e => setSavePresetName(e.target.value)}
                                placeholder="เช่น CCTV 1 วัน ทีม 3 คน"
                                className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                              <button onClick={saveBatchAsPreset} disabled={savingNewPreset || !savePresetName.trim()}
                                className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-accent-hover">
                                {savingNewPreset ? "..." : "บันทึก"}
                              </button>
                              <button onClick={() => { setShowSavePreset(false); setSavePresetName(""); }}
                                className="text-xs text-muted hover:text-foreground px-2">ยกเลิก</button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── % REVENUE MODE ── */}
              {costEntryMode === "percent" && (
                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-xs font-semibold mb-3">💹 ต้นทุนแบบ % จาก Revenue</p>

                  {/* Base selection */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button onClick={() => setPercentBase("revenue")}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${percentBase === "revenue" ? "border-accent bg-accent/10" : "border-border hover:border-accent/30"}`}>
                      <p className="text-[10px] text-muted mb-0.5">Revenue ของ Job</p>
                      <p className="text-sm font-bold">{(ticket.service_value || 0).toLocaleString()} ฿</p>
                    </button>
                    <button onClick={() => setPercentBase("custom")}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${percentBase === "custom" ? "border-accent bg-accent/10" : "border-border hover:border-accent/30"}`}>
                      <p className="text-[10px] text-muted mb-0.5">กรอกฐานราคาเอง</p>
                      <p className="text-sm font-bold text-muted">กำหนดเอง</p>
                    </button>
                  </div>

                  {percentBase === "custom" && (
                    <input type="number" placeholder="ฐานราคา (THB)" value={percentCustomBase || ""}
                      onChange={e => setPercentCustomBase(Number(e.target.value) || 0)}
                      className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent" />
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] text-muted block mb-1">% ต้นทุน</label>
                      <div className="flex items-center gap-1.5">
                        <input type="number" step="0.5" min="0" max="100" value={percentVal || ""}
                          onChange={e => setPercentVal(Number(e.target.value) || 0)}
                          className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                        <span className="text-sm font-bold text-muted">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted block mb-1">วันที่</label>
                      <input type="date" value={percentDate} onChange={e => setPercentDate(e.target.value)}
                        className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                    </div>
                  </div>

                  <input placeholder="รายละเอียด *" value={percentDesc}
                    onChange={e => setPercentDesc(e.target.value)}
                    className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-xs mb-3 focus:outline-none focus:border-accent" />

                  {percentVal > 0 && (
                    <div className="rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 mb-3">
                      <p className="text-xs font-semibold text-accent">
                        {percentVal}% × {percentBaseAmount.toLocaleString()} ฿{" = "}
                        <span className="text-sm">{percentComputed.toLocaleString()} ฿</span>
                      </p>
                    </div>
                  )}

                  <button onClick={savePercent} disabled={savingPercent || !percentVal || !percentDesc.trim() || !percentBaseAmount}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white disabled:opacity-50 hover:bg-accent-hover">
                    {savingPercent ? "บันทึก..." : "💹 บันทึก"}
                  </button>

                  {!ticket.service_value && percentBase === "revenue" && (
                    <p className="text-[10px] text-muted mt-2">⚠️ Ticket นี้ยังไม่มี Revenue — เลือก &ldquo;กรอกฐานราคาเอง&rdquo;</p>
                  )}
                </div>
              )}

              {/* ── MANUAL MODE ── */}
              {costEntryMode === "manual" && (
                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-xs font-semibold mb-3">✏️ กรอกรายการต้นทุน</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select value={costForm.category} onChange={e => setCostForm(f => ({ ...f, category: e.target.value as ServiceCost["category"] }))}
                      className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                      {COST_CATS.map(c => <option key={c} value={c}>{COST_CAT_ICON[c]} {COST_CAT_LABEL[c]}</option>)}
                    </select>
                    <input type="date" value={costForm.date} onChange={e => setCostForm(f => ({ ...f, date: e.target.value }))}
                      className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                  </div>
                  <input placeholder="รายละเอียด *" value={costForm.description}
                    onChange={e => setCostForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent" />
                  <div className="flex gap-2 mb-2">
                    <input type="number" placeholder="จำนวนเงิน (THB) *" value={costForm.amount || ""}
                      onChange={e => setCostForm(f => ({ ...f, amount: Number(e.target.value) }))}
                      className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                    <input placeholder="หมายเหตุ / Vendor" value={costForm.vendor_name}
                      onChange={e => setCostForm(f => ({ ...f, vendor_name: e.target.value }))}
                      className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                  </div>
                  <button onClick={saveCost} disabled={addingCost || !costForm.description.trim() || !costForm.amount}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white disabled:opacity-50 hover:bg-accent-hover">
                    {addingCost ? "บันทึก..." : "💰 บันทึก"}
                  </button>
                </div>
              )}

              {/* Category summary */}
              {costByCategory.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {costByCategory.map(x => (
                    <div key={x.cat} className="rounded-lg bg-card border border-border p-2.5 text-center">
                      <p className="text-base">{x.icon}</p>
                      <p className="text-xs font-bold">{x.total.toLocaleString()}</p>
                      <p className="text-[10px] text-muted">{x.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cost list */}
              {costsLoading ? <p className="text-sm text-muted text-center py-4">Loading...</p> : (
                <div className="rounded-xl bg-card border border-border divide-y divide-border">
                  {costs.length === 0 ? (
                    <p className="p-4 text-sm text-muted text-center">ยังไม่มีรายการต้นทุน</p>
                  ) : (
                    <>
                      {costs.map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-lg shrink-0">{COST_CAT_ICON[c.category] || "💰"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{c.description}</p>
                            <p className="text-[10px] text-muted">
                              {c.date}{c.vendor_name && ` · ${c.vendor_name}`} · {COST_CAT_LABEL[c.category] || c.category}
                              {c.percent && ` · ${c.percent}%`}
                            </p>
                          </div>
                          <p className="text-sm font-bold shrink-0">{c.amount.toLocaleString()}</p>
                          <button onClick={() => deleteCost(c.id!)} disabled={deletingCostId === c.id}
                            className="text-[10px] text-danger hover:underline shrink-0 disabled:opacity-40">ลบ</button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-3 bg-accent/5">
                        <p className="text-xs font-semibold">รวมต้นทุนทั้งหมด</p>
                        <p className="text-sm font-bold text-accent">{totalCost.toLocaleString()} ฿</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ATTACHMENTS ── */}
          {tab === "attachments" && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs font-semibold mb-3">+ เพิ่มไฟล์ / ลิงก์ / บันทึก</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={attForm.type} onChange={e => setAttForm(f => ({ ...f, type: e.target.value as ServiceAttachment["type"] }))}
                    className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                    <option value="photo">📷 รูปภาพ</option>
                    <option value="document">📄 เอกสาร</option>
                    <option value="memo">📝 บันทึก</option>
                    <option value="link">🔗 ลิงก์</option>
                    <option value="onedrive">☁️ OneDrive</option>
                    <option value="gdrive">📁 Google Drive</option>
                  </select>
                  <input placeholder="ชื่อไฟล์ / หัวข้อ *" value={attForm.name}
                    onChange={e => setAttForm(f => ({ ...f, name: e.target.value }))}
                    className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                </div>
                <input placeholder="URL (ไม่บังคับ)" value={attForm.url}
                  onChange={e => setAttForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent" />
                <textarea placeholder="หมายเหตุ / เนื้อหา (ไม่บังคับ)" value={attForm.notes}
                  onChange={e => setAttForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-xs mb-2 resize-none min-h-[56px] focus:outline-none focus:border-accent" />
                <button onClick={saveAttachment} disabled={addingAtt || !attForm.name.trim()}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white disabled:opacity-50 hover:bg-accent-hover">
                  {addingAtt ? "บันทึก..." : "📎 บันทึก"}
                </button>
              </div>
              {attLoading ? <p className="text-sm text-muted text-center py-4">Loading...</p> : (
                <div className="space-y-2">
                  {attachments.length === 0 ? (
                    <p className="text-sm text-muted text-center py-4">ยังไม่มีไฟล์แนบ</p>
                  ) : attachments.map(a => (
                    <div key={a.id} className="rounded-xl bg-card border border-border p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">
                          {a.type === "photo" ? "📷" : a.type === "document" ? "📄" : a.type === "memo" ? "📝" : a.type === "onedrive" ? "☁️" : a.type === "gdrive" ? "📁" : "🔗"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{a.name}</p>
                          {a.url && (
                            <a href={a.url} target="_blank" rel="noreferrer"
                              className="text-[10px] text-accent hover:underline block truncate">{a.url}</a>
                          )}
                          {a.notes && <p className="text-[10px] text-muted mt-0.5 whitespace-pre-wrap">{a.notes}</p>}
                          <p className="text-[10px] text-muted mt-0.5">โดย {a.created_by}</p>
                        </div>
                        <button onClick={() => deleteAttachment(a.id!)} disabled={deletingAttId === a.id}
                          className="text-[10px] text-danger hover:underline shrink-0 disabled:opacity-40">ลบ</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ASSET HISTORY ── */}
          {tab === "asset" && (
            <div className="p-5">
              {!ticket.asset_id && !ticket.km_number ? (
                <p className="text-sm text-muted text-center py-10">ไม่ได้ระบุ Asset สำหรับ Ticket นี้<br /><span className="text-xs">เพิ่ม Asset / KM Number ในฟอร์มสร้าง Ticket</span></p>
              ) : (
                <>
                  <div className="rounded-xl bg-card border border-border p-4 mb-4">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-1">Asset ที่เกี่ยวข้อง</p>
                    <p className="text-base font-bold font-mono">{ticket.km_number || "—"}</p>
                    {ticket.asset_id && <p className="text-[10px] text-muted">{ticket.asset_id}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-xl bg-card border border-border p-3 text-center">
                      <p className="text-xl font-bold">{assetHistory.length + 1}</p>
                      <p className="text-[10px] text-muted">งานทั้งหมด</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3 text-center">
                      <p className="text-xl font-bold text-red-400">
                        {assetHistory.filter(t => t.type === "repair").length + (ticket.type === "repair" ? 1 : 0)}
                      </p>
                      <p className="text-[10px] text-muted">ครั้งที่ซ่อม (CM)</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">
                        {assetHistory.filter(t => t.type === "pm_service").length + (ticket.type === "pm_service" ? 1 : 0)}
                      </p>
                      <p className="text-[10px] text-muted">ครั้ง PM</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-muted mb-2">ประวัติงานอื่น ({assetHistory.length} รายการ)</p>
                  {assetHistory.length === 0 ? (
                    <p className="text-sm text-muted text-center py-4">ไม่มีงานอื่นสำหรับ Asset นี้</p>
                  ) : (
                    <div className="space-y-2">
                      {assetHistory.map(t => (
                        <div key={t.id} className="rounded-xl bg-card border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{TYPE_LABELS[t.type] || t.type}</p>
                              <p className="text-[11px] text-muted truncate">{t.issue}</p>
                              <p className="text-[10px] text-muted">{fmtDT(t.opened_at)} · {t.technician || "ไม่ระบุช่าง"}</p>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-card-hover shrink-0">
                              {STATUS_ICON[t.status]} {STATUS_LABEL[t.status] || t.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
