"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type CC = Record<string, string>;

const DFLT: CC = {
  "background":    "#f0f4f8",
  "foreground":    "#0f172a",
  "card":          "#ffffff",
  "card-hover":    "#f1f5f9",
  "border":        "#cbd5e1",
  "accent":        "#2563eb",
  "accent-hover":  "#1d4ed8",
  "success":       "#15803d",
  "warning":       "#b45309",
  "danger":        "#b91c1c",
  "muted":         "#475569",
  "sidebar":       "#1b3a6b",
  "sidebar-fg":    "#dde8f5",
  "sidebar-hover": "#254d8c",
  "sidebar-muted": "#6b8ebd",
};

const PRESET_VALS: Record<string, CC> = {
  midnight:  { "background":"#080c14","foreground":"#e0e7ef","card":"#0f1729","card-hover":"#172038","border":"#1e2d4a","accent":"#6366f1","accent-hover":"#818cf8","success":"#34d399","warning":"#fbbf24","danger":"#f87171","muted":"#64748b","sidebar":"#0f1729","sidebar-fg":"#e0e7ef","sidebar-hover":"#172038","sidebar-muted":"#64748b" },
  obsidian:  { "background":"#111111","foreground":"#ededec","card":"#191919","card-hover":"#222222","border":"#2e2e2e","accent":"#f59e0b","accent-hover":"#fbbf24","success":"#22c55e","warning":"#f59e0b","danger":"#ef4444","muted":"#737373","sidebar":"#191919","sidebar-fg":"#ededec","sidebar-hover":"#222222","sidebar-muted":"#737373" },
  snow:      { "background":"#fafafa","foreground":"#171717","card":"#ffffff","card-hover":"#f5f5f5","border":"#d4d4d4","accent":"#2563eb","accent-hover":"#3b82f6","success":"#16a34a","warning":"#d97706","danger":"#dc2626","muted":"#6b7280","sidebar":"#ffffff","sidebar-fg":"#171717","sidebar-hover":"#f5f5f5","sidebar-muted":"#6b7280" },
  cyberpunk: { "background":"#030303","foreground":"#f0f0f0","card":"#0a0a0a","card-hover":"#141414","border":"#1f1f1f","accent":"#06b6d4","accent-hover":"#22d3ee","success":"#4ade80","warning":"#facc15","danger":"#fb7185","muted":"#525252","sidebar":"#0a0a0a","sidebar-fg":"#f0f0f0","sidebar-hover":"#141414","sidebar-muted":"#525252" },
  corporate: { ...DFLT },
};

const COLOR_GROUPS = [
  { title: "Content Area", icon: "🖥️", vars: [
    { key: "background",  label: "Background",   thai: "พื้นหลังหน้า" },
    { key: "foreground",  label: "Text",         thai: "สีตัวอักษร" },
    { key: "card",        label: "Card",         thai: "การ์ด/กล่อง" },
    { key: "card-hover",  label: "Card hover",   thai: "Card (hover)" },
    { key: "border",      label: "Border",       thai: "เส้นขอบ" },
    { key: "muted",       label: "Muted text",   thai: "ตัวอักษรรอง" },
  ]},
  { title: "Accent", icon: "🎨", vars: [
    { key: "accent",       label: "Accent",       thai: "สีหลัก" },
    { key: "accent-hover", label: "Accent hover", thai: "สีหลัก (hover)" },
  ]},
  { title: "Sidebar", icon: "📌", vars: [
    { key: "sidebar",        label: "Background", thai: "พื้นหลัง Sidebar" },
    { key: "sidebar-fg",     label: "Text",       thai: "ตัวอักษร Sidebar" },
    { key: "sidebar-hover",  label: "Hover",      thai: "Sidebar hover" },
    { key: "sidebar-muted",  label: "Muted text", thai: "ตัวอักษรรอง Sidebar" },
  ]},
  { title: "Status", icon: "🚦", vars: [
    { key: "success", label: "Success", thai: "สำเร็จ (เขียว)" },
    { key: "warning", label: "Warning", thai: "เตือน (เหลือง)" },
    { key: "danger",  label: "Danger",  thai: "อันตราย (แดง)" },
  ]},
];

const THEMES = [
  { id:"midnight",  name:"Midnight",  desc:"Deep space dark with indigo glow",         thai:"โทนมืดลึก — Linear & Vercel",                tags:["Dark","Professional","Default"], colors:{bg:"#080c14",card:"#0f1729",sidebar:"#0f1729",sidebarFg:"#e0e7ef",accent:"#6366f1",text:"#e0e7ef"} },
  { id:"obsidian",  name:"Obsidian",  desc:"Warm charcoal with amber accent",           thai:"โทนเทาอุ่น — GitHub & Notion",               tags:["Dark","Warm","Minimal"],          colors:{bg:"#111111",card:"#191919",sidebar:"#191919",sidebarFg:"#ededec",accent:"#f59e0b",text:"#ededec"} },
  { id:"snow",      name:"Snow",      desc:"Clean white with blue accent",              thai:"โทนขาวสะอาด — Apple & Stripe",               tags:["Light","Clean","Professional"],    colors:{bg:"#fafafa",card:"#ffffff",sidebar:"#ffffff",sidebarFg:"#171717",accent:"#2563eb",text:"#171717"} },
  { id:"cyberpunk", name:"Cyberpunk", desc:"True black with electric cyan & pink neon", thai:"โทนดำสนิท + นีออน — Figma Dark",            tags:["Dark","Neon","Bold"],             colors:{bg:"#030303",card:"#0a0a0a",sidebar:"#0a0a0a",sidebarFg:"#f0f0f0",accent:"#06b6d4",text:"#f0f0f0"} },
  { id:"corporate", name:"Corporate", desc:"Navy sidebar with clean white content",     thai:"Sidebar navy เข้ม + content ขาว — SmartHR",  tags:["Light","Enterprise","Split"],     colors:{bg:"#f0f4f8",card:"#ffffff",sidebar:"#1b3a6b",sidebarFg:"#dde8f5",accent:"#2563eb",text:"#0f172a"} },
];

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyCustomVars(colors: CC) {
  const el = document.documentElement;
  Object.entries(colors).forEach(([k, v]) => el.style.setProperty(`--${k}`, v));
  if (colors.accent && /^#[0-9a-f]{6}$/i.test(colors.accent)) {
    el.style.setProperty("--glow", hexToRgba(colors.accent, 0.12));
  }
}

function clearCustomVars() {
  const el = document.documentElement;
  Array.from(el.style)
    .filter(p => p.startsWith("--"))
    .forEach(p => el.style.removeProperty(p));
}

// Mini sidebar + content preview
function ThemePreview({ bg, card, sidebar, sidebarFg, accent, text }: {
  bg: string; card: string; sidebar: string; sidebarFg: string; accent: string; text: string;
}) {
  return (
    <div className="flex gap-2 h-28">
      <div className="w-16 rounded-lg overflow-hidden shrink-0" style={{ background: sidebar, border: `1px solid ${accent}30` }}>
        <div className="px-2 py-2">
          <div className="h-1.5 w-8 rounded" style={{ background: accent }} />
          <div className="h-1 w-6 rounded mt-1 opacity-60" style={{ background: sidebarFg }} />
        </div>
        <div className="px-1.5 space-y-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-2 rounded px-1" style={{ background: i===1 ? `${accent}30` : "transparent" }}>
              <div className="h-full rounded" style={{ background: i===1 ? accent : `${sidebarFg}25`, width:`${60+i*5}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex gap-1.5">
          {[accent,"#22c55e","#f59e0b","#ef4444"].map((c,i) => (
            <div key={i} className="flex-1 rounded-md p-1.5" style={{ background:card, border:`1px solid ${accent}15` }}>
              <div className="h-1 w-4 rounded mb-1" style={{ background:`${text}30` }} />
              <div className="h-2.5 w-6 rounded" style={{ background:c }} />
            </div>
          ))}
        </div>
        <div className="rounded-md overflow-hidden" style={{ background:card, border:`1px solid ${accent}10` }}>
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-2 px-2 py-1.5" style={{ borderBottom:i<3?`1px solid ${accent}08`:"none" }}>
              <div className="h-1.5 rounded flex-1" style={{ background:`${text}${i===1?"30":"15"}` }} />
              <div className="h-1.5 w-8 rounded" style={{ background:`${accent}30` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-0.5 items-end h-4">
          {[60,80,45,90,70].map((h,i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height:`${h}%`, background:i===3?accent:`${accent}40` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThemePage() {
  const [current, setCurrent] = useState("midnight");
  const [mounted, setMounted] = useState(false);
  const [cc, setCC] = useState<CC>(DFLT);
  const [copyFrom, setCopyFrom] = useState("corporate");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const theme = localStorage.getItem("kmit_theme") || "midnight";
      setCurrent(theme);
      const raw = localStorage.getItem("kmit_theme_custom");
      if (raw) setCC(JSON.parse(raw));
    } catch {}
  }, []);

  // Live preview: apply vars whenever cc changes while custom is active
  useEffect(() => {
    if (current === "custom") applyCustomVars(cc);
  }, [cc, current]);

  function applyTheme(id: string) {
    if (id !== "custom") clearCustomVars();
    setCurrent(id);
    document.documentElement.setAttribute("data-theme", id);
    if (id === "custom") applyCustomVars(cc);
    try { localStorage.setItem("kmit_theme", id); } catch {}
  }

  function handleColor(key: string, val: string) {
    setCC(prev => {
      const next = { ...prev, [key]: val };
      if (key === "accent" && /^#[0-9a-f]{6}$/i.test(val)) {
        next["accent-hover"] = val; // user can refine separately
      }
      return next;
    });
  }

  function handleCopyPreset() {
    const vals = PRESET_VALS[copyFrom];
    if (vals) setCC({ ...DFLT, ...vals });
  }

  function saveCustom() {
    try { localStorage.setItem("kmit_theme_custom", JSON.stringify(cc)); } catch {}
    applyTheme("custom");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetCustom() {
    setCC(DFLT);
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gradient">Theme / ธีมสี</h1>
          <p className="text-xs text-muted">เลือกธีมสำเร็จรูป หรือสร้าง Custom Theme ของตัวเองได้แบบละเอียด</p>
        </div>
        <Link href="/settings" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Settings</Link>
      </div>

      {/* Preset cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {THEMES.map(t => {
          const isActive = current === t.id;
          return (
            <button key={t.id} onClick={() => applyTheme(t.id)}
              className={`rounded-2xl border-2 overflow-hidden text-left transition-all hover:scale-[1.02] ${isActive ? "border-accent shadow-[0_0_20px_var(--glow)]" : "border-border hover:border-accent/30"}`}>
              <div className="p-4 relative" style={{ background: t.colors.bg }}>
                {isActive && (
                  <div className="absolute top-3 right-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">Active ✓</div>
                )}
                <ThemePreview bg={t.colors.bg} card={t.colors.card} sidebar={t.colors.sidebar} sidebarFg={t.colors.sidebarFg} accent={t.colors.accent} text={t.colors.text} />
              </div>
              <div className="p-4" style={{ background: t.colors.card }}>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold" style={{ color: t.colors.text }}>{t.name}</h3>
                  <div className="flex gap-1.5">
                    {(["bg","sidebar","card","accent","text"] as const).map(k => (
                      <div key={k} className="w-4 h-4 rounded-full border border-black/10" style={{ background: t.colors[k] }} title={k} />
                    ))}
                  </div>
                </div>
                <p className="text-xs mb-1.5" style={{ color: `${t.colors.text}99` }}>{t.desc}</p>
                <p className="text-[10px] mb-2" style={{ color: `${t.colors.text}60` }}>{t.thai}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {t.tags.map(tag => (
                    <span key={tag} className="rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background:`${t.colors.accent}20`, color:t.colors.accent }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}

        {/* Custom card */}
        {(() => {
          const isActive = current === "custom";
          return (
            <button onClick={() => applyTheme("custom")}
              className={`rounded-2xl border-2 overflow-hidden text-left transition-all hover:scale-[1.02] ${isActive ? "border-accent shadow-[0_0_20px_var(--glow)]" : "border-border hover:border-accent/30"}`}>
              <div className="p-4 relative" style={{ background: cc["background"] }}>
                {isActive && (
                  <div className="absolute top-3 right-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">Active ✓</div>
                )}
                <ThemePreview bg={cc["background"]} card={cc["card"]} sidebar={cc["sidebar"]} sidebarFg={cc["sidebar-fg"]} accent={cc["accent"]} text={cc["foreground"]} />
              </div>
              <div className="p-4" style={{ background: cc["card"] }}>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold" style={{ color: cc["foreground"] }}>✏️ Custom</h3>
                  <div className="flex gap-1.5">
                    {["background","sidebar","card","accent","foreground"].map(k => (
                      <div key={k} className="w-4 h-4 rounded-full border border-black/10" style={{ background: cc[k] }} title={k} />
                    ))}
                  </div>
                </div>
                <p className="text-xs mb-1.5" style={{ color: `${cc["foreground"]}99` }}>กำหนดสีทุก element เองแบบละเอียด</p>
                <p className="text-[10px] mb-2" style={{ color: `${cc["foreground"]}60` }}>Custom colors — full control over every CSS variable</p>
                <div className="flex gap-1.5 flex-wrap">
                  {["Custom","Full Control","Yours"].map(tag => (
                    <span key={tag} className="rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background:`${cc["accent"]}20`, color:cc["accent"] }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          );
        })()}
      </div>

      {/* Custom Theme Editor */}
      <div className={`rounded-2xl border-2 transition-all ${current === "custom" ? "border-accent" : "border-dashed border-border"}`}>
        <div className="p-5">
          {/* Editor header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold mb-0.5">✏️ Custom Theme Editor</h2>
              <p className="text-xs text-muted">แก้ไขสีทุก element — live preview อัปเดตทันที เมื่อ save จะจำไว้ถาวร</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground cursor-pointer">
                {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={handleCopyPreset}
                className="rounded-lg border border-border bg-card-hover px-3 py-1.5 text-xs hover:border-accent/50 transition-colors whitespace-nowrap">
                Copy from preset
              </button>
              <button onClick={resetCustom}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-danger hover:border-danger/30 transition-colors">
                Reset
              </button>
            </div>
          </div>

          {/* Color groups */}
          {COLOR_GROUPS.map(g => (
            <div key={g.title} className="mb-6">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-3 pb-1.5 border-b border-border">
                {g.icon} {g.title}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-4">
                {g.vars.map(v => {
                  const val = cc[v.key] || "#000000";
                  const isValidHex = /^#[0-9a-f]{6}$/i.test(val);
                  return (
                    <label key={v.key} className="flex flex-col gap-1.5 cursor-pointer group">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={isValidHex ? val : "#000000"}
                            onChange={e => handleColor(v.key, e.target.value)}
                            className="color-swatch"
                          />
                          <div className="pointer-events-none absolute inset-0 rounded-lg border border-black/10" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold truncate group-hover:text-accent transition-colors leading-tight">{v.label}</p>
                          <p className="text-[9px] text-muted leading-tight">{v.thai}</p>
                        </div>
                      </div>
                      <p className="text-[9px] font-mono text-muted/70 pl-0.5 truncate">{val}</p>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
            <button onClick={saveCustom}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: cc["accent"] }}>
              {saved ? "✓ Saved!" : "Apply & Save Custom Theme"}
            </button>
            <p className="text-[10px] text-muted flex-1">
              บันทึกลง browser — ทุกหน้าจะใช้ธีมนี้ ถึงแม้จะปิดแล้วเปิดใหม่
            </p>
            {current === "custom" && (
              <span className="text-[10px] font-semibold text-accent">● Live preview on</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
