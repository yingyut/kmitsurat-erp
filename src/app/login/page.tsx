"use client";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme
    try {
      const theme = localStorage.getItem("kmit_theme") || "midnight";
      document.documentElement.setAttribute("data-theme", theme);
    } catch {}
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("กรุณากรอก Username และ Password"); return; }
    setLoading(true); setError("");
    try {
      const fs = await import("@/lib/firestore");
      const users = await fs.users.list();
      // Match by nickname or name (case-insensitive)
      const user = users.find(u =>
        u.active &&
        (u.nickname?.toLowerCase() === username.toLowerCase() ||
         u.name?.toLowerCase() === username.toLowerCase() ||
         u.email?.toLowerCase() === username.toLowerCase())
      );
      if (!user) { setError("ไม่พบผู้ใช้นี้ในระบบ"); setLoading(false); return; }
      if (password !== "P@ssw0rd") { setError("รหัสผ่านไม่ถูกต้อง"); setLoading(false); return; }
      // Save login
      localStorage.setItem("kmit_current_user", user.name);
      localStorage.setItem("kmit_logged_in", "true");
      window.location.href = "/dashboard";
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      console.error(err);
    } finally { setLoading(false); }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={{ marginLeft: 0 }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">KMITSURAT</h1>
          <p className="text-sm text-muted">Work Portal v1.6</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-center mb-2">เข้าสู่ระบบ</h2>

          {error && <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">{error}</div>}

          <div>
            <label className="text-xs text-muted">ชื่อผู้ใช้ (ชื่อเล่น / อีเมล)</label>
            <input type="text" placeholder="เช่น พี่กรด, ออย, บีบี" value={username} onChange={e => setUsername(e.target.value)} autoFocus
              className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent mt-1" />
          </div>

          <div>
            <label className="text-xs text-muted">รหัสผ่าน</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent mt-1" />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-all">
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <p className="text-[10px] text-muted text-center">รหัสผ่านเริ่มต้น: P@ssw0rd</p>
        </form>
      </div>
    </div>
  );
}
