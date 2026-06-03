"use client";
import { useState } from "react";

const TOOLS = [
  {
    name: "TeamViewer",
    icon: "🖥️",
    description: "Remote Desktop สำหรับ Windows / Mac / Android / iOS",
    download: "https://www.teamviewer.com/en/download/",
    color: "border-blue-800/40 bg-blue-900/10",
    badge: "bg-blue-500/20 text-blue-400",
  },
  {
    name: "AnyDesk",
    icon: "🔗",
    description: "เร็วกว่า TeamViewer ในหลายกรณี รองรับ Low Bandwidth",
    download: "https://anydesk.com/en/downloads",
    color: "border-red-800/40 bg-red-900/10",
    badge: "bg-red-500/20 text-red-400",
  },
  {
    name: "Google Remote Desktop",
    icon: "🔵",
    description: "ฟรี · ผ่าน Chrome Browser · ง่ายสำหรับ User ทั่วไป",
    download: "https://remotedesktop.google.com/",
    color: "border-green-800/40 bg-green-900/10",
    badge: "bg-green-500/20 text-green-400",
  },
  {
    name: "SSH / PuTTY",
    icon: "⌨️",
    description: "สำหรับ Remote Linux / Router / Switch ผ่าน Command Line",
    download: "https://www.putty.org/",
    color: "border-gray-700 bg-gray-800/20",
    badge: "bg-gray-500/20 text-gray-400",
  },
  {
    name: "WinSCP",
    icon: "📂",
    description: "SFTP/FTP Client — Transfer ไฟล์เข้า/ออก Server",
    download: "https://winscp.net/eng/download.php",
    color: "border-amber-800/40 bg-amber-900/10",
    badge: "bg-amber-500/20 text-amber-400",
  },
  {
    name: "Advanced IP Scanner",
    icon: "🔍",
    description: "Scan หา Device บน Network — ดู IP, MAC, Port",
    download: "https://www.advanced-ip-scanner.com/",
    color: "border-purple-800/40 bg-purple-900/10",
    badge: "bg-purple-500/20 text-purple-400",
  },
];

export default function RemoteSupportPage() {
  const [sessionLog, setSessionLog] = useState<Array<{ time: string; note: string }>>([]);
  const [logNote, setLogNote]       = useState("");
  const [targetIp, setTargetIp]     = useState("");
  const [targetName, setTargetName] = useState("");

  function addLog() {
    if (!logNote.trim()) return;
    setSessionLog(prev => [{ time: new Date().toLocaleTimeString("th-TH"), note: logNote.trim() }, ...prev]);
    setLogNote("");
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold">🖥️ Remote Support</h1>
        <p className="text-xs text-muted mt-0.5">เครื่องมือ Remote เข้าระบบลูกค้า · บันทึก Session</p>
      </div>

      {/* Session Info */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">📋 ข้อมูล Session ปัจจุบัน</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted block mb-1">ชื่อลูกค้า / Site</label>
            <input
              placeholder="เช่น ABC Co., Ltd."
              value={targetName} onChange={e => setTargetName(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">IP Address / Hostname</label>
            <input
              placeholder="เช่น 192.168.1.1 / router.site.com"
              value={targetIp} onChange={e => setTargetIp(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        {targetIp && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => window.open(`http://${targetIp}`, "_blank")}
              className="text-xs rounded-lg bg-accent px-3 py-1.5 text-white hover:bg-accent-hover">
              🌐 เปิดผ่าน Browser
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(targetIp)}
              className="text-xs rounded-lg bg-card border border-border px-3 py-1.5 text-muted hover:bg-card-hover">
              📋 คัดลอก IP
            </button>
            <span className="text-xs text-muted self-center font-mono">{targetIp}</span>
          </div>
        )}
      </div>

      {/* Remote Tools Grid */}
      <h2 className="text-sm font-semibold mb-2">🔧 เครื่องมือ Remote</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {TOOLS.map(tool => (
          <div key={tool.name} className={`rounded-xl border p-3 flex items-start gap-3 ${tool.color}`}>
            <span className="text-xl shrink-0 leading-none mt-0.5">{tool.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold">{tool.name}</p>
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${tool.badge}`}>ฟรี</span>
              </div>
              <p className="text-xs text-muted leading-snug">{tool.description}</p>
              <button
                onClick={() => window.open(tool.download, "_blank")}
                className="mt-2 text-[11px] text-accent hover:underline">
                ⬇ ดาวน์โหลด / เปิด →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Session Log */}
      <div className="rounded-xl bg-card border border-border p-4">
        <h2 className="text-sm font-semibold mb-3">📝 บันทึก Session</h2>
        <div className="flex gap-2 mb-3">
          <input
            placeholder="บันทึกขั้นตอน / สิ่งที่ทำ / ผลลัพธ์..."
            value={logNote} onChange={e => setLogNote(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addLog()}
            className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <button onClick={addLog} className="rounded-lg bg-accent px-3 py-2 text-sm text-white hover:bg-accent-hover shrink-0">+ บันทึก</button>
        </div>
        {sessionLog.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">ยังไม่มีบันทึก — กด Enter หรือ + บันทึก</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {sessionLog.map((l, i) => (
              <div key={i} className="flex gap-2 text-xs border-b border-border pb-1.5 last:border-0">
                <span className="text-muted shrink-0 font-mono">{l.time}</span>
                <span>{l.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
