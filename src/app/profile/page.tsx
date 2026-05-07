"use client";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/UserContext";

const roleLabels: Record<string, string> = {
  admin: "ผู้ดูแลระบบ", sale: "เซลล์", presale: "พรีเซลล์", service: "ช่างบริการ", avenger: "Avenger",
};

export default function ProfilePage() {
  const { currentUser, loading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) { setMsg({ type: "error", text: "กรุณากรอกข้อมูลให้ครบ" }); return; }
    if (newPwd !== confirmPwd) { setMsg({ type: "error", text: "รหัสผ่านใหม่ไม่ตรงกัน" }); return; }
    if (newPwd.length < 6) { setMsg({ type: "error", text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }); return; }
    if (!currentUser) { setMsg({ type: "error", text: "ไม่พบข้อมูลผู้ใช้" }); return; }

    setSaving(true);
    try {
      const fs = await import("@/lib/firestore");
      const users = await fs.users.list();
      const me = users.find(u => u.name === currentUser.name);
      if (!me) { setMsg({ type: "error", text: "ไม่พบข้อมูลผู้ใช้ในระบบ" }); return; }

      const stored = me.password || "P@ssw0rd";
      if (currentPwd !== stored) { setMsg({ type: "error", text: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }); return; }

      await fs.users.update(me.id!, { password: newPwd });
      setMsg({ type: "success", text: "เปลี่ยนรหัสผ่านสำเร็จ" });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      setMsg({ type: "error", text: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || loading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">ไม่พบข้อมูลผู้ใช้</p></div>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold text-gradient mb-1">โปรไฟล์ของฉัน</h1>
      <p className="text-xs text-muted mb-6">ข้อมูลบัญชีและการตั้งค่าส่วนตัว</p>

      {/* User Info */}
      <div className="rounded-xl bg-card border border-border p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent shrink-0">
            {(currentUser.nickname || currentUser.name || "?").charAt(0)}
          </div>
          <div>
            <p className="text-base font-semibold">{currentUser.nickname || currentUser.name}</p>
            <p className="text-xs text-muted">{currentUser.email || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-background border border-border px-3 py-2">
            <p className="text-[10px] text-muted mb-0.5">Role</p>
            <p className="font-medium">{roleLabels[currentUser.role] || currentUser.role}</p>
          </div>
          <div className="rounded-lg bg-background border border-border px-3 py-2">
            <p className="text-[10px] text-muted mb-0.5">ตำแหน่ง</p>
            <p className="font-medium">{currentUser.position || "—"}</p>
          </div>
          <div className="rounded-lg bg-background border border-border px-3 py-2">
            <p className="text-[10px] text-muted mb-0.5">Login Username</p>
            <p className="font-mono text-sm">{currentUser.login_username || "—"}</p>
          </div>
          <div className="rounded-lg bg-background border border-border px-3 py-2">
            <p className="text-[10px] text-muted mb-0.5">เบอร์โทร</p>
            <p className="font-medium">{currentUser.phone || "—"}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl bg-card border border-border p-5">
        <h2 className="text-sm font-semibold mb-4">เปลี่ยนรหัสผ่าน</h2>

        {msg && (
          <div className={`rounded-lg px-3 py-2 text-sm mb-4 ${msg.type === "success" ? "bg-success/10 border border-success/30 text-success" : "bg-danger/10 border border-danger/30 text-danger"}`}>
            {msg.type === "success" ? "✓ " : "✕ "}{msg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="text-[10px] text-muted">รหัสผ่านปัจจุบัน</label>
            <div className="relative mt-1">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs hover:text-foreground">
                {showCurrent ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted">รหัสผ่านใหม่</label>
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs hover:text-foreground">
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
              className={`w-full rounded-lg bg-background border px-3 py-2 text-sm focus:outline-none mt-1 ${confirmPwd && newPwd !== confirmPwd ? "border-danger/50 focus:border-danger" : "border-border focus:border-accent"}`}
            />
            {confirmPwd && newPwd !== confirmPwd && <p className="text-[10px] text-danger mt-1">รหัสผ่านไม่ตรงกัน</p>}
          </div>
          <button
            type="submit"
            disabled={saving || !currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-all mt-1"
          >
            {saving ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </div>
  );
}
