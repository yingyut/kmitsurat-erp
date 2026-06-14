"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isNewRole } from "@/lib/rbac";
import { users } from "@/lib/firestore";
import LayoutCustomizer from "@/components/LayoutCustomizer";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavItem    = { href: string; label: string; thai: string; icon: string; badgeKey?: string };
type SectionDef = {
  id: string;
  title?: string;
  subtitle?: string;
  dot?: string;
  items: NavItem[];
  roleTitle?: Record<string, { title: string; subtitle?: string }>;
  labelOnly?: boolean;
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
      { href: "/sales?tab=requests",   label: "Requests",    thai: "Job Requests / งานที่ส่งเข้ามา",  icon: "🙋", badgeKey: "salesNotifs" },
    ],
  },
  {
    id: "presale", title: "พรีเซลล์", subtitle: "PRESALE", dot: "bg-violet-500",
    items: [
      { href: "/presale",            label: "Presale Tasks",     thai: "งานพรีเซลล์ (BOQ / Solution)",       icon: "📋", badgeKey: "jobReqPresale" },
      { href: "/presale/projects",   label: "Presale Projects",  thai: "โปรเจกต์ออกแบบ Multi-Tool BOQ",      icon: "📁" },
      { href: "/presale/tools",      label: "Tool Launcher",     thai: "เครื่องมือออกแบบ BOQ",                icon: "🧰" },
      { href: "/project-management", label: "Project Execution", thai: "ดำเนินโปรเจค / Action Plan",         icon: "🗂️" },
    ],
  },
  {
    id: "service-work", title: "เซอร์วิส", subtitle: "SERVICE", dot: "bg-rose-500",
    items: [
      { href: "/service",             label: "Service Tickets", thai: "งานบริการ / ติดตั้ง / ซ่อม", icon: "🔧", badgeKey: "tickets" },
      { href: "/service?tab=today",   label: "Today Jobs",      thai: "งานวันนี้",                   icon: "📅" },
      { href: "/assets/pm-schedule",  label: "PM Schedule",     thai: "ตารางงาน PM",                 icon: "🔩" },
      { href: "/service?tab=parts",   label: "Waiting Parts",   thai: "รออะไหล่",                    icon: "📦" },
    ],
  },
  {
    id: "service-tools", title: "เครื่องมือช่าง", subtitle: "TOOLS", dot: "bg-blue-500",
    items: [
      { href: "/service/manuals",   label: "Manuals",        thai: "คู่มือการใช้งาน",   icon: "📖" },
      { href: "/service/checklist", label: "Checklist",      thai: "Service Checklist", icon: "✅" },
      { href: "/service/remote",    label: "Remote Support", thai: "Remote Access",     icon: "🖥️" },
      { href: "/service/backup",    label: "Config Backup",  thai: "บันทึก Config",     icon: "💾" },
    ],
  },
  {
    id: "service-history", title: "ประวัติ", subtitle: "HISTORY", dot: "bg-emerald-500",
    items: [
      { href: "/service?tab=history", label: "Service History", thai: "ประวัติงาน",           icon: "📁" },
      { href: "/contracts",           label: "Warranty Check",  thai: "สัญญา / การรับประกัน", icon: "🛡️" },
      { href: "/assets",              label: "Search SN",       thai: "ค้นหา Serial Number",  icon: "🔍" },
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

const PRESALE_ROLES_SET = new Set(["presale", "Presales Manager", "Presales Engineer", "BOQ Engineer"]);
const SERVICE_ROLES_SET = new Set(["service", "Service Manager", "Service Technician", "Operations Coordinator"]);

function useBadges(userName: string | undefined, role: string | undefined): Record<string, number> {
  const [raw, setRaw] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userName) return;
    const r = role ?? "";
    const isPrivileged = MANAGER_ROLES.has(r) || ["admin", "Administrator", "avenger"].includes(r);
    const isPresale = PRESALE_ROLES_SET.has(r) || isPrivileged;
    const isService = SERVICE_ROLES_SET.has(r) || isPrivileged;
    const openStatuses = ["new", "open", "in_progress"];
    const unsubs: (() => void)[] = [];
    const live: Record<string, number> = {};
    const uName = userName;

    function flush() { setRaw({ ...live }); }

    // ── Service tickets ────────────────────────────────────────────────────
    const qT = isPrivileged
      ? query(collection(db, "service_tickets"), where("tenant_id", "==", "kmitsurat"), where("status", "in", openStatuses))
      : query(collection(db, "service_tickets"), where("tenant_id", "==", "kmitsurat"), where("technician", "==", uName), where("status", "in", openStatuses));
    unsubs.push(onSnapshot(qT, s => { live.tickets = s.size; flush(); }, () => {}));

    // ── Job Requests → Presale + new presale tasks ─────────────────────────
    if (isPresale) {
      const qPre = query(collection(db, "job_requests"),
        where("tenant_id", "==", "kmitsurat"),
        where("request_to_team", "==", "presale"),
        where("status", "==", "pending"));
      unsubs.push(onSnapshot(qPre, s => { live.jobReqPresale = s.size; flush(); }, () => {}));

      const qPN = query(collection(db, "presale_requests"),
        where("tenant_id", "==", "kmitsurat"),
        where("status", "==", "new"));
      unsubs.push(onSnapshot(qPN, s => { live.presaleNew = s.size; flush(); }, () => {}));
    }

    // ── Job Requests → Service ─────────────────────────────────────────────
    if (isService) {
      const qSvc = query(collection(db, "job_requests"),
        where("tenant_id", "==", "kmitsurat"),
        where("request_to_team", "==", "service"),
        where("status", "==", "pending"));
      unsubs.push(onSnapshot(qSvc, s => { live.jobReqService = s.size; flush(); }, () => {}));
    }

    // ── Sales in-app notifications unread by current user ──────────────────
    const qSN = query(collection(db, "notifications"),
      where("tenant_id", "==", "kmitsurat"),
      where("module", "==", "sales"));
    unsubs.push(onSnapshot(qSN, s => {
      live.salesNotifs = s.docs.filter(d => {
        const readBy: string[] = d.data().read_by || [];
        return !readBy.includes(uName);
      }).length;
      flush();
    }, () => {}));

    return () => unsubs.forEach(u => u());
  }, [userName, role]);

  return {
    tickets:      (raw.tickets      || 0) + (raw.jobReqService || 0),
    jobReqPresale:(raw.jobReqPresale|| 0) + (raw.presaleNew    || 0),
    salesNotifs:   raw.salesNotifs  || 0,
  };
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
        <span className="shrink-0 relative inline-flex">
          <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
          <span className="relative min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
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

  if (section.labelOnly) {
    return (
      <div className="mt-3 mb-0.5 flex items-center gap-2 px-2 py-0.5">
        {section.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${section.dot}`} />}
        <span className="text-[10px] font-bold tracking-widest text-sidebar-muted uppercase leading-none">
          {section.title}
          {section.subtitle && <span className="ml-1.5 font-normal tracking-normal normal-case text-sidebar-muted/60">· {section.subtitle}</span>}
        </span>
        <div className="flex-1 border-t border-sidebar-hover/40" />
      </div>
    );
  }

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
          <span className="shrink-0 relative inline-flex">
            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
            <span className="relative min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
              {sectionBadge > 99 ? "99+" : sectionBadge}
            </span>
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

// ─── Theme switcher ───────────────────────────────────────────────────────────

const SIDEBAR_THEMES = [
  { id: "midnight",  color: "#6366f1", label: "Midnight"  },
  { id: "obsidian",  color: "#f59e0b", label: "Obsidian"  },
  { id: "snow",      color: "#2563eb", label: "Snow"       },
  { id: "cyberpunk", color: "#06b6d4", label: "Cyberpunk" },
  { id: "corporate", color: "#1b3a6b", label: "Corporate" },
];

function ThemeSwitcher({ userId }: { userId?: string }) {
  const [current, setCurrent] = useState("snow");

  useEffect(() => {
    try { setCurrent(localStorage.getItem("kmit_theme") || "snow"); } catch {}
  }, []);

  function switchTheme(id: string) {
    const el = document.documentElement;
    Array.from(el.style).filter(p => p.startsWith("--")).forEach(p => el.style.removeProperty(p));
    el.setAttribute("data-theme", id);
    try { localStorage.setItem("kmit_theme", id); } catch {}
    setCurrent(id);
    if (userId) users.update(userId, { theme: id }).catch(() => {});
  }

  return (
    <div className="px-3 py-2 border-t border-sidebar-hover/40 flex items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-muted flex-1">Theme</span>
      {SIDEBAR_THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => switchTheme(t.id)}
          title={t.label}
          className="w-[14px] h-[14px] rounded-full transition-transform hover:scale-110"
          style={{
            background: t.color,
            boxShadow: current === t.id
              ? `0 0 0 2px var(--sidebar), 0 0 0 3.5px ${t.color}`
              : undefined,
            transform: current === t.id ? "scale(1.2)" : undefined,
          }}
        />
      ))}
      <Link href="/settings/theme" title="Custom / เพิ่มเติม"
        className="text-[11px] text-sidebar-muted/60 hover:text-sidebar-fg leading-none ml-0.5 transition-colors">
        ✏
      </Link>
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
  const isServiceOnlyRole = role === "Service Manager";
  const isSalesOnlyRole = ["Sales Manager", "Sales Executive", "sale"].includes(role);
  const isBranchManager = role === "Branch Manager";
  const SERVICE_HIDDEN_IDS = new Set(["sales", "presale", "admin"]);
  const SALES_HIDDEN_IDS = new Set(["presale"]);
  const baseSections = isTechSidebar ? TECH_SECTIONS : SECTIONS;

  // Branch Manager: แสดงเฉพาะเมนูที่จำเป็นสำหรับภาพรวมสาขา
  const BRANCH_MANAGER_SECTIONS: SectionDef[] = [
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
        { href: "/projects",           label: "Pipeline",   thai: "โอกาสขาย / Sales Pipeline", icon: "🎯" },
        { href: "/quotations",         label: "Quotations", thai: "ใบเสนอราคา",                  icon: "💰" },
        { href: "/sales?tab=requests", label: "Requests",   thai: "Job Requests",                icon: "🙋", badgeKey: "salesNotifs" as "salesNotifs" },
      ],
    },
    {
      id: "service-work", title: "เซอร์วิส", subtitle: "SERVICE", dot: "bg-rose-500",
      items: [
        { href: "/service", label: "Service Tickets", thai: "งานบริการ / ภาพรวม", icon: "🔧", badgeKey: "tickets" as "tickets" },
      ],
    },
    {
      id: "data", title: "ข้อมูลกลาง", subtitle: "MASTER DATA", dot: "bg-emerald-500",
      items: [
        { href: "/customers", label: "Customers", thai: "ฐานข้อมูลลูกค้า", icon: "🏢" },
      ],
    },
    {
      id: "admin", title: "ผู้ดูแล", subtitle: "ADMIN", dot: "bg-amber-500",
      items: [
        { href: "/users",    label: "Users / Teams", thai: "ผู้ใช้ / ทีม",   icon: "👥" },
        { href: "/reports",  label: "Reports",       thai: "รายงาน / ส่งออก", icon: "📊" },
        { href: "/settings", label: "Settings",      thai: "ตั้งค่าระบบ",     icon: "⚙️" },
        { href: "/help",     label: "Help",          thai: "คู่มือการใช้งาน", icon: "📖" },
      ],
    },
  ];

  const sections = isBranchManager
    ? BRANCH_MANAGER_SECTIONS
    : isServiceOnlyRole
    ? baseSections.filter(s => !SERVICE_HIDDEN_IDS.has(s.id))
    : isSalesOnlyRole
    ? baseSections.filter(s => !SALES_HIDDEN_IDS.has(s.id))
    : baseSections;

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

        {/* Theme switcher */}
        <ThemeSwitcher userId={currentUser?.id} />

        {/* Layout density customizer */}
        <LayoutCustomizer />

        {/* User footer */}
        <div className="px-3 py-2.5">
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
