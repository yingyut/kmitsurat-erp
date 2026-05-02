import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

const users = [
  // === Sales Team ===
  {
    tenant_id: "kmitsurat",
    name: "สมชาย วงศ์สุวรรณ",
    email: "somchai@kmitsurat.com",
    role: "sale",
    team_id: "",
    active: true,
    position: "Sales Manager",
    department: "Sales",
    phone: "081-234-5678",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=SC&backgroundColor=3b82f6",
    bio: "ผู้จัดการทีมขาย ดูแลลูกค้าภาคเอกชนและหน่วยงานราชการ ประสบการณ์ 10 ปีในสาย SI",
  },
  {
    tenant_id: "kmitsurat",
    name: "วิภาดา ศรีสุข",
    email: "wipada@kmitsurat.com",
    role: "sale",
    team_id: "",
    active: true,
    position: "Senior Sales Executive",
    department: "Sales",
    phone: "082-345-6789",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=WP&backgroundColor=8b5cf6",
    bio: "เซลล์อาวุโส เชี่ยวชาญงานโครงการ CCTV และ Network ดูแลลูกค้ากลุ่มโรงเรียนและโรงพยาบาล",
  },
  {
    tenant_id: "kmitsurat",
    name: "ธนพล จิตรวิเศษ",
    email: "thanapol@kmitsurat.com",
    role: "sale",
    team_id: "",
    active: true,
    position: "Sales Executive",
    department: "Sales",
    phone: "083-456-7890",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=TP&backgroundColor=06b6d4",
    bio: "เซลล์ประจำเขตภาคใต้ ดูแลงาน WiFi และระบบ Network สำหรับโรงแรมและรีสอร์ท",
  },

  // === Presale Team ===
  {
    tenant_id: "kmitsurat",
    name: "กิตติพงษ์ แสงทอง",
    email: "kittipong@kmitsurat.com",
    role: "presale",
    team_id: "",
    active: true,
    position: "Presale Manager",
    department: "Presale",
    phone: "084-567-8901",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=KP&backgroundColor=f59e0b",
    bio: "ผู้จัดการทีมพรีเซลล์ ออกแบบโซลูชัน Network, WiFi, CCTV ให้กับโครงการขนาดใหญ่",
  },
  {
    tenant_id: "kmitsurat",
    name: "นภัสสร พิมพ์ทอง",
    email: "napatsorn@kmitsurat.com",
    role: "presale",
    team_id: "",
    active: true,
    position: "Presale Engineer",
    department: "Presale",
    phone: "085-678-9012",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=NS&backgroundColor=ec4899",
    bio: "วิศวกรพรีเซลล์ จัดทำ BOQ และ Technical Proposal รับผิดชอบงาน Site Survey",
  },
  {
    tenant_id: "kmitsurat",
    name: "อนุชา เพชรรัตน์",
    email: "anucha@kmitsurat.com",
    role: "presale",
    team_id: "",
    active: true,
    position: "Solution Architect",
    department: "Presale",
    phone: "086-789-0123",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=AC&backgroundColor=14b8a6",
    bio: "สถาปนิกโซลูชัน เชี่ยวชาญการออกแบบระบบ Enterprise Network และ Data Center",
  },

  // === Service Team ===
  {
    tenant_id: "kmitsurat",
    name: "ประวิทย์ มั่นคง",
    email: "prawit@kmitsurat.com",
    role: "service",
    team_id: "",
    active: true,
    position: "Service Manager",
    department: "Service",
    phone: "087-890-1234",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=PW&backgroundColor=ef4444",
    bio: "ผู้จัดการทีมบริการ ดูแลงาน CM/PM/Installation ทั่วประเทศ",
  },
  {
    tenant_id: "kmitsurat",
    name: "สุรศักดิ์ ใจดี",
    email: "surasak@kmitsurat.com",
    role: "service",
    team_id: "",
    active: true,
    position: "Senior Technician",
    department: "Service",
    phone: "088-901-2345",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=SS&backgroundColor=22c55e",
    bio: "ช่างเทคนิคอาวุโส เชี่ยวชาญติดตั้ง CCTV, Access Control และ Fire Alarm",
  },
  {
    tenant_id: "kmitsurat",
    name: "พิชัย วิทยากร",
    email: "pichai@kmitsurat.com",
    role: "service",
    team_id: "",
    active: true,
    position: "Field Engineer",
    department: "Service",
    phone: "089-012-3456",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=PC&backgroundColor=a855f7",
    bio: "วิศวกรภาคสนาม ดูแลงานติดตั้ง Network, WiFi และ PM ลูกค้าประจำ",
  },

  // === Admin ===
  {
    tenant_id: "kmitsurat",
    name: "ยิ่งยุทธ์ ผู้บริหาร",
    email: "yingyut@kmitsurat.com",
    role: "admin",
    team_id: "",
    active: true,
    position: "Managing Director",
    department: "Management",
    phone: "080-111-2222",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=YY&backgroundColor=0ea5e9",
    bio: "กรรมการผู้จัดการ KMITSURAT ดูแลภาพรวมธุรกิจและกลยุทธ์องค์กร",
  },

  // === Avenger Team ===
  {
    tenant_id: "kmitsurat",
    name: "ณัฐวุฒิ พลังสูง",
    email: "natthawut@kmitsurat.com",
    role: "avenger",
    team_id: "",
    active: true,
    position: "Avenger Lead",
    department: "Avenger",
    phone: "090-222-3333",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=NW&backgroundColor=f97316",
    bio: "หัวหน้าทีม Avenger สนับสนุนสาขาและช่วยปิดดีลขนาดใหญ่ ดูแล Revenue Growth",
  },
];

console.log("Creating sample users...\n");

for (const user of users) {
  try {
    const docRef = await addDoc(collection(db, "users"), {
      ...user,
      created_at: serverTimestamp(),
    });
    console.log(`  ✓ ${user.department.padEnd(10)} | ${user.position.padEnd(22)} | ${user.name} (${docRef.id})`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${user.name} - ${err.message}`);
  }
}

console.log(`\nDone! Created ${users.length} users.`);
process.exit(0);
