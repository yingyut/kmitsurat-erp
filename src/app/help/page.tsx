"use client";
import { useState } from "react";
import Link from "next/link";

type Section = { title: string; thai: string; content: string };

const sections: Section[] = [
  {
    title: "Getting Started",
    thai: "เริ่มต้นใช้งาน",
    content: `## เริ่มต้นใช้งาน KMITSURAT Work Portal

### เข้าสู่ระบบ
1. เปิดเบราว์เซอร์ไปที่ **http://localhost:3000**
2. ระบบจะเปิดหน้า **Dashboard** โดยอัตโนมัติ
3. ใช้เมนูด้านซ้าย (Sidebar) เพื่อเข้าหน้าต่างๆ

### โครงสร้างเมนู
เมนูแบ่งเป็น 4 กลุ่ม:
- **SALES** — ก่อนปิดดีล: Pipeline, Activities, Quotations, Sales Plan
- **OPERATIONS** — หลังได้ดีล: Presale, Project Execution, Service, Contracts
- **MASTER DATA** — ฐานข้อมูลหลัก: Customers, Vendors, Products
- **ADMIN** — ตั้งค่า: Users/Teams, Reports, Settings

### เคล็ดลับ
- เอาเม้าไปชี้ที่เมนูจะเห็น **คำอธิบายภาษาไทย**
- ทุกหน้ามีปุ่ม **"+"** มุมขวาบนเพื่อเพิ่มข้อมูลใหม่
- ทุกหน้ามีช่อง **ค้นหา** เพื่อกรองข้อมูล`,
  },
  {
    title: "Dashboard",
    thai: "แดชบอร์ดผู้บริหาร",
    content: `## Dashboard — แดชบอร์ดผู้บริหาร

### KPI Cards (ด้านบน)
แสดง 6 ตัวเลขสำคัญ:
- **Total Revenue** — รายได้รวมจากโปรเจคที่ปิดได้ (Won)
- **Target vs Actual** — เปรียบเทียบยอดขายกับเป้า พร้อม progress bar
- **Pipeline Value** — มูลค่าดีลที่กำลังดำเนินการ
- **Overdue Jobs** — จำนวนงานล่าช้า (สีแดงถ้ามี)
- **SLA On-time** — อัตราปิดงานตาม SLA
- **Forecast EOM** — คาดการณ์รายได้สิ้นเดือน

### Department Overview (กลาง)
4 การ์ดแผนก:
- **Sales Performance** — เป้า/ยอดจริง/Pipeline/กิจกรรม
- **Presale Workload** — งานรอ/กำลังทำ/เสร็จ + กราฟประเภทงาน
- **Service Operation** — CM/PM/Install/SLA + กราฟ
- **Project Overview** — Active/Pending/Won/มูลค่า

### Charts
- Funnel: Sales Pipeline (Lead → Won)
- Bar: จำนวนงานแยกแผนก + ต่อคน
- Pie: สัดส่วนสถานะงาน + ประเภท Service

### Team Performance (ล่าง)
ตารางพนักงาน: งานทั้งหมด / เสร็จ / ค้าง / ล่าช้า + Progress bar

### Alerts Panel
แจ้งเตือนสิ่งที่ต้องทำ:
- 🔴 สีแดง = เร่งด่วน (งาน overdue)
- 🟠 สีส้ม = เตือน (ดีลใหญ่ยังไม่ปิด)
- 🟢 สีเขียว = ข้อมูล (ใบเสนอราคารอส่ง)

### Filters
กรองข้อมูลได้: Today / Week / Month / Year`,
  },
  {
    title: "Sales Pipeline",
    thai: "โอกาสขาย / ดีล",
    content: `## Sales Pipeline — โอกาสขาย

### สร้างโปรเจคใหม่
1. กดปุ่ม **"+ โปรเจคใหม่"** มุมขวาบน
2. กรอกข้อมูล: ชื่อ, ลูกค้า, ประเภทงาน, มูลค่า, สถานะ, ผู้รับผิดชอบ
3. **ประเภทงาน** — เลือกจาก dropdown (WiFi, CCTV, Network ฯลฯ)
   - กดปุ่ม **"+"** ข้างขวาเพื่อเพิ่มประเภทใหม่
4. กด **"บันทึก"**

### สถานะ Pipeline
- **Lead** — เป้าหมายใหม่
- **Opportunity** — มีโอกาสขาย
- **Proposal** — ส่งข้อเสนอแล้ว
- **Negotiation** — กำลังเจรจา
- **Won** — ชนะงาน ✓
- **Lost** — แพ้งาน ✗

### เมื่อชนะ/แพ้งาน
ระบบจะแสดงฟอร์มเพิ่มเติม:
- **เหตุผลที่ชนะ/แพ้** — บันทึกเพื่อเรียนรู้
- **คู่แข่งที่ชนะ** (กรณีแพ้)
- **แผน Re-engage** — ติ๊กเลือก "ต้องการติดตามกลับ" + ระบุวันที่เสนอใหม่
  - เช่น "แพ้งาน MA ปีนี้ ปีหน้าจะเสนอใหม่ เตรียมราคาพิเศษ"

### ระบบแจ้งเตือน
- เลือก **วันที่แจ้งเตือน**
- เลือก **ช่องทาง**: อีเมล / ระบบ / ทั้งคู่
- เลือก **ผู้รับ** จาก dropdown (ถ้าเซลล์ไม่อยู่แล้ว แก้อีเมลได้)
- ติ๊กเลือก **หลายคน** จาก checkbox
- ใส่ **CC** ถึงผู้บริหาร/หัวหน้าทีม
- เมื่อถึงกำหนด ระบบจะแสดง **Alert สีน้ำเงิน** ด้านบนหน้า

### คลิกที่โปรเจค
เปิด Detail panel แสดง: ข้อมูลทั้งหมด, เหตุผลชนะ/แพ้, แผน Re-engage, Reminder`,
  },
  {
    title: "Sales Activities",
    thai: "กิจกรรมงานขาย",
    content: `## Sales Activities — กิจกรรมงานขาย

### 3 Tabs:

#### 1. Dashboard
- KPI: เป้า/ยอดจริง/Pipeline/Won Deals
- Follow-ups: วันนี้ / เลยกำหนด / ที่จะถึง
- Activity Summary: จำนวนกิจกรรมวันนี้/สัปดาห์/ทั้งหมด

#### 2. Activities
บันทึกกิจกรรมขาย:
1. กดปุ่ม **"+ New Activity"**
2. เลือกประเภท: Phone Call, Visit, QT Created, QT Sent, Follow-up, Meeting, Update
3. เลือก **ลูกค้า** และ **โปรเจค** จาก dropdown
4. กำหนด **วัน Follow-up ถัดไป**
5. เปลี่ยนสถานะได้จาก dropdown: New → In Progress → Done

#### 3. Requests (Job Request)
ขอความช่วยเหลือจากทีมอื่น:
1. กดปุ่ม **"+ Job Request"**
2. เลือกส่งถึง **Presale** หรือ **Service**
3. ระบุ: หัวข้อ, ลูกค้า, โปรเจค, มูลค่า, วันที่ต้องการ, ความเร่งด่วน
4. กด **"ส่ง Request"**
5. ทีมที่รับจะเห็น Request ที่หน้าของตัวเอง
6. **Badge สีแดง** บน tab แสดงจำนวน request ที่รอ`,
  },
  {
    title: "Quotations",
    thai: "ใบเสนอราคา",
    content: `## Quotations — ใบเสนอราคา

### สร้างใบเสนอราคา
1. กดปุ่ม **"+ New Quotation"**
2. เลือก **ลูกค้า** และ **โปรเจค**
3. เพิ่ม **Line Items**:
   - เลือกสินค้าจาก dropdown (ดึงจากฐานข้อมูล Products)
   - ระบบ auto-fill: รหัส, ชื่อ, หน่วย, ราคาทุน, ราคาขาย
   - แก้ไข จำนวน / ราคา / ส่วนลด ได้
   - คำนวณ **Total, Margin%, GP%** อัตโนมัติ
4. เลือก **ระดับราคา**: ทั่วไป / สมาชิก / พิเศษ
5. ตั้งค่า **VAT**: ไม่มี / ราคา+VAT / รวม VAT แล้ว

### สถานะใบเสนอราคา
- **Draft** — ร่าง
- **Sent** — ส่งแล้ว
- **Approved** — อนุมัติ ✓
- **Rejected** — ปฏิเสธ ✗
- **Expired** — หมดอายุ

### Summary Cards
- Total Cost / Total Selling / Discount / Gross Profit / GP%
- มี **เลขที่อัตโนมัติ** (QT-XXXX)

### Export
ปุ่ม Export CSV / PDF (เตรียมโครงสร้างไว้)`,
  },
  {
    title: "Presale",
    thai: "งานพรีเซลล์",
    content: `## Presale Tasks — งานพรีเซลล์

### Job Requests จาก Sales
- เมื่อ Sales ส่ง Request มา จะแสดง **กล่องสีม่วง** ด้านบน
- เลือก **มอบหมายให้ใคร** จาก dropdown
- กด **"✓ รับงาน"** หรือ **"✗ ปฏิเสธ"** (ต้องกรอกเหตุผล)

### สร้าง Presale Request
1. กดปุ่ม **"+ New Request"**
2. เลือกประเภท: Solution Design, BOQ, Technical Proposal, Site Survey ฯลฯ
3. เลือก ลูกค้า + โปรเจค + ผู้รับผิดชอบ + วัน Due date
4. กรอก **Requirement** (รายละเอียดที่ต้องการ)

### Detail Panel
คลิกที่งาน Presale เปิด 4 tabs:
- **Summary** — ภาพรวม + Solution Summary (เขียน markdown)
- **BOM** — รายการอุปกรณ์ (Brand, Qty, Unit)
- **BOQ** — ราคาต้นทุน/ขาย/Margin (แปลงเป็นใบเสนอราคาได้)
- **Files** — แนบไฟล์ Design/Drawing/Spec

### แปลง BOQ → ใบเสนอราคา
กดปุ่ม **"แปลงเป็นใบเสนอราคา"** ระบบจะสร้าง Quotation ใหม่จาก BOQ อัตโนมัติ`,
  },
  {
    title: "Service",
    thai: "งานบริการ / ติดตั้ง / ซ่อม",
    content: `## Service Tickets — งานบริการ

### Job Requests จาก Sales
- เหมือน Presale — กล่อง **สีชมพู** ด้านบน
- เลือกมอบหมายช่าง → รับงาน/ปฏิเสธ

### สร้าง Service Ticket
1. กดปุ่ม **"+ New Ticket"**
2. เลือกประเภท: Installation, Site Survey, Technical Survey, After-Sales, Repair, PM Service
3. เลือก ลูกค้า + โปรเจค + ช่างเทคนิค + วันนัด
4. ระบุ: ผู้แจ้ง, ช่องทาง (โทร/Line/Email/Walk-in)
5. เลือกโหมดมอบหมาย: ระบุช่าง / ทุกคน / ตามความถนัด / ตามพื้นที่

### สถานะ
- **Open** → **In Progress** → **Resolved** → **Closed**
- เปลี่ยนสถานะได้จาก dropdown ในรายการ

### Revenue / Profit
- กรอก มูลค่างาน / ต้นทุน / ชั่วโมงทำงาน เมื่อปิดงาน
- ระบบคำนวณ Gross Profit อัตโนมัติ

### Dashboard Stats
- CM/PM/Install counts + Overdue + SLA%
- Revenue ต่อช่าง + ต่อประเภทงาน
- Workload per technician`,
  },
  {
    title: "Customers",
    thai: "ฐานข้อมูลลูกค้า",
    content: `## Customers — ฐานข้อมูลลูกค้า

### เพิ่ม/แก้ไข/ลบ
1. กดปุ่ม **"+ เพิ่มลูกค้า"**
2. กรอก: ชื่อบริษัท, ผู้ติดต่อ, เบอร์โทร, อีเมล, จังหวัด, ประเภทหน่วยงาน, ที่อยู่
3. **แก้ไข** — กดปุ่ม "แก้ไข" ในแถว
4. **ลบ** — กดปุ่ม "ลบ" + ยืนยัน

### ประเภทหน่วยงาน
- หน่วยงานราชการ / เอกชน / สถานศึกษา / โรงพยาบาล / โรงแรม / อื่นๆ

### Filters
- ค้นหาชื่อ/ผู้ติดต่อ/จังหวัด
- กรองตาม **จังหวัด** (dropdown พร้อมจำนวน)
- กรองตาม **ประเภทหน่วยงาน**
- เรียงลำดับ: ใหม่สุด/เก่าสุด/ชื่อ/จังหวัด

### Hover Popup
เอาเม้าชี้ที่แถวลูกค้า จะ popup แสดง:
- จำนวนโปรเจค + มูลค่ารวม
- ใบเสนอราคา + มูลค่า
- งานบริการ + PM/MA + งานค้าง

### แผนที่ (ด้านล่าง)
- แผนที่ประเทศไทยแบบ Google Maps — ซูมเข้า/ออกได้
- จุดวงกลมตามจังหวัด ขนาดตามจำนวนลูกค้า
- คลิกจุด → popup รายชื่อลูกค้า + ข้อมูลสรุป
- คลิกอีกที → กรองตารางตามจังหวัด`,
  },
  {
    title: "Products",
    thai: "สินค้า / ราคา",
    content: `## Products — สินค้า / ราคา

### เพิ่มสินค้า
1. กดปุ่ม **"+ Add Product"**
2. กรอก: รหัส, ชื่อ, ยี่ห้อ, หมวดหมู่, หน่วย
3. ราคา: ราคาทุน, ราคาขาย, ราคาสมาชิก, ราคาพิเศษ, ส่วนลดเริ่มต้น
4. เลือกประเภท: สินค้า / บริการ
5. Active/Inactive

### ตาราง
แสดง: รหัส, ชื่อ, ยี่ห้อ, หมวดหมู่, ราคาทุน, ราคาขาย, Margin%
- Filter ตาม: ชื่อ/รหัส/ยี่ห้อ + ประเภท + หมวดหมู่

### Vendor Prices
- กดแถวสินค้าเพื่อขยาย → เพิ่มราคาจาก Vendor ต่างๆ
- ติดตาม Price History อัตโนมัติ
- แสดง Trend ราคา (ขึ้น/ลง/คงที่)

### หมวดหมู่สินค้า
จัดการที่ Settings → Product Categories`,
  },
  {
    title: "Users & Teams",
    thai: "ผู้ใช้ / ทีม",
    content: `## Users / Teams — จัดการผู้ใช้และทีม

### Users tab
- ตาราง: รูป, ชื่อ, ตำแหน่ง, แผนก, Role, อีเมล, เบอร์โทร, สถานะ
- **เพิ่ม** — กดปุ่ม "+ เพิ่มผู้ใช้" กรอก: ชื่อเล่น, ชื่อจริง, นามสกุล, อีเมล, เบอร์โทร, ตำแหน่ง, แผนก, Role, รหัสเซลล์
- **แก้ไข** — กดปุ่ม "แก้ไข"
- **ลบ** — กดปุ่ม "ลบ" + ยืนยัน
- **คลิกที่แถว** → เปิดรายละเอียด (รูป, bio, ข้อมูลติดต่อ)

### Roles (บทบาท)
- **admin** — ผู้ดูแลระบบ (เห็นทุกอย่าง)
- **sale** — เซลล์ (สร้าง Activities, Quotations, Job Requests)
- **presale** — พรีเซลล์ (รับ Job Request, ออกแบบ Solution, BOQ)
- **service** — ช่างบริการ (รับ Job Request, ติดตั้ง, ซ่อม)
- **avenger** — Avenger (เหมือน Sales + สนับสนุนสาขา)

### Teams tab
- การ์ดแสดงทีม + จำนวนสมาชิก
- เพิ่ม/แก้ไข/ลบ ทีมได้`,
  },
  {
    title: "Sales Plan",
    thai: "แผนยอดขาย / Quota",
    content: `## Sales Plan — แผนยอดขาย / Quota

### ตั้งเป้ายอดขาย
1. กดปุ่ม **"+ Set Quota"**
2. กรอก: ชื่อเซลล์, Role, เดือน, เป้ายอดขาย, เป้ากำไร, ยอดจริง, กำไรจริง

### KPI Cards
- เป้ายอดขาย / ยอดจริง / เหลือเท่าไหร่ / % Achievement
- เป้ากำไร / กำไรจริง / GP%
- Won Deals + Top Performers

### Ranking
- จัดอันดับตาม Revenue หรือ Profit
- สี: 🟢 เกินเป้า / 🟡 ใกล้เป้า / 🔴 ห่างไกล

### ตาราง
แต่ละเซลล์: เป้า / ยอดจริง / เหลือ / Progress bar

### Seed Data
กดปุ่ม **"Load Sample"** เพื่อโหลดข้อมูลตัวอย่าง 5 คน`,
  },
  {
    title: "Contracts",
    thai: "สัญญา / รับประกัน / MA",
    content: `## Contracts — สัญญา / รับประกัน / MA

### ประเภทสัญญา
- **รับประกันสินค้า** — ระบุวันเริ่ม/สิ้นสุด
- **รับประกันงานติดตั้ง** — ระบุวันเริ่ม/สิ้นสุด
- **สัญญา MA** — สัญญาบำรุงรักษาประจำปี + มูลค่า

### การแจ้งเตือน
- ระบบแสดง Alert เมื่อสัญญาใกล้หมดอายุ (30 วัน)
- แสดงใน Dashboard เป็น Expiry Buckets: ≤30d / 31-60d / 61-90d / >90d

### เชื่อมโยง
- ลิงก์กับ **ลูกค้า** + **โปรเจค**
- ดูสัญญาทั้งหมดของโปรเจคได้จากหน้า Projects`,
  },
  {
    title: "Settings",
    thai: "ตั้งค่าระบบ",
    content: `## Settings — ตั้งค่าระบบ

### Project Types
- จัดการประเภทงาน (WiFi, CCTV, Network ฯลฯ)
- ใช้ใน dropdown ตอนสร้างโปรเจค
- เพิ่ม/แก้ไข/ลบ ได้

### Product Categories
- จัดการหมวดหมู่สินค้า + ไอคอน emoji
- ใช้ใน dropdown ตอนสร้างสินค้า

### Document Numbering
- ตั้งค่ารูปแบบเลขที่เอกสาร (ใบเสนอราคา, สัญญา ฯลฯ)
- ระบุ prefix, template, reset cycle (รายเดือน/รายปี)

### Integrations
- ตั้งค่าเชื่อมต่อ SharePoint / OneDrive / Google Drive
- สำหรับเก็บไฟล์โปรเจค

### Vendors
- จัดการข้อมูลผู้ขาย/Supplier
- ใช้ใน Products เพื่อเปรียบเทียบราคา`,
  },
  {
    title: "Keyboard Shortcuts",
    thai: "เคล็ดลับการใช้งาน",
    content: `## เคล็ดลับการใช้งาน

### การนำทาง
- ใช้ **Sidebar** ด้านซ้ายเพื่อเข้าหน้าต่างๆ
- เมนูที่ Active จะเป็น **สีน้ำเงิน**

### ฟอร์ม
- ช่องที่มี **\*** คือช่องบังคับกรอก
- กด **"บันทึก"** เพื่อบันทึก
- กด **"ยกเลิก"** เพื่อปิดฟอร์ม

### ตาราง
- **คลิกที่แถว** — เปิดรายละเอียด (ถ้ามี)
- **แก้ไข** — กดปุ่ม "แก้ไข" ในแถว
- **ลบ** — กดปุ่ม "ลบ" + ยืนยัน

### Filters
- ใช้ช่อง **ค้นหา** เพื่อหาข้อมูล
- ใช้ **dropdown** เพื่อกรองตามสถานะ/ประเภท/จังหวัด
- กดปุ่ม Filter ซ้ำเพื่อยกเลิก

### รีสตาร์ท Server
ถ้าหน้าเว็บค้างหรือไม่โหลด:
1. เปิด Terminal
2. พิมพ์: \`taskkill /F /IM node.exe\`
3. พิมพ์: \`npm run dev\` หรือ \`npx next build && npx next start --port 3000\`
4. เปิดเบราว์เซอร์ไปที่ http://localhost:3000

### Production vs Development
- **Production** (เร็ว, ไม่ค้าง): \`npx next build && npx next start --port 3000\`
- **Development** (แก้โค้ดได้, อาจช้า): \`npx next dev --webpack --port 3000\``,
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
          <h1 className="text-xl font-bold" title="คู่มือการใช้งาน">Help / คู่มือการใช้งาน</h1>
          <p className="text-xs text-muted">KMITSURAT Work Portal v1.6 — คู่มือสำหรับผู้ใช้งาน</p>
        </div>
      </div>

      <input placeholder="ค้นหาในคู่มือ..." value={searchHelp} onChange={e => { setSearchHelp(e.target.value); setActive(0); }} className="mb-4 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <div className="rounded-xl bg-card border border-border p-3 sticky top-6">
            <p className="text-xs text-muted uppercase mb-2 px-2">สารบัญ</p>
            {filtered.map((s, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${active === i ? "bg-accent text-white font-medium" : "text-muted hover:bg-card-hover hover:text-foreground"}`}>
                {s.title}
                <span className="block text-[10px] opacity-70">{s.thai}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl bg-card border border-border p-6 min-h-[500px]">
          {current ? (
            <div className="prose prose-invert prose-sm max-w-none">
              {current.content.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold mt-0 mb-3 text-foreground">{line.replace("## ", "")}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-foreground">{line.replace("### ", "")}</h3>;
                if (line.startsWith("#### ")) return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-accent">{line.replace("#### ", "")}</h4>;
                if (line.startsWith("- **")) {
                  const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (match) return <div key={i} className="flex gap-1.5 text-sm my-1 ml-3"><span className="text-muted">•</span><span><b className="text-foreground">{match[1]}</b><span className="text-muted">{match[2]}</span></span></div>;
                }
                if (line.startsWith("- ")) return <div key={i} className="flex gap-1.5 text-sm my-0.5 ml-3 text-muted"><span>•</span><span>{line.replace("- ", "")}</span></div>;
                if (line.match(/^\d+\. /)) return <div key={i} className="flex gap-1.5 text-sm my-0.5 ml-3 text-muted"><span className="text-accent font-bold">{line.match(/^(\d+)/)?.[1]}.</span><span>{line.replace(/^\d+\. /, "")}</span></div>;
                if (line.trim() === "") return <div key={i} className="h-2" />;
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
