// All Firestore document types - no Firebase imports here

export interface User {
  id?: string;
  tenant_id: string;
  name: string;
  email: string;
  role: "admin" | "sale" | "presale" | "service" | "avenger";
  team_id?: string;
  active: boolean;
}

export interface Team {
  id?: string;
  tenant_id: string;
  name: string;
  type: "sales" | "presale" | "service" | "avenger" | "admin";
}

export interface Customer {
  id?: string;
  tenant_id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
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

export interface Product {
  id?: string;
  tenant_id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  active: boolean;
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
  total_selling: number;
  total_discount: number;
  gross_profit: number;
  gp_percent: number;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  notes: string;
  created_by: string;
}
