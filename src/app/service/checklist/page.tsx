"use client";
import { useState } from "react";

type CheckItem = { id: string; label: string; required: boolean };
type Section = { title: string; icon: string; items: CheckItem[] };

const PRE_SERVICE: Section[] = [
  {
    title: "ก่อนออกงาน", icon: "🚀",
    items: [
      { id: "p1", label: "ตรวจสอบรายละเอียด Ticket — ลูกค้า · สถานที่ · ประเภทงาน", required: true },
      { id: "p2", label: "เตรียมอุปกรณ์และเครื่องมือครบ (Multimeter, Tester, Cable)", required: true },
      { id: "p3", label: "เช็ค SN / KM Number ของอุปกรณ์ที่ต้องเปลี่ยน", required: false },
      { id: "p4", label: "แจ้งลูกค้าล่วงหน้าก่อนไปถึง", required: true },
      { id: "p5", label: "ถ่ายรูปอุปกรณ์ก่อนซ่อม (Before Photo)", required: true },
    ],
  },
];

const CCTV_CHECKLIST: Section[] = [
  {
    title: "CCTV — ตรวจสอบ", icon: "📹",
    items: [
      { id: "c1", label: "ภาพ Camera ทุกตัวแสดงผลปกติ", required: true },
      { id: "c2", label: "การบันทึก (Recording) ทำงานต่อเนื่อง", required: true },
      { id: "c3", label: "HDD / Storage มีพื้นที่เพียงพอ", required: true },
      { id: "c4", label: "Remote View ผ่าน App / Browser ได้", required: false },
      { id: "c5", label: "เวลา NVR/DVR ตรงกับเวลาจริง", required: true },
      { id: "c6", label: "ทำความสะอาด Dome / Lens ทุกตัว", required: false },
    ],
  },
];

const NETWORK_CHECKLIST: Section[] = [
  {
    title: "Network — ตรวจสอบ", icon: "🌐",
    items: [
      { id: "n1", label: "Internet ใช้งานได้ปกติ — Speed Test ผ่าน", required: true },
      { id: "n2", label: "Switch / AP ทุกตัว Online (ไฟ Link LED ปกติ)", required: true },
      { id: "n3", label: "Ping ทุก VLAN / Segment ได้", required: false },
      { id: "n4", label: "Wireless ทุก SSID เชื่อมต่อได้", required: true },
      { id: "n5", label: "Backup Config Router / Switch / AP", required: true },
      { id: "n6", label: "Check Event Log หา Error / Warning", required: false },
    ],
  },
];

const POST_SERVICE: Section[] = [
  {
    title: "หลังงานเสร็จ", icon: "✅",
    items: [
      { id: "a1", label: "ถ่ายรูปหลังซ่อม (After Photo)", required: true },
      { id: "a2", label: "ทดสอบระบบกับลูกค้า — ลูกค้ายืนยันปกติ", required: true },
      { id: "a3", label: "อธิบายสาเหตุและสิ่งที่ทำให้ลูกค้าฟัง", required: true },
      { id: "a4", label: "เก็บอุปกรณ์และเครื่องมือครบ", required: true },
      { id: "a5", label: "อัปเดต Ticket Status ในระบบ", required: true },
      { id: "a6", label: "บันทึกอะไหล่ที่ใช้ (ถ้ามี)", required: false },
    ],
  },
];

const ALL_SECTIONS = [...PRE_SERVICE, ...CCTV_CHECKLIST, ...NETWORK_CHECKLIST, ...POST_SERVICE];

type TabType = "pre" | "cctv" | "network" | "post";

export default function ChecklistPage() {
  const [activeTab, setActiveTab] = useState<TabType>("pre");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [note, setNote]       = useState("");
  const [ticketNo, setTicketNo] = useState("");

  const tabSections: Record<TabType, Section[]> = {
    pre: PRE_SERVICE, cctv: CCTV_CHECKLIST, network: NETWORK_CHECKLIST, post: POST_SERVICE,
  };
  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: "pre",     label: "ก่อนออกงาน",   icon: "🚀" },
    { id: "cctv",    label: "CCTV",          icon: "📹" },
    { id: "network", label: "Network",        icon: "🌐" },
    { id: "post",    label: "หลังงานเสร็จ",  icon: "✅" },
  ];

  const sections = tabSections[activeTab];
  const allItems = sections.flatMap(s => s.items);
  const requiredItems = allItems.filter(i => i.required);
  const doneCount = allItems.filter(i => checked[i.id]).length;
  const requiredDone = requiredItems.filter(i => checked[i.id]).length;
  const allRequiredDone = requiredDone === requiredItems.length;

  function toggle(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }
  function resetTab() {
    const ids = allItems.map(i => i.id);
    setChecked(prev => { const n = { ...prev }; ids.forEach(id => delete n[id]); return n; });
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold">✅ Service Checklist</h1>
        <p className="text-xs text-muted mt-0.5">รายการตรวจสอบก่อน · ระหว่าง · หลังงาน Service</p>
      </div>

      {/* Ticket ref */}
      <div className="flex items-center gap-3 mb-4">
        <input
          placeholder="Ticket No. (ไม่บังคับ)"
          value={ticketNo} onChange={e => setTicketNo(e.target.value)}
          className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <button onClick={resetTab} className="text-xs text-muted hover:text-danger border border-border rounded-lg px-3 py-2">🔄 Reset Tab</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${activeTab === t.id ? "bg-accent/20 text-accent border-accent/40" : "bg-card border-border text-muted hover:bg-card-hover"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-card border border-border p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted">ความคืบหน้า ({doneCount}/{allItems.length})</span>
          <span className={`text-xs font-semibold ${allRequiredDone ? "text-green-400" : "text-amber-400"}`}>
            {allRequiredDone ? "✅ บังคับครบ" : `⚠ บังคับ ${requiredDone}/${requiredItems.length}`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${allItems.length > 0 ? (doneCount / allItems.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Checklist items */}
      {sections.map(section => (
        <div key={section.title} className="mb-4">
          <h2 className="text-sm font-semibold mb-2">{section.icon} {section.title}</h2>
          <div className="space-y-2">
            {section.items.map(item => (
              <label key={item.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${checked[item.id] ? "border-green-800/40 bg-green-900/10" : "border-border bg-card hover:bg-card-hover"}`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${checked[item.id] ? "bg-green-500 border-green-500" : "border-border"}`}>
                  {checked[item.id] && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <input type="checkbox" className="sr-only" checked={!!checked[item.id]} onChange={() => toggle(item.id)} />
                <div className="flex-1">
                  <p className={`text-sm leading-snug ${checked[item.id] ? "line-through text-muted" : ""}`}>{item.label}</p>
                  {item.required && <span className="text-[10px] text-rose-400 font-medium">* บังคับ</span>}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Note */}
      <div className="mb-4">
        <label className="text-xs text-muted block mb-1">หมายเหตุเพิ่มเติม</label>
        <textarea
          placeholder="บันทึกข้อสังเกต, สิ่งผิดปกติ, อะไหล่ที่ใช้..."
          value={note} onChange={e => setNote(e.target.value)}
          className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-20 resize-y"
        />
      </div>

      <button
        disabled={!allRequiredDone}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {allRequiredDone ? "✅ ยืนยัน Checklist เสร็จสิ้น" : `⚠ ทำรายการบังคับให้ครบก่อน (${requiredDone}/${requiredItems.length})`}
      </button>
    </div>
  );
}
