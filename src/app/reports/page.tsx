"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useCurrentUser } from "@/lib/UserContext";

// ── types ──────────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type ColDef = { key: string; label: string };
type DateMode = "all" | "month" | "quarter" | "year" | "custom";
interface DateRange { start: Date | null; end: Date | null }
interface ReportDef {
  key: string;
  name: string;
  desc: string;
  icon: string;
  cols: ColDef[];
  dateField?: string;
  filterFields?: { field: string; label: string }[];
  fetch: () => Promise<Row[]>;
}

// ── helpers ────────────────────────────────────────────────────────────────────
function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "toDate" in v)
    return (v as { toDate(): Date }).toDate().toLocaleDateString("th-TH");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString();
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildCSV(rows: Row[], cols: ColDef[]): string {
  const header = cols.map(c => `"${c.label}"`).join(",");
  const body = rows.map(r => cols.map(c => `"${toStr(r[c.key]).replace(/"/g, '""')}"`).join(","));
  return "﻿" + [header, ...body].join("\r\n");
}

async function exportCSV(rows: Row[], cols: ColDef[], name: string) {
  downloadBlob(new Blob([buildCSV(rows, cols)], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
}

async function exportExcel(rows: Row[], cols: ColDef[], name: string) {
  const XLSX = await import("xlsx");
  const wsData = [cols.map(c => c.label), ...rows.map(r => cols.map(c => toStr(r[c.key])))];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = cols.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${name}.xlsx`);
}

function exportPDF(rows: Row[], cols: ColDef[], name: string) {
  const th = cols.map(c => `<th>${c.label}</th>`).join("");
  const trs = rows.map(r => `<tr>${cols.map(c => `<td>${toStr(r[c.key])}</td>`).join("")}</tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title>
<style>
  body{font-family:"Segoe UI",Tahoma,sans-serif;font-size:11px;margin:24px;color:#111}
  h2{font-size:15px;margin-bottom:4px}p.sub{font-size:10px;color:#666;margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  thead th{background:#0e1e3c;color:#fff;padding:7px 9px;text-align:left;font-size:10px;white-space:nowrap}
  td{padding:5px 9px;border-bottom:1px solid #e5e7eb;font-size:10px;max-width:200px;word-wrap:break-word}
  tr:nth-child(even) td{background:#f8fafc}
  @media print{body{margin:0}}
</style></head>
<body>
  <h2>${name}</h2>
  <p class="sub">วันที่ Export: ${new Date().toLocaleString("th-TH")} &nbsp;|&nbsp; ${rows.length.toLocaleString()} รายการ</p>
  <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("กรุณาอนุญาต Pop-up สำหรับเว็บนี้แล้วลองใหม่"); return; }
  w.document.write(html); w.document.close(); w.print();
}

function computeDateRange(mode: DateMode, customStart: string, customEnd: string): DateRange {
  const now = new Date();
  if (mode === "all") return { start: null, end: null };
  if (mode === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  if (mode === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), q * 3, 1), end: now };
  }
  if (mode === "year") return { start: new Date(now.getFullYear(), 0, 1), end: now };
  return { start: customStart ? new Date(customStart) : null, end: customEnd ? new Date(customEnd + "T23:59:59") : now };
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

function statusBadge(val: string): string {
  const v = val.toLowerCase();
  if (["done","completed","won","success","active","สำเร็จ"].some(x => v.includes(x))) return "bg-green-900/50 text-green-400";
  if (["in_progress","accepted","interested","pending","สนใจ","รอผล"].some(x => v.includes(x))) return "bg-yellow-900/50 text-yellow-400";
  if (["lost","rejected","cancelled","ยุติ","ปฏิเสธ"].some(x => v.includes(x))) return "bg-red-900/50 text-red-400";
  if (["new","lead","open","no_answer","ไม่รับสาย"].some(x => v.includes(x))) return "bg-blue-900/50 text-blue-400";
  if (["presale"].some(x => v.includes(x))) return "bg-purple-900/50 text-purple-400";
  if (["service"].some(x => v.includes(x))) return "bg-rose-900/50 text-rose-400";
  return "";
}

const STATUS_COLS = new Set(["status", "result", "priority", "request_to_team"]);

const DATE_MODES: { key: DateMode; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "month", label: "เดือนนี้" },
  { key: "quarter", label: "ไตรมาสนี้" },
  { key: "year", label: "ปีนี้" },
  { key: "custom", label: "กำหนดเอง" },
];

// ── report definitions ─────────────────────────────────────────────────────────
const REPORTS: ReportDef[] = [
  {
    key: "sales_activities",
    name: "Sales Activities",
    desc: "กิจกรรมงานขายทั้งหมด",
    icon: "📋",
    dateField: "created_at",
    filterFields: [{ field: "assigned_to", label: "เซลล์" }, { field: "status", label: "สถานะ" }],
    cols: [
      { key: "assigned_to",    label: "เซลล์" },
      { key: "customer_name",  label: "ลูกค้า" },
      { key: "type",           label: "ประเภท" },
      { key: "description",    label: "รายละเอียด" },
      { key: "result",         label: "ผลลัพธ์" },
      { key: "status",         label: "สถานะ" },
      { key: "next_follow_up", label: "Next Follow-up" },
      { key: "next_action_type", label: "Next Action" },
      { key: "created_at",     label: "วันที่" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.salesActivities.list()).filter(a => !a.is_plan) as unknown as Row[];
    },
  },
  {
    key: "action_plans",
    name: "Action Plan",
    desc: "แผนงานทีมขายพร้อมผลลัพธ์",
    icon: "📅",
    dateField: "plan_date",
    filterFields: [{ field: "assigned_to", label: "เซลล์" }, { field: "result", label: "ผลลัพธ์" }],
    cols: [
      { key: "plan_date",       label: "วันที่แผน" },
      { key: "assigned_to",     label: "เซลล์" },
      { key: "customer_name",   label: "ลูกค้า" },
      { key: "expected_outcome", label: "กิจกรรม" },
      { key: "type",            label: "ประเภท" },
      { key: "result",          label: "ผลลัพธ์" },
      { key: "next_action_type", label: "ขั้นตอนถัดไป" },
      { key: "status",          label: "สถานะ" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.salesActivities.list()).filter(a => a.is_plan) as unknown as Row[];
    },
  },
  {
    key: "sales_quota",
    name: "Quota vs Actual",
    desc: "เปรียบเป้ายอดขายกับยอดจริง",
    icon: "🎯",
    filterFields: [{ field: "user_name", label: "เซลล์" }, { field: "month", label: "เดือน" }],
    cols: [
      { key: "month",         label: "เดือน" },
      { key: "user_name",     label: "เซลล์" },
      { key: "role",          label: "ตำแหน่ง" },
      { key: "quota_target",  label: "เป้า (THB)" },
      { key: "actual_sales",  label: "ยอดจริง (THB)" },
      { key: "remaining",     label: "คงเหลือ (THB)" },
      { key: "percent",       label: "% สำเร็จ" },
      { key: "won_deals",     label: "Won Deals" },
      { key: "profit_target", label: "เป้ากำไร (THB)" },
      { key: "actual_profit", label: "กำไรจริง (THB)" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.salesQuotas.list()) as unknown as Row[];
    },
  },
  {
    key: "quotations",
    name: "Quotations",
    desc: "ใบเสนอราคาพร้อม GP%",
    icon: "📄",
    dateField: "created_at",
    filterFields: [{ field: "created_by", label: "ผู้สร้าง" }, { field: "status", label: "สถานะ" }],
    cols: [
      { key: "quotation_number", label: "QT #" },
      { key: "customer_name",    label: "ลูกค้า" },
      { key: "project_name",     label: "โปรเจค" },
      { key: "status",           label: "สถานะ" },
      { key: "total_selling",    label: "Total Selling (THB)" },
      { key: "gross_profit",     label: "Gross Profit (THB)" },
      { key: "gp_percent",       label: "GP%" },
      { key: "grand_total",      label: "Grand Total incl.VAT" },
      { key: "created_by",       label: "Created By" },
      { key: "created_at",       label: "วันที่" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.quotations.list()) as unknown as Row[];
    },
  },
  {
    key: "projects",
    name: "Pipeline",
    desc: "ดีลแยกตาม Stage",
    icon: "🏗",
    dateField: "created_at",
    filterFields: [{ field: "assigned_to", label: "เซลล์" }, { field: "status", label: "Stage" }],
    cols: [
      { key: "name",                label: "Project" },
      { key: "customer_name",       label: "Customer" },
      { key: "status",              label: "Status" },
      { key: "value",               label: "Value (THB)" },
      { key: "probability",         label: "Prob %" },
      { key: "assigned_to",         label: "Sales" },
      { key: "expected_close_date", label: "Close Date" },
      { key: "type",                label: "Type" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.projects.list()) as unknown as Row[];
    },
  },
  {
    key: "service_tickets",
    name: "Service Tickets",
    desc: "งานบริการพร้อม GP และระยะเวลา",
    icon: "🔧",
    dateField: "opened_at",
    filterFields: [{ field: "technician", label: "ช่างเทคนิค" }, { field: "status", label: "สถานะ" }],
    cols: [
      { key: "customer_name",   label: "Customer" },
      { key: "project_name",    label: "Project" },
      { key: "type",            label: "Type" },
      { key: "issue",           label: "Issue" },
      { key: "technician",      label: "Technician" },
      { key: "status",          label: "Status" },
      { key: "opened_at",       label: "วันที่รับแจ้ง" },
      { key: "service_date",    label: "Service Date" },
      { key: "finished_at",     label: "วันที่จบงาน" },
      { key: "duration_hours",  label: "ระยะเวลา (ชม.)" },
      { key: "duration_days",   label: "ระยะเวลา (วัน)" },
      { key: "hours_spent",     label: "ชม.ทำงานจริง" },
      { key: "service_value",   label: "Value (THB)" },
      { key: "gross_profit",    label: "GP (THB)" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      const tickets = await fs.serviceTickets.list();
      return tickets.map(t => {
        const raw2 = t as unknown as Record<string, unknown>;
        const finishedAt = raw2.resolved_at as string | undefined
          || raw2.closed_at as string | undefined;
        const openedAt = raw2.opened_at as string | undefined;
        let durationHours: number | null = null;
        if (openedAt && finishedAt) {
          const ms = new Date(finishedAt).getTime() - new Date(openedAt).getTime();
          if (!isNaN(ms) && ms >= 0) durationHours = Math.round(ms / 3600000 * 10) / 10;
        }
        return {
          ...t,
          finished_at: finishedAt ?? "",
          duration_hours: durationHours ?? "",
          duration_days: durationHours !== null ? Math.round(durationHours / 24 * 10) / 10 : "",
        };
      }) as unknown as Row[];
    },
  },
  {
    key: "service_sla",
    name: "Service SLA & Time",
    desc: "ระยะเวลารับแจ้ง / จบงาน และ SLA compliance",
    icon: "⏱️",
    dateField: "opened_at",
    filterFields: [{ field: "technician", label: "ช่างเทคนิค" }, { field: "sla_status", label: "SLA" }],
    cols: [
      { key: "customer_name",        label: "Customer" },
      { key: "issue",                label: "Issue" },
      { key: "technician",           label: "Technician" },
      { key: "status",               label: "Status" },
      { key: "opened_at",            label: "รับแจ้ง" },
      { key: "accepted_at",          label: "รับงาน" },
      { key: "started_at",           label: "เริ่มทำ" },
      { key: "finished_at",          label: "จบงาน" },
      { key: "response_hours",       label: "Response (ชม.)" },
      { key: "resolve_hours",        label: "Resolve (ชม.)" },
      { key: "resolve_days",         label: "Resolve (วัน)" },
      { key: "sla_response_target",  label: "SLA Response Target" },
      { key: "sla_resolve_target",   label: "SLA Resolve Target" },
      { key: "response_sla_ok",      label: "Response SLA" },
      { key: "sla_status",           label: "Resolve SLA" },
      { key: "hours_spent",          label: "ชม.ทำงานจริง" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      const tickets = await fs.serviceTickets.list();
      return tickets.map(t => {
        const raw = t as unknown as Record<string, unknown>;
        const openedAt   = raw.opened_at   as string | undefined;
        const acceptedAt = raw.accepted_at as string | undefined;
        const startedAt  = raw.started_at  as string | undefined;
        const finishedAt = (raw.resolved_at as string | undefined) || (raw.closed_at as string | undefined);
        const slaResp    = raw.sla_response_hours as number | undefined;
        const slaResolve = raw.sla_resolve_hours  as number | undefined;

        function hoursBetween(a?: string, b?: string): number | null {
          if (!a || !b) return null;
          const ms = new Date(b).getTime() - new Date(a).getTime();
          return isNaN(ms) || ms < 0 ? null : Math.round(ms / 3600000 * 10) / 10;
        }

        const responseHours = hoursBetween(openedAt, acceptedAt);
        const resolveHours  = hoursBetween(openedAt, finishedAt);

        const responseOk = responseHours !== null && slaResp
          ? responseHours <= slaResp ? "✅ ผ่าน" : "❌ เกิน"
          : "—";
        const resolveOk  = resolveHours !== null && slaResolve
          ? resolveHours <= slaResolve ? "✅ ผ่าน" : "❌ เกิน"
          : finishedAt ? "— (ไม่กำหนด)" : "🔄 ยังไม่จบ";

        return {
          ...t,
          accepted_at:         acceptedAt ?? "",
          started_at:          startedAt  ?? "",
          finished_at:         finishedAt ?? "",
          response_hours:      responseHours ?? "",
          resolve_hours:       resolveHours ?? "",
          resolve_days:        resolveHours !== null ? Math.round(resolveHours / 24 * 10) / 10 : "",
          sla_response_target: slaResp    ? `${slaResp} ชม.` : "—",
          sla_resolve_target:  slaResolve ? `${slaResolve} ชม.` : "—",
          response_sla_ok:     responseOk,
          sla_status:          resolveOk,
        };
      }) as unknown as Row[];
    },
  },
  {
    key: "job_requests",
    name: "Job Requests",
    desc: "คำขอทีมสนับสนุน Presale/Service",
    icon: "📨",
    filterFields: [{ field: "request_to_team", label: "ทีม" }, { field: "status", label: "สถานะ" }],
    cols: [
      { key: "title",           label: "หัวข้อ" },
      { key: "request_from",    label: "ขอจาก" },
      { key: "request_to_team", label: "ทีมที่รับ" },
      { key: "customer_name",   label: "ลูกค้า" },
      { key: "priority",        label: "Priority" },
      { key: "status",          label: "สถานะ" },
      { key: "due_date",        label: "Due Date" },
      { key: "description",     label: "รายละเอียด" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.jobRequests.list()) as unknown as Row[];
    },
  },
  {
    key: "customers",
    name: "Customers",
    desc: "ลูกค้าพร้อมยอดโปรเจค",
    icon: "🏢",
    filterFields: [{ field: "province", label: "จังหวัด" }, { field: "org_type", label: "ประเภทองค์กร" }],
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
      return custs.map(c => ({
        ...c,
        project_count: projs.filter(p => p.customer_id === c.id).length,
        total_value: projs.filter(p => p.customer_id === c.id).reduce((s, p) => s + (p.value || 0), 0),
      })) as unknown as Row[];
    },
  },
  {
    key: "products",
    name: "Products",
    desc: "สินค้าพร้อมราคา",
    icon: "📦",
    filterFields: [{ field: "category", label: "หมวดหมู่" }, { field: "brand", label: "Brand" }],
    cols: [
      { key: "code",          label: "Code" },
      { key: "name",          label: "Name" },
      { key: "brand",         label: "Brand" },
      { key: "category",      label: "Category" },
      { key: "unit",          label: "Unit" },
      { key: "cost_price",    label: "Cost Price (THB)" },
      { key: "selling_price", label: "Selling Price (THB)" },
      { key: "type",          label: "Type" },
    ],
    fetch: async () => {
      const fs = await import("@/lib/firestore");
      return (await fs.products.list()).filter(p => p.active) as unknown as Row[];
    },
  },
];

// ── page ───────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const canView = hasPermission("view_reports");
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filter
  const [dateMode, setDateMode] = useState<DateMode>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Active report + preview
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  // Secondary filters
  const [search, setSearch] = useState("");
  const [filterVal1, setFilterVal1] = useState("");
  const [filterVal2, setFilterVal2] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const dateRange = useMemo(() => computeDateRange(dateMode, customStart, customEnd), [dateMode, customStart, customEnd]);
  const activeReportDef = useMemo(() => REPORTS.find(r => r.key === activeReport) ?? null, [activeReport]);

  const loadReport = useCallback(async (key: string, range: DateRange) => {
    const report = REPORTS.find(r => r.key === key);
    if (!report) return;
    setPreviewLoading(true);
    setPreviewRows([]);
    setError(null);
    setSearch(""); setFilterVal1(""); setFilterVal2(""); setShowAll(false);
    try {
      const raw = await report.fetch();
      const rows = report.dateField ? applyDateFilter(raw, report.dateField, range) : raw;
      setPreviewRows(rows);
    } catch (e) {
      setError(`โหลดข้อมูลไม่สำเร็จ: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  function selectReport(key: string) {
    setActiveReport(key);
    loadReport(key, dateRange);
  }

  const filterField1 = activeReportDef?.filterFields?.[0];
  const filterField2 = activeReportDef?.filterFields?.[1];

  const opts1 = useMemo(() =>
    filterField1 ? [...new Set(previewRows.map(r => String(r[filterField1.field] ?? "")).filter(Boolean))].sort() : [],
  [previewRows, filterField1]);

  const opts2 = useMemo(() =>
    filterField2 ? [...new Set(previewRows.map(r => String(r[filterField2.field] ?? "")).filter(Boolean))].sort() : [],
  [previewRows, filterField2]);

  const filteredRows = useMemo(() => {
    let rows = previewRows;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(s)));
    }
    if (filterVal1 && filterField1) rows = rows.filter(r => String(r[filterField1.field] ?? "") === filterVal1);
    if (filterVal2 && filterField2) rows = rows.filter(r => String(r[filterField2.field] ?? "") === filterVal2);
    return rows;
  }, [previewRows, search, filterVal1, filterVal2, filterField1, filterField2]);

  const displayRows = showAll ? filteredRows : filteredRows.slice(0, 50);

  // Summary stats for numeric columns
  const numericSummary = useMemo(() => {
    if (!activeReportDef || filteredRows.length === 0) return null;
    const numCols = activeReportDef.cols.filter(c =>
      filteredRows.some(r => typeof r[c.key] === "number" || (typeof r[c.key] === "string" && !isNaN(Number(r[c.key])) && String(r[c.key]) !== ""))
    ).slice(0, 4);
    if (numCols.length === 0) return null;
    return numCols.map(c => ({
      label: c.label,
      sum: filteredRows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0),
    }));
  }, [activeReportDef, filteredRows]);

  async function handleExport(format: "csv" | "excel" | "pdf") {
    if (!activeReportDef) return;
    setExporting(format); setError(null);
    try {
      const suffix = dateMode !== "all" ? ` (${DATE_MODES.find(d => d.key === dateMode)?.label})` : "";
      const name = activeReportDef.name + suffix;
      if (format === "csv")   await exportCSV(filteredRows, activeReportDef.cols, name);
      if (format === "excel") await exportExcel(filteredRows, activeReportDef.cols, name);
      if (format === "pdf")   exportPDF(filteredRows, activeReportDef.cols, name);
    } catch (e) {
      setError(`Export ไม่สำเร็จ: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setExporting(null);
    }
  }

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canView) return <div className="p-6"><p className="text-red-400 text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-xs text-muted mt-0.5">ดูรายงาน กรองข้อมูล และ Export</p>
        </div>
        {activeReport && !previewLoading && (
          <button onClick={() => loadReport(activeReport, dateRange)}
            className="rounded-lg bg-accent/10 text-accent px-4 py-1.5 text-xs font-medium hover:bg-accent/20 transition-colors">
            🔄 โหลดใหม่
          </button>
        )}
      </div>

      {/* Date filter bar */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted font-medium shrink-0">ช่วงเวลา:</span>
          <div className="flex gap-1 flex-wrap">
            {DATE_MODES.map(m => (
              <button key={m.key} onClick={() => setDateMode(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dateMode === m.key ? "bg-accent text-white" : "bg-background text-muted hover:bg-card-hover"}`}>
                {m.label}
              </button>
            ))}
          </div>
          {dateMode === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
              <span className="text-xs text-muted">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:border-accent" />
            </div>
          )}
        </div>
        {dateMode !== "all" && dateRange.start && (
          <p className="text-[10px] text-muted/50 mt-2">
            {dateRange.start.toLocaleDateString("th-TH")} — {dateRange.end?.toLocaleDateString("th-TH")}
            {activeReportDef?.dateField && " · กรองจากฟิลด์ที่เลือก"}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-800/50 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-xs underline opacity-70">ปิด</button>
        </div>
      )}

      {/* Report selector */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-2">
        {REPORTS.map(r => (
          <button key={r.key} onClick={() => selectReport(r.key)}
            className={`rounded-xl border p-3 text-left transition-all ${
              activeReport === r.key
                ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
                : "border-border bg-card hover:border-accent/30 hover:bg-card-hover"
            }`}>
            <p className="text-xl mb-1.5">{r.icon}</p>
            <p className={`text-[11px] font-semibold leading-tight ${activeReport === r.key ? "text-accent" : ""}`}>{r.name}</p>
          </button>
        ))}
      </div>

      {/* Preview panel */}
      {activeReportDef ? (
        <div className="rounded-xl bg-card border border-border overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold">{activeReportDef.icon} {activeReportDef.name}</h2>
              <p className="text-[10px] text-muted mt-0.5">
                {previewLoading
                  ? "กำลังโหลด..."
                  : `${filteredRows.length.toLocaleString()} รายการ${previewRows.length !== filteredRows.length ? ` (กรองจาก ${previewRows.length.toLocaleString()})` : ""}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["csv","excel","pdf"] as const).map(f => (
                <button key={f} onClick={() => handleExport(f)}
                  disabled={!!exporting || previewLoading || filteredRows.length === 0}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    f === "csv"   ? "border-green-700/50 text-green-400 hover:bg-green-900/20" :
                    f === "excel" ? "border-blue-700/50 text-blue-400 hover:bg-blue-900/20" :
                                    "border-orange-700/50 text-orange-400 hover:bg-orange-900/20"
                  }`}>
                  {exporting === f ? "กำลัง Export..." : f === "csv" ? "📥 CSV" : f === "excel" ? "📊 Excel" : "🖨 PDF"}
                </button>
              ))}
            </div>
          </div>

          {/* Summary stats row */}
          {numericSummary && numericSummary.length > 0 && !previewLoading && (
            <div className="px-5 py-3 border-b border-border bg-background/30 flex flex-wrap gap-5">
              {numericSummary.map(s => (
                <div key={s.label}>
                  <p className="text-[10px] text-muted">{s.label} รวม</p>
                  <p className="text-sm font-bold">{s.sum.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>
          )}

          {/* Secondary filters */}
          <div className="px-4 py-2.5 border-b border-border bg-background/20 flex flex-wrap gap-2 items-center">
            <input placeholder="🔍 ค้นหาทุกคอลัมน์..." value={search} onChange={e => setSearch(e.target.value)}
              className="rounded-lg bg-background border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent flex-1 min-w-[160px] max-w-xs" />
            {filterField1 && opts1.length > 0 && (
              <select value={filterVal1} onChange={e => setFilterVal1(e.target.value)}
                className="rounded-lg bg-background border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent">
                <option value="">ทุก{filterField1.label}</option>
                {opts1.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            {filterField2 && opts2.length > 0 && (
              <select value={filterVal2} onChange={e => setFilterVal2(e.target.value)}
                className="rounded-lg bg-background border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent">
                <option value="">ทุก{filterField2.label}</option>
                {opts2.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            {(search || filterVal1 || filterVal2) && (
              <button onClick={() => { setSearch(""); setFilterVal1(""); setFilterVal2(""); }}
                className="text-[10px] text-muted hover:text-foreground px-2 py-1 rounded hover:bg-card-hover transition-colors">
                ✕ ล้างตัวกรอง
              </button>
            )}
            <span className="ml-auto text-[10px] text-muted/50 hidden sm:block">{activeReportDef.desc}</span>
          </div>

          {/* Table */}
          {previewLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-muted">กำลังโหลดข้อมูล...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm text-muted">ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก</p>
              {(search || filterVal1 || filterVal2) && (
                <button onClick={() => { setSearch(""); setFilterVal1(""); setFilterVal2(""); }}
                  className="mt-3 text-xs text-accent hover:underline">ล้างตัวกรองทั้งหมด</button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background/50 sticky top-0">
                      <th className="px-3 py-2.5 text-left text-[10px] text-muted font-medium w-8 shrink-0">#</th>
                      {activeReportDef.cols.map(c => (
                        <th key={c.key} className="px-3 py-2.5 text-left text-[10px] text-muted font-medium whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card-hover transition-colors">
                        <td className="px-3 py-2 text-[10px] text-muted/30 tabular-nums">{i + 1}</td>
                        {activeReportDef.cols.map(c => {
                          const raw = toStr(row[c.key]);
                          const badge = STATUS_COLS.has(c.key) && raw ? statusBadge(raw) : "";
                          return (
                            <td key={c.key} className="px-3 py-2" title={raw}>
                              {badge
                                ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}>{raw}</span>
                                : <span className="block max-w-[200px] truncate">{raw || <span className="text-muted/20">—</span>}</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {filteredRows.length > 50 && (
                <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs">
                  <p className="text-muted">
                    {showAll ? `แสดงทั้งหมด ${filteredRows.length.toLocaleString()} รายการ` : `แสดง 50 จาก ${filteredRows.length.toLocaleString()} รายการ`}
                  </p>
                  <button onClick={() => setShowAll(!showAll)}
                    className="rounded-lg bg-accent/10 text-accent px-4 py-1.5 hover:bg-accent/20 transition-colors">
                    {showAll ? "▲ แสดงน้อยลง" : `แสดงทั้งหมด ${filteredRows.length.toLocaleString()} รายการ`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-sm text-muted">เลือกรายงานด้านบนเพื่อดูข้อมูลและ Export</p>
          <p className="text-[11px] text-muted/50 mt-1">รองรับ Export เป็น CSV · Excel · PDF</p>
        </div>
      )}
    </div>
  );
}
