"use client";
import { useEffect } from "react";
import { UserProvider } from "@/lib/UserContext";
import Sidebar from "@/components/Sidebar";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("kmit_theme") || "midnight";
      document.documentElement.setAttribute("data-theme", theme);
    } catch {}
  }, []);

  return (
    <UserProvider>
      <Sidebar />
      <main className="ml-52 flex-1 min-h-screen">{children}</main>
    </UserProvider>
  );
}
