"use client";
import { UserProvider } from "@/lib/UserContext";
import Sidebar from "@/components/Sidebar";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <Sidebar />
      <main className="ml-52 flex-1 min-h-screen">{children}</main>
    </UserProvider>
  );
}
