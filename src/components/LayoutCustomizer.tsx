"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/UserContext";
import {
  type UIDensity,
  applyDensity,
  loadUserDensity,
  saveUserDensity,
  loadAdminDefault,
  saveAdminDefault,
} from "@/lib/displayPrefs";

const DENSITY_OPTIONS: { id: UIDensity; label: string; icon: string; desc: string }[] = [
  { id: "compact",  label: "ย่อ",   icon: "🔡", desc: "แน่น" },
  { id: "normal",   label: "ปกติ",  icon: "🔤", desc: "มาตรฐาน" },
  { id: "spacious", label: "ขยาย",  icon: "🔠", desc: "กว้าง" },
];

const ADMIN_ROLES = ["admin", "Administrator", "avenger"];

export default function LayoutCustomizer() {
  const { currentUser } = useCurrentUser();
  const [current, setCurrent] = useState<UIDensity>("normal");
  const [adminDefault, setAdminDefault] = useState<UIDensity>("normal");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(currentUser?.role ?? "");
  const userId = currentUser?.id ?? "";

  useEffect(() => {
    if (!userId) return;
    const d = loadUserDensity(userId);
    setCurrent(d);
    applyDensity(d);
    loadAdminDefault().then(setAdminDefault);
  }, [userId]);

  function setDensity(d: UIDensity) {
    setCurrent(d);
    applyDensity(d);
    saveUserDensity(userId, d);
  }

  async function resetToAdminDefault() {
    const d = await loadAdminDefault();
    setAdminDefault(d);
    setDensity(d);
  }

  async function setAsAdminDefault() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await saveAdminDefault(current);
      setAdminDefault(current);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-3 py-2 border-t border-sidebar-hover/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 hover:bg-sidebar-hover rounded px-1 py-0.5 transition-colors"
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-muted flex-1">จัดรูปแบบ</span>
        <span className="text-[10px] text-sidebar-muted/60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {/* Density buttons */}
          <div className="flex gap-1">
            {DENSITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDensity(opt.id)}
                title={opt.desc}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-[9px] font-semibold transition-all border ${
                  current === opt.id
                    ? "bg-accent/20 border-accent/40 text-accent"
                    : "border-sidebar-hover/60 text-sidebar-muted hover:bg-sidebar-hover"
                }`}
              >
                <span className="text-base leading-none mb-0.5">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Reset to admin default */}
          <button
            onClick={resetToAdminDefault}
            disabled={current === adminDefault}
            className="w-full text-[9px] text-sidebar-muted/70 hover:text-sidebar-fg border border-sidebar-hover/40 hover:border-sidebar-hover rounded-lg py-1 transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            ↺ คืนค่าเดิม ({adminDefault === "compact" ? "ย่อ" : adminDefault === "spacious" ? "ขยาย" : "ปกติ"})
          </button>

          {/* Admin-only: set as tenant default */}
          {isAdmin && (
            <button
              onClick={setAsAdminDefault}
              disabled={saving || current === adminDefault}
              className="w-full text-[9px] text-sidebar-muted/50 hover:text-accent border border-sidebar-hover/30 hover:border-accent/30 rounded-lg py-1 transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              {saving ? "กำลังบันทึก…" : "★ กำหนดเป็นค่าเริ่มต้น"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
