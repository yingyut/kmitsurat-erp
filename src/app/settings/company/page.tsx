"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/UserContext";
import type { CompanySettings } from "@/lib/types";

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

function getQuarterMonths(fyStartMonth: number): { q: number; months: string }[] {
  return [1, 2, 3, 4].map(q => {
    const mNums = [0, 1, 2].map(i => ((fyStartMonth - 1 + (q - 1) * 3 + i) % 12) + 1);
    return { q, months: mNums.map(m => MONTH_NAMES[m - 1]).join(", ") };
  });
}

const DEFAULTS: Omit<CompanySettings, "id" | "tenant_id"> = {
  fiscal_year_start_month: 1,
  company_name: "KMITSURAT CO., LTD.",
  company_address: "",
  company_phone: "",
  company_tax_id: "",
  company_website: "",
  currency: "THB",
  vat_percent: 7,
};

export default function CompanySettingsPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CompanySettings, "id" | "tenant_id">>(DEFAULTS);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || userLoading) return;
    load();
  }, [mounted, userLoading]);

  async function load() {
    setLoading(true);
    try {
      const fs = await import("@/lib/firestore");
      const list = await fs.companySettings.list();
      if (list.length > 0) {
        const { id, tenant_id, ...rest } = list[0];
        setSettingId(id ?? null);
        setForm({ ...DEFAULTS, ...rest });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      const fs = await import("@/lib/firestore");
      const data = { ...form, updated_at: new Date().toISOString().slice(0, 10) };
      if (settingId) {
        await fs.companySettings.update(settingId, data as unknown as Record<string, unknown>);
      } else {
        const ref = await fs.companySettings.add(data as unknown as Record<string, unknown>);
        setSettingId(ref.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted">กรุณาเข้าสู่ระบบ</p></div>;
  if (!hasPermission("manage_system")) return <div className="p-6"><p className="text-muted">ไม่มีสิทธิ์เข้าถึง — ต้องเป็น Administrator หรือ Branch Manager</p></div>;

  const quarters = getQuarterMonths(form.fiscal_year_start_month);

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/settings" className="text-xs text-muted hover:text-foreground">⚙️ Settings</Link>
        <span className="text-muted">/</span>
        <span className="text-xs">Company &amp; Fiscal Year</span>
      </div>
      <h1 className="text-xl font-bold mb-1">Company &amp; Fiscal Year</h1>
      <p className="text-sm text-muted mb-6">ข้อมูลบริษัทและการตั้งค่าปีงบประมาณ — ใช้สำหรับ Dashboard และเอกสาร</p>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="space-y-6">

          {/* Fiscal Year */}
          <div className="rounded-xl bg-card border border-border p-5">
            <h2 className="text-sm font-semibold mb-1">📅 ปีงบประมาณ (Fiscal Year)</h2>
            <p className="text-xs text-muted mb-4">กำหนดว่า Q1 เริ่มต้นเดือนไหน — ส่งผลต่อปุ่ม Q1-Q4 บน Dashboard</p>
            <div className="mb-4">
              <label className="text-xs text-muted block mb-1">Q1 เริ่มต้นเดือน</label>
              <select
                value={form.fiscal_year_start_month}
                onChange={e => setForm({ ...form, fiscal_year_start_month: parseInt(e.target.value) })}
                className="rounded-lg bg-background border border-border px-3 py-2 text-sm w-48"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m} (เดือน {i + 1})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quarters.map(q => (
                <div key={q.q} className="rounded-lg bg-background border border-border px-3 py-2 text-center">
                  <p className="text-xs font-bold text-accent">Q{q.q}</p>
                  <p className="text-[10px] text-muted mt-0.5">{q.months}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Company Info */}
          <div className="rounded-xl bg-card border border-border p-5">
            <h2 className="text-sm font-semibold mb-1">🏢 ข้อมูลบริษัท</h2>
            <p className="text-xs text-muted mb-4">ใช้พิมพ์บนหัวกระดาษใบเสนอราคา / สัญญา / Invoice</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">ชื่อบริษัท</label>
                <input value={form.company_name || ""} onChange={e => setForm({ ...form, company_name: e.target.value })}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" placeholder="KMITSURAT CO., LTD." />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">ที่อยู่</label>
                <textarea value={form.company_address || ""} onChange={e => setForm({ ...form, company_address: e.target.value })}
                  rows={2} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">โทรศัพท์</label>
                  <input value={form.company_phone || ""} onChange={e => setForm({ ...form, company_phone: e.target.value })}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" placeholder="077-xxx-xxxx" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input value={form.company_tax_id || ""} onChange={e => setForm({ ...form, company_tax_id: e.target.value })}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" placeholder="0-xxxx-xxxxx-xx-x" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">เว็บไซต์</label>
                <input value={form.company_website || ""} onChange={e => setForm({ ...form, company_website: e.target.value })}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" placeholder="https://www.kmitsurat.com" />
              </div>
            </div>
          </div>

          {/* Locale */}
          <div className="rounded-xl bg-card border border-border p-5">
            <h2 className="text-sm font-semibold mb-1">💱 สกุลเงิน / VAT</h2>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-muted block mb-1">สกุลเงิน</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value as "THB" | "USD" })}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm">
                  <option value="THB">THB (บาท)</option>
                  <option value="USD">USD (ดอลลาร์)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">VAT (%)</label>
                <input type="number" min={0} max={30} value={form.vat_percent}
                  onChange={e => setForm({ ...form, vat_percent: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="rounded-xl bg-accent text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90">
            {saving ? "กำลังบันทึก..." : saved ? "✓ บันทึกแล้ว" : "บันทึกการตั้งค่า"}
          </button>
        </div>
      )}
    </div>
  );
}
