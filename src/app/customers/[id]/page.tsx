"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Customer, Quotation, Project, ServiceTicket, SalesActivity, JobRequest, ServiceContract } from "@/lib/types";

const orgLabels: Record<string, string> = { government: "หน่วยงานราชการ", private: "เอกชน", education: "สถานศึกษา", hospital: "โรงพยาบาล", hotel: "โรงแรม", other: "อื่นๆ" };
const orgColor: Record<string, string> = { government: "bg-blue-900/50 text-blue-400", private: "bg-emerald-900/50 text-emerald-400", education: "bg-purple-900/50 text-purple-400", hospital: "bg-rose-900/50 text-rose-400", hotel: "bg-amber-900/50 text-amber-400", other: "bg-gray-700 text-gray-400" };

const projectStatusLabel: Record<string, string> = { lead: "Lead", opportunity: "Opportunity", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const projectStatusColor: Record<string, string> = { lead: "bg-gray-700 text-gray-300", opportunity: "bg-blue-900/50 text-blue-400", proposal: "bg-purple-900/50 text-purple-400", negotiation: "bg-yellow-900/50 text-yellow-400", won: "bg-green-900/50 text-green-400", lost: "bg-red-900/50 text-red-400" };

const quotStatusLabel: Record<string, string> = { draft: "Draft", sent: "ส่งแล้ว", approved: "อนุมัติ", rejected: "ปฏิเสธ", expired: "หมดอายุ" };
const quotStatusColor: Record<string, string> = { draft: "bg-gray-700 text-gray-300", sent: "bg-blue-900/50 text-blue-400", approved: "bg-green-900/50 text-green-400", rejected: "bg-red-900/50 text-red-400", expired: "bg-yellow-900/50 text-yellow-400" };

const svcTypeLabels: Record<string, string> = { installation: "Installation", site_survey: "Site Survey", technical_survey: "Technical Survey", after_sales: "After-Sales", repair: "Repair", pm_service: "PM Service" };
const svcStatusLabel: Record<string, string> = { open: "เปิดใหม่", in_progress: "กำลังทำ", resolved: "แก้ไขแล้ว", closed: "ปิดงาน" };
const svcStatusColor: Record<string, string> = { open: "bg-red-900/50 text-red-400", in_progress: "bg-yellow-900/50 text-yellow-400", resolved: "bg-green-900/50 text-green-400", closed: "bg-gray-700 text-gray-300" };

const actTypeLabels: Record<string, string> = { phone_call: "📞 โทร", visit: "🚶 เยี่ยม", quotation_created: "📄 สร้าง QT", quotation_sent: "✉️ ส่ง QT", follow_up: "🔔 ตามงาน", meeting: "📅 ประชุม", customer_update: "✏️ อัปเดต" };

const contractTypeMeta: Record<string, { label: string; icon: string; color: string }> = {
  product_warranty:      { label: "รับประกันสินค้า",     icon: "🛡️", color: "bg-blue-900/50 text-blue-400" },
  installation_warranty: { label: "รับประกันงานติดตั้ง", icon: "🔧", color: "bg-purple-900/50 text-purple-400" },
  service_contract:      { label: "สัญญา MA",            icon: "📋", color: "bg-green-900/50 text-green-400" },
};
const contractStatusColor: Record<string, string> = {
  active: "bg-green-900/50 text-green-400",
  pending: "bg-yellow-900/50 text-yellow-400",
  expired: "bg-red-900/50 text-red-400",
  cancelled: "bg-gray-700 text-gray-400",
};
function daysUntil(date?: string): number | null {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  if (isNaN(target.getTime())) return null;
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

type Tab = "overview" | "quotations" | "projects" | "service" | "contracts" | "activities";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const c = await fs.customers.get(id);
      if (!c) { setNotFound(true); return; }
      setCustomer(c);
      const customerName = c.company_name || "";
      const isMine = (x: { customer_id?: string; customer_name?: string }) =>
        x.customer_id === id || (customerName && x.customer_name === customerName);
      const [q, p, s, a, jr, ct] = await Promise.all([
        fs.quotations.list(),
        fs.projects.list(),
        fs.serviceTickets.list(),
        fs.salesActivities.list(),
        fs.jobRequests.list(),
        fs.serviceContracts.list(),
      ]);
      setQuotations(q.filter(isMine));
      setProjects(p.filter(isMine));
      setServiceTickets(s.filter(isMine));
      setActivities(a.filter(isMine));
      setJobRequests(jr.filter(isMine));
      setContracts(ct.filter(isMine));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // === CONTRACT METRICS ===
  const contractStats = useMemo(() => {
    const enriched = contracts.map(c => {
      const days = daysUntil(c.end_date);
      const isExpired = days !== null && days < 0 && c.status === "active";
      return { c, days, effectiveStatus: (isExpired ? "expired" : c.status) };
    });
    const active = enriched.filter(x => x.effectiveStatus === "active");
    const expiringSoon = active.filter(x => x.days !== null && x.days <= 30);
    const expired = enriched.filter(x => x.effectiveStatus === "expired");
    const totalValue = active.reduce((s, x) => s + (x.c.contract_value || 0), 0);
    const hasMA = active.some(x => x.c.type === "service_contract");
    const hasInstallWarranty = active.some(x => x.c.type === "installation_warranty");
    const hasProductWarranty = active.some(x => x.c.type === "product_warranty");
    return { enriched, active, expiringSoon, expired, totalValue, hasMA, hasInstallWarranty, hasProductWarranty };
  }, [contracts]);

  // === SUMMARY METRICS ===
  const stats = useMemo(() => {
    const valueOf = (q: Quotation) => q.grand_total || q.total_selling || 0;
    const approvedQuots = quotations.filter(q => q.status === "approved");
    const purchaseValue = approvedQuots.reduce((s, q) => s + valueOf(q), 0);
    const purchaseProfit = approvedQuots.reduce((s, q) => s + (q.gross_profit || 0), 0);
    const wonProjects = projects.filter(p => p.status === "won");
    const projectValue = wonProjects.reduce((s, p) => s + (p.value || 0), 0);
    const activeProjects = projects.filter(p => !["won", "lost"].includes(p.status));
    const activeProjectValue = activeProjects.reduce((s, p) => s + (p.value || 0), 0);
    const svcRevenue = serviceTickets.reduce((s, t) => s + (t.service_value || 0), 0);
    const svcProfit = serviceTickets.reduce((s, t) => s + (t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0))), 0);
    const openSvc = serviceTickets.filter(t => t.status === "open" || t.status === "in_progress").length;
    const pmSvc = serviceTickets.filter(t => t.type === "pm_service").length;

    // Last interaction (most recent activity / quotation / service ticket)
    const datesAll: string[] = [];
    activities.forEach(a => { if (a.next_follow_up) datesAll.push(a.next_follow_up); });
    serviceTickets.forEach(t => { if (t.service_date) datesAll.push(t.service_date); });
    const lastInteraction = datesAll.length > 0 ? datesAll.sort().reverse()[0] : null;

    return {
      purchaseValue, purchaseProfit, approvedQuots: approvedQuots.length,
      projectValue, activeProjectValue, wonCount: wonProjects.length, activeCount: activeProjects.length,
      svcRevenue, svcProfit, totalSvc: serviceTickets.length, openSvc, pmSvc,
      activities: activities.length, lastInteraction,
      gpFromSvc: svcRevenue > 0 ? (svcProfit / svcRevenue * 100) : 0,
      gpFromQT: purchaseValue > 0 ? (purchaseProfit / purchaseValue * 100) : 0,
    };
  }, [quotations, projects, serviceTickets, activities]);

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;
  if (loading) return <div className="p-6"><p className="text-muted">Loading customer history...</p></div>;
  if (notFound) return (
    <div className="p-6">
      <p className="text-muted text-sm mb-2">ไม่พบลูกค้า ID นี้</p>
      <Link href="/customers" className="text-accent hover:underline text-sm">← กลับไปหน้าลูกค้า</Link>
    </div>
  );
  if (!customer) return null;

  const totalLifetimeValue = stats.purchaseValue + stats.svcRevenue;
  const totalLifetimeProfit = stats.purchaseProfit + stats.svcProfit;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-muted hover:text-accent">← กลับไปหน้าลูกค้า</Link>
      </div>

      <div className="rounded-xl bg-card border border-border p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{customer.company_name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${orgColor[customer.org_type] || "bg-gray-700"}`}>{orgLabels[customer.org_type] || customer.org_type}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted mt-2">
              {customer.contact_name && <p>👤 {customer.contact_name}</p>}
              {customer.phone && <p>📞 {customer.phone}</p>}
              {customer.email && <p>✉️ {customer.email}</p>}
              {customer.province && <p>📍 {customer.province}</p>}
              {customer.address && <p className="lg:col-span-3">🏠 {customer.address}</p>}
            </div>
            {customer.notes && <p className="text-xs text-muted mt-2 italic">📝 {customer.notes}</p>}

            {/* Coverage badges */}
            {(contractStats.hasProductWarranty || contractStats.hasInstallWarranty || contractStats.hasMA || contractStats.expiringSoon.length > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-muted">Coverage:</span>
                {contractStats.hasProductWarranty && <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-[10px] text-blue-400" title="มีรับประกันสินค้า">🛡️ Product</span>}
                {contractStats.hasInstallWarranty && <span className="rounded-full bg-purple-900/50 px-2 py-0.5 text-[10px] text-purple-400" title="มีรับประกันงานติดตั้ง">🔧 Install</span>}
                {contractStats.hasMA && <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] text-green-400" title="มีสัญญา MA">📋 MA</span>}
                {contractStats.expiringSoon.length > 0 && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400" title="สัญญาใกล้หมดอายุ ≤30 วัน">⚠ Renewal {contractStats.expiringSoon.length}</span>}
              </div>
            )}
          </div>
          <Link href={`/customers?edit=${customer.id}`} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-card-hover">แก้ไขข้อมูล</Link>
        </div>
      </div>

      {/* Lifetime metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted uppercase">💰 Lifetime Value</p>
          <p className="text-[10px] text-muted">มูลค่ารวมทั้งหมด</p>
          <p className="text-xl font-bold text-green-400 mt-1">{(totalLifetimeValue / 1000).toLocaleString()}K</p>
          <p className="text-[10px] text-muted">THB · QT + Service</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted uppercase">💎 กำไรรวม</p>
          <p className="text-[10px] text-muted">Gross Profit สะสม</p>
          <p className="text-xl font-bold text-purple-400 mt-1">{(totalLifetimeProfit / 1000).toLocaleString()}K</p>
          <p className="text-[10px] text-muted">{totalLifetimeValue > 0 ? `${(totalLifetimeProfit / totalLifetimeValue * 100).toFixed(1)}% GP` : "—"}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted uppercase">📊 ดีล / โปรเจค</p>
          <p className="text-[10px] text-muted">won / active</p>
          <p className="text-xl font-bold mt-1"><span className="text-green-400">{stats.wonCount}</span> <span className="text-muted text-base">/</span> <span className="text-blue-400">{stats.activeCount}</span></p>
          <p className="text-[10px] text-muted">{(stats.projectValue / 1000).toFixed(0)}K won · {(stats.activeProjectValue / 1000).toFixed(0)}K pipeline</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted uppercase">🔧 งานบริการ</p>
          <p className="text-[10px] text-muted">total / open</p>
          <p className="text-xl font-bold mt-1"><span>{stats.totalSvc}</span> <span className="text-muted text-base">/</span> <span className={stats.openSvc > 0 ? "text-amber-400" : "text-green-400"}>{stats.openSvc}</span></p>
          <p className="text-[10px] text-muted">PM {stats.pmSvc} · ครั้งล่าสุด {stats.lastInteraction || "—"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {(["overview", "quotations", "projects", "service", "contracts", "activities"] as const).map(t => {
          const labels: Record<Tab, string> = { overview: "ภาพรวม", quotations: `ใบเสนอราคา (${quotations.length})`, projects: `ดีล / โปรเจค (${projects.length})`, service: `บริการ (${serviceTickets.length})`, contracts: `🛡️ สัญญา/รับประกัน (${contracts.length})`, activities: `กิจกรรม (${activities.length})` };
          const isContractsWithAlert = t === "contracts" && contractStats.expiringSoon.length > 0;
          return (
            <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
              {labels[t]}
              {isContractsWithAlert && <span className="rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold">{contractStats.expiringSoon.length}</span>}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Recent items from each category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Recent quotations */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">💰 ใบเสนอราคาล่าสุด</h3>
                {quotations.length > 0 && <button onClick={() => setTab("quotations")} className="text-[10px] text-accent hover:underline">ดูทั้งหมด →</button>}
              </div>
              {quotations.length === 0 ? <p className="text-xs text-muted">ยังไม่มีใบเสนอราคา</p> : (
                <div className="space-y-1.5">
                  {quotations.slice(0, 5).map(q => (
                    <div key={q.id} className="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
                      <span className="font-mono text-muted shrink-0">{q.quotation_number}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${quotStatusColor[q.status]}`}>{quotStatusLabel[q.status]}</span>
                      <span className="flex-1 truncate text-muted">{q.project_name || "-"}</span>
                      <span className="font-semibold text-right shrink-0">{((q.grand_total || q.total_selling || 0) / 1000).toLocaleString()}K</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent service tickets */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">🔧 งานบริการล่าสุด</h3>
                {serviceTickets.length > 0 && <button onClick={() => setTab("service")} className="text-[10px] text-accent hover:underline">ดูทั้งหมด →</button>}
              </div>
              {serviceTickets.length === 0 ? <p className="text-xs text-muted">ยังไม่มีงานบริการ</p> : (
                <div className="space-y-1.5">
                  {serviceTickets.slice(0, 5).map(t => (
                    <div key={t.id} className="text-xs py-1 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium shrink-0">{svcTypeLabels[t.type]}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${svcStatusColor[t.status]}`}>{svcStatusLabel[t.status]}</span>
                        <span className="flex-1 truncate text-muted">{t.issue}</span>
                        {t.service_date && <span className="text-muted shrink-0">{t.service_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active projects */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">📁 ดีล/โปรเจคล่าสุด</h3>
                {projects.length > 0 && <button onClick={() => setTab("projects")} className="text-[10px] text-accent hover:underline">ดูทั้งหมด →</button>}
              </div>
              {projects.length === 0 ? <p className="text-xs text-muted">ยังไม่มีโปรเจค</p> : (
                <div className="space-y-1.5">
                  {projects.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${projectStatusColor[p.status]}`}>{projectStatusLabel[p.status]}</span>
                      <span className="flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-muted text-right shrink-0">{((p.value || 0) / 1000).toLocaleString()}K</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activities */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">📞 กิจกรรมล่าสุด</h3>
                {activities.length > 0 && <button onClick={() => setTab("activities")} className="text-[10px] text-accent hover:underline">ดูทั้งหมด →</button>}
              </div>
              {activities.length === 0 ? <p className="text-xs text-muted">ยังไม่มีกิจกรรม</p> : (
                <div className="space-y-1.5">
                  {activities.slice(0, 5).map(a => (
                    <div key={a.id} className="text-xs py-1 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{actTypeLabels[a.type] || a.type}</span>
                        <span className="flex-1 truncate text-muted">{a.description}</span>
                        {a.next_follow_up && <span className="text-muted shrink-0">{a.next_follow_up}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUOTATIONS */}
      {tab === "quotations" && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {quotations.length === 0 ? <p className="text-muted text-sm p-4">ยังไม่มีใบเสนอราคา</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th className="px-4 py-2.5">เลขที่</th>
                <th className="px-4 py-2.5">โปรเจค</th>
                <th className="px-4 py-2.5 text-right">รายการ</th>
                <th className="px-4 py-2.5 text-right">มูลค่ารวม (incl VAT)</th>
                <th className="px-4 py-2.5 text-right">GP%</th>
                <th className="px-4 py-2.5">สถานะ</th>
              </tr></thead>
              <tbody>{quotations.map(q => (
                <tr key={q.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5 font-mono text-xs">{q.quotation_number}</td>
                  <td className="px-4 py-2.5 text-muted">{q.project_name || "-"}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{q.items.length}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{(q.grand_total || q.total_selling || 0).toLocaleString()}</td>
                  <td className={`px-4 py-2.5 text-right ${q.gp_percent >= 20 ? "text-green-400" : q.gp_percent >= 10 ? "text-yellow-400" : "text-red-400"}`}>{(q.gp_percent || 0).toFixed(1)}%</td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${quotStatusColor[q.status]}`}>{quotStatusLabel[q.status]}</span></td>
                </tr>
              ))}</tbody>
              {quotations.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-background/50 font-semibold text-xs">
                    <td className="px-4 py-2.5" colSpan={3}>รวมทั้งหมด ({quotations.length} ใบ)</td>
                    <td className="px-4 py-2.5 text-right text-green-400">
                      {quotations.reduce((s, q) => s + (q.grand_total || q.total_selling || 0), 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-purple-400" title="กำไรเฉลี่ย">
                      {(quotations.reduce((s, q) => s + (q.gp_percent || 0), 0) / quotations.length).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-muted">อนุมัติ {stats.approvedQuots}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}

      {/* PROJECTS */}
      {tab === "projects" && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {projects.length === 0 ? <p className="text-muted text-sm p-4">ยังไม่มีโปรเจค</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th className="px-4 py-2.5">ชื่อโปรเจค</th>
                <th className="px-4 py-2.5">ประเภท</th>
                <th className="px-4 py-2.5">ผู้รับผิดชอบ</th>
                <th className="px-4 py-2.5 text-right">มูลค่า</th>
                <th className="px-4 py-2.5">สถานะ</th>
                <th className="px-4 py-2.5">หมายเหตุ</th>
              </tr></thead>
              <tbody>{projects.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted">{p.type || "-"}</td>
                  <td className="px-4 py-2.5 text-muted">{p.assigned_to || "-"}</td>
                  <td className="px-4 py-2.5 text-right">{(p.value || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${projectStatusColor[p.status]}`}>{projectStatusLabel[p.status]}</span></td>
                  <td className="px-4 py-2.5 text-muted text-xs">
                    {p.win_loss_reason && <p>{p.status === "won" ? "✓" : "✗"} {p.win_loss_reason.slice(0, 50)}</p>}
                    {p.lost_competitor && <p className="text-red-400">→ {p.lost_competitor}</p>}
                  </td>
                </tr>
              ))}</tbody>
              {projects.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-background/50 font-semibold text-xs">
                    <td className="px-4 py-2.5" colSpan={3}>รวมทั้งหมด ({projects.length} ดีล)</td>
                    <td className="px-4 py-2.5 text-right text-green-400">{stats.projectValue.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[10px] text-muted">won {stats.wonCount}</td>
                    <td className="px-4 py-2.5 text-[10px] text-muted">active {stats.activeCount}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}

      {/* SERVICE */}
      {tab === "service" && (
        <div className="space-y-3">
          {serviceTickets.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted text-sm">ยังไม่มีประวัติงานบริการ</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">รวมรายได้บริการ</p>
                  <p className="text-base font-bold text-purple-400">{stats.svcRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">กำไรจากบริการ</p>
                  <p className="text-base font-bold text-green-400">{stats.svcProfit.toLocaleString()}</p>
                  <p className="text-[10px] text-muted">{stats.gpFromSvc.toFixed(1)}% GP</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">งาน PM</p>
                  <p className="text-base font-bold text-amber-400">{stats.pmSvc}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">งาน Active (ค้างอยู่)</p>
                  <p className={`text-base font-bold ${stats.openSvc > 0 ? "text-red-400" : "text-green-400"}`}>{stats.openSvc}</p>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                    <th className="px-4 py-2.5">วันที่</th>
                    <th className="px-4 py-2.5">ประเภท</th>
                    <th className="px-4 py-2.5">ปัญหา / รายละเอียด</th>
                    <th className="px-4 py-2.5">ช่าง</th>
                    <th className="px-4 py-2.5 text-right">รายได้</th>
                    <th className="px-4 py-2.5 text-right">กำไร</th>
                    <th className="px-4 py-2.5">สถานะ</th>
                  </tr></thead>
                  <tbody>{serviceTickets.map(t => {
                    const profit = t.gross_profit || ((t.service_value || 0) - (t.service_cost || 0));
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{t.service_date || "-"}</td>
                        <td className="px-4 py-2.5">{svcTypeLabels[t.type]}</td>
                        <td className="px-4 py-2.5 text-muted text-xs">{t.issue}</td>
                        <td className="px-4 py-2.5 text-muted">{t.technician || "-"}</td>
                        <td className="px-4 py-2.5 text-right text-purple-400">{(t.service_value || 0).toLocaleString()}</td>
                        <td className={`px-4 py-2.5 text-right ${profit > 0 ? "text-green-400" : profit < 0 ? "text-red-400" : "text-muted"}`}>{profit ? profit.toLocaleString() : "-"}</td>
                        <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${svcStatusColor[t.status]}`}>{svcStatusLabel[t.status]}</span></td>
                      </tr>
                    );
                  })}</tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-background/50 font-semibold text-xs">
                      <td className="px-4 py-2.5" colSpan={4}>รวมทั้งหมด ({serviceTickets.length} ครั้ง)</td>
                      <td className="px-4 py-2.5 text-right text-purple-400">{stats.svcRevenue.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-green-400">{stats.svcProfit.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* CONTRACTS */}
      {tab === "contracts" && (
        <div className="space-y-3">
          {contracts.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted text-sm mb-2">ยังไม่มีสัญญา / รับประกันสำหรับลูกค้านี้</p>
              <Link href="/contracts" className="text-xs text-accent hover:underline">+ ไปเพิ่มสัญญาใหม่ที่หน้า Contracts</Link>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">Active</p>
                  <p className="text-base font-bold text-green-400">{contractStats.active.length}</p>
                </div>
                <div className="rounded-lg bg-card border border-red-800/50 bg-red-900/10 p-3">
                  <p className="text-[10px] text-muted">ใกล้หมด ≤30 วัน</p>
                  <p className="text-base font-bold text-red-400">{contractStats.expiringSoon.length}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">หมดอายุแล้ว</p>
                  <p className="text-base font-bold text-gray-400">{contractStats.expired.length}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted">มูลค่ารวม Active</p>
                  <p className="text-base font-bold">{contractStats.totalValue.toLocaleString()}</p>
                  <p className="text-[10px] text-muted">THB</p>
                </div>
              </div>

              {/* Renewal alert for this customer */}
              {contractStats.expiringSoon.length > 0 && (
                <div className="rounded-xl bg-red-900/10 border border-red-800/50 p-3">
                  <p className="text-xs font-semibold text-red-400 mb-2">⚠ Renewal Action — สัญญาใกล้หมดอายุ</p>
                  <div className="space-y-1">
                    {contractStats.expiringSoon.map(({ c, days }) => {
                      const meta = contractTypeMeta[c.type];
                      return (
                        <div key={c.id} className="flex items-center gap-2 text-xs py-1 border-b border-red-800/30 last:border-0">
                          <span>{meta.icon}</span>
                          <span className="font-medium flex-1 truncate">{c.title}</span>
                          <span className="text-muted">หมด {c.end_date}</span>
                          <span className={`font-bold ${days! <= 7 ? "text-red-400" : "text-amber-400"}`}>เหลือ {days}d</span>
                          {c.contract_value ? <span className="text-green-400 w-16 text-right">{c.contract_value.toLocaleString()}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full table */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                    <th className="px-4 py-2.5">ประเภท</th>
                    <th className="px-4 py-2.5">หัวข้อ</th>
                    <th className="px-4 py-2.5">เริ่ม → สิ้นสุด</th>
                    <th className="px-4 py-2.5 text-center">วันคงเหลือ</th>
                    <th className="px-4 py-2.5 text-right">มูลค่า</th>
                    <th className="px-4 py-2.5">สถานะ</th>
                  </tr></thead>
                  <tbody>{contractStats.enriched.sort((a, b) => (a.c.end_date || "9999").localeCompare(b.c.end_date || "9999")).map(({ c, days, effectiveStatus }) => {
                    const meta = contractTypeMeta[c.type];
                    const dayColor = days === null ? "text-muted" : days < 0 ? "text-red-500 font-bold" : days <= 30 ? "text-red-400 font-semibold" : days <= 60 ? "text-amber-400" : days <= 90 ? "text-yellow-400" : "text-muted";
                    return (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                        <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.icon} {meta.label}</span></td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{c.title}</p>
                          {c.type === "service_contract" && (
                            <p className="text-[10px] text-muted">{c.service_level}{c.visits_per_year ? ` · PM ${c.visits_per_year}/ปี` : ""}{c.response_time_hours ? ` · Response ${c.response_time_hours}h` : ""}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted text-xs whitespace-nowrap">
                          <p>{c.start_date || "-"}</p>
                          <p>→ {c.end_date || "-"}</p>
                        </td>
                        <td className={`px-4 py-2.5 text-center text-xs ${dayColor}`}>
                          {days === null ? "—" : days < 0 ? `เลย ${Math.abs(days)}d` : `${days}d`}
                        </td>
                        <td className="px-4 py-2.5 text-right">{c.contract_value ? c.contract_value.toLocaleString() : "-"}</td>
                        <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${contractStatusColor[effectiveStatus]}`}>{effectiveStatus}</span></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div className="text-center">
                <Link href="/contracts" className="text-xs text-accent hover:underline">→ จัดการสัญญาทั้งหมด ที่หน้า Contracts</Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ACTIVITIES */}
      {tab === "activities" && (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted text-sm">ยังไม่มีกิจกรรมการขาย</p>
            </div>
          ) : (
            <>
              {jobRequests.length > 0 && (
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-xs font-semibold text-muted mb-2">📤 Job Requests ที่เกี่ยวข้อง ({jobRequests.length})</p>
                  <div className="space-y-1.5">
                    {jobRequests.slice(0, 5).map(r => (
                      <div key={r.id} className="text-xs py-1 border-b border-border last:border-0 flex items-center gap-2">
                        <span className="font-medium flex-1 truncate">{r.title}</span>
                        <span className="text-muted">→ {r.request_to_team}</span>
                        <span className="rounded-full bg-card-hover px-1.5 py-0.5 text-[10px]">{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
                    <th className="px-4 py-2.5">ประเภท</th>
                    <th className="px-4 py-2.5">รายละเอียด</th>
                    <th className="px-4 py-2.5">โปรเจค</th>
                    <th className="px-4 py-2.5">ผู้รับผิดชอบ</th>
                    <th className="px-4 py-2.5">ติดตามถัดไป</th>
                    <th className="px-4 py-2.5">สถานะ</th>
                  </tr></thead>
                  <tbody>{activities.map(a => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                      <td className="px-4 py-2.5">{actTypeLabels[a.type] || a.type}</td>
                      <td className="px-4 py-2.5 text-muted">{a.description}</td>
                      <td className="px-4 py-2.5 text-muted">{a.project_name || "-"}</td>
                      <td className="px-4 py-2.5 text-muted">{a.assigned_to || "-"}</td>
                      <td className="px-4 py-2.5 text-muted">{a.next_follow_up || "-"}</td>
                      <td className="px-4 py-2.5"><span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px]">{a.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
