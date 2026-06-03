// Demo seed: adds sample service products + one preset + costs for a ticket
// Usage: node seed-demo-costs.mjs <ticketId>
// If no ticketId given, lists available tickets first.

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs, query,
  where, serverTimestamp, doc, updateDoc, arrayUnion,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const TENANT = "kmitsurat";
const TODAY = new Date().toISOString().slice(0, 10);

async function add(col, data) {
  return addDoc(collection(db, col), { ...data, tenant_id: TENANT, created_at: serverTimestamp() });
}

async function listCol(col) {
  const snap = await getDocs(query(collection(db, col), where("tenant_id", "==", TENANT)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── 1. Ensure service products exist ──────────────────────────────────────────
async function ensureProducts() {
  const existing = await listCol("products");
  const svcExisting = existing.filter(p => p.type === "service");
  const want = [
    { name: "Manday Senior",  cost_price: 2300, sale_price: 3500, unit: "วัน",   category: "บริการ", type: "service", code: "SVC-SR" },
    { name: "Manday Junior",  cost_price: 1600, sale_price: 2500, unit: "วัน",   category: "บริการ", type: "service", code: "SVC-JR" },
    { name: "ค่าที่พัก",      cost_price:  800, sale_price:  800, unit: "คืน",  category: "บริการ", type: "service", code: "SVC-HTL" },
    { name: "ค่าน้ำมัน/เที่ยว", cost_price: 500, sale_price: 500, unit: "เที่ยว", category: "บริการ", type: "service", code: "SVC-FUEL" },
    { name: "ค่าเดินทาง",     cost_price:  600, sale_price:  600, unit: "ครั้ง",  category: "บริการ", type: "service", code: "SVC-TRAVEL" },
    { name: "เบี้ยเลี้ยง",   cost_price:  240, sale_price:  240, unit: "วัน",   category: "บริการ", type: "service", code: "SVC-ALLOW" },
  ];

  const created = [];
  for (const p of want) {
    const exists = svcExisting.find(e => e.code === p.code);
    if (exists) {
      console.log(`  ✓ existing  ${p.name} (${p.code})`);
      created.push({ ...exists });
    } else {
      const ref = await add("products", { ...p, active: true, stock: 0 });
      console.log(`  + created   ${p.name} (${ref.id})`);
      created.push({ id: ref.id, ...p });
    }
  }
  return created;
}

// ── 2. Create / update a preset ───────────────────────────────────────────────
async function ensurePreset(products) {
  const existing = await listCol("service_cost_presets");
  const name = "CCTV 1 วัน ทีม 3 คน";
  if (existing.find(p => p.name === name)) {
    console.log(`  ✓ preset already exists: "${name}"`);
    return;
  }
  const sr  = products.find(p => p.code === "SVC-SR");
  const jr  = products.find(p => p.code === "SVC-JR");
  const htl = products.find(p => p.code === "SVC-HTL");
  const fuel= products.find(p => p.code === "SVC-FUEL");
  await add("service_cost_presets", {
    name,
    description: "ช่างอาวุโส 2 + จูเนียร์ 1 + ที่พัก 3 + น้ำมัน 2 เที่ยว",
    items: [
      { product_id: sr?.id,   product_name: sr?.name,   qty: 2, unit: "วัน",   cost_price: sr?.cost_price,   category: "labor" },
      { product_id: jr?.id,   product_name: jr?.name,   qty: 1, unit: "วัน",   cost_price: jr?.cost_price,   category: "labor" },
      { product_id: htl?.id,  product_name: htl?.name,  qty: 3, unit: "คืน",  cost_price: htl?.cost_price,  category: "accommodation" },
      { product_id: fuel?.id, product_name: fuel?.name, qty: 2, unit: "เที่ยว", cost_price: fuel?.cost_price, category: "fuel" },
    ],
  });
  console.log(`  + preset created: "${name}"`);
}

// ── 3. Add demo costs to a ticket ─────────────────────────────────────────────
async function addDemoCosts(ticketId, products) {
  const by = "Demo Script";

  // A) From Preset (batch)
  console.log("\n  [A] บันทึกจาก Preset (Batch):");
  const batchItems = [
    { product: "SVC-SR",  qty: 2, desc: "Manday Senior",  cat: "labor" },
    { product: "SVC-JR",  qty: 1, desc: "Manday Junior",  cat: "labor" },
    { product: "SVC-HTL", qty: 2, desc: "ค่าที่พัก",      cat: "accommodation" },
    { product: "SVC-FUEL",qty: 1, desc: "ค่าน้ำมัน/เที่ยว", cat: "fuel" },
  ];
  for (const item of batchItems) {
    const p = products.find(x => x.code === item.product);
    if (!p) continue;
    const amount = Math.round(p.cost_price * item.qty);
    await add("service_costs", {
      ticket_id: ticketId, category: item.cat,
      description: item.desc, amount,
      date: TODAY, vendor_name: `${item.qty} ${p.unit}`,
      created_by: by,
    });
    console.log(`    + ${item.desc} ×${item.qty} = ${amount.toLocaleString()} ฿`);
  }

  // B) % Revenue
  console.log("\n  [B] บันทึกแบบ % Revenue:");
  const revenue = 85000;
  const pct = 15;
  const pctAmount = Math.round(revenue * pct / 100);
  await add("service_costs", {
    ticket_id: ticketId, category: "percentage",
    description: `ค่าแรงติดตั้ง (${pct}%)`,
    amount: pctAmount, date: TODAY,
    percent: pct, percent_of: "revenue", base_amount: revenue,
    created_by: by,
  });
  console.log(`    + ${pct}% × ${revenue.toLocaleString()} ฿ = ${pctAmount.toLocaleString()} ฿`);

  // C) Manual entry
  console.log("\n  [C] กรอกเอง (Manual):");
  const manualItems = [
    { category: "parts",    description: "สายสัญญาณ RG6 200m",       amount: 3200, vendor: "ร้านไฟฟ้าเอส" },
    { category: "outsource", description: "ค่าเดินสายเพดาน (จ้างเหมา)", amount: 5000, vendor: "ทีมช่างท้องถิ่น" },
    { category: "allowance", description: "เบี้ยเลี้ยง 3 คน 1 วัน",     amount: 720,  vendor: "" },
  ];
  for (const item of manualItems) {
    await add("service_costs", {
      ticket_id: ticketId, category: item.category,
      description: item.description, amount: item.amount,
      date: TODAY, vendor_name: item.vendor,
      created_by: by,
    });
    console.log(`    + ${item.description} = ${item.amount.toLocaleString()} ฿`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const ticketId = process.argv[2];

  if (!ticketId) {
    console.log("ไม่ได้ระบุ ticketId — แสดงรายการ tickets ที่มีอยู่:\n");
    const tickets = await listCol("service_tickets");
    if (!tickets.length) { console.log("  ไม่มี ticket"); process.exit(0); }
    for (const t of tickets.slice(0, 10)) {
      console.log(`  ${t.id}  |  ${t.customer_name}  |  ${t.status}  |  ${t.issue?.slice(0, 40)}`);
    }
    console.log(`\nรัน: node seed-demo-costs.mjs <ticketId>`);
    process.exit(0);
  }

  console.log("── สร้างสินค้าบริการ ──────────────────────────────");
  const products = await ensureProducts();

  console.log("\n── สร้าง Preset ───────────────────────────────────");
  await ensurePreset(products);

  console.log(`\n── เพิ่มต้นทุนตัวอย่างให้ ticket: ${ticketId} ──────`);
  await addDemoCosts(ticketId, products);

  const all = await listCol("service_costs");
  const mine = all.filter(c => c.ticket_id === ticketId);
  const total = mine.reduce((s, c) => s + (c.amount || 0), 0);
  console.log(`\n✅ เสร็จแล้ว — รวมต้นทุน ticket นี้: ${total.toLocaleString()} ฿`);
  console.log(`   เปิดดูได้ที่: http://localhost:3000/service  (👁 Detail → 💰 ต้นทุน)`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
