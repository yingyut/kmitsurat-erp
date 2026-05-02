import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8", authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web", storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878", appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);

const types = [
  { name: "WiFi", description: "งานติดตั้งระบบ WiFi / Wireless LAN" },
  { name: "CCTV", description: "งานติดตั้งกล้องวงจรปิด" },
  { name: "Network", description: "งานระบบ LAN / WAN / Switching / Routing" },
  { name: "Server", description: "งานติดตั้ง Server / Storage / Virtualization" },
  { name: "Access Control", description: "ระบบควบคุมการเข้า-ออก" },
  { name: "Fire Alarm", description: "ระบบแจ้งเตือนอัคคีภัย" },
  { name: "UPS / Power", description: "ระบบไฟฟ้าสำรอง UPS / Generator" },
  { name: "Software", description: "งานพัฒนาซอฟต์แวร์ / License" },
  { name: "MA / PM", description: "สัญญาบำรุงรักษา / Preventive Maintenance" },
  { name: "Consulting", description: "งานที่ปรึกษา / ออกแบบระบบ" },
  { name: "Data Center", description: "งานออกแบบ / ติดตั้ง Data Center" },
  { name: "Smart City", description: "โครงการ Smart City / IoT" },
];

for (const t of types) {
  await addDoc(collection(db, "project_types"), { ...t, tenant_id: "kmitsurat", created_at: serverTimestamp() });
  console.log(`  ✓ ${t.name}`);
}
console.log(`Done! ${types.length} project types created.`);
process.exit(0);
