export type WidgetSpan = "full" | "half";

export interface WidgetConfig {
  id: string;
  visible: boolean;
  span: WidgetSpan;
}

export type DashView = "executive" | "sales" | "presale" | "service" | "projects" | "coordinator";

export const WIDGET_LABELS: Record<string, string> = {
  "exec-kpis": "KPI หลัก",
  "exec-quarterly": "ผลงานรายไตรมาส",
  "exec-pipeline": "Sales Pipeline",
  "exec-sales-table": "ยอดขายรายบุคคล",
  "exec-presale": "Presale Workload",
  "exec-service": "Service Status",
  "exec-contracts": "สัญญาใกล้หมด",
  "sales-person-cards": "Sales รายคน (Cards)",
  "sales-kpis": "Sales KPI",
  "sales-table": "ยอดขายรายบุคคล (ตาราง)",
  "sales-qt-status": "สถานะ Quotation",
  "sales-funnel": "Sales Funnel",
  "sales-overdue": "Follow-up ค้าง",
  "pre-person-cards": "Presale รายคน (Cards)",
  "pre-kpis": "Presale KPI",
  "pre-workload": "Presale Workload",
  "pre-overdue": "งานค้าง SLA",
  "pre-request-list": "รายการงาน Presale",
  "svc-person-cards": "ช่างรายคน (Cards)",
  "svc-kpis": "Service KPI",
  "svc-status": "สถานะ Service",
  "svc-overdue": "Ticket ค้าง",
  "svc-pm": "PM Schedule",
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
    { id: "exec-kpis",        visible: true, span: "full" },
    { id: "exec-quarterly",   visible: true, span: "half" },
    { id: "exec-pipeline",    visible: true, span: "half" },
    { id: "exec-sales-table", visible: true, span: "full" },
    { id: "exec-presale",     visible: true, span: "half" },
    { id: "exec-service",     visible: true, span: "half" },
    { id: "exec-contracts",   visible: true, span: "half" },
  ],
  sales: [
    { id: "sales-person-cards", visible: true, span: "full" },
    { id: "sales-kpis",         visible: true, span: "full" },
    { id: "sales-table",        visible: true, span: "half" },
    { id: "sales-qt-status",    visible: true, span: "half" },
    { id: "sales-funnel",       visible: true, span: "half" },
    { id: "sales-overdue",      visible: true, span: "half" },
  ],
  presale: [
    { id: "pre-person-cards",  visible: true, span: "full" },
    { id: "pre-kpis",          visible: true, span: "full" },
    { id: "pre-workload",      visible: true, span: "half" },
    { id: "pre-overdue",       visible: true, span: "half" },
    { id: "pre-request-list",  visible: true, span: "full" },
  ],
  service: [
    { id: "svc-person-cards", visible: true, span: "full" },
    { id: "svc-kpis",         visible: true, span: "full" },
    { id: "svc-status",       visible: true, span: "half" },
    { id: "svc-overdue",      visible: true, span: "half" },
    { id: "svc-pm",           visible: true, span: "half" },
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
