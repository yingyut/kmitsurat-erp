"use client";
import Link from "next/link";
import { useCurrentUser } from "@/lib/UserContext";

const settingsLinks = [
  {
    href: "/settings/company",
    title: "Company & Fiscal Year",
    thai: "ข้อมูลบริษัท / ปีงบประมาณ",
    desc: "ชื่อบริษัท ที่อยู่ เลขภาษี, กำหนดไตรมาส Q1-Q4, สกุลเงิน, VAT — ส่งผลต่อ Dashboard และเอกสาร",
    icon: "🏢",
  },
  {
    href: "/settings/project-types",
    title: "Project Types",
    thai: "ประเภทงาน / โปรเจค",
    desc: "จัดการประเภทงาน เช่น WiFi, CCTV, Server Room, Solar Cell",
    icon: "🏷️",
  },
  {
    href: "/settings/product-categories",
    title: "Product Categories",
    thai: "หมวดหมู่สินค้า / บริการ",
    desc: "จัดการหมวดหมู่สินค้า เช่น กล้อง CCTV, Server, Network, ไฟฟ้า, งานติดตั้ง",
    icon: "📦",
  },
  {
    href: "/settings/numbering",
    title: "Document Numbering",
    thai: "เลขเอกสาร / รูปแบบเลขที่",
    desc: "ตั้ง prefix + format ของใบเสนอราคา / สัญญา / Invoice / PO เช่น QONSPLC2404-056, KM-6704-0023",
    icon: "🔢",
  },
  {
    href: "/settings/integrations",
    title: "File Storage Integrations",
    thai: "เชื่อม SharePoint / OneDrive / Drive",
    desc: "ตั้ง base URL + folder template — ระบบจะสร้างลิงก์ folder อัตโนมัติในงาน Presale",
    icon: "📘",
  },
  {
    href: "/settings/notifications",
    title: "Notification Workflows",
    thai: "แจ้งเตือนอัตโนมัติ",
    desc: "ตั้งค่า Workflow แจ้งเตือนผ่าน Email, LINE, Teams, Webhook เมื่อเกิด event เช่น สร้างใบเสนอราคา, GP ต่ำ, สัญญาหมดอายุ",
    icon: "🔔",
  },
  {
    href: "/settings/roles",
    title: "Role Management",
    thai: "จัดการ Role และสิทธิ์ RBAC",
    desc: "ดูและจัดการ Permission Matrix สำหรับ 9 ตำแหน่งงาน — Administrator, Branch Manager, Sales Manager, Sales Executive, Presales, Service, Operations",
    icon: "🛡️",
  },
  {
    href: "/settings/permissions",
    title: "Permissions (Legacy)",
    thai: "สิทธิ์เมนูแบบเก่า",
    desc: "กำหนดการเข้าถึงเมนูสำหรับ Role เก่า (sale, presale, service) — ใช้ Role Management สำหรับระบบใหม่",
    icon: "🔒",
  },
  {
    href: "/settings/theme",
    title: "Theme / ธีมสี",
    thai: "เปลี่ยนธีมสี",
    desc: "เลือกธีมสีที่ชอบ: Midnight (ม่วงเข้ม), Obsidian (เทาอุ่น), Snow (ขาวสะอาด), Cyberpunk (นีออน)",
    icon: "🎨",
  },
  {
    href: "/settings/import-export",
    title: "Import / Backup",
    thai: "นำเข้าข้อมูล / สำรองข้อมูล",
    desc: "Import ข้อมูลจาก Excel/CSV สำหรับ Customers, Products, Vendors, Projects และ Backup/Restore ฐานข้อมูลทั้งหมด",
    icon: "💾",
  },
  {
    href: "/settings/activity-log",
    title: "Activity Log",
    thai: "บันทึกกิจกรรมในระบบ",
    desc: "ดู Audit Trail — Login, สร้าง, แก้ไข, ลบ — กรองตาม Module, Action, ผู้ใช้, และช่วงวันที่",
    icon: "📋",
  },
];

export default function SettingsPage() {
  const { currentUser, hasPermission, loading } = useCurrentUser();
  const canAccess = hasPermission("manage_system") || hasPermission("manage_roles");

  if (loading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canAccess) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold" title="ตั้งค่าระบบ">Settings</h1>
        <p className="text-xs text-muted">ตั้งค่าระบบและข้อมูลพื้นฐาน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {settingsLinks.map((s) => (
          <Link key={s.href} href={s.href} title={s.thai}
            className="rounded-xl bg-card border border-border p-5 hover:border-accent hover:bg-card-hover transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-1">{s.title}</p>
                <p className="text-[10px] text-muted mb-1">{s.thai}</p>
                <p className="text-xs text-muted">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
