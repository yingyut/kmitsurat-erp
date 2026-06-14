"use client";
import { useState, useRef, useEffect } from "react";
import type { User } from "@/lib/types";
import type { DashView } from "@/lib/dashboardLayout";

export interface ScopeState {
  view: DashView;
  user: User | null;
}

interface DeptConfig {
  key: string;
  label: string;
  icon: string;
  roles: string[];
  view: DashView;
}

const DEPT_CONFIG: DeptConfig[] = [
  {
    key: "executive",
    label: "Executive",
    icon: "👔",
    roles: ["admin", "Administrator", "Sales Manager", "Presales Manager", "Service Manager"],
    view: "executive",
  },
  {
    key: "sales",
    label: "Sales",
    icon: "💼",
    roles: ["sale", "Sales Executive", "avenger"],
    view: "sales",
  },
  {
    key: "presales",
    label: "Presales",
    icon: "⚙️",
    roles: ["presale", "Presales Engineer", "BOQ Engineer"],
    view: "presale",
  },
  {
    key: "service",
    label: "Service",
    icon: "🔧",
    roles: ["service", "Service Technician", "Operations Coordinator"],
    view: "service",
  },
  {
    key: "project",
    label: "Project",
    icon: "🏗️",
    roles: ["presale", "Presales Engineer", "BOQ Engineer"],
    view: "projects",
  },
];

function getAllowedDepts(myRole: string): string[] {
  if (["admin", "Administrator", "avenger"].includes(myRole))
    return DEPT_CONFIG.map((d) => d.key);
  if (myRole === "Sales Manager")    return ["executive", "sales"];
  if (myRole === "Presales Manager") return ["executive", "presales", "project"];
  if (myRole === "Service Manager")  return ["executive", "service"];
  return [];
}

export interface TeamScopeBarProps {
  users: User[];
  myRole: string;
  scope: ScopeState | null;
  currentView: DashView;
  onScope: (s: ScopeState | null) => void;
}

export function TeamScopeBar({ users, myRole, scope, currentView, onScope }: TeamScopeBarProps) {
  const [openDept, setOpenDept] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenDept(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allowedDepts = getAllowedDepts(myRole);
  const visibleDepts = DEPT_CONFIG.filter((d) => allowedDepts.includes(d.key));

  if (visibleDepts.length === 0) return null;

  return (
    <div ref={ref} className="flex items-center gap-1.5 flex-wrap">
      {visibleDepts.map((dept) => {
        const deptUsers = users.filter((u) => u.active && dept.roles.includes(u.role));
        const isActiveDept = scope ? scope.view === dept.view : currentView === dept.view;
        const activeUser = isActiveDept ? (scope?.user ?? null) : null;

        return (
          <div key={dept.key} className="relative">
            <div
              className={`flex items-center rounded-lg border overflow-hidden text-xs font-medium transition-all ${
                isActiveDept
                  ? "border-accent/60 bg-accent/10"
                  : "border-border/60 bg-card hover:border-border"
              }`}
            >
              {/* Dept label — click to view whole team */}
              <button
                onClick={() => { onScope({ view: dept.view, user: null }); setOpenDept(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  isActiveDept ? "text-accent font-semibold" : "text-muted hover:text-foreground"
                }`}
              >
                <span className="text-sm leading-none">{dept.icon}</span>
                <span className="whitespace-nowrap">
                  {activeUser ? (activeUser.name.split(" ")[0] ?? activeUser.name) : dept.label}
                </span>
              </button>

              {/* Dropdown trigger */}
              {deptUsers.length > 0 && (
                <button
                  onClick={() => setOpenDept(openDept === dept.key ? null : dept.key)}
                  className={`px-1.5 py-1.5 border-l transition-colors ${
                    isActiveDept
                      ? "border-accent/20 text-accent hover:bg-accent/15"
                      : "border-border/40 text-muted hover:text-foreground hover:bg-muted/5"
                  }`}
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${openDept === dept.key ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown menu */}
            {openDept === dept.key && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl min-w-[200px] py-1.5 overflow-hidden">
                {/* Team overview row */}
                <button
                  onClick={() => { onScope({ view: dept.view, user: null }); setOpenDept(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-accent/8 ${
                    isActiveDept && !activeUser ? "text-accent font-semibold" : "text-foreground font-medium"
                  }`}
                >
                  <span className="text-base leading-none">{dept.icon}</span>
                  <div className="flex-1 text-left">
                    <div>{dept.label} ทั้งทีม</div>
                    <div className="text-[10px] text-muted font-normal mt-0.5">{deptUsers.length} คน</div>
                  </div>
                  {isActiveDept && !activeUser && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  )}
                </button>

                {deptUsers.length > 0 && (
                  <>
                    <div className="h-px bg-border/50 mx-2 my-1" />
                    <div className="max-h-52 overflow-y-auto">
                      {deptUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { onScope({ view: dept.view, user: u }); setOpenDept(null); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-accent/8 ${
                            activeUser?.id === u.id
                              ? "text-accent bg-accent/5"
                              : "text-muted hover:text-foreground"
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[10px] font-bold shrink-0 text-accent">
                            {(u.name || "?")[0].toUpperCase()}
                          </span>
                          <div className="flex-1 text-left min-w-0">
                            <div className="truncate font-medium">{u.name}</div>
                            <div className="text-[10px] text-muted/70 font-normal">{u.role}</div>
                          </div>
                          {activeUser?.id === u.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Back-to-team button when viewing an individual */}
      {scope?.user && (
        <button
          onClick={() => onScope(scope ? { ...scope, user: null } : null)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-accent/80 hover:text-accent rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          ภาพรวมทีม
        </button>
      )}
    </div>
  );
}
