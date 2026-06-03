"use client";
import { useState } from "react";

type BackupRecord = {
  id: string;
  timestamp: string;
  deviceName: string;
  deviceType: string;
  ip: string;
  version: string;
  technician: string;
  note: string;
  ticketNo: string;
};

const DEVICE_TYPES = ["Router", "Switch (L2)", "Switch (L3)", "AP Controller", "Wireless AP", "Firewall", "NVR/DVR", "Inverter/Solar", "PLC / Controller", "อื่นๆ"];

export default function ConfigBackupPage() {
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [form, setForm]       = useState({
    deviceName: "", deviceType: "Router", ip: "", version: "",
    technician: "", note: "", ticketNo: "",
  });
  const [showForm, setShowForm] = useState(true);
  const [search, setSearch]     = useState("");

  function handleSave() {
    if (!form.deviceName.trim()) return;
    const rec: BackupRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString("th-TH"),
      ...form,
    };
    setRecords(prev => [rec, ...prev]);
    setForm({ deviceName: "", deviceType: "Router", ip: "", version: "", technician: "", note: "", ticketNo: "" });
    setShowForm(false);
  }

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q || r.deviceName.toLowerCase().includes(q) || r.ip.includes(q) || r.note.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">💾 Config Backup Log</h1>
          <p className="text-xs text-muted mt-0.5">บันทึกประวัติการ Backup Config อุปกรณ์เน็ตเวิร์ก / ระบบ</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
          {showForm ? "ซ่อนฟอร์ม" : "+ บันทึก Backup"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-5">
          <p className="text-xs font-semibold text-muted uppercase mb-3">บันทึก Config Backup ใหม่</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted block mb-1">ชื่ออุปกรณ์ *</label>
              <input placeholder="เช่น Core-Switch-01, Router-ISP" value={form.deviceName}
                onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">ประเภทอุปกรณ์</label>
              <select value={form.deviceType} onChange={e => setForm(f => ({ ...f, deviceType: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">IP Address</label>
              <input placeholder="เช่น 192.168.1.1" value={form.ip}
                onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Firmware / Software Version</label>
              <input placeholder="เช่น v2.3.1, IOS 15.2(1)" value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">ช่างผู้ทำ Backup</label>
              <input placeholder="ชื่อช่าง" value={form.technician}
                onChange={e => setForm(f => ({ ...f, technician: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Ticket No. (ถ้ามี)</label>
              <input placeholder="เลข Ticket อ้างอิง" value={form.ticketNo}
                onChange={e => setForm(f => ({ ...f, ticketNo: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-muted block mb-1">หมายเหตุ</label>
              <textarea placeholder="Config ก่อน Upgrade, หลัง Reset, ก่อนเปลี่ยน ISP..." value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y" />
            </div>
          </div>

          <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 px-3 py-2.5 mb-3 text-xs text-amber-300">
            💡 <strong>ขั้นตอน Backup:</strong> SSH/Telnet → <code className="text-amber-200">show running-config</code> → Copy → Paste ใน Notepad → บันทึกเป็นไฟล์ .txt ชื่ออุปกรณ์_วันที่
          </div>

          <button onClick={handleSave} disabled={!form.deviceName.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
            💾 บันทึก Backup Log
          </button>
        </div>
      )}

      {/* Search + Records */}
      {records.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <input placeholder="ค้นหาอุปกรณ์ / IP..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <p className="text-xs text-muted shrink-0">{filtered.length} รายการ</p>
          </div>

          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div>
                    <p className="text-sm font-semibold">💾 {r.deviceName}</p>
                    <p className="text-xs text-muted">{r.deviceType} {r.version && `· v${r.version}`}</p>
                  </div>
                  <span className="text-[10px] text-muted shrink-0 tabular-nums">{r.timestamp}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mb-2">
                  {r.ip && <span className="font-mono">🌐 {r.ip}</span>}
                  {r.technician && <span>👤 {r.technician}</span>}
                  {r.ticketNo && <span>🎫 #{r.ticketNo}</span>}
                </div>
                {r.note && <p className="text-xs text-muted border-t border-border pt-2 mt-2">{r.note}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {records.length === 0 && !showForm && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-muted text-sm">ยังไม่มีบันทึก Backup — กด "+ บันทึก Backup" เพื่อเริ่ม</p>
        </div>
      )}

      <div className="mt-5 rounded-xl bg-blue-900/10 border border-blue-800/30 p-4">
        <p className="text-xs font-semibold text-blue-400 mb-1">📌 หมายเหตุ</p>
        <p className="text-xs text-muted">บันทึกนี้เก็บใน Browser Session เท่านั้น — ในอนาคตจะ Sync กับ Firestore อัตโนมัติ ควร Backup ไฟล์จริงไว้ใน NAS / Cloud Storage ของทีม</p>
      </div>
    </div>
  );
}
