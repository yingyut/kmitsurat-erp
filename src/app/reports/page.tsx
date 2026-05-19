"use client";
import { useState, useCallback, useEffect } from "react";
import { useCurrentUser } from "@/lib/UserContext";

// ── types ─────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type ColDef = { key: string; label: string };

interface ReportDef {
  key: string;
  name: string;
  desc: string;
  cols: ColDef[];
  fetch: () => Promise<Row[]>;
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

// ── report definitions ────────────────────────────────────────
const REPORTS: ReportDef[] = [
  {
    key: "sales_activities",
    name: "Sales Activities Report",
    desc: "All sales activities with filters by date, user, customer",
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

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canView) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  const handleExport = useCallback(
    async (reportKey: string, format: "csv" | "excel" | "pdf") => {
      const report = REPORTS.find((r) => r.key === reportKey);
      if (!report) return;
      const loadKey = `${reportKey}-${format}`;
      setLoading(loadKey);
      setError(null);
      try {
        const rows = await report.fetch();
        if (rows.length === 0) {
          setError(`No data found for "${report.name}"`);
          return;
        }
        if (format === "csv")   await exportCSV(rows, report.cols, report.name);
        if (format === "excel") await exportExcel(rows, report.cols, report.name);
        if (format === "pdf")   exportPDF(rows, report.cols, report.name);
      } catch (e) {
        setError(`Export failed: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoading(null);
      }
    },
    []
  );

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Reports / Export</h1>
        <p className="text-sm text-muted mt-1">Select a report and choose export format</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            className="ml-3 underline text-xs opacity-70 hover:opacity-100"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORTS.map((r) => (
          <div key={r.key} className="rounded-xl bg-card border border-border p-5">
            <p className="text-sm font-medium mb-1">{r.name}</p>
            <p className="text-xs text-muted mb-4">{r.desc}</p>
            <div className="flex gap-2 flex-wrap">
              {(["csv", "excel", "pdf"] as const).map((fmt) => {
                const lk = `${r.key}-${fmt}`;
                const busy = loading === lk;
                return (
                  <button
                    key={fmt}
                    onClick={() => handleExport(r.key, fmt)}
                    disabled={loading !== null}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {busy ? "Loading..." : `Export ${fmt.toUpperCase()}`}
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
