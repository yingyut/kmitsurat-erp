export type WidgetSpan = "full" | "half" | "third";

export interface WidgetConfig {
  id: string;
  visible: boolean;
  span: WidgetSpan;
}

export type DashView = "executive" | "sales" | "presale" | "service" | "projects" | "coordinator" | "branch-manager" | "overview";

export const WIDGET_LABELS: Record<string, string> = {
  // Individual executive KPI cards
  "exec-kpi-revenue":    "รายได้รวม",
  "exec-kpi-target-pct": "บรรลุเป้า %",
  "exec-kpi-profit":     "กำไร GP",
  "exec-kpi-pipe-val":   "Pipeline มูลค่า",
  "exec-kpi-overdue":    "งานค้าง",
  "exec-kpi-sla":        "SLA On-time",
  // Legacy combined KPI widget
  "exec-kpis": "KPI หลัก (รวม)",
  "exec-quarterly": "ผลงานรายไตรมาส",
  "exec-pipeline": "Sales Pipeline",
  "exec-sales-table": "ยอดขายรายบุคคล",
  "exec-presale": "Presale Workload",
  "exec-service": "Service Status",
  "exec-contracts": "สัญญาใกล้หมด",
  "sales-manager-kpis": "KPI ฝ่ายขาย (4 ใบ)",
  "sales-top-deals":    "Top Deals (ดีลสำคัญ)",
  "sales-person-cards": "Sales รายคน (Cards)",
  "sales-kpis": "Sales KPI",
  "sales-table": "ยอดขายรายบุคคล (ตาราง)",
  "sales-qt-status": "สถานะ Quotation",
  "sales-funnel": "Sales Funnel",
  "sales-overdue": "Follow-up ค้าง",
  "sales-team-plans": "แผนงานทีมขาย (ปฏิทินรายวัน)",
  "pre-person-cards": "Presale รายคน (Cards)",
  "pre-kpis": "Presale KPI",
  "pre-workload": "Presale Workload",
  "pre-overdue": "งานค้าง SLA",
  "pre-request-list": "รายการงาน Presale",
  "svc-person-cards":   "ช่างรายคน (Cards)",
  "svc-kpis":           "Service KPI",
  "svc-status":         "สถานะ Service",
  "svc-overdue":        "Ticket ค้าง",
  "svc-pm":             "PM Schedule",
  "svc-workload":       "Ticket รายคน (ละเอียด)",
  "svc-repeat":         "ปัญหาซ้ำ / Skill Gap",
  "svc-team-overview":  "ภาพรวมทีม (ต่อช่าง)",
  "svc-time-analysis":  "วิเคราะห์เวลาการทำงาน",
  "svc-cost-dashboard": "รายรับ / ต้นทุน Service",
  "prj-kpis": "Projects KPI",
  "prj-funnel": "Pipeline Funnel",
  "prj-qt-status": "Quotation Status",
  "prj-contracts": "สัญญา",
  "prj-quarterly": "รายไตรมาส",
  // Coordinator
  "coord-kpis":         "ภาพรวมธุรการ (KPI)",
  "coord-inbox":        "กล่องรับเรื่อง",
  "coord-tickets":      "Ticket ทั้งหมด",
  "coord-contracts":    "สัญญาใกล้หมด",
  "coord-satisfaction": "สรุปงานที่เสร็จ",
  // Branch Manager
  "bm-sales-kpis":    "KPI ฝ่ายขาย",
  "bm-top-deals":     "Top Deals",
  "bm-funnel":        "Sales Funnel",
  "bm-service":       "Service (ภาพรวม)",
  "bm-presale":       "Presale (ภาพรวม)",
  "bm-contracts":     "สัญญาใกล้หมด",
  "bm-qt-status":     "สถานะ Quotation",
  // ── New v2 Dashboards ──────────────────────────────────────────────────────
  "v2-overview":   "📊 ภาพรวมสาขา (Dashboard ใหม่)",
  "v2-sales":      "💼 Sales Dashboard (ใหม่)",
  "v2-presales":   "⚙️ Presales Dashboard (ใหม่)",
  "v2-service":    "🔧 Service Dashboard (ใหม่)",
  "v2-projects":   "🏗️ Projects Dashboard (ใหม่)",
  "v2-executive":  "👔 Executive Dashboard (ภาพรวมผู้บริหาร)",
};

export const DEFAULT_LAYOUTS: Record<DashView, WidgetConfig[]> = {
  executive: [
    // ── New v2 Executive Dashboard (default) ──────────────────────────────
    { id: "v2-executive",        visible: true,  span: "full"  },
    // ── Legacy widgets (ซ่อนอยู่ — เปิดได้ผ่าน Edit Mode) ─────────────────
    { id: "exec-kpi-revenue",    visible: false, span: "third" },
    { id: "exec-kpi-target-pct", visible: false, span: "third" },
    { id: "exec-kpi-profit",     visible: false, span: "third" },
    { id: "exec-kpi-pipe-val",   visible: false, span: "third" },
    { id: "exec-kpi-overdue",    visible: false, span: "third" },
    { id: "exec-kpi-sla",        visible: false, span: "third" },
    { id: "exec-kpis",           visible: false, span: "full"  },
    { id: "exec-quarterly",      visible: false, span: "half"  },
    { id: "exec-pipeline",       visible: false, span: "half"  },
    { id: "exec-sales-table",    visible: false, span: "full"  },
    { id: "exec-presale",        visible: false, span: "half"  },
    { id: "exec-service",        visible: false, span: "half"  },
    { id: "exec-contracts",      visible: false, span: "half"  },
  ],
  sales: [
    // ── New v2 Sales Dashboard (default) ──────────────────────────────────
    { id: "v2-sales",           visible: true,  span: "full" },
    // ── Legacy widgets (ซ่อนอยู่ — เปิดได้ผ่าน Edit Mode) ─────────────────
    { id: "sales-manager-kpis", visible: false, span: "full" },
    { id: "sales-overdue",      visible: false, span: "full" },
    { id: "sales-top-deals",    visible: false, span: "half" },
    { id: "sales-funnel",       visible: false, span: "half" },
    { id: "sales-person-cards", visible: false, span: "full" },
    { id: "sales-qt-status",    visible: false, span: "half" },
    { id: "sales-team-plans",   visible: false, span: "full" },
    { id: "sales-kpis",         visible: false, span: "full" },
    { id: "sales-table",        visible: false, span: "half" },
  ],
  presale: [
    // ── New v2 Presales Dashboard (default) ───────────────────────────────
    { id: "v2-presales",        visible: true,  span: "full" },
    // ── Legacy widgets ────────────────────────────────────────────────────
    { id: "pre-person-cards",  visible: false, span: "full" },
    { id: "pre-kpis",          visible: false, span: "full" },
    { id: "pre-workload",      visible: false, span: "half" },
    { id: "pre-overdue",       visible: false, span: "half" },
    { id: "pre-request-list",  visible: false, span: "full" },
  ],
  service: [
    // ── New v2 Service Dashboard (default) ────────────────────────────────
    { id: "v2-service",         visible: true,  span: "full" },
    // ── Legacy widgets ────────────────────────────────────────────────────
    { id: "svc-team-overview",  visible: false, span: "full" },
    { id: "svc-kpis",           visible: false, span: "full" },
    { id: "svc-status",         visible: false, span: "half" },
    { id: "svc-overdue",        visible: false, span: "half" },
    { id: "svc-time-analysis",  visible: false, span: "half" },
    { id: "svc-cost-dashboard", visible: false, span: "half" },
    { id: "svc-person-cards",   visible: false, span: "full" },
    { id: "svc-pm",             visible: false, span: "half" },
    { id: "svc-workload",       visible: false, span: "full" },
    { id: "svc-repeat",         visible: false, span: "half" },
  ],
  projects: [
    // ── New v2 Projects Dashboard (default) ───────────────────────────────
    { id: "v2-projects",        visible: true,  span: "full" },
    // ── Legacy widgets ────────────────────────────────────────────────────
    { id: "prj-kpis",      visible: false, span: "full" },
    { id: "prj-funnel",    visible: false, span: "half" },
    { id: "prj-qt-status", visible: false, span: "half" },
    { id: "prj-contracts", visible: false, span: "half" },
    { id: "prj-quarterly", visible: false, span: "half" },
  ],
  coordinator: [
    { id: "coord-kpis",         visible: true, span: "full" },
    { id: "coord-inbox",        visible: true, span: "full" },
    { id: "coord-tickets",      visible: true, span: "half" },
    { id: "coord-contracts",    visible: true, span: "half" },
    { id: "coord-satisfaction", visible: true, span: "full" },
  ],
  overview: [
    { id: "v2-overview", visible: true, span: "full" },
  ],
  "branch-manager": [
    { id: "bm-kpi-row",            visible: true, span: "full" },
    { id: "bm-sales-performance",  visible: true, span: "full" },
    { id: "bm-pipeline-stage",     visible: true, span: "half" },
    { id: "bm-customer-segment",   visible: true, span: "half" },
    { id: "bm-followup-alerts",    visible: true, span: "full" },
    { id: "bm-top-opportunities",  visible: true, span: "full" },
    { id: "bm-recent-activities",  visible: true, span: "full" },
    { id: "bm-presale-summary",    visible: false, span: "half" },
    { id: "bm-service-summary",    visible: false, span: "half" },
    { id: "exec-contracts",        visible: false, span: "full" },
  ],
};

export function getRoleDefaultView(role: string): DashView {
  if (["admin", "Administrator"].includes(role)) return "executive";
  if (role === "Sales Manager") return "sales";
  if (role === "Presales Manager") return "presale";
  if (role === "Service Manager") return "service";
  if (role === "Branch Manager") return "overview";
  if (["sale", "avenger", "Sales Executive"].includes(role)) return "sales";
  if (["presale", "Presales Engineer", "BOQ Engineer"].includes(role)) return "presale";
  if (["service", "Service Technician", "Operations Coordinator"].includes(role)) return "service";
  if (role === "Coordinator") return "coordinator";
  return "overview";
}

export const ALL_VIEWS: DashView[] = ["overview", "executive", "sales", "presale", "service", "projects", "coordinator", "branch-manager"];

export function loadLayout(userId: string, view: DashView): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUTS[view];
  try {
    const stored = localStorage.getItem(`kmit_dash_${userId}_${view}`);
    if (!stored) return DEFAULT_LAYOUTS[view];
    const parsed = JSON.parse(stored) as WidgetConfig[];
    const storedIds = new Set(parsed.map((w) => w.id));
    const newWidgets = DEFAULT_LAYOUTS[view].filter((d) => !storedIds.has(d.id));
    return [...parsed, ...newWidgets];
  } catch {
    return DEFAULT_LAYOUTS[view];
  }
}

export function saveLayout(userId: string, view: DashView, layout: WidgetConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`kmit_dash_${userId}_${view}`, JSON.stringify(layout));
  } catch {}
}

export function resetLayout(userId: string, view: DashView): WidgetConfig[] {
  const def = DEFAULT_LAYOUTS[view];
  saveLayout(userId, view, def);
  return def;
}
