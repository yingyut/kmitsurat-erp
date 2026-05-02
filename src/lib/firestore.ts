import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase";

// --- Types ---

export interface Customer {
  id?: string;
  company_name: string;
  contact_name: string;
  phone: string;
  created_at?: Timestamp;
}

export interface Activity {
  id?: string;
  text: string;
  createdAt?: Timestamp;
}

export interface PresaleRequest {
  id?: string;
  customer_name: string;
  requirement: string;
  assigned_to: string;
  status: "pending" | "in_progress" | "completed";
  created_at?: Timestamp;
}

export interface Quotation {
  id?: string;
  customer_name: string;
  items: { description: string; qty: number; unit_price: number }[];
  total_price: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  created_at?: Timestamp;
}

export interface ServiceTicket {
  id?: string;
  customer_name: string;
  issue: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at?: Timestamp;
}

// --- Generic helpers ---

async function addDocument(col: string, data: Record<string, unknown>, timestampField = "created_at") {
  return addDoc(collection(db, col), {
    ...data,
    [timestampField]: serverTimestamp(),
  });
}

async function listDocuments<T extends { id?: string }>(
  col: string,
  order: string = "created_at"
): Promise<T[]> {
  const q = query(collection(db, col), orderBy(order, "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

async function getDocument<T extends { id?: string }>(
  col: string,
  id: string
): Promise<T | null> {
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

async function updateDocument(
  col: string,
  id: string,
  data: Record<string, unknown>
) {
  return updateDoc(doc(db, col, id), data);
}

async function removeDocument(col: string, id: string) {
  return deleteDoc(doc(db, col, id));
}

async function countDocuments(col: string): Promise<number> {
  const snap = await getCountFromServer(collection(db, col));
  return snap.data().count;
}

// --- Customers ---

export const customers = {
  add: (data: Omit<Customer, "id" | "created_at">) =>
    addDocument("customers", data as Record<string, unknown>),
  list: () => listDocuments<Customer>("customers"),
  get: (id: string) => getDocument<Customer>("customers", id),
  update: (id: string, data: Partial<Customer>) =>
    updateDocument("customers", id, data as Record<string, unknown>),
  remove: (id: string) => removeDocument("customers", id),
  count: () => countDocuments("customers"),
};

// --- Activities ---

export const activities = {
  add: (data: Omit<Activity, "id" | "createdAt">) =>
    addDocument("activities", data as Record<string, unknown>, "createdAt"),
  list: () => listDocuments<Activity>("activities", "createdAt"),
  get: (id: string) => getDocument<Activity>("activities", id),
  update: (id: string, data: Partial<Activity>) =>
    updateDocument("activities", id, data as Record<string, unknown>),
  remove: (id: string) => removeDocument("activities", id),
  count: () => countDocuments("activities"),
};

// --- Presale Requests ---

export const presaleRequests = {
  add: (data: Omit<PresaleRequest, "id" | "created_at">) =>
    addDocument("presale_requests", data as Record<string, unknown>),
  list: () => listDocuments<PresaleRequest>("presale_requests"),
  get: (id: string) => getDocument<PresaleRequest>("presale_requests", id),
  update: (id: string, data: Partial<PresaleRequest>) =>
    updateDocument("presale_requests", id, data as Record<string, unknown>),
  remove: (id: string) => removeDocument("presale_requests", id),
  count: () => countDocuments("presale_requests"),
};

// --- Quotations ---

export const quotations = {
  add: (data: Omit<Quotation, "id" | "created_at">) =>
    addDocument("quotations", data as Record<string, unknown>),
  list: () => listDocuments<Quotation>("quotations"),
  get: (id: string) => getDocument<Quotation>("quotations", id),
  update: (id: string, data: Partial<Quotation>) =>
    updateDocument("quotations", id, data as Record<string, unknown>),
  remove: (id: string) => removeDocument("quotations", id),
  count: () => countDocuments("quotations"),
};

// --- Service Tickets ---

export const serviceTickets = {
  add: (data: Omit<ServiceTicket, "id" | "created_at">) =>
    addDocument("service_tickets", data as Record<string, unknown>),
  list: () => listDocuments<ServiceTicket>("service_tickets"),
  get: (id: string) => getDocument<ServiceTicket>("service_tickets", id),
  update: (id: string, data: Partial<ServiceTicket>) =>
    updateDocument("service_tickets", id, data as Record<string, unknown>),
  remove: (id: string) => removeDocument("service_tickets", id),
  count: () => countDocuments("service_tickets"),
};
