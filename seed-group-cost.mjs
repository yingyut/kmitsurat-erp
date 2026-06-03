import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);
const TENANT = "kmitsurat";
const TODAY = new Date().toISOString().slice(0, 10);

async function list(col) {
  const snap = await getDocs(query(collection(db, col), where("tenant_id", "==", TENANT)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function add(col, data) {
  return addDoc(collection(db, col), { ...data, tenant_id: TENANT, created_at: serverTimestamp() });
}

async function main() {
  // หา ticket ที่เปิดอยู่
  const tickets = await list("service_tickets");
  const target = tickets.find(t => t.id === "PUpSMTMPYP6m8W8hutTE") || tickets.find(t => t.status === "in_progress") || tickets[0];
  console.log(`\nTicket: ${target.customer_name} — ${target.issue?.slice(0, 50)}`);
  console.log(`ID    : ${target.id}\n`);

  // หา group products
  const products = await list("products");
  const groups = products.filter(p => p.type === "group");
  if (!groups.length) { console.log("ไม่มี group product — รัน seed-demo-group.mjs ก่อน"); process.exit(1); }

  console.log("── บันทึกต้นทุนแบบ Group (1 ไอเทมต่อกลุ่ม) ──────────────────");
  for (const g of groups) {
    const qty = 1;
    const amount = Math.round(g.cost_price * qty);
    const itemSummary = (g.group_items || []).slice(0, 3).map(i => `${i.product_name}×${i.qty}`).join(", ");
    const more = (g.group_items || []).length > 3 ? ` +${g.group_items.length - 3}` : "";

    await add("service_costs", {
      ticket_id: target.id,
      category: "custom",
      description: `🗂️ ${g.name}`,
      amount,
      date: TODAY,
      vendor_name: `${qty} ${g.unit || "ชุด"} | ${itemSummary}${more}`,
      created_by: "Demo Script",
    });

    console.log(`\n  ✅ บันทึกกลุ่ม: "${g.name}"`);
    console.log(`     ${(g.group_items || []).length} รายการ → 1 cost entry = ${amount.toLocaleString()} ฿`);
    for (const i of (g.group_items || [])) {
      console.log(`       · ${i.product_name} ×${i.qty}  =  ${(i.cost_price * i.qty).toLocaleString()} ฿`);
    }
    console.log(`     ─────────────────────────────────────`);
    console.log(`     รวมทุนกลุ่ม (บันทึกเป็น 1 ก้อน) = ${amount.toLocaleString()} ฿`);
  }

  const allCosts = await list("service_costs");
  const thisCosts = allCosts.filter(c => c.ticket_id === target.id);
  const total = thisCosts.reduce((s, c) => s + (c.amount || 0), 0);
  console.log(`\n── สรุป Ticket นี้ (${thisCosts.length} รายการ) ────────────────────`);
  for (const c of thisCosts) {
    console.log(`  ${c.description?.padEnd(40)} ${c.amount?.toLocaleString()?.padStart(8)} ฿`);
  }
  console.log(`  ${"─".repeat(50)}`);
  console.log(`  ${"รวมต้นทุนทั้งหมด".padEnd(40)} ${total.toLocaleString()?.padStart(8)} ฿`);
  console.log(`\n  เปิดดู: http://localhost:3000/service  → 👁 Detail → 💰 ต้นทุน`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
