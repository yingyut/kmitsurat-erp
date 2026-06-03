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

async function add(col, data) {
  return addDoc(collection(db, col), { ...data, tenant_id: TENANT, created_at: serverTimestamp() });
}
async function list(col) {
  const snap = await getDocs(query(collection(db, col), where("tenant_id", "==", TENANT)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function main() {
  const existing = await list("products");
  const byCode = Object.fromEntries(existing.map(p => [p.code, p]));

  // ── 1. สินค้าหลัก (hardware) ─────────────────────────────────────────────
  const hardware = [
    { code: "CAM-IP-2MP",  name: "IP Camera 2MP Hikvision", cost_price: 2800, selling_price: 4500, unit: "ตัว", type: "product", category: "กล้องวงจรปิด" },
    { code: "NVR-8CH",     name: "NVR 8 Channel Hikvision",  cost_price: 8500, selling_price: 13000, unit: "เครื่อง", type: "product", category: "กล้องวงจรปิด" },
    { code: "HDD-4TB",     name: "HDD 4TB WD Purple",        cost_price: 3200, selling_price: 4800, unit: "ลูก", type: "product", category: "อุปกรณ์เสริม" },
    { code: "POE-SW-8",    name: "PoE Switch 8 Port",         cost_price: 1800, selling_price: 2800, unit: "ตัว", type: "product", category: "เครือข่าย" },
    { code: "CAB-RG6-BOX", name: "สาย RG6 (ม้วน 100m)",      cost_price: 1200, selling_price: 1800, unit: "ม้วน", type: "product", category: "อุปกรณ์เสริม" },
  ];
  const hwMap = {};
  for (const p of hardware) {
    if (byCode[p.code]) { hwMap[p.code] = byCode[p.code]; console.log(`  ✓ existing  ${p.name}`); continue; }
    const ref = await add("products", { ...p, brand: p.code.startsWith("CAM") || p.code.startsWith("NVR") ? "Hikvision" : p.code.startsWith("HDD") ? "WD" : "Generic", active: true, stock: 0 });
    hwMap[p.code] = { id: ref.id, ...p };
    console.log(`  + created   ${p.name}`);
  }

  // ── 2. กลุ่มสินค้า: CCTV Package 8ch ────────────────────────────────────
  const pkg8ch = {
    code: "PKG-CCTV-8CH",
    name: "CCTV Package 8 Channel (กล้อง 8 ตัว)",
    type: "group",
    category: "กล้องวงจรปิด",
    unit: "ชุด",
    active: true,
    brand: "",
    stock: 0,
    group_items: [
      { product_id: hwMap["CAM-IP-2MP"].id, product_name: hwMap["CAM-IP-2MP"].name, qty: 8, unit: "ตัว",     cost_price: hwMap["CAM-IP-2MP"].cost_price, selling_price: hwMap["CAM-IP-2MP"].selling_price },
      { product_id: hwMap["NVR-8CH"].id,    product_name: hwMap["NVR-8CH"].name,    qty: 1, unit: "เครื่อง", cost_price: hwMap["NVR-8CH"].cost_price,    selling_price: hwMap["NVR-8CH"].selling_price },
      { product_id: hwMap["HDD-4TB"].id,    product_name: hwMap["HDD-4TB"].name,    qty: 1, unit: "ลูก",     cost_price: hwMap["HDD-4TB"].cost_price,    selling_price: hwMap["HDD-4TB"].selling_price },
      { product_id: hwMap["POE-SW-8"].id,   product_name: hwMap["POE-SW-8"].name,   qty: 1, unit: "ตัว",     cost_price: hwMap["POE-SW-8"].cost_price,    selling_price: hwMap["POE-SW-8"].selling_price },
      { product_id: hwMap["CAB-RG6-BOX"].id,product_name: hwMap["CAB-RG6-BOX"].name,qty: 2, unit: "ม้วน",  cost_price: hwMap["CAB-RG6-BOX"].cost_price, selling_price: hwMap["CAB-RG6-BOX"].selling_price },
    ],
  };
  pkg8ch.cost_price   = pkg8ch.group_items.reduce((s, i) => s + i.cost_price * i.qty, 0);
  pkg8ch.selling_price= pkg8ch.group_items.reduce((s, i) => s + i.selling_price * i.qty, 0);

  // ── 3. กลุ่มบริการ: ทีมติดตั้ง 1 วัน ────────────────────────────────────
  const svc = existing.filter(p => p.type === "service");
  const bySvcCode = Object.fromEntries(svc.map(p => [p.code, p]));
  const sr  = bySvcCode["SVC-SR"]     || svc.find(p => p.name.includes("Senior"));
  const jr  = bySvcCode["SVC-JR"]     || svc.find(p => p.name.includes("Junior"));
  const htl = bySvcCode["SVC-HTL"]    || svc.find(p => p.name.includes("ที่พัก"));
  const fuel= bySvcCode["SVC-FUEL"]   || svc.find(p => p.name.includes("น้ำมัน"));
  const all = bySvcCode["SVC-ALLOW"]  || svc.find(p => p.name.includes("เบี้ยเลี้ยง"));

  const teamPkg = {
    code: "PKG-TEAM-1D",
    name: "ทีมติดตั้ง 1 วัน (Sr×2 + Jr×1 + ที่พัก + น้ำมัน + เบี้ยเลี้ยง)",
    type: "group",
    category: "บริการ",
    unit: "Job",
    active: true,
    brand: "",
    stock: 0,
    group_items: [
      sr   ? { product_id: sr.id,   product_name: sr.name,   qty: 2, unit: "วัน",    cost_price: sr.cost_price || 0,   selling_price: sr.selling_price || sr.cost_price || 0   } : null,
      jr   ? { product_id: jr.id,   product_name: jr.name,   qty: 1, unit: "วัน",    cost_price: jr.cost_price || 0,   selling_price: jr.selling_price || jr.cost_price || 0   } : null,
      htl  ? { product_id: htl.id,  product_name: htl.name,  qty: 2, unit: "คืน",   cost_price: htl.cost_price || 0,  selling_price: htl.selling_price || htl.cost_price || 0  } : null,
      fuel ? { product_id: fuel.id, product_name: fuel.name, qty: 2, unit: "เที่ยว",cost_price: fuel.cost_price || 0, selling_price: fuel.selling_price || fuel.cost_price || 0 } : null,
      all  ? { product_id: all.id,  product_name: all.name,  qty: 3, unit: "วัน",    cost_price: all.cost_price || 0,  selling_price: all.selling_price || all.cost_price || 0  } : null,
    ].filter(Boolean),
  };
  teamPkg.cost_price    = teamPkg.group_items.reduce((s, i) => s + i.cost_price * i.qty, 0);
  teamPkg.selling_price = teamPkg.group_items.reduce((s, i) => s + (i.selling_price || i.cost_price) * i.qty, 0);

  for (const pkg of [pkg8ch, teamPkg]) {
    if (byCode[pkg.code]) { console.log(`\n  ✓ existing group: "${pkg.name}"`); continue; }
    await add("products", pkg);
    console.log(`\n  + group created: "${pkg.name}"`);
    console.log(`    รายการ ${pkg.group_items.length} ไอเทม`);
    for (const i of pkg.group_items) console.log(`      · ${i.product_name} ×${i.qty} = ${(i.cost_price * i.qty).toLocaleString()}฿`);
    console.log(`    ทุนรวม   : ${pkg.cost_price.toLocaleString()} ฿`);
    console.log(`    ขายรวม   : ${pkg.selling_price.toLocaleString()} ฿`);
    console.log(`    Margin   : ${((pkg.selling_price - pkg.cost_price) / pkg.selling_price * 100).toFixed(1)}%`);
  }

  console.log("\n✅ เสร็จแล้ว — ดูได้ที่ http://localhost:3000/products (กรอง 🗂️ กลุ่ม)");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
