import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);

const updates = {
  "น้องมีน": { first_name: "Narakon", last_name: "Noonak", email: "no_narakon@kmit-group.com", name: "น้องมีน (Narakon Noonak)" },
  "พี่แนน": { first_name: "Sarocha", last_name: "Makjaroen", email: "ma_sarocha@kmit-group.com", name: "พี่แนน (Sarocha Makjaroen)" },
  "พี่กอร์ฟ": { first_name: "Supat", last_name: "Kanchanaborisut", email: "ka_supat@kmit-group.com", nickname: "ก็อฟ", name: "ก็อฟ (Supat Kanchanaborisut)" },
  "พี่กรด": { first_name: "Yingyut", last_name: "Chokkanapitak", email: "ch_yingyut@kmit-group.com", name: "พี่กรด (Yingyut Chokkanapitak)" },
  "น้องก้อย": { first_name: "Patcharee", last_name: "Ruangpokavit", email: "ru_patcharee@kmit-group.com", name: "น้องก้อย (Patcharee Ruangpokavit)" },
  "แนนน้อย": { first_name: "Virakarn", last_name: "Kittipattanakij", email: "ki_virakarn@kmit-group.com", name: "แนนน้อย (Virakarn Kittipattanakij)" },
  "ปอน": { first_name: "Nopporn", last_name: "Matmek", email: "ma_nopporn@kmit-group.com", name: "ปอน (Nopporn Matmek)" },
  "โก้ด": { first_name: "Korngawat", last_name: "Yammanee", email: "ya_korngawat@kmit-group.com", name: "โก้ด (Korngawat Yammanee)" },
  "ไผ่": { first_name: "Sirichai", last_name: "Rakthong", email: "ra_sirichai@kmit-group.com", name: "ไผ่ (Sirichai Rakthong)" },
  "ออย": { first_name: "Suppaluck", last_name: "Chuoypeng", email: "ch_suppaluck@kmit-group.com", name: "ออย (Suppaluck Chuoypeng)" },
};

const q = query(collection(db, "users"), where("tenant_id", "==", "kmitsurat"));
const snap = await getDocs(q);

let updated = 0;
for (const d of snap.docs) {
  const nickname = d.data().nickname || d.data().name;
  // Match by nickname field or name field
  const match = Object.entries(updates).find(([key]) => {
    return nickname === key || (d.data().name || "").includes(key);
  });
  if (match) {
    const [nick, data] = match;
    await updateDoc(doc(db, "users", d.id), data);
    console.log(`  ✓ ${nick} → ${data.name} (${data.email})`);
    updated++;
  }
}

console.log(`\nDone! Updated ${updated} users.`);
process.exit(0);
