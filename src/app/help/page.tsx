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
2. เลือกผู้ใช้ที่ **Sidebar ด้านล่าง** (dropdown เลือกชื่อ)
3. ระบบจะจำชื่อผู้ใช้ไว้ ไม่ต้องเลือกใหม่ทุกครั้ง

### โครงสร้างเมนู (Sidebar)
เมนูแบ่งเป็น 5 กลุ่ม:

**SALES** — ก่อนปิดดีล:
- 🎯 **Pipeline** — โอกาสขาย (Lead → Won/Lost)
- 📞 **Activities** — บันทึกกิจกรรม + วางแผน + Job Request
- 💰 **Quotations** — ใบเสนอราคา + Revision
- 🔄 **Sales Workflow** — ติดตาม Timeline QT → PO → ส่งมอบ
- 📈 **Sales Plan** — แผนยอดขาย / Quota

**OPERATIONS** — หลังได้ดีล:
- 📋 **Presale Tasks** — งาน BOQ / Solution + ปฏิทิน
- 🗂️ **Project Execution** — ดำเนินโปรเจค
- 🔧 **Service Tickets** — งานติดตั้ง / ซ่อม / PM
- 🛡️ **Contracts** — สัญญา / รับประกัน / MA

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
- ทุกปุ่ม ทุกตัวเลข ทุกการ์ด **กดได้** → ไปหน้าที่เกี่ยวข้อง
- Neon Dark Theme — input กด focus เห็น glow สีม่วง`,
  },
  {
    title: "Dashboard",
    thai: "แดชบอร์ดผู้บริหาร",
    content: `## Dashboard — แดชบอร์ดผู้บริหาร

### KPI Cards (ด้านบน) — กดได้ทุกใบ
- **Total Revenue** → กดไปหน้า Pipeline
- **Target vs Actual** → กดไปหน้า Sales Plan
- **Pipeline Value** → กดไปหน้า Pipeline
- **Overdue Jobs** → กดไปหน้า Activities (filter: overdue)
- **SLA On-time** → กดไปหน้า Service
- **Forecast EOM** — คาดการณ์รายได้สิ้นเดือน

### Department Overview (กลาง) — กดแต่ละการ์ดไปหน้าแผนก
- **Sales Performance** — เป้า/Pipeline/Activities/Conv.Rate + Funnel chart
- **Presale Workload** — New/Working/Done + กราฟประเภทงาน
- **Service Operation** — CM/PM/Install/SLA + กดไปหน้า Service
- **Project Overview** — Active/Pending/Won/มูลค่า

### Charts
- Funnel: Sales Pipeline (Lead → Won)
- Bar: งานแยกแผนก + ต่อคน
- Pie: สัดส่วนสถานะ + ประเภท Service

### Team Performance + Alerts (ล่าง)
- ตารางพนักงาน: งานทั้งหมด / เสร็จ / ค้าง / ล่าช้า
- Alerts: 🔴 ด่วน / 🟠 เตือน / 🟢 ข้อมูล — กดไปหน้าที่เกี่ยวข้อง`,
  },
  {
    title: "Sales (5 Tabs)",
    thai: "งานขาย — 5 Tabs",
    content: `## Sales — งานขาย (5 Tabs)

### Flow: Plan → Activity → Pipeline → Quotation

### Tab 1: Dashboard
- KPI: Target/Pipeline/Won/Overdue — **กดแต่ละใบไปหน้าที่เกี่ยวข้อง**
- **Conversion Flow**: Plans → Activities → Pipeline → Won — **กดแต่ละช่องได้**
- Today / Overdue / Plans — **กดหัวข้อหรือแต่ละ item ได้**

### Tab 2: Plan / Quota
**วางแผนกิจกรรม:**
- กด **"+ วางแผน"** → ใส่ วันที่/ประเภท/ลูกค้า(ไม่บังคับ)/คาดหวัง
- กด **"✓ ทำแล้ว"** → convert เป็น Activity อัตโนมัติ

**เป้ายอดขาย:**
- KPI Summary: เป้า/ยอดจริง/เหลือ/Achievement% + 🏆 Top Performer
- การ์ดแต่ละเซลล์: 🥇🥈🥉 เรียงตาม % + Progress bar + แถบสี
- กด **"✏️ แก้ไข"** → เปิดฟอร์มพร้อมข้อมูลเดิม
- กด **"🗑 ลบ"** → ลบพร้อมยืนยัน

### Tab 3: Activities
- กด **"+ บันทึกกิจกรรม"** → ประเภท/ลูกค้า/โปรเจค/ผลลัพธ์/Next Action
- **ผลลัพธ์**: สำเร็จ / ไม่รับสาย / สนใจ / ปฏิเสธ / รอผล
- **Filters**: ทั้งหมด / วันนี้ / สัปดาห์นี้ / Overdue (badge แดง)
- กด **"→ ดีล"** → convert เป็น Pipeline (สร้าง Project อัตโนมัติ)
- เปลี่ยนสถานะ dropdown: New → ทำอยู่ → เสร็จ

### Tab 4: Pipeline
- Stage summary: Lead/Opportunity/Proposal/Negotiation/Won/Lost
- ตาราง: Project/Customer/Value/Stage/Probability/%/Close Date/Next Action
- เปลี่ยน Stage ได้จาก dropdown
- ปุ่ม convert: **QT** / **PS** (Presale) / **SV** (Service)

### Tab 5: Requests
- สร้าง **Job Request** ไป Presale หรือ Service
- ระบุ: หัวข้อ/ทีม/ลูกค้า/วันที่/ความเร่งด่วน/รายละเอียด
- Badge แดงแสดงจำนวน request ที่รอ`,
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
1. เลือก ลูกค้า + โปรเจค
2. เพิ่ม Line Items → เลือกสินค้าจาก dropdown
3. ระบบ auto-fill: รหัส, ชื่อ, ราคาทุน, ราคาขาย
4. แก้ไข จำนวน / ราคา / ส่วนลด → คำนวณ Total, Margin%, GP% อัตโนมัติ
5. เลือกระดับราคา: ทั่วไป / สมาชิก / พิเศษ
6. ตั้งค่า VAT: ไม่มี / ราคา+VAT / รวม VAT แล้ว

### Revision (แก้ไขเวอร์ชัน)
- กดปุ่ม **"Revise"** → เก็บเวอร์ชันเดิมไว้ + สร้างเวอร์ชันใหม่
- กดปุ่ม **"📋 History"** → ดูทุก revision เปรียบเทียบมูลค่า/GP
- แต่ละ revision เก็บ: items ทั้งหมด + ราคา + เหตุผลที่แก้ + ผู้แก้

### Sales Workflow (/sales-workflow)
- Timeline: Draft → Sent → Follow-up → Revised → Won/PO → Lost
- Quick actions: 📧 ส่ง / 📞 Follow-up / ✏️ Revise / ✅ ได้ PO / 💔 Lost
- หลังได้ PO → สร้าง 6 ขั้นตอนอัตโนมัติ (สั่งซื้อ → ติดตั้ง → ส่งมอบ)
- Team assignments: Presale/Sales/Procurement/Service`,
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

### Hover Popup
เอาเม้าชี้ที่ลูกค้า → popup: โปรเจค/มูลค่า/ใบเสนอราคา/งานบริการ/PM/งานค้าง

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
- ประเภท: สินค้า / บริการ
- Active/Inactive

### Vendor Prices
- กดแถวสินค้าเพื่อขยาย → เพิ่มราคาจาก Vendor ต่างๆ
- ติดตาม Price History อัตโนมัติ
- แสดง Trend ราคา (ขึ้น/ลง/คงที่)

### Vendors (/vendors)
- จัดการข้อมูลผู้ขาย/Supplier
- ประเภท: Distributor / ผู้รับเหมา(บริษัท) / ผู้รับเหมา(บุคคล) / ทีมภายใน
- ข้อมูล: ชื่อ / เบอร์ / อีเมล / เงื่อนไขชำระ / Tax ID / VAT / WHT`,
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
- เพิ่ม / แก้ไข / ลบ ได้ครบ
- คลิกที่แถว → เปิดรายละเอียด

### Roles
- **admin** — ดูแลระบบ (เห็นทุกอย่าง)
- **sale** — เซลล์ (Activities, Quotations, Job Requests)
- **presale** — พรีเซลล์ (BOQ, Solution Design)
- **service** — ช่างบริการ (ติดตั้ง, ซ่อม, PM)
- **avenger** — Avenger (เหมือน Sales + สนับสนุนสาขา)

### ผู้ใช้ปัจจุบัน
- เลือกที่ **Sidebar ด้านล่าง** (dropdown)
- ระบบจำไว้ใน localStorage`,
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
    title: "Tips & Tricks",
    thai: "เคล็ดลับ + การแก้ปัญหา",
    content: `## เคล็ดลับการใช้งาน

### การนำทาง
- ใช้ Sidebar ด้านซ้าย — Active menu มี **glow สีม่วง**
- ทุก KPI card, ตัวเลข, รายการ **กดได้** → ไปหน้าที่เกี่ยวข้อง

### ฟอร์ม
- ช่องที่มี ***** คือบังคับกรอก
- ทุกช่องมี **label** บอกว่าต้องใส่อะไร
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

  const filtered = searchHelp
    ? sections.filter(s => s.title.toLowerCase().includes(searchHelp.toLowerCase()) || s.thai.includes(searchHelp) || s.content.toLowerCase().includes(searchHelp.toLowerCase()))
    : sections;

  const current = filtered[active] || filtered[0];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gradient" title="คู่มือการใช้งาน">Help / คู่มือการใช้งาน</h1>
          <p className="text-xs text-muted">KMITSURAT Work Portal v1.6 — คู่มือสำหรับผู้ใช้งาน</p>
        </div>
      </div>

      <input placeholder="🔍 ค้นหาในคู่มือ..." value={searchHelp} onChange={e => { setSearchHelp(e.target.value); setActive(0); }} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <div className="rounded-xl bg-card border border-border p-3 sticky top-6">
            <p className="text-xs text-accent/50 uppercase tracking-widest mb-2 px-2">สารบัญ</p>
            {filtered.map((s, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${active === i ? "bg-accent/15 text-accent font-medium shadow-[0_0_12px_rgba(99,102,241,0.1)]" : "text-muted hover:bg-card-hover hover:text-foreground"}`}>
                {s.title}
                <span className="block text-[10px] opacity-60">{s.thai}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl bg-card border border-border p-6 min-h-[500px]">
          {current ? (
            <div className="prose prose-invert prose-sm max-w-none">
              {current.content.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold mt-0 mb-3 text-gradient">{line.replace("## ", "")}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-5 mb-2 text-foreground">{line.replace("### ", "")}</h3>;
                if (line.startsWith("- **")) {
                  const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (match) return <div key={i} className="flex gap-1.5 text-sm my-1.5 ml-3"><span className="text-accent/50">•</span><span><b className="text-foreground">{match[1]}</b><span className="text-muted">{match[2]}</span></span></div>;
                }
                if (line.startsWith("- ")) return <div key={i} className="flex gap-1.5 text-sm my-1 ml-3 text-muted"><span className="text-accent/30">•</span><span>{line.replace("- ", "")}</span></div>;
                if (line.match(/^\d+\. /)) return <div key={i} className="flex gap-1.5 text-sm my-1 ml-3 text-muted"><span className="text-accent font-bold min-w-[16px]">{line.match(/^(\d+)/)?.[1]}.</span><span>{line.replace(/^\d+\. /, "")}</span></div>;
                if (line.trim() === "") return <div key={i} className="h-3" />;
                return <p key={i} className="text-sm text-muted my-1">{line}</p>;
              })}
            </div>
          ) : (
            <p className="text-muted text-sm">ไม่พบหัวข้อที่ค้นหา</p>
          )}
        </div>
      </div>
    </div>
  );
}
