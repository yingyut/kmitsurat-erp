"use client";
import { useState } from "react";
import Link from "next/link";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CUSTOMERS = [
  { company_name: "บริษัท เทคโนวิชั่น จำกัด", contact_name: "คุณสมชาย ใจดี", phone: "077-201-1234", email: "somchai@technovision.co.th", address: "45/3 ถ.ตลาดใหม่ เมือง", province: "สุราษฎร์ธานี", org_type: "private", notes: "ลูกค้าประจำ ซื้อ Network / Server" },
  { company_name: "โรงพยาบาลสุราษฎร์ธานี", contact_name: "คุณวิไล ศรีรัตน์", phone: "077-222-3456", email: "it@surathos.go.th", address: "1 ถ.ตลาดใหม่ เมือง", province: "สุราษฎร์ธานี", org_type: "hospital", notes: "โครงการ CCTV + Network" },
  { company_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", contact_name: "อ.ประเสริฐ ดวงดี", phone: "077-913-333", email: "it@sru.ac.th", address: "272 ถ.สุราษฎร์-นาสาร", province: "สุราษฎร์ธานี", org_type: "education", notes: "โครงการ WiFi มหาวิทยาลัย" },
  { company_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", contact_name: "คุณพิมพ์ เลิศสกุล", phone: "077-281-555", email: "it@central-surat.com", address: "9/99 ถ.ชนเกษม เมือง", province: "สุราษฎร์ธานี", org_type: "private", notes: "CCTV + Access Control ห้าง" },
  { company_name: "เทศบาลเมืองสุราษฎร์ธานี", contact_name: "คุณณรงค์ พรมแดง", phone: "077-272-000", email: "it@suratcity.go.th", address: "1 ถ.ภักดีอนุสรณ์ เมือง", province: "สุราษฎร์ธานี", org_type: "government", notes: "โครงการ Smart City" },
  { company_name: "โรงแรม Centara Villas Samui", contact_name: "Mr. James Wilson", phone: "077-915-888", email: "it@centara-samui.com", address: "38/2 ม.5 บ้านใต้ เกาะสมุย", province: "สุราษฎร์ธานี", org_type: "hotel", notes: "WiFi + IPTV โรงแรม" },
  { company_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", contact_name: "คุณอนุชา บุญมาก", phone: "077-501-999", email: "it@cppalm.com", address: "55 ม.3 ท่าแซะ", province: "ชุมพร", org_type: "private", notes: "ระบบ Network โรงงาน" },
  { company_name: "โรงเรียนสุราษฎร์ธานี", contact_name: "คุณสุภา ทวีสุข", phone: "077-272-111", email: "it@surat.ac.th", address: "126 ถ.ดอนนก เมือง", province: "สุราษฎร์ธานี", org_type: "education", notes: "WiFi อาคารเรียน" },
];

const SEED_USERS = [
  // ─── System Account ───────────────────────────────────────────────────────────
  { name: "System Admin", nickname: "Admin", email: "admin@kmitsurat.com", login_username: "administrator", password: "P@ssw0rd!@", role: "admin", active: true, phone: "", position: "System Administrator", display_preference: "nickname" },
  // ─── Management ───────────────────────────────────────────────────────────────
  { name: "พี่จอร์ด",  nickname: "พี่จอร์ด",  email: "jord@kmitsurat.com",       role: "admin",       active: true, phone: "087-100-0001", position: "CEO / เจ้าของ",       display_preference: "nickname" },
  { name: "พี่แนน",    nickname: "พี่แนน",    email: "nan@kmitsurat.com",        role: "admin",       active: true, phone: "087-100-0002", position: "ผู้จัดการสาขา",       display_preference: "nickname" },
  // ─── Sales ─────────────────────────────────────────────────────────────────────
  { name: "ออย",      nickname: "ออย",      email: "oy@kmitsurat.com",         role: "sale",        active: true, phone: "087-100-0003", position: "Sales", sales_code: "OY",  display_preference: "nickname" },
  { name: "แนนน้อย",  nickname: "แนนน้อย",  email: "nannoi@kmitsurat.com",     role: "sale",        active: true, phone: "087-100-0004", position: "Sales", sales_code: "NN",  display_preference: "nickname" },
  { name: "อี๊ฟ",     nickname: "อี๊ฟ",     email: "eve@kmitsurat.com",        role: "sale",        active: true, phone: "087-100-0005", position: "Sales", sales_code: "EVE", display_preference: "nickname" },
  { name: "บีบี",     nickname: "บีบี",     email: "bb@kmitsurat.com",         role: "sale",        active: true, phone: "087-100-0006", position: "Sales", sales_code: "BB",  display_preference: "nickname" },
  { name: "จะจ๋า",    nickname: "จะจ๋า",    email: "jaja@kmitsurat.com",       role: "sale",        active: true, phone: "087-100-0007", position: "Sales", sales_code: "JJ",  display_preference: "nickname" },
  // ─── Presale ───────────────────────────────────────────────────────────────────
  { name: "พี่กรด",   nickname: "พี่กรด",   email: "krod@kmitsurat.com",       role: "admin",       active: true, phone: "087-100-0008", position: "Pre-sale Lead",        display_preference: "nickname" },
  { name: "พี่กอร์ฟ", nickname: "พี่กอร์ฟ", email: "golf@kmitsurat.com",       role: "presale",     active: true, phone: "087-100-0009", position: "Presales Engineer",    display_preference: "nickname" },
  { name: "น้องมีน",  nickname: "น้องมีน",  email: "meen@kmitsurat.com",       role: "presale",     active: true, phone: "087-100-0010", position: "Presales Engineer",    display_preference: "nickname" },
  // ─── Service ───────────────────────────────────────────────────────────────────
  { name: "ปอน",      nickname: "ปอน",      email: "pon@kmitsurat.com",        role: "service",     active: true, phone: "087-100-0011", position: "Service Technician",   display_preference: "nickname" },
  { name: "ไผ่",      nickname: "ไผ่",      email: "pai@kmitsurat.com",        role: "service",     active: true, phone: "087-100-0012", position: "Service Technician",   display_preference: "nickname" },
  { name: "โก้ด",     nickname: "โก้ด",     email: "kode@kmitsurat.com",       role: "service",     active: true, phone: "087-100-0013", position: "Service Technician",   display_preference: "nickname" },
  // ─── Coordinator ────────────────────────────────────────────────────────────────
  { name: "น้องก้อย", first_name: "พัชรี", last_name: "รักสกุล", nickname: "น้องก้อย", email: "patcharee@kmitsurat.com", role: "Coordinator", active: true, phone: "087-100-0014", position: "ธุรการ", display_preference: "nickname" },
];

const SEED_PROJECT_TYPES = [
  { name: "WiFi", description: "ระบบ WiFi / Wireless LAN" },
  { name: "CCTV", description: "ระบบกล้องวงจรปิด" },
  { name: "Network", description: "ระบบ LAN / WAN / Fiber" },
  { name: "Server Room", description: "ห้อง Server และระบบ Data Center" },
  { name: "Solar Cell", description: "ระบบโซลาร์เซลล์" },
  { name: "Access Control", description: "ระบบควบคุมการเข้า-ออก" },
  { name: "Smart City", description: "โครงการ Smart City / IoT" },
];

const SEED_PRODUCT_CATEGORIES = [
  { name: "กล้อง CCTV", description: "กล้องวงจรปิด IP Camera, Analog Camera", icon: "📷" },
  { name: "Network", description: "Switch, Router, Firewall, Access Point", icon: "🌐" },
  { name: "Server & Storage", description: "Server, NAS, UPS, Rack", icon: "🖥️" },
  { name: "Solar & Electrical", description: "แผงโซลาร์, Inverter, สายไฟ", icon: "⚡" },
  { name: "งานติดตั้ง & บริการ", description: "ค่าแรง, ค่าวาง Cable, Training", icon: "🔧" },
];

const SEED_PRODUCTS = [
  { code: "AP-UNIFI-U6-LITE", name: "UniFi U6 Lite Access Point", brand: "Ubiquiti", category: "Network", unit: "ตัว", cost_price: 3200, selling_price: 4500, active: true },
  { code: "SW-CISCO-C9300-24P", name: "Cisco Catalyst 9300-24P Switch", brand: "Cisco", category: "Network", unit: "ตัว", cost_price: 85000, selling_price: 110000, active: true },
  { code: "FW-FORTINET-60F", name: "FortiGate 60F Firewall", brand: "Fortinet", category: "Network", unit: "ตัว", cost_price: 18000, selling_price: 26000, active: true },
  { code: "CAM-HIKVISION-2MP", name: "Hikvision 2MP IP Dome Camera", brand: "Hikvision", category: "กล้อง CCTV", unit: "ตัว", cost_price: 1800, selling_price: 2800, active: true },
  { code: "CAM-HIKVISION-4MP", name: "Hikvision 4MP IP Bullet Camera", brand: "Hikvision", category: "กล้อง CCTV", unit: "ตัว", cost_price: 2500, selling_price: 3800, active: true },
  { code: "NVR-HIKVISION-16CH", name: "Hikvision 16CH NVR 4K", brand: "Hikvision", category: "กล้อง CCTV", unit: "ตัว", cost_price: 12000, selling_price: 18000, active: true },
  { code: "SRV-DELL-R550", name: "Dell PowerEdge R550 Server", brand: "Dell", category: "Server & Storage", unit: "ตัว", cost_price: 95000, selling_price: 130000, active: true },
  { code: "NAS-SYNOLOGY-RS1221", name: "Synology RackStation RS1221+", brand: "Synology", category: "Server & Storage", unit: "ตัว", cost_price: 32000, selling_price: 45000, active: true },
  { code: "UPS-APC-3KVA", name: "APC Smart-UPS 3000VA", brand: "APC", category: "Server & Storage", unit: "ตัว", cost_price: 18000, selling_price: 25000, active: true },
  { code: "SOLAR-PANEL-400W", name: "แผงโซลาร์ Monocrystalline 400W", brand: "Jinko Solar", category: "Solar & Electrical", unit: "แผง", cost_price: 4200, selling_price: 5800, active: true },
  { code: "SOLAR-INV-5KW", name: "Inverter Grid-Tie 5kW", brand: "SMA", category: "Solar & Electrical", unit: "ตัว", cost_price: 22000, selling_price: 32000, active: true },
  { code: "SVC-INSTALL", name: "ค่าแรงติดตั้ง (รายวัน)", brand: "", category: "งานติดตั้ง & บริการ", unit: "วัน", cost_price: 1500, selling_price: 2500, active: true, type: "service" },
  { code: "SVC-CABLE", name: "ค่าวาง Structured Cabling", brand: "", category: "งานติดตั้ง & บริการ", unit: "เมตร", cost_price: 35, selling_price: 65, active: true, type: "service" },
  { code: "SVC-TRAINING", name: "ค่า Training (ต่อวัน)", brand: "", category: "งานติดตั้ง & บริการ", unit: "วัน", cost_price: 3000, selling_price: 6000, active: true, type: "service" },
  { code: "SW-ZYXEL-GS1350-26HP", name: "Zyxel GS1350-26HP PoE Switch", brand: "Zyxel", category: "Network", unit: "ตัว", cost_price: 12000, selling_price: 17500, active: true },
];

// Projects — assigned across salespeople, mix of statuses
const makeProjects = (customerIds: Record<string, string>) => [
  { name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", customer_id: customerIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", type: "WiFi", value: 2850000, status: "negotiation", assigned_to: "ออย", probability: 70, expected_close_date: "2026-06-30", notes: "ต้องการ 120 จุด AP ทั่วมหาวิทยาลัย", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "CCTV โรงพยาบาลสุราษฎร์ธานี", customer_id: customerIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", type: "CCTV", value: 1580000, status: "proposal", assigned_to: "แนนน้อย", probability: 55, expected_close_date: "2026-07-15", notes: "กล้อง 80 ตัว ครอบคลุมทุกอาคาร", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "Network ห้าง Central สุราษฎร์ธานี", customer_id: customerIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", type: "Network", value: 3200000, status: "won", assigned_to: "ออย", probability: 100, expected_close_date: "2026-03-31", notes: "ปิดงานแล้ว ลูกค้าพอใจมาก", win_loss_reason: "ราคาดี บริการหลังการขายดี", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "Server Room บริษัท เทคโนวิชั่น", customer_id: customerIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", type: "Server Room", value: 4500000, status: "won", assigned_to: "อี๊ฟ", probability: 100, expected_close_date: "2026-02-28", notes: "ติดตั้ง Dell Server 3 ตัว NAS Synology", win_loss_reason: "มีประสบการณ์งาน Server", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "WiFi โรงแรม Centara Samui", customer_id: customerIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", type: "WiFi", value: 2100000, status: "opportunity", assigned_to: "บีบี", probability: 40, expected_close_date: "2026-08-31", notes: "แทนที่ WiFi เดิมที่เก่าแล้ว 150+ ห้อง", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "Access Control เทศบาลเมืองสุราษฎร์ธานี", customer_id: customerIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", type: "Access Control", value: 980000, status: "lead", assigned_to: "บีบี", probability: 25, expected_close_date: "2026-09-30", notes: "ระบบบัตร RFID อาคารสำนักงาน 3 อาคาร", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "Solar Cell โรงงาน ชุมพรน้ำมันปาล์ม", customer_id: customerIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", type: "Solar Cell", value: 8500000, status: "proposal", assigned_to: "จะจ๋า", probability: 60, expected_close_date: "2026-07-31", notes: "ติดตั้ง Solar 200kW บนหลังคาโรงงาน", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "Smart City เทศบาลสุราษฎร์ธานี Phase 2", customer_id: customerIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", type: "Smart City", value: 12000000, status: "negotiation", assigned_to: "จะจ๋า", probability: 65, expected_close_date: "2026-06-15", notes: "ขยายกล้อง CCTV + Sensor IoT เพิ่ม 200 จุด", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "Network โรงเรียนสุราษฎร์ธานี", customer_id: customerIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", type: "Network", value: 650000, status: "won", assigned_to: "แนนน้อย", probability: 100, expected_close_date: "2026-01-31", notes: "Fiber backbone + Switch ทุกอาคาร", win_loss_reason: "ราคาเหมาะสม", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "CCTV ห้าง Central เพิ่มเติม", customer_id: customerIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", type: "CCTV", value: 450000, status: "lost", assigned_to: "อี๊ฟ", probability: 0, expected_close_date: "2026-04-30", notes: "แพ้คู่แข่งเรื่องราคา", win_loss_reason: "ราคาสูงกว่าคู่แข่ง 15%", lost_competitor: "บริษัท CCTV Pro", re_engage: true, re_engage_date: "2026-10-01", re_engage_note: "รอสัญญาคู่แข่งหมด", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "WiFi มหาวิทยาลัยราชภัฏ Phase 2 (เพิ่มเติม)", customer_id: customerIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", type: "WiFi", value: 1200000, status: "lead", assigned_to: "ออย", probability: 30, expected_close_date: "2026-09-30", notes: "ขยาย AP เพิ่มอีก 50 จุด", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
  { name: "UPS Server Room โรงพยาบาลสุราษฎร์ธานี", customer_id: customerIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", type: "Server Room", value: 780000, status: "opportunity", assigned_to: "อี๊ฟ", probability: 50, expected_close_date: "2026-08-15", notes: "UPS + PDU เพิ่มใน Server Room", win_loss_reason: "", lost_competitor: "", re_engage: false, re_engage_date: "", re_engage_note: "", reminder_date: "", reminder_type: "none", reminder_sent: false, reminder_to_name: "", reminder_to_email: "", reminder_cc_email: "", reminder_note: "" },
];

// Sales Quotas — 5 salespeople × 5 months (Jan–May 2026)
const SEED_QUOTAS = [
  // ออย
  { user_name: "ออย", role: "sale", month: "2026-01", quota_target: 2000000, actual_sales: 2400000, profit_target: 320000, actual_profit: 384000, remaining: 0, percent: 120, profit_percent: 120, won_deals: 1, total_activities: 18 },
  { user_name: "ออย", role: "sale", month: "2026-02", quota_target: 2000000, actual_sales: 1650000, profit_target: 320000, actual_profit: 264000, remaining: 350000, percent: 83, profit_percent: 83, won_deals: 0, total_activities: 22 },
  { user_name: "ออย", role: "sale", month: "2026-03", quota_target: 2000000, actual_sales: 2850000, profit_target: 320000, actual_profit: 456000, remaining: 0, percent: 143, profit_percent: 143, won_deals: 2, total_activities: 20 },
  { user_name: "ออย", role: "sale", month: "2026-04", quota_target: 2000000, actual_sales: 1100000, profit_target: 320000, actual_profit: 176000, remaining: 900000, percent: 55, profit_percent: 55, won_deals: 0, total_activities: 16 },
  { user_name: "ออย", role: "sale", month: "2026-05", quota_target: 2000000, actual_sales: 820000, profit_target: 320000, actual_profit: 131000, remaining: 1180000, percent: 41, profit_percent: 41, won_deals: 0, total_activities: 10 },
  // แนนน้อย
  { user_name: "แนนน้อย", role: "sale", month: "2026-01", quota_target: 2000000, actual_sales: 1800000, profit_target: 320000, actual_profit: 288000, remaining: 200000, percent: 90, profit_percent: 90, won_deals: 1, total_activities: 15 },
  { user_name: "แนนน้อย", role: "sale", month: "2026-02", quota_target: 2000000, actual_sales: 2350000, profit_target: 320000, actual_profit: 376000, remaining: 0, percent: 118, profit_percent: 118, won_deals: 1, total_activities: 17 },
  { user_name: "แนนน้อย", role: "sale", month: "2026-03", quota_target: 2000000, actual_sales: 950000, profit_target: 320000, actual_profit: 152000, remaining: 1050000, percent: 48, profit_percent: 48, won_deals: 0, total_activities: 12 },
  { user_name: "แนนน้อย", role: "sale", month: "2026-04", quota_target: 2000000, actual_sales: 2600000, profit_target: 320000, actual_profit: 416000, remaining: 0, percent: 130, profit_percent: 130, won_deals: 2, total_activities: 19 },
  { user_name: "แนนน้อย", role: "sale", month: "2026-05", quota_target: 2000000, actual_sales: 640000, profit_target: 320000, actual_profit: 102000, remaining: 1360000, percent: 32, profit_percent: 32, won_deals: 0, total_activities: 9 },
  // อี๊ฟ
  { user_name: "อี๊ฟ", role: "sale", month: "2026-01", quota_target: 2000000, actual_sales: 1420000, profit_target: 320000, actual_profit: 227000, remaining: 580000, percent: 71, profit_percent: 71, won_deals: 0, total_activities: 14 },
  { user_name: "อี๊ฟ", role: "sale", month: "2026-02", quota_target: 2000000, actual_sales: 2800000, profit_target: 320000, actual_profit: 448000, remaining: 0, percent: 140, profit_percent: 140, won_deals: 2, total_activities: 20 },
  { user_name: "อี๊ฟ", role: "sale", month: "2026-03", quota_target: 2000000, actual_sales: 1750000, profit_target: 320000, actual_profit: 280000, remaining: 250000, percent: 88, profit_percent: 88, won_deals: 1, total_activities: 18 },
  { user_name: "อี๊ฟ", role: "sale", month: "2026-04", quota_target: 2000000, actual_sales: 1350000, profit_target: 320000, actual_profit: 216000, remaining: 650000, percent: 68, profit_percent: 68, won_deals: 0, total_activities: 13 },
  { user_name: "อี๊ฟ", role: "sale", month: "2026-05", quota_target: 2000000, actual_sales: 580000, profit_target: 320000, actual_profit: 93000, remaining: 1420000, percent: 29, profit_percent: 29, won_deals: 0, total_activities: 8 },
  // บีบี
  { user_name: "บีบี", role: "sale", month: "2026-01", quota_target: 2000000, actual_sales: 720000, profit_target: 320000, actual_profit: 115000, remaining: 1280000, percent: 36, profit_percent: 36, won_deals: 0, total_activities: 11 },
  { user_name: "บีบี", role: "sale", month: "2026-02", quota_target: 2000000, actual_sales: 1540000, profit_target: 320000, actual_profit: 246000, remaining: 460000, percent: 77, profit_percent: 77, won_deals: 1, total_activities: 16 },
  { user_name: "บีบี", role: "sale", month: "2026-03", quota_target: 2000000, actual_sales: 1950000, profit_target: 320000, actual_profit: 312000, remaining: 50000, percent: 98, profit_percent: 98, won_deals: 1, total_activities: 15 },
  { user_name: "บีบี", role: "sale", month: "2026-04", quota_target: 2000000, actual_sales: 2200000, profit_target: 320000, actual_profit: 352000, remaining: 0, percent: 110, profit_percent: 110, won_deals: 1, total_activities: 14 },
  { user_name: "บีบี", role: "sale", month: "2026-05", quota_target: 2000000, actual_sales: 450000, profit_target: 320000, actual_profit: 72000, remaining: 1550000, percent: 23, profit_percent: 23, won_deals: 0, total_activities: 7 },
  // จะจ๋า
  { user_name: "จะจ๋า", role: "sale", month: "2026-01", quota_target: 1500000, actual_sales: 1200000, profit_target: 240000, actual_profit: 192000, remaining: 300000, percent: 80, profit_percent: 80, won_deals: 1, total_activities: 12 },
  { user_name: "จะจ๋า", role: "sale", month: "2026-02", quota_target: 1500000, actual_sales: 1850000, profit_target: 240000, actual_profit: 296000, remaining: 0, percent: 123, profit_percent: 123, won_deals: 1, total_activities: 15 },
  { user_name: "จะจ๋า", role: "sale", month: "2026-03", quota_target: 1500000, actual_sales: 750000, profit_target: 240000, actual_profit: 120000, remaining: 750000, percent: 50, profit_percent: 50, won_deals: 0, total_activities: 10 },
  { user_name: "จะจ๋า", role: "sale", month: "2026-04", quota_target: 1500000, actual_sales: 1420000, profit_target: 240000, actual_profit: 227000, remaining: 80000, percent: 95, profit_percent: 95, won_deals: 1, total_activities: 13 },
  { user_name: "จะจ๋า", role: "sale", month: "2026-05", quota_target: 1500000, actual_sales: 380000, profit_target: 240000, actual_profit: 61000, remaining: 1120000, percent: 25, profit_percent: 25, won_deals: 0, total_activities: 6 },
];

// Sales Activities — mix of done and overdue
const makeSalesActivities = (custIds: Record<string, string>) => [
  { type: "meeting", customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", assigned_to: "ออย", description: "นำเสนอ Solution WiFi 120 จุด AP ครอบคลุมทุกอาคาร", status: "done", next_follow_up: "2026-05-10", result: "interested" },
  { type: "phone_call", customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "CCTV โรงพยาบาล", assigned_to: "แนนน้อย", description: "ติดตาม TOR CCTV โรงพยาบาล ขอเอกสาร spec เพิ่มเติม", status: "in_progress", next_follow_up: "2026-05-08", result: "pending" },
  { type: "visit", customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", assigned_to: "ออย", description: "เข้าพบ อ.ประเสริฐ สำรวจพื้นที่ติดตั้ง AP อาคารใหม่", status: "new", next_follow_up: "2026-05-12", result: "pending" },
  { type: "follow_up", customer_id: custIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", project_id: "", project_name: "Network ห้าง Central", assigned_to: "ออย", description: "ส่งใบเสนอราคา Network Upgrade เพิ่มเติม รอลูกค้าอนุมัติ", status: "in_progress", next_follow_up: "2026-05-05", result: "pending" },
  { type: "phone_call", customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", project_id: "", project_name: "Server Room", assigned_to: "อี๊ฟ", description: "ติดตามผล Server Room ที่ติดตั้งเสร็จแล้ว — ถาม feedback", status: "done", next_follow_up: "2026-05-15", result: "success" },
  { type: "meeting", customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", project_id: "", project_name: "WiFi โรงแรม Centara", assigned_to: "บีบี", description: "นำเสนอโซลูชัน WiFi 6 โรงแรม ลูกค้าขอดูตัวอย่างงาน", status: "in_progress", next_follow_up: "2026-05-07", result: "interested" },
  { type: "visit", customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "UPS Server Room โรงพยาบาล", assigned_to: "อี๊ฟ", description: "สำรวจ Server Room โรงพยาบาล วัดขนาด Rack วางแผน UPS", status: "new", next_follow_up: "2026-05-13", result: "pending" },
  { type: "follow_up", customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", project_id: "", project_name: "Access Control เทศบาล", assigned_to: "บีบี", description: "ส่งเอกสาร TOR Access Control รอการพิจารณา — เกินกำหนดแล้ว", status: "in_progress", next_follow_up: "2026-05-01", result: "pending" },
  { type: "phone_call", customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", project_id: "", project_name: "Solar Cell โรงงาน", assigned_to: "จะจ๋า", description: "ติดตามโครงการ Solar 200kW ลูกค้ากำลัง approve งบ", status: "in_progress", next_follow_up: "2026-05-03", result: "pending" },
  { type: "meeting", customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", project_id: "", project_name: "Smart City Phase 2", assigned_to: "จะจ๋า", description: "ประชุมทีม Smart City ร่วมกับ กฟน. นำเสนอ Design ระบบ IoT", status: "done", next_follow_up: "2026-05-19", result: "success" },
  { type: "visit", customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", project_id: "", project_name: "Solar Cell โรงงาน", assigned_to: "จะจ๋า", description: "สำรวจพื้นที่หลังคาโรงงาน วัดพื้นที่ติดตั้ง Solar แผง 500 ตร.ม.", status: "done", next_follow_up: "2026-05-09", result: "success" },
  { type: "phone_call", customer_id: custIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", project_id: "", project_name: "Network โรงเรียน", assigned_to: "แนนน้อย", description: "ติดตาม after sales โรงเรียน ถามปัญหาหลังติดตั้ง", status: "in_progress", next_follow_up: "2026-05-06", result: "pending" },
];

// Presale Requests
const makePresale = (custIds: Record<string, string>) => [
  { activity_id: "", customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", type: "boq", requirement: "จัดทำ BOQ WiFi 120 AP ครอบคลุม 8 อาคาร พร้อมค่าแรงติดตั้ง", assigned_to: "พี่กอร์ฟ", due_date: "2026-05-25", status: "in_progress" },
  { activity_id: "", customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "CCTV โรงพยาบาล", type: "solution_design", requirement: "ออกแบบระบบ CCTV 80 ตัว ครอบคลุมทุกอาคาร รองรับ 24/7 Recording 30 วัน", assigned_to: "น้องมีน", due_date: "2026-05-28", status: "pending" },
  { activity_id: "", customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", project_id: "", project_name: "Smart City Phase 2", type: "technical_proposal", requirement: "จัดทำข้อเสนอทางเทคนิค Smart City ระบบ CCTV + IoT + Dashboard", assigned_to: "พี่กอร์ฟ", due_date: "2026-05-15", status: "in_progress" },
  { activity_id: "", customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", project_id: "", project_name: "Solar Cell โรงงาน", type: "site_survey", requirement: "สำรวจพื้นที่หลังคาโรงงาน วัดและทำแบบร่าง Solar 200kW", assigned_to: "น้องมีน", due_date: "2026-05-08", status: "completed" },
  { activity_id: "", customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", project_id: "", project_name: "WiFi โรงแรม Centara", type: "boq", requirement: "BOQ WiFi 6 ครอบคลุม 150+ ห้องพัก Pool area Lobby", assigned_to: "พี่กอร์ฟ", due_date: "2026-06-05", status: "pending" },
  { activity_id: "", customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "UPS Server Room โรงพยาบาล", type: "boq", requirement: "BOQ UPS 3 ตัว + PDU + จัดเรียง Rack ใหม่", assigned_to: "น้องมีน", due_date: "2026-04-30", status: "completed" },
  { activity_id: "", customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 2", type: "solution_design", requirement: "ออกแบบขยาย WiFi เพิ่ม 50 AP อาคารคณะใหม่", assigned_to: "พี่กอร์ฟ", due_date: "2026-06-30", status: "pending" },
  { activity_id: "", customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", project_id: "", project_name: "Access Control เทศบาล", type: "technical_proposal", requirement: "ข้อเสนอ Access Control บัตร RFID + Face Recognition 3 อาคาร", assigned_to: "น้องมีน", due_date: "2026-05-05", status: "in_progress" },
  // เพิ่มเติม 5 งาน — สถานะสลับกัน
  { activity_id: "", customer_id: custIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", project_id: "", project_name: "Network โรงเรียน", type: "boq", requirement: "จัดทำ BOQ ขยาย Fiber Backbone อาคาร 5 และ 6 พร้อม Switch 48 Port", assigned_to: "พี่กอร์ฟ", due_date: "2026-04-20", status: "completed" },
  { activity_id: "", customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", project_id: "", project_name: "Server Room Expansion", type: "solution_design", requirement: "ออกแบบขยาย Server Room เพิ่ม Rack 2 ตู้ + UPS + PDU และ Cooling", assigned_to: "น้องมีน", due_date: "2026-06-10", status: "in_progress" },
  { activity_id: "", customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", project_id: "", project_name: "IPTV โรงแรม", type: "technical_proposal", requirement: "ข้อเสนอระบบ IPTV + WiFi ห้องพัก 200 ห้อง รองรับ 4K Streaming", assigned_to: "พี่กอร์ฟ", due_date: "2026-05-30", status: "pending" },
  { activity_id: "", customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", project_id: "", project_name: "CCTV โรงงานชุมพร", type: "boq", requirement: "BOQ กล้อง CCTV 40 ตัวรอบโรงงาน + NVR 32CH + Storage 60 วัน", assigned_to: "น้องมีน", due_date: "2026-03-31", status: "completed" },
  { activity_id: "", customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", type: "site_survey", requirement: "สำรวจพื้นที่เพิ่มเติม คณะวิทยาศาสตร์ + หอพักนักศึกษา วัดค่า Signal และ Coverage", assigned_to: "พี่กอร์ฟ", due_date: "2026-06-20", status: "pending" },
];

// Service Tickets — mix of open, in_progress, resolved
const makeServiceTickets = (custIds: Record<string, string>) => [
  { customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", project_id: "", project_name: "Server Room", type: "repair", issue: "Server ตัวที่ 2 ขึ้น Alert อุณหภูมิสูง Fan เสียง ผิดปกติ", technician: "ปอน", service_date: "2026-05-18", status: "in_progress" },
  { customer_id: custIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", project_id: "", project_name: "Network ห้าง Central", type: "after_sales", issue: "Switch ชั้น 3 Port ตาย 4 Port ลูกค้าขอ RMA", technician: "ปอน", service_date: "2026-05-20", status: "open" },
  { customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "CCTV โรงพยาบาล", type: "repair", issue: "กล้อง CCTV อาคาร A ชั้น 4 หลุดจากระบบ 3 ตัว", technician: "ไผ่", service_date: "2026-05-12", status: "resolved" },
  { customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", type: "repair", issue: "AP อาคารวิทยาศาสตร์ ออฟไลน์ 5 ตัว หลังไฟดับ", technician: "ปอน", service_date: "2026-05-14", status: "resolved" },
  { customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", project_id: "", project_name: "", type: "pm_service", issue: "PM ประจำไตรมาส WiFi และ Switch ทั้งอาคาร", technician: "โก้ด", service_date: "2026-05-22", status: "open" },
  { customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", project_id: "", project_name: "Network โรงงาน", type: "repair", issue: "Firewall Fortinet Reboot เองกลางดึก Log แสดง CPU overload", technician: "ไผ่", service_date: "2026-05-03", status: "resolved" },
  { customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", project_id: "", project_name: "Smart City Phase 2", type: "after_sales", issue: "Camera Smart City 10 ตัว ย่านถ.ตลาดใหม่ offline ต้องตรวจสอบสาย Fiber", technician: "โก้ด", service_date: "2026-05-07", status: "closed" },
  { customer_id: custIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", project_id: "", project_name: "Network โรงเรียน", type: "repair", issue: "Switch อาคาร 4 ไฟ Link ไม่ติด หลังน้ำท่วม ต้องเปลี่ยนใหม่", technician: "ปอน", service_date: "2026-04-28", status: "closed" },
  { customer_id: custIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", project_id: "", project_name: "Network ห้าง Central", type: "pm_service", issue: "PM ประจำปี ตรวจเช็คระบบ Network ทุกชั้น วัดสัญญาณ WiFi", technician: "ไผ่", service_date: "2026-04-15", status: "resolved" },
  { customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", project_id: "", project_name: "Server Room", type: "pm_service", issue: "PM Server 3 ตัว + NAS + UPS ประจำไตรมาส", technician: "ปอน", service_date: "2026-04-10", status: "closed" },
  { customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", project_id: "", project_name: "", type: "installation", issue: "ติดตั้ง UPS เพิ่ม 2 ตัวใน Server Room ชั้น 3", technician: "โก้ด", service_date: "2026-05-16", status: "resolved" },
  { customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", type: "after_sales", issue: "ลูกค้าขอขยาย Coverage AP เพิ่ม 5 จุดที่อาคารกีฬา", technician: "ไผ่", service_date: "2026-05-10", status: "in_progress" },
  // เพิ่มเติม 5 tickets — สถานะสลับกัน
  { customer_id: custIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", project_id: "", project_name: "Network โรงเรียน", type: "repair", issue: "AP อาคาร 3 ไม่มีสัญญาณ หลังฝนตกหนัก ต้องตรวจสอบ POE Switch", technician: "โก้ด", service_date: "2026-05-19", status: "resolved" },
  { customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", project_id: "", project_name: "WiFi มหาวิทยาลัยราชภัฏ Phase 1", type: "pm_service", issue: "PM WiFi ประจำไตรมาส Q2/2026 ตรวจเช็ค AP ทั้ง 120 จุด อัปเดต Firmware", technician: "ปอน", service_date: "2026-05-23", status: "open" },
  { customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", project_id: "", project_name: "Server Room", type: "repair", issue: "HDD ใน NAS Synology ขึ้น Warning Sector Error ต้องสำรองข้อมูลและเปลี่ยน Drive", technician: "ไผ่", service_date: "2026-05-08", status: "resolved" },
  { customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", project_id: "", project_name: "Smart City Phase 2", type: "installation", issue: "ติดตั้ง Camera Smart City เพิ่มอีก 15 จุด ย่านถ.ดอนนก และ ถ.ชนเกษม", technician: "โก้ด", service_date: "2026-05-21", status: "in_progress" },
  { customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", project_id: "", project_name: "", type: "repair", issue: "WiFi ห้อง Pool Villa ไม่มีสัญญาณ 8 ห้อง ตรวจพบ Uplink Switch ขาด Power", technician: "ปอน", service_date: "2026-05-06", status: "closed" },
];

// Service Contracts — 3 expiring within 30 days, 1 expired
const makeContracts = (custIds: Record<string, string>) => [
  { customer_id: custIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", title: "MA Network & WiFi ห้าง Central 2026", type: "service_contract", status: "active", start_date: "2025-06-01", end_date: "2026-05-25", contract_value: 180000, service_level: "8x5", visits_per_year: 4, response_time_hours: 4 },
  { customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", title: "MA Server Room เทคโนวิชั่น 2026", type: "service_contract", status: "active", start_date: "2025-06-15", end_date: "2026-06-08", contract_value: 240000, service_level: "8x5", visits_per_year: 4, response_time_hours: 4 },
  { customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", title: "Warranty WiFi System Centara Samui", type: "installation_warranty", status: "active", start_date: "2025-06-20", end_date: "2026-06-19", contract_value: 0, service_level: "8x5", visits_per_year: 2, response_time_hours: 8 },
  { customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", title: "Product Warranty CCTV โรงพยาบาล (3ปี)", type: "product_warranty", status: "active", start_date: "2024-05-01", end_date: "2027-04-30", contract_value: 0, service_level: "On-site", visits_per_year: 0, response_time_hours: 24 },
  { customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", title: "MA WiFi มหาวิทยาลัยราชภัฏ 2025", type: "service_contract", status: "active", start_date: "2025-01-01", end_date: "2026-05-10", contract_value: 120000, service_level: "8x5", visits_per_year: 2, response_time_hours: 8 },
  { customer_id: custIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", title: "Warranty Network โรงเรียนสุราษฎร์ธานี (1ปี)", type: "installation_warranty", status: "active", start_date: "2026-01-31", end_date: "2027-01-30", contract_value: 0, service_level: "Remote", visits_per_year: 0, response_time_hours: 24 },
  { customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", title: "MA Smart City Camera 2025-2026", type: "service_contract", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", contract_value: 360000, service_level: "24x7", visits_per_year: 12, response_time_hours: 2 },
  { customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", title: "MA Firewall & Network โรงงาน (หมดอายุ)", type: "service_contract", status: "active", start_date: "2025-04-01", end_date: "2026-05-14", contract_value: 96000, service_level: "8x5", visits_per_year: 2, response_time_hours: 4 },
];

// Assets — some with expiring/expired warranty
const makeAssets = (custIds: Record<string, string>) => [
  { name: "Dell PowerEdge R550 #1", type: "server", customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", serial_number: "BPRS550001TH", warranty_end: "2026-05-28", pm_next_date: "2026-07-10", status: "active" },
  { name: "Synology RS1221+ NAS", type: "storage", customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", serial_number: "SYN-RS1221-001", warranty_end: "2026-06-05", pm_next_date: "2026-08-01", status: "active" },
  { name: "Cisco Catalyst 9300 ชั้น 1 ห้าง Central", type: "network", customer_id: custIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", serial_number: "CSC930001-C", warranty_end: "2027-06-01", pm_next_date: "2026-12-01", status: "active" },
  { name: "FortiGate 60F Firewall โรงงาน", type: "firewall", customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", serial_number: "FGT60F-202301", warranty_end: "2026-05-13", pm_next_date: "2026-05-15", status: "active" },
  { name: "APC Smart-UPS 3000VA #1 โรงพยาบาล", type: "ups", customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", serial_number: "APC-UPS3K-HPT01", warranty_end: "2027-05-01", pm_next_date: "2026-11-01", status: "active" },
  { name: "UniFi U6 Lite AP มหาวิทยาลัยราชภัฏ (ชุด 1)", type: "access_point", customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", serial_number: "UNF-U6L-SRU-001", warranty_end: "2027-03-15", pm_next_date: "2026-09-01", status: "active" },
  { name: "Dell PowerEdge R550 #2", type: "server", customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", serial_number: "BPRS550002TH", warranty_end: "2026-05-28", pm_next_date: "2026-05-18", status: "maintenance" },
  { name: "Hikvision NVR 16CH โรงพยาบาล", type: "nvr", customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", serial_number: "HKV-NVR16-HPT01", warranty_end: "2027-05-01", pm_next_date: "2026-11-01", status: "active" },
];

// Quotations
const makeQuotations = (custIds: Record<string, string>) => [
  { customer_id: custIds["มหาวิทยาลัยราชภัฏสุราษฎร์ธานี"] || "", customer_name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", title: "ใบเสนอราคา WiFi 120 AP Phase 1", status: "sent", total_amount: 2850000, gross_profit: 570000 },
  { customer_id: custIds["โรงพยาบาลสุราษฎร์ธานี"] || "", customer_name: "โรงพยาบาลสุราษฎร์ธานี", title: "ใบเสนอราคา CCTV 80 ตัว", status: "draft", total_amount: 1580000, gross_profit: 284000 },
  { customer_id: custIds["ห้างสรรพสินค้า Central สุราษฎร์ธานี"] || "", customer_name: "ห้างสรรพสินค้า Central สุราษฎร์ธานี", title: "ใบเสนอราคา Network Upgrade ห้าง Central", status: "approved", total_amount: 3200000, gross_profit: 640000 },
  { customer_id: custIds["บริษัท เทคโนวิชั่น จำกัด"] || "", customer_name: "บริษัท เทคโนวิชั่น จำกัด", title: "ใบเสนอราคา Server Room Dell + Synology", status: "approved", total_amount: 4500000, gross_profit: 900000 },
  { customer_id: custIds["บริษัท ชุมพรน้ำมันปาล์ม จำกัด"] || "", customer_name: "บริษัท ชุมพรน้ำมันปาล์ม จำกัด", title: "ใบเสนอราคา Solar Cell 200kW โรงงาน", status: "sent", total_amount: 8500000, gross_profit: 1700000 },
  { customer_id: custIds["เทศบาลเมืองสุราษฎร์ธานี"] || "", customer_name: "เทศบาลเมืองสุราษฎร์ธานี", title: "ใบเสนอราคา Smart City CCTV + IoT Phase 2", status: "draft", total_amount: 12000000, gross_profit: 2400000 },
  { customer_id: custIds["โรงแรม Centara Villas Samui"] || "", customer_name: "โรงแรม Centara Villas Samui", title: "ใบเสนอราคา WiFi 6 โรงแรม 150+ ห้อง", status: "draft", total_amount: 2100000, gross_profit: 420000 },
  { customer_id: custIds["โรงเรียนสุราษฎร์ธานี"] || "", customer_name: "โรงเรียนสุราษฎร์ธานี", title: "ใบเสนอราคา Network Fiber Backbone โรงเรียน", status: "approved", total_amount: 650000, gross_profit: 130000 },
];

// ─── Component ─────────────────────────────────────────────────────────────────

type LogEntry = { msg: string; ok: boolean };

export default function SeedPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function addLog(msg: string, ok = true) {
    setLogs(prev => [...prev, { msg, ok }]);
  }

  async function deletePresaleBig() {
    setRunning(true);
    addLog("🔍 ค้นหา presale requests ที่ assign ให้บิ๊ก...");
    try {
      const fs = await import("@/lib/firestore");
      const all = await fs.presaleRequests.list();
      const bigTasks = all.filter(r => r.assigned_to === "บิ๊ก สุขใจ");
      if (bigTasks.length === 0) {
        addLog("ℹ️ ไม่พบ presale tasks ที่ assign ให้บิ๊ก");
      } else {
        for (const r of bigTasks) {
          if (r.id) {
            await fs.presaleRequests.remove(r.id);
            addLog(`🗑️ ลบ: ${r.project_name || r.requirement?.slice(0, 30)}`);
          }
        }
        addLog(`✅ ลบทั้งหมด ${bigTasks.length} tasks`);
      }
    } catch (e) {
      addLog(`❌ Error: ${String(e)}`, false);
    }
    setRunning(false);
  }

  async function deleteOy() {
    setRunning(true);
    addLog("🔍 ค้นหา user ออย...");
    try {
      const fs = await import("@/lib/firestore");
      const allUsers = await fs.users.list();
      const oyList = allUsers.filter(u =>
        (u.name && u.name.includes("ออย")) ||
        (u.nickname && u.nickname.includes("ออย")) ||
        (u.email && u.email.toLowerCase().includes("oy"))
      );
      if (oyList.length === 0) {
        addLog("ℹ️ ไม่พบ user ที่ชื่อ ออย ในระบบ");
      } else {
        for (const u of oyList) {
          if (u.id) {
            await fs.users.remove(u.id);
            addLog(`🗑️ ลบ user: ${u.name} (${u.role}) — ${u.email}`);
          }
        }
        addLog(`✅ ลบทั้งหมด ${oyList.length} account`);
      }
    } catch (e) {
      addLog(`❌ Error: ${String(e)}`, false);
    }
    setRunning(false);
  }

  async function wipeCollection(
    col: { list: () => Promise<Array<{ id?: string }>>; remove: (id: string) => Promise<unknown> },
    label: string
  ) {
    const items = await col.list();
    if (items.length > 0) {
      for (const item of items) { if (item.id) await col.remove(item.id); }
      addLog(`  🗑️ ลบ ${items.length} ${label}`);
    }
  }

  async function restoreUsers() {
    setRunning(true);
    setLogs([]);
    addLog("👤 Restore Users ทีมงานทั้งหมด...");
    try {
      const fs = await import("@/lib/firestore");
      const existingUsers = await fs.users.list();
      const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));
      let added = 0;
      for (const u of SEED_USERS) {
        if (existingEmails.has(u.email.toLowerCase())) {
          addLog(`  ⏭ ${u.nickname} — มีอยู่แล้ว`);
        } else {
          await fs.users.add(u as Record<string, unknown>);
          addLog(`  ✓ เพิ่ม ${u.nickname} (${u.role}) — ${u.position}`);
          added++;
        }
      }
      addLog(`✅ เสร็จ — เพิ่ม ${added} คน, มีอยู่แล้ว ${SEED_USERS.length - added} คน`);
      setDone(true);
    } catch (e) {
      addLog(`❌ Error: ${String(e)}`, false);
    }
    setRunning(false);
  }

  async function seedAll() {
    setRunning(true);
    setDone(false);
    setLogs([]);
    addLog("🧹 ล้างข้อมูลเก่า...");

    try {
      const fs = await import("@/lib/firestore");

      // Wipe all relevant collections first (ไม่ลบ users — จัดการแยกผ่านหน้า Users)
      await wipeCollection(fs.customers as Parameters<typeof wipeCollection>[0], "customers");
      await wipeCollection(fs.projects as Parameters<typeof wipeCollection>[0], "projects");
      await wipeCollection(fs.salesQuotas as Parameters<typeof wipeCollection>[0], "quotas");
      await wipeCollection(fs.salesActivities as Parameters<typeof wipeCollection>[0], "activities");
      await wipeCollection(fs.presaleRequests as Parameters<typeof wipeCollection>[0], "presale requests");
      await wipeCollection(fs.serviceTickets as Parameters<typeof wipeCollection>[0], "service tickets");
      await wipeCollection(fs.serviceContracts as Parameters<typeof wipeCollection>[0], "contracts");
      await wipeCollection(fs.assets as Parameters<typeof wipeCollection>[0], "assets");
      await wipeCollection(fs.quotations as Parameters<typeof wipeCollection>[0], "quotations");
      await wipeCollection(fs.products as Parameters<typeof wipeCollection>[0], "products");
      await wipeCollection(fs.productCategories as Parameters<typeof wipeCollection>[0], "product categories");
      await wipeCollection(fs.projectTypes as Parameters<typeof wipeCollection>[0], "project types");
      addLog("✅ ล้างเสร็จ — เริ่ม Seed ใหม่...");
      addLog("");

      // 1. Users — เพิ่มเฉพาะคนที่ยังไม่มี email ในระบบ
      addLog("─── 👤 Users");
      const existingUsers = await fs.users.list();
      const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));
      let addedUsers = 0;
      for (const u of SEED_USERS) {
        if (existingEmails.has(u.email.toLowerCase())) {
          addLog(`  ⏭ ข้าม ${u.nickname} (มีอยู่แล้ว)`);
        } else {
          await fs.users.add(u as Record<string, unknown>);
          addLog(`  ✓ ${u.nickname} (${u.role})`);
          addedUsers++;
        }
      }
      addLog(`  → เพิ่มใหม่ ${addedUsers} คน, ข้าม ${SEED_USERS.length - addedUsers} คน`);

      // 2. Project Types
      addLog("─── 🏷️ Project Types");
      for (const pt of SEED_PROJECT_TYPES) {
        await fs.projectTypes.add(pt as Record<string, unknown>);
        addLog(`  ✓ ${pt.name}`);
      }

      // 3. Product Categories
      addLog("─── 📦 Product Categories");
      for (const pc of SEED_PRODUCT_CATEGORIES) {
        await fs.productCategories.add(pc as Record<string, unknown>);
        addLog(`  ✓ ${pc.name}`);
      }

      // 4. Products
      addLog("─── 🛒 Products (15 รายการ)");
      for (const p of SEED_PRODUCTS) {
        await fs.products.add(p as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${SEED_PRODUCTS.length} สินค้า`);

      // 5. Customers — collect IDs for FK
      addLog("─── 🏢 Customers");
      const customerIds: Record<string, string> = {};
      for (const c of SEED_CUSTOMERS) {
        const ref = await fs.customers.add(c as Record<string, unknown>);
        customerIds[c.company_name] = ref.id;
        addLog(`  ✓ ${c.company_name}`);
      }

      // 6. Projects
      addLog("─── 📁 Projects");
      const projectList = makeProjects(customerIds);
      for (const p of projectList) {
        await fs.projects.add(p as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${projectList.length} โปรเจค`);

      // 7. Sales Quotas
      addLog("─── 🎯 Sales Quotas (3 คน × 5 เดือน)");
      for (const q of SEED_QUOTAS) {
        await fs.salesQuotas.add(q as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${SEED_QUOTAS.length} รายการ quota`);

      // 8. Sales Activities
      addLog("─── 📞 Sales Activities");
      const actList = makeSalesActivities(customerIds);
      for (const a of actList) {
        await fs.salesActivities.add(a as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${actList.length} กิจกรรม`);

      // 9. Presale Requests
      addLog("─── ⚙️ Presale Requests");
      const prList = makePresale(customerIds);
      for (const r of prList) {
        await fs.presaleRequests.add(r as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${prList.length} presale requests`);

      // 10. Service Tickets
      addLog("─── 🔧 Service Tickets");
      const svcList = makeServiceTickets(customerIds);
      for (const t of svcList) {
        await fs.serviceTickets.add(t as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${svcList.length} tickets`);

      // 11. Service Contracts
      addLog("─── 📄 Service Contracts");
      const ctList = makeContracts(customerIds);
      for (const c of ctList) {
        await fs.serviceContracts.add(c as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${ctList.length} สัญญา (${ctList.filter(c => c.end_date < "2026-05-21").length} หมดอายุแล้ว)`);

      // 12. Assets
      addLog("─── 🖥️ Assets");
      const assetList = makeAssets(customerIds);
      for (const a of assetList) {
        await fs.assets.add(a as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${assetList.length} อุปกรณ์`);

      // 13. Quotations
      addLog("─── 📋 Quotations");
      const qtList = makeQuotations(customerIds);
      for (const q of qtList) {
        await fs.quotations.add(q as Record<string, unknown>);
      }
      addLog(`  ✓ เพิ่ม ${qtList.length} ใบเสนอราคา`);

      addLog("");
      addLog("✅ Seed เสร็จสมบูรณ์! ไปดู Dashboard ได้เลย 🎉");
      setDone(true);
    } catch (e) {
      addLog(`❌ Error: ${String(e)}`, false);
    }
    setRunning(false);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted">⚙️ Dev Tools</span>
        <span className="text-muted">/</span>
        <span className="text-xs">Seed Data</span>
      </div>
      <h1 className="text-xl font-bold mb-1">🌱 Seed ข้อมูลตัวอย่าง</h1>
      <p className="text-sm text-muted mb-5">เพิ่มข้อมูลสมมุติลงใน Firebase สำหรับเรียนรู้และทดสอบระบบ</p>

      <div className="rounded-2xl bg-amber-900/20 border border-amber-700/40 p-4 mb-5 text-sm text-amber-200">
        <p className="font-semibold mb-1">⚠️ คำเตือน</p>
        <ul className="list-disc ml-4 space-y-0.5 text-amber-300/80 text-xs">
          <li>ข้อมูลที่เพิ่มจะบันทึกลง Firebase จริง (collection เดียวกับ production)</li>
          <li>ถ้ากดหลายครั้ง จะเพิ่มข้อมูลซ้ำ — แนะนำให้กดครั้งเดียว</li>
          <li>ลบข้อมูลทดสอบได้จากหน้าแต่ละ Module หรือ Firebase Console</li>
        </ul>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 mb-5">
        <p className="text-sm font-semibold mb-3">ข้อมูลที่จะเพิ่ม</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted">
          {[
            ["👤 Users", "14 คน (Sale, Presale, Service, Coordinator)"],
            ["🏢 Customers", "8 บริษัท (รพ., มหาวิทยาลัย, เอกชน...)"],
            ["📁 Projects", "12 โปรเจค (lead → won/lost)"],
            ["🎯 Sales Quotas", "5 คน × 5 เดือน (ม.ค.–พ.ค.)"],
            ["📞 Activities", "12 กิจกรรมขาย (บางรายการ overdue)"],
            ["⚙️ Presale", "13 requests (BOQ, Design, Survey)"],
            ["🔧 Service", "17 tickets (open/resolved/closed)"],
            ["📄 Contracts", "8 สัญญา (บางรายการใกล้หมด/หมดแล้ว)"],
            ["🖥️ Assets", "8 อุปกรณ์ (บาง warranty ใกล้หมด)"],
            ["📋 Quotations", "8 ใบเสนอราคา (draft/sent/approved)"],
            ["🛒 Products", "15 สินค้า/บริการ"],
            ["🏷️ Project Types", "7 ประเภทงาน"],
          ].map(([icon, desc]) => (
            <div key={icon} className="rounded-xl bg-background p-2">
              <p className="font-medium text-foreground">{icon}</p>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <button onClick={restoreUsers} disabled={running}
          className="rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40 transition-colors">
          👤 Restore Users ทีมงาน
        </button>
        <button onClick={deletePresaleBig} disabled={running}
          className="rounded-xl bg-orange-700 hover:bg-orange-600 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40 transition-colors">
          🗑️ ลบ Presale ของบิ๊ก
        </button>
        <button onClick={deleteOy} disabled={running}
          className="rounded-xl bg-rose-700 hover:bg-rose-600 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40 transition-colors">
          🗑️ ลบ User ออย
        </button>
        <button onClick={seedAll} disabled={running}
          className="rounded-xl bg-accent hover:opacity-90 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40 transition-colors">
          {running ? "⏳ กำลังเพิ่มข้อมูล..." : "🌱 เพิ่มข้อมูลตัวอย่างทั้งหมด"}
        </button>
        {done && (
          <a href="/dashboard"
            className="rounded-xl bg-green-700 hover:bg-green-600 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            ดู Dashboard →
          </a>
        )}
      </div>

      {logs.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 font-mono text-xs max-h-[480px] overflow-y-auto space-y-0.5">
          {logs.map((l, i) => (
            <div key={i} className={l.ok ? (l.msg.startsWith("─") ? "text-accent font-bold mt-2" : l.msg.startsWith("✅") ? "text-green-400 font-bold" : "text-foreground/80") : "text-rose-400"}>
              {l.msg}
            </div>
          ))}
          {running && <div className="text-amber-400 animate-pulse">กำลังดำเนินการ...</div>}
        </div>
      )}
    </div>
  );
}
