export type WidgetSpan = "full" | "half" | "third";

export interface WidgetConfig {
  id: string;
  visible: boolean;
  span: WidgetSpan;
}

export type DashView = "executive" | "sales" | "presale" | "service" | "projects" | "coordinator";

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
};

export const DEFAULT_LAYOUTS: Record<DashView, WidgetConfig[]> = {
  executive: [
    // exec-kpi-revenue / target-pct / profit / overdue ซ่อนไว้เพราะ showHeroKpiStrip ครอบคลุมแล้ว
    // เปิดได้ผ่าน Edit Mode → รีเซ็ต หรือคลิก widget ที่ซ่อนอยู่
    { id: "exec-kpi-revenue",    visible: false, span: "third" },
    { id: "exec-kpi-target-pct", visible: false, span: "third" },
    { id: "exec-kpi-profit",     visible: false, span: "third" },
    { id: "exec-kpi-pipe-val",   visible: true,  span: "third" },
    { id: "exec-kpi-overdue",    visible: false, span: "third" },
    { id: "exec-kpi-sla",        visible: true,  span: "third" },
    { id: "exec-kpis",           visible: false, span: "full"  },
    { id: "exec-quarterly",      visible: true,  span: "half"  },
    { id: "exec-pipeline",       visible: true,  span: "half"  },
    { id: "exec-sales-table",    visible: true,  span: "full"  },
    { id: "exec-presale",        visible: true,  span: "half"  },
    { id: "exec-service",        visible: true,  span: "half"  },
    { id: "exec-contracts",      visible: true,  span: "half"  },
  ],
  sales: [
    // ① ยอดขายเป็นอย่างไร
    { id: "sales-manager-kpis", visible: true,  span: "full" },
    // ② ดีลไหนต้องรีบตาม
    { id: "sales-overdue",      visible: true,  span: "full" },
    { id: "sales-top-deals",    visible: true,  span: "half" },
    { id: "sales-funnel",       visible: true,  span: "half" },
    // ③ ใครต้องการความช่วยเหลือ
    { id: "sales-person-cards", visible: true,  span: "full" },
    // ④ รายละเอียดเพิ่มเติม
    { id: "sales-qt-status",    visible: true,  span: "half" },
    // ซ่อนไว้ใน Edit Mode
    { id: "sales-team-plans",   visible: false, span: "full" },
    { id: "sales-kpis",         visible: false, span: "full" },
    { id: "sales-table",        visible: false, span: "half" },
  ],
  presale: [
    { id: "pre-person-cards",  visible: true, span: "full" },
    { id: "pre-kpis",          visible: true, span: "full" },
    { id: "pre-workload",      visible: true, span: "half" },
    { id: "pre-overdue",       visible: true, span: "half" },
    { id: "pre-request-list",  visible: true, span: "full" },
  ],
  service: [
    { id: "svc-team-overview",  visible: true, span: "full" },
    { id: "svc-kpis",           visible: true, span: "full" },
    { id: "svc-status",         visible: true, span: "half" },
    { id: "svc-overdue",        visible: true, span: "half" },
    { id: "svc-time-analysis",  visible: true, span: "half" },
    { id: "svc-cost-dashboard", visible: true, span: "half" },
    { id: "svc-person-cards",   visible: true, span: "full" },
    { id: "svc-pm",             visible: true, span: "half" },
    { id: "svc-workload",       visible: true, span: "full" },
    { id: "svc-repeat",         visible: true, span: "half" },
  ],
  projects: [
    { id: "prj-kpis",      visible: true, span: "full" },
    { id: "prj-funnel",    visible: true, span: "half" },
    { id: "prj-qt-status", visible: true, span: "half" },
    { id: "prj-contracts", visible: true, span: "half" },
    { id: "prj-quarterly", visible: true, span: "half" },
  ],
  coordinator: [
    { id: "coord-kpis",         visible: true, span: "full" },
    { id: "coord-inbox",        visible: true, span: "full" },
    { id: "coord-tickets",      visible: true, span: "half" },
    { id: "coord-contracts",    visible: true, span: "half" },
    { id: "coord-satisfaction", visible: true, span: "full" },
  ],
};

export function getRoleDefaultView(role: string): DashView {
  if (["admin", "Administrator"].includes(role)) return "executive";
  if (["sale", "avenger", "Sales Executive", "Sales Manager", "Branch Manager"].includes(role)) return "sales";
  if (["presale", "Presales Manager", "Presales Engineer", "BOQ Engineer"].includes(role)) return "presale";
  if (["service", "Service Manager", "Service Technician", "Operations Coordinator"].includes(role)) return "service";
  if (role === "Coordinator") return "coordinator";
  return "executive";
}

export const ALL_VIEWS: DashView[] = ["executive", "sales", "presale", "service", "projects", "coordinator"];

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
