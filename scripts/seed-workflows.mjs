import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD7IISK5xcrMDd7P3SZTXeMuRm5VCP7_i8",
  authDomain: "kmitsurat-erp-web.firebaseapp.com",
  projectId: "kmitsurat-erp-web",
  storageBucket: "kmitsurat-erp-web.firebasestorage.app",
  messagingSenderId: "95953141878",
  appId: "1:95953141878:web:02b0a651d51b1b106c9f57",
});
const db = getFirestore(app);
const T = "kmitsurat";

const workflows = [
  // === ราคา / Solution → ผู้จัดการ + Presale + พี่กรด (admin) ===
  {
    tenant_id: T,
    name: "แจ้งเตือนใบเสนอราคาใหม่",
    module: "quotations",
    trigger: "quotation_created",
    condition: "",
    recipient_roles: ["admin", "presale"],
    recipient_users: ["พี่แนน (Sarocha Makjaroen)", "พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ma_sarocha@kmit-group.com", "ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "[KMITSURAT] ใบเสนอราคาใหม่: {quotation_number}",
    body_template: "สร้างใบเสนอราคาใหม่\n\nเลขที่: {quotation_number}\nลูกค้า: {customer_name}\nโปรเจค: {project_name}\nมูลค่า: {total_selling} THB\nGP: {gp_percent}%\n\nสร้างโดย: {created_by}",
    active: true,
  },
  {
    tenant_id: T,
    name: "แจ้งเตือน GP ต่ำกว่า 15%",
    module: "quotations",
    trigger: "quotation_gp_below",
    condition: "gp_percent < 15",
    recipient_roles: ["admin"],
    recipient_users: ["พี่แนน (Sarocha Makjaroen)", "พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ma_sarocha@kmit-group.com", "ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "⚠️ [KMITSURAT] GP ต่ำ: {quotation_number} ({gp_percent}%)",
    body_template: "ใบเสนอราคา {quotation_number} มี GP ต่ำกว่าเกณฑ์\n\nลูกค้า: {customer_name}\nมูลค่า: {total_selling} THB\nGP: {gp_percent}% (ต่ำกว่า 15%)\n\nกรุณาตรวจสอบและอนุมัติ",
    active: true,
  },
  {
    tenant_id: T,
    name: "แจ้งเตือนส่ง QT เพื่อตรวจสอบ",
    module: "quotations",
    trigger: "quotation_sent_review",
    condition: "",
    recipient_roles: ["admin", "presale"],
    recipient_users: ["พี่แนน (Sarocha Makjaroen)", "พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ma_sarocha@kmit-group.com", "ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "[KMITSURAT] QT รอตรวจสอบ: {quotation_number}",
    body_template: "ใบเสนอราคา {quotation_number} ถูกส่งเพื่อตรวจสอบ\n\nลูกค้า: {customer_name}\nมูลค่า: {total_selling} THB\nGP: {gp_percent}%\n\nกรุณาตรวจสอบและอนุมัติ",
    active: true,
  },
  {
    tenant_id: T,
    name: "แจ้งเตือน QT อนุมัติ/ปฏิเสธ",
    module: "quotations",
    trigger: "quotation_approved",
    condition: "",
    recipient_roles: ["sale", "presale"],
    recipient_users: ["พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "[KMITSURAT] QT {status}: {quotation_number}",
    body_template: "ใบเสนอราคา {quotation_number} ถูก{status}\n\nลูกค้า: {customer_name}\nมูลค่า: {total_selling} THB",
    active: true,
  },
  {
    tenant_id: T,
    name: "แจ้งเตือนเปิดโปรเจคใหม่",
    module: "projects",
    trigger: "project_opened",
    condition: "",
    recipient_roles: ["admin", "sale", "presale"],
    recipient_users: ["พี่แนน (Sarocha Makjaroen)", "พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ma_sarocha@kmit-group.com", "ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "[KMITSURAT] โปรเจคใหม่: {project_name}",
    body_template: "เปิดโปรเจคใหม่\n\nชื่อ: {project_name}\nลูกค้า: {customer_name}\nประเภท: {type}\nมูลค่า: {value} THB\nผู้รับผิดชอบ: {assigned_to}",
    active: true,
  },

  // === Service / ซ่อม → Service + Admin + พี่กรด ===
  {
    tenant_id: T,
    name: "แจ้งเตือนสร้าง Service Ticket ใหม่",
    module: "service",
    trigger: "service_ticket_created",
    condition: "",
    recipient_roles: ["service", "admin"],
    recipient_users: ["พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "[KMITSURAT] Service Ticket ใหม่: {customer_name}",
    body_template: "แจ้งซ่อม / งานบริการใหม่\n\nลูกค้า: {customer_name}\nประเภท: {type}\nปัญหา: {issue}\nช่าง: {technician}\nวันนัด: {service_date}\n\nกรุณารับงานและดำเนินการ",
    active: true,
  },
  {
    tenant_id: T,
    name: "แจ้งเตือนเปลี่ยนสถานะ Ticket",
    module: "service",
    trigger: "ticket_status_changed",
    condition: "",
    recipient_roles: ["service", "admin"],
    recipient_users: ["พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "[KMITSURAT] Ticket Update: {customer_name} → {status}",
    body_template: "อัปเดตสถานะ Service Ticket\n\nลูกค้า: {customer_name}\nปัญหา: {issue}\nสถานะใหม่: {status}\nช่าง: {technician}",
    active: true,
  },

  // === สัญญาหมดอายุ → Admin + พี่กรด ===
  {
    tenant_id: T,
    name: "แจ้งเตือนสัญญาใกล้หมดอายุ",
    module: "contracts",
    trigger: "contract_expiring",
    condition: "",
    recipient_roles: ["admin", "sale"],
    recipient_users: ["พี่แนน (Sarocha Makjaroen)", "พี่กรด (Yingyut Chokkanapitak)"],
    recipient_emails: ["ma_sarocha@kmit-group.com", "ch_yingyut@kmit-group.com"],
    recipient_line_group: "",
    channels: ["email", "system"],
    channel_ids: [],
    subject_template: "⚠️ [KMITSURAT] สัญญาใกล้หมดอายุ: {customer_name}",
    body_template: "สัญญา/รับประกันใกล้หมดอายุ\n\nลูกค้า: {customer_name}\nโปรเจค: {project_name}\nวันหมดอายุ: {due_date}\n\nกรุณาติดต่อลูกค้าเพื่อต่อสัญญา",
    active: true,
  },
];

console.log("Creating notification workflows...\n");

for (const wf of workflows) {
  const ref = await addDoc(collection(db, "notification_workflows"), { ...wf, created_at: serverTimestamp() });
  console.log(`  ✓ ${wf.name}`);
  console.log(`    Trigger: ${wf.trigger} | Channels: ${wf.channels.join(", ")}`);
  console.log(`    Roles: ${wf.recipient_roles.join(", ")} | Users: ${wf.recipient_users.join(", ")}`);
  console.log("");
}

console.log(`Done! Created ${workflows.length} workflows.`);
process.exit(0);
