"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", thai: "แดชบอร์ด", icon: "📊" },
  { href: "/customers", label: "Customers", thai: "ลูกค้า", icon: "🏢" },
  { href: "/projects", label: "Projects", thai: "โปรเจกต์ / โอกาสขาย", icon: "📁" },
  { href: "/project-management", label: "Project Mgmt", thai: "บริหารโปรเจกต์ / Action Plan", icon: "🗂️" },
  { href: "/sales", label: "Sales", thai: "งานขาย", icon: "📞" },
  { href: "/presale", label: "Presale", thai: "พรีเซลล์", icon: "📋" },
  { href: "/service", label: "Service", thai: "งานบริการ", icon: "🔧" },
  { href: "/quotations", label: "Quotations", thai: "ใบเสนอราคา", icon: "💰" },
  { href: "/products", label: "Products", thai: "สินค้า / ราคา", icon: "📦" },
  { href: "/users", label: "Users / Teams", thai: "ผู้ใช้ / ทีม", icon: "👥" },
  { href: "/reports", label: "Reports", thai: "รายงาน", icon: "📈" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-full w-52 flex-col bg-card border-r border-border z-50">
      <div className="px-4 py-4" title="ระบบบริหารงาน KMITSURAT">
        <h1 className="text-base font-bold tracking-tight text-accent">KMITSURAT</h1>
        <p className="text-[10px] text-muted">Work Portal v1.5</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={item.thai}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-accent text-white font-medium" : "text-muted hover:bg-card-hover hover:text-foreground"}`}>
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3" title="รหัสบริษัท">
        <p className="text-[10px] text-muted">tenant: kmitsurat</p>
      </div>
    </aside>
  );
}
