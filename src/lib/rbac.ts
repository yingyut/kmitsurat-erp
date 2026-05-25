// RBAC — Role-Based Access Control definitions
// Old roles (admin/sale/presale/service/avenger) remain fully backward-compatible.
// New roles use the granular permission system below.

export type Permission =
  | "view_dashboard"
  | "view_all_projects" | "view_own_projects"
  | "view_all_tickets"  | "view_own_tickets"
  | "create_ticket"     | "close_ticket"
  | "assign_job"
  | "approve_quote"  | "create_quote" | "view_quote"
  | "view_all_customers" | "view_own_customers" | "create_customer"
  | "manage_users"   | "manage_roles"
  | "view_finance"
  | "view_reports"
  | "manage_system"
  | "view_presale"   | "manage_presale" | "use_presale_tools"
  | "view_contracts" | "manage_contracts"
  | "view_vendors"   | "manage_vendors"
  | "view_products"  | "manage_products"
  | "view_catalog"
  | "view_assets"    | "manage_assets";

export const ALL_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "view_all_projects",  "view_own_projects",
  "view_all_tickets",   "view_own_tickets",
  "create_ticket",      "close_ticket",
  "assign_job",
  "approve_quote",      "create_quote",       "view_quote",
  "view_all_customers", "view_own_customers", "create_customer",
  "manage_users",       "manage_roles",
  "view_finance",
  "view_reports",
  "manage_system",
  "view_presale",       "manage_presale",     "use_presale_tools",
  "view_contracts",     "manage_contracts",
  "view_vendors",       "manage_vendors",
  "view_products",      "manage_products",
  "view_catalog",
  "view_assets",        "manage_assets",
];

// ─── New 9 roles ────────────────────────────────────────────────────────────────

export const NEW_ROLES = [
  "Administrator",
  "Branch Manager",
  "Sales Manager",
  "Sales Executive",
  "Presales Manager",
  "Presales Engineer",
  "Service Manager",
  "Service Technician",
  "Operations Coordinator",
  "Coordinator",
] as const;

export type NewRoleName = typeof NEW_ROLES[number];

// ─── Permission → module access map ─────────────────────────────────────────────
// Any one of the listed permissions grants access to the path segment

export const MODULE_PERMISSIONS: Record<string, Permission[]> = {
  "dashboard":          ["view_dashboard"],
  "projects":           ["view_all_projects", "view_own_projects"],
  "sales":              ["view_all_projects", "view_own_projects"],
  "quotations":         ["view_quote"],
  "sales-workflow":     ["view_quote"],
  "sales-plan":         ["view_reports"],
  "presale":            ["view_presale", "use_presale_tools", "manage_presale"],
  "project-management": ["view_all_projects"],
  "service":            ["view_all_tickets", "view_own_tickets"],
  "contracts":          ["view_contracts", "manage_contracts"],
  "assets":             ["view_assets", "manage_assets"],
  "assets/pm-schedule": ["view_assets", "manage_assets"],
  "customers":          ["view_all_customers", "view_own_customers", "create_customer"],
  "vendors":            ["view_vendors", "manage_vendors"],
  "products":           ["view_products", "manage_products"],
  "users":              ["manage_users"],
  "reports":            ["view_reports"],
  "settings":           ["manage_system", "manage_roles"],
  "help":               ["view_dashboard"],
};

// ─── Role → Permission matrix ────────────────────────────────────────────────────
// Only new roles are defined here. Old roles use UserContext.defaultPermissions.

export const ROLE_PERMISSIONS: Record<NewRoleName, Permission[]> = {
  "Administrator": ALL_PERMISSIONS,

  "Branch Manager": [
    "view_dashboard",
    "view_all_projects",  "view_all_tickets",   "view_all_customers",
    "view_finance",       "view_reports",
    "approve_quote",      "view_quote",          "create_quote",
    "manage_users",
    "view_presale",       "use_presale_tools",
    "view_contracts",     "manage_contracts",
    "view_vendors",       "manage_vendors",     "view_products",
    "assign_job",         "close_ticket",
    "view_catalog",       "view_assets",         "manage_assets",
  ],

  "Sales Manager": [
    "view_dashboard",
    "view_all_projects",  "view_all_customers", "create_customer",
    "view_finance",       "view_reports",
    "approve_quote",      "view_quote",         "create_quote",
    "view_presale",       "use_presale_tools",
    "view_contracts",     "view_products",
    "assign_job",         "view_catalog",
  ],

  "Sales Executive": [
    "view_dashboard",
    "view_own_projects",  "view_own_customers", "create_customer",
    "view_quote",         "create_quote",
    "use_presale_tools",  "view_presale",
    "view_products",      "view_catalog",
  ],

  "Presales Manager": [
    "view_dashboard",
    "view_all_projects",  "view_all_customers",
    "view_finance",       "view_reports",
    "view_presale",       "manage_presale",     "use_presale_tools",
    "approve_quote",      "view_quote",         "create_quote",
    "view_products",      "manage_products",
    "view_vendors",       "view_catalog",
  ],

  "Presales Engineer": [
    "view_dashboard",
    "view_own_projects",  "view_own_customers",
    "view_presale",       "use_presale_tools",
    "view_quote",         "create_quote",
    "view_products",      "view_vendors",       "view_catalog",
  ],

  "Service Manager": [
    "view_dashboard",
    "view_all_tickets",   "assign_job",         "close_ticket",
    "view_contracts",     "manage_contracts",
    "view_all_customers",
    "view_finance",       "view_reports",
    "view_products",      "view_assets",        "manage_assets",
  ],

  "Service Technician": [
    "view_dashboard",
    "view_own_tickets",   "create_ticket",
    "view_own_customers", "view_products",      "view_contracts",
    "view_assets",
  ],

  "Operations Coordinator": [
    "view_dashboard",
    "view_all_projects",  "view_all_tickets",   "create_ticket",
    "view_contracts",     "view_all_customers",
    "view_vendors",       "view_products",
    "view_presale",       "view_quote",
    "view_assets",        "manage_assets",
  ],

  "Coordinator": [
    "view_dashboard",
    "view_all_tickets",   "create_ticket",      "close_ticket",
    "assign_job",
    "view_all_customers", "create_customer",
    "view_all_projects",
    "view_quote",
    "view_contracts",     "manage_contracts",
    "view_presale",
    "view_assets",
    "view_reports",
  ],
};

// ─── Utility functions ───────────────────────────────────────────────────────────

export function isNewRole(role: string): role is NewRoleName {
  return (NEW_ROLES as readonly string[]).includes(role);
}

export function getRolePermissions(role: NewRoleName): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function checkPermission(role: string, perm: Permission): boolean {
  if (!role) return false;
  if (role === "admin" || role === "Administrator") return true;
  if (!isNewRole(role)) return false; // legacy roles handled by caller
  return getRolePermissions(role).includes(perm);
}

export function checkModuleAccess(role: string, pathSegment: string): boolean {
  if (!role) return false;
  if (role === "admin" || role === "Administrator") return true;
  if (!isNewRole(role)) return false; // legacy roles handled by caller
  const required = MODULE_PERMISSIONS[pathSegment] ?? [];
  if (required.length === 0) return false;
  return required.some(p => getRolePermissions(role as NewRoleName).includes(p));
}

// ─── UI metadata ─────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  "admin":                  "Admin (เต็ม)",
  "sale":                   "Sales",
  "presale":                "Presale",
  "service":                "Service",
  "avenger":                "Avenger",
  "Administrator":          "ผู้ดูแลระบบ",
  "Branch Manager":         "ผู้จัดการสาขา",
  "Sales Manager":          "ผู้จัดการฝ่ายขาย",
  "Sales Executive":        "เจ้าหน้าที่ขาย",
  "Presales Manager":       "ผู้จัดการพรีเซลล์",
  "Presales Engineer":      "วิศวกรพรีเซลล์",
  "Service Manager":        "ผู้จัดการงานบริการ",
  "Service Technician":     "ช่างบริการ",
  "Operations Coordinator": "ผู้ประสานงาน",
  "Coordinator":            "ธุรการ",
};

export const ROLE_COLOR: Record<string, string> = {
  "admin":                  "bg-cyan-900/50 text-cyan-400",
  "Administrator":          "bg-cyan-900/50 text-cyan-400",
  "Branch Manager":         "bg-purple-900/50 text-purple-400",
  "Sales Manager":          "bg-blue-900/50 text-blue-400",
  "Sales Executive":        "bg-blue-800/50 text-blue-300",
  "sale":                   "bg-blue-900/50 text-blue-400",
  "avenger":                "bg-orange-900/50 text-orange-400",
  "Presales Manager":       "bg-indigo-900/50 text-indigo-400",
  "Presales Engineer":      "bg-indigo-800/50 text-indigo-300",
  "presale":                "bg-purple-900/50 text-purple-400",
  "Service Manager":        "bg-rose-900/50 text-rose-400",
  "Service Technician":     "bg-rose-800/50 text-rose-300",
  "service":                "bg-rose-900/50 text-rose-400",
  "Operations Coordinator": "bg-green-900/50 text-green-400",
  "Coordinator":            "bg-amber-900/50 text-amber-400",
};

export type PermCategory = "Dashboard" | "Sales" | "Service" | "Presale" | "CRM" | "Finance" | "Operations" | "Master Data" | "Admin";

export const PERMISSION_META: Record<Permission, { label: string; thai: string; category: PermCategory }> = {
  "view_dashboard":       { label: "View Dashboard",    thai: "ดู Dashboard",              category: "Dashboard" },
  "view_all_projects":    { label: "All Projects",      thai: "ดูโปรเจกต์ทั้งหมด",        category: "Sales" },
  "view_own_projects":    { label: "Own Projects",      thai: "ดูโปรเจกต์ตัวเอง",          category: "Sales" },
  "approve_quote":        { label: "Approve Quote",     thai: "อนุมัติใบเสนอราคา",         category: "Sales" },
  "create_quote":         { label: "Create Quote",      thai: "สร้างใบเสนอราคา",            category: "Sales" },
  "view_quote":           { label: "View Quotes",       thai: "ดูใบเสนอราคา",               category: "Sales" },
  "view_all_tickets":     { label: "All Tickets",       thai: "ดู Ticket ทั้งหมด",          category: "Service" },
  "view_own_tickets":     { label: "Own Tickets",       thai: "ดู Ticket ตัวเอง",           category: "Service" },
  "create_ticket":        { label: "Create Ticket",     thai: "สร้าง Ticket",               category: "Service" },
  "close_ticket":         { label: "Close Ticket",      thai: "ปิด Ticket",                 category: "Service" },
  "assign_job":           { label: "Assign Job",        thai: "มอบหมายงาน",                 category: "Service" },
  "view_presale":         { label: "View Presale",      thai: "ดูงานพรีเซลล์",              category: "Presale" },
  "manage_presale":       { label: "Manage Presale",    thai: "จัดการพรีเซลล์",             category: "Presale" },
  "use_presale_tools":    { label: "Presale Tools",     thai: "ใช้เครื่องมือออกแบบ",        category: "Presale" },
  "view_catalog":         { label: "View Catalog",      thai: "ดูคลังสินค้าพรีเซลล์",      category: "Presale" },
  "view_all_customers":   { label: "All Customers",     thai: "ดูลูกค้าทั้งหมด",           category: "CRM" },
  "view_own_customers":   { label: "Own Customers",     thai: "ดูลูกค้าตัวเอง",             category: "CRM" },
  "create_customer":      { label: "Create Customer",   thai: "เพิ่มลูกค้าใหม่",            category: "CRM" },
  "view_finance":         { label: "Finance Data",      thai: "ดูต้นทุน / GP / กำไร",       category: "Finance" },
  "view_contracts":       { label: "View Contracts",    thai: "ดูสัญญา / MA",               category: "Operations" },
  "manage_contracts":     { label: "Manage Contracts",  thai: "จัดการสัญญา",               category: "Operations" },
  "view_vendors":         { label: "View Vendors",      thai: "ดูผู้ขาย / Suppliers",       category: "Master Data" },
  "manage_vendors":       { label: "Manage Vendors",    thai: "จัดการผู้ขาย / Suppliers",    category: "Master Data" },
  "view_products":        { label: "View Products",     thai: "ดูสินค้า",                   category: "Master Data" },
  "manage_products":      { label: "Manage Products",   thai: "จัดการสินค้า",              category: "Master Data" },
  "view_assets":          { label: "View Assets",       thai: "ดูอุปกรณ์ / Serial",        category: "Operations" },
  "manage_assets":        { label: "Manage Assets",     thai: "จัดการ Asset Tracking",     category: "Operations" },
  "manage_users":         { label: "Manage Users",      thai: "จัดการผู้ใช้",              category: "Admin" },
  "manage_roles":         { label: "Manage Roles",      thai: "จัดการ Role / สิทธิ์",      category: "Admin" },
  "view_reports":         { label: "View Reports",      thai: "ดูรายงาน",                   category: "Admin" },
  "manage_system":        { label: "Manage System",     thai: "ตั้งค่าระบบ / Settings",     category: "Admin" },
};

export const PERM_CATEGORIES: PermCategory[] = [
  "Dashboard", "Sales", "Service", "Presale", "CRM", "Finance", "Operations", "Master Data", "Admin",
];
