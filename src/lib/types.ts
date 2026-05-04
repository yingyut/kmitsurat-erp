// All Firestore document types - no Firebase imports here

export interface User {
  id?: string;
  tenant_id: string;
  name: string;                 // canonical display name (computed from preference on save)
  first_name?: string;          // ชื่อจริง
  last_name?: string;           // นามสกุล
  nickname?: string;            // ชื่อเล่น (รวมคำนำหน้า เช่น "พี่จอร์ด" หรือ "น้องก้อย")
  display_preference?: "nickname" | "first_name" | "first_last" | "full"; // ชื่อใดที่จะใช้แสดง
  email: string;
  role: "admin" | "sale" | "presale" | "service" | "avenger";
  team_id?: string;
  active: boolean;
  position?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  sales_code?: string; // 3-4 letter code for document numbering (e.g. "SPLC")
}

export interface Team {
  id?: string;
  tenant_id: string;
  name: string;
  type: "sales" | "presale" | "service" | "avenger" | "admin";
}

export interface ProjectType {
  id?: string;
  tenant_id: string;
  name: string;
  description: string;
}

export interface IntegrationSetting {
  id?: string;
  tenant_id: string;
  type: "o365_sharepoint" | "onedrive" | "google_drive" | "dropbox" | "other";
  label: string;                   // friendly name (e.g., "SharePoint - Sales Site")
  base_url: string;                // root URL of the document library
  folder_template: string;         // path with placeholders e.g. "{year}/{customer}/{project}"
  default_subfolders: string[];   // e.g. ["01-Solution", "02-BOM-BOQ", "03-Drawing", ...]
  active: boolean;
  notes?: string;
}

// Notification system
export type NotifyChannelType = "email" | "line_notify" | "line_messaging" | "ms_teams" | "webhook";

export interface NotificationChannel {
  id?: string;
  tenant_id: string;
  type: NotifyChannelType;
  name: string;                    // e.g. "Sales LINE Group", "IT Teams Channel"
  active: boolean;
  // Email
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  from_email?: string;
  from_name?: string;
  // LINE Notify
  line_notify_token?: string;
  // LINE Messaging API
  line_channel_token?: string;
  line_channel_secret?: string;
  line_group_id?: string;
  // Microsoft Teams
  teams_webhook_url?: string;
  // Generic Webhook
  webhook_url?: string;
  webhook_method?: "POST" | "GET";
  webhook_headers?: string;        // JSON string
}

export type NotifyTrigger =
  | "quotation_created"
  | "quotation_gp_below"
  | "quotation_sent_review"
  | "quotation_approved"
  | "quotation_rejected"
  | "project_opened"
  | "contract_expiring"
  | "service_ticket_created"
  | "ticket_status_changed";

export interface NotificationWorkflow {
  id?: string;
  tenant_id: string;
  name: string;                    // e.g. "แจ้งเตือน GP ต่ำ"
  module: string;                  // e.g. "quotations", "projects", "service"
  trigger: NotifyTrigger;
  condition: string;               // e.g. "gp_percent < 15", or "" for no condition
  // Recipients
  recipient_roles: string[];       // e.g. ["admin", "sale"]
  recipient_users: string[];       // specific user names
  recipient_emails: string[];      // additional emails
  recipient_line_group?: string;   // LINE group name
  // Channels
  channels: NotifyChannelType[];   // which channels to use
  channel_ids: string[];           // specific channel document IDs
  // Templates
  subject_template: string;        // e.g. "ใบเสนอราคาใหม่: {quotation_number}"
  body_template: string;           // e.g. "ลูกค้า: {customer_name}\nมูลค่า: {total_selling}"
  // State
  active: boolean;
}

export interface NumberingSetting {
  id?: string;
  tenant_id: string;
  doc_type: "quotation" | "contract" | "invoice" | "po" | "service_ticket";
  label: string;                  // friendly name e.g. "ใบเสนอราคา"
  prefix: string;                 // e.g. "QON", "KM", "INV"
  template: string;               // e.g. "{prefix}{user_code}{year_ce_2}{month}-{seq3}"
  current_seq: number;            // last issued (0 initially → next will be 1)
  reset_cycle: "never" | "yearly" | "monthly";
  last_reset_period?: string;     // "2026-04" or "2026"
  active: boolean;
}

export interface ProductCategory {
  id?: string;
  tenant_id: string;
  name: string;
  description: string;
  icon?: string; // emoji shortcut
}

export interface Customer {
  id?: string;
  tenant_id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  province: string;
  org_type: "government" | "private" | "education" | "hospital" | "hotel" | "other";
  notes: string;
}

export interface Project {
  id?: string;
  tenant_id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  type: string;
  value: number;
  status: "lead" | "opportunity" | "proposal" | "negotiation" | "won" | "lost";
  assigned_to: string;
  notes: string;
  // Win/Loss tracking
  win_loss_reason: string;
  lost_competitor: string;
  // Re-engage planning
  re_engage: boolean;
  re_engage_date: string;
  re_engage_note: string;
  // Reminder
  reminder_date: string;
  reminder_type: "email" | "system" | "both" | "none";
  reminder_sent: boolean;
  reminder_to_name: string;
  reminder_to_email: string;
  reminder_cc_email: string;
  reminder_note: string;
}

export interface ProjectTask {
  id?: string;
  tenant_id: string;
  project_id: string;
  project_name: string;
  order: number;
  phase: string; // เช่น Pre-sale / Implementation / Delivery / Post-sale
  title: string;
  description: string;
  assigned_to: string;
  start_date: string;
  due_date: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  progress: number; // 0-100
  notes: string;
  completed_at: string;
}

export interface JobRequest {
  id?: string;
  tenant_id: string;
  request_from: string;
  request_to_team: "presale" | "service";
  request_to_person: string;
  customer_id: string;
  customer_name: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  value: number;
  due_date: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "completed" | "rejected";
  assigned_to: string;
  reject_reason: string;
  accept_note: string;
}

export interface SalesActivity {
  id?: string;
  tenant_id: string;
  type: "phone_call" | "visit" | "quotation_created" | "quotation_sent" | "follow_up" | "meeting" | "customer_update";
  customer_id: string;
  customer_name: string;
  project_id: string;
  project_name: string;
  assigned_to: string;
  description: string;
  status: "new" | "in_progress" | "done";
  next_follow_up: string;
}

export interface BomItem {
  code: string;
  name: string;
  brand: string;
  qty: number;
  unit: string;
  notes: string;
}

export interface PresaleAttachment {
  type: "design" | "drawing" | "presentation" | "spec" | "image" | "document" | "other";
  name: string;
  url: string;
  uploaded_at: string;          // YYYY-MM-DD
  uploaded_by: string;
  notes?: string;
}

export interface PresaleRequest {
  id?: string;
  tenant_id: string;
  activity_id: string;
  customer_id: string;
  customer_name: string;
  project_id: string;
  project_name: string;
  type: "solution_design" | "requirement_summary" | "boq" | "technical_proposal" | "site_survey" | "project_planning";
  requirement: string;
  assigned_to: string;
  due_date: string;
  status: "pending" | "in_progress" | "completed";
  // Artifacts
  solution_summary?: string;     // markdown / plain text
  bom_items?: BomItem[];          // light parts list
  boq_items?: QuotationItem[];    // structured BOQ — convertible to Quotation
  boq_total_cost?: number;
  boq_total_selling?: number;
  boq_gp_percent?: number;
  attachments?: PresaleAttachment[];
  // Convert tracking
  converted_to_quotation_id?: string;
  converted_quotation_number?: string;
  converted_at?: string;
}

export interface ServiceTicket {
  id?: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  project_id: string;
  project_name: string;
  type: "installation" | "site_survey" | "technical_survey" | "after_sales" | "repair" | "pm_service";
  issue: string;
  technician: string;
  service_date: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  // Revenue / profit (จะกรอกเมื่อปิดงาน)
  service_value?: number;     // รายได้ที่เรียกเก็บ (THB)
  service_cost?: number;       // ต้นทุน (อะไหล่ + ค่าแรง + ค่าเดินทาง)
  gross_profit?: number;       // คำนวณอัตโนมัติ
  hours_spent?: number;        // ชั่วโมงทำงาน
  // Reporter (admin info)
  reported_by?: string;        // admin who opened the ticket
  report_date?: string;        // วันที่ลูกค้าแจ้ง (could differ from opened_at)
  report_channel?: "phone" | "line" | "email" | "walk_in" | "system";
  // Routing
  assignment_mode?: "individual" | "all" | "by_skill" | "by_area";
  target_skill?: string;       // for by_skill
  target_area?: string;        // for by_area
  // Timeline (auto-recorded on status changes — ISO timestamps)
  opened_at?: string;
  accepted_at?: string;
  accepted_by?: string;        // who accepted (when broadcast/skill/area)
  started_at?: string;
  resolved_at?: string;
  closed_at?: string;
  // SLA targets (in hours)
  sla_response_hours?: number; // response time target (default 4)
  sla_resolve_hours?: number;  // resolution time target (default 48)
}

export interface Vendor {
  id?: string;
  tenant_id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  active: boolean;
  payment_terms?: string; // เช่น "เครดิต 30 วัน", "เงินสด"
  tax_id?: string;
  vendor_type: "distributor" | "contractor_company" | "contractor_personal" | "internal_team";
  has_vat: boolean; // จด VAT หรือไม่
  withholding_tax_rate?: number; // อัตราหัก ณ ที่จ่าย (%) เช่น 3 สำหรับงานบริการบุคคล, 1 สำหรับบริษัท
}

export interface VendorPrice {
  id?: string;
  tenant_id: string;
  product_id: string;
  product_name: string;       // denormalized for display
  vendor_id: string;
  vendor_name: string;        // denormalized for display
  current_price: number;
  min_qty: number;            // ขั้นต่ำสั่ง
  lead_time_days: number;     // วันรับของหลังสั่ง
  notes: string;
  last_updated: string;       // YYYY-MM-DD
  active: boolean;
}

export interface ServiceContract {
  id?: string;
  tenant_id: string;
  contract_number?: string;     // human-readable number (e.g. KM-6704-0023)
  customer_id: string;
  customer_name: string;        // denormalized for display
  project_id?: string;
  project_name?: string;
  group_id?: string;             // slug key for grouping multiple contracts (e.g. "server-room-phase1")
  group_name?: string;           // display label for the group
  // Coverage
  type: "product_warranty" | "installation_warranty" | "service_contract";
  title: string;                // เช่น "WiFi Phase 1 Warranty", "MA Server Room 2026"
  description?: string;
  scope_items?: string;         // รายการสินค้า/บริการที่คุ้มครอง
  // Period
  start_date: string;           // YYYY-MM-DD
  end_date: string;             // YYYY-MM-DD
  // MA / service contract specific
  service_level?: string;       // "8x5", "24x7", "On-site", "Remote"
  visits_per_year?: number;     // PM visits per year
  response_time_hours?: number; // SLA response
  // Financial
  contract_value?: number;      // มูลค่าสัญญา (THB)
  // Status
  status: "active" | "expired" | "cancelled" | "pending";
  // Reminder
  reminder_days_before?: number; // default 30
  reminder_sent?: boolean;
  last_reminded_at?: string;     // ISO date when reminder was last marked sent
  reminder_count?: number;        // how many times reminded
  notes?: string;
}

export interface PriceHistory {
  id?: string;
  tenant_id: string;
  product_id: string;
  product_name: string;
  vendor_id: string;
  vendor_name: string;
  old_price: number;          // 0 if first entry
  new_price: number;
  change_pct: number;         // negative = cheaper, positive = more expensive
  effective_date: string;     // YYYY-MM-DD when this price became effective
  recorded_at: string;        // ISO timestamp when entry was created
  note: string;
}

export interface Product {
  id?: string;
  tenant_id: string;
  code: string; // optional in practice — services may not have a code
  name: string;
  brand: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number; // ราคาบุคคลทั่วไป (default tier)
  // Price tiers (optional — fall back to selling_price if unset)
  price_member?: number; // ราคาสมาชิก
  price_special?: number; // ราคาพิเศษ / VIP
  default_discount?: number; // ส่วนลดตั้งต้น (THB ต่อหน่วย)
  active: boolean;
  type?: "product" | "service"; // default "product"
}

export interface QuotationItem {
  product_id: string;
  product_code: string;
  product_name: string;
  qty: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  discount: number;
  total_cost: number;
  total_selling: number;
  margin_percent: number;
  price_tier?: "general" | "member" | "special" | "custom"; // which tier price was used
}

export interface SalesQuota {
  id?: string;
  tenant_id: string;
  user_name: string;
  role: "sale" | "avenger";
  month: string; // "2026-05"
  // Revenue
  quota_target: number;
  actual_sales: number;
  remaining: number;
  percent: number;
  // Profit (gross profit, THB)
  profit_target: number;
  actual_profit: number;
  profit_percent: number; // achievement % of profit_target
  target_gp_percent?: number; // ตั้งเป้า %GP เฉลี่ย (optional)
  // Counts
  won_deals: number;
  total_activities: number;
}

export interface Quotation {
  id?: string;
  tenant_id: string;
  quotation_number: string;
  customer_id: string;
  customer_name: string;
  project_id: string;
  project_name: string;
  items: QuotationItem[];
  total_cost: number;
  total_selling: number; // sum of items (subtotal before VAT or incl VAT depending on vat_mode)
  total_discount: number;
  gross_profit: number;
  gp_percent: number;
  // VAT
  vat_mode: "none" | "exclusive" | "inclusive"; // exclusive = +VAT on top, inclusive = VAT already included
  vat_rate: number; // e.g. 7
  vat_amount: number;
  grand_total: number; // final amount the customer pays
  status: "draft" | "sent" | "follow_up" | "revised" | "approved" | "rejected" | "expired";
  notes: string;
  created_by: string;
  // Revision history
  version: number;                // current version (1, 2, 3...)
  revisions?: QuotationRevision[];
  // Workflow tracking
  sent_date?: string;
  follow_up_date?: string;
  po_number?: string;
  po_date?: string;
  po_received?: boolean;
  lost_reason?: string;
  // Timeline
  timeline?: QuotationTimelineEntry[];
  // Post-PO steps
  post_po_steps?: PostPOStep[];
  // Team assignments
  team_assignments?: TeamAssignment[];
}

export interface QuotationTimelineEntry {
  action: "created" | "sent" | "follow_up" | "revised" | "approved" | "rejected" | "po_received" | "lost" | "note";
  date: string;          // ISO date
  user: string;
  note: string;
}

export interface PostPOStep {
  step: "open_po" | "order_tracking" | "delivery" | "project_kickoff" | "installation" | "handover";
  title: string;
  assigned_to: string;
  assigned_team: string;  // "procurement" | "service" | "presale" | "sale"
  status: "pending" | "in_progress" | "completed";
  due_date: string;
  completed_date?: string;
  note: string;
}

export interface TeamAssignment {
  team: "presale" | "procurement" | "service" | "sale";
  person: string;
  role_desc: string;     // e.g. "ตรวจ BOQ", "สั่งของ", "ติดตั้ง"
}

export interface QuotationRevision {
  version: number;
  date: string;           // ISO date
  user: string;
  reason: string;
  items: QuotationItem[];
  total_cost: number;
  total_selling: number;
  total_discount: number;
  gross_profit: number;
  gp_percent: number;
  grand_total: number;
  vat_amount: number;
  notes: string;
}
