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
  "โรงเรียนสุราษฎร์พิทยา": { province: "สุราษฎร์ธานี", org_type: "education" },
  "โรงพยาบาลสุราษฎร์ธานี": { province: "สุราษฎร์ธานี", org_type: "hospital" },
  "บริษัท ABC Trading": { province: "กรุงเทพ", org_type: "private" },
  "โรงแรม Paradise Resort": { province: "ภูเก็ต", org_type: "hotel" },
  "เทศบาลนครสุราษฎร์ธานี": { province: "สุราษฎร์ธานี", org_type: "government" },
};

const q = query(collection(db, "customers"), where("tenant_id", "==", "kmitsurat"));
const snap = await getDocs(q);

for (const d of snap.docs) {
  const name = d.data().company_name;
  if (updates[name]) {
    await updateDoc(doc(db, "customers", d.id), updates[name]);
    console.log(`  Updated: ${name} → ${updates[name].province} (${updates[name].org_type})`);
  }
}

console.log("Done!");
process.exit(0);
