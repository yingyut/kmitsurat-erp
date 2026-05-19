"use client";
import { useState, useCallback, useEffect } from "react";
import { useCurrentUser } from "@/lib/UserContext";

// ── types ─────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type ColDef = { key: string; label: string };
type DateMode = "all" | "month" | "quarter" | "year" | "custom";

interface DateRange { start: Date | null; end: Date | null }

interface ReportDef {
  key: string;
  name: string;
  desc: string;
  cols: ColDef[];
  dateField?: string;
  fetch: () => Promise<Row[]>;
}

interface SummaryData {
  qt_count: number;
  qt_total_selling: number;
  qt_gross_profit: number;
  qt_gp_pct: number;
  svc_count: number;
  svc_revenue: number;
  svc_gp: number;
  act_count: number;
}

// ── helpers ───────────────────────────────────────────────────
function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  // Firestore Timestamp
  if (typeof v === "object" && v !== null && "toDate" in v) {
    return (v as { toDate(): Date }).toDate().toLocaleDateString("th-TH");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString();
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildCSV(rows: Row[], cols: ColDef[]): string {
  const header = cols.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((r) =>
    cols.map((c) => {
      const v = toStr(r[c.key]);
      return `"${v.replace(/"/g, '""')}"`;
    }).join(",")
  );
  // BOM (﻿) so Excel opens Thai correctly
  return "﻿" + [header, ...body].join("\r\n");
}

async function exportCSV(rows: Row[], cols: ColDef[], name: string) {
  const csv = buildCSV(rows, cols);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
}

async function exportExcel(rows: Row[], cols: ColDef[], name: string) {
  const XLSX = await import("xlsx");
  const wsData = [
    cols.map((c) => c.label),
    ...rows.map((r) => cols.map((c) => toStr(r[c.key]))),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Column widths
  ws["!cols"] = cols.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${name}.xlsx`);
}

function exportPDF(rows: Row[], cols: ColDef[], name: string) {
  const th = cols.map((c) => `<th>${c.label}</th>`).join("");
  const trs = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${toStr(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${name}</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; font-size: 11px; margin: 24px; color: #111; }
    h2   { font-size: 14px; margin-bottom: 4px; }
    p    { font-size: 10px; color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #0e1e3c; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
    td  { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head><body>
  <h2>${name}</h2>
  <p>Exported: ${new Date().toLocaleString("th-TH")}  |  ${rows.length} records</p>
  <table>
    <thead><tr>${th}</tr></thead>
    <tbody>${trs}</tbody>
  </table>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Pop-up blocked — please allow pop-ups for this site."); return; }
  w.document.write(html);
  w.document.close();
  w.print();
}

// ── date filter helpers ───────────────────────────────────────
function computeDateRange(mode: DateMode, customStart: string, customEnd: string): DateRange {
  const now = new Date();
  if (mode === "all") return { start: null, end: null };
  if (mode === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  if (mode === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), q * 3, 1), end: now };
  }
  if (mode === "year") return { start: new Date(now.getFullYear(), 0, 1), end: now };
  return {
    start: customStart ? new Date(customStart) : null,
    end: customEnd ? new Date(customEnd + "T23:59:59") : now,
  };
}

function rowDate(r: Row, field: string): Date | null {
  const v = r[field];
  if (!v) return null;
  if (typeof v === "object" && "toDate" in (v as object)) return (v as { toDate(): Date }).toDate();
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function applyDateFilter(rows: Row[], field: string, range: DateRange): Row[] {
  if (!range.start && !range.end) return rows;
  return rows.filter(r => {
    const d = rowDate(r, field);
    if (!d) return true;
    if (range.start && d < range.start) return false;
    if (range.end && d > range.end) return false;
    return true;
  });
}

const DATE_MODES: { key: DateMode; label: string }[] = [
  { key: "all",     label: "ทั้งหมด" },
  { key: "month",   label: "เดือนนี้" },
  { key: "quarter", label: "ไตรมาสนี้" },
  { key: "year",    label: "ปีนี้" },
  { key: "custom",  label: "กำหนดเอง" },
];

// ── report definitions ────────────────────────────────────────
const REPORTS: ReportDef[] = [
  {
    key: "sales_activities",
    name: "Sales Activities Report",
    desc: "All sales activities with filters by date, user, customer",
    dateField: "created_at",
    cols: [
      { key: "type",           label: "Type" },
      { key: "customer_name",  label: "Customer" },
      { key: "project_name",   label: "Project" },
      { key: "assigned_to",    label: "Sales" },
      { key: "status",         label: "Status" },
      { key: "description",    label: "Description" },
      { key: "next_follow_up", label: "Next Follow Up" },
      { key: "created_at",     label: "Created" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.salesActivities.list()) as unknown as Row[];
    },
  },
  {
    key: "quotations",
    name: "Quotation Summary",
    desc: "Quotation list with total selling, GP%, status breakdown",
    dateField: "created_at",
    cols: [
      { key: "quotation_number", label: "Quotation #" },
      { key: "customer_name",    label: "Customer" },
      { key: "project_name",     label: "Project" },
      { key: "status",           label: "Status" },
      { key: "total_selling",    label: "Total Selling" },
      { key: "total_cost",       label: "Total Cost" },
      { key: "gross_profit",     label: "Gross Profit" },
      { key: "gp_percent",       label: "GP%" },
      { key: "grand_total",      label: "Grand Total (incl. VAT)" },
      { key: "created_by",       label: "Created By" },
      { key: "created_at",       label: "Created" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.quotations.list()) as unknown as Row[];
    },
  },
  {
    key: "service_tickets",
    name: "Service Tickets Report",
    desc: "Service history by customer, technician, type",
    dateField: "service_date",
    cols: [
      { key: "customer_name", label: "Customer" },
      { key: "project_name",  label: "Project" },
      { key: "type",          label: "Type" },
      { key: "issue",         label: "Issue" },
      { key: "technician",    label: "Technician" },
      { key: "service_date",  label: "Service Date" },
      { key: "status",        label: "Status" },
      { key: "service_value", label: "Value (THB)" },
      { key: "service_cost",  label: "Cost (THB)" },
      { key: "gross_profit",  label: "GP (THB)" },
      { key: "hours_spent",   label: "Hours" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.serviceTickets.list()) as unknown as Row[];
    },
  },
  {
    key: "products",
    name: "Product Price List",
    desc: "Active product catalog with cost and selling prices",
    cols: [
      { key: "code",          label: "Code" },
      { key: "name",          label: "Name" },
      { key: "brand",         label: "Brand" },
      { key: "category",      label: "Category" },
      { key: "unit",          label: "Unit" },
      { key: "cost_price",    label: "Cost Price" },
      { key: "selling_price", label: "Selling Price" },
      { key: "type",          label: "Type" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      const all = await fs.products.list();
      return all.filter((p) => p.active) as unknown as Row[];
    },
  },
  {
    key: "customers",
    name: "Customer Summary",
    desc: "Customer list with project count and total project value",
    cols: [
      { key: "company_name",  label: "Company" },
      { key: "contact_name",  label: "Contact" },
      { key: "phone",         label: "Phone" },
      { key: "email",         label: "Email" },
      { key: "province",      label: "Province" },
      { key: "org_type",      label: "Org Type" },
      { key: "project_count", label: "Projects" },
      { key: "total_value",   label: "Total Value (THB)" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      const [custs, projs] = await Promise.all([fs.customers.list(), fs.projects.list()]);
      return custs.map((c) => {
        const cp = projs.filter((p) => p.customer_id === c.id);
        return {
          ...c,
          project_count: cp.length,
          total_value: cp.reduce((s, p) => s + (p.value || 0), 0),
        } as Row;
      });
    },
  },
  {
    key: "projects",
    name: "Project Pipeline",
    desc: "Projects by status with value and probability",
    dateField: "created_at",
    cols: [
      { key: "name",                label: "Project" },
      { key: "customer_name",       label: "Customer" },
      { key: "status",              label: "Status" },
      { key: "value",               label: "Value (THB)" },
      { key: "probability",         label: "Probability %" },
      { key: "assigned_to",         label: "Sales" },
      { key: "expected_close_date", label: "Expected Close" },
      { key: "type",                label: "Type" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.projects.list()) as unknown as Row[];
    },
  },
];

// ── page ──────────────────────────────────────────────────────
export default function ReportsPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const canView = hasPermission("view_reports");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dateMode, setDateMode] = useState<DateMode>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const dateRange = computeDateRange(dateMode, customStart, customEnd);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true); setSummary(null);
    try {
      const fs = await import("@/lib/firestore");
      const [qts, svcs, acts] = await Promise.all([
        fs.quotations.list(),
        fs.serviceTickets.list(),
        fs.salesActivities.list(),
      ]);
      const dr = computeDateRange(dateMode, customStart, customEnd);
      const fqts = applyDateFilter(qts as unknown as Row[], "created_at", dr);
      const fsvcs = applyDateFilter(svcs as unknown as Row[], "service_date", dr);
      const facts = applyDateFilter(acts as unknown as Row[], "created_at", dr);
      const qt_total = fqts.reduce((s, r) => s + (Number(r.total_selling) || 0), 0);
      const qt_gp = fqts.reduce((s, r) => s + (Number(r.gross_profit) || 0), 0);
      setSummary({
        qt_count: fqts.length,
        qt_total_selling: qt_total,
        qt_gross_profit: qt_gp,
        qt_gp_pct: qt_total > 0 ? (qt_gp / qt_total) * 100 : 0,
        svc_count: fsvcs.length,
        svc_revenue: fsvcs.reduce((s, r) => s + (Number(r.service_value) || 0), 0),
        svc_gp: fsvcs.reduce((s, r) => s + (Number(r.gross_profit) || 0), 0),
        act_count: facts.length,
      });
    } catch (e) {
      setError(`Summary failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setSummaryLoading(false);
    }
  }, [dateMode, customStart, customEnd]);

  const handleExport = useCallback(
    async (reportKey: string, format: "csv" | "excel" | "pdf") => {
      const report = REPORTS.find((r) => r.key === reportKey);
      if (!report) return;
      const loadKey = `${reportKey}-${format}`;
      setLoading(loadKey);
      setError(null);
      try {
        const raw = await report.fetch();
        const rows = report.dateField ? applyDateFilter(raw, report.dateField, dateRange) : raw;
        if (rows.length === 0) {
          setError(`ไม่พบข้อมูลใน "${report.name}" สำหรับช่วงวันที่ที่เลือก`);
          return;
        }
        const suffix = dateMode === "all" ? "" : ` (${DATE_MODES.find(d => d.key === dateMode)?.label ?? dateMode})`;
        if (format === "csv")   await exportCSV(rows, report.cols, report.name + suffix);
        if (format === "excel") await exportExcel(rows, report.cols, report.name + suffix);
        if (format === "pdf")   exportPDF(rows, report.cols, report.name + suffix);
      } catch (e) {
        setError(`Export failed: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoading(null);
      }
    },
    [dateRange, dateMode]
  );

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canView) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Reports / Export</h1>
        <p className="text-sm text-muted mt-1">กรองตามช่วงเวลาและ Export รายงาน</p>
      </div>

      {/* Date Filter Bar */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted font-medium whitespace-nowrap">ช่วงเวลา:</span>
          <div className="flex gap-1 flex-wrap">
            {DATE_MODES.map(m => (
              <button key={m.key} onClick={() => setDateMode(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dateMode === m.key ? "bg-accent text-white" : "bg-muted/10 text-muted/70 hover:bg-muted/20"}`}>
                {m.label}
              </button>
            ))}
          </div>
          {dateMode === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
              <span className="text-xs text-muted">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg bg-background border border-border px-2 py-1 text-xs focus:outline-none focus:border-accent" />
            </div>
          )}
          <button onClick={loadSummary} disabled={summaryLoading}
            className="rounded-lg bg-accent text-accent-foreground px-4 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity ml-auto">
            {summaryLoading ? "กำลังโหลด..." : "คำนวณสรุป"}
          </button>
        </div>
        {dateMode !== "all" && (
          <p className="text-[11px] text-muted/60 mt-2">
            {dateRange.start ? `ตั้งแต่ ${dateRange.start.toLocaleDateString("th-TH")}` : ""}{dateRange.end ? ` ถึง ${dateRange.end.toLocaleDateString("th-TH")}` : ""}
            {" · "}Export จะกรองข้อมูลตามช่วงเวลานี้ด้วย
          </p>
        )}
      </div>

      {/* Summary Panel */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted/60 mb-1">ยอดขาย (ใบเสนอราคา)</p>
            <p className="text-xl font-bold text-foreground">฿{fmt(summary.qt_total_selling)}</p>
            <p className="text-[11px] text-muted/60 mt-0.5">{summary.qt_count} ใบ</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted/60 mb-1">กำไรขั้นต้น</p>
            <p className="text-xl font-bold text-green-400">฿{fmt(summary.qt_gross_profit)}</p>
            <p className="text-[11px] text-muted/60 mt-0.5">GP {summary.qt_gp_pct.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted/60 mb-1">รายได้บริการ</p>
            <p className="text-xl font-bold text-blue-400">฿{fmt(summary.svc_revenue)}</p>
            <p className="text-[11px] text-muted/60 mt-0.5">{summary.svc_count} ใบงาน · GP ฿{fmt(summary.svc_gp)}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted/60 mb-1">กิจกรรมงานขาย</p>
            <p className="text-xl font-bold text-foreground">{fmt(summary.act_count)}</p>
            <p className="text-[11px] text-muted/60 mt-0.5">รายการ</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          {error}
          <button className="ml-3 underline text-xs opacity-70 hover:opacity-100" onClick={() => setError(null)}>ปิด</button>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORTS.map((r) => (
          <div key={r.key} className="rounded-xl bg-card border border-border p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium">{r.name}</p>
              {r.dateField && dateMode !== "all" && (
                <span className="rounded px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent border border-accent/20 shrink-0">
                  {DATE_MODES.find(d => d.key === dateMode)?.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mb-4">{r.desc}</p>
            <div className="flex gap-2 flex-wrap">
              {(["csv", "excel", "pdf"] as const).map((fmt2) => {
                const lk = `${r.key}-${fmt2}`;
                const busy = loading === lk;
                return (
                  <button
                    key={fmt2}
                    onClick={() => handleExport(r.key, fmt2)}
                    disabled={loading !== null}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {busy ? "Loading..." : `Export ${fmt2.toUpperCase()}`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
