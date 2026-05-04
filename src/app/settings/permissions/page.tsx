"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { defaultPermissions } from "@/lib/UserContext";

const allModules = [
  { id: "dashboard", label: "Dashboard", thai: "แดชบอร์ด", icon: "📊" },
  { id: "projects", label: "Pipeline", thai: "โอกาสขาย", icon: "🎯" },
  { id: "sales", label: "Activities", thai: "กิจกรรมงานขาย", icon: "📞" },
  { id: "quotations", label: "Quotations", thai: "ใบเสนอราคา", icon: "💰" },
  { id: "sales-workflow", label: "Sales Workflow", thai: "ติดตาม QT", icon: "🔄" },
  { id: "sales-plan", label: "Sales Plan", thai: "แผนยอดขาย", icon: "📈" },
  { id: "presale", label: "Presale", thai: "พรีเซลล์", icon: "📋" },
  { id: "project-management", label: "Project Exec", thai: "ดำเนินโปรเจค", icon: "🗂️" },
  { id: "service", label: "Service", thai: "งานบริการ", icon: "🔧" },
  { id: "contracts", label: "Contracts", thai: "สัญญา/MA", icon: "🛡️" },
  { id: "customers", label: "Customers", thai: "ลูกค้า", icon: "🏢" },
  { id: "vendors", label: "Vendors", thai: "ผู้ขาย", icon: "🏪" },
  { id: "products", label: "Products", thai: "สินค้า", icon: "📦" },
  { id: "users", label: "Users/Teams", thai: "ผู้ใช้", icon: "👥" },
  { id: "reports", label: "Reports", thai: "รายงาน", icon: "📈" },
  { id: "settings", label: "Settings", thai: "ตั้งค่า", icon: "⚙️" },
  { id: "help", label: "Help", thai: "คู่มือ", icon: "📖" },
];

const roles = ["admin", "sale", "avenger", "presale", "service"];
const roleLabels: Record<string, string> = { admin: "Admin (ผู้ดูแล)", sale: "Sales (เซลล์)", avenger: "Avenger", presale: "Presale (พรีเซลล์)", service: "Service (ช่างบริการ)" };

export default function PermissionsPage() {
  const [perms, setPerms] = useState<Record<string, string[]>>(defaultPermissions);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("kmit_permissions");
      if (saved) setPerms(JSON.parse(saved));
    } catch {}
  }, []);

  function toggle(role: string, moduleId: string) {
    if (role === "admin") return; // admin always all
    const arr = perms[role] || [];
    const updated = arr.includes(moduleId) ? arr.filter(m => m !== moduleId) : [...arr, moduleId];
    const newPerms = { ...perms, [role]: updated };
    setPerms(newPerms);
    try { localStorage.setItem("kmit_permissions", JSON.stringify(newPerms)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetDefaults() {
    if (!confirm("รีเซ็ตสิทธิ์ทั้งหมดเป็นค่าเริ่มต้น?")) return;
    setPerms(defaultPermissions);
    try { localStorage.removeItem("kmit_permissions"); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gradient">Permissions / สิทธิ์การเข้าถึง</h1>
          <p className="text-xs text-muted">กำหนดว่าแต่ละ Role เข้าถึงเมนูไหนได้บ้าง — Admin เห็นทุกอย่างเสมอ</p>
        </div>
        <div className="flex gap-2">
          {saved && <span className="text-xs text-green-400 self-center">✓ บันทึกแล้ว</span>}
          <button onClick={resetDefaults} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">รีเซ็ตค่าเริ่มต้น</button>
          <Link href="/settings" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Settings</Link>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-muted font-medium w-48">Module</th>
                {roles.map(r => (
                  <th key={r} className="px-3 py-3 text-center text-xs font-medium min-w-[100px]">
                    <span className={`rounded-full px-2 py-0.5 ${r === "admin" ? "bg-cyan-900/50 text-cyan-400" : r === "sale" ? "bg-blue-900/50 text-blue-400" : r === "presale" ? "bg-purple-900/50 text-purple-400" : r === "service" ? "bg-rose-900/50 text-rose-400" : "bg-orange-900/50 text-orange-400"}`}>{r}</span>
                    <p className="text-[9px] text-muted mt-1 font-normal">{roleLabels[r]?.split("(")[1]?.replace(")", "") || ""}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allModules.map(m => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{m.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-[10px] text-muted">{m.thai}</p>
                      </div>
                    </div>
                  </td>
                  {roles.map(r => {
                    const checked = r === "admin" || (perms[r] || []).includes(m.id);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {r === "admin" ? (
                          <span className="text-green-400 text-sm">✓</span>
                        ) : (
                          <button onClick={() => toggle(r, m.id)}
                            className={`w-8 h-8 rounded-lg transition-all ${checked ? "bg-accent/20 text-accent border border-accent/30" : "bg-background border border-border text-muted/30 hover:border-accent/20"}`}>
                            {checked ? "✓" : "—"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-card border border-border p-4">
        <h3 className="text-sm font-semibold mb-2">สรุปสิทธิ์ปัจจุบัน</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.filter(r => r !== "admin").map(r => (
            <div key={r} className="rounded-lg bg-background border border-border p-3">
              <p className="text-xs font-medium mb-1">{roleLabels[r]}</p>
              <p className="text-[10px] text-muted">{(perms[r] || []).length} / {allModules.length} modules</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(perms[r] || []).map(m => {
                  const mod = allModules.find(x => x.id === m);
                  return <span key={m} className="rounded bg-accent/10 text-accent px-1.5 py-0.5 text-[9px]">{mod?.icon} {mod?.label || m}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
