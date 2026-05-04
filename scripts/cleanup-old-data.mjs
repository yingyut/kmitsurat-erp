import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, updateDoc, doc, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);

// Current real team nicknames
const realTeam = new Set([
  "พี่กรด", "พี่แนน", "น้องก้อย", "ออย", "แนนน้อย", "อี๊ฟ", "บีบี", "จะจ๋า",
  "พี่กรด", "ก็อฟ", "น้องมีน", "ปอน", "ไผ่", "โก้ด", "System Admin", "พี่จอร์ด",
]);

// Also match by full names
const realFullNames = new Set([
  "พี่กรด (Yingyut Chokkanapitak)",
  "พี่แนน (Sarocha Makjaroen)",
  "น้องก้อย (Patcharee Ruangpokavit)",
  "ออย (Suppaluck Chuoypeng)",
  "แนนน้อย (Virakarn Kittipattanakij)",
  "ก็อฟ (Supat Kanchanaborisut)",
  "น้องมีน (Narakon Noonak)",
  "ปอน (Nopporn Matmek)",
  "ไผ่ (Sirichai Rakthong)",
  "โก้ด (Korngawat Yammanee)",
]);

function isRealUser(name) {
  if (!name) return false;
  if (realFullNames.has(name)) return true;
  for (const nick of realTeam) {
    if (name.includes(nick)) return true;
  }
  return false;
}

// 1. List all users — find old/fake ones
console.log("=== USERS ===");
const usersQ = query(collection(db, "users"), where("tenant_id", "==", "kmitsurat"));
const usersSnap = await getDocs(usersQ);
const oldUsers = [];
const currentUsers = [];
for (const d of usersSnap.docs) {
  const u = d.data();
  const nick = u.nickname || u.name || "";
  if (isRealUser(nick) || isRealUser(u.name)) {
    currentUsers.push({ id: d.id, name: u.name, nickname: u.nickname });
    console.log(`  ✓ KEEP: ${u.name} (${u.nickname || "-"})`);
  } else {
    oldUsers.push({ id: d.id, name: u.name, nickname: u.nickname });
    console.log(`  ✗ OLD:  ${u.name} (${u.nickname || "-"})`);
  }
}

// Delete old users
for (const u of oldUsers) {
  await deleteDoc(doc(db, "users", u.id));
  console.log(`  🗑️ Deleted: ${u.name}`);
}

// 2. Check activities/quotas that reference old names
const collections = [
  { name: "sales_activities", field: "assigned_to" },
  { name: "presale_requests", field: "assigned_to" },
  { name: "service_tickets", field: "technician" },
  { name: "projects", field: "assigned_to" },
  { name: "sales_quotas", field: "user_name" },
];

const currentNames = new Set(currentUsers.map(u => u.name));

for (const col of collections) {
  console.log(`\n=== ${col.name} (field: ${col.field}) ===`);
  const q2 = query(collection(db, col.name), where("tenant_id", "==", "kmitsurat"));
  const snap = await getDocs(q2);
  for (const d of snap.docs) {
    const val = d.data()[col.field];
    if (val && !isRealUser(val)) {
      console.log(`  ⚠️ Old ref: "${val}" in doc ${d.id}`);
      // Clear the old reference
      await updateDoc(doc(db, col.name, d.id), { [col.field]: "" });
      console.log(`    → Cleared`);
    }
  }
}

console.log("\n✅ Cleanup done!");
process.exit(0);
