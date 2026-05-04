"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/lib/types";

// Default role permissions
export const defaultPermissions: Record<string, string[]> = {
  admin:   ["dashboard","projects","sales","quotations","sales-workflow","sales-plan","presale","project-management","service","contracts","customers","vendors","products","users","reports","settings","help"],
  sale:    ["dashboard","projects","sales","quotations","sales-workflow","sales-plan","customers","help"],
  avenger: ["dashboard","projects","sales","quotations","sales-workflow","sales-plan","customers","help"],
  presale: ["dashboard","presale","products","customers","quotations","help"],
  service: ["dashboard","service","contracts","customers","help"],
};

// Check if user can access a page
export function canAccess(role: string | undefined, path: string): boolean {
  if (!role) return false;
  if (role === "admin") return true; // admin sees everything
  const perms = defaultPermissions[role] || [];
  // Extract first segment: /sales/xxx → sales
  const seg = path.replace(/^\//, "").split("/")[0] || "dashboard";
  return perms.includes(seg);
}

interface UserCtx {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  users: User[];
  loading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
  hasAccess: (path: string) => boolean;
}

const Ctx = createContext<UserCtx>({ currentUser: null, setCurrentUser: () => {}, users: [], loading: true, isLoggedIn: false, logout: () => {}, hasAccess: () => false });

export function useCurrentUser() { return useContext(Ctx); }

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Check if logged in
        const loggedIn = localStorage.getItem("kmit_logged_in") === "true";
        setIsLoggedIn(loggedIn);

        const fs = await import("@/lib/firestore");
        const all = await fs.users.list();
        const active = all.filter(u => u.active);
        setUsers(active);

        if (loggedIn) {
          const savedName = localStorage.getItem("kmit_current_user");
          const saved = savedName ? active.find(u => u.name === savedName) : null;
          if (saved) setCurrentUser(saved);
          else {
            // Saved user not found — logout
            localStorage.removeItem("kmit_logged_in");
            setIsLoggedIn(false);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  function handleSetUser(u: User | null) {
    setCurrentUser(u);
    if (u) localStorage.setItem("kmit_current_user", u.name);
    else localStorage.removeItem("kmit_current_user");
  }

  function logout() {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("kmit_logged_in");
    localStorage.removeItem("kmit_current_user");
    window.location.href = "/login";
  }

  function hasAccess(path: string): boolean {
    return canAccess(currentUser?.role, path);
  }

  return <Ctx.Provider value={{ currentUser, setCurrentUser: handleSetUser, users, loading, isLoggedIn, logout, hasAccess }}>{children}</Ctx.Provider>;
}
