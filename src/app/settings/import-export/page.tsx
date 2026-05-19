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

// ── sample data ───────────────────────────────────────────────
type SampleProduct = { code: string; name: string; brand: string; category: string; unit: string; cost_price: number; selling_price: number; type: string; active: boolean };
type SampleAsset = { km_number: string; serial_number: string; device_model: string; brand: string; category: string; customer_name: string; customer_id: string; project_name: string; install_date: string; location: string; technician: string; warranty_start: string; warranty_end: string; sla_level: string; status: string; notes: string; pm_interval_months: number; pm_last_date: string; pm_next_date: string; pm_assigned_to: string };

const SAMPLE_PRODUCTS: SampleProduct[] = [
  { code: "CAM-HIK-2CD2143", name: "Hikvision DS-2CD2143G2-I กล้อง IP 4MP IR 40m", brand: "Hikvision", category: "Camera", unit: "ตัว", cost_price: 2200, selling_price: 3200, type: "product", active: true },
  { code: "CAM-HIK-2CD2183", name: "Hikvision DS-2CD2183G2-I กล้อง IP 8MP IR 40m", brand: "Hikvision", category: "Camera", unit: "ตัว", cost_price: 3800, selling_price: 5500, type: "product", active: true },
  { code: "CAM-HIK-2CD2347", name: "Hikvision DS-2CD2347G2-LU กล้อง IP ColorVu 4MP", brand: "Hikvision", category: "Camera", unit: "ตัว", cost_price: 4200, selling_price: 6200, type: "product", active: true },
  { code: "CAM-DAH-SDT", name: "Dahua SD49425XB-HNR กล้อง IP Speed Dome 4MP AI", brand: "Dahua", category: "Camera", unit: "ตัว", cost_price: 12000, selling_price: 17500, type: "product", active: true },
  { code: "NVR-HIK-7616NI", name: "Hikvision DS-7616NI-K2/16P NVR 16CH PoE 4K", brand: "Hikvision", category: "NVR", unit: "เครื่อง", cost_price: 8500, selling_price: 12500, type: "product", active: true },
  { code: "NVR-HIK-7608NI", name: "Hikvision DS-7608NI-Q2/8P NVR 8CH PoE 4K", brand: "Hikvision", category: "NVR", unit: "เครื่อง", cost_price: 5500, selling_price: 8200, type: "product", active: true },
  { code: "SW-CSC-SG35028", name: "Cisco SG350-28 Managed Switch 24-Port Gigabit", brand: "Cisco", category: "Switch", unit: "เครื่อง", cost_price: 14500, selling_price: 20000, type: "product", active: true },
  { code: "SW-CSC-CBS35024", name: "Cisco CBS350-24T-4G Managed Switch 24-Port", brand: "Cisco", category: "Switch", unit: "เครื่อง", cost_price: 9800, selling_price: 14500, type: "product", active: true },
  { code: "SW-DLK-DGS1210", name: "D-Link DGS-1210-28 Smart Managed Switch 24-Port", brand: "D-Link", category: "Switch", unit: "เครื่อง", cost_price: 4200, selling_price: 6500, type: "product", active: true },
  { code: "AP-UBI-U6LITE", name: "Ubiquiti UniFi U6 Lite Dual-Band Wi-Fi 6 AP", brand: "Ubiquiti", category: "Access Point", unit: "ตัว", cost_price: 2800, selling_price: 4200, type: "product", active: true },
  { code: "AP-UBI-U6PRO", name: "Ubiquiti UniFi U6 Pro Dual-Band Wi-Fi 6 AP", brand: "Ubiquiti", category: "Access Point", unit: "ตัว", cost_price: 4500, selling_price: 6800, type: "product", active: true },
  { code: "SRV-HP-DL380G10", name: "HP ProLiant DL380 Gen10 Rack Server 2U", brand: "HP", category: "Server", unit: "เครื่อง", cost_price: 85000, selling_price: 120000, type: "product", active: true },
  { code: "SRV-DELL-R750", name: "Dell PowerEdge R750 Rack Server 2U Dual Xeon", brand: "Dell", category: "Server", unit: "เครื่อง", cost_price: 95000, selling_price: 135000, type: "product", active: true },
  { code: "UPS-APC-SRT1500", name: "APC Smart-UPS SRT 1500VA Online UPS", brand: "APC", category: "UPS", unit: "เครื่อง", cost_price: 18000, selling_price: 25000, type: "product", active: true },
  { code: "UPS-APC-BR1200", name: "APC Back-UPS BR1200SI 1200VA Line-Interactive", brand: "APC", category: "UPS", unit: "เครื่อง", cost_price: 4500, selling_price: 6500, type: "product", active: true },
  { code: "CABLE-CAT6-BOX", name: "สายแลน CAT6 UTP กล่อง 305 เมตร", brand: "Panduit", category: "Cable", unit: "กล่อง", cost_price: 1200, selling_price: 1800, type: "product", active: true },
  { code: "PP-AMP-24P", name: "AMP CAT6 Patch Panel 24-Port 1U", brand: "AMP", category: "Infrastructure", unit: "ชุด", cost_price: 1800, selling_price: 2800, type: "product", active: true },
  { code: "SVC-INSTALL-CAM", name: "ค่าแรงติดตั้งกล้อง CCTV (ต่อจุด)", brand: "-", category: "Service", unit: "จุด", cost_price: 350, selling_price: 600, type: "service", active: true },
  { code: "SVC-INSTALL-NET", name: "ค่าแรงติดตั้งระบบ Network (ต่อจุด)", brand: "-", category: "Service", unit: "จุด", cost_price: 300, selling_price: 500, type: "service", active: true },
  { code: "SVC-MA-ANNUAL", name: "ค่าบำรุงรักษาระบบ (MA) รายปี", brand: "-", category: "Service", unit: "ระบบ", cost_price: 5000, selling_price: 9000, type: "service", active: true },
];

const SAMPLE_ASSETS: SampleAsset[] = [
  { km_number: "KM-2024-0001", serial_number: "HIK24000123", device_model: "DS-2CD2143G2-I", brand: "Hikvision", category: "Camera", customer_name: "บริษัท ทดสอบ จำกัด", customer_id: "", project_name: "ติดตั้งกล้อง CCTV อาคาร A", install_date: "2024-03-15", location: "ชั้น 1 ล็อบบี้", technician: "สมชาย ใจดี", warranty_start: "2024-03-15", warranty_end: "2026-03-14", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 6, pm_last_date: "2025-09-15", pm_next_date: "2026-03-15", pm_assigned_to: "สมชาย ใจดี" },
  { km_number: "KM-2024-0002", serial_number: "HIK24000124", device_model: "DS-2CD2143G2-I", brand: "Hikvision", category: "Camera", customer_name: "บริษัท ทดสอบ จำกัด", customer_id: "", project_name: "ติดตั้งกล้อง CCTV อาคาร A", install_date: "2024-03-15", location: "ชั้น 1 ทางเข้าหลัก", technician: "สมชาย ใจดี", warranty_start: "2024-03-15", warranty_end: "2026-03-14", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 6, pm_last_date: "2025-09-15", pm_next_date: "2026-03-15", pm_assigned_to: "สมชาย ใจดี" },
  { km_number: "KM-2024-0003", serial_number: "HIK24NVR001", device_model: "DS-7616NI-K2/16P", brand: "Hikvision", category: "NVR", customer_name: "บริษัท ทดสอบ จำกัด", customer_id: "", project_name: "ติดตั้งกล้อง CCTV อาคาร A", install_date: "2024-03-15", location: "ห้อง Server ชั้น 2", technician: "สมชาย ใจดี", warranty_start: "2024-03-15", warranty_end: "2027-03-14", sla_level: "8x5NBD", status: "active", notes: "HDD 4TB x2", pm_interval_months: 12, pm_last_date: "2025-03-15", pm_next_date: "2026-03-15", pm_assigned_to: "สมชาย ใจดี" },
  { km_number: "KM-2024-0004", serial_number: "CSC240056789", device_model: "SG350-28", brand: "Cisco", category: "Switch", customer_name: "โรงแรมสุราษฎร์แกรนด์", customer_id: "", project_name: "ระบบ Network โรงแรม", install_date: "2024-06-01", location: "ห้อง MDF ชั้น 1", technician: "วิชัย รักดี", warranty_start: "2024-06-01", warranty_end: "2027-05-31", sla_level: "24x7", status: "active", notes: "Core switch ชั้น 1", pm_interval_months: 6, pm_last_date: "2025-12-01", pm_next_date: "2026-06-01", pm_assigned_to: "วิชัย รักดี" },
  { km_number: "KM-2024-0005", serial_number: "UBI2024001", device_model: "UniFi U6 Lite", brand: "Ubiquiti", category: "Access Point", customer_name: "โรงแรมสุราษฎร์แกรนด์", customer_id: "", project_name: "ระบบ Network โรงแรม", install_date: "2024-06-01", location: "ชั้น 1 Lobby", technician: "วิชัย รักดี", warranty_start: "2024-06-01", warranty_end: "2025-05-31", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 12, pm_last_date: "2025-06-01", pm_next_date: "2026-06-01", pm_assigned_to: "วิชัย รักดี" },
  { km_number: "KM-2024-0006", serial_number: "UBI2024002", device_model: "UniFi U6 Lite", brand: "Ubiquiti", category: "Access Point", customer_name: "โรงแรมสุราษฎร์แกรนด์", customer_id: "", project_name: "ระบบ Network โรงแรม", install_date: "2024-06-01", location: "ชั้น 2 ห้องประชุม", technician: "วิชัย รักดี", warranty_start: "2024-06-01", warranty_end: "2025-05-31", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 12, pm_last_date: "2025-06-01", pm_next_date: "2026-06-01", pm_assigned_to: "วิชัย รักดี" },
  { km_number: "KM-2023-0001", serial_number: "HP23SRV0091", device_model: "ProLiant DL380 Gen10", brand: "HP", category: "Server", customer_name: "โรงพยาบาลเมืองสุราษฎร์", customer_id: "", project_name: "ระบบ Server Virtualization", install_date: "2023-11-20", location: "Data Center ชั้น B1", technician: "ประสิทธิ์ เก่งมาก", warranty_start: "2023-11-20", warranty_end: "2026-11-19", sla_level: "24x7", status: "active", notes: "VMware ESXi 8.0, RAM 256GB", pm_interval_months: 3, pm_last_date: "2026-02-20", pm_next_date: "2026-05-20", pm_assigned_to: "ประสิทธิ์ เก่งมาก" },
  { km_number: "KM-2023-0002", serial_number: "APC23UPS001", device_model: "Smart-UPS SRT1500", brand: "APC", category: "UPS", customer_name: "โรงพยาบาลเมืองสุราษฎร์", customer_id: "", project_name: "ระบบ Server Virtualization", install_date: "2023-11-20", location: "Data Center ชั้น B1", technician: "ประสิทธิ์ เก่งมาก", warranty_start: "2023-11-20", warranty_end: "2025-11-19", sla_level: "24x7", status: "active", notes: "เปลี่ยนแบตเตอรี่ปี 2026", pm_interval_months: 6, pm_last_date: "2025-11-20", pm_next_date: "2026-05-20", pm_assigned_to: "ประสิทธิ์ เก่งมาก" },
  { km_number: "KM-2022-0005", serial_number: "DAH22CAM005", device_model: "DS-2CD2183G2-I", brand: "Hikvision", category: "Camera", customer_name: "ห้างสรรพสินค้า วัน", customer_id: "", project_name: "ระบบ CCTV ห้างสรรพสินค้า", install_date: "2022-07-10", location: "ชั้น G ลานจอดรถ", technician: "สมชาย ใจดี", warranty_start: "2022-07-10", warranty_end: "2024-07-09", sla_level: "8x5", status: "active", notes: "ประกันหมดแล้ว — รอต่อ MA", pm_interval_months: 6, pm_last_date: "2025-07-10", pm_next_date: "2026-01-10", pm_assigned_to: "สมชาย ใจดี" },
  { km_number: "KM-2022-0006", serial_number: "DAH22NVR001", device_model: "DS-7608NI-Q2/8P", brand: "Hikvision", category: "NVR", customer_name: "ห้างสรรพสินค้า วัน", customer_id: "", project_name: "ระบบ CCTV ห้างสรรพสินค้า", install_date: "2022-07-10", location: "ห้องควบคุม ชั้น 3", technician: "สมชาย ใจดี", warranty_start: "2022-07-10", warranty_end: "2025-07-09", sla_level: "8x5", status: "maintenance", notes: "อยู่ระหว่างซ่อม HDD เสีย", pm_interval_months: 12, pm_last_date: "2025-07-10", pm_next_date: "2026-07-10", pm_assigned_to: "สมชาย ใจดี" },
  { km_number: "KM-2025-0001", serial_number: "CSC25SW0001", device_model: "CBS350-24T-4G", brand: "Cisco", category: "Switch", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", customer_id: "", project_name: "ระบบ Network อาคารเรียน 1", install_date: "2025-01-15", location: "อาคาร 1 ชั้น 1 MDF", technician: "วิชัย รักดี", warranty_start: "2025-01-15", warranty_end: "2028-01-14", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 6, pm_last_date: "2025-07-15", pm_next_date: "2026-01-15", pm_assigned_to: "วิชัย รักดี" },
  { km_number: "KM-2025-0002", serial_number: "UBI25AP0001", device_model: "UniFi U6 Pro", brand: "Ubiquiti", category: "Access Point", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", customer_id: "", project_name: "ระบบ Network อาคารเรียน 1", install_date: "2025-01-15", location: "อาคาร 1 ชั้น 2", technician: "วิชัย รักดี", warranty_start: "2025-01-15", warranty_end: "2026-01-14", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 12, pm_last_date: "2025-01-15", pm_next_date: "2026-01-15", pm_assigned_to: "วิชัย รักดี" },
  { km_number: "KM-2025-0003", serial_number: "UBI25AP0002", device_model: "UniFi U6 Pro", brand: "Ubiquiti", category: "Access Point", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", customer_id: "", project_name: "ระบบ Network อาคารเรียน 1", install_date: "2025-01-15", location: "อาคาร 1 ชั้น 3", technician: "วิชัย รักดี", warranty_start: "2025-01-15", warranty_end: "2026-01-14", sla_level: "8x5NBD", status: "active", notes: "", pm_interval_months: 12, pm_last_date: "2025-01-15", pm_next_date: "2026-01-15", pm_assigned_to: "วิชัย รักดี" },
  { km_number: "KM-2024-0010", serial_number: "APC24UPS010", device_model: "Back-UPS BR1200SI", brand: "APC", category: "UPS", customer_name: "สำนักงานเทศบาลเมืองสุราษฎร์ธานี", customer_id: "", project_name: "ระบบ CCTV เทศบาล", install_date: "2024-09-01", location: "ห้องควบคุม ชั้น 2", technician: "สมชาย ใจดี", warranty_start: "2024-09-01", warranty_end: "2026-08-31", sla_level: "8x5", status: "active", notes: "", pm_interval_months: 12, pm_last_date: "2025-09-01", pm_next_date: "2026-09-01", pm_assigned_to: "สมชาย ใจดี" },
  { km_number: "KM-2024-0011", serial_number: "DLK24SW001", device_model: "DGS-1210-28", brand: "D-Link", category: "Switch", customer_name: "สำนักงานเทศบาลเมืองสุราษฎร์ธานี", customer_id: "", project_name: "ระบบ Network เทศบาล", install_date: "2024-09-01", location: "ห้อง Server ชั้น 1", technician: "วิชัย รักดี", warranty_start: "2024-09-01", warranty_end: "2026-08-31", sla_level: "8x5", status: "active", notes: "", pm_interval_months: 6, pm_last_date: "2025-09-01", pm_next_date: "2026-03-01", pm_assigned_to: "วิชัย รักดี" },
];

async function seedSampleProducts(): Promise<{ added: number; skipped: number }> {
  const fb = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  let added = 0; let skipped = 0;
  // Check existing to avoid duplicates
  const q = fb.query(fb.collection(db, "products"), fb.where("tenant_id", "==", "kmitsurat"));
  const snap = await fb.getDocs(q);
  const existingCodes = new Set(snap.docs.map(d => d.data().code as string));
  const batch = fb.writeBatch(db);
  for (const p of SAMPLE_PRODUCTS) {
    if (existingCodes.has(p.code) && p.code) { skipped++; continue; }
    const ref = fb.doc(fb.collection(db, "products"));
    batch.set(ref, { ...p, tenant_id: "kmitsurat", created_at: new Date() });
    added++;
  }
  await batch.commit();
  return { added, skipped };
}

async function seedSampleAssets(): Promise<{ added: number; skipped: number }> {
  const fb = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  let added = 0; let skipped = 0;
  const q = fb.query(fb.collection(db, "assets"), fb.where("tenant_id", "==", "kmitsurat"));
  const snap = await fb.getDocs(q);
  const existingKMs = new Set(snap.docs.map(d => d.data().km_number as string));
  const batch = fb.writeBatch(db);
  for (const a of SAMPLE_ASSETS) {
    if (existingKMs.has(a.km_number)) { skipped++; continue; }
    const ref = fb.doc(fb.collection(db, "assets"));
    batch.set(ref, { ...a, tenant_id: "kmitsurat", created_at: new Date() });
    added++;
  }
  await batch.commit();
  return { added, skipped };
}

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

  const [tab, setTab] = useState<"import" | "backup" | "sample">("import");
  const [seedingProd, setSeedingProd] = useState(false);
  const [seedingAsset, setSeedingAsset] = useState(false);
  const [seedProdResult, setSeedProdResult] = useState<{ added: number; skipped: number } | null>(null);
  const [seedAssetResult, setSeedAssetResult] = useState<{ added: number; skipped: number } | null>(null);
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
          { key: "sample", label: "ข้อมูลตัวอย่าง" },
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

      {/* ── SAMPLE DATA TAB ── */}
      {tab === "sample" && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-400">
            ข้อมูลตัวอย่างสำหรับทดสอบระบบ — ระบบจะตรวจสอบและข้ามรายการที่มีอยู่แล้ว (ตาม code / KM number)
          </div>

          {/* Sample Products */}
          <div className="rounded-xl bg-card border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">สินค้าตัวอย่าง (Products)</p>
                <p className="text-xs text-muted mt-0.5">{SAMPLE_PRODUCTS.length} รายการ — กล้อง CCTV, NVR, Switch, AP, Server, UPS, Cable, บริการ</p>
              </div>
              <button
                onClick={async () => {
                  setSeedingProd(true); setSeedProdResult(null);
                  try { setSeedProdResult(await seedSampleProducts()); }
                  finally { setSeedingProd(false); }
                }}
                disabled={seedingProd}
                className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0">
                {seedingProd ? "กำลังสร้าง..." : "สร้างสินค้าตัวอย่าง"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {["Camera", "NVR", "Switch", "Access Point", "Server", "UPS", "Cable", "Infrastructure", "Service"].map(cat => (
                <span key={cat} className="rounded bg-card-hover border border-border px-2 py-0.5 text-[11px] text-muted">{cat} ({SAMPLE_PRODUCTS.filter(p => p.category === cat).length})</span>
              ))}
            </div>
            {seedProdResult && (
              <div className={`rounded-lg border px-3 py-2 text-xs ${seedProdResult.added > 0 ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-border bg-card-hover text-muted"}`}>
                เพิ่มแล้ว {seedProdResult.added} รายการ{seedProdResult.skipped > 0 ? ` · ข้ามที่มีอยู่แล้ว ${seedProdResult.skipped} รายการ` : ""}
              </div>
            )}
          </div>

          {/* Sample Assets */}
          <div className="rounded-xl bg-card border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">อุปกรณ์ติดตั้งตัวอย่าง (Assets)</p>
                <p className="text-xs text-muted mt-0.5">{SAMPLE_ASSETS.length} รายการ — หลายลูกค้า, หลายประเภท, มีทั้งในประกันและหมดประกัน</p>
              </div>
              <button
                onClick={async () => {
                  setSeedingAsset(true); setSeedAssetResult(null);
                  try { setSeedAssetResult(await seedSampleAssets()); }
                  finally { setSeedingAsset(false); }
                }}
                disabled={seedingAsset}
                className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0">
                {seedingAsset ? "กำลังสร้าง..." : "สร้าง Asset ตัวอย่าง"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-card-hover">
                    <th className="text-left px-2 py-1.5 border border-border/40 text-muted font-medium">KM Number</th>
                    <th className="text-left px-2 py-1.5 border border-border/40 text-muted font-medium">รุ่น</th>
                    <th className="text-left px-2 py-1.5 border border-border/40 text-muted font-medium">ประเภท</th>
                    <th className="text-left px-2 py-1.5 border border-border/40 text-muted font-medium">ลูกค้า</th>
                    <th className="text-left px-2 py-1.5 border border-border/40 text-muted font-medium">ประกันถึง</th>
                    <th className="text-left px-2 py-1.5 border border-border/40 text-muted font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ASSETS.map(a => (
                    <tr key={a.km_number} className="hover:bg-card-hover">
                      <td className="px-2 py-1.5 border border-border/30 font-mono text-accent">{a.km_number}</td>
                      <td className="px-2 py-1.5 border border-border/30">{a.device_model}</td>
                      <td className="px-2 py-1.5 border border-border/30 text-muted">{a.category}</td>
                      <td className="px-2 py-1.5 border border-border/30 truncate max-w-[160px]">{a.customer_name}</td>
                      <td className={`px-2 py-1.5 border border-border/30 ${new Date(a.warranty_end) < new Date() ? "text-rose-400" : "text-green-400"}`}>{a.warranty_end}</td>
                      <td className="px-2 py-1.5 border border-border/30">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${a.status === "active" ? "bg-green-500/10 text-green-400" : a.status === "maintenance" ? "bg-amber-500/10 text-amber-400" : "bg-muted/10 text-muted"}`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {seedAssetResult && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${seedAssetResult.added > 0 ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-border bg-card-hover text-muted"}`}>
                เพิ่มแล้ว {seedAssetResult.added} รายการ{seedAssetResult.skipped > 0 ? ` · ข้ามที่มีอยู่แล้ว ${seedAssetResult.skipped} รายการ` : ""}
              </div>
            )}
          </div>
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
