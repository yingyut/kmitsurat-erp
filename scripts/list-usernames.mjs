import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
const app = initializeApp({ apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8", authDomain: "kmitsurat-erp-web.firebaseapp.com", projectId: "kmitsurat-erp-web", storageBucket: "kmitsurat-erp-web.firebasestorage.app", messagingSenderId: "95953141878", appId: "1:95953141878:web:02b0a651d51b1b106c9f57" });
const db = getFirestore(app);
const snap = await getDocs(query(collection(db, "users"), where("tenant_id", "==", "kmitsurat")));
console.log("Username options for login:");
snap.docs.forEach(d => {
  const u = d.data();
  const nick = u.nickname || "";
  const first = u.first_name || "";
  const email = u.email || "";
  console.log(`  ${nick.padEnd(12)} | first: ${first.padEnd(15)} | email: ${email.padEnd(35)} | role: ${u.role}`);
});
process.exit(0);
