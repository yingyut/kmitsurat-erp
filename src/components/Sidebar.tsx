"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/UserContext";

type NavItem = { href: string; label: string; thai: string; icon: string };
type Section = { title?: string; subtitle?: string; items: NavItem[] };

const sections: Section[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", thai: "แดชบอร์ดภาพรวม", icon: "📊" },
    ],
  },
  {
    title: "SALES",
    subtitle: "ก่อนปิดดีล",
    items: [
      { href: "/projects", label: "Pipeline", thai: "โอกาสขาย / Sales Pipeline", icon: "🎯" },
      { href: "/sales", label: "Activities", thai: "กิจกรรมงานขาย / Job Requests", icon: "📞" },
      { href: "/quotations", label: "Quotations", thai: "ใบเสนอราคา", icon: "💰" },
      { href: "/sales-workflow", label: "Sales Workflow", thai: "ติดตามสถานะ QT → PO → ส่งมอบ", icon: "🔄" },
      { href: "/sales-plan", label: "Sales Plan", thai: "แผนยอดขาย / Quota", icon: "📈" },
    ],
  },
  {
    title: "OPERATIONS",
    subtitle: "หลังได้ดีล",
    items: [
      { href: "/presale", label: "Presale Tasks", thai: "งานพรีเซลล์ (BOQ / Solution)", icon: "📋" },
      { href: "/project-management", label: "Project Execution", thai: "ดำเนินโปรเจค / Action Plan", icon: "🗂️" },
      { href: "/service", label: "Service Tickets", thai: "งานบริการ / ติดตั้ง / ซ่อม", icon: "🔧" },
      { href: "/contracts", label: "Contracts", thai: "สัญญา / รับประกัน / MA", icon: "🛡️" },
    ],
  },
  {
    title: "MASTER DATA",
    items: [
      { href: "/customers", label: "Customers", thai: "ฐานข้อมูลลูกค้า", icon: "🏢" },
      { href: "/vendors", label: "Vendors", thai: "ผู้ขาย / Suppliers", icon: "🏪" },
      { href: "/products", label: "Products", thai: "สินค้า / ราคา", icon: "📦" },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { href: "/users", label: "Users / Teams", thai: "ผู้ใช้ / ทีม", icon: "👥" },
      { href: "/reports", label: "Reports", thai: "รายงาน / ส่งออก", icon: "📈" },
      { href: "/settings", label: "Settings", thai: "ตั้งค่าระบบ", icon: "⚙️" },
      { href: "/help", label: "Help", thai: "คู่มือการใช้งาน", icon: "📖" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const { currentUser, setCurrentUser, users } = useCurrentUser();

  return (
    <aside className="fixed left-0 top-0 flex h-full w-52 flex-col bg-card border-r border-border z-50">
      <div className="px-4 py-4" title="ระบบบริหารงาน KMITSURAT">
        <h1 className="text-base font-bold tracking-tight text-accent">KMITSURAT</h1>
        <p className="text-[10px] text-muted">Work Portal v1.6</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 overflow-y-auto pb-3">
        {sections.map((section, i) => (
          <div key={i} className={i === 0 ? "" : "mt-3"}>
            {section.title && (
              <div className="px-3 pt-1 pb-1.5">
                <p className="text-[9px] font-bold tracking-wider text-muted/70" title={section.subtitle}>
                  {section.title}
                  {section.subtitle && <span className="ml-1.5 font-normal normal-case tracking-normal text-muted/50">· {section.subtitle}</span>}
                </p>
              </div>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} title={item.thai}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-accent text-white font-medium" : "text-muted hover:bg-card-hover hover:text-foreground"}`}>
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-3 py-3" title="เลือกผู้ใช้ปัจจุบัน">
        <select value={currentUser?.name || ""} onChange={e => { const u = users.find(x => x.name === e.target.value); if (u) setCurrentUser(u); }}
          className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-[10px] focus:outline-none focus:border-accent mb-1.5 truncate">
          {users.map(u => <option key={u.id} value={u.name}>{u.nickname || u.name} ({u.role})</option>)}
        </select>
        {currentUser && (
          <div className="text-[10px] text-muted truncate" title={currentUser.email}>
            {currentUser.email}
          </div>
        )}
      </div>
    </aside>
  );
}
