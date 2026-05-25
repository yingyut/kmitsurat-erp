"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/lib/types";
import { checkPermission, checkModuleAccess, isNewRole } from "@/lib/rbac";
import type { Permission } from "@/lib/rbac";

// Legacy module-level permissions (old roles — unchanged for backward compat)
export const defaultPermissions: Record<string, string[]> = {
  admin:   ["dashboard","projects","sales","quotations","sales-workflow","sales-plan","presale","project-management","service","contracts","customers","vendors","products","users","reports","settings","help"],
  sale:    ["dashboard","projects","sales","quotations","sales-workflow","sales-plan","customers","help"],
  avenger: ["dashboard","projects","sales","quotations","sales-workflow","sales-plan","customers","help"],
  presale: ["dashboard","presale","products","customers","quotations","help"],
  service: ["dashboard","service","contracts","customers","assets","help"],
};

// Check module-level access (used by Sidebar and hasAccess)
export function canAccess(role: string | undefined, path: string): boolean {
  if (!role) return false;
  if (role === "admin" || role === "Administrator") return true;

  const seg = path.replace(/^\//, "").split("/")[0] || "dashboard";

  // New roles → use RBAC module permission map
  if (isNewRole(role)) return checkModuleAccess(role, seg);

  // Legacy roles → use old hardcoded module list
  const perms = defaultPermissions[role] ?? [];
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
  hasPermission: (perm: Permission) => boolean;
}

const Ctx = createContext<UserCtx>({
  currentUser: null, setCurrentUser: () => {}, users: [], loading: true,
  isLoggedIn: false, logout: () => {}, hasAccess: () => false, hasPermission: () => false,
});

export function useCurrentUser() { return useContext(Ctx); }

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
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
    if (canAccess(currentUser?.role, path)) return true;
    // Check extra_roles
    return (currentUser?.extra_roles ?? []).some(r => canAccess(r, path));
  }

  function hasPermission(perm: Permission): boolean {
    const role = currentUser?.role;
    if (!role) return false;
    // Admin (old or new) always has all permissions
    if (role === "admin" || role === "Administrator") return true;
    // Per-user override
    if (currentUser?.permissions_override?.includes(perm)) return true;
    // Check primary role
    const legacyGranted: Partial<Record<string, Permission[]>> = {
      sale:    ["view_dashboard","view_own_projects","view_own_customers","create_customer","view_quote","create_quote"],
      avenger: ["view_dashboard","view_own_projects","view_own_customers","create_customer","view_quote","create_quote"],
      presale: ["view_dashboard","view_presale","manage_presale","use_presale_tools","view_quote","create_quote","view_products","view_vendors","view_catalog","view_own_customers","view_own_projects"],
      service: ["view_dashboard","view_own_tickets","create_ticket","view_own_customers","view_products","view_contracts"],
    };
    const primaryOk = isNewRole(role) ? checkPermission(role, perm) : (legacyGranted[role] ?? []).includes(perm);
    if (primaryOk) return true;
    // Check extra_roles
    return (currentUser?.extra_roles ?? []).some(r => {
      if (r === "admin" || r === "Administrator") return true;
      if (isNewRole(r)) return checkPermission(r, perm);
      return (legacyGranted[r] ?? []).includes(perm);
    });
  }

  return (
    <Ctx.Provider value={{ currentUser, setCurrentUser: handleSetUser, users, loading, isLoggedIn, logout, hasAccess, hasPermission }}>
      {children}
    </Ctx.Provider>
  );
}
