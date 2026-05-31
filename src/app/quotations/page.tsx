"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Quotation, QuotationItem, Customer, Project, Product, User, QuotationDocument, QuotationDocType, QuotationDocOwner } from "@/lib/types";
import { generateNumber } from "@/lib/numbering";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import CsvImportExport from "@/components/CsvImportExport";

const QT_COLS = [
  { key: "quotation_number", label: "เลขที่ใบเสนอราคา" },
  { key: "customer_name",    label: "ลูกค้า" },
  { key: "project_name",     label: "โปรเจค" },
  { key: "total_selling",    label: "มูลค่ารวม (THB)" },
  { key: "grand_total",      label: "ยอดสุทธิ (THB)" },
  { key: "gp_percent",       label: "%GP" },
  { key: "status",           label: "สถานะ" },
  { key: "created_by",       label: "ผู้สร้าง" },
  { key: "sent_date",        label: "วันที่ส่ง" },
  { key: "po_number",        label: "เลขที่ PO" },
  { key: "notes",            label: "หมายเหตุ" },
];

const emptyItem: QuotationItem = { product_id: "", product_code: "", product_name: "", qty: 1, unit: "pcs", cost_price: 0, selling_price: 0, discount: 0, total_cost: 0, total_selling: 0, margin_percent: 0, price_tier: "general" };

const statusLabel: Record<string, string> = { draft: "Draft", sent: "ส่งแล้ว", approved: "อนุมัติ", rejected: "ปฏิเสธ", expired: "หมดอายุ" };

const vatModeLabel: Record<string, string> = { none: "ไม่มี VAT", exclusive: "ราคา + VAT", inclusive: "รวม VAT แล้ว" };

const tierIcon: Record<string, string> = { general: "👤", member: "⭐", special: "💎", custom: "✏️" };
const tierLabel: Record<string, string> = { general: "ทั่วไป", member: "สมาชิก", special: "พิเศษ", custom: "Custom" };
function priceForTier(p: Product, tier: "general" | "member" | "special"): number {
  if (tier === "member") return p.price_member || p.selling_price || 0;
  if (tier === "special") return p.price_special || p.selling_price || 0;
  return p.selling_price || 0;
}
function fmtMoney(n: number, dec = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function parseNum(s: string): number { return Number(s.replace(/,/g, "")) || 0; }

export default function QuotationsPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [list, setList] = useState<Quotation[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [createdById, setCreatedById] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Quotation["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [custId, setCustId] = useState("");
  const [custName, setCustName] = useState("");
  const [projId, setProjId] = useState("");
  const [projName, setProjName] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState("");

  // VAT
  const [vatMode, setVatMode] = useState<"none" | "exclusive" | "inclusive">("exclusive");
  const [vatRate, setVatRate] = useState(7);

  // Customer search combobox
  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);

  // Picker
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [q, c, p, pr, u] = await Promise.all([fs.quotations.list(), fs.customers.list(), fs.projects.list(), fs.products.list(), fs.users.list()]);
      setList(q); setCusts(c); setProjs(p); setProds(pr.filter((x) => x.active));
      setUsers(u.filter(x => x.active));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);
  useEffect(() => {
    if (users.length > 0 && currentUser && !createdById) {
      const me = users.find(u => u.name === currentUser.name || u.email === currentUser.email);
      if (me?.id) setCreatedById(me.id);
    }
  }, [users, currentUser]);

  // Own-data isolation: sale / avenger / Sales Executive (and any new role without view_all_projects) see only their own quotations
  const myRole = currentUser?.role ?? "";
  const ownOnly = !!currentUser && !hasPermission("view_all_projects") &&
    (myRole === "sale" || myRole === "avenger" || isNewRole(myRole));

  // Filter
  const filtered = list.filter((q) => {
    if (ownOnly && q.created_by !== currentUser?.name) return false;
    const s = search.toLowerCase();
    const matchSearch = !s || q.customer_name.toLowerCase().includes(s) || q.quotation_number.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Dashboard stats — scoped to own data when ownOnly
  const valueOf = (q: Quotation) => q.grand_total || q.total_selling || 0;
  const statBase = ownOnly ? list.filter(q => q.created_by === currentUser?.name) : list;
  const sumByStatus = (st: Quotation["status"]) => statBase.filter(q => q.status === st).reduce((s, q) => s + valueOf(q), 0);
  const stats = {
    total: statBase.length,
    draft: statBase.filter(q => q.status === "draft").length,
    sent: statBase.filter(q => q.status === "sent").length,
    approved: statBase.filter(q => q.status === "approved").length,
    rejected: statBase.filter(q => q.status === "rejected").length,
    expired: statBase.filter(q => q.status === "expired").length,
    totalSelling: statBase.reduce((s, q) => s + valueOf(q), 0),
    pendingValue: sumByStatus("draft") + sumByStatus("sent"),
    approvedValue: sumByStatus("approved"),
    avgGP: statBase.length > 0 ? statBase.reduce((s, q) => s + (q.gp_percent || 0), 0) / statBase.length : 0,
  };

  function selectProduct(idx: number, p: Product, tier: "general" | "member" | "special" = "general") {
    const sell = priceForTier(p, tier);
    const disc = p.default_discount || 0;
    setItems(items.map((it, i) => i === idx ? {
      ...it,
      product_id: p.id || "",
      product_code: p.code || "",
      product_name: p.name,
      unit: p.unit || it.unit,
      cost_price: p.cost_price || 0,
      selling_price: sell,
      discount: disc,
      total_cost: (p.cost_price || 0) * it.qty,
      total_selling: (sell - disc) * it.qty,
      margin_percent: sell > 0 ? ((sell - (p.cost_price || 0)) / sell * 100) : 0,
      price_tier: tier,
    } : it));
    setPickerOpen(null);
  }

  function changeTier(idx: number, tier: "general" | "member" | "special") {
    const it = items[idx];
    const p = prods.find(x => x.id === it.product_id);
    if (!p) return;
    const sell = priceForTier(p, tier);
    setItems(items.map((x, i) => i === idx ? {
      ...x,
      selling_price: sell,
      total_selling: (sell - x.discount) * x.qty,
      margin_percent: sell > 0 ? ((sell - x.cost_price) / sell * 100) : 0,
      price_tier: tier,
    } : x));
  }

  function updateItemText(idx: number, field: "product_name" | "product_code" | "unit", val: string) {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: val, product_id: field === "product_name" ? "" : it.product_id } : it));
  }

  function updateItem(idx: number, field: string, val: number) {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      updated.total_cost = updated.cost_price * updated.qty;
      updated.total_selling = (updated.selling_price - updated.discount) * updated.qty;
      updated.margin_percent = updated.selling_price > 0 ? ((updated.selling_price - updated.cost_price) / updated.selling_price * 100) : 0;
      // Manual edit of selling_price → mark as custom (unless it matches a known tier)
      if (field === "selling_price" && it.product_id) {
        const p = prods.find(x => x.id === it.product_id);
        if (p) {
          if (val === priceForTier(p, "general")) updated.price_tier = "general";
          else if (p.price_member && val === p.price_member) updated.price_tier = "member";
          else if (p.price_special && val === p.price_special) updated.price_tier = "special";
          else updated.price_tier = "custom";
        }
      }
      return updated;
    }));
  }

  const totalCost = items.reduce((s, i) => s + i.total_cost, 0);
  const subtotalSelling = items.reduce((s, i) => s + i.total_selling, 0); // sum of line totals (the "selling" before any VAT logic)
  const totalDiscount = items.reduce((s, i) => s + i.discount * i.qty, 0);
  const grossProfit = subtotalSelling - totalCost;
  const gpPercent = subtotalSelling > 0 ? (grossProfit / subtotalSelling * 100) : 0;

  // VAT calculations
  const vatAmount = vatMode === "none" ? 0
    : vatMode === "exclusive" ? subtotalSelling * (vatRate / 100)
    : subtotalSelling * (vatRate / (100 + vatRate)); // inclusive: extract VAT from total
  const grandTotal = vatMode === "exclusive" ? subtotalSelling + vatAmount : subtotalSelling;
  const beforeVat = vatMode === "inclusive" ? subtotalSelling - vatAmount : subtotalSelling;

  async function handleSave() {
    if (!custId) return; setSaving(true);
    const { quotations } = await import("@/lib/firestore");
    const creator = users.find(u => u.id === createdById);
    const userCode = creator?.sales_code || "";
    const fromTemplate = await generateNumber("quotation", { user_code: userCode });
    const qNum = fromTemplate || `QT-${Date.now().toString(36).toUpperCase()}`;
    try {
      await quotations.add({
        quotation_number: qNum, customer_id: custId, customer_name: custName,
        project_id: projId === "other" ? "" : projId, project_name: projName, items,
        total_cost: totalCost, total_selling: subtotalSelling, total_discount: totalDiscount,
        gross_profit: grossProfit, gp_percent: gpPercent,
        vat_mode: vatMode, vat_rate: vatRate, vat_amount: vatAmount, grand_total: grandTotal,
        status: "draft", notes, created_by: creator?.name || "", salesperson: creator?.name || "",
      } as unknown as Record<string, unknown>);
      setCustId(""); setCustName(""); setCustSearch(""); setProjId(""); setProjName(""); setItems([{ ...emptyItem }]); setNotes("");
      const me = users.find(u => u.name === currentUser?.name || u.email === currentUser?.email); if (me?.id) setCreatedById(me.id);
      setVatMode("exclusive"); setVatRate(7);
      setShowForm(false); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  // Custom confirm modal (Electron-safe)
  const [confirmModal, setConfirmModal] = useState<{ msg: string; onOk: () => void } | null>(null);

  // Quotation detail panel
  const [selectedQ, setSelectedQ] = useState<Quotation | null>(null);

  // Quotation documents
  const [qDocs, setQDocs] = useState<QuotationDocument[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState<QuotationDocType>("quotation");
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [newDocOwner, setNewDocOwner] = useState<QuotationDocOwner>("sales");
  const [newDocNote, setNewDocNote] = useState("");

  // Revise reason modal (replaces prompt())
  const [reviseTarget, setReviseTarget] = useState<Quotation | null>(null);
  const [reviseReason, setReviseReason] = useState("");

  function handleDelete(id: string) {
    setConfirmModal({ msg: "ลบใบเสนอราคานี้?\nข้อมูลจะหายไปถาวร", onOk: async () => {
      const { quotations } = await import("@/lib/firestore");
      await quotations.remove(id);
      if (selectedQ?.id === id) setSelectedQ(null);
      await load();
    }});
  }

  // Load docs when selected QT changes
  useEffect(() => {
    if (!selectedQ?.id) { setQDocs([]); setShowDocForm(false); return; }
    import("@/lib/firestore").then(fs =>
      fs.quotationDocuments.listWhere("quotation_id", selectedQ.id!).then(setQDocs)
    );
  }, [selectedQ?.id]);

  async function addQuotationDoc(q: Quotation) {
    if (!newDocName.trim()) return;
    setSavingDoc(true);
    try {
      const { quotationDocuments } = await import("@/lib/firestore");
      const doc: Omit<QuotationDocument, "id"> = {
        quotation_id: q.id!, customer_id: q.customer_id, project_id: q.project_id || "",
        document_type: newDocType, document_name: newDocName.trim(),
        document_url: newDocUrl.trim() || undefined,
        owner_team: newDocOwner, note: newDocNote.trim() || undefined,
        created_by: currentUser?.name || "", createdAt: new Date().toISOString(),
      };
      await quotationDocuments.add(doc as unknown as Record<string, unknown>);
      setNewDocName(""); setNewDocUrl(""); setNewDocNote(""); setShowDocForm(false);
      const fresh = await quotationDocuments.listWhere("quotation_id", q.id!);
      setQDocs(fresh);
    } finally { setSavingDoc(false); }
  }

  async function removeQuotationDoc(docId: string, qId: string) {
    const { quotationDocuments } = await import("@/lib/firestore");
    await quotationDocuments.remove(docId);
    const fresh = await quotationDocuments.listWhere("quotation_id", qId);
    setQDocs(fresh);
  }

  async function doRevise() {
    if (!reviseTarget || !reviseReason.trim()) return;
    const q = reviseTarget;
    setSaving(true);
    const { quotations } = await import("@/lib/firestore");
    try {
      const oldRevision = {
        version: q.version || 1, date: new Date().toISOString(), user: "ระบบ", reason: reviseReason,
        items: q.items || [], total_cost: q.total_cost || 0, total_selling: q.total_selling || 0,
        total_discount: q.total_discount || 0, gross_profit: q.gross_profit || 0, gp_percent: q.gp_percent || 0,
        grand_total: q.grand_total || q.total_selling || 0, vat_amount: q.vat_amount || 0, notes: q.notes || "",
      };
      const revisions = [...(q.revisions || []), oldRevision];
      await quotations.update(q.id!, { version: (q.version || 1) + 1, revisions, status: "draft" });
      setCustId(q.customer_id); setCustName(q.customer_name);
      setProjId(q.project_id || ""); setProjName(q.project_name || "");
      setItems([...(q.items || [])]);
      setNotes(q.notes || "");
      setRevisionOf(q);
      setShowForm(true);
      setReviseTarget(null); setReviseReason("");
      setSelectedQ(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function changeStatus(q: Quotation, status: Quotation["status"]) {
    const { quotations } = await import("@/lib/firestore");
    await quotations.update(q.id!, { status });
    setSelectedQ(prev => prev?.id === q.id ? { ...prev, status } as Quotation : prev);
    await load();
  }

  async function changeSalesperson(q: Quotation, salesperson: string) {
    const { quotations } = await import("@/lib/firestore");
    await quotations.update(q.id!, { salesperson });
    setSelectedQ(prev => prev?.id === q.id ? { ...prev, salesperson } as Quotation : prev);
    await load();
  }

  // Revision state
  const [revisionOf, setRevisionOf] = useState<Quotation | null>(null);
  const [viewRevisions, setViewRevisions] = useState<Quotation | null>(null);

  function handleRevise(q: Quotation) {
    setReviseTarget(q);
    setReviseReason("");
  }

  async function saveRevision() {
    if (!revisionOf || !custId) return;
    setSaving(true);
    const { quotations } = await import("@/lib/firestore");
    try {
      await quotations.update(revisionOf.id!, {
        items, total_cost: totalCost, total_selling: subtotalSelling, total_discount: totalDiscount,
        gross_profit: grossProfit, gp_percent: gpPercent,
        vat_mode: vatMode, vat_rate: vatRate, vat_amount: vatAmount, grand_total: grandTotal,
        notes, status: "revised",
      });
      setRevisionOf(null); setShowForm(false);
      setCustId(""); setCustName(""); setCustSearch(""); setProjId(""); setProjName(""); setItems([{ ...emptyItem }]); setNotes("");
      const me = users.find(u => u.name === currentUser?.name || u.email === currentUser?.email); if (me?.id) setCreatedById(me.id);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  // Picker filtering
  function filterProducts(query: string): Product[] {
    const q = query.toLowerCase().trim();
    if (!q) return prods.slice(0, 12);
    return prods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    ).slice(0, 12);
  }

  const statusColor: Record<string, string> = { draft: "bg-slate-600 text-white", sent: "bg-blue-700 text-white", approved: "bg-green-700 text-white", rejected: "bg-red-700 text-white", expired: "bg-amber-700 text-white" };

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="ใบเสนอราคา">Quotations</h1>
          <p className="text-xs text-muted">จัดการใบเสนอราคา ติดตามสถานะ Draft → Approved/Rejected</p>
        </div>
        <div className="flex gap-2">
          <button title="ส่งออกไฟล์ CSV" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">Export CSV</button>
          <button title="ส่งออกไฟล์ PDF" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">Export PDF</button>
          <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showForm ? "Cancel" : "+ New Quotation"}</button>
        </div>
      </div>

      {/* Dashboard */}
      {!loading && list.length > 0 && (
        <div className="space-y-3 mb-4">
          {/* Top metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted">มูลค่ารวมทั้งหมด</p>
              <p className="text-lg font-bold">{(stats.totalSelling / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">THB ({stats.total} ใบ)</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted" title="Draft + Sent ที่ยังรอผล">รอผล (Pending)</p>
              <p className="text-lg font-bold text-blue-400">{(stats.pendingValue / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">THB ({stats.draft + stats.sent} ใบ)</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted">อนุมัติแล้ว</p>
              <p className="text-lg font-bold text-green-400">{(stats.approvedValue / 1000).toLocaleString()}K</p>
              <p className="text-[10px] text-muted">THB ({stats.approved} ใบ)</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted" title="กำไรขั้นต้นเฉลี่ย">Avg Gross Profit</p>
              <p className="text-lg font-bold text-green-400">{stats.avgGP.toFixed(1)}%</p>
              <p className="text-[10px] text-muted">เฉลี่ยทุกใบ</p>
            </div>
          </div>

          {/* Status filter chips */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <button onClick={() => setStatusFilter("all")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted">ทั้งหมด</p>
            </button>
            <button onClick={() => setStatusFilter("draft")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "draft" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-gray-300">{stats.draft}</p>
              <p className="text-[10px] text-muted">Draft</p>
            </button>
            <button onClick={() => setStatusFilter("sent")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "sent" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-blue-400">{stats.sent}</p>
              <p className="text-[10px] text-muted">ส่งแล้ว</p>
            </button>
            <button onClick={() => setStatusFilter("approved")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "approved" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-green-400">{stats.approved}</p>
              <p className="text-[10px] text-muted">อนุมัติ</p>
            </button>
            <button onClick={() => setStatusFilter("rejected")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "rejected" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-red-400">{stats.rejected}</p>
              <p className="text-[10px] text-muted">ปฏิเสธ</p>
            </button>
            <button onClick={() => setStatusFilter("expired")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "expired" ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"}`}>
              <p className="text-base font-bold text-yellow-400">{stats.expired}</p>
              <p className="text-[10px] text-muted">หมดอายุ</p>
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <h2 className="text-base font-semibold mb-3">New Quotation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted">ลูกค้า *</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={custDropOpen ? custSearch : custName}
                  placeholder="-- พิมพ์ค้นหาลูกค้า --"
                  onFocus={() => { setCustDropOpen(true); setCustSearch(""); }}
                  onBlur={() => setTimeout(() => setCustDropOpen(false), 150)}
                  onChange={(e) => { setCustSearch(e.target.value); setCustDropOpen(true); }}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
                />
                {custDropOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    {custs.filter(c => !custSearch || c.company_name.toLowerCase().includes(custSearch.toLowerCase())).length === 0
                      ? <p className="px-3 py-2 text-sm text-muted">ไม่พบลูกค้า</p>
                      : custs.filter(c => !custSearch || c.company_name.toLowerCase().includes(custSearch.toLowerCase())).map(c => (
                        <button key={c.id} type="button"
                          onMouseDown={() => { setCustId(c.id!); setCustName(c.company_name); setCustSearch(""); setCustDropOpen(false); setProjId(""); setProjName(""); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-card-hover transition-colors ${custId === c.id ? "text-accent font-medium" : "text-foreground"}`}>
                          {c.company_name}
                        </button>
                      ))
                    }
                    <Link href="/customers" className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-accent/10 border-t border-border flex items-center gap-1.5 font-medium sticky bottom-0 bg-card">
                      + สร้างลูกค้าใหม่
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted">โปรเจค</label>
              {projId === "other" ? (
                <div className="flex gap-1 mt-1">
                  <input type="text" value={projName} onChange={e => setProjName(e.target.value)}
                    placeholder="ระบุชื่อโปรเจค..."
                    className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => { setProjId(""); setProjName(""); }}
                    className="px-2 rounded-lg border border-border text-muted hover:text-foreground hover:bg-card-hover text-sm">✕</button>
                </div>
              ) : (
                <select value={projId} onChange={(e) => {
                  const v = e.target.value;
                  if (v === "other") { setProjId("other"); setProjName(""); }
                  else { setProjId(v); setProjName(projs.find((p) => p.id === v)?.name || ""); }
                }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">-- เลือกโปรเจค --</option>
                  {projs.filter(p => !custId || p.customer_id === custId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="other">✏️ อื่นๆ (ระบุเอง)</option>
                </select>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted">ผู้สร้าง / เซลล์ <span className="text-muted/60">(ใช้ใน QT number)</span></label>
              <select value={createdById} onChange={(e) => setCreatedById(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                <option value="">-- เลือกเซลล์ --</option>
                {(ownOnly ? users.filter(u => u.name === currentUser?.name || u.email === currentUser?.email) : users).map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.sales_code ? ` [${u.sales_code}]` : ""}</option>
                ))}
              </select>
              {createdById && !users.find(u => u.id === createdById)?.sales_code && (
                <p className="text-[10px] text-amber-400 mt-0.5">⚠ user นี้ยังไม่มี sales_code — <Link href="/users" className="underline">ตั้งค่า</Link></p>
              )}
            </div>
          </div>

          <p className="text-sm font-medium mb-2">รายการสินค้า / บริการ <span className="text-[10px] text-muted ml-1">(พิมพ์ค้นหา หรือใส่ชื่อเองได้ · ถ้าไม่มีรายการ สามารถแนบลิงก์เอกสารในขั้นตอนถัดไปได้)</span></p>
          <div className="overflow-visible mb-3">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted uppercase">
                <th className="px-2 py-0.5">ชื่อสินค้า / บริการ</th>
                <th className="px-2 py-0.5 w-20">รหัส</th>
                <th className="px-2 py-0.5 w-14">หน่วย</th>
                <th className="px-2 py-0.5 w-14">Qty</th>
                <th className="px-2 py-0.5 w-28">ทุน</th>
                <th className="px-2 py-0.5 w-28">ขาย</th>
                <th className="px-2 py-0.5 w-24">ส่วนลด</th>
                <th className="px-2 py-0.5 w-28 text-right">รวม</th>
                <th className="px-2 py-0.5 w-14 text-right">Margin</th>
                <th className="px-2 py-1 w-8"></th>
              </tr></thead>
              <tbody>{items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-2 py-1 relative">
                    <input
                      value={item.product_name}
                      onChange={(e) => updateItemText(idx, "product_name", e.target.value)}
                      onFocus={() => setPickerOpen(idx)}
                      onBlur={(e) => {
                        const next = e.relatedTarget as HTMLElement | null;
                        if (next && next.closest(`[data-picker="${idx}"]`)) return;
                        setTimeout(() => setPickerOpen(p => p === idx ? null : p), 150);
                      }}
                      placeholder="ค้นหา / พิมพ์ชื่อสินค้า / บริการ"
                      className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    />
                    {pickerOpen === idx && (
                      <div data-picker={idx} onMouseDown={e => e.preventDefault()} className="absolute z-50 left-0 top-full mt-0.5 w-[36rem] max-h-80 overflow-y-auto bg-card border border-border rounded-lg shadow-2xl">
                        {filterProducts(item.product_name).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted">ไม่พบในระบบ — พิมพ์เป็น Custom item ได้เลย หรือสร้างใหม่ด้านล่าง</p>
                        ) : filterProducts(item.product_name).map(p => (
                          <div key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                            <div className="px-3 pt-2 pb-1 flex items-center gap-2 text-xs">
                              <span className="shrink-0">{p.type === "service" ? "🛠️" : "📦"}</span>
                              <span className="font-mono text-muted w-20 shrink-0 truncate">{p.code || "—"}</span>
                              <span className="flex-1 truncate font-medium">{p.name}</span>
                              <span className="text-muted shrink-0">{p.unit}</span>
                            </div>
                            <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => selectProduct(idx, p, "general")}
                                className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent hover:text-white hover:border-accent"
                                title="ราคาบุคคลทั่วไป"
                              >
                                👤 {(p.selling_price || 0).toLocaleString()}
                              </button>
                              {p.price_member ? (
                                <button
                                  onClick={() => selectProduct(idx, p, "member")}
                                  className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent hover:text-white hover:border-accent"
                                  title="ราคาสมาชิก"
                                >
                                  ⭐ {p.price_member.toLocaleString()}
                                </button>
                              ) : null}
                              {p.price_special ? (
                                <button
                                  onClick={() => selectProduct(idx, p, "special")}
                                  className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent hover:text-white hover:border-accent"
                                  title="ราคาพิเศษ / VIP"
                                >
                                  💎 {p.price_special.toLocaleString()}
                                </button>
                              ) : null}
                              {p.default_discount ? (
                                <span className="text-[10px] text-amber-400 ml-1" title="ส่วนลดตั้งต้นจะถูกใส่อัตโนมัติ">🎁 -{p.default_discount.toLocaleString()}</span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-border bg-background/50 sticky bottom-0">
                          <Link
                            href={`/products?new=${encodeURIComponent(item.product_name || "")}&type=product`}
                            target="_blank"
                            className="block w-full text-left px-3 py-2 hover:bg-card-hover text-xs text-accent"
                          >
                            📦 + สร้างสินค้าใหม่ในระบบ {item.product_name && <span className="text-muted">— &quot;{item.product_name}&quot;</span>}
                          </Link>
                          <Link
                            href={`/products?new=${encodeURIComponent(item.product_name || "")}&type=service`}
                            target="_blank"
                            className="block w-full text-left px-3 py-2 hover:bg-card-hover text-xs text-accent border-t border-border"
                          >
                            🛠️ + สร้างบริการใหม่ในระบบ {item.product_name && <span className="text-muted">— &quot;{item.product_name}&quot;</span>}
                          </Link>
                        </div>
                      </div>
                    )}
                    {/* Tier selector (when item is linked to a product) */}
                    {item.product_id && pickerOpen !== idx && (() => {
                      const p = prods.find(x => x.id === item.product_id);
                      if (!p) return <p className="text-[9px] text-amber-400 mt-0.5">⚠ สินค้าถูกลบแล้ว — ใช้เป็น Custom</p>;
                      const tiers: Array<{ key: "general" | "member" | "special"; price: number | undefined }> = [
                        { key: "general", price: p.selling_price },
                        { key: "member", price: p.price_member },
                        { key: "special", price: p.price_special },
                      ];
                      return (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {tiers.filter(t => t.price).map(t => (
                            <button
                              key={t.key}
                              onClick={() => changeTier(idx, t.key)}
                              className={`text-[10px] rounded px-1.5 py-0.5 border ${item.price_tier === t.key ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:bg-card-hover"}`}
                              title={`${tierLabel[t.key]}: ${t.price?.toLocaleString()}`}
                            >
                              {tierIcon[t.key]} {t.price?.toLocaleString()}
                            </button>
                          ))}
                          {item.price_tier === "custom" && (
                            <span className="text-[10px] rounded px-1.5 py-0.5 border border-amber-700/50 bg-amber-900/20 text-amber-400" title="แก้ราคาเอง">{tierIcon.custom} Custom</span>
                          )}
                        </div>
                      );
                    })()}
                    {!item.product_id && item.product_name && pickerOpen !== idx && (
                      <p className="text-[9px] text-amber-400 mt-0.5">✏️ Custom item (ไม่ผูกกับสินค้าในระบบ)</p>
                    )}
                  </td>
                  <td className="px-2 py-0.5"><input value={item.product_code} onChange={(e) => updateItemText(idx, "product_code", e.target.value)} placeholder="—" className="w-full rounded bg-background border border-border px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-0.5"><input value={item.unit} onChange={(e) => updateItemText(idx, "unit", e.target.value)} placeholder="pcs" className="w-full rounded bg-background border border-border px-2 py-0.5 text-xs focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-0.5"><input type="number" value={item.qty || ""} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-0.5 text-xs" /></td>
                  <td className="px-2 py-0.5"><input type="text" inputMode="decimal" value={item.cost_price ? fmtMoney(item.cost_price, 0) : ""} onChange={e => updateItem(idx, "cost_price", parseNum(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-0.5 text-xs text-right font-mono focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-0.5"><input type="text" inputMode="decimal" value={item.selling_price ? fmtMoney(item.selling_price, 0) : ""} onChange={e => updateItem(idx, "selling_price", parseNum(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-0.5 text-xs text-right font-mono focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-0.5"><input type="text" inputMode="decimal" value={item.discount ? fmtMoney(item.discount, 0) : ""} onChange={e => updateItem(idx, "discount", parseNum(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-0.5 text-xs text-right font-mono focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-0.5 text-right font-mono">{fmtMoney(item.total_selling)}</td>
                  <td className={`px-2 py-0.5 text-right ${item.margin_percent >= 20 ? "text-green-400" : item.margin_percent >= 0 ? "text-yellow-400" : "text-red-400"}`}>{item.margin_percent.toFixed(1)}%</td>
                  <td className="px-2 py-0.5">{items.length > 1 && <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-danger" title="ลบรายการ">✕</button>}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <button onClick={() => setItems([...items, { ...emptyItem }])} className="text-xs text-accent hover:underline mb-4 block">+ เพิ่มรายการ</button>

          {/* VAT settings */}
          <div className="rounded-lg bg-background border border-border p-3 mb-4">
            <p className="text-xs font-semibold mb-2">ภาษีมูลค่าเพิ่ม (VAT)</p>
            <div className="flex gap-2 flex-wrap items-center">
              {(["exclusive", "inclusive", "none"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setVatMode(m)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${vatMode === m ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-card-hover"}`}
                  title={m === "exclusive" ? "ราคาขายไม่รวม VAT — บวกเพิ่มท้าย" : m === "inclusive" ? "ราคาขายรวม VAT แล้ว — แยกแสดง" : "ไม่คิด VAT"}
                >
                  {vatModeLabel[m]}
                </button>
              ))}
              {vatMode !== "none" && (
                <div className="flex items-center gap-1.5 ml-2">
                  <label className="text-[10px] text-muted">อัตรา</label>
                  <input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="w-16 rounded bg-card border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
                  <span className="text-xs text-muted">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 text-sm">
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Total Cost</p><p className="font-semibold font-mono">{fmtMoney(totalCost)}</p></div>
            <div className="rounded-lg bg-background border border-border p-3">
              <p className="text-xs text-muted">{vatMode === "inclusive" ? "ก่อน VAT" : "Subtotal"}</p>
              <p className="font-semibold font-mono">{fmtMoney(beforeVat)}</p>
            </div>
            {vatMode !== "none" && (
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-muted">VAT {vatRate}%</p>
                <p className="font-semibold text-blue-400">{vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            )}
            <div className="rounded-lg bg-accent/10 border border-accent/50 p-3">
              <p className="text-xs text-muted">Grand Total</p>
              <p className="font-bold text-accent font-mono">{fmtMoney(grandTotal)}</p>
              <p className="text-[10px] text-muted">{vatModeLabel[vatMode]}</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Gross Profit</p><p className="font-semibold text-green-400 font-mono">{fmtMoney(grossProfit)}</p></div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">GP %</p><p className="font-semibold text-green-400">{gpPercent.toFixed(1)}%</p></div>
          </div>

          <textarea placeholder="หมายเหตุ" value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-3 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y" />
          <button onClick={handleSave} disabled={saving || !custId} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกใบเสนอราคา"}</button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input placeholder="ค้นหาเลขที่ / ลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ {statusFilter !== "all" && <span className="text-accent">· {statusLabel[statusFilter]}</span>}</p>
        <CsvImportExport
          filename={`quotations-${new Date().toISOString().slice(0,10)}`}
          columns={QT_COLS}
          getData={() => filtered as unknown as Record<string, unknown>[]}
        />
      </div>
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบใบเสนอราคา</p> : (
        <div className="space-y-2">{filtered.map((q) => (
          <div key={q.id} onClick={() => setSelectedQ(q)}
            className={`rounded-xl bg-card border p-4 flex items-start justify-between hover:bg-card-hover cursor-pointer transition-colors ${selectedQ?.id === q.id ? "border-accent/60 bg-accent/5" : "border-border"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-medium">{q.quotation_number}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[q.status] || "bg-gray-700"}`}>{statusLabel[q.status] || q.status}</span>
                {q.version && q.version > 1 && <span className="rounded-full bg-purple-700 text-white px-1.5 py-0.5 text-[10px] font-medium">v{q.version}</span>}
                {(q.items?.length ?? 0) === 0 && <span className="rounded-full bg-amber-700/30 text-amber-400 px-1.5 py-0.5 text-[10px]">📎 ลิงก์เอกสาร</span>}
              </div>
              <p className="text-xs text-muted">{q.customer_name}{q.project_name && ` · ${q.project_name}`}</p>
              <p className="text-xs text-muted mt-0.5">
                {(q.items?.length ?? 0)} รายการ
                {" · "}<b className="text-foreground">{(q.grand_total || q.total_selling || 0).toLocaleString()} THB</b>
                {" · "}GP: <span className="text-foreground font-semibold">{(q.gp_percent || 0).toFixed(1)}%</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleRevise(q)} className="text-xs text-accent hover:underline">Revise</button>
              <button onClick={() => handleDelete(q.id!)} className="text-xs text-danger hover:underline">ลบ</button>
            </div>
          </div>
        ))}</div>
      )}

      {/* Revision History Viewer */}
      {viewRevisions && (viewRevisions.revisions || []).length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" title="ประวัติ Revision">📋 Revision History — {viewRevisions.quotation_number}</h2>
            <button onClick={() => setViewRevisions(null)} className="text-xs text-muted hover:text-foreground">ปิด ✕</button>
          </div>
          <p className="text-xs text-muted mb-3">เวอร์ชันปัจจุบัน: <b className="text-foreground">v{viewRevisions.version || 1}</b> · มี {(viewRevisions.revisions || []).length} revision ก่อนหน้า</p>

          <div className="space-y-3">
            {[...(viewRevisions.revisions || [])].reverse().map((rev, i) => (
              <details key={i} className="rounded-lg bg-background border border-border">
                <summary className="px-4 py-3 cursor-pointer hover:bg-card-hover transition-colors">
                  <div className="inline-flex items-center gap-3">
                    <span className="rounded-full bg-purple-700 text-white px-2 py-0.5 text-[10px] font-medium">v{rev.version}</span>
                    <span className="text-xs">{new Date(rev.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</span>
                    <span className="text-xs text-muted">โดย {rev.user}</span>
                    <span className="text-xs text-muted">· {rev.reason}</span>
                    <span className="text-xs font-medium">{rev.grand_total.toLocaleString()} THB</span>
                    <span className="text-xs font-semibold text-foreground">GP {rev.gp_percent.toFixed(1)}%</span>
                  </div>
                </summary>
                <div className="px-4 pb-3 border-t border-border pt-3">
                  {/* Compare with current */}
                  <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-muted">มูลค่า</p>
                      <p className="font-semibold">{rev.grand_total.toLocaleString()} THB</p>
                      {rev.grand_total !== (viewRevisions.grand_total || viewRevisions.total_selling) && (
                        <p className={`text-[10px] ${(viewRevisions.grand_total || viewRevisions.total_selling) > rev.grand_total ? "text-green-400" : "text-red-400"}`}>
                          {(viewRevisions.grand_total || viewRevisions.total_selling) > rev.grand_total ? "▲" : "▼"} ปัจจุบัน: {(viewRevisions.grand_total || viewRevisions.total_selling).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted">GP%</p>
                      <p className="font-semibold">{rev.gp_percent.toFixed(1)}%</p>
                      {Math.abs(rev.gp_percent - viewRevisions.gp_percent) > 0.1 && (
                        <p className={`text-[10px] ${viewRevisions.gp_percent > rev.gp_percent ? "text-green-400" : "text-red-400"}`}>
                          ปัจจุบัน: {viewRevisions.gp_percent.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted">รายการ</p>
                      <p className="font-semibold">{rev.items.length} items</p>
                    </div>
                  </div>

                  {/* Items table */}
                  <table className="w-full text-[10px]">
                    <thead><tr className="text-muted border-b border-border">
                      <th className="text-left py-1 px-1">สินค้า</th>
                      <th className="text-right py-1 px-1">Qty</th>
                      <th className="text-right py-1 px-1">ราคาขาย</th>
                      <th className="text-right py-1 px-1">ส่วนลด</th>
                      <th className="text-right py-1 px-1">รวม</th>
                    </tr></thead>
                    <tbody>{rev.items.map((item, j) => (
                      <tr key={j} className="border-b border-border last:border-0">
                        <td className="py-1 px-1">{item.product_name || item.product_code}</td>
                        <td className="text-right py-1 px-1">{item.qty}</td>
                        <td className="text-right py-1 px-1">{item.selling_price.toLocaleString()}</td>
                        <td className="text-right py-1 px-1">{item.discount > 0 ? item.discount.toLocaleString() : "-"}</td>
                        <td className="text-right py-1 px-1">{item.total_selling.toLocaleString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>

                  {rev.notes && <p className="text-xs text-muted mt-2">📝 {rev.notes}</p>}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Revise mode — change save button */}
      {revisionOf && showForm && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-purple-900/90 border border-purple-700 px-4 py-3 shadow-2xl">
          <p className="text-xs text-purple-300 mb-2">กำลังแก้ไข {revisionOf.quotation_number} → v{(revisionOf.version || 1) + 1}</p>
          <div className="flex gap-2">
            <button onClick={saveRevision} disabled={saving} className="rounded-lg bg-purple-600 text-white px-4 py-1.5 text-xs hover:bg-purple-700 disabled:opacity-50">{saving ? "กำลังบันทึก..." : "✓ บันทึก Revision"}</button>
            <button onClick={() => { setRevisionOf(null); setShowForm(false); }} className="rounded-lg border border-purple-700 text-purple-300 px-3 py-1.5 text-xs hover:bg-purple-800">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* ── QUOTATION DETAIL PANEL ──────────────────────────────────────────── */}
      {selectedQ && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setSelectedQ(null)}>
          <div className="w-full max-w-xl h-full bg-card border-l border-border shadow-2xl overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold">{selectedQ.quotation_number}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[selectedQ.status] || "bg-gray-700"}`}>{statusLabel[selectedQ.status] || selectedQ.status}</span>
                  {selectedQ.version && selectedQ.version > 1 && <span className="rounded-full bg-purple-700 text-white px-1.5 py-0.5 text-[10px] font-medium">v{selectedQ.version}</span>}
                </div>
                <p className="text-xs text-muted mt-0.5">{selectedQ.customer_name}</p>
                {selectedQ.project_name && <p className="text-[11px] text-muted">{selectedQ.project_name}</p>}
                {selectedQ.created_by && <p className="text-[10px] text-muted/60 mt-1">สร้างโดย: {selectedQ.created_by}</p>}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-muted/60">ผู้รับผิดชอบ:</span>
                  <select
                    value={selectedQ.salesperson || selectedQ.created_by || ""}
                    onChange={e => changeSalesperson(selectedQ, e.target.value)}
                    className="text-[10px] bg-transparent border border-border/40 rounded px-1.5 py-0.5 text-foreground/80 hover:border-border focus:outline-none"
                  >
                    {users.filter(u => ["sale","avenger","Sales Executive","Sales Manager","Branch Manager","Presales Manager","Presales Engineer","Administrator"].includes(u.role)).map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={() => setSelectedQ(null)} className="text-muted hover:text-foreground text-lg ml-4 shrink-0">✕</button>
            </div>

            {/* Status actions */}
            <div className="px-5 py-3 border-b border-border shrink-0 flex gap-2 flex-wrap">
              {(["draft","sent","approved","rejected"] as Quotation["status"][]).map(s => (
                <button key={s} onClick={() => changeStatus(selectedQ, s)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${selectedQ.status === s ? "bg-accent border-accent text-white" : "border-border text-muted hover:bg-card-hover"}`}>
                  {statusLabel[s]}
                </button>
              ))}
              <div className="ml-auto flex gap-2">
                <button onClick={() => { handleRevise(selectedQ); }} className="rounded-lg border border-purple-600 text-purple-700 px-3 py-1 text-xs hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30">Revise</button>
                <button onClick={() => handleDelete(selectedQ.id!)} className="rounded-lg border border-rose-600 text-rose-700 px-3 py-1 text-xs hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/30">ลบ</button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 px-5 py-4 overflow-y-auto">
              {(selectedQ.items || []).length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">ไม่มีรายการสินค้า</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] text-muted border-b border-border">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">สินค้า</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">ราคา</th>
                      <th className="pb-2 font-medium text-right">รวม</th>
                      <th className="pb-2 font-medium text-right">GP%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selectedQ.items || []).map((it, i) => (
                      <tr key={i} className="hover:bg-card-hover">
                        <td className="py-2 text-muted/60">{i + 1}</td>
                        <td className="py-2">
                          <p className="font-medium leading-snug">{it.product_name}</p>
                          {it.product_code && <p className="text-[10px] text-muted">{it.product_code}</p>}
                          {it.discount > 0 && <p className="text-[10px] text-amber-400">ส่วนลด -{it.discount.toLocaleString()}</p>}
                        </td>
                        <td className="py-2 text-right text-muted">{it.qty} {it.unit}</td>
                        <td className="py-2 text-right">{it.selling_price.toLocaleString()}</td>
                        <td className="py-2 text-right font-semibold">{it.total_selling.toLocaleString()}</td>
                        <td className="py-2 text-right text-green-400">{it.margin_percent.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Summary */}
              <div className="mt-4 rounded-xl bg-background border border-border p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted text-xs">
                  <span>Subtotal</span>
                  <span>{(selectedQ.total_selling || 0).toLocaleString()} THB</span>
                </div>
                {selectedQ.total_discount && selectedQ.total_discount > 0 && (
                  <div className="flex justify-between text-amber-400 text-xs">
                    <span>ส่วนลดรวม</span>
                    <span>-{selectedQ.total_discount.toLocaleString()}</span>
                  </div>
                )}
                {selectedQ.vat_mode && selectedQ.vat_mode !== "none" && (
                  <div className="flex justify-between text-muted text-xs">
                    <span>VAT {selectedQ.vat_rate}%</span>
                    <span>{(selectedQ.vat_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} THB</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                  <span>รวมทั้งสิ้น</span>
                  <span className="text-green-400">{(selectedQ.grand_total || selectedQ.total_selling || 0).toLocaleString()} THB</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>กำไรขั้นต้น (GP)</span>
                  <span className="text-green-400 font-semibold">{(selectedQ.gross_profit || 0).toLocaleString()} THB · {(selectedQ.gp_percent || 0).toFixed(1)}%</span>
                </div>
              </div>

              {selectedQ.notes && (
                <div className="mt-3 rounded-xl bg-background border border-border p-3">
                  <p className="text-[10px] text-muted mb-1">หมายเหตุ</p>
                  <p className="text-xs whitespace-pre-wrap">{selectedQ.notes}</p>
                </div>
              )}

              {/* ── Document Links Section ─────────────────────────── */}
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    📎 เอกสาร / ลิงก์แนบ
                    {qDocs.length > 0 && <span className="rounded-full bg-sky-700/30 text-sky-400 px-1.5 py-0.5 text-[10px]">{qDocs.length}</span>}
                  </p>
                  <button onClick={() => setShowDocForm(f => !f)} className="text-xs text-accent hover:underline">
                    {showDocForm ? "ยกเลิก" : "+ เพิ่มเอกสาร"}
                  </button>
                </div>

                {/* List */}
                {qDocs.length === 0 && !showDocForm && (
                  <div className="rounded-lg border border-dashed border-border py-4 text-center">
                    <p className="text-xs text-muted">ยังไม่มีเอกสารแนบ</p>
                    <button onClick={() => setShowDocForm(true)} className="text-xs text-accent hover:underline mt-1">+ เพิ่มลิงก์เอกสาร</button>
                  </div>
                )}

                <div className="space-y-2 mb-2">
                  {qDocs.map(d => (
                    <div key={d.id} className="rounded-lg bg-background border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-base mt-0.5 shrink-0">
                            {d.document_type === "quotation" ? "📄" : d.document_type === "bom" ? "📦" : d.document_type === "boq" ? "📊" : d.document_type === "proposal" ? "📋" : d.document_type === "tor" ? "📜" : d.document_type === "site_survey" ? "🗺️" : "📎"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-snug">{d.document_name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] bg-card rounded px-1.5 py-0.5 border border-border/50">
                                {d.document_type === "quotation" ? "Quotation" : d.document_type === "bom" ? "BOM" : d.document_type === "boq" ? "BOQ" : d.document_type === "proposal" ? "Proposal" : d.document_type === "tor" ? "TOR" : d.document_type === "site_survey" ? "Site Survey" : "อื่นๆ"}
                              </span>
                              <span className="text-[10px] text-muted">
                                {d.owner_team === "sales" ? "👤 Sales" : d.owner_team === "presale" ? "🔬 Presale" : d.owner_team === "service" ? "🔧 Service" : "📁 อื่นๆ"}
                              </span>
                              <span className="text-[10px] text-muted/60">· {d.created_by}</span>
                            </div>
                            {d.note && <p className="text-[10px] text-muted italic mt-1">{d.note}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {d.document_url && (
                            <a href={d.document_url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="rounded px-2 py-1 text-[10px] bg-accent/10 text-accent hover:bg-accent/20 font-medium transition-colors">
                              🔗 เปิด
                            </a>
                          )}
                          <button onClick={() => removeQuotationDoc(d.id!, selectedQ.id!)} className="text-[11px] text-danger/50 hover:text-danger transition-colors">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add form */}
                {showDocForm && (
                  <div className="rounded-lg bg-background border border-border p-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5">ประเภทเอกสาร</label>
                        <select value={newDocType} onChange={e => setNewDocType(e.target.value as QuotationDocType)}
                          className="w-full rounded bg-card border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                          <option value="quotation">📄 Quotation</option>
                          <option value="bom">📦 BOM</option>
                          <option value="boq">📊 BOQ</option>
                          <option value="proposal">📋 Proposal</option>
                          <option value="tor">📜 TOR</option>
                          <option value="site_survey">🗺️ Site Survey</option>
                          <option value="other">📎 อื่นๆ</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5">เจ้าของไฟล์</label>
                        <select value={newDocOwner} onChange={e => setNewDocOwner(e.target.value as QuotationDocOwner)}
                          className="w-full rounded bg-card border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                          <option value="sales">👤 Sales</option>
                          <option value="presale">🔬 Presale</option>
                          <option value="service">🔧 Service</option>
                          <option value="other">📁 อื่นๆ</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">ชื่อเอกสาร *</label>
                      <input value={newDocName} onChange={e => setNewDocName(e.target.value)}
                        placeholder="เช่น BOQ-Final_v3.xlsx, Proposal-WiFi-Campus.pdf"
                        className="w-full rounded bg-card border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">ลิงก์เอกสาร (OneDrive / SharePoint / Google Drive)</label>
                      <input value={newDocUrl} onChange={e => setNewDocUrl(e.target.value)}
                        placeholder="วาง URL จาก OneDrive หรือ SharePoint..."
                        className="w-full rounded bg-card border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted block mb-0.5">หมายเหตุ</label>
                      <input value={newDocNote} onChange={e => setNewDocNote(e.target.value)}
                        placeholder="เช่น ฉบับที่ลูกค้าขอ, รอ Presale confirm..."
                        className="w-full rounded bg-card border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
                    </div>
                    <button onClick={() => addQuotationDoc(selectedQ)} disabled={!newDocName.trim() || savingDoc}
                      className="w-full rounded-lg bg-accent text-white py-2 text-xs font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors">
                      {savingDoc ? "กำลังบันทึก..." : "+ เพิ่มเอกสาร"}
                    </button>
                  </div>
                )}
              </div>

              {/* Revision history inline */}
              {(selectedQ.revisions || []).length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted uppercase tracking-widest mb-2">ประวัติ Revision</p>
                  <div className="space-y-2">
                    {[...( selectedQ.revisions || [])].reverse().map((rev, i) => (
                      <div key={i} className="rounded-lg bg-background border border-border p-3 text-xs">
                        <div className="flex items-center justify-between text-muted mb-1">
                          <span>v{rev.version} · {rev.user}</span>
                          <span>{new Date(rev.date).toLocaleDateString("th-TH")}</span>
                        </div>
                        <p className="text-amber-300/80 italic">{rev.reason}</p>
                        <p className="text-muted mt-1">{(rev.items || []).length} รายการ · {(rev.grand_total || rev.total_selling || 0).toLocaleString()} THB</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REVISE REASON MODAL ─────────────────────────────────────────────── */}
      {reviseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl bg-card border border-border p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold mb-1">Revise — {reviseTarget.quotation_number}</h3>
            <p className="text-xs text-muted mb-3">ระบุเหตุผลที่แก้ไข (จะบันทึกเป็น Revision History)</p>
            <textarea value={reviseReason} onChange={e => setReviseReason(e.target.value)}
              placeholder="เช่น ลูกค้าขอเพิ่มจำนวน, ปรับราคา, เพิ่มรายการ..."
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-[80px] resize-none mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setReviseTarget(null); setReviseReason(""); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              <button onClick={doRevise} disabled={!reviseReason.trim() || saving}
                className="rounded-lg bg-purple-700 hover:bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : "✓ Revise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ───────────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl bg-card border border-border p-6 max-w-sm w-full shadow-2xl">
            <p className="text-sm whitespace-pre-line mb-5">{confirmModal.msg}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              <button onClick={() => { const fn = confirmModal.onOk; setConfirmModal(null); fn(); }} className="rounded-lg bg-rose-700 hover:bg-rose-600 px-4 py-2 text-sm font-semibold text-white">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
