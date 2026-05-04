"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const themes = [
  {
    id: "midnight",
    name: "Midnight",
    desc: "Deep space dark with indigo glow",
    thai: "โทนมืดลึก — แรงบันดาลใจจาก Linear & Vercel",
    colors: { bg: "#080c14", card: "#0f1729", accent: "#6366f1", text: "#e0e7ef" },
    tags: ["Dark", "Professional", "Default"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    desc: "Warm charcoal with amber accent",
    thai: "โทนเทาอุ่น — แรงบันดาลใจจาก GitHub & Notion",
    colors: { bg: "#111111", card: "#191919", accent: "#f59e0b", text: "#ededec" },
    tags: ["Dark", "Warm", "Minimal"],
  },
  {
    id: "snow",
    name: "Snow",
    desc: "Clean white with blue accent",
    thai: "โทนขาวสะอาด — แรงบันดาลใจจาก Apple & Stripe",
    colors: { bg: "#fafafa", card: "#ffffff", accent: "#2563eb", text: "#171717" },
    tags: ["Light", "Clean", "Professional"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    desc: "True black with electric cyan & pink neon",
    thai: "โทนดำสนิท + นีออน — แรงบันดาลใจจาก Figma Dark & Cyberpunk",
    colors: { bg: "#030303", card: "#0a0a0a", accent: "#06b6d4", text: "#f0f0f0" },
    tags: ["Dark", "Neon", "Bold"],
  },
];

export default function ThemePage() {
  const [current, setCurrent] = useState("midnight");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { setCurrent(localStorage.getItem("kmit_theme") || "midnight"); } catch {}
  }, []);

  function applyTheme(id: string) {
    setCurrent(id);
    document.documentElement.setAttribute("data-theme", id);
    try { localStorage.setItem("kmit_theme", id); } catch {}
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gradient">Theme / ธีมสี</h1>
          <p className="text-xs text-muted">เลือกธีมสีที่ชอบ — ระบบจำไว้ให้อัตโนมัติ</p>
        </div>
        <Link href="/settings" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Settings</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {themes.map(t => {
          const isActive = current === t.id;
          return (
            <button key={t.id} onClick={() => applyTheme(t.id)}
              className={`rounded-2xl border-2 overflow-hidden text-left transition-all hover:scale-[1.02] ${isActive ? "border-accent shadow-[0_0_20px_var(--glow)]" : "border-border hover:border-accent/30"}`}>

              {/* Preview */}
              <div className="p-4 relative" style={{ background: t.colors.bg }}>
                {isActive && <div className="absolute top-3 right-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">Active ✓</div>}

                {/* Mini sidebar + content preview */}
                <div className="flex gap-2 h-28">
                  {/* Sidebar preview */}
                  <div className="w-16 rounded-lg overflow-hidden shrink-0" style={{ background: t.colors.card, border: `1px solid ${t.colors.accent}20` }}>
                    <div className="px-2 py-2">
                      <div className="h-1.5 w-8 rounded" style={{ background: t.colors.accent }} />
                      <div className="h-1 w-6 rounded mt-1 opacity-30" style={{ background: t.colors.text }} />
                    </div>
                    <div className="px-1.5 space-y-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-2 rounded px-1" style={{ background: i === 1 ? `${t.colors.accent}25` : "transparent" }}>
                          <div className="h-full w-full rounded" style={{ background: i === 1 ? t.colors.accent : `${t.colors.text}15`, width: `${60 + i * 5}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 space-y-2">
                    {/* KPI cards */}
                    <div className="flex gap-1.5">
                      {[t.colors.accent, "#22c55e", "#f59e0b", "#ef4444"].map((c, i) => (
                        <div key={i} className="flex-1 rounded-md p-1.5" style={{ background: t.colors.card, border: `1px solid ${t.colors.accent}15` }}>
                          <div className="h-1 w-4 rounded mb-1" style={{ background: `${t.colors.text}30` }} />
                          <div className="h-2.5 w-6 rounded" style={{ background: c }} />
                        </div>
                      ))}
                    </div>
                    {/* Table rows */}
                    <div className="rounded-md overflow-hidden" style={{ background: t.colors.card, border: `1px solid ${t.colors.accent}10` }}>
                      {[1,2,3].map(i => (
                        <div key={i} className="flex gap-2 px-2 py-1.5" style={{ borderBottom: i < 3 ? `1px solid ${t.colors.accent}08` : "none" }}>
                          <div className="h-1.5 rounded flex-1" style={{ background: `${t.colors.text}${i === 1 ? "30" : "15"}`, width: `${50 + i * 10}%` }} />
                          <div className="h-1.5 w-8 rounded" style={{ background: `${t.colors.accent}30` }} />
                        </div>
                      ))}
                    </div>
                    {/* Chart bar */}
                    <div className="flex gap-0.5 items-end h-4">
                      {[60,80,45,90,70].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 3 ? t.colors.accent : `${t.colors.accent}40` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4" style={{ background: t.colors.card }}>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold" style={{ color: t.colors.text }}>{t.name}</h3>
                  <div className="flex gap-1.5">
                    {["bg","card","accent","text"].map(k => (
                      <div key={k} className="w-4 h-4 rounded-full border border-white/10" style={{ background: t.colors[k as keyof typeof t.colors] }} title={k} />
                    ))}
                  </div>
                </div>
                <p className="text-xs mb-2" style={{ color: `${t.colors.text}99` }}>{t.desc}</p>
                <p className="text-[10px] mb-2" style={{ color: `${t.colors.text}60` }}>{t.thai}</p>
                <div className="flex gap-1.5">
                  {t.tags.map(tag => (
                    <span key={tag} className="rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background: `${t.colors.accent}20`, color: t.colors.accent }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
