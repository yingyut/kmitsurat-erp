"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/lib/types";

interface UserCtx {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  users: User[];
  loading: boolean;
}

const Ctx = createContext<UserCtx>({ currentUser: null, setCurrentUser: () => {}, users: [], loading: true });

export function useCurrentUser() { return useContext(Ctx); }

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fs = await import("@/lib/firestore");
        const all = await fs.users.list();
        const active = all.filter(u => u.active);
        setUsers(active);
        // Auto-select saved user or default to พี่กรด (admin)
        const savedName = localStorage.getItem("kmit_current_user");
        const saved = savedName ? active.find(u => u.name === savedName) : null;
        const defaultUser = saved || active.find(u => u.nickname === "พี่กรด") || active.find(u => u.role === "admin") || active[0];
        if (defaultUser) setCurrentUser(defaultUser);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  function handleSetUser(u: User | null) {
    setCurrentUser(u);
    if (u) localStorage.setItem("kmit_current_user", u.name);
    else localStorage.removeItem("kmit_current_user");
  }

  return <Ctx.Provider value={{ currentUser, setCurrentUser: handleSetUser, users, loading }}>{children}</Ctx.Provider>;
}
