"use client";
import { useEffect, useState } from "react";
import type { User, Team } from "@/lib/types";

const roles = ["admin","sale","presale","service","avenger"] as const;
const teamTypes = ["sales","presale","service","avenger","admin"] as const;

export default function UsersPage() {
  const [userList, setUserList] = useState<User[]>([]);
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "teams">("users");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "sale" as User["role"], team_id: "", active: true });
  const [teamForm, setTeamForm] = useState({ name: "", type: "sales" as Team["type"] });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function load() {
    const fs = await import("@/lib/firestore");
    try { const [u, t] = await Promise.all([fs.users.list(), fs.teams.list()]); setUserList(u); setTeamList(t); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { setMounted(true); load(); }, []);

  async function saveUser() {
    if (!userForm.name.trim()) return; setSaving(true);
    const { users } = await import("@/lib/firestore");
    try { await users.add(userForm as unknown as Record<string, unknown>); setUserForm({ name: "", email: "", role: "sale", team_id: "", active: true }); setShowUserForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function saveTeam() {
    if (!teamForm.name.trim()) return; setSaving(true);
    const { teams } = await import("@/lib/firestore");
    try { await teams.add(teamForm as unknown as Record<string, unknown>); setTeamForm({ name: "", type: "sales" }); setShowTeamForm(false); await load(); } catch (e) { console.error(e); } finally { setSaving(false); }
  }
  async function delUser(id: string) { if (!confirm("Delete?")) return; const { users } = await import("@/lib/firestore"); await users.remove(id); await load(); }
  async function delTeam(id: string) { if (!confirm("Delete?")) return; const { teams } = await import("@/lib/firestore"); await teams.remove(id); await load(); }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-5" title="จัดการผู้ใช้และทีม">Users / Teams</h1>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("users")} className={`px-4 py-1.5 rounded-lg text-sm ${tab === "users" ? "bg-accent text-white" : "bg-card border border-border text-muted"}`}>Users</button>
        <button onClick={() => setTab("teams")} className={`px-4 py-1.5 rounded-lg text-sm ${tab === "teams" ? "bg-accent text-white" : "bg-card border border-border text-muted"}`}>Teams</button>
      </div>

      {tab === "users" && (<>
        <div className="flex justify-end mb-3"><button onClick={() => setShowUserForm(!showUserForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showUserForm ? "Cancel" : "+ Add User"}</button></div>
        {showUserForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input placeholder="Name *" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as User["role"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <select value={userForm.team_id} onChange={(e) => setUserForm({ ...userForm, team_id: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"><option value="">-- Team --</option>{teamList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
            <button onClick={saveUser} disabled={saving || !userForm.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        )}
        {loading ? <p className="text-muted text-sm">Loading...</p> : (
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted uppercase"><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 w-16"></th></tr></thead>
              <tbody>{userList.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-card-hover"><td className="px-4 py-2.5 font-medium">{u.name}</td><td className="px-4 py-2.5 text-muted">{u.email}</td><td className="px-4 py-2.5"><span className="rounded-full bg-accent/20 text-accent px-2 py-0.5 text-xs">{u.role}</span></td><td className="px-4 py-2.5">{u.active ? <span className="text-green-400 text-xs">Active</span> : <span className="text-muted text-xs">Inactive</span>}</td><td className="px-4 py-2.5"><button onClick={() => delUser(u.id!)} className="text-xs text-danger hover:underline">Del</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </>)}

      {tab === "teams" && (<>
        <div className="flex justify-end mb-3"><button onClick={() => setShowTeamForm(!showTeamForm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">{showTeamForm ? "Cancel" : "+ Add Team"}</button></div>
        {showTeamForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input placeholder="Team Name *" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              <select value={teamForm.type} onChange={(e) => setTeamForm({ ...teamForm, type: e.target.value as Team["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">{teamTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <button onClick={saveTeam} disabled={saving || !teamForm.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        )}
        {loading ? <p className="text-muted text-sm">Loading...</p> : (
          <div className="space-y-2">{teamList.map((t) => (
            <div key={t.id} className="rounded-xl bg-card border border-border p-4 flex justify-between"><div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted">{t.type}</p></div><button onClick={() => delTeam(t.id!)} className="text-xs text-danger hover:underline">Del</button></div>
          ))}</div>
        )}
      </>)}
    </div>
  );
}
