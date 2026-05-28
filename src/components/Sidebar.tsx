"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";

type NavItem = { href: string; label: string; thai: string; icon: string };
type Section = { title?: string; subtitle?: string; items: NavItem[] };

const sections: Section[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", thai: "แดชบอร์ดภาพรวม", icon: "📊" },
      { href: "/todos", label: "Memo & Todo", thai: "บันทึกงาน / รายการสิ่งที่ต้องทำ", icon: "📝" },
    ],
  },
  {
    title: "SALES",
    subtitle: "ก่อนปิดดีล",
    items: [
      { href: "/sales", label: "Activities", thai: "กิจกรรมงานขาย / Job Requests", icon: "📞" },
      { href: "/projects", label: "Pipeline", thai: "โอกาสขาย / Sales Pipeline", icon: "🎯" },
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
      { href: "/assets", label: "Assets", thai: "อุปกรณ์ / Serial Tracking", icon: "🖥️" },
      { href: "/assets/pm-schedule", label: "PM Schedule", thai: "ตารางงาน PM อุปกรณ์", icon: "🔧" },
    ],
  },
  {
    title: "PRESALE TOOLS",
    subtitle: "เครื่องมือออกแบบ",
    items: [
      { href: "/presale/tools", label: "Tool Launcher", thai: "เริ่มใช้เครื่องมือทันที ไม่ต้องสร้างโปรเจกต์ก่อน", icon: "🧰" },
      { href: "/presale/projects", label: "Presale Projects", thai: "โปรเจกต์ออกแบบ Multi-Tool BOQ", icon: "📁" },
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

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  alwaysMobile?: boolean;
}

const SALES_TABS = [
  { tab: "workplan",   label: "Action Plan", icon: "📅" },
  { tab: "activities", label: "Activities",  icon: "📞" },
  { tab: "pipeline",   label: "Pipeline",    icon: "🎯" },
  { tab: "requests",   label: "Requests",    icon: "🙋" },
];

export default function Sidebar({ mobileOpen = false, onClose, alwaysMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const { currentUser, logout, hasAccess } = useCurrentUser();
  const onSalesPage = pathname === "/sales";
  const activeTab = searchParams.get("tab") || "workplan";

  return (
    <>
      {mobileOpen && (
        <div className={`fixed inset-0 bg-black/50 z-40 ${alwaysMobile ? "" : "sm:hidden"}`} onClick={onClose} />
      )}
      <aside className={`fixed left-0 top-0 flex h-full w-52 flex-col bg-sidebar border-r border-sidebar-hover/50 z-50 transition-transform duration-200 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${alwaysMobile ? "" : "sm:translate-x-0"}`}>
      <div className="px-4 py-4 relative" title="ระบบบริหารงาน KMITSURAT">
        <h1 className="text-base font-bold tracking-tight text-gradient">KMITSURAT</h1>
        <p className="text-[10px] text-sidebar-muted/70">Work Portal v1.6</p>
        <button onClick={onClose} className="sm:hidden absolute right-3 top-3 w-7 h-7 flex items-center justify-center rounded-md text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover transition-colors text-sm">✕</button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 overflow-y-auto pb-3">
        {sections.map((section, i) => (
          <div key={i} className={i === 0 ? "" : "mt-3"}>
            {section.title && (
              <div className="px-3 pt-1 pb-1.5">
                <p className="text-[9px] font-bold tracking-widest text-sidebar-muted uppercase" title={section.subtitle}>
                  {section.title}
                  {section.subtitle && <span className="ml-1.5 font-normal normal-case tracking-normal text-sidebar-muted/70">· {section.subtitle}</span>}
                </p>
              </div>
            )}
            {section.items.filter(item => hasAccess(item.href)).map((item) => {
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  <Link href={item.href} title={item.thai}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${active ? "bg-accent/20 text-accent font-semibold border border-accent/30" : "text-sidebar-fg hover:bg-sidebar-hover border border-transparent"}`}>
                    <span className="text-sm">{item.icon}</span>
                    {item.label}
                  </Link>
                  {item.href === "/sales" && onSalesPage && (
                    <div className="ml-3 pl-3 border-l border-accent/30 mt-0.5 mb-1 space-y-0.5">
                      {SALES_TABS.map(t => (
                        <Link key={t.tab} href={`/sales?tab=${t.tab}`}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all ${activeTab === t.tab ? "text-accent font-semibold bg-accent/10" : "text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover"}`}>
                          <span className="text-[11px]">{t.icon}</span>
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-hover/60 px-3 py-2.5">
        {currentUser && (
          <button onClick={() => router.push("/profile")} className="flex items-center gap-2 mb-1.5 w-full rounded-lg hover:bg-sidebar-hover px-1 py-1 transition-colors text-left" title="ดูโปรไฟล์ / เปลี่ยนรหัสผ่าน">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">{(currentUser.nickname || currentUser.name || "?").charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium truncate text-sidebar-fg">{currentUser.nickname || currentUser.name}</p>
              <p className="text-[9px] text-sidebar-muted truncate">{currentUser.role} · {currentUser.email || "คลิกเพื่อดูโปรไฟล์"}</p>
            </div>
          </button>
        )}
        <button onClick={logout} className="w-full rounded-lg bg-sidebar-hover border border-sidebar-hover px-2 py-1.5 text-[10px] text-sidebar-fg hover:text-danger hover:border-danger/30 transition-colors">🚪 ออกจากระบบ</button>
      </div>
    </aside>
    </>
  );
}
