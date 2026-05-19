"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useCurrentUser } from "@/lib/UserContext";

// ── types ─────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type ColDef = { key: string; label: string; required?: boolean };

interface ModuleDef {
  key: string;
  label: string;
  collection: string;
  cols: ColDef[];
  defaults: Row;
  numericFields: string[];
  boolFields: string[];
}

interface BackupData {
  exported_at: string;
  version: number;
  collections: Record<string, Row[]>;
}

// ── module definitions ────────────────────────────────────────
const MODULES: ModuleDef[] = [
  {
    key: "customers", label: "Customers", collection: "customers",
    cols: [
      { key: "company_name",  label: "Company Name",  required: true },
      { key: "contact_name",  label: "Contact Name" },
      { key: "phone",         label: "Phone" },
      { key: "email",         label: "Email" },
      { key: "address",       label: "Address" },
      { key: "province",      label: "Province" },
      { key: "org_type",      label: "Org Type (government/private/education/hospital/hotel/other)" },
      { key: "notes",         label: "Notes" },
    ],
    defaults: { org_type: "private", notes: "", contact_name: "", phone: "", email: "", address: "", province: "" },
    numericFields: [], boolFields: [],
  },
  {
    key: "products", label: "Products", collection: "products",
    cols: [
      { key: "code",          label: "Code" },
      { key: "name",          label: "Name", required: true },
      { key: "brand",         label: "Brand" },
      { key: "category",      label: "Category" },
      { key: "unit",          label: "Unit" },
      { key: "cost_price",    label: "Cost Price" },
      { key: "selling_price", label: "Selling Price" },
      { key: "type",          label: "Type (product/service)" },
      { key: "active",        label: "Active (true/false)" },
    ],
    defaults: { active: true, type: "product", code: "", brand: "", category: "", unit: "ea", cost_price: 0, selling_price: 0 },
    numericFields: ["cost_price", "selling_price"],
    boolFields: ["active"],
  },
  {
    key: "vendors", label: "Vendors", collection: "vendors",
    cols: [
      { key: "name",                  label: "Name", required: true },
      { key: "contact_name",          label: "Contact" },
      { key: "phone",                 label: "Phone" },
      { key: "email",                 label: "Email" },
      { key: "address",               label: "Address" },
      { key: "vendor_type",           label: "Type (distributor/contractor_company/contractor_personal/internal_team)" },
      { key: "has_vat",               label: "Has VAT (true/false)" },
      { key: "payment_terms",         label: "Payment Terms" },
      { key: "tax_id",                label: "Tax ID" },
      { key: "withholding_tax_rate",  label: "WHT Rate (%)" },
    ],
    defaults: { active: true, notes: "", vendor_type: "distributor", has_vat: false, payment_terms: "", tax_id: "", contact_name: "", phone: "", email: "", address: "", withholding_tax_rate: 0 },
    numericFields: ["withholding_tax_rate"],
    boolFields: ["has_vat"],
  },
  {
    key: "projects", label: "Projects", collection: "projects",
    cols: [
      { key: "name",                label: "Project Name", required: true },
      { key: "customer_name",       label: "Customer Name" },
      { key: "type",                label: "Type" },
      { key: "value",               label: "Value (THB)" },
      { key: "status",              label: "Status (lead/opportunity/proposal/negotiation/won/lost)" },
      { key: "assigned_to",         label: "Assigned To" },
      { key: "probability",         label: "Probability %" },
      { key: "expected_close_date", label: "Expected Close (YYYY-MM-DD)" },
      { key: "notes",               label: "Notes" },
    ],
    defaults: { customer_id: "", status: "lead", value: 0, probability: 0, type: "", assigned_to: "", notes: "", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
    numericFields: ["value", "probability"],
    boolFields: [],
  },
];

const BACKUP_COLLECTIONS = [
  "customers", "products", "vendors", "projects",
  "sales_activities", "quotations", "service_tickets", "service_contracts",
  "users", "teams", "project_types", "product_categories", "job_requests",
];

// ── helpers ───────────────────────────────────────────────────
function coerceRow(row: Row, mod: ModuleDef): Row {
  const result: Row = { ...mod.defaults };
  for (const col of mod.cols) {
    if (col.key in row && row[col.key] !== "") result[col.key] = row[col.key];
  }
  for (const f of mod.numericFields) {
    if (f in result) result[f] = parseFloat(String(result[f])) || 0;
  }
  for (const f of mod.boolFields) {
    if (f in result) {
      const v = String(result[f]).toLowerCase().trim();
      result[f] = v === "true" || v === "1" || v === "yes";
    }
  }
  return result;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate(mod: ModuleDef) {
  const header = mod.cols.map((c) => c.label.split(" (")[0]).join(",");
  downloadBlob(new Blob(["﻿" + header + "\r\n"], { type: "text/csv;charset=utf-8" }), `template_${mod.key}.csv`);
}

async function parseFile(file: File): Promise<Row[]> {
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(data), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
  // Normalize header keys: trim whitespace, take part before " ("
  return raw.map((row) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(row)) {
      const clean = k.trim().split(" (")[0].trim().toLowerCase().replace(/ /g, "_");
      out[clean] = v;
    }
    return out;
  });
}

async function batchImport(colName: string, rows: Row[]): Promise<{ added: number; failed: number }> {
  const fb = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  let added = 0; let failed = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const batch = fb.writeBatch(db);
    for (const row of chunk) {
      try {
        const ref = fb.doc(fb.collection(db, colName));
        batch.set(ref, { ...row, tenant_id: "kmitsurat", created_at: new Date() });
        added++;
      } catch { failed++; }
    }
    await batch.commit();
  }
  return { added, failed };
}

async function backupAll(): Promise<BackupData> {
  const fs = await import("@/lib/firestore");
  const out: Record<string, Row[]> = {};
  await Promise.all(
    BACKUP_COLLECTIONS.map(async (col) => {
      try {
        const svc = (fs as unknown as Record<string, { list: () => Promise<Row[]> }>);
        const key = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); // snake → camel
        const list = svc[key]?.list ?? svc[col]?.list;
        if (list) out[col] = await list.call(svc[key] ?? svc[col]);
        else out[col] = [];
      } catch { out[col] = []; }
    })
  );
  return { exported_at: new Date().toISOString(), version: 1, collections: out };
}

async function restoreBackup(data: BackupData): Promise<Record<string, number>> {
  const fb = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const results: Record<string, number> = {};
  for (const [col, rows] of Object.entries(data.collections)) {
    if (!rows || rows.length === 0) { results[col] = 0; continue; }
    let count = 0;
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400);
      const batch = fb.writeBatch(db);
      for (const row of chunk) {
        const id = String(row.id || "");
        const ref = id
          ? fb.doc(db, col, id)
          : fb.doc(fb.collection(db, col));
        const { id: _id, ...data } = row;
        void _id;
        batch.set(ref, data, { merge: true });
        count++;
      }
      await batch.commit();
    }
    results[col] = count;
  }
  return results;
}

// ── page ──────────────────────────────────────────────────────
export default function ImportExportPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const canManage = hasPermission("manage_system");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [tab, setTab] = useState<"import" | "backup">("import");
  const [module, setModule] = useState(MODULES[0].key);
  const [preview, setPreview] = useState<Row[] | null>(null);
  const [parsedRows, setParsedRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; failed: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [backing, setBacking] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<Record<string, number> | null>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  const mod = MODULES.find((m) => m.key === module)!;

  // ── import handlers ──
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null); setImportResult(null);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) { setFileError("No data rows found in file."); return; }
      setParsedRows(rows);
      setPreview(rows.slice(0, 5));
    } catch (err) {
      setFileError(`Parse error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedRows.length) return;
    setImporting(true); setImportResult(null);
    try {
      const coerced = parsedRows.map((r) => coerceRow(r, mod));
      const result = await batchImport(mod.collection, coerced);
      setImportResult(result);
      setParsedRows([]); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setFileError(`Import failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setImporting(false);
    }
  }, [parsedRows, mod]);

  const switchModule = (key: string) => {
    setModule(key);
    setParsedRows([]); setPreview(null);
    setImportResult(null); setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── backup handlers ──
  const handleBackup = useCallback(async () => {
    setBacking(true);
    try {
      const data = await backupAll();
      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(new Blob([json], { type: "application/json" }), `kmit-erp-backup-${date}.json`);
    } finally {
      setBacking(false);
    }
  }, []);

  const handleRestoreFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file); setRestoreSummary(null); setRestoreResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      const summary: Record<string, number> = {};
      for (const [col, rows] of Object.entries(data.collections)) {
        summary[col] = Array.isArray(rows) ? rows.length : 0;
      }
      setRestoreSummary(summary);
    } catch {
      setRestoreSummary(null);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const text = await restoreFile.text();
      const data = JSON.parse(text) as BackupData;
      const result = await restoreBackup(data);
      setRestoreResult(result);
      setRestoreFile(null); setRestoreSummary(null);
      if (restoreRef.current) restoreRef.current.value = "";
    } finally {
      setRestoring(false);
    }
  }, [restoreFile]);

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canManage) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Import / Backup & Restore</h1>
        <p className="text-sm text-muted mt-1">นำเข้าข้อมูลจาก Excel/CSV และสำรองข้อมูลระบบ</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-border">
        {[
          { key: "import", label: "Import Data" },
          { key: "backup", label: "Backup & Restore" },
        ].map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key as "import" | "backup")}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ── */}
      {tab === "import" && (
        <div className="max-w-3xl">
          {/* Module selector */}
          <div className="flex flex-wrap gap-2 mb-5">
            {MODULES.map((m) => (
              <button key={m.key}
                onClick={() => switchModule(m.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  module === m.key
                    ? "bg-accent/15 border border-accent text-accent"
                    : "border border-border text-muted hover:bg-card-hover"
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Columns info + template */}
          <div className="rounded-xl bg-card border border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Column format — {mod.label}</p>
              <button
                onClick={() => downloadTemplate(mod)}
                className="text-xs text-accent hover:underline">
                Download Template CSV
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mod.cols.map((c) => (
                <span key={c.key}
                  className={`rounded px-2 py-0.5 text-xs font-mono ${
                    c.required
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-card-hover text-muted border border-border"
                  }`}>
                  {c.key}{c.required ? "*" : ""}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">* required field</p>
          </div>

          {/* File upload */}
          <div className="rounded-xl bg-card border border-border p-4 mb-4">
            <p className="text-sm font-medium mb-3">Upload File (.xlsx / .csv)</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted
                file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border
                file:text-xs file:font-medium file:bg-card-hover file:text-foreground
                hover:file:bg-accent/10 cursor-pointer" />
            {fileError && (
              <p className="mt-2 text-xs text-destructive">{fileError}</p>
            )}
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-4 mb-4 overflow-x-auto">
              <p className="text-sm font-medium mb-3">
                Preview (first 5 rows) — {parsedRows.length} total rows
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {mod.cols.map((c) => (
                      <th key={c.key} className="text-left px-2 py-1.5 bg-card-hover text-muted font-medium border border-border">
                        {c.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {mod.cols.map((c) => (
                        <td key={c.key} className="px-2 py-1.5 border border-border font-mono text-foreground max-w-[140px] truncate">
                          {String(row[c.key] ?? row[c.label.split(" (")[0].toLowerCase().replace(/ /g, "_")] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Import button + result */}
          {parsedRows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-accent text-accent-foreground px-6 py-2.5 text-sm font-medium
                hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {importing ? "Importing..." : `Import ${parsedRows.length} rows into ${mod.label}`}
            </button>
          )}

          {importResult && (
            <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
              <span className="text-green-400 font-medium">Import complete —</span>
              <span className="text-foreground ml-2">Added: {importResult.added}</span>
              {importResult.failed > 0 && (
                <span className="text-destructive ml-2">Failed: {importResult.failed}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BACKUP & RESTORE TAB ── */}
      {tab === "backup" && (
        <div className="max-w-2xl space-y-5">

          {/* Backup */}
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-sm font-medium mb-1">Backup All Data</p>
            <p className="text-xs text-muted mb-4">
              Export ทุก collection เป็น JSON ไฟล์เดียว — สามารถใช้ Restore กลับได้
            </p>
            <p className="text-xs text-muted mb-4">
              Collections: {BACKUP_COLLECTIONS.join(", ")}
            </p>
            <button
              onClick={handleBackup}
              disabled={backing}
              className="rounded-lg bg-accent text-accent-foreground px-5 py-2 text-sm font-medium
                hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {backing ? "Exporting..." : "Download Backup JSON"}
            </button>
          </div>

          {/* Restore */}
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-sm font-medium mb-1">Restore from Backup</p>
            <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400">
              คำเตือน: Restore จะเขียนทับข้อมูลที่มี ID ตรงกัน (merge) ข้อมูลที่ไม่มีใน backup จะยังคงอยู่
            </div>
            <input ref={restoreRef} type="file" accept=".json"
              onChange={handleRestoreFile}
              className="block w-full text-sm text-muted mb-4
                file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border
                file:text-xs file:font-medium file:bg-card-hover file:text-foreground
                hover:file:bg-accent/10 cursor-pointer" />

            {restoreSummary && (
              <div className="mb-4 rounded-lg bg-card-hover border border-border p-3">
                <p className="text-xs font-medium mb-2 text-foreground">Backup summary:</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(restoreSummary).map(([col, count]) => (
                    <div key={col} className="flex justify-between text-xs">
                      <span className="text-muted font-mono">{col}</span>
                      <span className="text-foreground font-medium">{count} records</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {restoreSummary && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="rounded-lg border border-amber-500 text-amber-400 px-5 py-2 text-sm font-medium
                  hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {restoring ? "Restoring..." : "Confirm Restore"}
              </button>
            )}

            {restoreResult && (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
                <p className="text-green-400 font-medium mb-2">Restore complete</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(restoreResult).map(([col, count]) => (
                    <div key={col} className="flex justify-between text-xs">
                      <span className="text-muted font-mono">{col}</span>
                      <span className="text-foreground">{count} records</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
