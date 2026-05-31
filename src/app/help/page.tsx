"use client";
import { useState } from "react";

type Section = { title: string; thai: string; content: string };

const sections: Section[] = [
  {
    title: "Getting Started",
    thai: "เริ่มต้นใช้งาน",
    content: `## เริ่มต้นใช้งาน KMITSURAT Work Portal

### เข้าสู่ระบบ
1. เปิดเบราว์เซอร์ไปที่ **http://localhost:3000**
2. กรอก **ชื่อผู้ใช้** และ **รหัสผ่าน** ที่หน้า Login
3. ระบบจำการเข้าสู่ระบบไว้ — ไม่ต้องกรอกใหม่ทุกครั้ง
4. กด **ออกจากระบบ** ที่ด้านล่าง Sidebar

### โครงสร้างเมนู (Sidebar)
เมนูแสดงเฉพาะที่ Role มีสิทธิ์เข้าถึง:

**SALES** — ก่อนปิดดีล:
- 📅 **Action Plan** — วางแผนงานรายวัน (ปฏิทิน)
- 📞 **Activities** — บันทึกกิจกรรมงานขาย
- 🎯 **Pipeline** — โอกาสขาย (Lead → Won/Lost)
- 💰 **Quotations** — ใบเสนอราคา + Revision
- 📈 **Sales Plan** — แผนยอดขาย / Quota
- 🙋 **Requests** — Job Request ไป Presale/Service

**OPERATIONS** — หลังได้ดีล:
- 📋 **Presale Tasks** — งาน BOQ / Solution + ปฏิทิน
- 🗂️ **Project Execution** — ดำเนินโปรเจค
- 🔧 **Service Tickets** — งานติดตั้ง / ซ่อม / PM
- 🛡️ **Contracts** — สัญญา / รับประกัน / MA
- 🖥️ **Assets** — อุปกรณ์ / Serial Tracking
- 🔧 **PM Schedule** — ตารางงาน PM อุปกรณ์

**MASTER DATA** — ฐานข้อมูล:
- 🏢 **Customers** — ลูกค้า + แผนที่
- 🏪 **Vendors** — ผู้ขาย / Suppliers
- 📦 **Products** — สินค้า / ราคา / Vendor Prices

**ADMIN** — ตั้งค่า:
- 👥 **Users / Teams** — ผู้ใช้ + ทีม
- 📈 **Reports** — รายงาน / ส่งออก
- ⚙️ **Settings** — ตั้งค่าระบบ
- 📖 **Help** — คู่มือการใช้งาน (หน้านี้)

### เคล็ดลับ
- เอาเม้าไปชี้ที่เมนู → เห็น **คำอธิบายภาษาไทย**
- กดเมนู SALES ใดก็ตาม → เปิด Tab ที่ตรงกันบนหน้า Sales โดยตรง
- ทุกปุ่ม ทุกตัวเลข ทุกการ์ด **กดได้** → ไปหน้าที่เกี่ยวข้อง`,
  },
  {
    title: "Dashboard",
    thai: "แดชบอร์ดผู้บริหาร",
    content: `## Dashboard — แดชบอร์ดผู้บริหาร

### Hero KPI Strip (4 การ์ดบนสุด)
แสดง 4 ช่องเท่ากันทุกขนาดหน้าจอ:
- **ยอดขาย** — รายได้รวม (THB) + progress bar เทียบเป้า
- **Achievement** — % บรรลุเป้า + จริง/เป้า
- **GP รวม** — กำไรขั้นต้น (M) + %GP
- **Follow-up** — งานค้างติดตาม

> ยอดขายคำนวณแบบ **live** จากใบเสนอราคาที่อนุมัติแล้ว (approved / PO received) — ไม่ต้องกรอกมือ

### Filter แถบบน
วันนี้ / 7 วัน / เดือนนี้ / ปีนี้ / Q1–Q4 / กำหนดเอง

### ยอดขายรายบุคคล (Sales Table)
- แสดงแต่ละคนเป็นแถว: ชื่อ + progress bar + % + ยอดจริง/เป้า
- ตัวเลขแสดงเป็น K หรือ M อัตโนมัติ (เช่น 640K, 2.5M)
- Badge **Act** (Activity) และ **Proj** (โปรเจคที่ active)

### ผลงานรายไตรมาส (Quarterly Chart)
- 4 การ์ด Q1–Q4 แสดงยอดจริง/เป้า + %
- ตัวเลขแปลงหน่วยอัตโนมัติ (25,980K → 26.0M)
- Bar chart มี legend: ■ เป้าหมาย / ■ ยอดจริง / ■ กำไร (GP)

### Service Status
- 4 ช่อง: เสร็จแล้ว / เกินกำหนด / กำลังดำเนินการ / รอดำเนินการ
- กดแต่ละช่องไปหน้า Service ได้เลย
- ด้านล่าง: ช่างรายคน — bar แสดงจำนวนงานแยกสถานะ

### Presale Workload
- รายชื่อ Presale ทีม + badge จำนวนงาน: 🟡 รอ / 🔵 กำลังทำ / 🟢 เสร็จ

### Alerts
- 🔴 ด่วน / 🟠 เตือน / 🟢 ข้อมูล — กดไปหน้าที่เกี่ยวข้องได้ทุกรายการ`,
  },
  {
    title: "Sales (4 Tabs)",
    thai: "งานขาย — 4 Tabs",
    content: `## Sales — งานขาย (4 Tabs + Requests)

### Flow: Action Plan → Activities → Pipeline → Quotation

### Tab 1: Action Plan (📅)
- **ปฏิทินรายเดือน** — คลิกวันใดก็ได้เพื่อดูและเพิ่มแผน
- กด **"+ วางแผน"** → ใส่ วันที่/ประเภท/ลูกค้า/เป้าหมาย
- กดที่แผนที่มีอยู่ → แก้ไข / อัปเดตสถานะ / ลบ
- สถานะ: วางแผน → กำลังทำ → เสร็จ / เลื่อน
- กด **"Update"** บนมือถือเพื่อแก้ไขแผนรายวัน

### Tab 2: Activities (📞)
- กด **"+ บันทึกกิจกรรม"** → ประเภท/ลูกค้า/โปรเจค/ผลลัพธ์/Next Action
- **ผลลัพธ์**: สำเร็จ / ไม่รับสาย / สนใจ / ปฏิเสธ / รอผล
- **Filters**: ทั้งหมด / วันนี้ / สัปดาห์นี้ / Overdue (badge แดง)
- กด **"→ ดีล"** → convert เป็น Pipeline อัตโนมัติ
- ⬇ **Export CSV** ได้จากปุ่มในแถว filter

### Tab 3: Pipeline (🎯)
- Stage summary: Lead/Opportunity/Proposal/Negotiation/Won/Lost
- ตาราง: Project/Customer/Value/Stage/%/Close Date/Next Action
- เปลี่ยน Stage ได้จาก dropdown
- ปุ่ม convert: **QT** / **PS** (Presale) / **SV** (Service)
- ⬇ **Export CSV** ได้จากปุ่มในแถว filter

### Quota Set (เฉพาะ Manager)
- ตั้งเป้ายอดขายรายคน/รายเดือน
- KPI Summary: เป้า/ยอดจริง/เหลือ/% + 🏆 Top Performer

### Requests (🙋) — ขวาสุด
- สร้าง **Job Request** ไป Presale หรือ Service
- ระบุ: หัวข้อ/ทีม/ลูกค้า(ค้นหาได้)/วันที่/ความเร่งด่วน/รายละเอียด
- Badge แดงแสดงจำนวน request ที่รอดำเนินการ`,
  },
  {
    title: "Sales Pipeline",
    thai: "Pipeline / โอกาสขาย",
    content: `## Sales Pipeline — โอกาสขาย

### Summary (ด้านบน — ซ่อน/แสดงได้)
- KPI: Total/Active/Won/Win Rate
- **Funnel bar** — แถบสีแสดง pipeline flow ตามสัดส่วน
- Stage buttons — กดเพื่อกรอง

### Control Bar
- 🔍 ค้นหา + กรองสถานะ + กรองเซลล์
- Toggle: **▤ Compact** / **☰ Detailed**
- ปุ่ม: ซ่อน Summary / กางทั้งหมด / หุบทั้งหมด

### Project Cards
- **แถบสีซ้าย** ตามสถานะ (เขียว=Won, แดง=Lost ฯลฯ)
- ชื่อโปรเจค (bold ใหญ่) + ลูกค้า + มูลค่า (ใหญ่ สีตามสถานะ)
- Tags ประเภทงาน (เลือกหลายอัน เช่น WiFi + CCTV + Network)
- **คลิกกาง** → เห็น: ประเภทงาน/ผู้รับผิดชอบ/โอกาสปิด/Notes/Re-engage/Reminder
- Quick actions: Detail / QT / PS / SV

### สร้างโปรเจคใหม่
- **ค้นหาลูกค้า** + ปุ่ม "+" สร้างลูกค้าใหม่ inline
- **เลือกหลายประเภทงาน** (checkbox) + พิมพ์เพิ่มประเภทใหม่ได้
- เหตุผลชนะ/แพ้ + แผน Re-engage + แจ้งเตือนเลือกหลายคน`,
  },
  {
    title: "Quotations",
    thai: "ใบเสนอราคา",
    content: `## Quotations — ใบเสนอราคา

### สร้างใบเสนอราคา
1. **ค้นหาลูกค้า** — พิมพ์ชื่อบางส่วนเพื่อกรอง (ปุ่ม "สร้างลูกค้าใหม่" → ไปหน้า Customers)
2. เลือก **โปรเจค** (เฉพาะของลูกค้านั้น) หรือเลือก "✏️ อื่นๆ" พิมพ์เอง
3. เพิ่ม Line Items → เลือกสินค้าจาก dropdown → auto-fill ราคา
4. แก้ไข จำนวน / ราคา / ส่วนลด → คำนวณ Total, Margin%, GP% อัตโนมัติ
5. เลือกระดับราคา: ทั่วไป / สมาชิก / พิเศษ
6. ตั้งค่า VAT: ไม่มี / บวก VAT / รวม VAT แล้ว
7. **ผู้สร้าง** — auto-set เป็น user ที่ login

### ผู้รับผิดชอบยอดขาย (Salesperson)
- ใน Detail Panel มี dropdown **"ผู้รับผิดชอบ"** — เลือกว่าใครเป็นเจ้าของยอดขายนี้
- ค่าเริ่มต้น = คนที่สร้าง QT แต่เปลี่ยนได้ เช่น เมื่อ Admin สร้าง QT ให้เซลล์คนอื่น
- เมื่อ QT **อนุมัติแล้ว** ยอดขายของผู้รับผิดชอบจะอัปเดตใน Dashboard อัตโนมัติ

### Workflow สถานะ
Draft → ส่งแล้ว → อนุมัติ / ปฏิเสธ
- กดปุ่มสถานะในแถบ Detail Panel เพื่อเปลี่ยน
- อนุมัติแล้ว → ยอดขาย Dashboard อัปเดตทันที (live)

### Revision (แก้ไขเวอร์ชัน)
- กดปุ่ม **"Revise"** → เก็บเวอร์ชันเดิมไว้ + สร้างเวอร์ชันใหม่
- กดปุ่ม **"📋 History"** → ดูทุก revision เปรียบเทียบมูลค่า/GP
- แต่ละ revision เก็บ: items ทั้งหมด + ราคา + เหตุผลที่แก้ + ผู้แก้

### Export
- ⬇ **Export CSV** — ดาวน์โหลดรายการใบเสนอราคา (กรองตาม filter ปัจจุบัน)`,
  },
  {
    title: "Presale",
    thai: "งานพรีเซลล์",
    content: `## Presale Tasks — งานพรีเซลล์

### Job Requests จาก Sales
- กล่องสีม่วงด้านบน → เลือกมอบหมาย → รับงาน / ปฏิเสธ

### สร้าง Presale Request
- ประเภท: Solution Design / BOQ / Technical Proposal / Site Survey ฯลฯ
- เลือก ลูกค้า + โปรเจค + ผู้รับผิดชอบ + Due date

### Detail Panel (คลิกที่งาน)
- **Summary** — ภาพรวม + Solution Summary (markdown)
- **BOM** — รายการอุปกรณ์ (Brand, Qty, Unit)
- **BOQ** — ราคาต้นทุน/ขาย/Margin → **แปลงเป็น QT ได้**
- **Files** — แนบไฟล์ Design/Drawing/Spec

### ปฏิทิน Presale (/presale/calendar)
- กดปุ่ม **"📅 ปฏิทิน"** มุมขวาบน
- ดูตารางงานรายเดือน แยกสีตามคน
- กดวันที่ → เห็นรายละเอียดงานวันนั้น
- กรองตามคน + เดือน ← → ได้`,
  },
  {
    title: "Service",
    thai: "งานบริการ / ติดตั้ง / ซ่อม",
    content: `## Service Tickets — งานบริการ

### Job Requests จาก Sales
- กล่องสีชมพูด้านบน → เลือกมอบหมายช่าง → รับงาน / ปฏิเสธ

### สร้าง Service Ticket
- ประเภท: Installation / Site Survey / After-Sales / Repair / PM Service
- ระบุ: ผู้แจ้ง / ช่องทาง (โทร/Line/Email/Walk-in)
- เลือกโหมดมอบหมาย: ระบุช่าง / ทุกคน / ตามความถนัด / ตามพื้นที่
- ตั้ง SLA: Response time + Resolution time

### สถานะ
Open → In Progress → Resolved → Closed
- เปลี่ยนได้จาก dropdown
- Revenue / Profit กรอกเมื่อปิดงาน

### Dashboard Stats
- CM/PM/Install/Overdue/SLA%
- Revenue ต่อช่าง + ต่อประเภทงาน`,
  },
  {
    title: "Customers",
    thai: "ฐานข้อมูลลูกค้า",
    content: `## Customers — ฐานข้อมูลลูกค้า

### CRUD: เพิ่ม / แก้ไข / ลบ
- ชื่อบริษัท / ผู้ติดต่อ / เบอร์ / อีเมล / จังหวัด / ประเภทหน่วยงาน

### ประเภทหน่วยงาน
หน่วยงานราชการ / เอกชน / สถานศึกษา / โรงพยาบาล / โรงแรม / อื่นๆ

### Filters
- ค้นหาชื่อ/ผู้ติดต่อ/จังหวัด
- กรองตามจังหวัด + ประเภทหน่วยงาน
- เรียงลำดับ: ใหม่สุด/เก่าสุด/ชื่อ/จังหวัด
- กรองตาม: ของฉัน / ทีม / ทั้งหมด

### Hover Popup
เอาเม้าชี้ที่ลูกค้า → popup: โปรเจค/มูลค่า/ใบเสนอราคา/งานบริการ/PM/งานค้าง

### Import / Export CSV
- ⬇ **Export** — ดาวน์โหลดข้อมูลลูกค้าทั้งหมดเป็น CSV
- ⬆ **Import** — นำเข้าจาก CSV (header ภาษาไทยตาม template ที่ Export มา)

### แผนที่ (ด้านล่าง)
- แผนที่ประเทศไทย (Leaflet) — ซูมเข้า/ออก/ลากได้
- จุดวงกลมตามจังหวัด ขนาดตามจำนวนลูกค้า
- คลิกจุด → popup รายชื่อ + ข้อมูลสรุป → กดกรองตารางได้`,
  },
  {
    title: "Products & Vendors",
    thai: "สินค้า / ราคา / Vendors",
    content: `## Products — สินค้า / ราคา

### สินค้า
- รหัส / ชื่อ / ยี่ห้อ / หมวดหมู่ / หน่วย
- ราคาทุน / ราคาขาย / ราคาสมาชิก / ราคาพิเศษ / ส่วนลดเริ่มต้น
- ประเภท: สินค้า / บริการ — Active/Inactive

### Vendor Prices
- กดแถวสินค้าเพื่อขยาย → เพิ่มราคาจาก Vendor ต่างๆ
- ติดตาม Price History อัตโนมัติ
- แสดง Trend ราคา (ขึ้น/ลง/คงที่)

### Import / Export CSV (Products)
- ⬇ **Export** — ดาวน์โหลดรายการสินค้าทั้งหมด
- ⬆ **Import** — นำเข้าสินค้าจาก CSV (ราคาแปลงเป็นตัวเลขอัตโนมัติ)

### Vendors (/vendors)
- จัดการข้อมูลผู้ขาย/Supplier
- ประเภท: Distributor / ผู้รับเหมา(บริษัท) / ผู้รับเหมา(บุคคล) / ทีมภายใน
- ข้อมูล: ชื่อ / เบอร์ / อีเมล / เงื่อนไขชำระ / Tax ID / VAT / WHT
- ⬇⬆ **Import / Export CSV** ได้เช่นกัน`,
  },
  {
    title: "Contracts",
    thai: "สัญญา / รับประกัน / MA",
    content: `## Contracts — สัญญา / รับประกัน / MA

### ประเภทสัญญา
- 🛡️ **รับประกันสินค้า** — ระบุวันเริ่ม/สิ้นสุด
- 🔧 **รับประกันงานติดตั้ง** — ระบุวันเริ่ม/สิ้นสุด
- 📋 **สัญญา MA** — สัญญาบำรุงรักษาประจำปี + มูลค่า + Service Level

### การแจ้งเตือน
- แสดง Alert เมื่อสัญญาใกล้หมดอายุ (30 วัน)
- Dashboard แสดง Expiry Buckets: ≤30d / 31-60d / 61-90d / >90d

### เชื่อมโยง
- ลิงก์กับ ลูกค้า + โปรเจค
- ดูสัญญาทั้งหมดของโปรเจคได้จากหน้า Pipeline (badge 🛡️)`,
  },
  {
    title: "Users & Teams",
    thai: "ผู้ใช้ / ทีม",
    content: `## Users / Teams — จัดการผู้ใช้

### Users tab
- รูป / ชื่อเล่น / ชื่อจริง-นามสกุล / ตำแหน่ง / แผนก / Role / อีเมล / เบอร์
- เพิ่ม / แก้ไข / ลบ ได้ครบ — คลิกที่แถว → เปิดรายละเอียด

### Roles (9 ตำแหน่ง)
| Role | สิทธิ์หลัก |
|------|------------|
| **Administrator** | เห็นและจัดการทุกอย่าง |
| **Branch Manager** | เห็นทุกแผนก + อนุมัติ QT + จัดการทีม |
| **Sales Manager** | เห็นข้อมูล Sales ทั้งหมด + อนุมัติ QT |
| **Sales Executive** | เห็นเฉพาะข้อมูลตัวเอง + สร้าง QT |
| **Presales Manager** | จัดการ Presale + อนุมัติงาน |
| **Presales Engineer** | ทำงาน Presale + สร้าง BOQ/QT |
| **Service Manager** | จัดการ Ticket + สัญญา + Assets |
| **Service Technician** | รับงาน Ticket ของตัวเอง |
| **Operations Coordinator** | ดูภาพรวม + ประสานงานทุกแผนก |
| **Coordinator** | ธุรการ + จัดการ Ticket + สัญญา |

> **avenger** (legacy) — ยังใช้งานได้ สิทธิ์เทียบเท่า Senior Sales

### โปรไฟล์ผู้ใช้
- กดชื่อ/รูปที่ด้านล่าง Sidebar → หน้าโปรไฟล์
- แก้ไขชื่อ / เปลี่ยนรหัสผ่าน / เลือกการแสดงชื่อ (ชื่อเล่น/ชื่อจริง)

### Dashboard ส่วนตัว
- Sales Executive/Manager → เห็นยอดเป้าเดือนนี้ + % ที่ทำได้
- ยอดขายอัปเดต live เมื่อ QT ถูกอนุมัติ`,
  },
  {
    title: "Notifications",
    thai: "แจ้งเตือนอัตโนมัติ",
    content: `## Notification Workflows — แจ้งเตือนอัตโนมัติ

### เข้าถึง: Settings → 🔔 Notification Workflows

### Channels (ตั้งค่าช่องทาง)
- 📧 **Email** — SMTP (Gmail / Microsoft 365)
- 💚 **LINE Notify** — Token
- 💬 **LINE Messaging** — Channel Token/Secret/Group
- 🟦 **Microsoft Teams** — Incoming Webhook
- 🔗 **Custom Webhook** — URL/Method/Headers

### Workflows (ตั้งค่า Trigger)
9 Triggers: สร้าง QT / GP ต่ำ / ส่ง QT ตรวจสอบ / QT อนุมัติ / เปิดโปรเจค / สัญญาหมดอายุ / สร้าง Service / เปลี่ยนสถานะ Ticket

### ตั้งค่า
- ผู้รับ: เลือก Roles + Users (checkbox) + อีเมลเพิ่มเติม
- Channels: เลือกหลายช่องทาง + เลือก Channel ที่ตั้งค่าแล้ว
- Template: Subject + Body ใช้ตัวแปร {customer_name}, {total_selling} ฯลฯ
- Enable/Disable + ปุ่ม 🧪 Test ส่งอีเมลจริง

### อีเมลส่งจากใคร
- ส่งจากอีเมลของผู้ใช้ที่เลือกอยู่ (Sidebar ด้านล่าง)
- เปลี่ยนผู้ส่งได้โดยเปลี่ยน user`,
  },
  {
    title: "Settings",
    thai: "ตั้งค่าระบบ",
    content: `## Settings — ตั้งค่าระบบ

### 🏷️ Project Types
- จัดการประเภทงาน (WiFi, CCTV, Network ฯลฯ)
- ใช้ใน dropdown + checkbox ตอนสร้างโปรเจค
- เพิ่ม inline จากฟอร์มโปรเจคได้

### 📦 Product Categories
- จัดการหมวดหมู่สินค้า + ไอคอน emoji

### 🔢 Document Numbering
- ตั้งค่ารูปแบบเลขที่เอกสาร (QT, สัญญา ฯลฯ)
- prefix + template + reset cycle (รายเดือน/รายปี)

### 📘 File Storage Integrations
- เชื่อม SharePoint / OneDrive / Google Drive
- สำหรับเก็บไฟล์โปรเจค Presale

### 🔔 Notification Workflows
- ตั้งค่า Workflow แจ้งเตือน Email/LINE/Teams/Webhook`,
  },
  {
    title: "Import / Export CSV",
    thai: "นำเข้า / ส่งออกข้อมูล",
    content: `## Import / Export CSV — นำเข้า/ส่งออกข้อมูล

### หน้าที่รองรับ
- 🏢 **Customers** — Export + Import
- 📦 **Products** — Export + Import
- 🏪 **Vendors** — Export + Import
- 🎯 **Pipeline** — Export อย่างเดียว
- 💰 **Quotations** — Export อย่างเดียว
- 📞 **Activities** — Export อย่างเดียว

### วิธี Export
1. กดปุ่ม **⬇ Export** ในแถว filter ของแต่ละหน้า
2. ไฟล์ .csv ดาวน์โหลดอัตโนมัติ — ชื่อไฟล์มีวันที่
3. เปิดใน Excel หรือ Google Sheets ได้โดยตรง (รองรับภาษาไทย)

### วิธี Import
1. **Export ก่อนเสมอ** เพื่อดู format header ที่ถูกต้อง
2. แก้ไขหรือเพิ่มข้อมูลใน Excel ตาม column header ภาษาไทย
3. บันทึกเป็น .csv
4. กดปุ่ม **⬆ Import** → เลือกไฟล์ → ยืนยัน
5. ระบบจะแสดงจำนวนแถวที่พบก่อน confirm

### หมายเหตุ
- Import จะ **เพิ่มข้อมูลใหม่** เท่านั้น ไม่ได้ overwrite ข้อมูลเดิม
- ราคา (cost_price, selling_price) ใส่เป็นตัวเลขล้วน ไม่ต้องใส่ ฿ หรือ ,
- สถานะ active ใส่ true หรือ false`,
  },
  {
    title: "Tips & Tricks",
    thai: "เคล็ดลับ + การแก้ปัญหา",
    content: `## เคล็ดลับการใช้งาน

### การนำทาง
- ใช้ Sidebar ด้านซ้าย — Active menu มี **highlight สีน้ำเงิน**
- กดเมนู Sales ใดก็ตาม → ไปที่ Tab นั้นบนหน้า Sales โดยตรง
- Sidebar ซ่อน section ที่ Role ไม่มีสิทธิ์อัตโนมัติ

### ฟอร์ม
- ช่องที่มี ***** คือบังคับกรอก
- ช่องค้นหาลูกค้า — พิมพ์บางส่วนเพื่อกรอง dropdown
- กด "บันทึก" / "ยกเลิก"

### Pipeline
- กด **▤/☰** เปลี่ยนมุมมอง Compact/Detailed
- กด **⊞/⊟** กาง/หุบทั้งหมด
- กด stage button เพื่อกรอง
- กดที่โปรเจค → กางดูรายละเอียด

### รีสตาร์ท Server
ถ้าหน้าเว็บค้าง:
1. พิมพ์ใน Terminal: \`taskkill /F /IM node.exe\`
2. พิมพ์: \`npx next build && npx next start --port 3000\`
3. เปิดเบราว์เซอร์ http://localhost:3000

### Production vs Development
- **Production** (เร็ว): \`npx next build && npx next start --port 3000\`
- **Development** (แก้โค้ดได้): \`npx next dev --webpack --port 3000\`

### ส่งอีเมล
1. ตั้งค่า SMTP Channel ที่ Settings → Notifications → Channels
2. สร้าง Workflow → เลือก trigger + recipients + channel
3. กด 🧪 Test เพื่อทดสอบ
- Microsoft 365: ต้องเปิด **Authenticated SMTP** ใน Admin Center`,
  },
];

export default function HelpPage() {
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

  const current = filtered[active] || filtered[0];

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
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## "))
        return <h2 key={i} className="text-lg font-bold mt-0 mb-3 text-gradient">{line.slice(3)}</h2>;
      if (line.startsWith("### "))
        return <h3 key={i} className="text-base font-semibold mt-5 mb-2 text-foreground/90 border-b border-border/30 pb-1">{line.slice(4)}</h3>;
      if (line.startsWith("|---")) return null;
      if (line.startsWith("|")) {
        const cells = line.split("|").filter(c => c.trim() !== "");
        if (!cells.length) return null;
        const isHeader = i + 1 < lines.length && lines[i + 1].startsWith("|---");
        return (
          <div key={i} className={`flex flex-col sm:flex-row sm:gap-2 text-sm py-2 border-b border-border/15 px-2 ${isHeader ? "font-semibold text-foreground bg-card-hover/30 rounded-t border-border/40" : ""}`}>
            <span className="text-foreground/80 sm:w-36 sm:shrink-0">{renderInline(cells[0].trim())}</span>
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

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gradient">Help / คู่มือการใช้งาน</h1>
        <p className="text-xs text-muted mt-0.5">
          KMITSURAT Work Portal v1.6 — อัปเดต {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Search */}
      <input
        placeholder="🔍 ค้นหาในคู่มือ..."
        value={searchHelp}
        onChange={e => { setSearchHelp(e.target.value); setActive(0); setTocOpen(false); }}
        className="mb-4 w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
      />

      {/* ── Mobile TOC accordion (< 640px only) ────────────────── */}
      <div className="sm:hidden mb-4">
        <button
          onClick={() => setTocOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-card border border-border text-sm"
        >
          <span className="font-medium text-accent truncate">{current?.title}</span>
          <span className="text-muted text-xs shrink-0">{tocOpen ? "▲ ปิด" : "☰ สารบัญ"}</span>
        </button>

        {tocOpen && (
          <div className="mt-1 rounded-xl bg-card border border-border overflow-hidden divide-y divide-border/30">
            {filtered.map((s, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); setTocOpen(false); }}
                className={`block w-full text-left px-4 py-3 text-sm transition-colors ${
                  active === i ? "bg-accent/15 text-accent font-medium" : "text-muted"
                }`}
              >
                {s.title}
                <span className="block text-[11px] opacity-60 mt-0.5">{s.thai}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main layout: block on mobile, flex on sm+ ───────────── */}
      <div className="sm:flex sm:gap-4 sm:items-start">

        {/* Sidebar — hidden on mobile, visible sm+ */}
        <div className="hidden sm:block sm:w-56 sm:shrink-0">
          <div className="rounded-xl bg-card border border-border p-3 sticky top-6">
            <p className="text-xs text-accent/50 uppercase tracking-widest mb-2 px-2">สารบัญ</p>
            {filtered.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  active === i
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-muted hover:bg-card-hover hover:text-foreground"
                }`}
              >
                {s.title}
                <span className="block text-[10px] opacity-60">{s.thai}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content — full width mobile, flex-1 desktop */}
        <div
          className="w-full min-w-0 sm:flex-1 rounded-xl bg-card border border-border p-4 sm:p-6"
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
    </div>
  );
}
