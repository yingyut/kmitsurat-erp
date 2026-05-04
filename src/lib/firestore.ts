import {
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Import types for generic params
import type {
  User, Team, Customer, Project, ProjectType, ProjectTask, JobRequest, SalesActivity, PresaleRequest,
  ServiceTicket, Product, Quotation, SalesQuota,
} from "./types";

// Re-export types
export type {
  User, Team, Customer, Project, ProjectType, ProjectTask, JobRequest, SalesActivity, PresaleRequest,
  ServiceTicket, Product, Quotation, QuotationItem, SalesQuota,
} from "./types";

// ============================================================
// GENERIC HELPERS
// ============================================================

const TENANT = "kmitsurat";

async function addDoc_(col: string, data: Record<string, unknown>) {
  return addDoc(collection(db, col), { ...data, tenant_id: TENANT, created_at: serverTimestamp() });
}

async function listDocs<T extends { id?: string }>(col: string, sortField = "created_at"): Promise<T[]> {
  const q = query(collection(db, col), where("tenant_id", "==", TENANT), orderBy(sortField, "desc"));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  } catch {
    // fallback without orderBy if index missing
    const q2 = query(collection(db, col), where("tenant_id", "==", TENANT));
    const snap = await getDocs(q2);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  }
}

async function getDoc_<T extends { id?: string }>(col: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

async function updateDoc_(col: string, id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, col, id), data);
}

async function deleteDoc_(col: string, id: string) {
  return deleteDoc(doc(db, col, id));
}

// ============================================================
// COLLECTION SERVICES
// ============================================================

function svc<T extends { id?: string }>(col: string, sortField = "created_at") {
  return {
    add: (data: Record<string, unknown>) => addDoc_(col, data),
    list: () => listDocs<T>(col, sortField),
    get: (id: string) => getDoc_<T>(col, id),
    update: (id: string, data: Record<string, unknown>) => updateDoc_(col, id, data),
    remove: (id: string) => deleteDoc_(col, id),
  };
}

export const users = svc<User>("users");
export const teams = svc<Team>("teams");
export const customers = svc<Customer>("customers");
export const projects = svc<Project>("projects");
export const salesActivities = svc<SalesActivity>("sales_activities");
export const presaleRequests = svc<PresaleRequest>("presale_requests");
export const serviceTickets = svc<ServiceTicket>("service_tickets");
export const quotations = svc<Quotation>("quotations");
export const products = svc<Product>("products");
export const projectTypes = svc<ProjectType>("project_types");
export const projectTasks = svc<ProjectTask>("project_tasks");
export const jobRequests = svc<JobRequest>("job_requests");
export const salesQuotas = svc<SalesQuota>("sales_quotas");
