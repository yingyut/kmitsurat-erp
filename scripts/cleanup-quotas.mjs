import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);

// Current real team
const realNames = new Set([
  "ออย (Suppaluck Chuoypeng)",
  "แนนน้อย (Virakarn Kittipattanakij)",
  "บีบี",
  "จะจ๋า",
  "อี๊ฟ",
  "พี่กรด (Yingyut Chokkanapitak)",
  "พี่แนน (Sarocha Makjaroen)",
  "ก็อฟ (Supat Kanchanaborisut)",
  "น้องมีน (Narakon Noonak)",
  "ปอน (Nopporn Matmek)",
  "ไผ่ (Sirichai Rakthong)",
  "โก้ด (Korngawat Yammanee)",
  "น้องก้อย (Patcharee Ruangpokavit)",
  "พี่จอร์ด",
  "System Admin",
]);

function isReal(name) {
  if (!name) return false;
  for (const n of realNames) {
    if (name === n || n.includes(name) || name.includes(n.split(" ")[0])) return true;
  }
  return false;
}

const q = query(collection(db, "sales_quotas"), where("tenant_id", "==", "kmitsurat"));
const snap = await getDocs(q);

console.log(`=== Sales Quotas: ${snap.size} documents ===\n`);

let kept = 0;
let deleted = 0;

for (const d of snap.docs) {
  const data = d.data();
  const name = data.user_name || "";
  const month = data.month || "";
  const target = data.quota_target || 0;
  const actual = data.actual_sales || 0;

  if (!name || !isReal(name)) {
    console.log(`  ✗ DELETE: "${name}" | month: ${month} | target: ${target} | actual: ${actual}`);
    await deleteDoc(doc(db, "sales_quotas", d.id));
    deleted++;
  } else {
    console.log(`  ✓ KEEP:   "${name}" | month: ${month} | target: ${target.toLocaleString()} | actual: ${actual.toLocaleString()}`);
    kept++;
  }
}

console.log(`\nDone! Kept: ${kept}, Deleted: ${deleted}`);
process.exit(0);
