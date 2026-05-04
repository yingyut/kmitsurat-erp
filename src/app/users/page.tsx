"use client";
import { useEffect, useState } from "react";
import type { User, Team } from "@/lib/types";

const roles = ["admin", "sale", "presale", "service", "avenger"] as const;
const roleLabels: Record<string, string> = { admin: "ผู้ดูแลระบบ", sale: "เซลล์", presale: "พรีเซลล์", service: "ช่างบริการ", avenger: "Avenger" };
const roleColor: Record<string, string> = { admin: "bg-cyan-900/50 text-cyan-400", sale: "bg-blue-900/50 text-blue-400", presale: "bg-purple-900/50 text-purple-400", service: "bg-rose-900/50 text-rose-400", avenger: "bg-orange-900/50 text-orange-400" };
const teamTypes = ["sales", "presale", "service", "avenger", "admin"] as const;

const emptyUser = { name: "", email: "", role: "sale" as User["role"], position: "", department: "", phone: "", bio: "", active: true, sales_code: "" };
const emptyTeam = { name: "", type: "sales" as Team["type"] };

export default function UsersPage() {
  const [userList, setUserList] = useState<User[]>([]);
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"users" | "teams">("users");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // User form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState(emptyUser);

  // Team form
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState(emptyTeam);

  // Detail view
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [u, t] = await Promise.all([fs.users.list(), fs.teams.list()]);
      setUserList(u); setTeamList(t);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  const filteredUsers = search
    ? userList.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.position || "").toLowerCase().includes(search.toLowerCase()))
    : userList;

  // === User CRUD ===
  function openAddUser() {
    setEditingUserId(null);
    setUserForm(emptyUser);
    setShowUserForm(true);
    setSelectedUser(null);
  }

  function openEditUser(user: User) {
    setEditingUserId(user.id!);
    setUserForm({
      name: user.name, email: user.email, role: user.role,
      position: user.position || "", department: user.department || "",
      phone: user.phone || "", bio: user.bio || "", active: user.active,
      sales_code: user.sales_code || "",
    });
    setShowUserForm(true);
    setSelectedUser(null);
  }

  async function saveUser() {
    if (!userForm.name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editingUserId) {
        await fs.users.update(editingUserId, userForm as unknown as Record<string, unknown>);
      } else {
        await fs.users.add(userForm as unknown as Record<string, unknown>);
      }
      setUserForm(emptyUser); setShowUserForm(false); setEditingUserId(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`ลบผู้ใช้ "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.users.remove(id);
    if (selectedUser?.id === id) setSelectedUser(null);
    await load();
  }

  // === Team CRUD ===
  function openAddTeam() {
    setEditingTeamId(null); setTeamForm(emptyTeam); setShowTeamForm(true);
  }

  function openEditTeam(team: Team) {
    setEditingTeamId(team.id!);
    setTeamForm({ name: team.name, type: team.type });
    setShowTeamForm(true);
  }

  async function saveTeam() {
    if (!teamForm.name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editingTeamId) {
        await fs.teams.update(editingTeamId, teamForm as unknown as Record<string, unknown>);
      } else {
        await fs.teams.add(teamForm as unknown as Record<string, unknown>);
      }
      setTeamForm(emptyTeam); setShowTeamForm(false); setEditingTeamId(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`ลบทีม "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.teams.remove(id); await load();
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="จัดการผู้ใช้และทีม">Users / Teams</h1>
          <p className="text-xs text-muted">จัดการผู้ใช้งานและทีมในระบบ</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button onClick={() => setTab("users")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "users" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`} title="รายชื่อผู้ใช้">
          Users ({userList.length})
        </button>
        <button onClick={() => setTab("teams")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "teams" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`} title="รายชื่อทีม">
          Teams ({teamList.length})
        </button>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

        {/* ========== USERS TAB ========== */}
        {tab === "users" && (<>
          <div className="flex gap-3 mb-4">
            <input placeholder="ค้นหาผู้ใช้..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <button onClick={openAddUser} title="เพิ่มผู้ใช้ใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover shrink-0">+ เพิ่มผู้ใช้</button>
          </div>

          {/* User Form (Add/Edit) */}
          {showUserForm && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <h2 className="text-base font-semibold mb-3">{editingUserId ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <input placeholder="ชื่อ-นามสกุล *" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input placeholder="อีเมล" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input placeholder="เบอร์โทร" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input placeholder="ตำแหน่ง" value={userForm.position} onChange={(e) => setUserForm({ ...userForm, position: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input placeholder="แผนก" value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <input placeholder="รหัสเซลล์ (Sales Code) เช่น SPLC" maxLength={5} value={userForm.sales_code} onChange={(e) => setUserForm({ ...userForm, sales_code: e.target.value.toUpperCase() })} title="รหัส 3-5 ตัวอักษร ใช้ใน Document Numbering — ตั้งค่าได้ที่ /settings/numbering" className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent uppercase font-mono" />
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as User["role"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  {roles.map((r) => <option key={r} value={r}>{r} - {roleLabels[r]}</option>)}
                </select>
                <textarea placeholder="รายละเอียด / Bio" value={userForm.bio} onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })} id="active-check" />
                  <label htmlFor="active-check" className="text-sm">เปิดใช้งาน (Active)</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveUser} disabled={saving || !userForm.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editingUserId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
                <button onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              </div>
            </div>
          )}

          {/* User Detail Panel */}
          {selectedUser && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {selectedUser.avatar && <img src={selectedUser.avatar} alt={selectedUser.name} className="w-16 h-16 rounded-full" />}
                  <div>
                    <h2 className="text-lg font-bold">{selectedUser.name}</h2>
                    <p className="text-sm text-muted">{selectedUser.position} · {selectedUser.department}</p>
                    <div className="flex gap-3 mt-2 text-xs text-muted">
                      <span title="อีเมล">📧 {selectedUser.email}</span>
                      {selectedUser.phone && <span title="เบอร์โทร">📞 {selectedUser.phone}</span>}
                    </div>
                    {selectedUser.bio && <p className="text-xs text-muted mt-2 max-w-lg">{selectedUser.bio}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditUser(selectedUser)} title="แก้ไข" className="rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-card-hover">แก้ไข</button>
                  <button onClick={() => setSelectedUser(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">ปิด</button>
                </div>
              </div>
            </div>
          )}

          {/* User List */}
          {filteredUsers.length === 0 ? <p className="text-muted text-sm">ไม่พบผู้ใช้</p> : (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted uppercase">
                    <th className="px-4 py-2.5" title="รูปโปรไฟล์"></th>
                    <th className="px-4 py-2.5" title="ชื่อ-นามสกุล">Name</th>
                    <th className="px-4 py-2.5" title="ตำแหน่ง">Position</th>
                    <th className="px-4 py-2.5" title="แผนก">Dept</th>
                    <th className="px-4 py-2.5" title="บทบาท">Role</th>
                    <th className="px-4 py-2.5" title="อีเมล">Email</th>
                    <th className="px-4 py-2.5" title="เบอร์โทร">Phone</th>
                    <th className="px-4 py-2.5" title="สถานะ">Status</th>
                    <th className="px-4 py-2.5 w-28" title="จัดการ">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-card-hover cursor-pointer" onClick={() => setSelectedUser(u)}>
                      <td className="px-4 py-2.5">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{u.name.charAt(0)}</div>}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{u.name}</td>
                      <td className="px-4 py-2.5 text-muted">{u.position || "-"}</td>
                      <td className="px-4 py-2.5 text-muted">{u.department || "-"}</td>
                      <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColor[u.role] || "bg-gray-700"}`}>{u.role}</span></td>
                      <td className="px-4 py-2.5 text-muted text-xs">{u.email}</td>
                      <td className="px-4 py-2.5 text-muted text-xs">{u.phone || "-"}</td>
                      <td className="px-4 py-2.5">{u.active ? <span className="text-green-400 text-xs">Active</span> : <span className="text-red-400 text-xs">Inactive</span>}</td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => openEditUser(u)} title="แก้ไขข้อมูล" className="text-xs text-accent hover:underline">แก้ไข</button>
                          <button onClick={() => deleteUser(u.id!, u.name)} title="ลบผู้ใช้" className="text-xs text-danger hover:underline">ลบ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* ========== TEAMS TAB ========== */}
        {tab === "teams" && (<>
          <div className="flex justify-end mb-4">
            <button onClick={openAddTeam} title="เพิ่มทีมใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มทีม</button>
          </div>

          {/* Team Form (Add/Edit) */}
          {showTeamForm && (
            <div className="rounded-xl bg-card border border-border p-5 mb-4">
              <h2 className="text-base font-semibold mb-3">{editingTeamId ? "แก้ไขทีม" : "เพิ่มทีมใหม่"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input placeholder="ชื่อทีม *" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                <select value={teamForm.type} onChange={(e) => setTeamForm({ ...teamForm, type: e.target.value as Team["type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  {teamTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={saveTeam} disabled={saving || !teamForm.name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editingTeamId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
                <button onClick={() => { setShowTeamForm(false); setEditingTeamId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              </div>
            </div>
          )}

          {/* Team List */}
          {teamList.length === 0 ? <p className="text-muted text-sm">ยังไม่มีทีม กด &quot;+ เพิ่มทีม&quot;</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teamList.map((t) => {
                const members = userList.filter((u) => u.department?.toLowerCase() === t.type || u.role === t.type);
                return (
                  <div key={t.id} className="rounded-xl bg-card border border-border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold">{t.name}</h3>
                        <p className="text-xs text-muted">{t.type} · {members.length} members</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditTeam(t)} title="แก้ไขทีม" className="text-xs text-accent hover:underline">แก้ไข</button>
                        <button onClick={() => deleteTeam(t.id!, t.name)} title="ลบทีม" className="text-xs text-danger hover:underline">ลบ</button>
                      </div>
                    </div>
                    {members.length > 0 && (
                      <div className="space-y-1.5">
                        {members.slice(0, 5).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            {m.avatar ? <img src={m.avatar} alt="" className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent">{m.name.charAt(0)}</div>}
                            <span>{m.name}</span>
                            <span className="text-muted">· {m.position || m.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>)}

      </>)}
    </div>
  );
}
