"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UserProvider, useCurrentUser } from "@/lib/UserContext";
import Sidebar from "@/components/Sidebar";
import type { ReactNode } from "react";

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_META: Record<DeviceMode, { icon: string; label: string; width: string | null }> = {
  desktop: { icon: "🖥", label: "Desktop",      width: null       },
  tablet:  { icon: "⬜", label: "Tablet 768px", width: "768px"   },
  mobile:  { icon: "📱", label: "Mobile 390px", width: "390px"   },
};

function DevicePreviewBar({ mode, onChange }: { mode: DeviceMode; onChange: (m: DeviceMode) => void }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center bg-card border border-border rounded-full px-1.5 py-1 shadow-xl gap-0.5 select-none">
      {(Object.keys(DEVICE_META) as DeviceMode[]).map(m => (
        <button key={m} onClick={() => onChange(m)} title={`Preview: ${DEVICE_META[m].label}`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === m ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground hover:bg-muted/10"
          }`}>
          <span>{DEVICE_META[m].icon}</span>
          <span>{DEVICE_META[m].label}</span>
        </button>
      ))}
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, loading } = useCurrentUser();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (pathname === "/login" || pathname.startsWith("/dev")) { setChecked(true); return; }
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    setChecked(true);
  }, [loading, isLoggedIn, pathname]);

  if (loading || !checked) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted">Loading...</p></div>;
  return <>{children}</>;
}

function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="sm:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-12 px-3 bg-sidebar border-b border-sidebar-hover/50">
      <button
        onClick={onMenuClick}
        className="w-9 h-9 flex items-center justify-center rounded-md text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover transition-colors text-lg"
        aria-label="Open menu"
      >
        ☰
      </button>
      <span className="flex-1 text-center text-sm font-bold tracking-tight text-gradient pr-9">KMITSURAT</span>
    </div>
  );
}

function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isDev = pathname.startsWith("/dev");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [narrowSidebarOpen, setNarrowSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const theme = localStorage.getItem("kmit_theme") || "midnight";
      document.documentElement.setAttribute("data-theme", theme);
      const dm = localStorage.getItem("kmit_device_preview") as DeviceMode | null;
      if (dm && dm in DEVICE_META) setDeviceMode(dm);
    } catch {}
  }, []);

  function changeDevice(m: DeviceMode) {
    setDeviceMode(m);
    setNarrowSidebarOpen(false);
    try { localStorage.setItem("kmit_device_preview", m); } catch {}
  }

  if (isLogin || isDev) return <>{children}</>;

  const isNarrow = deviceMode !== "desktop";
  const meta = DEVICE_META[deviceMode];

  return (
    <div className="flex w-full min-h-screen">
      {!isNarrow && (
        <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      )}

      <main className={`@container flex-1 min-h-screen pb-16 ${!isNarrow ? "ml-52 pt-12 sm:pt-0" : ""}`}>
        {!isNarrow && <MobileTopBar onMenuClick={() => setMobileSidebarOpen(true)} />}
        {isNarrow ? (
          /* ── Device preview wrapper ── */
          <div className="min-h-screen" style={{ background: "var(--border)" }}>
            {/* Device label bar */}
            <div className="sticky top-0 z-10 text-center py-1.5 text-[11px] font-medium text-foreground/60 bg-card/90 backdrop-blur border-b border-border">
              {meta.icon} {meta.label} — กำลัง Preview อยู่ · ข้อมูลจริงทุกอย่าง
            </div>
            {/* Constrained frame */}
            <div className="@container device-narrow mx-auto bg-background min-h-screen shadow-2xl overflow-x-hidden relative"
              style={{ maxWidth: meta.width ?? undefined, width: "100%" }}>
              {/* Sidebar for narrow preview (alwaysMobile keeps it hidden until opened) */}
              <Sidebar alwaysMobile mobileOpen={narrowSidebarOpen} onClose={() => setNarrowSidebarOpen(false)} />
              {/* Sticky top bar inside the frame */}
              <div className="sticky top-0 z-30 flex items-center h-12 px-3 bg-sidebar border-b border-sidebar-hover/50">
                <button
                  onClick={() => setNarrowSidebarOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-md text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover transition-colors text-lg"
                  aria-label="Open menu"
                >
                  ☰
                </button>
                <span className="flex-1 text-center text-sm font-bold tracking-tight text-gradient pr-9">KMITSURAT</span>
              </div>
              {children}
            </div>
          </div>
        ) : children}
      </main>

      <DevicePreviewBar mode={deviceMode} onChange={changeDevice} />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <AuthGate>
        <AppContent>{children}</AppContent>
      </AuthGate>
    </UserProvider>
  );
}
