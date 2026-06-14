"use client";
import { useState } from "react";
import { useCurrentUser } from "@/lib/UserContext";

type Section = { title: string; thai: string; content: string };

// ─── Shared sections ──────────────────────────────────────────────────────────

const S_LOGIN: Section = {
  title: "เริ่มต้นใช้งาน",
  thai: "Login & Navigation",
  content: `## เริ่มต้นใช้งาน KMITSURAT Work Portal

### เข้าสู่ระบบ
1. เปิดเบราว์เซอร์ไปที่ URL ของระบบ (เช่น http://172.16.1.60:3000)
2. กรอก **Email** และ **รหัสผ่าน** ที่ได้รับจาก Admin
3. ระบบจำ session ไว้ — ไม่ต้อง login ใหม่ทุกครั้ง

### การนำทาง
- ใช้ **Sidebar ด้านซ้าย** เปลี่ยนหน้า — เมนูที่ Active มี highlight สีน้ำเงิน
- เมนูแสดงเฉพาะที่ Role ของคุณมีสิทธิ์เข้าถึง
- ชี้เมาส์ที่เมนู → เห็นคำอธิบายภาษาไทย

### โปรไฟล์ผู้ใช้
- กดชื่อ / รูปที่ **ด้านล่าง Sidebar** → หน้า Profile
- แก้ไขชื่อ / ชื่อเล่น / เบอร์โทร / เปลี่ยนรหัสผ่าน
- เลือกธีมสีได้ที่หน้าโปรไฟล์ (Snow / Midnight / Obsidian / Cyberpunk)

### ออกจากระบบ
- กดปุ่ม **"Logout"** ที่ด้านล่าง Sidebar`,
};

const S_TIPS_GENERAL: Section = {
  title: "เคล็ดลับ",
  thai: "Tips & การแก้ปัญหา",
  content: `## เคล็ดลับการใช้งาน

### ฟอร์ม
- ช่องที่มี ***** คือบังคับกรอก
- ช่องค้นหาลูกค้า — พิมพ์บางส่วน (3 ตัวอักษรขึ้นไป) เพื่อกรอง
- กด **"บันทึก"** หลังแก้ไขทุกครั้ง ไม่มี auto-save

### การค้นหาและกรอง
- ทุกหน้ามีช่อง **🔍 ค้นหา** ด้านบน
- ใช้ **Dropdown filter** เพื่อกรองตามสถานะ / ประเภท / ผู้รับผิดชอบ
- กด **✕** เพื่อล้าง filter ที่เลือก

### มือถือ / Tablet
- กด **☰** มุมบนซ้ายเพื่อเปิด Sidebar
- ทุกหน้ารองรับหน้าจอขนาดเล็ก

### ถ้าหน้าเว็บค้าง
- กด **Refresh** (F5)
- ถ้ายังค้าง แจ้ง Admin ให้ restart server`,
};

// ─── Sales Executive ──────────────────────────────────────────────────────────

const SECTIONS_SALES_EXEC: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard",
    thai: "แดชบอร์ดส่วนตัว",
    content: `## Dashboard — ยอดขายของฉัน

### สิ่งที่เห็น
- **ยอดขายของฉัน** — ยอดรวม (THB) เทียบเป้าเดือนนี้
- **% Achievement** — ความคืบหน้าเทียบเป้า
- **GP รวม** — กำไรขั้นต้นจากใบเสนอราคาที่อนุมัติแล้ว
- **Follow-up ค้าง** — Activities ที่ Next Action เลยกำหนด

### Filter วันที่
กด **วันนี้ / 7 วัน / เดือนนี้ / ปีนี้ / Q1-Q4 / กำหนดเอง** เพื่อเปลี่ยนช่วงเวลา

> ยอดขายอัปเดต live เมื่อ QT ถูกอนุมัติ — ไม่ต้อง Refresh`,
  },
  {
    title: "Action Plan",
    thai: "แผนงานรายวัน",
    content: `## Action Plan — แผนงานรายวัน (📅)

### เข้าถึงได้จาก
Sales → Action Plan หรือ /sales?tab=workplan

### สร้างแผนงาน
1. กด **"+ วางแผน"** หรือคลิกที่วันในปฏิทิน
2. กรอก: ประเภทกิจกรรม / ลูกค้า / เป้าหมาย / เวลา
3. กด **"บันทึก"**

### ประเภทกิจกรรม
- นัดพบลูกค้า / โทรติดตาม / ส่งใบเสนอราคา / Demo / อื่นๆ

### อัปเดตสถานะ
- คลิกที่แผนที่มีอยู่ → แก้ไข / เปลี่ยนสถานะ (วางแผน → กำลังทำ → เสร็จ / เลื่อน)
- กด **"Update"** บนมือถือ

### ดู Overview
- ปฏิทินแสดงงานรายเดือน
- สีแตกต่างกันตามสถานะ: เทา=วางแผน / น้ำเงิน=กำลังทำ / เขียว=เสร็จ / แดง=เลื่อน`,
  },
  {
    title: "Activities",
    thai: "บันทึกกิจกรรมงานขาย",
    content: `## Activities — บันทึกกิจกรรม (📞)

### สร้าง Activity
1. กด **"+ บันทึกกิจกรรม"**
2. เลือก: ประเภท / ลูกค้า / โปรเจค / ผลลัพธ์ / Next Action + วันที่
3. กด **"บันทึก"**

### ประเภทกิจกรรม
- โทรศัพท์ / นัดพบ / ส่งใบเสนอราคา / ติดตาม / Demo / อีเมล

### ผลลัพธ์
สำเร็จ ✅ / ไม่รับสาย / สนใจ / ปฏิเสธ / รอผล / เลื่อน

### Filter
- ทั้งหมด / วันนี้ / สัปดาห์นี้ / **Overdue** (badge แดง = Next Action เลยกำหนด)

### Convert เป็น Pipeline
- กด **"→ ดีล"** ในแถว Activity → สร้าง Project ใน Pipeline อัตโนมัติ พร้อม link กลับ

### Export
- กดปุ่ม **⬇ Export CSV** ในแถว filter`,
  },
  {
    title: "Pipeline",
    thai: "โอกาสขาย / Projects",
    content: `## Pipeline — โอกาสขาย (🎯)

### Stage
Lead → Opportunity → Proposal → Negotiation → **Won** / **Lost**

### สร้างโปรเจคใหม่
1. กด **"+ เพิ่มโปรเจค"**
2. ชื่อโปรเจค + ค้นหาลูกค้า (หรือสร้างลูกค้าใหม่ inline)
3. เลือกประเภทงาน (เลือกได้หลายอย่าง เช่น WiFi + CCTV)
4. ใส่มูลค่า + Stage ปัจจุบัน + % โอกาสปิด
5. กด **"บันทึก"**

### อัปเดต Stage
- เปลี่ยน Stage จาก dropdown ในแถวโปรเจค
- กด **"Won"** → กรอกเหตุผลชนะ
- กด **"Lost"** → กรอกเหตุผลแพ้ + คู่แข่ง + แผน Re-engage

### Quick Actions (กดที่โปรเจค)
- **QT** → สร้าง Quotation ที่ผูกกับโปรเจคนี้
- **PS** → ส่ง Job Request ไป Presale
- **SV** → ส่ง Job Request ไป Service

### Re-engage (Lost)
- ตั้ง **วันที่จะเสนอใหม่** + โน้ต
- ระบบแจ้งเตือนเมื่อถึงวัน

### Export
- กดปุ่ม **⬇ Export CSV**`,
  },
  {
    title: "Quotations",
    thai: "ใบเสนอราคา",
    content: `## Quotations — ใบเสนอราคา (💰)

### สร้าง QT ใหม่
1. กด **"+ สร้างใบเสนอราคา"**
2. ค้นหาลูกค้า → เลือกโปรเจค (หรือพิมพ์ชื่อเอง)
3. เพิ่ม Line Items:
   - เลือกสินค้าจาก dropdown → ราคา auto-fill
   - แก้ไข จำนวน / ราคา / ส่วนลด
4. ตั้งค่า **VAT**: ไม่มี / บวก VAT 7% / รวม VAT แล้ว
5. ระบุ **ผู้รับผิดชอบยอดขาย** (คนที่ได้ credit)
6. กด **"บันทึก"**

### Workflow สถานะ
**Draft** → **ส่งแล้ว** → **อนุมัติ** / **ปฏิเสธ**
- คลิกที่ QT → เปลี่ยนสถานะในปุ่มด้านบน Detail Panel
- เมื่อ "อนุมัติ" → ยอดขายใน Dashboard อัปเดตทันที

### Revision
- กด **"Revise"** → เก็บเวอร์ชันเดิม + สร้างใหม่
- กด **"📋 History"** → ดูทุก revision + เหตุผลที่แก้

### Level ราคา
ทั่วไป / สมาชิก / พิเศษ — เลือกได้ต่อใบ

### Convert BOQ → QT
- จากหน้า Presale Tasks → Detail Panel → Tab BOQ → กด "แปลงเป็น QT"`,
  },
  {
    title: "Requests",
    thai: "ส่งงานไป Presale / Service",
    content: `## Job Requests — ส่งงานต่อทีม (🙋)

### เข้าถึงได้จาก
Sales → Requests (ขวาสุด) หรือ /sales?tab=requests

### สร้าง Job Request
1. กด **"+ สร้าง Request"**
2. เลือก **ทีมปลายทาง**: Presale หรือ Service
3. กรอก: ลูกค้า / วันที่ต้องการ / ความเร่งด่วน / รายละเอียดงาน
4. กด **"ส่ง"**

### ติดตามสถานะ
- **รอดำเนินการ** — ทีมยังไม่รับงาน
- **รับแล้ว** — ทีมรับและกำลังดำเนินการ
- **ปฏิเสธ** — ทีมปฏิเสธ (มีเหตุผล)

> Badge แดงที่เมนู Requests = จำนวน Request ที่รอการตอบกลับ`,
  },
  {
    title: "Customers",
    thai: "ฐานข้อมูลลูกค้า",
    content: `## Customers — ลูกค้าของฉัน (🏢)

### สิ่งที่เห็น
- ลูกค้าที่คุณเป็นเจ้าของ (assigned_to) และ co-owner

### สร้างลูกค้าใหม่
1. กด **"+ เพิ่มลูกค้า"**
2. กรอก: ชื่อบริษัท / ผู้ติดต่อ / เบอร์ / อีเมล / จังหวัด / ประเภทหน่วยงาน
3. กด **"บันทึก"**

### ค้นหาและกรอง
- ช่อง **🔍** ค้นหาชื่อ / ผู้ติดต่อ
- กรองตาม: จังหวัด / ประเภทหน่วยงาน
- Tab: **ของฉัน** / **ทีม** / **ทั้งหมด** (ตามสิทธิ์)

### Hover Popup
- ชี้เมาส์ที่ชื่อลูกค้า → popup แสดง: โปรเจค / ใบเสนอราคา / งานบริการ`,
  },
  S_TIPS_GENERAL,
];

// ─── Sales Manager ────────────────────────────────────────────────────────────

const SECTIONS_SALES_MGR: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard",
    thai: "แดชบอร์ดผู้จัดการฝ่ายขาย",
    content: `## Dashboard — Sales Manager

### ภาพรวมทีม
- **4 KPI บนสุด**: ยอดขายรวม / Achievement % / GP รวม / Follow-up ค้าง
- **ยอดขายรายบุคคล** — ตารางแสดงแต่ละคน: ชื่อ + progress bar + % + ยอดจริง/เป้า

### TeamScopeBar (แถบเลือกทีม)
- อยู่ด้านบน Dashboard ใต้ filter
- กดชื่อทีม **Sales** → ดูภาพรวมทีมขาย
- กด dropdown ▼ → เลือกดูข้อมูลรายบุคคล
- กด **"← ภาพรวมทีม"** → กลับมาดูทั้งทีม

### Executive View
- กด **"Executive"** → เห็นภาพรวมทุกแผนก (Sales + Service + Presale)
- เปรียบเทียบ performance ข้ามแผนก

### Filter วันที่
วันนี้ / 7 วัน / เดือนนี้ / ปีนี้ / Q1-Q4 / กำหนดเอง

### Quarterly Chart
- 4 การ์ด Q1-Q4: ยอดจริง / เป้า / %
- Bar chart: เป้าหมาย / ยอดจริง / GP`,
  },
  {
    title: "Sales Plan (Quota)",
    thai: "ตั้งเป้ายอดขายรายคน",
    content: `## Sales Plan — ตั้งเป้ายอดขาย (📈)

### เข้าถึงได้จาก
Sales → Sales Plan หรือ /sales-plan

### ตั้งเป้าหมาย
1. เลือก **ปีงบประมาณ**
2. เลือก **พนักงาน** (Sales Executive แต่ละคน)
3. กรอก **เป้าหมายรายเดือน** (THB) 12 ช่อง
4. กด **"บันทึก"**

### KPI Summary
- เป้า / ยอดจริง / เหลือ / %
- 🏆 **Top Performer** — คนที่ทำได้มากที่สุด
- Progress bar รายคน

### เปรียบเทียบ
- ดูยอด Q1-Q4 เทียบเป้ารายไตรมาส`,
  },
  {
    title: "Pipeline & Approve QT",
    thai: "อนุมัติใบเสนอราคา",
    content: `## Pipeline & Quotations — อนุมัติ QT

### ดู Pipeline ทั้งทีม
- /projects หรือ Sales → Pipeline
- เห็นโปรเจคของทุกคนในทีม
- กรองตาม **Stage** / **ผู้รับผิดชอบ**

### อนุมัติใบเสนอราคา
1. ไปที่ **/quotations**
2. กรอง Status = **"รอตรวจสอบ"**
3. คลิก QT → กด **"อนุมัติ"** หรือ **"ปฏิเสธ"**
4. เมื่ออนุมัติ → ยอดขายของ Sales Executive อัปเดตทันที

### Override ราคา / Margin
- เมื่อ GP ต่ำกว่า threshold → แจ้งเตือนสีแดง
- Manager สามารถ approve ต่อได้โดยระบุเหตุผล`,
  },
  {
    title: "Activities & Team",
    thai: "ติดตามกิจกรรมทีม",
    content: `## Activities — ติดตามทีมขาย

### ดู Activities ทั้งทีม
- Sales → Activities → กรองตาม **ผู้ทำ**
- เห็น Next Action ที่ค้าง (Overdue badge แดง)

### Filter
- ทั้งหมด / วันนี้ / สัปดาห์นี้ / Overdue
- กรองตามผู้รับผิดชอบ (dropdown)

### Export รายงาน
- กดปุ่ม **⬇ Export CSV** → รายงาน Activities ทั้งทีม

### Customers
- /customers → กรอง Tab **"ทีม"** หรือ **"ทั้งหมด"**
- เห็น overlap (ลูกค้าที่เซลล์หลายคนดูแล)`,
  },
  {
    title: "Reports",
    thai: "รายงาน",
    content: `## Reports — รายงานฝ่ายขาย (📊)

### เข้าถึงได้จาก
/reports หรือ Admin → Reports

### รายงานที่ใช้ได้
- **ยอดขายรายเดือน** — ตารางรายคน + รวม
- **Pipeline by Stage** — จำนวน/มูลค่าตาม Stage
- **Win/Loss Analysis** — อัตราชนะ + คู่แข่ง
- **Activities Summary** — กิจกรรมรายคน

### Export
- ทุกรายงาน Export เป็น **CSV** / **Excel** / **PDF** ได้`,
  },
  S_TIPS_GENERAL,
];

// ─── Presales Engineer ────────────────────────────────────────────────────────

const SECTIONS_PRESALE_ENG: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard",
    thai: "แดชบอร์ดพรีเซลล์",
    content: `## Dashboard — Presale Engineer

### สิ่งที่เห็น
- **Presale Workload** — งานของฉัน: 🟡 รอ / 🔵 กำลังทำ / 🟢 เสร็จ
- **งาน Due วันนี้** — งานที่ถึงกำหนดวันนี้
- **งาน Overdue** — งานที่เกินกำหนด

### Quick Access
- กด badge จำนวนงานใด → ไปหน้า Presale กรองอัตโนมัติ`,
  },
  {
    title: "Presale Tasks",
    thai: "งานพรีเซลล์",
    content: `## Presale Tasks — งานพรีเซลล์ (📋)

### รับงานจาก Sales (Job Request)
- กล่อง **สีม่วง** ด้านบนสุด = Job Requests ที่รอรับ
- กด **"รับงาน"** → งานถูกสร้างใน Presale Tasks อัตโนมัติ
- กด **"ปฏิเสธ"** → ระบุเหตุผล

### สร้างงานเอง
1. กด **"+ New Task"**
2. เลือกประเภท: Solution Design / BOQ / Technical Proposal / Site Survey / Project Planning
3. เลือก ลูกค้า + โปรเจค + ผู้รับผิดชอบ + Due Date
4. กด **"บันทึก"**

### View
- **List** 📋 — รายการงาน + filter
- **แผนงาน** 📅 — Kanban board ตามสถานะ
- **รายงาน** 📊 — สถิติงาน

### Filter
- ทั้งหมด / ของฉัน / Overdue / วันนี้ / กำลังทำ / รอข้อมูล / เสร็จแล้ว

### ปฏิทิน
- กดปุ่ม **"📅 ปฏิทิน"** → /presale/calendar
- เห็นตารางงานรายเดือน แยกสีตามคน`,
  },
  {
    title: "Detail Panel",
    thai: "รายละเอียดงาน + BOQ",
    content: `## Presale Detail Panel — ทำงานใน Task

### เปิด Detail
คลิกที่งาน → Detail Panel เปิดด้านขวา (หรือด้านล่างบนมือถือ)

### Tab: Summary
- **Solution Summary** — พิมพ์ markdown ได้ เช่น ออกแบบระบบ, spec, diagram
- อัปเดตสถานะ + เหตุผล

### Tab: BOM (Bill of Materials)
- เพิ่มรายการอุปกรณ์: รหัสสินค้า / ชื่อ / ยี่ห้อ / จำนวน / หน่วย
- เพิ่ม Link ไฟล์ BOM (SharePoint / Drive)

### Tab: BOQ (ใบคำนวณราคา)
- เพิ่มรายการ: สินค้า / ต้นทุน / ราคาขาย / ส่วนลด / Margin
- คำนวณ GP อัตโนมัติ
- กด **"แปลงเป็น QT"** → ส่งไปสร้าง Quotation ได้เลย

### Tab: Files
- แนบลิงก์ไฟล์: Drawing / Spec / Proposal
- เชื่อม SharePoint / OneDrive / Google Drive อัตโนมัติ (ตั้งค่าใน Settings)

### Tab: Work Steps
- สร้าง Work Plan: Task ย่อย + ผู้รับผิดชอบ + วันเริ่ม/สิ้นสุด
- อัปเดตความคืบหน้า %`,
  },
  {
    title: "Presale Projects",
    thai: "โปรเจกต์ Multi-Tool BOQ",
    content: `## Presale Projects — Multi-Tool BOQ (📁)

### เข้าถึงได้จาก
Presale → Presale Projects หรือ /presale/projects

### ใช้สำหรับ
งานออกแบบขนาดใหญ่ที่ต้องใช้หลาย Tool (Network + CCTV + Solar + ไฟฟ้า)

### สร้าง Presale Project
1. กด **"+ สร้างโปรเจกต์"**
2. ใส่ชื่อโปรเจกต์ + ลูกค้า + วันกำหนด
3. กด **"บันทึก"**

### เพิ่ม Tool ใน Project
- คลิกโปรเจกต์ → กด **"+ เพิ่ม Tool"**
- เลือก Tool Type: Network / CCTV / Solar / ไฟฟ้า / Custom BOQ
- แต่ละ Tool มี BOQ ของตัวเอง

### Tool Launcher
- /presale/tools → เปิดเครื่องมือออกแบบ BOQ แต่ละประเภท
- ผลลัพธ์บันทึกกลับไปใน Project อัตโนมัติ`,
  },
  {
    title: "Project Execution",
    thai: "ดำเนินโปรเจค",
    content: `## Project Execution — ดำเนินโปรเจค (🗂️)

### เข้าถึงได้จาก
Presale → Project Execution หรือ /project-management

### ใช้สำหรับ
ติดตาม Task ย่อยของโปรเจคที่ชนะแล้ว (Won) ตั้งแต่เตรียมงาน → ติดตั้ง → ส่งมอบ

### สร้างจาก Template
1. เลือกโปรเจค
2. กด **"ใช้ Template"** → เลือก: Server Room / WiFi / CCTV / Solar / ไฟฟ้า
3. Task ทั้งหมดถูกสร้างพร้อม Phase + รายละเอียดอัตโนมัติ

### Phase งาน
เสนอขาย → เซ็นสัญญา → เตรียมงาน → ติดตั้ง → ส่งมอบ → หลังการขาย

### อัปเดต Task
- คลิก Task → แก้ไขสถานะ / % ความคืบหน้า / ผู้รับผิดชอบ / หมายเหตุ`,
  },
  S_TIPS_GENERAL,
];

// ─── Presales Manager ─────────────────────────────────────────────────────────

const SECTIONS_PRESALE_MGR: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard",
    thai: "แดชบอร์ด Presale Manager",
    content: `## Dashboard — Presale Manager

### TeamScopeBar (แถบเลือกทีม)
- กด **"Presales"** → ภาพรวม workload ทีม Presale
- กด **"Projects"** → ภาพรวมงาน Project Execution
- กด dropdown ▼ → เลือกดูข้อมูลรายบุคคล

### สิ่งที่เห็น
- Presale Workload รายคน: 🟡 รอ / 🔵 กำลังทำ / 🟢 เสร็จ
- งาน Overdue ทั้งทีม
- Job Requests รอรับจาก Sales

### Executive View
- กด **"Executive"** → ภาพรวม KPI ทั้งบริษัท`,
  },
  {
    title: "จัดการ Job Requests",
    thai: "รับงานจาก Sales",
    content: `## Job Requests — รับ/มอบหมายงาน

### กล่องสีม่วง (ด้านบนหน้า Presale)
- แสดง Job Requests จาก Sales ที่รอดำเนินการ
- badge 🔴 ที่เมนู = จำนวน Request ที่รอ

### รับงาน
1. คลิก Request ที่ต้องการ
2. เลือก **ผู้รับผิดชอบ** จากทีม (Presale Engineer)
3. กด **"รับงาน"** + ระบุ Due Date
4. งานถูกสร้างใน Presale Tasks พร้อม assign อัตโนมัติ

### ปฏิเสธงาน
- กด **"ปฏิเสธ"** + ระบุเหตุผล (Sales จะได้รับแจ้งเตือน)`,
  },
  {
    title: "Presale Tasks — จัดการทีม",
    thai: "บริหารงาน Presale ทั้งทีม",
    content: `## Presale Tasks — จัดการทีม

### ดูงานทั้งทีม
- Filter **"ทั้งหมด"** → เห็นงานของทุกคน
- กรองตาม **ผู้รับผิดชอบ** จาก dropdown

### TeamScopeBar (บนหน้า Presale)
- เลือกรายชื่อ Presale Engineer → กรองงานของคนนั้น
- กด **"← ภาพรวมทีม"** → กลับมาดูทั้งทีม

### อนุมัติงาน
- งานที่สถานะ **"รออนุมัติ"** → คลิก → กด **"อนุมัติ"** หรือ **"ส่งกลับแก้ไข"**
- ตั้งค่า Approval Workflow ได้ที่ปุ่ม **"⚙ Approval"** บนหน้า Presale

### Approval Settings
- กด **"⚙ Approval"** → ตั้งค่า:
  - ประเภทงานที่ต้องขออนุมัติ
  - มูลค่าขั้นต่ำที่ต้องอนุมัติ
  - ผู้อนุมัติหลัก + สำรอง`,
  },
  {
    title: "Reports",
    thai: "รายงาน Presale",
    content: `## Reports — Presale

### ภายในหน้า Presale Tasks
- Tab **"📊 รายงาน"** → สถิติงาน: จำนวน / สถานะ / รายคน / รายเดือน

### /reports
- รายงาน Presale Workload
- Export CSV / Excel / PDF`,
  },
  S_TIPS_GENERAL,
];

// ─── Service Technician ───────────────────────────────────────────────────────

const SECTIONS_SVC_TECH: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard",
    thai: "แดชบอร์ดช่าง",
    content: `## Dashboard — งานของฉัน

### สิ่งที่เห็น
- **งานเปิดของฉัน** — Ticket ที่ assigned ให้ฉัน
- **งานวันนี้** — Ticket ที่ service_date = วันนี้
- **งาน Overdue** — เลยกำหนด
- **รออะไหล่** — Ticket ที่สถานะ waiting_parts

### Quick Links
- กดการ์ดใด → ไปหน้า Service กรองอัตโนมัติ`,
  },
  {
    title: "My Tickets",
    thai: "งาน Service ของฉัน",
    content: `## Service Tickets — งานของฉัน (🔧)

### View บน Tabs
- **ทั้งหมด** — งาน active ทั้งหมดของฉัน
- **ใหม่** — เปิดใหม่ / รับทราบแล้ว
- **กำลังทำ** — traveling / on_site / repair_start / in_progress
- **รออะไหล่** — waiting_parts
- **รอดำเนินการ** — วันในอนาคต
- **ประวัติ** — resolved / closed

### เปลี่ยนสถานะงาน
1. คลิก Ticket ในรายการ
2. กด dropdown **"เปลี่ยนสถานะ"**
3. เลือก: เดินทาง → ถึงสถานที่ → เริ่มซ่อม → กำลังทำ → แก้ไขแล้ว
4. ระบบบันทึกเวลาอัตโนมัติ

### บันทึก Memo + ภาพ
- คลิก Ticket → กด **"📝 บันทึก"**
- พิมพ์หมายเหตุ / ผลการตรวจ / วิธีแก้
- แนบภาพถ่ายหน้างาน

### รออะไหล่
- เปลี่ยนสถานะเป็น **"รออะไหล่"** → ระบุรายการที่ต้องการ
- ธุรการ / Manager จะเห็นรายการนี้

### แจ้งเตือน (🔔)
- กระดิ่งมุมขวาบน = มีงานใหม่ / อัปเดต
- เปิด/ปิดเสียง 🔊/🔇 ได้`,
  },
  {
    title: "Today Jobs",
    thai: "งานวันนี้",
    content: `## Today Jobs — งานวันนี้ (📅)

### เข้าถึงได้จาก
- Sidebar → Today Jobs หรือ /service?tab=today

### สิ่งที่เห็น
- Ticket ทั้งหมดที่ service_date = วันนี้ และสถานะ active
- เรียงตามเวลานัด

### เตรียมก่อนออกงาน
- ตรวจ Ticket ที่จะทำวันนี้
- ดูที่อยู่ลูกค้า / เบอร์ติดต่อ / รายละเอียดปัญหา
- ดาวน์โหลด Checklist ถ้ามี`,
  },
  {
    title: "PM Schedule",
    thai: "ตารางงาน PM",
    content: `## PM Schedule — งานบำรุงรักษา (🔩)

### เข้าถึงได้จาก
- Sidebar → PM Schedule หรือ /assets/pm-schedule

### สิ่งที่เห็น
- ตารางงาน PM ที่ assigned ให้ฉัน
- Due date + อุปกรณ์ที่ต้อง PM

### เมื่อทำ PM เสร็จ
- คลิก Asset → กด **"PM เสร็จแล้ว"**
- บันทึกผล / แนบภาพ
- ระบบอัปเดต Last PM date อัตโนมัติ`,
  },
  {
    title: "Manuals",
    thai: "คู่มือช่างเทคนิค",
    content: `## Manuals — คู่มือช่างเทคนิค (📖)

### เข้าถึงได้จาก
Sidebar → Manuals หรือ /service/manuals

### หมวดหมู่
- **CCTV** — ติดตั้ง IP Camera, DVR/NVR, troubleshoot
- **Network** — Switching, Routing, WiFi AP, Fiber Optic
- **Solar** — ติดตั้งโซลาร์, Inverter config, troubleshoot
- **ไฟฟ้า** — ความปลอดภัย, ตู้ DB, Load calculation
- **MA** — PM Checklist ประจำปี
- **Report** — Template รายงานงานช่าง

### ค้นหา
- พิมพ์ชื่อ / คำสำคัญ ใน search box
- กด Category button เพื่อกรองหมวดหมู่`,
  },
  {
    title: "Checklist",
    thai: "Service Checklist",
    content: `## Checklist — รายการตรวจงาน (✅)

### เข้าถึงได้จาก
Sidebar → Checklist หรือ /service/checklist

### การใช้งาน
- เลือก Checklist ตามประเภทงาน (Installation / PM / Survey)
- กาช่อง ✅ ทีละรายการ
- บันทึกหมายเหตุได้แต่ละข้อ
- Print หรือ Export PDF เป็นเอกสารส่งลูกค้า`,
  },
  {
    title: "Remote Support",
    thai: "Remote Access",
    content: `## Remote Support — เข้าถึงระยะไกล (🖥️)

### เข้าถึงได้จาก
Sidebar → Remote Support หรือ /service/remote

### เครื่องมือที่รองรับ
- AnyDesk / TeamViewer / RustDesk / WinBox / SSH / Telnet
- กดปุ่มเพื่อเปิดโปรแกรมที่ติดตั้งในเครื่อง

### บันทึก Session
- ใส่ IP / Device name / หมายเหตุ
- ประวัติ Remote session บันทึกอัตโนมัติ`,
  },
  {
    title: "Config Backup",
    thai: "บันทึก Config อุปกรณ์",
    content: `## Config Backup — บันทึก Configuration (💾)

### เข้าถึงได้จาก
Sidebar → Config Backup หรือ /service/backup

### การใช้งาน
- เลือกลูกค้า / อุปกรณ์
- วาง Config text (จาก copy-paste ใน Terminal)
- กด **"บันทึก"**

### ดู Config เก่า
- เลือกอุปกรณ์ → เห็น Config history ทุก version
- เปรียบเทียบ diff ระหว่าง version`,
  },
  {
    title: "Service History",
    thai: "ประวัติงาน",
    content: `## Service History — ประวัติงาน (📁)

### เข้าถึงได้จาก
Sidebar → Service History หรือ /service?tab=history

### สิ่งที่เห็น
- Ticket ที่ resolved / closed ของฉัน
- ค้นหา / กรองตาม: ลูกค้า / ประเภท / วันที่

### Warranty Check
- /contracts → ตรวจสถานะรับประกัน / สัญญา MA ของลูกค้า
- ดู วันหมดอายุ + Service Level

### Search SN
- /assets → ค้นหาอุปกรณ์ตาม Serial Number
- เห็นประวัติการติดตั้ง / ซ่อม`,
  },
  S_TIPS_GENERAL,
];

// ─── Service Manager ──────────────────────────────────────────────────────────

const SECTIONS_SVC_MGR: Section[] = [
  S_LOGIN,
  {
    title: "Service Command Center",
    thai: "แดชบอร์ด Service Manager",
    content: `## Service Command Center — ภาพรวม Service (🎛️)

### 8 การ์ด Overview (บนสุด)
- **งานเปิด** — Ticket active ทั้งหมด
- **เกิน SLA** — 🚨 เกินเวลา Response/Resolution
- **ไม่มีคนรับ** — ยังไม่ assign ช่าง
- **ไม่มี Update** — งานที่ไม่ได้อัปเดตนาน
- **รออะไหล่** — waiting_parts
- **รอลูกค้า** — waiting_approval
- **PM/MA** — งาน PM วันนี้
- **งานย้อนซ่อม** — repair ที่เคยซ่อมแล้วต้องซ่อมซ้ำ

### TeamScopeBar
- อยู่ใต้ header ของ Command Center
- กด dropdown ▼ → เลือกดู Ticket ของช่างคนนั้น
- กด **"← ภาพรวมทีม"** → กลับดูทั้งทีม

### แจ้งเตือน Alert Strip
- แถบแดงด้านบน = งานด่วน / เกิน SLA / เลยกำหนด`,
  },
  {
    title: "Service Tickets",
    thai: "จัดการ Ticket ทั้งทีม",
    content: `## Service Tickets — จัดการทั้งทีม

### Tab Manager Section
- **Tickets** 🎫 — รายการ Ticket ทั้งหมด + filter
- **Team** 👥 — ภาพรวมทีมช่าง รายคน
- **Assets** 📦 — จัดการอุปกรณ์
- **Docs** 📁 — เอกสาร / Link
- **Analytics** 📊 — สถิติ + กราฟ

### Assign ช่าง
1. คลิก Ticket ที่ยังไม่มีช่าง
2. เลือก **"ช่าง"** จาก dropdown
3. หรือเลือกโหมด: ทุกคน / ตามความถนัด / ตามพื้นที่
4. กด **"บันทึก"**

### ปิดงานสมบูรณ์ (Admin Close)
- เมื่อช่างเปลี่ยนสถานะเป็น **"closed"**
- Manager/ธุรการ ต้อง Stamp ปิดสมบูรณ์
- กด **"✅ ปิดงาน"** → กรอกค่าใช้จ่าย / บันทึก

### Job Requests จาก Sales
- กล่องสีชมพูด้านบน = Request ที่รอรับ
- รับงาน → สร้าง Ticket พร้อม assign ช่าง
- ปฏิเสธ → ระบุเหตุผล`,
  },
  {
    title: "Team View",
    thai: "ภาพรวมทีมช่าง",
    content: `## Team View — ดูทีมช่าง

### เข้าถึงได้จาก
Service Command Center → Tab "Team" 👥

### สิ่งที่เห็น
- ช่างแต่ละคน: รูป / ชื่อ / จำนวนงาน / งาน Overdue
- Bar chart งานแยกสถานะ
- Ticket ปัจจุบันที่ช่างแต่ละคนกำลังทำ

### Workload Balance
- ดูว่าช่างคนไหน **overload** vs คนไหน **ว่าง**
- ย้าย Ticket ระหว่างช่างได้จาก Ticket detail`,
  },
  {
    title: "Assets & Contracts",
    thai: "อุปกรณ์ / สัญญา MA",
    content: `## Assets — จัดการอุปกรณ์ (📦)

### เข้าถึงได้จาก
/assets หรือ Service → Search SN

### CRUD อุปกรณ์
- เพิ่ม / แก้ไข / ลบ Asset
- ข้อมูล: Serial Number / Model / Brand / วันติดตั้ง / ลูกค้า
- บันทึกประวัติ Service ต่อชิ้น

### PM Schedule
- /assets/pm-schedule → ตารางงาน PM ทุกอุปกรณ์
- กำหนดรอบ PM: รายเดือน / 6 เดือน / รายปี
- มอบหมายช่างที่รับผิดชอบ

---

## Contracts — สัญญา / รับประกัน (🛡️)

### เข้าถึงได้จาก
/contracts

### ประเภท
- 🛡️ รับประกันสินค้า
- 🔧 รับประกันงานติดตั้ง
- 📋 สัญญา MA (บำรุงรักษา)

### แจ้งเตือนหมดอายุ
- Dashboard แสดง Expiry Buckets: ≤30d / 31-60d / 61-90d / >90d
- Alert เมื่อ ≤30 วัน`,
  },
  {
    title: "Reports",
    thai: "รายงาน Service",
    content: `## Reports — Service (📊)

### ใน Command Center
- Tab **"Analytics"** → กราฟ: งานตามประเภท / ตามสถานะ / ตามช่าง
- Tab **"Report"** → สรุปงานรายเดือน + Export

### /reports
- รายงาน Service: มูลค่างาน / GP ต่อช่าง / SLA Performance
- Export CSV / Excel / PDF`,
  },
  S_TIPS_GENERAL,
];

// ─── Coordinator / Operations Coordinator ────────────────────────────────────

const SECTIONS_COORDINATOR: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard",
    thai: "แดชบอร์ดธุรการ",
    content: `## Dashboard — ธุรการ / ผู้ประสานงาน

### สิ่งที่เห็น (Coordinator view)
- **งาน Service ทั้งหมด** — ภาพรวมทุก Ticket
- **งานรอปิดสมบูรณ์** — ช่างปิดแล้ว รอ Admin stamp
- **PM ที่ต้อง Follow** — งานบำรุงรักษาใกล้ถึงกำหนด
- **สัญญาใกล้หมด** — MA / รับประกันที่ใกล้ expire

### Alerts
- แถบแดง = งานด่วนที่ต้องดำเนินการวันนี้`,
  },
  {
    title: "ปิดงาน Service",
    thai: "Admin Close Ticket",
    content: `## ปิดงาน Service — Admin Close (✅)

### หน้าที่หลัก
ช่างเปลี่ยนสถานะเป็น **"closed"** → ธุรการต้อง stamp ปิดสมบูรณ์

### ขั้นตอน
1. ไปที่ **/service**
2. ดู **8 การ์ด overview** — คลิก "งานเปิด" หรือค้นหา Ticket
3. กรอง: status = **closed** → เห็นงานรอปิดสมบูรณ์
4. คลิก Ticket → กด **"✅ ปิดงาน"**
5. กรอก: มูลค่างาน / ค่าใช้จ่าย / หมายเหตุ
6. กด **"ยืนยัน"**

### สิ่งที่ต้องตรวจก่อนปิด
- ช่างบันทึก Memo / ภาพ ครบถ้วนหรือยัง
- ลูกค้ายืนยันรับงานหรือยัง
- ค่าใช้จ่ายตรงกับ QT หรือไม่`,
  },
  {
    title: "Service Tickets",
    thai: "ดู/สร้าง Service Ticket",
    content: `## Service Tickets — ธุรการ

### ดู Ticket ทั้งหมด
- /service → เห็นทุก Ticket (ไม่จำกัดแค่ของตัวเอง)
- ค้นหา / กรองตามสถานะ / ลูกค้า / ช่าง / วันที่

### สร้าง Ticket ใหม่
1. กด **"+ New Ticket"**
2. กรอก: ลูกค้า / โปรเจค / ประเภทงาน / ปัญหา
3. เลือกช่าง / โหมด assign
4. ตั้ง SLA + วันนัด
5. กด **"บันทึก"**

### Assign ช่าง
- คลิก Ticket → เลือก Technician จาก dropdown
- หรือ assign จาก Team View`,
  },
  {
    title: "Contracts",
    thai: "สัญญา / MA",
    content: `## Contracts — สัญญา/รับประกัน/MA (🛡️)

### เข้าถึงได้จาก
/contracts

### สร้างสัญญา
1. กด **"+ สร้างสัญญา"**
2. เลือกประเภท: รับประกันสินค้า / รับประกันงาน / MA
3. ลิงก์กับ: ลูกค้า + โปรเจค
4. กรอก: วันเริ่ม / วันสิ้นสุด / มูลค่า / Service Level
5. กด **"บันทึก"**

### ติดตามหมดอายุ
- Dashboard แสดง Expiry Buckets
- Alert เมื่อ ≤30 วัน

### ดูสัญญาต่อโปรเจค
- ไปที่ /projects → คลิกโปรเจค → เห็น badge 🛡️ สัญญา`,
  },
  {
    title: "Assets",
    thai: "จัดการอุปกรณ์",
    content: `## Assets — อุปกรณ์ / Serial (📦)

### เข้าถึงได้จาก
/assets หรือ Sidebar → Search SN

### เพิ่มอุปกรณ์
1. กด **"+ เพิ่ม Asset"**
2. กรอก: Serial Number / Model / Brand / วันติดตั้ง / ลูกค้า
3. กด **"บันทึก"**

### ค้นหา SN
- พิมพ์ Serial Number ในช่องค้นหา
- เห็นประวัติ: ติดตั้งที่ไหน / วันไหน / ซ่อมครั้งล่าสุด

### PM Schedule
- /assets/pm-schedule → กำหนดรอบและมอบหมายช่าง`,
  },
  {
    title: "Customers & Data",
    thai: "ฐานข้อมูลลูกค้า",
    content: `## ข้อมูลกลาง — ลูกค้า / สินค้า

### Customers
- /customers → ดูและสร้างลูกค้า
- ดู tab: ทั้งหมด → เห็นลูกค้าทุกราย

### Products & Vendors
- /products → ดูรายการสินค้า ราคา
- /vendors → ดูข้อมูล Supplier

### Quotations
- /quotations → ดู QT ทั้งหมด (อ่านอย่างเดียว)`,
  },
  S_TIPS_GENERAL,
];

// ─── Branch Manager ───────────────────────────────────────────────────────────

const SECTIONS_BRANCH_MGR: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard Overview",
    thai: "ภาพรวมสาขา",
    content: `## Dashboard — Branch Manager

### ภาพรวมทั้งบริษัท
- **ยอดขายรวม** + เทียบเป้า + GP %
- **Pipeline Summary** — ทุก Stage: Lead → Won
- **Service Status** — เปิด / เกินกำหนด / กำลังทำ
- **Presale Workload** — งานออกแบบรายคน

### สิทธิ์การเข้าถึง
- ดูข้อมูลได้ทุก Module (Sales / Presale / Service)
- อนุมัติ Quotation ได้
- ไม่สามารถแก้ไข Settings ระบบได้

### Filter วันที่
วันนี้ / เดือนนี้ / ไตรมาส / ปี`,
  },
  {
    title: "อนุมัติ Quotation",
    thai: "Approve QT",
    content: `## Approve Quotation — อนุมัติใบเสนอราคา

### ขั้นตอน
1. ไปที่ **/quotations**
2. กรอง Status = **"รอตรวจสอบ"** (submitted)
3. คลิก QT → ตรวจรายการ / ราคา / GP
4. กด **"อนุมัติ"** → ยอดขายอัปเดตทันที
5. หรือ **"ปฏิเสธ"** + ระบุเหตุผล`,
  },
  {
    title: "ดูข้อมูลทุก Module",
    thai: "Read-access ทั้งระบบ",
    content: `## ดูข้อมูลทุก Module

### Sales
- /projects → Pipeline ทั้งบริษัท
- /quotations → QT ทุกใบ
- /sales-plan → เป้ายอดขายรายคน

### Presale
- /presale → งาน BOQ/Solution ทั้งทีม
- /presale/projects → Presale Projects

### Service
- /service → Ticket ทั้งหมด + สถิติ
- /contracts → สัญญา MA ทุกรายการ
- /assets → อุปกรณ์ทุกชิ้น

### Reports
- /reports → รายงาน Export ได้`,
  },
  S_TIPS_GENERAL,
];

// ─── Administrator ────────────────────────────────────────────────────────────

const SECTIONS_ADMIN: Section[] = [
  S_LOGIN,
  {
    title: "Dashboard Executive",
    thai: "แดชบอร์ดผู้บริหาร",
    content: `## Dashboard — Administrator / Executive

### ภาพรวมเต็มรูปแบบ
- **4 KPI**: ยอดขาย / Achievement % / GP รวม / Follow-up
- **ยอดขายรายบุคคล** + **Quarterly Chart** Q1-Q4
- **Service Status**: ช่างรายคน + SLA %
- **Presale Workload**: รายคน

### TeamScopeBar
- สลับดู: Executive / Sales / Presales / Service / Projects / ธุรการ
- เลือกดูรายบุคคลแต่ละแผนก

### Filter
วันนี้ / 7 วัน / เดือนนี้ / ปีนี้ / Q1-Q4 / กำหนดเอง`,
  },
  {
    title: "Users & Teams",
    thai: "จัดการผู้ใช้",
    content: `## Users / Teams — จัดการผู้ใช้ (👥)

### เข้าถึงได้จาก
/users หรือ Admin → Users / Teams

### สร้างผู้ใช้ใหม่
1. กด **"+ เพิ่มผู้ใช้"**
2. กรอก: อีเมล / ชื่อ / ชื่อเล่น / Role / แผนก / เบอร์
3. กด **"บันทึก"** → ระบบส่งอีเมล reset password

### Roles ทั้ง 9 ตำแหน่ง
| Role | สิทธิ์หลัก |
|---|---|
| Administrator | ทุกอย่าง |
| Branch Manager | ดูทุก module + อนุมัติ QT |
| Sales Manager | Sales ทั้งทีม + อนุมัติ QT |
| Sales Executive | Sales เฉพาะตัวเอง |
| Presales Manager | Presale ทั้งทีม + อนุมัติ |
| Presales Engineer | Presale + BOQ + QT |
| Service Manager | Service ทั้งทีม + Finance |
| Service Technician | Ticket ตัวเอง + ช่างเครื่องมือ |
| Coordinator | ธุรการ + ปิดงาน + สัญญา |

### Extra Roles
- สามารถเพิ่ม role เสริมให้ user เพื่อขยายสิทธิ์

### Filter / Sort
- กรองตาม Role / Status (Active / Inactive)
- เรียงตามชื่อ / Role / Status`,
  },
  {
    title: "Role Management",
    thai: "สิทธิ์ RBAC",
    content: `## Role Management — RBAC (🛡️)

### เข้าถึงได้จาก
Settings → Role Management หรือ /settings/roles

### Permission Matrix
- ดู Permission ทุกตัวของแต่ละ Role
- Toggle **"Matrix"** → เห็นตาราง Role × Permission
- Toggle **"รายละเอียด"** → ดู Permission ของ Role เดียว

### หมวด Permission
Dashboard / Sales / Service / Presale / CRM / Finance / Operations / Master Data / Admin

> Permission เป็น Read-only — แก้ไขได้เฉพาะ source code (rbac.ts)`,
  },
  {
    title: "Settings",
    thai: "ตั้งค่าระบบ",
    content: `## Settings — ตั้งค่าระบบ (⚙️)

### เข้าถึงได้จาก
/settings หรือ Admin → Settings

### Company & Fiscal Year
- ชื่อบริษัท / ที่อยู่ / Tax ID / เบอร์ / เว็บ
- กำหนด **ปีงบประมาณ** (เดือนที่เริ่ม) → ส่งผลต่อ Q1-Q4 ใน Dashboard

### Project Types
- จัดการประเภทงาน: WiFi / CCTV / Network / Solar / ไฟฟ้า / อื่นๆ
- เพิ่ม / ลบ / แก้ไข

### Product Categories
- หมวดหมู่สินค้า + ไอคอน emoji

### Document Numbering
- รูปแบบเลขที่เอกสาร: QT / สัญญา / Invoice
- Prefix + Format + Reset Cycle (รายเดือน/รายปี)

### File Storage Integrations
- เชื่อม SharePoint / OneDrive / Google Drive
- Base URL + Folder Template → ระบบสร้าง Link อัตโนมัติเมื่อสร้าง Presale Project

### Notification Workflows
- ตั้งค่า Trigger + Recipients + Channel (Email/LINE/Teams/Webhook)
- ทดสอบ 🧪 Test ได้ทันที

### Customer Industries
- จัดการกลุ่มธุรกิจลูกค้า

### Import / Backup
- Import ข้อมูล CSV: Customers / Products / Vendors
- Export / Backup ข้อมูลทั้งหมด

### Activity Log
- Audit Trail: Login / สร้าง / แก้ไข / ลบ
- กรองตาม: Module / Action / ผู้ใช้ / วันที่

### System Update
- อัปเดตระบบจาก GitHub
- ดู Commit history + Rollback ได้`,
  },
  {
    title: "Import / Export",
    thai: "นำเข้า/ส่งออกข้อมูล",
    content: `## Import / Export — ข้อมูลหลัก

### หน้าที่รองรับ Import
- 🏢 **Customers** — /customers → ปุ่ม ⬆ Import
- 📦 **Products** — /products → ปุ่ม ⬆ Import
- 🏪 **Vendors** — /vendors → ปุ่ม ⬆ Import

### วิธี Import
1. **Export ก่อนเสมอ** → ได้ Template header ที่ถูกต้อง
2. แก้ไขข้อมูลใน Excel ตาม column (อย่าแก้ header)
3. Save เป็น .csv (UTF-8)
4. กด **⬆ Import** → เลือกไฟล์ → ยืนยัน
5. ระบบแสดงจำนวนแถวก่อน confirm

### หมายเหตุ
- Import = **เพิ่มข้อมูลใหม่เท่านั้น** ไม่ overwrite ของเดิม
- ราคา ใส่เป็นตัวเลขล้วน ไม่ต้องมี ฿ หรือ ,

### Backup ทั้งระบบ
- Settings → Import/Backup → กด **"Export ทั้งหมด"**
- ได้ไฟล์ ZIP รวมทุก Collection`,
  },
  {
    title: "Activity Log",
    thai: "ประวัติการใช้งาน",
    content: `## Activity Log — Audit Trail (📋)

### เข้าถึงได้จาก
Settings → Activity Log หรือ /settings/activity-log

### สิ่งที่บันทึก
- Login / Logout
- สร้าง / แก้ไข / ลบ ทุก Record (Customers, Projects, Tickets ฯลฯ)
- Export / Import
- เปลี่ยนสิทธิ์ / Role

### Filter
- ผู้ใช้ / Module / Action (create/update/delete) / วันที่

### Export
- ดาวน์โหลด Log เป็น CSV สำหรับ Audit`,
  },
  {
    title: "System Update",
    thai: "อัปเดตระบบ",
    content: `## System Update — อัปเดตจาก GitHub (🔄)

### เข้าถึงได้จาก
Settings → System Update หรือ /settings/system-update

### ดู Version ปัจจุบัน
- Commit Hash + Message + วันที่
- จำนวน Commit ที่ยังไม่ได้ดึง

### อัปเดต
1. กด **"Pull & Build"**
2. ระบบ: git pull → npm run build → pm2 restart
3. ดู Log แบบ real-time
4. เมื่อเสร็จ → หน้าเว็บ reload อัตโนมัติ

### Rollback
- เลือก Commit เก่า → กด **"Rollback"**
- ระบบ reset กลับไป Commit นั้น + rebuild`,
  },
  S_TIPS_GENERAL,
];

// ─── Role → Sections mapping ──────────────────────────────────────────────────

function getSections(role: string): Section[] {
  switch (role) {
    case "Administrator":
    case "admin":
    case "avenger":
      return SECTIONS_ADMIN;

    case "Branch Manager":
      return SECTIONS_BRANCH_MGR;

    case "Sales Manager":
      return SECTIONS_SALES_MGR;

    case "Sales Executive":
    case "sale":
      return SECTIONS_SALES_EXEC;

    case "Presales Manager":
      return SECTIONS_PRESALE_MGR;

    case "Presales Engineer":
    case "BOQ Engineer":
    case "presale":
      return SECTIONS_PRESALE_ENG;

    case "Service Manager":
      return SECTIONS_SVC_MGR;

    case "Service Technician":
    case "service":
      return SECTIONS_SVC_TECH;

    case "Operations Coordinator":
    case "Coordinator":
      return SECTIONS_COORDINATOR;

    default:
      return SECTIONS_SALES_EXEC;
  }
}

const ROLE_ICON: Record<string, string> = {
  Administrator: "🛡️", admin: "🛡️", avenger: "🛡️",
  "Branch Manager": "🏢",
  "Sales Manager": "📊", "Sales Executive": "💼", sale: "💼",
  "Presales Manager": "⚙️", "Presales Engineer": "📐", "BOQ Engineer": "📐", presale: "📐",
  "Service Manager": "🎛️", "Service Technician": "🔧", service: "🔧",
  "Operations Coordinator": "🗂️", Coordinator: "🗂️",
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  if (parts.length === 1) return <span>{text}</span>;
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return <code key={i} className="bg-black/30 rounded px-1 text-accent/80 font-mono text-[11px]">{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## "))
      return <h2 key={i} className="text-lg font-bold mt-0 mb-3 text-gradient">{line.slice(3)}</h2>;
    if (line.startsWith("### "))
      return <h3 key={i} className="text-base font-semibold mt-5 mb-2 text-foreground/90 border-b border-border/30 pb-1">{line.slice(4)}</h3>;
    if (line.startsWith("---"))
      return <hr key={i} className="border-border/30 my-4" />;
    if (line.startsWith("|---")) return null;
    if (line.startsWith("|")) {
      const cells = line.split("|").filter(c => c.trim() !== "");
      if (!cells.length) return null;
      const lines2 = content.split("\n");
      const isHeader = i + 1 < lines2.length && lines2[i + 1].startsWith("|---");
      return (
        <div key={i} className={`flex flex-col sm:flex-row sm:gap-2 text-sm py-2 border-b border-border/15 px-2 ${isHeader ? "font-semibold text-foreground bg-card-hover/30 rounded-t border-border/40" : ""}`}>
          <span className="text-foreground/80 sm:w-40 sm:shrink-0">{renderInline(cells[0].trim())}</span>
          <span className="text-muted leading-snug min-w-0">{cells[1] ? renderInline(cells[1].trim()) : ""}</span>
        </div>
      );
    }
    if (line.startsWith("> "))
      return <div key={i} className="my-3 pl-3 border-l-2 border-accent/50 text-sm text-muted/80 italic leading-relaxed">{renderInline(line.slice(2))}</div>;
    if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
      if (match) return (
        <div key={i} className="flex gap-2 text-sm my-2 ml-2">
          <span className="text-accent/60 shrink-0 mt-1 select-none">•</span>
          <span className="leading-relaxed min-w-0 flex-1">
            <strong className="text-foreground font-semibold">{match[1]}</strong>
            <span className="text-muted">{renderInline(match[2])}</span>
          </span>
        </div>
      );
    }
    if (line.startsWith("- "))
      return (
        <div key={i} className="flex gap-2 text-sm my-1.5 ml-2 text-muted">
          <span className="text-accent/40 shrink-0 mt-1 select-none">•</span>
          <span className="leading-relaxed min-w-0 flex-1">{renderInline(line.slice(2))}</span>
        </div>
      );
    if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)/)?.[1] || "";
      return (
        <div key={i} className="flex gap-2 text-sm my-1.5 ml-2 text-muted">
          <span className="text-accent font-bold shrink-0 min-w-[18px] select-none">{num}.</span>
          <span className="leading-relaxed min-w-0 flex-1">{renderInline(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
    }
    if (line.startsWith("**"))
      return <p key={i} className="text-sm font-semibold text-foreground/80 mt-4 mb-1">{renderInline(line)}</p>;
    if (line.trim() === "") return <div key={i} className="h-3" />;
    return <p key={i} className="text-sm text-muted my-1 leading-relaxed">{renderInline(line)}</p>;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HelpPage() {
  const { currentUser } = useCurrentUser();
  const role = currentUser?.role ?? "";
  const sections = getSections(role);
  const roleIcon = ROLE_ICON[role] ?? "📖";

  const [active, setActive] = useState(0);
  const [searchHelp, setSearchHelp] = useState("");
  const [tocOpen, setTocOpen] = useState(false);

  const filtered = searchHelp
    ? sections.filter(s =>
        s.title.toLowerCase().includes(searchHelp.toLowerCase()) ||
        s.thai.includes(searchHelp) ||
        s.content.toLowerCase().includes(searchHelp.toLowerCase())
      )
    : sections;

  const current = filtered[Math.min(active, filtered.length - 1)] || filtered[0];

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gradient">
          {roleIcon} คู่มือการใช้งาน — {role || "ผู้ใช้งาน"}
        </h1>
        <p className="text-xs text-muted mt-0.5">
          KMITSURAT Work Portal · คู่มือเฉพาะสำหรับ Role ของคุณ · อัปเดต {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <input
        placeholder="🔍 ค้นหาในคู่มือ..."
        value={searchHelp}
        onChange={e => { setSearchHelp(e.target.value); setActive(0); setTocOpen(false); }}
        className="mb-4 w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
      />

      {/* TOC */}
      <div className="mb-4 relative">
        <button
          onClick={() => setTocOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-card border border-border text-sm hover:border-accent/50 transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-accent/50 text-xs shrink-0">☰</span>
            <span className="font-medium text-foreground truncate">{current?.title}</span>
            <span className="text-muted/60 text-xs truncate hidden sm:inline">— {current?.thai}</span>
          </span>
          <span className="text-muted text-xs shrink-0 ml-2">{tocOpen ? "▲" : "▼"}</span>
        </button>
        {tocOpen && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl bg-card border border-border shadow-xl overflow-hidden divide-y divide-border/20 max-h-80 overflow-y-auto">
            {filtered.map((s, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); setTocOpen(false); }}
                className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  active === i ? "bg-accent/15 text-accent font-medium" : "text-muted hover:bg-card-hover hover:text-foreground"
                }`}
              >
                {s.title}
                <span className="block text-[11px] opacity-60 mt-0.5">{s.thai}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick-nav pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filtered.map((s, i) => (
          <button
            key={i}
            onClick={() => { setActive(i); setTocOpen(false); }}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              active === i
                ? "bg-accent/20 text-accent border-accent/40"
                : "bg-card border-border text-muted hover:bg-card-hover hover:text-foreground"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="w-full min-w-0 rounded-xl bg-card border border-border p-4 sm:p-6"
        style={{ wordBreak: "break-word", overflowWrap: "break-word", minHeight: "400px" }}
      >
        {current ? (
          <div className="min-w-0 w-full">
            {renderContent(current.content)}
          </div>
        ) : (
          <p className="text-muted text-sm">ไม่พบหัวข้อที่ค้นหา</p>
        )}
      </div>
    </div>
  );
}
