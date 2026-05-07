import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function POST() {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const TENANT = "kmitsurat";

    // Check if administrator already exists
    const q = query(collection(db, "users"), where("tenant_id", "==", TENANT), where("login_username", "==", "administrator"));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return NextResponse.json({ message: "User administrator already exists" }, { status: 200 });
    }

    await addDoc(collection(db, "users"), {
      tenant_id: TENANT,
      name: "administrator",
      nickname: "administrator",
      first_name: "",
      last_name: "",
      display_preference: "nickname",
      email: "",
      role: "admin",
      position: "ผู้ดูแลระบบสูงสุด",
      department: "",
      phone: "",
      bio: "",
      active: true,
      sales_code: "",
      login_username: "administrator",
      password: "P@ssw0rd!@",
      created_at: serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Administrator user created" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
