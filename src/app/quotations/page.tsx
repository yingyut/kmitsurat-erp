"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Quotation, QuotationItem, Customer, Project, Product } from "@/lib/types";

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

export default function QuotationsPage() {
  const [list, setList] = useState<Quotation[]>([]);
  const [custs, setCusts] = useState<Customer[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
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

  // Picker
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  async function load() {
    const fs = await import("@/lib/firestore");
    try { const [q, c, p, pr] = await Promise.all([fs.quotations.list(), fs.customers.list(), fs.projects.list(), fs.products.list()]); setList(q); setCusts(c); setProjs(p); setProds(pr.filter((x) => x.active)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  // Filter
  const filtered = list.filter((q) => {
    const s = search.toLowerCase();
    const matchSearch = !s || q.customer_name.toLowerCase().includes(s) || q.quotation_number.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Dashboard stats (from full list) — use grand_total when available, else fallback to total_selling
  const valueOf = (q: Quotation) => q.grand_total || q.total_selling || 0;
  const sumByStatus = (st: Quotation["status"]) => list.filter(q => q.status === st).reduce((s, q) => s + valueOf(q), 0);
  const stats = {
    total: list.length,
    draft: list.filter(q => q.status === "draft").length,
    sent: list.filter(q => q.status === "sent").length,
    approved: list.filter(q => q.status === "approved").length,
    rejected: list.filter(q => q.status === "rejected").length,
    expired: list.filter(q => q.status === "expired").length,
    totalSelling: list.reduce((s, q) => s + valueOf(q), 0),
    pendingValue: sumByStatus("draft") + sumByStatus("sent"),
    approvedValue: sumByStatus("approved"),
    avgGP: list.length > 0 ? list.reduce((s, q) => s + (q.gp_percent || 0), 0) / list.length : 0,
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
    if (!custId || items.length === 0) return; setSaving(true);
    const { quotations } = await import("@/lib/firestore");
    const qNum = `QT-${Date.now().toString(36).toUpperCase()}`;
    try {
      await quotations.add({
        quotation_number: qNum, customer_id: custId, customer_name: custName,
        project_id: projId, project_name: projName, items,
        total_cost: totalCost, total_selling: subtotalSelling, total_discount: totalDiscount,
        gross_profit: grossProfit, gp_percent: gpPercent,
        vat_mode: vatMode, vat_rate: vatRate, vat_amount: vatAmount, grand_total: grandTotal,
        status: "draft", notes, created_by: "",
      } as unknown as Record<string, unknown>);
      setCustId(""); setCustName(""); setProjId(""); setProjName(""); setItems([{ ...emptyItem }]); setNotes("");
      setVatMode("exclusive"); setVatRate(7);
      setShowForm(false); await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const { quotations } = await import("@/lib/firestore"); await quotations.remove(id); await load(); }

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

  const statusColor: Record<string, string> = { draft: "bg-gray-700", sent: "bg-blue-900/50 text-blue-400", approved: "bg-green-900/50 text-green-400", rejected: "bg-red-900/50 text-red-400", expired: "bg-yellow-900/50 text-yellow-400" };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select value={custId} onChange={(e) => { setCustId(e.target.value); setCustName(custs.find((c) => c.id === e.target.value)?.company_name || ""); }} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Customer --</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
            <select value={projId} onChange={(e) => { setProjId(e.target.value); setProjName(projs.find((p) => p.id === e.target.value)?.name || ""); }} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Project --</option>{projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>

          <p className="text-sm font-medium mb-2">รายการสินค้า / บริการ <span className="text-[10px] text-muted ml-1">(พิมพ์ค้นหา หรือใส่ชื่อเองได้)</span></p>
          <div className="overflow-visible mb-3">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted uppercase">
                <th className="px-2 py-1">ชื่อสินค้า / บริการ</th>
                <th className="px-2 py-1 w-20">รหัส</th>
                <th className="px-2 py-1 w-14">หน่วย</th>
                <th className="px-2 py-1 w-14">Qty</th>
                <th className="px-2 py-1 w-24">ทุน</th>
                <th className="px-2 py-1 w-24">ขาย</th>
                <th className="px-2 py-1 w-20">ส่วนลด</th>
                <th className="px-2 py-1 w-24 text-right">รวม</th>
                <th className="px-2 py-1 w-14 text-right">Margin</th>
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
                  <td className="px-2 py-1"><input value={item.product_code} onChange={(e) => updateItemText(idx, "product_code", e.target.value)} placeholder="—" className="w-full rounded bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-1"><input value={item.unit} onChange={(e) => updateItemText(idx, "unit", e.target.value)} placeholder="pcs" className="w-full rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.qty || ""} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.cost_price || ""} onChange={(e) => updateItem(idx, "cost_price", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.selling_price || ""} onChange={(e) => updateItem(idx, "selling_price", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1"><input type="number" value={item.discount || ""} onChange={(e) => updateItem(idx, "discount", Number(e.target.value))} className="w-full rounded bg-background border border-border px-2 py-1 text-xs" /></td>
                  <td className="px-2 py-1 text-right">{item.total_selling.toLocaleString()}</td>
                  <td className={`px-2 py-1 text-right ${item.margin_percent >= 20 ? "text-green-400" : item.margin_percent >= 0 ? "text-yellow-400" : "text-red-400"}`}>{item.margin_percent.toFixed(1)}%</td>
                  <td className="px-2 py-1">{items.length > 1 && <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-danger" title="ลบรายการ">✕</button>}</td>
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
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Total Cost</p><p className="font-semibold">{totalCost.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background border border-border p-3">
              <p className="text-xs text-muted">{vatMode === "inclusive" ? "ก่อน VAT" : "Subtotal"}</p>
              <p className="font-semibold">{beforeVat.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            {vatMode !== "none" && (
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-muted">VAT {vatRate}%</p>
                <p className="font-semibold text-blue-400">{vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            )}
            <div className="rounded-lg bg-accent/10 border border-accent/50 p-3">
              <p className="text-xs text-muted">Grand Total</p>
              <p className="font-bold text-accent">{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-muted">{vatModeLabel[vatMode]}</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">Gross Profit</p><p className="font-semibold text-green-400">{grossProfit.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background border border-border p-3"><p className="text-xs text-muted">GP %</p><p className="font-semibold text-green-400">{gpPercent.toFixed(1)}%</p></div>
          </div>

          <textarea placeholder="หมายเหตุ" value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-3 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y" />
          <button onClick={handleSave} disabled={saving || !custId} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกใบเสนอราคา"}</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <input placeholder="ค้นหาเลขที่ / ลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <p className="text-xs text-muted shrink-0">{filtered.length} รายการ {statusFilter !== "all" && <span className="text-accent">· {statusLabel[statusFilter]}</span>}</p>
      </div>
      {loading ? <p className="text-muted text-sm">Loading...</p> : filtered.length === 0 ? <p className="text-muted text-sm">ไม่พบใบเสนอราคา</p> : (
        <div className="space-y-2">{filtered.map((q) => (
          <div key={q.id} className="rounded-xl bg-card border border-border p-4 flex items-start justify-between hover:bg-card-hover">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-medium">{q.quotation_number}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[q.status] || "bg-gray-700"}`}>{statusLabel[q.status] || q.status}</span>
              </div>
              <p className="text-xs text-muted">{q.customer_name}{q.project_name && ` · ${q.project_name}`}</p>
              <p className="text-xs text-muted mt-0.5">
                {q.items.length} รายการ
                {q.vat_mode && q.vat_mode !== "none"
                  ? <> · Subtotal: {q.total_selling.toLocaleString()} · VAT {q.vat_rate}%: {(q.vat_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} · <b className="text-foreground">รวม: {(q.grand_total || q.total_selling).toLocaleString(undefined, { maximumFractionDigits: 0 })} THB</b></>
                  : <> · <b className="text-foreground">{q.total_selling.toLocaleString()} THB</b> (ไม่มี VAT)</>
                }
                {" · "}GP: <span className="text-green-400">{q.gp_percent.toFixed(1)}%</span>
              </p>
            </div>
            <button onClick={() => handleDelete(q.id!)} className="text-xs text-danger hover:underline shrink-0 ml-3">ลบ</button>
          </div>
        ))}</div>
      )}
    </div>
  );
}
