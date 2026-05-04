"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UserProvider, useCurrentUser } from "@/lib/UserContext";
import Sidebar from "@/components/Sidebar";
import type { ReactNode } from "react";

function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, loading } = useCurrentUser();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Allow login page without auth
    if (pathname === "/login") { setChecked(true); return; }
    // Redirect to login if not logged in
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    setChecked(true);
  }, [loading, isLoggedIn, pathname]);

  if (loading || !checked) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted">Loading...</p></div>;
  return <>{children}</>;
}

function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  useEffect(() => {
    try {
      const theme = localStorage.getItem("kmit_theme") || "midnight";
      document.documentElement.setAttribute("data-theme", theme);
    } catch {}
  }, []);

  // Login page — no sidebar
  if (isLogin) return <>{children}</>;

  return (
    <>
      <Sidebar />
      <main className="ml-52 flex-1 min-h-screen">{children}</main>
    </>
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
