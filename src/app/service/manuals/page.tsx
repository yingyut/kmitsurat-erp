"use client";
import { useState } from "react";

type Manual = {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  tags: string[];
};

const MANUALS: Manual[] = [
  { id: "cctv-basic",     title: "CCTV — การติดตั้งและตั้งค่าเบื้องต้น",     category: "CCTV",    description: "วิธีติดตั้ง IP Camera, DVR/NVR, การต่อสาย UTP, การ config IP",  icon: "📹", tags: ["cctv","camera","dvr","nvr","installation"] },
  { id: "cctv-trouble",   title: "CCTV — Troubleshooting ภาพไม่ขึ้น/มีสัญญาณรบกวน", category: "CCTV",    description: "การตรวจสอบสายสัญญาณ, BNC, PoE switch, Firmware update",          icon: "📹", tags: ["cctv","troubleshoot","signal"] },
  { id: "network-basic",  title: "Network — พื้นฐาน Switching & Routing",    category: "Network", description: "VLAN, IP Subnet, Default Gateway, DNS, DHCP Configuration",      icon: "🌐", tags: ["network","switch","router","vlan","ip"] },
  { id: "network-wifi",   title: "Network — Wireless AP & Controller",        category: "Network", description: "การ Config Unifi/TP-Link/Cisco AP, SSID, Roaming, Band Steering",  icon: "📡", tags: ["wifi","ap","wireless","unifi"] },
  { id: "network-fiber",  title: "Network — Fiber Optic & OLT/ONT",          category: "Network", description: "การ splice, ค่า dB loss, GPON OLT config, ONT provisioning",       icon: "💡", tags: ["fiber","optic","olt","ont","gpon"] },
  { id: "solar-install",  title: "Solar — การติดตั้งระบบโซลาร์เซลล์",        category: "Solar",   description: "On-grid / Off-grid / Hybrid, Inverter config, String sizing",      icon: "☀️", tags: ["solar","inverter","pv","hybrid"] },
  { id: "solar-trouble",  title: "Solar — Troubleshooting Inverter & Grid",   category: "Solar",   description: "Error code, Grid fault, Low yield, Battery calibration",            icon: "☀️", tags: ["solar","fault","inverter","battery"] },
  { id: "elec-safety",    title: "ไฟฟ้า — ความปลอดภัยในการปฏิบัติงาน",       category: "ไฟฟ้า",  description: "PPE, Lockout/Tagout, การวัด Voltage/Current, การต่อ Ground",    icon: "⚡", tags: ["electric","safety","ppe","lockout"] },
  { id: "elec-db",        title: "ไฟฟ้า — ตู้ DB และ MDB",                   category: "ไฟฟ้า",  description: "Circuit Breaker, RCD, ขนาดสายไฟ, Load calculation",               icon: "⚡", tags: ["electric","breaker","mdb","db"] },
  { id: "ma-checklist",   title: "MA — Checklist งานบำรุงรักษาประจำปี",      category: "MA",      description: "PM Checklist สำหรับระบบ CCTV, Network, Solar, ไฟฟ้า",            icon: "🛡️", tags: ["ma","pm","maintenance","annual"] },
  { id: "report-template", title: "Report — Template รายงานงานช่าง",          category: "Report",  description: "Template Service Report, Completion Report, ภาพถ่ายก่อน/หลัง",   icon: "📄", tags: ["report","template","completion"] },
];

const CATEGORIES = ["ทั้งหมด", "CCTV", "Network", "Solar", "ไฟฟ้า", "MA", "Report"];

export default function ManualsPage() {
  const [cat, setCat]     = useState("ทั้งหมด");
  const [search, setSearch] = useState("");

  const filtered = MANUALS.filter(m => {
    const matchCat = cat === "ทั้งหมด" || m.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.tags.some(t => t.includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold">📖 Manuals — คู่มือช่าง</h1>
        <p className="text-xs text-muted mt-0.5">คู่มือการติดตั้ง · Troubleshooting · ขั้นตอนการทำงาน</p>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          placeholder="ค้นหา... เช่น CCTV, VLAN, Solar"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${cat === c ? "bg-accent/20 text-accent border-accent/40" : "bg-card border-border text-muted hover:bg-card-hover"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm">ไม่พบคู่มือที่ตรงกัน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(m => (
            <div key={m.id} className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 leading-none mt-0.5">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug">{m.title}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{m.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] bg-accent/10 text-accent border border-accent/20">{m.category}</span>
                    {m.tags.slice(0, 3).map(t => (
                      <span key={t} className="rounded-full px-2 py-0.5 text-[10px] bg-muted/10 text-muted border border-border">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                <button className="text-[11px] text-accent hover:underline">📥 ดาวน์โหลด PDF</button>
                <span className="text-muted text-[11px]">·</span>
                <button className="text-[11px] text-muted hover:text-foreground">📋 คัดลอก Link</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl bg-blue-900/10 border border-blue-800/30 p-4">
        <p className="text-xs font-semibold text-blue-400 mb-1">📌 หมายเหตุ</p>
        <p className="text-xs text-muted">คู่มือนี้เป็น placeholder — ทีมจะอัปโหลด PDF จริงลงในระบบในภายหลัง ติดต่อ Admin เพื่อเพิ่ม / แก้ไขคู่มือ</p>
      </div>
    </div>
  );
}
