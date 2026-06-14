"use client";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@/lib/types";

interface TeamScopeCtx {
  scopeUser: User | null;
  setScopeUser: (u: User | null) => void;
}

const TeamScopeContext = createContext<TeamScopeCtx>({ scopeUser: null, setScopeUser: () => {} });

export function TeamScopeProvider({ children }: { children: ReactNode }) {
  const [scopeUser, setScopeUser] = useState<User | null>(null);
  return (
    <TeamScopeContext.Provider value={{ scopeUser, setScopeUser }}>
      {children}
    </TeamScopeContext.Provider>
  );
}

export function useTeamScope() {
  return useContext(TeamScopeContext);
}
