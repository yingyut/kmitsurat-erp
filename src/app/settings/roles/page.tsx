"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  NEW_ROLES, ROLE_PERMISSIONS, ROLE_LABELS, ROLE_COLOR,
  ALL_PERMISSIONS, PERMISSION_META, PERM_CATEGORIES,
} from "@/lib/rbac";
import type { NewRoleName, Permission, PermCategory } from "@/lib/rbac";
import { useCurrentUser } from "@/lib/UserContext";

const CATEGORY_COLOR: Record<PermCategory, string> = {
  "Dashboard":   "bg-blue-500/10 border-blue-500/20 text-blue-400",
  "Sales":       "bg-green-500/10 border-green-500/20 text-green-400",
  "Service":     "bg-rose-500/10 border-rose-500/20 text-rose-400",
  "Presale":     "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  "CRM":         "bg-teal-500/10 border-teal-500/20 text-teal-400",
  "Finance":     "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  "Operations":  "bg-orange-500/10 border-orange-500/20 text-orange-400",
  "Master Data": "bg-purple-500/10 border-purple-500/20 text-purple-400",
  "Admin":       "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
};

export default function RolesPage() {
  const { users, currentUser } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState<NewRoleName>("Administrator");
  const [view, setView] = useState<"matrix" | "detail">("detail");
  const [filterCat, setFilterCat] = useState<PermCategory | "All">("All");

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "Administrator";

  const userCountByRole = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const currentPerms = new Set<Permission>(ROLE_PERMISSIONS[selectedRole] ?? []);

  const displayPerms = filterCat === "All"
    ? ALL_PERMISSIONS
    : ALL_PERMISSIONS.filter(p => PERMISSION_META[p].category === filterCat);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gradient">Role Management</h1>
          <p className="text-xs text-muted/60 mt-0.5">จัดการตำแหน่งและสิทธิ์การเข้าถึงระบบ RBAC (Role-Based Access Control)</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-card border border-border/50 rounded-lg p-1">
            <button onClick={() => setView("detail")} className={`px-3 py-1.5 rounded text-xs font-medium ${view === "detail" ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"}`}>รายละเอียด</button>
            <button onClick={() => setView("matrix")} className={`px-3 py-1.5 rounded text-xs font-medium ${view === "matrix" ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"}`}>Matrix</button>
          </div>
          <Link href="/settings" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Settings</Link>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-3 gap-3">
        {NEW_ROLES.map((role) => {
          const perms = ROLE_PERMISSIONS[role];
          const count = userCountByRole[role] ?? 0;
          const isSelected = selectedRole === role;
          return (
            <button
              key={role}
              onClick={() => { setSelectedRole(role); setView("detail"); }}
              className={`text-left rounded-xl border p-4 transition-all ${isSelected ? "border-accent bg-accent/10" : "border-border/50 bg-card hover:border-accent/40 hover:bg-card-hover"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{role}</p>
                  <p className="text-xs text-muted/60 mt-0.5">{ROLE_LABELS[role]}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${CATEGORY_COLOR["Admin"]}`}>
                  {count} คน
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {PERM_CATEGORIES.filter(cat => perms.some(p => PERMISSION_META[p].category === cat)).map(cat => (
                  <span key={cat} className={`px-1.5 py-0.5 rounded text-[10px] border ${CATEGORY_COLOR[cat]}`}>{cat}</span>
                ))}
              </div>
              <p className="text-[11px] text-muted/50 mt-2">{perms.length} / {ALL_PERMISSIONS.length} permissions</p>
            </button>
          );
        })}
      </div>

      {/* Detail View */}
      {view === "detail" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold">{selectedRole}</h2>
              <span className="text-sm text-muted/60">— {ROLE_LABELS[selectedRole]}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[selectedRole] ?? "bg-muted/20 text-muted"}`}>
                {ROLE_PERMISSIONS[selectedRole].length} permissions
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["All", ...PERM_CATEGORIES] as const).map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat as PermCategory | "All")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${filterCat === cat ? "bg-accent text-white" : "bg-muted/10 text-muted/60 hover:bg-muted/20"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PERM_CATEGORIES.filter(cat => filterCat === "All" || cat === filterCat).map(cat => {
              const catPerms = displayPerms.filter(p => PERMISSION_META[p].category === cat);
              if (catPerms.length === 0) return null;
              const granted = catPerms.filter(p => currentPerms.has(p));
              return (
                <div key={cat} className={`rounded-xl border p-4 ${CATEGORY_COLOR[cat]}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{cat}</h3>
                    <span className="text-[11px] opacity-70">{granted.length} / {catPerms.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {catPerms.map(perm => {
                      const has = currentPerms.has(perm);
                      const meta = PERMISSION_META[perm];
                      return (
                        <div key={perm} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${has ? "bg-white/8" : "opacity-40"}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${has ? "bg-green-500/30 text-green-400" : "bg-muted/20 text-muted/40"}`}>
                            {has ? "✓" : "✕"}
                          </span>
                          <div>
                            <span className="font-medium">{meta.label}</span>
                            <span className="text-muted/60 ml-1.5">— {meta.thai}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400">
              <p className="font-medium">Admin Mode</p>
              <p className="text-yellow-400/70 mt-0.5">การปรับแต่ง Permission แบบ Custom จะรองรับในเวอร์ชันถัดไป — ตอนนี้ใช้ค่าเริ่มต้นที่กำหนดไว้ใน rbac.ts</p>
            </div>
          )}
        </div>
      )}

      {/* Matrix View */}
      {view === "matrix" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/10">
                <th className="text-left px-3 py-2.5 font-semibold border border-border/30 w-48 sticky left-0 bg-card z-10">Permission</th>
                {NEW_ROLES.map(role => (
                  <th key={role} className="px-3 py-2.5 text-center font-medium border border-border/30 min-w-[100px]">
                    <div className="text-[11px]">{role.split(" ")[0]}</div>
                    <div className="text-[10px] text-muted/50">{role.split(" ").slice(1).join(" ")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_CATEGORIES.map(cat => {
                const catPerms = ALL_PERMISSIONS.filter(p => PERMISSION_META[p].category === cat);
                return (
                  <>
                    <tr key={`cat-${cat}`} className="bg-muted/5">
                      <td colSpan={NEW_ROLES.length + 1} className={`px-3 py-1.5 text-[11px] font-bold border border-border/30 ${CATEGORY_COLOR[cat]}`}>
                        {cat}
                      </td>
                    </tr>
                    {catPerms.map(perm => (
                      <tr key={perm} className="hover:bg-muted/5">
                        <td className="px-3 py-1.5 border border-border/20 sticky left-0 bg-card">
                          <div className="font-medium">{PERMISSION_META[perm].label}</div>
                          <div className="text-muted/50">{PERMISSION_META[perm].thai}</div>
                        </td>
                        {NEW_ROLES.map(role => {
                          const has = ROLE_PERMISSIONS[role].includes(perm);
                          return (
                            <td key={role} className="px-3 py-1.5 text-center border border-border/20">
                              <span className={`inline-block w-5 h-5 rounded-full text-[11px] leading-5 ${has ? "bg-green-500/20 text-green-400" : "bg-muted/10 text-muted/30"}`}>
                                {has ? "✓" : ""}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Users per Role */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">ผู้ใช้แยกตาม Role</h3>
        <div className="grid grid-cols-3 gap-2">
          {NEW_ROLES.map(role => {
            const roleUsers = users.filter(u => u.role === role);
            return (
              <div key={role} className="rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLOR[role] ?? "bg-muted/20 text-muted"}`}>{role}</span>
                  <span className="text-xs text-muted/60">{roleUsers.length} คน</span>
                </div>
                {roleUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {roleUsers.slice(0, 5).map(u => (
                      <span key={u.id} className="text-[11px] text-muted/70 bg-muted/10 px-1.5 py-0.5 rounded">{u.nickname || u.name}</span>
                    ))}
                    {roleUsers.length > 5 && <span className="text-[11px] text-muted/50">+{roleUsers.length - 5}</span>}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted/40 italic">ยังไม่มีผู้ใช้</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
