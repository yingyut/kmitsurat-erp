// All Firestore document types - no Firebase imports here

export interface User {
  id?: string;
  tenant_id: string;
  name: string;
  email: string;
  role: "admin" | "sale" | "presale" | "service" | "avenger";
  team_id?: string;
  active: boolean;
  position?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
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
  quota_target: number;
  actual_sales: number;
  remaining: number;
  percent: number;
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
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  notes: string;
  created_by: string;
}
