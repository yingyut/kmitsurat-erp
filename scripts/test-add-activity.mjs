import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

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

// --- Add test documents ---
const testActivities = [
  { text: "ไปพบโรงเรียน ABC ต้องการ WiFi + CCTV ติดต่อครูสมชาย 089-123-4567", tenant_id: "kmitsurat", status: "new" },
  { text: "ลูกค้า XYZ Corp ต้องการระบบ Network ทั้งอาคาร ติดต่อคุณวิชัย 081-234-5678", tenant_id: "kmitsurat", status: "new" },
  { text: "โรงพยาบาล DEF สนใจระบบ CCTV 32 จุด นัดเข้า survey สัปดาห์หน้า", tenant_id: "kmitsurat", status: "new" },
];

console.log("Adding test activities...\n");

for (const act of testActivities) {
  try {
    const docRef = await addDoc(collection(db, "activities"), {
      ...act,
      createdAt: serverTimestamp(),
    });
    console.log(`  Added: "${act.text.substring(0, 40)}..." -> ID: ${docRef.id}`);
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
  }
}

// --- Read back ---
console.log("\n--- Reading activities from Firestore ---\n");

try {
  const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.log("  (no documents found)");
  } else {
    snap.docs.forEach((doc, i) => {
      const d = doc.data();
      console.log(`  ${i + 1}. [${d.status}] ${d.text}`);
      console.log(`     tenant: ${d.tenant_id} | id: ${doc.id}`);
    });
  }

  console.log(`\nTotal: ${snap.size} document(s)`);
} catch (err) {
  console.error(`  Read failed: ${err.message}`);
}

process.exit(0);
