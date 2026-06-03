"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isNewRole } from "@/lib/rbac";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavItem    = { href: string; label: string; thai: string; icon: string; badgeKey?: string };
type SectionDef = {
  id: string;
  title?: string;
  subtitle?: string;
  dot?: string;
  items: NavItem[];
  roleTitle?: Record<string, { title: string; subtitle?: string }>;
};

// ─── Menu structure ───────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  {
    id: "main",
    items: [
      { href: "/dashboard", label: "Dashboard",   thai: "แดชบอร์ดภาพรวม",               icon: "📊" },
      { href: "/todos",     label: "Memo & Todo", thai: "บันทึกงาน / รายการสิ่งที่ต้องทำ", icon: "📝" },
    ],
  },
  {
    id: "sales", title: "ฝ่ายขาย", subtitle: "SALES", dot: "bg-blue-500",
    items: [
      { href: "/sales?tab=workplan",   label: "Action Plan", thai: "แผนงานรายวัน / Daily Plan",      icon: "📅" },
      { href: "/sales?tab=activities", label: "Activities",  thai: "กิจกรรมงานขาย",                  icon: "📞" },
      { href: "/projects",             label: "Pipeline",    thai: "โอกาสขาย / Sales Pipeline",      icon: "🎯" },
      { href: "/quotations",           label: "Quotations",  thai: "ใบเสนอราคา",                      icon: "💰" },
      { href: "/sales-plan",           label: "Sales Plan",  thai: "แผนยอดขาย / Quota",              icon: "📈" },
      { href: "/sales?tab=requests",   label: "Requests",    thai: "Job Requests / งานที่ส่งเข้ามา",  icon: "🙋" },
    ],
  },
  {
    id: "presale", title: "พรีเซลล์", subtitle: "PRESALE", dot: "bg-violet-500",
    items: [
      { href: "/presale",            label: "Presale Tasks",     thai: "งานพรีเซลล์ (BOQ / Solution)",       icon: "📋" },
      { href: "/presale/projects",   label: "Presale Projects",  thai: "โปรเจกต์ออกแบบ Multi-Tool BOQ",      icon: "📁" },
      { href: "/presale/tools",      label: "Tool Launcher",     thai: "เครื่องมือออกแบบ BOQ",                icon: "🧰" },
      { href: "/project-management", label: "Project Execution", thai: "ดำเนินโปรเจค / Action Plan",         icon: "🗂️" },
    ],
  },
  {
    id: "service", title: "เซอร์วิส", subtitle: "SERVICE", dot: "bg-rose-500",
    roleTitle: {
      "service":            { title: "งานของฉัน", subtitle: "MY WORK" },
      "Service Technician": { title: "งานของฉัน", subtitle: "MY WORK" },
    },
    items: [
      { href: "/service",            label: "Service Tickets", thai: "งานบริการ / ติดตั้ง / ซ่อม", icon: "🔧", badgeKey: "tickets" },
      { href: "/contracts",          label: "Contracts",       thai: "สัญญา / รับประกัน / MA",      icon: "🛡️" },
      { href: "/assets",             label: "Assets",          thai: "อุปกรณ์ / Serial Tracking",   icon: "🖥️" },
      { href: "/assets/pm-schedule", label: "PM Schedule",     thai: "ตารางงาน PM อุปกรณ์",         icon: "🔩" },
    ],
  },
  {
    id: "data", title: "ข้อมูลกลาง", subtitle: "MASTER DATA", dot: "bg-emerald-500",
    items: [
      { href: "/customers", label: "Customers", thai: "ฐานข้อมูลลูกค้า",    icon: "🏢" },
      { href: "/vendors",   label: "Vendors",   thai: "ผู้ขาย / Suppliers",  icon: "🏪" },
      { href: "/products",  label: "Products",  thai: "สินค้า / ราคา",        icon: "📦" },
    ],
  },
  {
    id: "admin", title: "ผู้ดูแล", subtitle: "ADMIN", dot: "bg-amber-500",
    items: [
      { href: "/users",    label: "Users / Teams", thai: "ผู้ใช้ / ทีม",      icon: "👥" },
      { href: "/reports",  label: "Reports",       thai: "รายงาน / ส่งออก",    icon: "📊" },
      { href: "/settings", label: "Settings",      thai: "ตั้งค่าระบบ",         icon: "⚙️" },
      { href: "/help",     label: "Help",          thai: "คู่มือการใช้งาน",     icon: "📖" },
    ],
  },
];

// ─── Tech (Service Technician) sidebar sections ───────────────────────────────

const TECH_SECTIONS: SectionDef[] = [
  {
    id: "tech-work",
    title: "งานของฉัน",
    subtitle: "MY WORK",
    dot: "bg-rose-500",
    items: [
      { href: "/service",             label: "My Tickets",    thai: "งาน Service ทั้งหมด",    icon: "🔧", badgeKey: "tickets" },
      { href: "/service?tab=today",   label: "Today Jobs",   thai: "งานวันนี้",                icon: "📅" },
      { href: "/assets/pm-schedule",  label: "PM Schedule",  thai: "ตารางงาน PM",             icon: "🔩" },
      { href: "/service?tab=parts",   label: "Waiting Parts",thai: "รออะไหล่",                 icon: "📦" },
    ],
  },
  {
    id: "tech-tools",
    title: "เครื่องมือช่าง",
    subtitle: "TOOLS",
    dot: "bg-blue-500",
    items: [
      { href: "/service/manuals",   label: "Manuals",        thai: "คู่มือการใช้งาน",   icon: "📖" },
      { href: "/service/checklist", label: "Checklist",      thai: "Service Checklist", icon: "✅" },
      { href: "/service/remote",    label: "Remote Support", thai: "Remote Access",     icon: "🖥️" },
      { href: "/service/backup",    label: "Config Backup",  thai: "บันทึก Config",     icon: "💾" },
    ],
  },
  {
    id: "tech-history",
    title: "ประวัติ",
    subtitle: "HISTORY",
    dot: "bg-emerald-500",
    items: [
      { href: "/service?tab=history", label: "Service History",thai: "ประวัติงาน",           icon: "📁" },
      { href: "/contracts",           label: "Warranty Check", thai: "สัญญา / การรับประกัน", icon: "🛡️" },
      { href: "/assets",              label: "Search SN",      thai: "ค้นหา Serial Number",  icon: "🔍" },
    ],
  },
];

// ─── Badge hook ───────────────────────────────────────────────────────────────

const MANAGER_ROLES = new Set([
  "admin", "Administrator", "Branch Manager", "Sales Manager",
  "Service Manager", "Operations Coordinator", "Coordinator",
]);

function useBadges(userName: string | undefined, role: string | undefined): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userName) return;
    let alive = true;
    const openStatuses = ["new", "open", "in_progress"];

    (async () => {
      try {
        const q = MANAGER_ROLES.has(role ?? "")
          ? query(collection(db, "service_tickets"),
              where("tenant_id", "==", "kmitsurat"),
              where("status", "in", openStatuses))
          : query(collection(db, "service_tickets"),
              where("tenant_id", "==", "kmitsurat"),
              where("technician", "==", userName),
              where("status", "in", openStatuses));

        const snap = await getDocs(q);
        if (alive) setCounts({ tickets: snap.size });
      } catch {}
    })();

    return () => { alive = false; };
  }, [userName, role]);

  return counts;
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  return (
    <Link
      href={item.href}
      title={item.thai}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] transition-all ${
        active
          ? "bg-accent/20 text-accent font-semibold border border-accent/30"
          : "text-sidebar-fg hover:bg-sidebar-hover border border-transparent"
      }`}
    >
      <span className="text-[13px] shrink-0 leading-none">{item.icon}</span>
      <span className="flex-1 min-w-0 truncate leading-tight">{item.label}</span>
      {badge > 0 && (
        <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ─── SidebarSection ───────────────────────────────────────────────────────────

function SidebarSection({
  section, isActive, hasAccess, badges, role,
}: {
  section: SectionDef;
  isActive: (href: string) => boolean;
  hasAccess: (path: string) => boolean;
  badges: Record<string, number>;
  role: string;
}) {
  const storageKey = `kmit_sidebar_sec_${section.id}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (!section.title) return true;
    try {
      const s = localStorage.getItem(storageKey);
      return s === null ? true : s === "1";
    } catch { return true; }
  });

  const visibleItems = section.items.filter(item => hasAccess(item.href.split("?")[0]));
  if (visibleItems.length === 0) return null;

  const roleOverride = section.roleTitle?.[role];
  const displayTitle    = roleOverride?.title    ?? section.title;
  const displaySubtitle = roleOverride?.subtitle ?? section.subtitle;

  function toggle() {
    setOpen(v => {
      const next = !v;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  if (!displayTitle) {
    return (
      <div className="pb-1">
        {visibleItems.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} badge={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0} />
        ))}
      </div>
    );
  }

  const sectionBadge = visibleItems.reduce((sum, item) =>
    item.badgeKey ? sum + (badges[item.badgeKey] ?? 0) : sum, 0);

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-sidebar-hover/70 transition-colors"
      >
        {section.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${section.dot}`} />}
        <span className="flex-1 text-left text-[10px] font-bold tracking-widest text-sidebar-muted uppercase leading-none">
          {displayTitle}
          {displaySubtitle && (
            <span className="ml-1.5 font-normal tracking-normal normal-case text-sidebar-muted/60">· {displaySubtitle}</span>
          )}
        </span>
        {!open && sectionBadge > 0 && (
          <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
            {sectionBadge > 99 ? "99+" : sectionBadge}
          </span>
        )}
        <span
          className="text-[10px] text-sidebar-muted/50 inline-block transition-transform duration-150 ml-0.5"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >▾</span>
      </button>

      {open && (
        <div className="mt-0.5">
          {visibleItems.map(item => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} badge={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  alwaysMobile?: boolean;
}

export default function Sidebar({ mobileOpen = false, onClose, alwaysMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [activeTab, setActiveTab] = useState("");
  const { currentUser, logout, hasAccess } = useCurrentUser();
  const badges = useBadges(currentUser?.name, currentUser?.role);

  const role = currentUser?.role ?? "";
  const isTechSidebar = role === "Service Technician" || role === "service";
  const sections = isTechSidebar ? TECH_SECTIONS : SECTIONS;

  useEffect(() => {
    setActiveTab(new URLSearchParams(window.location.search).get("tab") || "");
  }, [pathname]);

  function isActive(href: string): boolean {
    const [hpath, hquery] = href.split("?");
    if (hquery) {
      const tab = new URLSearchParams(hquery).get("tab");
      return pathname === hpath && activeTab === tab;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {mobileOpen && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 ${alwaysMobile ? "" : "sm:hidden"}`}
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed left-0 top-0 flex h-full w-52 flex-col bg-sidebar border-r border-sidebar-hover/50 z-50
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        ${alwaysMobile ? "" : "sm:translate-x-0"}
      `}>
        {/* Header */}
        <div className="px-4 py-3 relative border-b border-sidebar-hover/40" title={isTechSidebar ? "ระบบช่าง Service KMITSURAT" : "ระบบบริหารงาน KMITSURAT"}>
          <h1 className="text-base font-bold tracking-tight text-gradient">KMITSURAT</h1>
          <p className="text-[10px] text-sidebar-muted/70">{isTechSidebar ? "🔧 Tech Portal" : "Work Portal v1.7"}</p>
          <button
            onClick={onClose}
            className={`absolute right-3 top-3 w-7 h-7 flex items-center justify-center rounded-md text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover transition-colors text-sm ${alwaysMobile ? "" : "sm:hidden"}`}
          >✕</button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-2 py-2 overflow-y-auto">
          {sections.map(section => (
            <SidebarSection
              key={section.id}
              section={section}
              isActive={isActive}
              hasAccess={hasAccess}
              badges={badges}
              role={currentUser?.role ?? ""}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-hover/60 px-3 py-2.5">
          {currentUser && (
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 mb-1.5 w-full rounded-lg hover:bg-sidebar-hover px-1 py-1 transition-colors text-left"
              title="ดูโปรไฟล์ / เปลี่ยนรหัสผ่าน"
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                {(currentUser.nickname || currentUser.name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate text-sidebar-fg">{currentUser.nickname || currentUser.name}</p>
                <p className="text-[9px] text-sidebar-muted truncate">{currentUser.role}</p>
              </div>
            </button>
          )}
          <button
            onClick={logout}
            className="w-full rounded-lg bg-sidebar-hover border border-sidebar-hover px-2 py-1.5 text-[10px] text-sidebar-fg hover:text-danger hover:border-danger/30 transition-colors"
          >🚪 ออกจากระบบ</button>
        </div>
      </aside>
    </>
  );
}
