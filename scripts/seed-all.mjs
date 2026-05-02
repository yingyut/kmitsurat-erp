import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);
const T = "kmitsurat";
const ts = serverTimestamp;
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

async function add(col, data) {
  const ref = await addDoc(collection(db, col), { ...data, tenant_id: T, created_at: ts() });
  return ref.id;
}

// Customers
console.log("Creating customers...");
const c1 = await add("customers", { company_name: "โรงเรียนสุราษฎร์พิทยา", contact_name: "ครูสมชาย", phone: "077-123-456", email: "somchai@school.ac.th", address: "สุราษฎร์ธานี", notes: "ลูกค้าประจำ" });
const c2 = await add("customers", { company_name: "โรงพยาบาลสุราษฎร์ธานี", contact_name: "คุณวิไล", phone: "077-234-567", email: "wilai@hospital.go.th", address: "สุราษฎร์ธานี", notes: "โครงการ CCTV" });
const c3 = await add("customers", { company_name: "บริษัท ABC Trading", contact_name: "คุณธนา", phone: "081-345-678", email: "thana@abc.co.th", address: "กรุงเทพ", notes: "" });
const c4 = await add("customers", { company_name: "โรงแรม Paradise Resort", contact_name: "Mr.John", phone: "076-456-789", email: "john@paradise.com", address: "ภูเก็ต", notes: "WiFi Project" });
const c5 = await add("customers", { company_name: "เทศบาลนครสุราษฎร์ธานี", contact_name: "คุณประสิทธิ์", phone: "077-567-890", email: "prasit@surat.go.th", address: "สุราษฎร์ธานี", notes: "โครงการ Smart City" });
console.log("  5 customers created");

// Projects
console.log("Creating projects...");
const p1 = await add("projects", { name: "WiFi โรงเรียนสุราษฎร์พิทยา", customer_id: c1, customer_name: "โรงเรียนสุราษฎร์พิทยา", type: "WiFi", value: 850000, status: "won", assigned_to: "สมชาย วงศ์สุวรรณ", notes: "" });
const p2 = await add("projects", { name: "CCTV โรงพยาบาล 64 จุด", customer_id: c2, customer_name: "โรงพยาบาลสุราษฎร์ธานี", type: "CCTV", value: 1200000, status: "proposal", assigned_to: "วิภาดา ศรีสุข", notes: "" });
const p3 = await add("projects", { name: "Network Office ABC", customer_id: c3, customer_name: "บริษัท ABC Trading", type: "Network", value: 450000, status: "negotiation", assigned_to: "ธนพล จิตรวิเศษ", notes: "" });
const p4 = await add("projects", { name: "WiFi Paradise Resort", customer_id: c4, customer_name: "โรงแรม Paradise Resort", type: "WiFi", value: 2500000, status: "opportunity", assigned_to: "สมชาย วงศ์สุวรรณ", notes: "โครงการใหญ่" });
const p5 = await add("projects", { name: "Smart City CCTV เทศบาล", customer_id: c5, customer_name: "เทศบาลนครสุราษฎร์ธานี", type: "CCTV", value: 5000000, status: "lead", assigned_to: "ณัฐวุฒิ พลังสูง", notes: "งบประมาณปี 69" });
const p6 = await add("projects", { name: "Server Room ABC", customer_id: c3, customer_name: "บริษัท ABC Trading", type: "Server", value: 380000, status: "won", assigned_to: "ธนพล จิตรวิเศษ", notes: "" });
const p7 = await add("projects", { name: "Access Control โรงพยาบาล", customer_id: c2, customer_name: "โรงพยาบาลสุราษฎร์ธานี", type: "Access Control", value: 650000, status: "lost", assigned_to: "วิภาดา ศรีสุข", notes: "แพ้ราคา" });
console.log("  7 projects created");

// Sales Activities
console.log("Creating sales activities...");
await add("sales_activities", { type: "visit", customer_id: c2, customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: p2, project_name: "CCTV โรงพยาบาล 64 จุด", assigned_to: "วิภาดา ศรีสุข", description: "เข้า survey จุดติดตั้ง CCTV อาคาร 3 และ 4", status: "done", next_follow_up: yesterday });
await add("sales_activities", { type: "quotation_sent", customer_id: c3, customer_name: "บริษัท ABC Trading", project_id: p3, project_name: "Network Office ABC", assigned_to: "ธนพล จิตรวิเศษ", description: "ส่งใบเสนอราคา Network ทั้งอาคาร", status: "in_progress", next_follow_up: today });
await add("sales_activities", { type: "phone_call", customer_id: c4, customer_name: "โรงแรม Paradise Resort", project_id: p4, project_name: "WiFi Paradise Resort", assigned_to: "สมชาย วงศ์สุวรรณ", description: "โทรติดตามงาน WiFi Resort", status: "new", next_follow_up: today });
await add("sales_activities", { type: "meeting", customer_id: c5, customer_name: "เทศบาลนครสุราษฎร์ธานี", project_id: p5, project_name: "Smart City CCTV เทศบาล", assigned_to: "ณัฐวุฒิ พลังสูง", description: "ประชุมนำเสนอ Smart City Solution", status: "new", next_follow_up: nextWeek });
await add("sales_activities", { type: "follow_up", customer_id: c1, customer_name: "โรงเรียนสุราษฎร์พิทยา", project_id: p1, project_name: "WiFi โรงเรียนสุราษฎร์พิทยา", assigned_to: "สมชาย วงศ์สุวรรณ", description: "ติดตามเบิกจ่ายงวดที่ 2", status: "in_progress", next_follow_up: lastWeek });
await add("sales_activities", { type: "visit", customer_id: c2, customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: p2, project_name: "CCTV โรงพยาบาล 64 จุด", assigned_to: "วิภาดา ศรีสุข", description: "นำเสนอ Proposal CCTV ให้ผู้อำนวยการ", status: "done", next_follow_up: "" });
await add("sales_activities", { type: "customer_update", customer_id: c4, customer_name: "โรงแรม Paradise Resort", project_id: p4, project_name: "WiFi Paradise Resort", assigned_to: "สมชาย วงศ์สุวรรณ", description: "อัพเดทลูกค้า เพิ่มจุด AP จาก 50 เป็น 80 จุด", status: "new", next_follow_up: today });
console.log("  7 sales activities created");

// Presale
console.log("Creating presale requests...");
await add("presale_requests", { activity_id: "", customer_id: c2, customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: p2, project_name: "CCTV โรงพยาบาล 64 จุด", type: "boq", requirement: "จัดทำ BOQ กล้อง CCTV 64 จุด พร้อม NVR และ Switch", assigned_to: "กิตติพงษ์ แสงทอง", due_date: today, status: "in_progress" });
await add("presale_requests", { activity_id: "", customer_id: c4, customer_name: "โรงแรม Paradise Resort", project_id: p4, project_name: "WiFi Paradise Resort", type: "solution_design", requirement: "ออกแบบระบบ WiFi 6E สำหรับ Resort 200 ห้อง", assigned_to: "อนุชา เพชรรัตน์", due_date: nextWeek, status: "pending" });
await add("presale_requests", { activity_id: "", customer_id: c5, customer_name: "เทศบาลนครสุราษฎร์ธานี", project_id: p5, project_name: "Smart City CCTV เทศบาล", type: "technical_proposal", requirement: "จัดทำ Technical Proposal Smart City CCTV 200 จุด", assigned_to: "นภัสสร พิมพ์ทอง", due_date: lastWeek, status: "pending" });
await add("presale_requests", { activity_id: "", customer_id: c3, customer_name: "บริษัท ABC Trading", project_id: p3, project_name: "Network Office ABC", type: "site_survey", requirement: "Site Survey สำนักงาน 3 ชั้น สำหรับ LAN + WiFi", assigned_to: "กิตติพงษ์ แสงทอง", due_date: yesterday, status: "completed" });
console.log("  4 presale requests created");

// Service
console.log("Creating service tickets...");
await add("service_tickets", { customer_id: c1, customer_name: "โรงเรียนสุราษฎร์พิทยา", project_id: p1, project_name: "WiFi โรงเรียนสุราษฎร์พิทยา", type: "installation", issue: "ติดตั้ง Access Point 30 จุด อาคาร 1-3", technician: "สุรศักดิ์ ใจดี", service_date: today, status: "in_progress" });
await add("service_tickets", { customer_id: c1, customer_name: "โรงเรียนสุราษฎร์พิทยา", project_id: p1, project_name: "WiFi โรงเรียนสุราษฎร์พิทยา", type: "pm_service", issue: "PM ระบบ WiFi ประจำไตรมาส", technician: "พิชัย วิทยากร", service_date: nextWeek, status: "open" });
await add("service_tickets", { customer_id: c3, customer_name: "บริษัท ABC Trading", project_id: p6, project_name: "Server Room ABC", type: "installation", issue: "ติดตั้ง Server Rack + UPS + สาย LAN", technician: "สุรศักดิ์ ใจดี", service_date: yesterday, status: "resolved" });
await add("service_tickets", { customer_id: c2, customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "", type: "repair", issue: "กล้อง CCTV อาคาร 2 ชั้น 3 ภาพไม่ชัด", technician: "ประวิทย์ มั่นคง", service_date: lastWeek, status: "open" });
await add("service_tickets", { customer_id: c4, customer_name: "โรงแรม Paradise Resort", project_id: "", project_name: "", type: "after_sales", issue: "WiFi Lobby ช้า ลูกค้าร้องเรียน", technician: "พิชัย วิทยากร", service_date: today, status: "in_progress" });
console.log("  5 service tickets created");

// Quotas
console.log("Creating sales quotas...");
await add("sales_quotas", { user_name: "สมชาย วงศ์สุวรรณ", role: "sale", month: "2026-05", quota_target: 3000000, actual_sales: 850000, remaining: 2150000, percent: 28.3, won_deals: 1, total_activities: 3 });
await add("sales_quotas", { user_name: "วิภาดา ศรีสุข", role: "sale", month: "2026-05", quota_target: 2500000, actual_sales: 0, remaining: 2500000, percent: 0, won_deals: 0, total_activities: 2 });
await add("sales_quotas", { user_name: "ธนพล จิตรวิเศษ", role: "sale", month: "2026-05", quota_target: 2000000, actual_sales: 380000, remaining: 1620000, percent: 19, won_deals: 1, total_activities: 1 });
await add("sales_quotas", { user_name: "ณัฐวุฒิ พลังสูง", role: "avenger", month: "2026-05", quota_target: 5000000, actual_sales: 0, remaining: 5000000, percent: 0, won_deals: 0, total_activities: 1 });
console.log("  4 quotas created");

// Products
console.log("Creating products...");
await add("products", { code: "CAM-HIK-4MP", name: "Hikvision 4MP Bullet Camera", brand: "Hikvision", category: "CCTV", unit: "ตัว", cost_price: 3500, selling_price: 5500, active: true });
await add("products", { code: "CAM-HIK-8MP", name: "Hikvision 8MP Dome Camera", brand: "Hikvision", category: "CCTV", unit: "ตัว", cost_price: 6500, selling_price: 9800, active: true });
await add("products", { code: "NVR-HIK-32", name: "Hikvision 32CH NVR", brand: "Hikvision", category: "CCTV", unit: "เครื่อง", cost_price: 18000, selling_price: 25000, active: true });
await add("products", { code: "AP-RCK-R770", name: "Ruckus R770 WiFi 7 AP", brand: "Ruckus", category: "WiFi", unit: "ตัว", cost_price: 15000, selling_price: 22000, active: true });
await add("products", { code: "SW-CIS-24P", name: "Cisco SG350 24-Port PoE Switch", brand: "Cisco", category: "Network", unit: "ตัว", cost_price: 12000, selling_price: 18500, active: true });
await add("products", { code: "SRV-DEL-R750", name: "Dell PowerEdge R750 Server", brand: "Dell", category: "Server", unit: "เครื่อง", cost_price: 180000, selling_price: 250000, active: true });
await add("products", { code: "UPS-APC-3K", name: "APC Smart-UPS 3000VA", brand: "APC", category: "Power", unit: "เครื่อง", cost_price: 25000, selling_price: 35000, active: true });
console.log("  7 products created");

console.log("\nAll seed data created successfully!");
process.exit(0);
