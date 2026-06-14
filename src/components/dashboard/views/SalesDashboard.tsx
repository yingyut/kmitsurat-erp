"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { Project, SalesActivity, SalesQuota, Quotation, Customer, User } from "@/lib/types";
import { KpiCard } from "../KpiCard";
import { ChartCard } from "../ChartCard";
import { DataTable, type Column } from "../DataTable";
import { AlertPanel, type AlertItem } from "../AlertPanel";
import { DashboardGrid } from "../DashboardGrid";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#f97316"];
const STAGE_LABEL: Record<string, string> = {
  lead: "Lead", opportunity: "Opportunity", proposal: "Proposal",
  negotiation: "Negotiation", won: "Won", lost: "Lost",
};
const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
function fmtM(v: number) { return v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${Math.round(v/1000)}K` : "—"; }

interface SalesDashboardProps {
  projects: Project[];
  sales: SalesActivity[];
  quotas: SalesQuota[];
  quotations: Quotation[];
  customers: Customer[];
  users: User[];
  loading: boolean;
  today: string;
  thisMonth: string;
  myName: string;
  isManager: boolean;
}

export function SalesDashboard({
  projects, sales, quotas, quotations, customers, loading, today, thisMonth, myName, isManager,
}: SalesDashboardProps) {

  // ── Filter by current user (if not manager) ────────────────────────────────
  const myProjects = useMemo(() =>
    isManager ? projects : projects.filter(p => p.assigned_to === myName),
    [projects, isManager, myName]
  );
  const myQuotas = useMemo(() =>
    isManager ? quotas : quotas.filter(q => q.user_name === myName),
    [quotas, isManager, myName]
  );
  const myQuotations = useMemo(() =>
    isManager ? quotations : quotations.filter(q => q.salesperson === myName || q.created_by === myName),
    [quotations, isManager, myName]
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const mQuotas = myQuotas.filter(q => q.month === thisMonth);
    const revenue = mQuotas.reduce((s, q) => s + (q.actual_sales || 0), 0);
    const target  = mQuotas.reduce((s, q) => s + (q.quota_target || 0), 0);
    const pct     = target > 0 ? (revenue / target) * 100 : 0;

    const PIPE_ST = new Set(["lead","opportunity","proposal","negotiation"]);
    const pipeline = myProjects.filter(p => PIPE_ST.has(p.status)).reduce((s, p) => s + (p.value || 0), 0);
    const waitPO   = myQuotations.filter(q => q.status === "approved" && !q.po_received).length;

    const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
    const d30s = d30.toISOString().slice(0, 10);
    const newCust = isManager
      ? customers.filter(c => ((c as unknown as { created_at?: string }).created_at ?? "") >= d30s).length
      : 0;

    return { revenue, target, pct, pipeline, waitPO, newCust };
  }, [myQuotas, myProjects, myQuotations, customers, today, thisMonth, isManager]);

  // ── Sales vs Target (6 months) ─────────────────────────────────────────────
  const trendData = useMemo(() => {
    const now = new Date(thisMonth + "-01");
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mq = myQuotas.filter(q => q.month === mon);
      return {
        month: THAI_MONTHS[d.getMonth()],
        actual: mq.reduce((s, q) => s + (q.actual_sales || 0), 0),
        target: mq.reduce((s, q) => s + (q.quota_target || 0), 0),
      };
    });
  }, [myQuotas, thisMonth]);

  // ── Pipeline by Stage ─────────────────────────────────────────────────────
  const stageData = useMemo(() => {
    const STAGES = ["lead","opportunity","proposal","negotiation"];
    const map: Record<string, number> = {};
    myProjects.filter(p => STAGES.includes(p.status)).forEach(p => {
      map[p.status] = (map[p.status] || 0) + (p.value || 0);
    });
    return STAGES.filter(s => map[s]).map(s => ({ name: STAGE_LABEL[s], value: map[s] }));
  }, [myProjects]);

  // ── Customer Segment ───────────────────────────────────────────────────────
  const segData = useMemo(() => {
    const custIds = new Set(myProjects.map(p => p.customer_id).filter(Boolean));
    const myCusts = customers.filter(c => custIds.has(c.id ?? ""));
    const map: Record<string, number> = {};
    myCusts.forEach(c => {
      const t = c.org_type || c.org_sector || "อื่นๆ";
      map[t] = (map[t] || 0) + 1;
    });
    const arr = Object.entries(map).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
    return arr.sort((a, b) => b.value - a.value).slice(0, 6);
  }, [myProjects, customers]);

  // ── Top Opportunities ──────────────────────────────────────────────────────
  const topOpp = useMemo(() =>
    [...myProjects]
      .filter(p => !["won","lost"].includes(p.status))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 8),
    [myProjects]
  );

  // ── Follow Up Required ─────────────────────────────────────────────────────
  const followUp = useMemo(() => {
    const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
    const d7s = d7.toISOString().slice(0, 10);
    return myQuotations
      .filter(q => ["sent","follow_up"].includes(q.status) && (q.follow_up_date || q.sent_date || "") < d7s)
      .sort((a, b) => (a.sent_date || "").localeCompare(b.sent_date || ""))
      .slice(0, 10);
  }, [myQuotations, today]);

  // ── Recent Activities ──────────────────────────────────────────────────────
  const recentActs = useMemo(() => {
    const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
    const d30s = d30.toISOString().slice(0, 10);
    const myActs = isManager ? sales : sales.filter(a => a.assigned_to === myName);
    return [...myActs]
      .filter(a => (a.plan_date || a.next_follow_up || "") >= d30s)
      .sort((a, b) => (b.plan_date || b.next_follow_up || "").localeCompare(a.plan_date || a.next_follow_up || ""))
      .slice(0, 15);
  }, [sales, today, myName, isManager]);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo<AlertItem[]>(() => {
    const d7 = new Date(today); d7.setDate(d7.getDate() - 7); const d7s = d7.toISOString().slice(0,10);
    const d30 = new Date(today); d30.setDate(d30.getDate() + 30); const d30s = d30.toISOString().slice(0,10);
    const stale   = myQuotations.filter(q => ["sent","follow_up"].includes(q.status) && (q.follow_up_date||q.sent_date||"") < d7s).length;
    const waitPO  = myQuotations.filter(q => q.status === "approved" && !q.po_received).length;
    const expiring = myQuotations.filter(q => ["sent","follow_up","revised"].includes(q.status) && (q.sent_date||"") < d7s).length;
    const inactive = myProjects.filter(p => !["won","lost"].includes(p.status) && p.expected_close_date && p.expected_close_date < today).length;
    return [
      { level: stale > 5 ? "red" : "yellow",    icon: "📋", label: "QT ค้าง > 7 วัน", count: stale,    href: "/quotations" },
      { level: waitPO > 0 ? "yellow" : "green",  icon: "⏳", label: "รอ PO",            count: waitPO,   href: "/quotations" },
      { level: expiring > 3 ? "red" : "yellow",  icon: "⚠️", label: "QT ใกล้หมดอายุ",  count: expiring, href: "/quotations" },
      { level: inactive > 0 ? "yellow" : "green",icon: "🏢", label: "Deal เกิน Close",  count: inactive, href: "/projects" },
    ];
  }, [myQuotations, myProjects, today]);

  const typeLabel: Record<string, string> = {
    phone_call: "โทรศัพท์", visit: "เยี่ยมลูกค้า", quotation_created: "สร้าง QT",
    quotation_sent: "ส่ง QT", follow_up: "Follow Up", meeting: "ประชุม", customer_update: "อัปเดต",
  };
  const typeIcon: Record<string, string> = {
    phone_call:"📞", visit:"🚗", quotation_created:"📄", quotation_sent:"📨", follow_up:"🔔", meeting:"🤝", customer_update:"✏️",
  };

  const oppCols: Column<Record<string,unknown>>[] = [
    { key: "customer_name", label: "ลูกค้า",   render: r => <span className="font-medium">{String(r.customer_name||"—")}</span> },
    { key: "name",          label: "โปรเจค",   className: "text-muted max-w-[140px] truncate" },
    { key: "value",         label: "มูลค่า",   align: "right",
      render: r => <span className="font-semibold text-emerald-500">{fmtM(Number(r.value||0))}</span> },
    { key: "status",        label: "Stage",    align: "center",
      render: r => <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500">{STAGE_LABEL[String(r.status)]||String(r.status)}</span> },
    { key: "probability",   label: "%",        align: "right",
      render: r => {
        const p = Number(r.probability||0);
        return <span className={p>=70?"text-emerald-500":p>=40?"text-amber-500":"text-muted"}>{p}%</span>;
      }},
    { key: "expected_close_date", label: "Close", align: "center",
      render: r => <span className="text-muted">{String(r.expected_close_date||"—").slice(5)||"—"}</span> },
  ];

  const followCols: Column<Record<string,unknown>>[] = [
    { key: "quotation_number", label: "เลข QT", width: "w-24" },
    { key: "customer_name",    label: "ลูกค้า" },
    { key: "grand_total",      label: "มูลค่า", align: "right",
      render: r => <span className="font-medium text-emerald-500">{fmtM(Number(r.grand_total||0))}</span> },
    { key: "sent_date",        label: "ส่งเมื่อ", align: "center",
      render: r => <span className="text-muted">{String(r.sent_date||"—").slice(5)||"—"}</span> },
    { key: "status",           label: "Status",  align: "center",
      render: r => <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500">{String(r.status)}</span> },
  ];

  return (
    <div className="space-y-4">

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={3} gap="md">
        <KpiCard title="รายได้เดือนนี้" icon="💰" value={fmtM(kpis.revenue)}
          subtext={`${kpis.pct.toFixed(0)}% ของเป้า`}
          color="green" href="/reports" loading={loading}
          progress={{ current: kpis.revenue, target: Math.max(1, kpis.target) }} />
        <KpiCard title="เป้ายอดขาย" icon="🎯" value={fmtM(kpis.target)}
          subtext={`เดือน ${thisMonth}`} color="blue" href="/reports" loading={loading} />
        <KpiCard title="Achievement" icon="📊" value={`${kpis.pct.toFixed(1)}%`}
          subtext={kpis.pct >= 100 ? "✅ บรรลุเป้า!" : kpis.pct >= 80 ? "⚡ ใกล้ถึงเป้า" : "⚠️ ต้องเร่ง"}
          color={kpis.pct >= 100 ? "green" : kpis.pct >= 80 ? "amber" : "red"}
          href="/reports" loading={loading} />
        <KpiCard title="Pipeline" icon="🔮" value={fmtM(kpis.pipeline)}
          subtext={`${myProjects.filter(p => !["won","lost"].includes(p.status)).length} deals`}
          color="purple" href="/projects" loading={loading} />
        <KpiCard title="รอ PO" icon="⏳" value={kpis.waitPO}
          subtext="QT อนุมัติแล้ว รอ PO"
          color={kpis.waitPO > 3 ? "amber" : "cyan"} href="/quotations" loading={loading} />
        <KpiCard title="ลูกค้าใหม่ (30 วัน)" icon="🏢" value={kpis.newCust}
          subtext="ลูกค้าที่เพิ่มในระบบ" color="orange" href="/customers" loading={loading} />
      </DashboardGrid>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <AlertPanel title="รายการที่ต้องติดตาม" alerts={alerts} loading={loading} cols={4} />

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <DashboardGrid cols={2} gap="md">
        <ChartCard title="Sales vs Target" subtitle="ยอดขายเทียบเป้า 6 เดือน" height={220} loading={loading} empty={trendData.every(d => d.actual === 0 && d.target === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salActGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}K`} width={40} />
              <Tooltip formatter={(v) => [`${fmtM(Number(v))} ฿`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" fill="none" name="เป้า" />
              <Area type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} fill="url(#salActGrad)" name="ยอดขาย" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <DashboardGrid cols={1} gap="md">
          <ChartCard title="Pipeline by Stage" height={104} loading={loading} empty={stageData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}K`} width={40} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v) => [`${fmtM(Number(v))} ฿`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Customer Segment" height={104} loading={loading} empty={segData.length === 0}>
            <div className="flex gap-2 items-center h-full">
              <ResponsiveContainer width={96} height={96}>
                <PieChart>
                  <Pie data={segData} cx="50%" cy="50%" outerRadius={42} dataKey="value" paddingAngle={2}>
                    {segData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {segData.slice(0, 4).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted flex-1 truncate">{s.name}</span>
                    <span className="text-[10px] font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </DashboardGrid>
      </DashboardGrid>

      {/* ── Tables ──────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">🏆 Top Opportunities</h3>
          <Link href="/projects" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
        </div>
        <DataTable columns={oppCols} data={topOpp as unknown as Record<string,unknown>[]} maxRows={8}
          emptyTitle="ไม่มี deals ที่กำลังดำเนินการ" />
      </div>

      <DashboardGrid cols={2} gap="md">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">⚠️ Follow Up Required</h3>
            <Link href="/quotations" className="text-[11px] text-blue-500 hover:underline">ดู QT →</Link>
          </div>
          <DataTable columns={followCols} data={followUp as unknown as Record<string,unknown>[]} maxRows={6}
            emptyTitle="ไม่มี QT ค้างติดตาม" compact />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">📅 Recent Activities (30 วัน)</h3>
            <Link href="/sales" className="text-[11px] text-blue-500 hover:underline">ดูทั้งหมด →</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/10 rounded animate-pulse" />
              ))}
            </div>
          ) : recentActs.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">ไม่มีกิจกรรมใน 30 วันที่ผ่านมา</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {recentActs.map((a, i) => {
                const actDate = a.plan_date || a.next_follow_up || "";
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-base shrink-0 mt-0.5">{typeIcon[a.type] ?? "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.customer_name || "—"}</p>
                      <p className="text-[10px] text-muted truncate">
                        {typeLabel[a.type] || a.type}{a.description ? ` — ${a.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted">{actDate.slice(5) || "—"}</p>
                      <p className="text-[9px] text-muted/60">{a.assigned_to || ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardGrid>

    </div>
  );
}
