"use client";
import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from "recharts";
import type {
  Project, SalesActivity, PresaleRequest, ServiceTicket,
  SalesQuota, Quotation, ServiceContract, Customer, User,
} from "@/lib/types";
import { KpiCard } from "../KpiCard";
import { ChartCard } from "../ChartCard";
import { DataTable, type Column } from "../DataTable";
import { DashboardGrid } from "../DashboardGrid";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#f97316","#a3e635"];

interface ExecutiveDashboardProps {
  projects: Project[];
  sales: SalesActivity[];
  presale: PresaleRequest[];
  service: ServiceTicket[];
  quotas: SalesQuota[];
  quotations: Quotation[];
  contracts: ServiceContract[];
  customers: Customer[];
  users: User[];
  loading: boolean;
  today: string;
  thisMonth: string;
}

function fmtM(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function monthOffset(base: string, delta: number): string {
  const d = new Date(base + "-01");
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ExecutiveDashboard({
  projects, sales, presale, service, quotas, quotations, contracts, customers, users,
  loading, today, thisMonth,
}: ExecutiveDashboardProps) {

  const lastMonth     = useMemo(() => monthOffset(thisMonth, -1),  [thisMonth]);
  const lastYearMonth = useMemo(() => monthOffset(thisMonth, -12), [thisMonth]);
  const last12Months  = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => monthOffset(thisMonth, i - 11)),
    [thisMonth]
  );

  // ── Revenue & GP (from SalesQuota — source of truth for financials) ───────
  const revThis      = useMemo(() => quotas.filter(q => q.month === thisMonth).reduce((s, q) => s + (q.actual_sales || 0), 0), [quotas, thisMonth]);
  const revLast      = useMemo(() => quotas.filter(q => q.month === lastMonth).reduce((s, q) => s + (q.actual_sales || 0), 0), [quotas, lastMonth]);
  const revLastYear  = useMemo(() => quotas.filter(q => q.month === lastYearMonth).reduce((s, q) => s + (q.actual_sales || 0), 0), [quotas, lastYearMonth]);
  const gpThis       = useMemo(() => quotas.filter(q => q.month === thisMonth).reduce((s, q) => s + (q.actual_profit || 0), 0), [quotas, thisMonth]);
  const gpLast       = useMemo(() => quotas.filter(q => q.month === lastMonth).reduce((s, q) => s + (q.actual_profit || 0), 0), [quotas, lastMonth]);

  const gpPct     = revThis > 0 ? (gpThis / revThis * 100) : 0;
  const gpPctLast = revLast > 0 ? (gpLast / revLast * 100) : 0;

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const activePipeline  = useMemo(() => projects.filter(p => !["won", "lost"].includes(p.status)), [projects]);
  const pipelineTotal   = useMemo(() => activePipeline.reduce((s, p) => s + (p.value || 0), 0), [activePipeline]);

  // ── Approved quotations (= Waiting PO) ───────────────────────────────────
  const waitingPO      = useMemo(() => quotations.filter(q => q.status === "approved"), [quotations]);
  const waitingPOValue = useMemo(() => waitingPO.reduce((s, q) => s + (q.grand_total || 0), 0), [waitingPO]);

  // ── Active customers (had a sales activity in last 90 days) ──────────────
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const activeCustomerCount = useMemo(() => {
    const ids = new Set<string>();
    sales
      .filter(a => (a.plan_date || a.next_follow_up || "") >= ninetyDaysAgo)
      .forEach(a => { if (a.customer_id) ids.add(a.customer_id); });
    return ids.size;
  }, [sales, ninetyDaysAgo]);

  // ── Contracts ─────────────────────────────────────────────────────────────
  const activeContracts   = useMemo(() => contracts.filter(c => c.status === "active"), [contracts]);
  const expiringContracts = useMemo(() =>
    activeContracts.filter(c => {
      if (!c.end_date) return false;
      const days = Math.ceil((new Date(c.end_date).getTime() - new Date(today).getTime()) / 86400000);
      return days >= 0 && days <= 60;
    }),
    [activeContracts, today]
  );

  // ── SLA ───────────────────────────────────────────────────────────────────
  const svcResolved = useMemo(() => service.filter(t => ["resolved", "closed"].includes(t.status)).length, [service]);
  const svcOverdue  = useMemo(() =>
    service.filter(t =>
      t.service_date && t.service_date < today &&
      !["resolved", "closed", "cancelled"].includes(t.status)
    ),
    [service, today]
  );
  const slaOverall = service.length > 0 ? Math.round(svcResolved / service.length * 100) : 100;

  // ── 12-month Trend data ───────────────────────────────────────────────────
  const trendData = useMemo(() =>
    last12Months.map(m => {
      const mq  = quotas.filter(q => q.month === m);
      const rev = mq.reduce((s, q) => s + (q.actual_sales  || 0), 0);
      const gp  = mq.reduce((s, q) => s + (q.actual_profit || 0), 0);
      return {
        month:  m.slice(5),
        revK:   Math.round(rev / 1000),
        gpK:    Math.round(gp  / 1000),
        gpPct:  rev > 0 ? Math.round(gp / rev * 100) : 0,
        target: 20,
      };
    }),
    [last12Months, quotas]
  );

  // ── Revenue by Segment (org_type of customer) ─────────────────────────────
  const segmentData = useMemo(() => {
    const custMap = new Map(customers.map(c => [c.id, c]));
    const map: Record<string, number> = {};
    quotations.filter(q => q.status === "approved").forEach(q => {
      const seg = custMap.get(q.customer_id)?.org_type || "อื่นๆ";
      map[seg] = (map[seg] || 0) + (q.grand_total || 0);
    });
    return Object.entries(map)
      .map(([name, val], i) => ({ name, value: Math.round(val / 1000), fill: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [quotations, customers]);

  // ── Revenue by Department ─────────────────────────────────────────────────
  const deptData = useMemo(() => {
    const salesRev   = quotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
    const serviceRev = service.reduce((s, t) => s + (t.service_value || 0), 0);
    const maRev      = contracts
      .filter(c => c.type === "service_contract" && c.status === "active")
      .reduce((s, c) => s + (c.contract_value || 0), 0);
    return [
      { name: "Sales",       value: Math.round(salesRev   / 1000), fill: COLORS[0] },
      { name: "Service",     value: Math.round(serviceRev / 1000), fill: COLORS[1] },
      { name: "MA/Contract", value: Math.round(maRev      / 1000), fill: COLORS[2] },
    ].filter(d => d.value > 0);
  }, [quotas, service, contracts]);

  // ── Pipeline by Stage ─────────────────────────────────────────────────────
  const stageData = useMemo(() => [
    { name: "Lead",        fill: COLORS[0], count: 0, value: 0 },
    { name: "Opportunity", fill: COLORS[1], count: 0, value: 0 },
    { name: "Proposal",    fill: COLORS[2], count: 0, value: 0 },
    { name: "Negotiation", fill: COLORS[3], count: 0, value: 0 },
  ].map(s => {
    const filtered = activePipeline.filter(p => p.status === s.name.toLowerCase());
    return {
      ...s,
      count: filtered.length,
      value: Math.round(filtered.reduce((acc, p) => acc + (p.value || 0), 0) / 1000),
    };
  }), [activePipeline]);

  // ── 30/60/90-day Forecast (weighted by probability) ───────────────────────
  const forecastData = useMemo(() => {
    const calc = (days: number) => {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() + days);
      return activePipeline
        .filter(p => p.expected_close_date && new Date(p.expected_close_date) <= cutoff)
        .reduce((s, p) => s + (p.value || 0) * ((p.probability ?? 50) / 100), 0);
    };
    return [
      { label: "30 วัน", value: Math.round(calc(30)  / 1000), fill: COLORS[2] },
      { label: "60 วัน", value: Math.round(calc(60)  / 1000), fill: COLORS[0] },
      { label: "90 วัน", value: Math.round(calc(90)  / 1000), fill: COLORS[4] },
    ];
  }, [activePipeline, today]);

  // ── Top 10 Customers by Revenue ───────────────────────────────────────────
  const top10Customers = useMemo(() => {
    const rev: Record<string, { name: string; revenue: number; gp: number }> = {};
    quotations.filter(q => q.status === "approved").forEach(q => {
      if (!rev[q.customer_id]) rev[q.customer_id] = { name: q.customer_name, revenue: 0, gp: 0 };
      rev[q.customer_id].revenue += q.grand_total   || 0;
      rev[q.customer_id].gp     += q.gross_profit   || 0;
    });

    const lastActMap: Record<string, string> = {};
    sales.forEach(a => {
      const d = a.plan_date || a.next_follow_up || "";
      if (a.customer_id && d > (lastActMap[a.customer_id] || "")) lastActMap[a.customer_id] = d;
    });

    const contractSet = new Set(activeContracts.map(c => c.customer_id));

    return Object.entries(rev)
      .map(([id, d]) => ({
        id,
        name:        d.name,
        revenue:     d.revenue,
        gp:          d.gp,
        gpPct:       d.revenue > 0 ? Math.round(d.gp / d.revenue * 100) : 0,
        lastActivity: lastActMap[id] || "",
        hasContract: contractSet.has(id),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [quotations, sales, activeContracts]);

  // ── Team Rankings ─────────────────────────────────────────────────────────
  const salesRankings = useMemo(() => {
    const ROLES = new Set(["sale", "Sales Executive", "Sales Manager"]);
    return users
      .filter(u => u.active && ROLES.has(u.role))
      .map(u => {
        const uq  = quotas.filter(q => q.month === thisMonth && q.user_name === u.name);
        const act = uq.reduce((s, q) => s + (q.actual_sales || 0), 0);
        const tgt = uq.reduce((s, q) => s + (q.quota_target || 0), 0);
        return {
          name: u.nickname?.replace(/พี่|น้อง/g, "").trim() || u.name.split(" ")[0],
          actual: act, target: tgt,
          pct: tgt > 0 ? Math.round(act / tgt * 100) : 0,
        };
      })
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 5);
  }, [users, quotas, thisMonth]);

  const presaleRankings = useMemo(() =>
    users
      .filter(u => u.active && ["presale", "Presales Engineer", "BOQ Engineer", "Presales Manager"].includes(u.role))
      .map(u => {
        const mine    = presale.filter(r => r.assigned_to === u.name && r.status !== "cancelled");
        const overSLA = mine.filter(r => r.due_date && r.due_date < today && r.status !== "completed").length;
        return {
          name:    u.nickname?.replace(/พี่|น้อง/g, "").trim() || u.name.split(" ")[0],
          done:    mine.filter(r => r.status === "completed").length,
          total:   mine.length,
          overSLA,
        };
      })
      .sort((a, b) => b.done - a.done)
      .slice(0, 5),
    [users, presale, today]
  );

  const serviceRankings = useMemo(() =>
    users
      .filter(u => u.active && ["service", "Service Technician", "Service Manager"].includes(u.role))
      .map(u => {
        const mine    = service.filter(t => t.technician === u.name && t.status !== "cancelled");
        const overSLA = mine.filter(t => t.service_date && t.service_date < today && !["resolved", "closed"].includes(t.status)).length;
        return {
          name:     u.nickname?.replace(/พี่|น้อง/g, "").trim() || u.name.split(" ")[0],
          resolved: mine.filter(t => ["resolved", "closed"].includes(t.status)).length,
          total:    mine.length,
          overSLA,
        };
      })
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 5),
    [users, service, today]
  );

  // ── Risk Center ───────────────────────────────────────────────────────────
  type RiskLevel = "critical" | "high" | "medium";
  type RiskItem  = { id: string; level: RiskLevel; category: string; label: string; value: string };

  const risks = useMemo<RiskItem[]>(() => {
    const items: RiskItem[] = [];

    if (svcOverdue.length > 0)
      items.push({ id: "sla", level: "critical", category: "Service",    label: "SLA เกินกำหนด",                     value: `${svcOverdue.length} Tickets` });

    const lowGP = quotations.filter(q => ["sent", "follow_up", "revised"].includes(q.status) && q.gp_percent < 15 && (q.grand_total || 0) > 100_000);
    if (lowGP.length > 0)
      items.push({ id: "lgp", level: "high",     category: "Sales",      label: "GP% ต่ำกว่า 15% (ใบเสนอราคาสูง)",   value: `${lowGP.length} ใบ` });

    const delayedProj = activePipeline.filter(p => p.expected_close_date && p.expected_close_date < today && (p.value || 0) > 500_000);
    if (delayedProj.length > 0)
      items.push({ id: "dp", level: "high",      category: "Sales",      label: "Deal มูลค่าสูงผ่านวันปิดแล้ว",      value: `${delayedProj.length} Projects` });

    if (expiringContracts.length > 0)
      items.push({ id: "ec", level: "high",      category: "MA",         label: "สัญญาใกล้หมดอายุ ≤60 วัน",          value: `${expiringContracts.length} สัญญา` });

    const stalledHV = activePipeline.filter(p => {
      if ((p.value || 0) < 1_000_000 || !p.last_activity_date) return false;
      const days = Math.ceil((new Date(today).getTime() - new Date(p.last_activity_date).getTime()) / 86400000);
      return days > 30;
    });
    if (stalledHV.length > 0)
      items.push({ id: "sp", level: "medium",    category: "Sales",      label: "Pipeline มูลค่าสูงหยุดนิ่ง >30 วัน", value: `${stalledHV.length} Deals` });

    const inactiveCust = top10Customers.filter(c => {
      if (!c.lastActivity) return true;
      const days = Math.ceil((new Date(today).getTime() - new Date(c.lastActivity).getTime()) / 86400000);
      return days > 60;
    });
    if (inactiveCust.length > 0)
      items.push({ id: "ic", level: "medium",    category: "Sales",      label: "Top-10 ลูกค้าไม่มี Activity >60 วัน", value: `${inactiveCust.length} ราย` });

    const preOverdue = presale.filter(r => r.due_date && r.due_date < today && !["completed", "cancelled"].includes(r.status));
    if (preOverdue.length > 0)
      items.push({ id: "po", level: "medium",    category: "Presales",   label: "Presale เกิน SLA",                  value: `${preOverdue.length} งาน` });

    const order: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2 };
    return items.sort((a, b) => order[a.level] - order[b.level]);
  }, [svcOverdue, quotations, activePipeline, expiringContracts, top10Customers, presale, today]);

  // ── Executive Summary (rule-based) ────────────────────────────────────────
  type SummaryItem = { icon: string; text: string; type: "good" | "warn" | "bad" | "info" };
  const execSummary = useMemo<SummaryItem[]>(() => {
    const bullets: SummaryItem[] = [];

    // Revenue MoM
    if (revLast > 0) {
      const pct = ((revThis - revLast) / revLast) * 100;
      if (pct >= 0) bullets.push({ icon: "📈", type: "good", text: `รายได้เดือนนี้ ${fmtM(revThis)} ฿ เพิ่มขึ้น ${pct.toFixed(0)}% จากเดือนที่แล้ว (${fmtM(revLast)} ฿)` });
      else           bullets.push({ icon: "📉", type: "bad",  text: `รายได้เดือนนี้ ${fmtM(revThis)} ฿ ลดลง ${Math.abs(pct).toFixed(0)}% จากเดือนที่แล้ว — ต้องติดตามทีมขาย` });
    } else if (revThis > 0) {
      bullets.push({ icon: "📊", type: "info", text: `รายได้เดือนนี้ ${fmtM(revThis)} ฿` });
    }

    // YoY
    if (revLastYear > 0) {
      const yoy = ((revThis - revLastYear) / revLastYear) * 100;
      bullets.push({ icon: yoy >= 0 ? "🟢" : "🔴", type: yoy >= 0 ? "good" : "warn",
        text: `YoY: ${yoy >= 0 ? "+" : ""}${yoy.toFixed(0)}% เทียบช่วงเดียวกันปีที่แล้ว (${fmtM(revLastYear)} ฿)` });
    }

    // GP%
    if (gpPct < 15)
      bullets.push({ icon: "⚠️", type: "bad",  text: `GP% ${gpPct.toFixed(1)}% — ต่ำกว่าเกณฑ์ขั้นต่ำ 15% ควรตรวจสอบราคาและต้นทุนทันที` });
    else if (gpPct < 20)
      bullets.push({ icon: "⚠️", type: "warn", text: `GP% ${gpPct.toFixed(1)}% — ใกล้เขตอันตราย เป้าหมาย ≥20%` });
    else if (gpPct >= 25)
      bullets.push({ icon: "✅", type: "good", text: `GP% ${gpPct.toFixed(1)}% — อยู่ในเกณฑ์ดี (Last Month: ${gpPctLast.toFixed(1)}%)` });

    // Pipeline
    if (pipelineTotal > 0) {
      const negCount = stageData.find(s => s.name === "Negotiation")?.count || 0;
      bullets.push({ icon: "🎯", type: "info",
        text: `Pipeline รวม ${fmtM(pipelineTotal)} ฿ ใน ${activePipeline.length} โอกาส — ${negCount} รายอยู่ขั้น Negotiation พร้อมปิด Deal` });
    }

    // Waiting PO
    if (waitingPO.length > 0)
      bullets.push({ icon: "💰", type: "info",
        text: `${waitingPO.length} ใบเสนอราคาได้รับการอนุมัติ (รอ PO) มูลค่ารวม ${fmtM(waitingPOValue)} ฿ — ติดตามการปิด Deal` });

    // Critical risks
    const criticals = risks.filter(r => r.level === "critical");
    if (criticals.length > 0)
      bullets.push({ icon: "🆘", type: "bad",
        text: `ความเสี่ยงเร่งด่วน: ${criticals.map(r => r.label).join(" / ")}` });

    // Contracts
    if (expiringContracts.length > 0)
      bullets.push({ icon: "📋", type: "warn",
        text: `${expiringContracts.length} สัญญาใกล้หมดอายุใน 60 วัน — ติดต่อลูกค้าเพื่อต่ออายุก่อนสูญรายได้ประจำ` });

    // SLA
    if (slaOverall < 80)
      bullets.push({ icon: "🔴", type: "bad",  text: `SLA Overall ${slaOverall}% — ต่ำกว่าเป้า 80% ต้องปรับปรุงกระบวนการ Service โดยด่วน` });
    else if (slaOverall >= 95)
      bullets.push({ icon: "🏆", type: "good", text: `SLA Overall ${slaOverall}% — Service Team ทำงานได้ดีเยี่ยม` });

    return bullets;
  }, [revThis, revLast, revLastYear, gpPct, gpPctLast, pipelineTotal, activePipeline, stageData, waitingPO, waitingPOValue, risks, expiringContracts, slaOverall]);

  // ── Computed comparison values for KPI trend props ────────────────────────
  const revMoMPct  = revLast > 0     ? parseFloat(((revThis - revLast)        / revLast      * 100).toFixed(1)) : undefined;
  const gpPctDelta = gpPctLast > 0   ? parseFloat((gpPct - gpPctLast).toFixed(1))                               : undefined;

  // ── Customer table columns ────────────────────────────────────────────────
  const custColumns: Column<Record<string, unknown>>[] = [
    {
      key: "name", label: "ลูกค้า",
      render: r => <span className="font-medium text-[11px]">{String(r.name || "—")}</span>,
    },
    {
      key: "revenue", label: "Revenue", align: "right",
      render: r => <span className="text-[11px] font-semibold">{fmtM(Number(r.revenue || 0))} ฿</span>,
    },
    {
      key: "gpPct", label: "GP%", align: "center",
      render: r => {
        const gp = Number(r.gpPct || 0);
        return (
          <span className={`text-[11px] font-semibold ${gp < 15 ? "text-rose-500" : gp >= 25 ? "text-emerald-500" : "text-amber-500"}`}>
            {gp}%
          </span>
        );
      },
    },
    {
      key: "lastActivity", label: "Activity ล่าสุด", align: "center",
      render: r => {
        const d = String(r.lastActivity || "");
        if (!d) return <span className="text-[11px] text-rose-500 font-medium">ไม่มี</span>;
        const days = Math.ceil((new Date(today).getTime() - new Date(d).getTime()) / 86400000);
        return <span className={`text-[11px] ${days > 60 ? "text-rose-500 font-medium" : "text-muted"}`}>{days}d ago</span>;
      },
    },
    {
      key: "hasContract", label: "MA", align: "center",
      render: r => (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.hasContract ? "bg-emerald-500/15 text-emerald-600" : "bg-muted/20 text-muted"}`}>
          {r.hasContract ? "✓" : "—"}
        </span>
      ),
    },
  ];

  // ── Risk level styling ────────────────────────────────────────────────────
  const riskStyle: Record<RiskLevel, { border: string; badge: string }> = {
    critical: { border: "border-rose-500/40 bg-rose-500/5",   badge: "bg-rose-500  text-white" },
    high:     { border: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500 text-white" },
    medium:   { border: "border-blue-400/40 bg-blue-400/5",   badge: "bg-blue-500  text-white" },
  };

  const summaryStyle: Record<string, string> = {
    bad:  "bg-rose-500/8    border border-rose-500/20",
    warn: "bg-amber-500/8   border border-amber-500/20",
    good: "bg-emerald-500/8 border border-emerald-500/20",
    info: "bg-blue-500/8    border border-blue-500/20",
  };

  return (
    <div className="space-y-6">

      {/* ── §1 Executive KPIs ──────────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">
          Executive KPIs — {thisMonth}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            title="รายได้เดือนนี้" icon="💰"
            value={fmtM(revThis) + " ฿"}
            subtext={revLast > 0 ? `Last Month: ${fmtM(revLast)} ฿` : "—"}
            trend={revMoMPct} trendLabel="vs เดือนที่แล้ว"
            color={revMoMPct !== undefined ? (revMoMPct >= 0 ? "green" : "red") : "blue"}
            loading={loading}
          />
          <KpiCard
            title="GP เดือนนี้" icon="📊"
            value={fmtM(gpThis) + " ฿"}
            subtext={`GP% ${gpPct.toFixed(1)}%`}
            trend={gpPctDelta} trendLabel="pp vs เดือนที่แล้ว"
            color={gpPct >= 25 ? "green" : gpPct >= 15 ? "amber" : "red"}
            loading={loading}
          />
          <KpiCard
            title="GP%" icon="📈"
            value={gpPct.toFixed(1) + "%"}
            subtext={`เป้า ≥20% | Last: ${gpPctLast.toFixed(1)}%`}
            color={gpPct >= 20 ? "green" : gpPct >= 15 ? "amber" : "red"}
            loading={loading}
          />
          <KpiCard
            title="Pipeline รวม" icon="🎯"
            value={fmtM(pipelineTotal) + " ฿"}
            subtext={`${activePipeline.length} โอกาส`}
            color="purple"
            loading={loading}
          />
          <KpiCard
            title="รอ PO (Approved)" icon="⏳"
            value={String(waitingPO.length)}
            subtext={`มูลค่า ${fmtM(waitingPOValue)} ฿`}
            color={waitingPO.length > 0 ? "amber" : "blue"}
            loading={loading}
          />
          <KpiCard
            title="Active Customers" icon="👥"
            value={String(activeCustomerCount)}
            subtext="มี Activity ใน 90 วัน"
            color="cyan"
            loading={loading}
          />
          <KpiCard
            title="สัญญา MA Active" icon="📋"
            value={String(activeContracts.length)}
            subtext={expiringContracts.length > 0 ? `⚠️ ใกล้หมด ${expiringContracts.length}` : "ปกติ"}
            color={expiringContracts.length > 0 ? "amber" : "green"}
            loading={loading}
          />
          <KpiCard
            title="SLA Overall" icon="🎖️"
            value={slaOverall + "%"}
            subtext={svcOverdue.length > 0 ? `⚠️ ${svcOverdue.length} tickets เกินกำหนด` : `${svcResolved}/${service.length} ปิดแล้ว`}
            color={slaOverall >= 90 ? "green" : slaOverall >= 75 ? "amber" : "red"}
            loading={loading}
          />
        </div>
      </section>

      {/* ── §2 Business Health Charts ──────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">
          Business Health — 12 เดือนย้อนหลัง
        </p>
        <DashboardGrid cols={2} gap="md">
          <ChartCard
            title="Revenue Trend" subtitle="ยอดขายรายเดือน (K ฿)"
            height={200} loading={loading} empty={trendData.every(d => d.revK === 0)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="execRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}K ฿`, "Revenue"]} />
                <Area type="monotone" dataKey="revK" name="Revenue" stroke="#3b82f6" fill="url(#execRevGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="GP% Trend" subtitle="อัตรากำไรขั้นต้นรายเดือน"
            height={200} loading={loading} empty={trendData.every(d => d.gpPct === 0)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="%" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, n) => [`${v}%`, String(n)]} />
                <Line type="monotone" dataKey="gpPct"  name="GP%"   stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="target" name="เป้า"  stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Revenue by Segment" subtitle="แยกตามประเภทลูกค้า (K ฿)"
            height={200} loading={loading} empty={segmentData.length === 0}
          >
            <div className="flex items-center gap-3 h-full">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={segmentData} cx="50%" cy="50%" outerRadius={72} dataKey="value" paddingAngle={2}>
                    {segmentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}K ฿`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {segmentData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted flex-1 truncate">{d.name}</span>
                    <span className="text-[10px] font-semibold">{d.value}K</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title="Revenue by Department" subtitle="แยกตามทีม (K ฿)"
            height={200} loading={loading} empty={deptData.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}K ฿`, ""]} />
                <Bar dataKey="value" name="Revenue" radius={[4, 4, 0, 0]}>
                  {deptData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </DashboardGrid>
      </section>

      {/* ── §3 Forecast & Pipeline ─────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">
          Sales Forecast & Pipeline
        </p>
        <DashboardGrid cols={2} gap="md">
          <ChartCard
            title="Pipeline by Stage" subtitle="มูลค่าแต่ละขั้น (K ฿)"
            height={180} loading={loading} empty={stageData.every(d => d.value === 0)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, _, p) => [`${v}K ฿ (${(p.payload as { count: number }).count} deals)`, ""]} />
                <Bar dataKey="value" name="มูลค่า" radius={[0, 4, 4, 0]}>
                  {stageData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Revenue Forecast" subtitle="ประมาณการรายได้ Weighted (K ฿)"
            height={180} loading={loading} empty={forecastData.every(d => d.value === 0)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}K ฿`, "Forecast"]} />
                <Bar dataKey="value" name="Forecast" radius={[4, 4, 0, 0]}>
                  {forecastData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </DashboardGrid>
      </section>

      {/* ── §4 Top 10 Customers ────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">👑 Top 10 ลูกค้าสำคัญ</h3>
            <p className="text-[10px] text-muted mt-0.5">เรียงตาม Revenue (ใบเสนอราคา Approved)</p>
          </div>
        </div>
        <DataTable
          columns={custColumns}
          data={top10Customers as unknown as Record<string, unknown>[]}
          emptyTitle="ยังไม่มีใบเสนอราคา Approved"
          compact
        />
      </section>

      {/* ── §5 Team Performance Rankings ──────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">
          Team Performance Rankings
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Sales */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold mb-3">💼 Sales — เดือนนี้</h3>
            {salesRankings.length === 0
              ? <p className="text-[11px] text-muted">ไม่มีข้อมูล Sales</p>
              : (
                <div className="space-y-2">
                  {salesRankings.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                      <span className="text-[11px] flex-1 truncate">{r.name}</span>
                      <span className="text-[11px] font-semibold">{fmtM(r.actual)} ฿</span>
                      <span className={`text-[10px] font-medium w-10 text-right shrink-0 ${r.pct >= 100 ? "text-emerald-500" : r.pct >= 70 ? "text-amber-500" : "text-rose-500"}`}>
                        {r.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Presales */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold mb-3">⚙️ Presales — งานเสร็จ</h3>
            {presaleRankings.length === 0
              ? <p className="text-[11px] text-muted">ไม่มีข้อมูล Presales</p>
              : (
                <div className="space-y-2">
                  {presaleRankings.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                      <span className="text-[11px] flex-1 truncate">{r.name}</span>
                      <span className="text-[11px] font-semibold">{r.done}/{r.total}</span>
                      {r.overSLA > 0 && <span className="text-[10px] text-rose-500 shrink-0">⚠️{r.overSLA}</span>}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Service */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold mb-3">🔧 Service — งานปิด</h3>
            {serviceRankings.length === 0
              ? <p className="text-[11px] text-muted">ไม่มีข้อมูล Service</p>
              : (
                <div className="space-y-2">
                  {serviceRankings.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                      <span className="text-[11px] flex-1 truncate">{r.name}</span>
                      <span className="text-[11px] font-semibold">{r.resolved}/{r.total}</span>
                      {r.overSLA > 0 && <span className="text-[10px] text-rose-500 shrink-0">⚠️{r.overSLA}</span>}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* ── §6 Risk Center ─────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">🚨 Risk Center — เรียงตามความรุนแรง</h3>
        {risks.length === 0
          ? <div className="text-center py-5 text-muted text-sm">✅ ไม่มีความเสี่ยงเร่งด่วนในขณะนี้</div>
          : (
            <div className="space-y-2">
              {risks.map(r => (
                <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${riskStyle[r.level].border}`}>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${riskStyle[r.level].badge}`}>
                    {r.level}
                  </span>
                  <span className="text-[10px] text-muted shrink-0 w-16 truncate">{r.category}</span>
                  <span className="text-[11px] font-medium flex-1">{r.label}</span>
                  <span className="text-[11px] font-semibold text-muted shrink-0">{r.value}</span>
                </div>
              ))}
            </div>
          )}
      </section>

      {/* ── §7 Executive Summary ───────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">📝 Executive Summary</h3>
        <div className="space-y-2">
          {execSummary.length === 0
            ? <p className="text-[11px] text-muted">กำลังวิเคราะห์ข้อมูล...</p>
            : execSummary.map((b, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-[11px] leading-relaxed ${summaryStyle[b.type]}`}>
                <span className="shrink-0 text-base leading-tight">{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
        </div>
        <p className="text-[9px] text-muted/40 mt-3">สร้างอัตโนมัติจากข้อมูลปัจจุบัน — {today}</p>
      </section>

    </div>
  );
}
