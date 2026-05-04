"use client";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    try { const theme = localStorage.getItem("kmit_theme") || "midnight"; document.documentElement.setAttribute("data-theme", theme); } catch {}
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("กรุณากรอก Username และ Password"); return; }
    setLoading(true); setError("");
    try {
      const fs = await import("@/lib/firestore");
      const users = await fs.users.list();
      const uLower = username.toLowerCase();
      const user = users.find(u => u.active && (
        u.login_username?.toLowerCase() === uLower ||
        u.email?.toLowerCase() === uLower ||
        u.first_name?.toLowerCase() === uLower
      ));
      if (!user) { setError("ไม่พบ Username นี้ในระบบ"); setLoading(false); return; }
      const correctPwd = user.password || "P@ssw0rd";
      if (password !== correctPwd) { setError("รหัสผ่านไม่ถูกต้อง"); setLoading(false); return; }
      localStorage.setItem("kmit_current_user", user.name);
      localStorage.setItem("kmit_logged_in", "true");
      window.location.href = "/dashboard";
    } catch (err) { setError("เกิดข้อผิดพลาด"); console.error(err); }
    finally { setLoading(false); }
  }

  async function handleForgot() {
    if (!forgotEmail.trim()) { setForgotMsg("กรุณากรอกอีเมล"); return; }
    setForgotMsg("");
    try {
      const fs = await import("@/lib/firestore");
      const users = await fs.users.list();
      const user = users.find(u => u.email?.toLowerCase() === forgotEmail.toLowerCase() || u.login_username?.toLowerCase() === forgotEmail.toLowerCase());
      if (!user) { setForgotMsg("❌ ไม่พบอีเมลหรือ Username นี้ในระบบ"); return; }
      // Reset password to default
      await fs.users.update(user.id!, { password: "P@ssw0rd" });
      // Try send email
      try {
        const chSnap = await import("@/lib/firestore").then(f => f.notificationChannels.list());
        const emailCh = chSnap.find(c => c.type === "email" && c.active);
        if (emailCh && emailCh.smtp_host && user.email) {
          await fetch("/api/send-email", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              smtp_host: emailCh.smtp_host, smtp_port: emailCh.smtp_port,
              smtp_user: emailCh.smtp_user, smtp_pass: emailCh.smtp_pass,
              from_email: emailCh.from_email || emailCh.smtp_user,
              from_name: "KMITSURAT System",
              to: user.email,
              subject: "[KMITSURAT] รีเซ็ตรหัสผ่าน",
              body: `สวัสดี ${user.nickname || user.name}\n\nรหัสผ่านของคุณถูกรีเซ็ตเป็น: P@ssw0rd\n\nUsername: ${user.login_username}\n\nกรุณาเข้าสู่ระบบแล้วเปลี่ยนรหัสผ่านใหม่\n\nKMITSURAT Work Portal`,
            }),
          });
          setForgotMsg(`✅ รีเซ็ตรหัสผ่านแล้ว + ส่งอีเมลไปที่ ${user.email}`);
        } else {
          setForgotMsg(`✅ รีเซ็ตรหัสผ่านเป็น P@ssw0rd แล้ว (Username: ${user.login_username})`);
        }
      } catch {
        setForgotMsg(`✅ รีเซ็ตรหัสผ่านเป็น P@ssw0rd แล้ว (Username: ${user.login_username})`);
      }
    } catch (err) { setForgotMsg("❌ เกิดข้อผิดพลาด"); console.error(err); }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={{ marginLeft: 0 }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">KMITSURAT</h1>
          <p className="text-sm text-muted">Work Portal v1.6</p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleLogin} className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-center mb-2">เข้าสู่ระบบ</h2>
            {error && <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">{error}</div>}

            <div>
              <label className="text-xs text-muted">Username</label>
              <input type="text" placeholder="เช่น yingyut, suppaluck, supat" value={username} onChange={e => setUsername(e.target.value)} autoFocus
                className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>

            <div>
              <label className="text-xs text-muted">Password</label>
              <div className="relative mt-1">
                <input type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent pr-12" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm">
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-all">
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            <button type="button" onClick={() => setShowForgot(true)} className="w-full text-xs text-accent hover:underline">ลืมรหัสผ่าน?</button>
          </form>
        ) : (
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-center mb-2">ลืมรหัสผ่าน</h2>
            <p className="text-xs text-muted text-center">กรอก Username หรืออีเมล เพื่อรีเซ็ตรหัสผ่านเป็นค่าเริ่มต้น</p>

            {forgotMsg && <div className={`rounded-lg px-3 py-2 text-sm ${forgotMsg.startsWith("✅") ? "bg-success/10 border border-success/30 text-success" : "bg-danger/10 border border-danger/30 text-danger"}`}>{forgotMsg}</div>}

            <div>
              <label className="text-xs text-muted">Username หรือ Email</label>
              <input type="text" placeholder="เช่น yingyut หรือ ch_yingyut@kmit-group.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus
                className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent mt-1" />
            </div>

            <button onClick={handleForgot} className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-all">รีเซ็ตรหัสผ่าน</button>
            <button onClick={() => { setShowForgot(false); setForgotMsg(""); }} className="w-full text-xs text-muted hover:text-foreground">← กลับไปหน้า Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
