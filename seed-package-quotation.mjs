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

async function list(col) {
  const snap = await getDocs(query(collection(db, col), where("tenant_id", "==", TENANT)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function add(col, data) {
  return addDoc(collection(db, col), { ...data, tenant_id: TENANT, created_at: serverTimestamp() });
}

async function main() {
  const [products, customers] = await Promise.all([list("products"), list("customers")]);

  const groups = products.filter(p => p.type === "group" && p.active !== false);
  if (!groups.length) { console.log("ไม่พบ group product — รัน seed-demo-group.mjs ก่อน"); process.exit(1); }

  const customer = customers[0];
  if (!customer) { console.log("ไม่พบลูกค้า — เพิ่มลูกค้าในระบบก่อน"); process.exit(1); }

  console.log(`\n🧑 ลูกค้า: ${customer.company_name}`);
  console.log(`📦 Group products ที่พบ: ${groups.length} กลุ่ม\n`);

  // Build package items from all groups
  const quoteItems = groups.map(g => {
    const packageItems = (g.group_items || []).map(gi => ({
      product_id: gi.product_id || "",
      product_code: gi.product_code || "",
      product_name: gi.product_name,
      item_type: gi.item_type || "product",
      qty: gi.qty,
      unit: gi.unit || "pcs",
      cost_price: gi.cost_price || 0,
      selling_price: gi.selling_price || gi.cost_price || 0,
      discount: 0,
      total_cost: (gi.cost_price || 0) * gi.qty,
      total_selling: (gi.selling_price || gi.cost_price || 0) * gi.qty,
      show_in_quote: true,
    }));

    const pkgCost = packageItems.reduce((s, i) => s + i.total_cost, 0);
    const pkgSell = packageItems.reduce((s, i) => s + i.total_selling, 0);
    const margin = pkgSell > 0 ? ((pkgSell - pkgCost) / pkgSell * 100) : 0;

    console.log(`  🗂️ Package: "${g.name}"`);
    console.log(`     รายการย่อย ${packageItems.length} ไอเทม`);
    for (const pi of packageItems) {
      const icon = { product:"📦", labor:"👷", travel:"🚗", config:"⚙️", pm:"🔧", ma:"🛡️", other:"📋" }[pi.item_type] || "•";
      console.log(`       ${icon} ${pi.product_name} ×${pi.qty} = ${(pi.total_selling).toLocaleString()} ฿`);
    }
    console.log(`     ทุน: ${pkgCost.toLocaleString()} ฿  |  ขาย: ${pkgSell.toLocaleString()} ฿  |  GP: ${margin.toFixed(1)}%\n`);

    return {
      product_id: g.id,
      product_code: g.code || "",
      product_name: g.name,
      qty: 1,
      unit: g.unit || "ชุด",
      cost_price: pkgCost,
      selling_price: pkgSell,
      discount: 0,
      total_cost: pkgCost,
      total_selling: pkgSell,
      margin_percent: margin,
      price_tier: "general",
      is_package: true,
      package_display: "itemized",
      package_items: packageItems,
    };
  });

  // Also add a regular manual item for comparison
  quoteItems.push({
    product_id: "",
    product_code: "SVC-MISC",
    product_name: "ค่าใช้จ่ายเบ็ดเตล็ด (Manual)",
    qty: 1,
    unit: "งาน",
    cost_price: 3000,
    selling_price: 5000,
    discount: 0,
    total_cost: 3000,
    total_selling: 5000,
    margin_percent: 40,
    price_tier: "general",
  });

  const totalCost = quoteItems.reduce((s, i) => s + i.total_cost, 0);
  const totalSelling = quoteItems.reduce((s, i) => s + i.total_selling, 0);
  const grossProfit = totalSelling - totalCost;
  const gpPct = totalSelling > 0 ? (grossProfit / totalSelling * 100) : 0;
  const vatAmount = totalSelling * 0.07;
  const grandTotal = totalSelling + vatAmount;

  const ref = await add("quotations", {
    quotation_number: `PKG-TEST-${Date.now().toString(36).toUpperCase()}`,
    customer_id: customer.id,
    customer_name: customer.company_name,
    project_id: "",
    project_name: "Demo Package Test",
    items: quoteItems,
    total_cost: totalCost,
    total_selling: totalSelling,
    total_discount: 0,
    gross_profit: grossProfit,
    gp_percent: gpPct,
    vat_mode: "exclusive",
    vat_rate: 7,
    vat_amount: vatAmount,
    grand_total: grandTotal,
    status: "draft",
    notes: "ใบเสนอราคาทดสอบระบบ Package — สร้างโดย seed script",
    created_by: "Demo Script",
    salesperson: "Demo Script",
    version: 1,
  });

  console.log(`✅ สร้างใบเสนอราคาสำเร็จ (ID: ${ref.id})`);
  console.log(`\n── สรุป ──────────────────────────────────────`);
  console.log(`  ${quoteItems.length} รายการ (${groups.length} Package + 1 Manual)`);
  console.log(`  ทุนรวม:    ${totalCost.toLocaleString()} ฿`);
  console.log(`  ขายรวม:    ${totalSelling.toLocaleString()} ฿`);
  console.log(`  GP:         ${gpPct.toFixed(1)}%`);
  console.log(`  Grand Total: ${grandTotal.toLocaleString()} ฿ (รวม VAT 7%)`);
  console.log(`\n  ดูได้ที่: http://localhost:3000/quotations`);
  console.log(`  คลิกเปิดใบเสนอราคา → กดที่แต่ละ Package → สลับ display mode ได้`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
