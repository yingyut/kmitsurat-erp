"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Asset, Customer } from "@/lib/firestore";
import { useCurrentUser } from "@/lib/UserContext";

async function exportAssetsToExcel(rows: Asset[], filename = "assets") {
  const XLSX = await import("xlsx");
  const today = new Date().toISOString().slice(0, 10);
  const PM_LABEL: Record<number, string> = { 1: "รายเดือน", 3: "3 เดือน", 6: "6 เดือน", 12: "รายปี" };
  const STATUS_TH: Record<string, string> = { active: "ใช้งาน", inactive: "ไม่ใช้งาน", maintenance: "ซ่อมบำรุง", decommissioned: "ปลดระวาง" };

  const data = rows.map(a => {
    const wDays = a.warranty_end ? Math.ceil((new Date(a.warranty_end).getTime() - Date.now()) / 86400000) : null;
    const pmDays = a.pm_next_date ? Math.ceil((new Date(a.pm_next_date).getTime() - Date.now()) / 86400000) : null;
    return {
      "KM Number": a.km_number ?? "",
      "Serial Number": a.serial_number ?? "",
      "รุ่นอุปกรณ์": a.device_model ?? "",
      "ยี่ห้อ": a.brand ?? "",
      "ประเภท": a.category ?? "",
      "ลูกค้า": a.customer_name ?? "",
      "โปรเจกต์": a.project_name ?? "",
      "สถานที่": a.location ?? "",
      "ช่างติดตั้ง": a.technician ?? "",
      "วันที่ติดตั้ง": a.install_date ?? "",
      "ประกันเริ่ม": a.warranty_start ?? "",
      "ประกันหมด": a.warranty_end ?? "",
      "ประกัน (วันเหลือ)": wDays !== null ? wDays : "",
      "สถานะประกัน": wDays === null ? "" : wDays < 0 ? "หมดแล้ว" : wDays <= 30 ? "ใกล้หมด" : "ปกติ",
      "SLA": a.sla_level ?? "",
      "เลขสัญญา MA": a.contract_number ?? "",
      "สถานะ": STATUS_TH[a.status] ?? a.status,
      "ความถี่ PM": a.pm_interval_months ? (PM_LABEL[a.pm_interval_months] ?? `${a.pm_interval_months}m`) : "",
      "PM ล่าสุด": a.pm_last_date ?? "",
      "PM ถัดไป": a.pm_next_date ?? "",
      "PM (วันเหลือ)": pmDays !== null ? pmDays : "",
      "สถานะ PM": pmDays === null ? "" : pmDays < 0 ? "เลยกำหนด" : pmDays <= 30 ? "ใกล้ถึง" : "ปกติ",
      "ช่าง PM": a.pm_assigned_to ?? "",
      "หมายเหตุ": a.notes ?? "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  // Column widths
  ws["!cols"] = [14,18,24,14,12,24,24,20,14,14,14,14,12,14,10,16,10,12,12,12,12,12,14,24].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assets");
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
}

// ─── Import helpers ──────────────────────────────────────────────────────────

type ImportRow = {
  km_number: string; serial_number: string; device_model: string;
  brand: string; category: string;
  customer_name: string; customer_id: string;
  project_name: string; location: string; technician: string;
  install_date: string; warranty_start: string; warranty_end: string;
  sla_level: string; contract_number: string; status: string; notes: string;
  pm_interval_months?: number; pm_last_date: string; pm_next_date: string;
  pm_assigned_to: string; pm_notes: string;
  _row: number; _errors: string[]; _warn: string[];
};

const IMPORT_COL_MAP: Record<string, string> = {
  km_number: "km_number", serial_number: "serial_number",
  device_model: "device_model", brand: "brand", category: "category",
  customer_name: "customer_name", project_name: "project_name",
  location: "location", technician: "technician",
  install_date: "install_date", warranty_start: "warranty_start",
  warranty_end: "warranty_end", sla_level: "sla_level", sla: "sla_level",
  contract_number: "contract_number", status: "status", notes: "notes",
  pm_interval_months: "pm_interval_months",
  pm_last_date: "pm_last_date", pm_next_date: "pm_next_date",
  pm_technician: "pm_assigned_to", pm_assigned_to: "pm_assigned_to", pm_notes: "pm_notes",
  // Thai export headers (after normalize: lowercase + spaces→_)
  "รุ่นอุปกรณ์": "device_model", "ยี่ห้อ": "brand", "ประเภท": "category",
  "ลูกค้า": "customer_name", "โปรเจกต์": "project_name", "สถานที่": "location",
  "ช่างติดตั้ง": "technician", "วันที่ติดตั้ง": "install_date",
  "ประกันเริ่ม": "warranty_start", "ประกันหมด": "warranty_end",
  "เลขสัญญา_ma": "contract_number", "สถานะ": "status", "หมายเหตุ": "notes",
  "ความถี่_pm": "pm_interval_months",
  "pm_ล่าสุด": "pm_last_date", "pm_ถัดไป": "pm_next_date",
  "ช่าง_pm": "pm_assigned_to", "หมายเหตุ_pm": "pm_notes",
};

const STATUS_IMPORT: Record<string, string> = {
  "ใช้งาน": "active", active: "active",
  "ไม่ใช้งาน": "inactive", inactive: "inactive",
  "ซ่อมบำรุง": "maintenance", maintenance: "maintenance",
  "ปลดระวาง": "decommissioned", decommissioned: "decommissioned",
};

function parsePMInterval(val: unknown): number | undefined {
  if (!val && val !== 0) return undefined;
  const s = String(val).trim();
  if (s === "1" || s === "รายเดือน") return 1;
  if (s === "3" || s.includes("3 เดือน")) return 3;
  if (s === "6" || s.includes("6 เดือน")) return 6;
  if (s === "12" || s === "รายปี" || s.includes("12 เดือน")) return 12;
  const n = parseInt(s); return isNaN(n) ? undefined : n;
}

async function downloadImportTemplate() {
  const XLSX = await import("xlsx");
  const headers = [
    "KM Number", "Serial Number", "Device Model", "Brand", "Category",
    "Customer Name", "Project Name", "Location", "Technician",
    "Install Date (YYYY-MM-DD)", "Warranty Start (YYYY-MM-DD)", "Warranty End (YYYY-MM-DD)",
    "SLA Level", "Contract Number", "Status (active/inactive/maintenance/decommissioned)",
    "Notes", "PM Interval Months (1/3/6/12)",
    "PM Last Date (YYYY-MM-DD)", "PM Next Date (YYYY-MM-DD)", "PM Technician", "PM Notes",
  ];
  const sample = [
    "KM-2024-0001", "SN123456789", "Cisco C9200L-24P", "Cisco", "Switch",
    "บริษัท ABC จำกัด", "โปรเจกต์ LAN 2024", "ห้อง Server ชั้น 5", "สมชาย ช่าง",
    "2024-01-15", "2024-01-15", "2027-01-14", "NBD", "MA-2024-001", "active",
    "ติดตั้งพร้อมระบบ LAN", "6", "2024-07-01", "2025-01-01", "สมชาย ช่าง", "PM ทุก 6 เดือน",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assets Template");
  XLSX.writeFile(wb, "assets_import_template.xlsx");
}

async function parseAssetFile(file: File, customerList: Customer[]): Promise<ImportRow[]> {
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(data), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const rows: Record<string, unknown>[] = raw.map(row => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      const norm = k.trim().split(" (")[0].trim().toLowerCase().replace(/ /g, "_");
      const field = IMPORT_COL_MAP[norm] ?? IMPORT_COL_MAP[k.trim()];
      if (field) out[field] = v;
    }
    return out;
  });

  return rows.map((row, i) => {
    const errors: string[] = [];
    const warn: string[] = [];
    const serial = String(row.serial_number ?? "").trim();
    const model = String(row.device_model ?? "").trim();
    if (!serial) errors.push("ไม่มี Serial Number");
    if (!model) errors.push("ไม่มี Device Model");

    const custName = String(row.customer_name ?? "").trim();
    const matchedCust = custName
      ? customerList.find(c => c.company_name?.toLowerCase() === custName.toLowerCase())
      : undefined;
    if (custName && !matchedCust) warn.push(`ไม่พบลูกค้า "${custName}" ในระบบ`);

    const rawSt = String(row.status ?? "").trim().toLowerCase();
    const status = STATUS_IMPORT[rawSt] ?? STATUS_IMPORT[String(row.status ?? "").trim()] ?? "active";

    return {
      km_number: String(row.km_number ?? "").trim(),
      serial_number: serial, device_model: model,
      brand: String(row.brand ?? "").trim(),
      category: String(row.category ?? "").trim() || "Other",
      customer_name: custName, customer_id: matchedCust?.id ?? "",
      project_name: String(row.project_name ?? "").trim(),
      location: String(row.location ?? "").trim(),
      technician: String(row.technician ?? "").trim(),
      install_date: String(row.install_date ?? "").trim(),
      warranty_start: String(row.warranty_start ?? "").trim(),
      warranty_end: String(row.warranty_end ?? "").trim(),
      sla_level: String(row.sla_level ?? "").trim(),
      contract_number: String(row.contract_number ?? "").trim(),
      status, notes: String(row.notes ?? "").trim(),
      pm_interval_months: parsePMInterval(row.pm_interval_months),
      pm_last_date: String(row.pm_last_date ?? "").trim(),
      pm_next_date: String(row.pm_next_date ?? "").trim(),
      pm_assigned_to: String(row.pm_assigned_to ?? "").trim(),
      pm_notes: String(row.pm_notes ?? "").trim(),
      _row: i + 2, _errors: errors, _warn: warn,
    };
  });
}

const CATEGORIES = ["Switch", "AP", "Router", "Firewall", "Camera", "NVR/DVR", "Server", "UPS", "Workstation", "Printer", "Other"];
const STATUS_LABEL: Record<string, string> = {
  active: "ใช้งาน", inactive: "ไม่ใช้งาน", maintenance: "ซ่อมบำรุง", decommissioned: "ปลดระวาง",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-900/50 text-green-400",
  inactive: "bg-gray-700 text-gray-400",
  maintenance: "bg-yellow-900/50 text-yellow-400",
  decommissioned: "bg-red-900/50 text-red-400",
};

function warrantyBadge(end?: string) {
  if (!end) return null;
  const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-900/50 text-red-400">หมดประกัน</span>;
  if (days <= 90) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-yellow-900/50 text-yellow-400">หมดใน {days} วัน</span>;
  return <span className="rounded-full px-2 py-0.5 text-[10px] bg-green-900/50 text-green-400">ประกัน OK</span>;
}

function generateKmNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `KM-${year}-${String(seq).padStart(4, "0")}`;
}

const PM_INTERVALS = [
  { val: 1, label: "รายเดือน (1 เดือน)" },
  { val: 3, label: "ราย 3 เดือน" },
  { val: 6, label: "ราย 6 เดือน" },
  { val: 12, label: "รายปี (12 เดือน)" },
];

function calcNextPM(lastDate: string, intervalMonths: number): string {
  if (!lastDate || !intervalMonths) return "";
  const d = new Date(lastDate);
  d.setMonth(d.getMonth() + intervalMonths);
  return d.toISOString().slice(0, 10);
}

function pmBadge(nextDate?: string) {
  if (!nextDate) return null;
  const days = Math.ceil((new Date(nextDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-900/50 text-red-400">PM เลยกำหนด {Math.abs(days)} วัน</span>;
  if (days === 0) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-900/50 text-red-400">PM วันนี้!</span>;
  if (days <= 30) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-amber-900/50 text-amber-400">PM ใน {days} วัน</span>;
  if (days <= 90) return <span className="rounded-full px-2 py-0.5 text-[10px] bg-yellow-900/50 text-yellow-400">PM {nextDate}</span>;
  return <span className="rounded-full px-2 py-0.5 text-[10px] bg-green-900/50 text-green-400">PM {nextDate}</span>;
}

const EMPTY: Omit<Asset, "id" | "tenant_id" | "created_at"> = {
  km_number: "", serial_number: "", device_model: "", brand: "", category: "Switch",
  customer_id: "", customer_name: "", project_id: "", project_name: "",
  contract_id: "", contract_number: "",
  install_date: "", location: "", technician: "",
  warranty_start: "", warranty_end: "", sla_level: "",
  status: "active", notes: "",
  pm_interval_months: undefined, pm_last_date: "", pm_next_date: "",
  pm_assigned_to: "", pm_notes: "",
};

export default function AssetsPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; failed: number } | null>(null);

  const canManage = hasPermission("manage_assets");
  const canView = hasPermission("view_assets") || canManage;

  // no-op — ข้อมูลอัปเดตอัตโนมัติผ่าน onSnapshot subscriptions
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function load() {}

  useEffect(() => {
    setMounted(true);
    const unsubs: Array<() => void> = [];
    let firstSnap = true;
    (async () => {
      const fs = await import("@/lib/firestore");
      unsubs.push(
        fs.assets.subscribe(data => {
          setAssets(data);
          if (firstSnap) { setLoading(false); firstSnap = false; }
        }),
        fs.customers.subscribe(data => setCustomers(data)),
      );
    })();
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canView) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  const user = currentUser!;

  // Service Technician sees only own assets (technician field matches name)
  const isTechOnly = user.role === "Service Technician" && !canManage;
  const baseList = isTechOnly
    ? assets.filter(a => a.technician === user.name || a.technician === user.nickname)
    : assets;

  const filtered = baseList.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      a.km_number?.toLowerCase().includes(s) ||
      a.serial_number?.toLowerCase().includes(s) ||
      a.device_model?.toLowerCase().includes(s) ||
      a.brand?.toLowerCase().includes(s) ||
      a.customer_name?.toLowerCase().includes(s) ||
      a.project_name?.toLowerCase().includes(s) ||
      a.location?.toLowerCase().includes(s);
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    const matchSt = statusFilter === "all" || a.status === statusFilter;
    const matchCust = customerFilter === "all" || a.customer_id === customerFilter;
    return matchSearch && matchCat && matchSt && matchCust;
  });

  const usedCategories = [...new Set(assets.map(a => a.category).filter(Boolean))].sort();
  const usedCustomers = customers.filter(c => assets.some(a => a.customer_id === c.id)).sort((a, b) => a.company_name.localeCompare(b.company_name));

  function openCreate() {
    setEditAsset(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  }

  function openEdit(a: Asset) {
    setEditAsset(a);
    setForm({
      km_number: a.km_number ?? "",
      serial_number: a.serial_number ?? "",
      device_model: a.device_model ?? "",
      brand: a.brand ?? "",
      category: a.category ?? "Switch",
      customer_id: a.customer_id ?? "",
      customer_name: a.customer_name ?? "",
      project_id: a.project_id ?? "",
      project_name: a.project_name ?? "",
      contract_id: a.contract_id ?? "",
      contract_number: a.contract_number ?? "",
      install_date: a.install_date ?? "",
      location: a.location ?? "",
      technician: a.technician ?? "",
      warranty_start: a.warranty_start ?? "",
      warranty_end: a.warranty_end ?? "",
      sla_level: a.sla_level ?? "",
      status: a.status ?? "active",
      notes: a.notes ?? "",
      pm_interval_months: a.pm_interval_months,
      pm_last_date: a.pm_last_date ?? "",
      pm_next_date: a.pm_next_date ?? "",
      pm_assigned_to: a.pm_assigned_to ?? "",
      pm_notes: a.pm_notes ?? "",
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.serial_number.trim() || !form.device_model.trim() || !form.customer_id) {
      alert("กรุณากรอก Serial Number, รุ่นอุปกรณ์ และลูกค้า");
      return;
    }
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editAsset?.id) {
        await fs.assets.update(editAsset.id, {
          ...form,
          updated_at: new Date().toISOString().slice(0, 10),
        });
        await fs.logActivity({
          user_name: user.name, user_role: user.role,
          module: "assets", action: "update",
          resource_id: editAsset.id, resource_name: form.km_number || form.serial_number,
          details: `แก้ไข Asset: ${form.km_number} (${form.device_model})`,
        });
      } else {
        // Auto-generate KM number
        const seq = assets.length + 1;
        const kmNum = form.km_number.trim() || generateKmNumber(seq);
        const docRef = await fs.assets.add({
          ...form,
          km_number: kmNum,
          created_by: user.name,
          updated_at: new Date().toISOString().slice(0, 10),
        });
        await fs.logActivity({
          user_name: user.name, user_role: user.role,
          module: "assets", action: "create",
          resource_id: (docRef as { id?: string }).id,
          resource_name: kmNum,
          details: `เพิ่ม Asset: ${kmNum} — ${form.device_model} (${form.serial_number})`,
        });
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert("❌ บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally { setSaving(false); }
  }

  async function handleDelete(a: Asset) {
    if (!a.id) return;
    if (!confirm(`ลบ Asset ${a.km_number} (${a.device_model}) ใช่หรือไม่?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.assets.remove(a.id);
    await fs.logActivity({
      user_name: user.name, user_role: user.role,
      module: "assets", action: "delete",
      resource_id: a.id, resource_name: a.km_number,
      details: `ลบ Asset: ${a.km_number} — ${a.device_model}`,
    });
    setAssets(prev => prev.filter(x => x.id !== a.id));
  }

  async function handleImportFile(file: File) {
    setImportParsing(true);
    setImportResult(null);
    setImportPreview([]);
    const rows = await parseAssetFile(file, customers);
    setImportPreview(rows);
    setImportParsing(false);
  }

  async function doImport() {
    const validRows = importPreview.filter(r => r._errors.length === 0);
    if (!validRows.length) return;
    setImporting(true);
    try {
      const fb = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const today = new Date().toISOString().slice(0, 10);
      let added = 0; let failed = 0;
      for (let i = 0; i < validRows.length; i += 400) {
        const chunk = validRows.slice(i, i + 400);
        const batch = fb.writeBatch(db);
        for (const row of chunk) {
          try {
            const kmNum = row.km_number || generateKmNumber(assets.length + added + 1);
            const ref = fb.doc(fb.collection(db, "assets"));
            const { _row, _errors, _warn, ...data } = row;
            void _row; void _errors; void _warn;
            batch.set(ref, { ...data, km_number: kmNum, tenant_id: "kmitsurat", created_at: today, updated_at: today });
            added++;
          } catch { failed++; }
        }
        await batch.commit();
      }
      const fs = await import("@/lib/firestore");
      await fs.logActivity({
        user_name: user.name, user_role: user.role,
        module: "assets", action: "import",
        resource_name: "import_excel",
        details: `Import Asset Excel: เพิ่ม ${added} รายการ (ข้าม ${importPreview.length - validRows.length} error)`,
      });
      setImportResult({ added, failed });
    } catch (e) {
      console.error(e);
      alert("❌ Import ไม่สำเร็จ กรุณาลองใหม่");
    } finally { setImporting(false); }
  }

  const cust = customers.find(c => c.id === form.customer_id);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" title="ติดตามอุปกรณ์และ Serial Number">Assets & Serial Tracking</h1>
          <p className="text-xs text-muted">ติดตามอุปกรณ์ที่ติดตั้ง — KM Number, Serial, ประกัน, MA, ประวัติการซ่อม</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {}} disabled className="rounded-lg border border-border px-3 py-2 text-xs text-muted opacity-50 cursor-not-allowed hidden">
            ↺ Refresh
          </button>
          <button
            onClick={async () => {
              await exportAssetsToExcel(filtered, "assets_report");
              const fs = await import("@/lib/firestore");
              await fs.logActivity({ user_name: user.name, user_role: user.role, module: "assets", action: "export", resource_name: "assets_report", details: `Export Asset Excel ${filtered.length} รายการ` });
            }}
            className="rounded-lg border border-green-700/50 px-3 py-2 text-xs text-green-400 hover:bg-green-900/20"
            title="Export รายการอุปกรณ์ที่กรองแล้วเป็น Excel"
          >
            📥 Export Excel
          </button>
          {canManage && (
            <>
              <button
                onClick={() => { setShowImport(true); setImportPreview([]); setImportResult(null); }}
                className="rounded-lg border border-blue-700/50 px-3 py-2 text-xs text-blue-400 hover:bg-blue-900/20"
                title="Import Asset จากไฟล์ Excel"
              >
                📤 Import Excel
              </button>
              <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/80">
                + เพิ่มอุปกรณ์
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          placeholder="ค้นหา KM, Serial, รุ่น, ลูกค้า, สถานที่..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกประเภท</option>
          {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกสถานะ</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกลูกค้า</option>
          {usedCustomers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        {(search || categoryFilter !== "all" || statusFilter !== "all" || customerFilter !== "all") && (
          <button onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setCustomerFilter("all"); }} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">✕ ล้าง</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "ทั้งหมด", val: baseList.length, color: "text-foreground" },
          { label: "ใช้งาน", val: baseList.filter(a => a.status === "active").length, color: "text-green-400" },
          { label: "หมดประกัน", val: baseList.filter(a => a.warranty_end && new Date(a.warranty_end) < new Date()).length, color: "text-red-400" },
          { label: "ประกันใกล้หมด", val: baseList.filter(a => { if (!a.warranty_end) return false; const d = Math.ceil((new Date(a.warranty_end).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 90; }).length, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">อุปกรณ์ ({filtered.length})</p>
            <p className="text-xs text-muted">ทั้งหมด {baseList.length} รายการ</p>
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted text-sm p-4">ไม่พบอุปกรณ์</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted uppercase">
                    <th className="px-4 py-2.5">KM Number</th>
                    <th className="px-4 py-2.5">Serial / รุ่น</th>
                    <th className="px-4 py-2.5">ประเภท</th>
                    <th className="px-4 py-2.5">ลูกค้า</th>
                    <th className="px-4 py-2.5">สถานที่</th>
                    <th className="px-4 py-2.5">ประกัน</th>
                    <th className="px-4 py-2.5">PM ถัดไป</th>
                    <th className="px-4 py-2.5">สถานะ</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id ?? i} className="border-b border-border last:border-0 hover:bg-card-hover">
                      <td className="px-4 py-2">
                        <button onClick={() => router.push(`/assets/${a.id}`)} className="font-mono text-xs font-semibold text-accent hover:underline">
                          {a.km_number || "—"}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <p className="text-xs font-medium">{a.device_model}</p>
                        <p className="text-[10px] text-muted font-mono">{a.serial_number}</p>
                        {a.brand && <p className="text-[10px] text-muted">{a.brand}</p>}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted">{a.category}</td>
                      <td className="px-4 py-2">
                        <p className="text-xs">{a.customer_name}</p>
                        {a.project_name && <p className="text-[10px] text-muted truncate max-w-[140px]">{a.project_name}</p>}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted max-w-[120px] truncate" title={a.location}>{a.location || "—"}</td>
                      <td className="px-4 py-2">
                        {a.warranty_end ? (
                          <div>
                            {warrantyBadge(a.warranty_end)}
                            <p className="text-[10px] text-muted mt-0.5">{a.warranty_end}</p>
                          </div>
                        ) : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        {a.pm_next_date ? (
                          <div>
                            {pmBadge(a.pm_next_date)}
                          </div>
                        ) : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[a.status] || "bg-gray-700 text-gray-400"}`}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => router.push(`/assets/${a.id}`)} className="rounded px-2 py-1 text-[10px] bg-card border border-border hover:bg-card-hover">ดู</button>
                          {canManage && (
                            <>
                              <button onClick={() => openEdit(a)} className="rounded px-2 py-1 text-[10px] bg-card border border-border hover:bg-card-hover">แก้ไข</button>
                              <button onClick={() => handleDelete(a)} className="rounded px-2 py-1 text-[10px] text-danger border border-danger/30 hover:bg-danger/10">ลบ</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-base">{editAsset ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {/* KM Number + Serial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">KM Number <span className="text-muted/60">(ว่าง = สร้างอัตโนมัติ)</span></label>
                  <input value={form.km_number} onChange={e => setForm(f => ({ ...f, km_number: e.target.value }))}
                    placeholder={`KM-${new Date().getFullYear()}-XXXX`}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Serial Number <span className="text-danger">*</span></label>
                  <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                    placeholder="SN: ABC123456"
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
                </div>
              </div>
              {/* Model + Brand + Category */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">รุ่นอุปกรณ์ <span className="text-danger">*</span></label>
                  <input value={form.device_model} onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))}
                    placeholder="Cisco C9200L-24P"
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">ยี่ห้อ</label>
                  <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Cisco, Hikvision..."
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">ประเภท</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {/* Customer */}
              <div>
                <label className="text-xs text-muted mb-1 block">ลูกค้า <span className="text-danger">*</span></label>
                <select value={form.customer_id} onChange={e => {
                  const c = customers.find(x => x.id === e.target.value);
                  setForm(f => ({ ...f, customer_id: e.target.value, customer_name: c?.company_name ?? "" }));
                }} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.sort((a, b) => a.company_name.localeCompare(b.company_name)).map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              {/* Project + Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">ชื่อโปรเจกต์</label>
                  <input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
                    placeholder="WiFi Phase 1..."
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">สถานที่ติดตั้ง</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="ชั้น 3 ห้อง Server..."
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              {/* Install Date + Technician */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">วันที่ติดตั้ง</label>
                  <input type="date" value={form.install_date} onChange={e => setForm(f => ({ ...f, install_date: e.target.value }))}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">ช่างผู้ติดตั้ง</label>
                  <input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))}
                    placeholder="ชื่อช่าง..."
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              {/* Warranty */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">ประกันเริ่ม</label>
                  <input type="date" value={form.warranty_start} onChange={e => setForm(f => ({ ...f, warranty_start: e.target.value }))}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">ประกันหมด</label>
                  <input type="date" value={form.warranty_end} onChange={e => setForm(f => ({ ...f, warranty_end: e.target.value }))}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">SLA</label>
                  <input value={form.sla_level} onChange={e => setForm(f => ({ ...f, sla_level: e.target.value }))}
                    placeholder="8x5 / 24x7 / NBD"
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              {/* Contract Number */}
              <div>
                <label className="text-xs text-muted mb-1 block">เลขสัญญา MA</label>
                <input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))}
                  placeholder="KM-XXXX-XXXX"
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
              </div>
              {/* Status */}
              <div>
                <label className="text-xs text-muted mb-1 block">สถานะ</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Asset["status"] }))}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {/* Notes */}
              <div>
                <label className="text-xs text-muted mb-1 block">หมายเหตุ</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="หมายเหตุเพิ่มเติม..."
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none" />
              </div>

              {/* PM Schedule */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-orange-400 mb-3">🔧 PM Schedule (Preventive Maintenance)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1 block">ความถี่ PM</label>
                    <select
                      value={form.pm_interval_months ?? ""}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        const next = val && form.pm_last_date ? calcNextPM(form.pm_last_date, val) : form.pm_next_date;
                        setForm(f => ({ ...f, pm_interval_months: val, pm_next_date: next ?? "" }));
                      }}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">-- ไม่ตั้ง PM --</option>
                      {PM_INTERVALS.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">ช่างรับผิดชอบ PM</label>
                    <input value={form.pm_assigned_to ?? ""} onChange={e => setForm(f => ({ ...f, pm_assigned_to: e.target.value }))}
                      placeholder="ชื่อช่าง..."
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">PM ล่าสุด</label>
                    <input type="date" value={form.pm_last_date ?? ""} onChange={e => {
                      const last = e.target.value;
                      const next = last && form.pm_interval_months ? calcNextPM(last, form.pm_interval_months) : form.pm_next_date;
                      setForm(f => ({ ...f, pm_last_date: last, pm_next_date: next ?? "" }));
                    }}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">PM ถัดไป <span className="text-muted/60">(คำนวณอัตโนมัติ)</span></label>
                    <input type="date" value={form.pm_next_date ?? ""} onChange={e => setForm(f => ({ ...f, pm_next_date: e.target.value }))}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted mb-1 block">รายการตรวจสอบ / ขอบเขต PM</label>
                  <textarea value={form.pm_notes ?? ""} onChange={e => setForm(f => ({ ...f, pm_notes: e.target.value }))}
                    rows={2} placeholder="เช่น ทำความสะอาด, ตรวจสอบ firmware, ทดสอบ failover..."
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">📤 Import Asset จาก Excel</h2>
              <button onClick={() => { setShowImport(false); setImportPreview([]); setImportResult(null); }} className="text-muted hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {/* Template */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <span className="text-lg">📋</span>
                <div className="flex-1">
                  <p className="text-xs font-medium">ดาวน์โหลด Template ก่อน</p>
                  <p className="text-[10px] text-muted">ต้องกรอก Serial Number และ Device Model — ช่อง Customer Name ต้องตรงกับชื่อในระบบเพื่อ link อัตโนมัติ</p>
                </div>
                <button onClick={downloadImportTemplate} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover whitespace-nowrap">
                  📥 Template.xlsx
                </button>
              </div>

              {/* File picker */}
              <div>
                <label className="text-xs text-muted mb-1.5 block">เลือกไฟล์ (.xlsx, .xls, .csv)</label>
                <input
                  type="file" accept=".xlsx,.xls,.csv"
                  onChange={async e => { const f = e.target.files?.[0]; if (f) await handleImportFile(f); }}
                  className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-accent/20 file:text-accent hover:file:bg-accent/30 cursor-pointer"
                />
                {importParsing && <p className="text-xs text-muted mt-1 animate-pulse">กำลังอ่านไฟล์...</p>}
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">พบ {importPreview.length} รายการ</p>
                    {importPreview.filter(r => r._errors.length > 0).length > 0 && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] bg-red-900/50 text-red-400">
                        ❌ {importPreview.filter(r => r._errors.length > 0).length} รายการมีข้อผิดพลาด (จะถูกข้าม)
                      </span>
                    )}
                    {importPreview.filter(r => r._warn.length > 0 && r._errors.length === 0).length > 0 && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] bg-yellow-900/50 text-yellow-400">
                        ⚠ {importPreview.filter(r => r._warn.length > 0 && r._errors.length === 0).length} คำเตือน
                      </span>
                    )}
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] bg-green-900/50 text-green-400">
                      ✓ {importPreview.filter(r => r._errors.length === 0).length} พร้อมนำเข้า
                    </span>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-card/80 border-b border-border text-left text-muted uppercase sticky top-0">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Serial</th>
                            <th className="px-3 py-2">Device Model</th>
                            <th className="px-3 py-2">ลูกค้า</th>
                            <th className="px-3 py-2">สถานะ</th>
                            <th className="px-3 py-2">หมายเหตุ / ข้อผิดพลาด</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(0, 100).map((r, i) => (
                            <tr key={i} className={`border-b border-border last:border-0 ${r._errors.length > 0 ? "bg-red-900/10" : r._warn.length > 0 ? "bg-yellow-900/5" : ""}`}>
                              <td className="px-3 py-1.5 text-muted">{r._row}</td>
                              <td className="px-3 py-1.5 font-mono">{r.serial_number || <span className="text-danger">—</span>}</td>
                              <td className="px-3 py-1.5">{r.device_model || <span className="text-danger">—</span>}</td>
                              <td className="px-3 py-1.5 text-muted max-w-[120px] truncate">
                                {r.customer_name || "—"}
                                {r.customer_id && <span className="ml-1 text-green-400">✓</span>}
                              </td>
                              <td className="px-3 py-1.5">
                                {r._errors.length > 0
                                  ? <span className="text-danger text-[10px]">❌ ข้าม</span>
                                  : <span className="text-green-400 text-[10px]">✓ นำเข้า</span>}
                              </td>
                              <td className="px-3 py-1.5 max-w-[200px]">
                                {r._errors.map((e, j) => <p key={j} className="text-danger">{e}</p>)}
                                {r._warn.map((w, j) => <p key={j} className="text-yellow-400">{w}</p>)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importPreview.length > 100 && (
                      <p className="text-xs text-muted px-3 py-2 border-t border-border">... และอีก {importPreview.length - 100} รายการ</p>
                    )}
                  </div>
                </>
              )}

              {/* Result */}
              {importResult && (
                <div className="rounded-lg bg-green-900/20 border border-green-800/50 p-4">
                  <p className="text-sm font-semibold text-green-400">✅ Import สำเร็จ!</p>
                  <p className="text-xs text-muted mt-1">เพิ่มอุปกรณ์แล้ว <span className="text-foreground font-medium">{importResult.added}</span> รายการ{importResult.failed > 0 ? ` · ล้มเหลว ${importResult.failed} รายการ` : ""}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {importResult ? `นำเข้าสำเร็จ ${importResult.added} รายการ`
                  : importPreview.filter(r => r._errors.length === 0).length > 0
                  ? `จะนำเข้า ${importPreview.filter(r => r._errors.length === 0).length} รายการ`
                  : importPreview.length > 0 ? "ไม่มีรายการที่นำเข้าได้"
                  : "เลือกไฟล์เพื่อดูตัวอย่าง"}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setShowImport(false); setImportPreview([]); setImportResult(null); }} className="rounded-lg border border-border px-4 py-2 text-xs text-muted hover:bg-card-hover">
                  {importResult ? "ปิด" : "ยกเลิก"}
                </button>
                {!importResult && importPreview.filter(r => r._errors.length === 0).length > 0 && (
                  <button onClick={doImport} disabled={importing} className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-50">
                    {importing ? "กำลังนำเข้า..." : `✅ นำเข้า ${importPreview.filter(r => r._errors.length === 0).length} รายการ`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
