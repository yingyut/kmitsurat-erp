import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
const app = initializeApp({ apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8", authDomain: "kmitsurat-erp-web.firebaseapp.com", projectId: "kmitsurat-erp-web", storageBucket: "kmitsurat-erp-web.firebasestorage.app", messagingSenderId: "95953141878", appId: "1:95953141878:web:02b0a651d51b1b106c9f57" });
const db = getFirestore(app);

// Fill missing first_names + set login_username
const updates = {
  "บีบี": { first_name: "Bibi", login_username: "bibi" },
  "พี่จอร์ด": { first_name: "Jord", login_username: "jord" },
  "อี๊ฟ": { first_name: "Eve", login_username: "eve" },
  "จะจ๋า": { first_name: "Jaja", login_username: "jaja" },
  "System Admin": { first_name: "System", login_username: "sysadmin" },
  "น้องมีน": { login_username: "narakon" },
  "พี่กรด": { login_username: "yingyut" },
  "แนนน้อย": { login_username: "virakarn" },
  "ปอน": { login_username: "nopporn" },
  "พี่แนน": { login_username: "sarocha" },
  "ไผ่": { login_username: "sirichai" },
  "ก็อฟ": { login_username: "supat" },
  "โก้ด": { login_username: "korngawat" },
  "ออย": { login_username: "suppaluck" },
  "น้องก้อย": { login_username: "patcharee" },
};

const snap = await getDocs(query(collection(db, "users"), where("tenant_id", "==", "kmitsurat")));
for (const d of snap.docs) {
  const nick = d.data().nickname || d.data().name || "";
  const match = Object.entries(updates).find(([key]) => nick.includes(key) || key.includes(nick));
  if (match) {
    const [, data] = match;
    await updateDoc(doc(db, "users", d.id), { ...data, password: "P@ssw0rd" });
    console.log(`  ✓ ${nick} → login: ${data.login_username}`);
  }
}
console.log("Done!");
process.exit(0);
