import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

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
const next2Weeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const month = new Date().toISOString().slice(0, 7);

async function add(col, data) {
  return (await addDoc(collection(db, col), { ...data, tenant_id: T, created_at: ts() })).id;
}

// Get existing customer IDs
const custSnap = await getDocs(query(collection(db, "customers"), where("tenant_id", "==", T)));
const custs = {};
custSnap.docs.forEach(d => { custs[d.data().company_name] = d.id; });

// Get existing project IDs
const projSnap = await getDocs(query(collection(db, "projects"), where("tenant_id", "==", T)));
const existingProjects = projSnap.docs.map(d => d.data().name);

console.log("=== Existing customers:", Object.keys(custs).join(", "));
console.log("=== Existing projects:", existingProjects.join(", "));

// ==========================================
// PROJECTS (ใช้ชื่อทีมจริง)
// ==========================================
console.log("\n📁 Creating projects...");
const projects = [];

if (!existingProjects.some(n => n.includes("WiFi โรงแรม Centara"))) {
  const id = await add("projects", { name: "WiFi โรงแรม Centara Samui", customer_id: custs["โรงแรม Paradise Resort"] || "", customer_name: "โรงแรม Paradise Resort", type: "WiFi", value: 1800000, status: "proposal", assigned_to: "ออย (Suppaluck Chuoypeng)", notes: "WiFi 6E 120 จุด" });
  projects.push({ id, name: "WiFi โรงแรม Centara Samui" });
  console.log("  ✓ WiFi โรงแรม Centara Samui — ออย");
}
if (!existingProjects.some(n => n.includes("CCTV เทศบาล"))) {
  const id = await add("projects", { name: "CCTV เทศบาลเมืองนาสาร", customer_id: custs["เทศบาลนครสุราษฎร์ธานี"] || "", customer_name: "เทศบาลนครสุราษฎร์ธานี", type: "CCTV", value: 3500000, status: "negotiation", assigned_to: "แนนน้อย (Virakarn Kittipattanakij)", notes: "CCTV 80 จุด + ศูนย์ควบคุม" });
  projects.push({ id, name: "CCTV เทศบาลเมืองนาสาร" });
  console.log("  ✓ CCTV เทศบาลเมืองนาสาร — แนนน้อย");
}
if (!existingProjects.some(n => n.includes("Network สำนักงาน"))) {
  const id = await add("projects", { name: "Network สำนักงานใหญ่ ABC", customer_id: custs["บริษัท ABC Trading"] || "", customer_name: "บริษัท ABC Trading", type: "Network", value: 650000, status: "won", assigned_to: "บีบี", notes: "LAN 200 จุด + WiFi 30 AP" });
  projects.push({ id, name: "Network สำนักงานใหญ่ ABC" });
  console.log("  ✓ Network สำนักงานใหญ่ ABC — บีบี (Won)");
}
if (!existingProjects.some(n => n.includes("Server Room"))) {
  const id = await add("projects", { name: "Server Room โรงพยาบาลสุราษฎร์", customer_id: custs["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", type: "Server", value: 2200000, status: "opportunity", assigned_to: "จะจ๋า", notes: "Server Room Tier 2" });
  projects.push({ id, name: "Server Room โรงพยาบาลสุราษฎร์" });
  console.log("  ✓ Server Room โรงพยาบาลสุราษฎร์ — จะจ๋า");
}
if (!existingProjects.some(n => n.includes("Access Control"))) {
  const id = await add("projects", { name: "Access Control โรงเรียนสุราษฎร์", customer_id: custs["โรงเรียนสุราษฎร์พิทยา"] || "", customer_name: "โรงเรียนสุราษฎร์พิทยา", type: "Access Control", value: 420000, status: "lead", assigned_to: "อี๊ฟ", notes: "ระบบสแกนบัตร 12 จุด" });
  projects.push({ id, name: "Access Control โรงเรียนสุราษฎร์" });
  console.log("  ✓ Access Control โรงเรียน — อี๊ฟ");
}

// ==========================================
// SALES ACTIVITIES
// ==========================================
console.log("\n📞 Creating sales activities...");
await add("sales_activities", { type: "visit", customer_id: "", customer_name: "โรงแรม Paradise Resort", project_id: "", project_name: "WiFi โรงแรม Centara Samui", assigned_to: "ออย (Suppaluck Chuoypeng)", description: "เข้า site survey ห้องพัก ล็อบบี้ สระว่ายน้ำ วัด signal WiFi เดิม", status: "done", next_follow_up: yesterday });
console.log("  ✓ ออย — site survey โรงแรม");

await add("sales_activities", { type: "quotation_sent", customer_id: "", customer_name: "เทศบาลนครสุราษฎร์ธานี", project_id: "", project_name: "CCTV เทศบาลเมืองนาสาร", assigned_to: "แนนน้อย (Virakarn Kittipattanakij)", description: "ส่งใบเสนอราคา CCTV 80 จุด + NVR + ศูนย์ควบคุม", status: "in_progress", next_follow_up: today });
console.log("  ✓ แนนน้อย — ส่ง QT เทศบาล");

await add("sales_activities", { type: "phone_call", customer_id: "", customer_name: "บริษัท ABC Trading", project_id: "", project_name: "Network สำนักงานใหญ่ ABC", assigned_to: "บีบี", description: "โทรนัด kick-off ติดตั้ง Network อาคารใหม่", status: "new", next_follow_up: today });
console.log("  ✓ บีบี — โทรนัด kick-off");

await add("sales_activities", { type: "meeting", customer_id: "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "Server Room โรงพยาบาลสุราษฎร์", assigned_to: "จะจ๋า", description: "ประชุมนำเสนอ Solution Server Room กับผู้อำนวยการ IT", status: "new", next_follow_up: nextWeek });
console.log("  ✓ จะจ๋า — meeting โรงพยาบาล");

await add("sales_activities", { type: "follow_up", customer_id: "", customer_name: "โรงเรียนสุราษฎร์พิทยา", project_id: "", project_name: "Access Control โรงเรียนสุราษฎร์", assigned_to: "อี๊ฟ", description: "ติดตามงบประมาณ Access Control ปี 69", status: "in_progress", next_follow_up: lastWeek });
console.log("  ✓ อี๊ฟ — follow-up โรงเรียน (overdue)");

await add("sales_activities", { type: "customer_update", customer_id: "", customer_name: "โรงแรม Paradise Resort", project_id: "", project_name: "WiFi โรงแรม Centara Samui", assigned_to: "ออย (Suppaluck Chuoypeng)", description: "ลูกค้าขอเพิ่ม outdoor AP บริเวณสระว่ายน้ำ 5 จุด", status: "new", next_follow_up: next2Weeks });
console.log("  ✓ ออย — update WiFi เพิ่ม AP");

// ==========================================
// PRESALE REQUESTS
// ==========================================
console.log("\n📋 Creating presale requests...");
await add("presale_requests", { activity_id: "", customer_id: "", customer_name: "โรงแรม Paradise Resort", project_id: "", project_name: "WiFi โรงแรม Centara Samui", type: "solution_design", requirement: "ออกแบบ WiFi 6E สำหรับ Resort 120 จุด — ห้องพัก, ล็อบบี้, สระว่ายน้ำ, ร้านอาหาร", assigned_to: "ก็อฟ (Supat Kanchanaborisut)", due_date: nextWeek, status: "in_progress" });
console.log("  ✓ ก็อฟ — WiFi design โรงแรม");

await add("presale_requests", { activity_id: "", customer_id: "", customer_name: "เทศบาลนครสุราษฎร์ธานี", project_id: "", project_name: "CCTV เทศบาลเมืองนาสาร", type: "boq", requirement: "จัดทำ BOQ กล้อง CCTV 80 จุด พร้อม NVR, Switch, สาย Fiber, ศูนย์ควบคุม", assigned_to: "น้องมีน (Narakon Noonak)", due_date: today, status: "pending" });
console.log("  ✓ น้องมีน — BOQ CCTV เทศบาล");

await add("presale_requests", { activity_id: "", customer_id: "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "Server Room โรงพยาบาลสุราษฎร์", type: "technical_proposal", requirement: "จัดทำ Technical Proposal Server Room Tier 2 — UPS, Cooling, Rack, Network, Security", assigned_to: "ก็อฟ (Supat Kanchanaborisut)", due_date: next2Weeks, status: "pending" });
console.log("  ✓ ก็อฟ — proposal Server Room");

// ==========================================
// SERVICE TICKETS
// ==========================================
console.log("\n🔧 Creating service tickets...");
await add("service_tickets", { customer_id: "", customer_name: "บริษัท ABC Trading", project_id: "", project_name: "Network สำนักงานใหญ่ ABC", type: "installation", issue: "ติดตั้ง Switch 24 port 8 ตัว + เดินสาย LAN 200 จุด อาคาร A", technician: "ปอน (Nopporn Matmek)", service_date: today, status: "in_progress" });
console.log("  ✓ ปอน — ติดตั้ง Network ABC");

await add("service_tickets", { customer_id: "", customer_name: "โรงเรียนสุราษฎร์พิทยา", project_id: "", project_name: "WiFi โรงเรียนสุราษฎร์พิทยา", type: "pm_service", issue: "PM ระบบ WiFi ประจำไตรมาส 2 — เช็ค AP, Controller, สัญญาณ", technician: "ไผ่ (Sirichai Rakthong)", service_date: nextWeek, status: "open" });
console.log("  ✓ ไผ่ — PM WiFi โรงเรียน");

await add("service_tickets", { customer_id: "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "", type: "repair", issue: "Switch ชั้น 3 อาคาร OPD port 12-24 ไม่ทำงาน ลูกค้าใช้งานไม่ได้", technician: "โก้ด (Korngawat Yammanee)", service_date: today, status: "open" });
console.log("  ✓ โก้ด — ซ่อม Switch โรงพยาบาล");

await add("service_tickets", { customer_id: "", customer_name: "โรงแรม Paradise Resort", project_id: "", project_name: "", type: "after_sales", issue: "WiFi Lobby ช้า ลูกค้าร้องเรียนผ่าน Line — ต้องเช็ค AP + Bandwidth", technician: "ปอน (Nopporn Matmek)", service_date: yesterday, status: "in_progress" });
console.log("  ✓ ปอน — WiFi ช้า โรงแรม");

await add("service_tickets", { customer_id: "", customer_name: "เทศบาลนครสุราษฎร์ธานี", project_id: "", project_name: "", type: "site_survey", issue: "สำรวจจุดติดตั้ง CCTV 80 จุด — วัดระยะ, จุดจ่ายไฟ, เส้นทางสาย", technician: "ไผ่ (Sirichai Rakthong)", service_date: next2Weeks, status: "open" });
console.log("  ✓ ไผ่ — survey CCTV เทศบาล");

// ==========================================
// SALES QUOTAS (เป้าเดือนนี้)
// ==========================================
console.log("\n🎯 Creating sales quotas...");
const salesQuotas = [
  { user_name: "ออย (Suppaluck Chuoypeng)", role: "sale", quota_target: 2000000, actual_sales: 1800000, profit_target: 400000, actual_profit: 350000, target_gp_percent: 20, won_deals: 2, total_activities: 15 },
  { user_name: "แนนน้อย (Virakarn Kittipattanakij)", role: "sale", quota_target: 2500000, actual_sales: 3500000, profit_target: 500000, actual_profit: 680000, target_gp_percent: 20, won_deals: 3, total_activities: 22 },
  { user_name: "บีบี", role: "sale", quota_target: 1500000, actual_sales: 650000, profit_target: 300000, actual_profit: 120000, target_gp_percent: 20, won_deals: 1, total_activities: 10 },
  { user_name: "จะจ๋า", role: "sale", quota_target: 1800000, actual_sales: 900000, profit_target: 360000, actual_profit: 180000, target_gp_percent: 20, won_deals: 1, total_activities: 12 },
  { user_name: "อี๊ฟ", role: "sale", quota_target: 1200000, actual_sales: 420000, profit_target: 240000, actual_profit: 80000, target_gp_percent: 20, won_deals: 1, total_activities: 8 },
];
for (const q of salesQuotas) {
  const remaining = q.quota_target - q.actual_sales;
  const percent = q.quota_target > 0 ? (q.actual_sales / q.quota_target * 100) : 0;
  const profit_percent = q.profit_target > 0 ? (q.actual_profit / q.profit_target * 100) : 0;
  await add("sales_quotas", { ...q, month, remaining, percent, profit_percent });
  const status = percent >= 100 ? "🟢 เกินเป้า" : percent >= 70 ? "🟡 ใกล้เป้า" : "🔴 ต้องเร่ง";
  console.log(`  ✓ ${q.user_name.split(" ")[0]} — ${percent.toFixed(0)}% ${status}`);
}

console.log("\n✅ Sample data created successfully!");
console.log(`\nสรุป:`);
console.log(`  📁 Projects: ${projects.length} ใหม่`);
console.log(`  📞 Activities: 6`);
console.log(`  📋 Presale: 3`);
console.log(`  🔧 Service: 5`);
console.log(`  🎯 Quotas: ${salesQuotas.length}`);
process.exit(0);
