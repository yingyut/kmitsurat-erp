"use client";
import { useEffect, useState } from "react";
import type { User, Team } from "@/lib/types";
import { ALL_PERMISSIONS, PERMISSION_META, PERM_CATEGORIES, ROLE_PERMISSIONS, isNewRole, type Permission } from "@/lib/rbac";
import { useCurrentUser } from "@/lib/UserContext";

const roles = [
  "admin", "sale", "presale", "service", "avenger",
  "Administrator", "Branch Manager", "Sales Manager", "Sales Executive",
  "Presales Manager", "Presales Engineer", "Service Manager",
  "Service Technician", "Operations Coordinator", "Coordinator",
] as const;
const roleLabels: Record<string, string> = {
  admin: "Admin (Legacy)", sale: "Sales (Legacy)", presale: "Presale (Legacy)", service: "Service (Legacy)", avenger: "Avenger (Legacy)",
  "Administrator": "ผู้ดูแลระบบ",          "Branch Manager": "ผู้จัดการสาขา",
  "Sales Manager": "ผู้จัดการฝ่ายขาย",     "Sales Executive": "เจ้าหน้าที่ขาย",
  "Presales Manager": "ผู้จัดการพรีเซลล์", "Presales Engineer": "วิศวกรพรีเซลล์",
  "Service Manager": "ผู้จัดการงานบริการ", "Service Technician": "ช่างบริการ",
  "Operations Coordinator": "ผู้ประสานงาน", "Coordinator": "ธุรการ",
};
const roleColor: Record<string, string> = {
  admin: "bg-cyan-900/50 text-cyan-400",      sale: "bg-blue-900/50 text-blue-400",
  presale: "bg-purple-900/50 text-purple-400", service: "bg-rose-900/50 text-rose-400",
  avenger: "bg-orange-900/50 text-orange-400",
  "Administrator": "bg-cyan-900/50 text-cyan-400",
  "Branch Manager": "bg-purple-900/50 text-purple-400",
  "Sales Manager": "bg-blue-900/50 text-blue-400",    "Sales Executive": "bg-blue-800/50 text-blue-300",
  "Presales Manager": "bg-indigo-900/50 text-indigo-400", "Presales Engineer": "bg-indigo-800/50 text-indigo-300",
  "Service Manager": "bg-rose-900/50 text-rose-400",  "Service Technician": "bg-rose-800/50 text-rose-300",
  "Operations Coordinator": "bg-green-900/50 text-green-400", "Coordinator": "bg-amber-900/50 text-amber-400",
};
const teamTypes = ["sales", "presale", "service", "avenger", "admin"] as const;

type DisplayPref = NonNullable<User["display_preference"]>;
const displayPrefLabel: Record<DisplayPref, string> = {
  nickname: "ชื่อเล่น",
  first_name: "ชื่อจริง",
  first_last: "ชื่อ + นามสกุล",
  full: "ชื่อเล่น (ชื่อจริง นามสกุล)",
};

function computeDisplayName(form: { first_name?: string; last_name?: string; nickname?: string; display_preference?: DisplayPref }): string {
  const first = (form.first_name || "").trim();
  const last = (form.last_name || "").trim();
  const nick = (form.nickname || "").trim();
  const pref = form.display_preference || "nickname";
  if (pref === "first_name") return first || nick || last;
  if (pref === "first_last") return [first, last].filter(Boolean).join(" ") || nick;
  if (pref === "full") return nick && (first || last) ? `${nick} (${[first, last].filter(Boolean).join(" ")})` : (nick || [first, last].filter(Boolean).join(" "));
  return nick || first || last;
}

type EmploymentStatus = NonNullable<User["employment_status"]>;
const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatus; label: string; color: string }[] = [
  { value: "active",     label: "ทำงานอยู่",  color: "bg-green-900/50 text-green-400" },
  { value: "on_leave",   label: "ลาพัก",       color: "bg-amber-900/50 text-amber-400" },
  { value: "resigned",   label: "ลาออก",       color: "bg-red-900/50 text-red-400" },
  { value: "terminated", label: "เลิกจ้าง",    color: "bg-red-950/70 text-red-500" },
];

const emptyUser = {
  name: "", first_name: "", last_name: "", nickname: "", display_preference: "nickname" as DisplayPref,
  email: "", role: "sale" as User["role"], position: "", department: "", phone: "", bio: "",
  active: true, employment_status: "active" as EmploymentStatus, resigned_at: "",
  sales_code: "", login_username: "",
  extra_roles: [] as string[],
};

const REAL_TEAM: Array<typeof emptyUser> = [
  { ...emptyUser, nickname: "พี่จอร์ด",  role: "admin",   position: "CEO",                 display_preference: "nickname" },
  { ...emptyUser, nickname: "พี่แนน",     role: "admin",   position: "Manager",             display_preference: "nickname" },
  { ...emptyUser, first_name: "พัชรี", nickname: "น้องก้อย", role: "Coordinator" as User["role"], position: "ธุรการ", display_preference: "nickname" },
  { ...emptyUser, nickname: "ออย",       role: "sale",    position: "Sales",  sales_code: "OY",  display_preference: "nickname" },
  { ...emptyUser, nickname: "แนนน้อย",   role: "sale",    position: "Sales",  sales_code: "NN",  display_preference: "nickname" },
  { ...emptyUser, nickname: "อี๊ฟ",       role: "sale",    position: "Sales",  sales_code: "EVE", display_preference: "nickname" },
  { ...emptyUser, nickname: "บีบี",       role: "sale",    position: "Sales",  sales_code: "BB",  display_preference: "nickname" },
  { ...emptyUser, nickname: "จะจ๋า",      role: "sale",    position: "Sales",  sales_code: "JJ",  display_preference: "nickname" },
  { ...emptyUser, nickname: "พี่กรด",     role: "admin",   position: "Pre-sale", display_preference: "nickname" },
  { ...emptyUser, nickname: "พี่กอร์ฟ",   role: "presale", position: "Pre-sale", display_preference: "nickname" },
  { ...emptyUser, nickname: "น้องมีน",    role: "presale", position: "Pre-sale", display_preference: "nickname" },
  { ...emptyUser, nickname: "ปอน",       role: "service", position: "Service Technician",  display_preference: "nickname" },
  { ...emptyUser, nickname: "ไผ่",        role: "service", position: "Service Technician",  display_preference: "nickname" },
  { ...emptyUser, nickname: "โก้ด",       role: "service", position: "Service Technician",  display_preference: "nickname" },
  { ...emptyUser, nickname: "System Admin", role: "admin", position: "ผู้ดูแลระบบ (System Administrator)", display_preference: "nickname" },
  { ...emptyUser, nickname: "administrator", role: "admin", position: "ผู้ดูแลระบบสูงสุด", login_username: "administrator", display_preference: "nickname" },
];
const emptyTeam = { name: "", type: "sales" as Team["type"] };

export default function UsersPage() {
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const canManage = hasPermission("manage_users");

  const [userList, setUserList] = useState<User[]>([]);
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"users" | "teams">("users");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
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

  // Custom confirm modal (replaces window.confirm — ไม่ทำงานใน Electron)
  const [confirmModal, setConfirmModal] = useState<{ msg: string; onOk: () => void } | null>(null);
  function askConfirm(msg: string, onOk: () => void) { setConfirmModal({ msg, onOk }); }

  // Toast feedback (replaces window.alert)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Permission override modal
  const [permOverrideUser, setPermOverrideUser] = useState<User | null>(null);
  const [permOverrides, setPermOverrides] = useState<string[]>([]);

  function openPermOverride(u: User) {
    setPermOverrideUser(u);
    setPermOverrides(u.permissions_override || []);
  }

  function toggleOverridePerm(perm: Permission) {
    setPermOverrides(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  }

  async function savePermOverride() {
    if (!permOverrideUser) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    // กรอง permission ที่ role ให้อยู่แล้วออก ก่อน save
    const rolePermsNow = new Set<string>(
      isNewRole(permOverrideUser.role)
        ? (ROLE_PERMISSIONS[permOverrideUser.role as keyof typeof ROLE_PERMISSIONS] ?? [])
        : permOverrideUser.role === "admin" ? ALL_PERMISSIONS : []
    );
    const cleanOverrides = permOverrides.filter(p => !rolePermsNow.has(p));
    try {
      await fs.users.update(permOverrideUser.id!, { permissions_override: cleanOverrides });
      await fs.logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", module: "users", action: "update", resource_id: permOverrideUser.id, resource_name: permOverrideUser.name, details: `แก้ไขสิทธิ์พิเศษ: ${permOverrideUser.name} (${cleanOverrides.length} permissions)` });
      setPermOverrideUser(null);
      await load();
    } catch (e) {
      console.error(e);
      showToast("❌ บันทึกไม่สำเร็จ กรุณาลองใหม่", false);
    }
    finally { setSaving(false); }
  }

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [u, t] = await Promise.all([fs.users.list(), fs.teams.list()]);
      setUserList(u); setTeamList(t);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  const filteredUsers = userList.filter((u) => {
    if (!showInactive && !u.active) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.position || "").toLowerCase().includes(s);
  });
  const inactiveCount = userList.filter(u => !u.active).length;

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
      name: user.name,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      nickname: user.nickname || "",
      display_preference: user.display_preference || "nickname",
      email: user.email, role: user.role,
      position: user.position || "", department: user.department || "",
      phone: user.phone || "", bio: user.bio || "", active: user.active,
      employment_status: (user.employment_status || "active") as EmploymentStatus,
      resigned_at: user.resigned_at || "",
      sales_code: user.sales_code || "", login_username: user.login_username || "",
      extra_roles: user.extra_roles || [],
    });
    setShowUserForm(true);
    setSelectedUser(null);
  }

  async function saveUser() {
    const computedName = computeDisplayName(userForm).trim();
    if (!computedName && !userForm.name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const es = userForm.employment_status || "active";
      const derivedActive = es === "active" || es === "on_leave";
      const payload = { ...userForm, name: computedName || userForm.name, active: derivedActive };
      if (editingUserId) {
        await fs.users.update(editingUserId, payload as unknown as Record<string, unknown>);
        await fs.logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", module: "users", action: "update", resource_id: editingUserId, resource_name: computedName || userForm.name, details: `แก้ไขข้อมูลผู้ใช้: ${computedName || userForm.name} (${userForm.role})` });
      } else {
        const ref = await fs.users.add(payload as unknown as Record<string, unknown>);
        await fs.logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", module: "users", action: "create", resource_id: (ref as { id?: string }).id, resource_name: computedName || userForm.name, details: `เพิ่มผู้ใช้ใหม่: ${computedName || userForm.name} (${userForm.role})` });
      }
      setUserForm(emptyUser); setShowUserForm(false); setEditingUserId(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function cleanupOrphans() {
    const validNames = new Set(userList.map(u => u.name).filter(Boolean));
    const ok = (name?: string) => !name || validNames.has(name);
    const fs = await import("@/lib/firestore");
    const [activities, quotas, presaleReqs, serviceTickets, projects] = await Promise.all([
      fs.salesActivities.list(), fs.salesQuotas.list(), fs.presaleRequests.list(),
      fs.serviceTickets.list(), fs.projects.list(),
    ]);
    const orphanActivities = activities.filter(a => !ok(a.assigned_to));
    const orphanQuotas = quotas.filter(q => !ok(q.user_name));
    const orphanPresale = presaleReqs.filter(r => !ok(r.assigned_to));
    const orphanService = serviceTickets.filter(t => !ok(t.technician));
    const orphanProjects = projects.filter(p => !ok(p.assigned_to));
    const totalDelete = orphanActivities.length + orphanQuotas.length + orphanPresale.length + orphanService.length;
    if (totalDelete === 0 && orphanProjects.length === 0) {
      showToast("✓ ไม่พบข้อมูลที่อ้างถึง user เก่า — ระบบสะอาดอยู่แล้ว");
      return;
    }
    const msg = [
      "พบข้อมูลที่อ้างถึง user ที่ไม่มีอยู่ในระบบ:",
      `📞 Sales Activities: ${orphanActivities.length}`,
      `📈 Sales Quotas: ${orphanQuotas.length}`,
      `📋 Presale Tasks: ${orphanPresale.length}`,
      `🔧 Service Tickets: ${orphanService.length}`,
      `📁 Projects unassign: ${orphanProjects.length}`,
      `รวม ${totalDelete} records — ดำเนินการต่อ?`,
    ].join("\n");
    askConfirm(msg, async () => {
      setSaving(true);
      try {
        for (const a of orphanActivities) if (a.id) await fs.salesActivities.remove(a.id);
        for (const q of orphanQuotas) if (q.id) await fs.salesQuotas.remove(q.id);
        for (const r of orphanPresale) if (r.id) await fs.presaleRequests.remove(r.id);
        for (const t of orphanService) if (t.id) await fs.serviceTickets.remove(t.id);
        for (const p of orphanProjects) if (p.id) await fs.projects.update(p.id, { assigned_to: "" });
        showToast(`✓ ล้างเรียบร้อย — ลบ ${totalDelete} records + อัปเดต ${orphanProjects.length} projects`);
        await load();
      } catch (e) { console.error(e); showToast("เกิดข้อผิดพลาด", false); }
      finally { setSaving(false); }
    });
  }

  async function seedRealTeam() {
    const msg = `ตั้งทีมจริง ${REAL_TEAM.length} คน\n⚠ ลบผู้ใช้เดิม ${userList.length} คนทั้งหมดก่อน — ดำเนินการต่อ?`;
    askConfirm(msg, async () => {
      setSaving(true);
      const fs = await import("@/lib/firestore");
      try {
        for (const u of userList) { if (u.id) await fs.users.remove(u.id); }
        for (const t of REAL_TEAM) {
          const computed = computeDisplayName(t).trim();
          await fs.users.add({ ...t, name: computed } as unknown as Record<string, unknown>);
        }
        showToast(`✓ ตั้งทีมเรียบร้อย — เพิ่ม ${REAL_TEAM.length} คน`);
        await load();
      } catch (e) { console.error(e); showToast("เกิดข้อผิดพลาด", false); }
      finally { setSaving(false); }
    });
  }

  function deleteUser(id: string, name: string) {
    askConfirm(
      `ลบผู้ใช้ "${name}" ?\n\nโปรเจคค้างของ ${name} จะถูกปล่อยเป็น "ไม่มีเจ้าของ"`,
      async () => {
        const fs = await import("@/lib/firestore");
        try {
          const allProjects = await fs.projects.list();
          const userProjects = allProjects.filter(p => p.assigned_to === name && !["won", "lost"].includes(p.status));
          await Promise.all(userProjects.map(p =>
            fs.projects.update(p.id!, { assigned_to_inactive: true, ownership_status: "open" as const })
          ));
        } catch (e) { console.error("project flag error", e); }
        await fs.users.remove(id);
        await fs.logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", module: "users", action: "delete", resource_id: id, resource_name: name, details: `ลบผู้ใช้: ${name}` });
        if (selectedUser?.id === id) setSelectedUser(null);
        showToast(`✓ ลบ "${name}" เรียบร้อยแล้ว`);
        await load();
      }
    );
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

  function deleteTeam(id: string, name: string) {
    askConfirm(`ลบทีม "${name}" ?`, async () => {
      const fs = await import("@/lib/firestore");
      await fs.teams.remove(id);
      showToast(`✓ ลบทีม "${name}" เรียบร้อยแล้ว`);
      await load();
    });
  }

  if (!mounted || userLoading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canManage) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="จัดการผู้ใช้และทีม">Users / Teams</h1>
          <p className="text-xs text-muted">จัดการผู้ใช้งานและทีมในระบบ</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} disabled={loading} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover disabled:opacity-50">
          {loading ? "..." : "↺ Refresh"}
        </button>
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
          <div className="flex gap-3 mb-4 flex-wrap">
            <input placeholder="ค้นหาผู้ใช้..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <button onClick={seedRealTeam} disabled={saving} title="ลบผู้ใช้เดิม + เพิ่ม 15 คนตามทีมจริง" className="rounded-lg border border-amber-700 text-amber-400 px-3 py-2 text-xs hover:bg-amber-900/20 disabled:opacity-50">📥 ตั้งทีมจริง (ลบเก่า)</button>
            <button onClick={cleanupOrphans} disabled={saving} title="ล้างข้อมูล activities/quotas/presale/service ที่อ้างถึง user เก่า + เคลียร์ assigned_to ใน projects" className="rounded-lg border border-rose-700 text-rose-400 px-3 py-2 text-xs hover:bg-rose-900/20 disabled:opacity-50">🧹 ล้างข้อมูล user เก่า</button>
            <button onClick={openAddUser} title="เพิ่มผู้ใช้ใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover shrink-0">+ เพิ่มผู้ใช้</button>
          </div>

          {/* User Form (Add/Edit) */}
          {showUserForm && (() => {
            const previewName = computeDisplayName(userForm);
            return (
              <div className="rounded-xl bg-card border border-border p-5 mb-4">
                <h2 className="text-base font-semibold mb-3">{editingUserId ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</h2>

                {/* Names section */}
                <p className="text-xs text-muted uppercase mb-2">ชื่อ</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                  <div>
                    <label className="text-[10px] text-muted">ชื่อจริง</label>
                    <input placeholder="เช่น สมชาย" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">นามสกุล</label>
                    <input placeholder="เช่น ใจดี" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">ชื่อเล่น (รวมคำนำหน้าได้ เช่น "พี่จอร์ด" / "น้องก้อย")</label>
                    <input placeholder="เช่น พี่จอร์ด" value={userForm.nickname} onChange={(e) => setUserForm({ ...userForm, nickname: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                </div>

                {/* Display preference */}
                <div className="mb-3">
                  <label className="text-[10px] text-muted">ใช้ชื่อใดแสดงในระบบ?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                    {(Object.keys(displayPrefLabel) as DisplayPref[]).map(p => (
                      <button key={p} onClick={() => setUserForm({ ...userForm, display_preference: p })} className={`rounded-lg border p-2 text-left text-xs transition-colors ${userForm.display_preference === p ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                        <p className="font-medium">{displayPrefLabel[p]}</p>
                        <p className="text-[10px] text-muted truncate">{computeDisplayName({ ...userForm, display_preference: p }) || "(ว่าง)"}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] mt-2">
                    <span className="text-muted">ชื่อที่จะแสดง: </span>
                    <b className="text-accent">{previewName || "(กรุณากรอกชื่ออย่างน้อย 1 ช่อง)"}</b>
                  </p>
                </div>

                {/* Other info */}
                <p className="text-xs text-muted uppercase mb-2 mt-3">ข้อมูลทั่วไป</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-muted">Role หลัก</label>
                    <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as User["role"], extra_roles: userForm.extra_roles.filter(r => r !== e.target.value) })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                      {roles.map((r) => <option key={r} value={r}>{r} - {roleLabels[r]}</option>)}
                    </select>
                  </div>
                  <div className="col-span-full">
                    <label className="text-[10px] text-muted">บทบาทเพิ่มเติม (เลือกได้หลายอัน)</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {roles.filter(r => r !== userForm.role).map(r => {
                        const checked = userForm.extra_roles.includes(r);
                        return (
                          <label key={r} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer text-xs transition-colors ${checked ? "border-accent bg-accent/20 text-accent" : "border-border text-muted hover:border-accent/50"}`}>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={e => {
                              const next = e.target.checked ? [...userForm.extra_roles, r] : userForm.extra_roles.filter(x => x !== r);
                              setUserForm({ ...userForm, extra_roles: next });
                            }} />
                            {roleLabels[r] || r}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">ตำแหน่ง</label>
                    <input placeholder="เช่น CEO / Manager / Sales" value={userForm.position} onChange={(e) => setUserForm({ ...userForm, position: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">แผนก</label>
                    <input placeholder="แผนก" value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">อีเมล</label>
                    <input placeholder="email@example.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">เบอร์โทร</label>
                    <input placeholder="08x-xxx-xxxx" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Login Username (ภาษาอังกฤษ)</label>
                    <input placeholder="เช่น yingyut, suppaluck" value={userForm.login_username} onChange={(e) => setUserForm({ ...userForm, login_username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "") })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent lowercase font-mono mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">รหัสเซลล์ (3-5 ตัว)</label>
                    <input placeholder="เช่น OY, NN, EVE" maxLength={5} value={userForm.sales_code} onChange={(e) => setUserForm({ ...userForm, sales_code: e.target.value.toUpperCase() })} title="ใช้ใน Document Numbering" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent uppercase font-mono mt-1" />
                  </div>
                  <textarea placeholder="รายละเอียด / Bio" value={userForm.bio} onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
                  <div>
                    <label className="text-[10px] text-muted">สถานะการทำงาน</label>
                    <select value={userForm.employment_status} onChange={e => setUserForm({ ...userForm, employment_status: e.target.value as EmploymentStatus })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                      {EMPLOYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {(userForm.employment_status === "resigned" || userForm.employment_status === "terminated") && (
                      <input type="date" value={userForm.resigned_at} onChange={e => setUserForm({ ...userForm, resigned_at: e.target.value })} placeholder="วันที่ออก" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
                    )}
                    {(userForm.employment_status === "resigned" || userForm.employment_status === "terminated") && (
                      <p className="text-[10px] text-orange-400 mt-1">⚠ บัญชีนี้จะถูกซ่อนจาก Dashboard และ dropdown ทั้งหมด แต่ข้อมูลเก่ายังคงอยู่</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveUser} disabled={saving || !previewName} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editingUserId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
                  <button onClick={() => { setShowUserForm(false); setEditingUserId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
                </div>
              </div>
            );
          })()}

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
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColor[selectedUser.role] || "bg-gray-700"}`}>{roleLabels[selectedUser.role] || selectedUser.role}</span>
                      {(selectedUser.extra_roles ?? []).map(r => (
                        <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-medium opacity-75 ${roleColor[r] || "bg-gray-700/50 text-gray-400"}`}>{roleLabels[r] || r}</span>
                      ))}
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
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs text-muted flex-1">{filteredUsers.length} คน{inactiveCount > 0 && !showInactive && ` (ซ่อน ${inactiveCount} คนที่ลาออก/เลิกจ้าง)`}</p>
            {inactiveCount > 0 && (
              <button onClick={() => setShowInactive(v => !v)} className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${showInactive ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:bg-card-hover"}`}>
                {showInactive ? "ซ่อนคนที่ออกไปแล้ว" : `แสดงคนที่ออกไปแล้ว (${inactiveCount})`}
              </button>
            )}
          </div>
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
                    <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-card-hover cursor-pointer ${!u.active ? "opacity-50" : ""}`} onClick={() => setSelectedUser(u)}>
                      <td className="px-4 py-2.5">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{u.name.charAt(0)}</div>}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{u.name}</td>
                      <td className="px-4 py-2.5 text-muted">{u.position || "-"}</td>
                      <td className="px-4 py-2.5 text-muted">{u.department || "-"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColor[u.role] || "bg-gray-700"}`}>{roleLabels[u.role] || u.role}</span>
                          {(u.extra_roles ?? []).map(r => (
                            <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-medium opacity-75 ${roleColor[r] || "bg-gray-700/50 text-gray-400"}`}>{roleLabels[r] || r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted text-xs">{u.email}</td>
                      <td className="px-4 py-2.5 text-muted text-xs">{u.phone || "-"}</td>
                      <td className="px-4 py-2.5">
                        {(() => {
                          const es = u.employment_status || (u.active ? "active" : "resigned");
                          const opt = EMPLOYMENT_STATUS_OPTIONS.find(o => o.value === es) ?? EMPLOYMENT_STATUS_OPTIONS[0];
                          return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${opt.color}`}>{opt.label}{u.resigned_at && ` · ${u.resigned_at}`}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => openEditUser(u)} title="แก้ไขข้อมูล" className="text-xs text-accent hover:underline">แก้ไข</button>
                          <button onClick={() => openPermOverride(u)} title="กำหนดสิทธิ์พิเศษ" className="text-xs text-purple-400 hover:underline">🛡️</button>
                          <button onClick={() => askConfirm(`รีเซ็ตรหัสผ่าน ${u.name} เป็น P@ssw0rd ?`, async () => { const fs = await import("@/lib/firestore"); await fs.users.update(u.id!, { password: "P@ssw0rd" }); showToast(`✓ รีเซ็ตรหัสผ่าน ${u.nickname || u.name} เป็น P@ssw0rd แล้ว`); })} title="รีเซ็ตรหัสผ่าน" className="text-xs text-warning hover:underline">🔑</button>
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

      {/* ========== TOAST ========== */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl border transition-all ${toast.ok ? "bg-green-900/90 border-green-700 text-green-200" : "bg-rose-900/90 border-rose-700 text-rose-200"}`}>
          {toast.msg}
        </div>
      )}

      {/* ========== CONFIRM MODAL ========== */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl bg-card border border-border p-6 max-w-sm w-full shadow-2xl">
            <p className="text-sm whitespace-pre-line mb-5 leading-relaxed">{confirmModal.msg}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
              <button onClick={() => { const fn = confirmModal.onOk; setConfirmModal(null); fn(); }} className="rounded-lg bg-rose-700 hover:bg-rose-600 px-4 py-2 text-sm font-semibold text-white">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PERMISSION OVERRIDE MODAL ========== */}
      {permOverrideUser && (() => {
        const isLegacy = !isNewRole(permOverrideUser.role);
        const isLegacyAdmin = permOverrideUser.role === "admin";
        const rolePerms = new Set<string>(
          isNewRole(permOverrideUser.role)
            ? (ROLE_PERMISSIONS[permOverrideUser.role as keyof typeof ROLE_PERMISSIONS] ?? [])
            : isLegacyAdmin ? ALL_PERMISSIONS  // admin legacy = ได้ทั้งหมดอยู่แล้ว
            : []
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-bold">สิทธิ์พิเศษ — {permOverrideUser.name}</h2>
                  <p className="text-xs text-muted">Role: <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColor[permOverrideUser.role] || "bg-gray-700"}`}>{permOverrideUser.role}</span> · สิทธิ์พิเศษจะ override เพิ่มเติมจาก role</p>
                </div>
                <button onClick={() => setPermOverrideUser(null)} className="text-muted hover:text-foreground text-lg">✕</button>
              </div>
              {isLegacy && (
                <div className={`px-5 py-3 text-xs border-b border-border ${isLegacyAdmin ? "bg-cyan-900/20 text-cyan-300" : "bg-amber-900/20 text-amber-300"}`}>
                  {isLegacyAdmin
                    ? "⚡ Role นี้เป็น Legacy Admin — ระบบให้สิทธิ์ทั้งหมดอัตโนมัติ สิทธิ์พิเศษด้านล่างไม่จำเป็นต้องตั้ง"
                    : "⚠️ Role นี้เป็น Legacy Role — Permission ถูกกำหนดใน Settings → Permissions (Legacy) สิทธิ์พิเศษนี้จะเพิ่ม permission แบบ granular เท่านั้น"}
                </div>
              )}

              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {PERM_CATEGORIES.map(cat => {
                  const catPerms = ALL_PERMISSIONS.filter(p => PERMISSION_META[p]?.category === cat);
                  if (catPerms.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-muted uppercase mb-2">{cat}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {catPerms.map(perm => {
                          const meta = PERMISSION_META[perm];
                          const fromRole = rolePerms.has(perm);
                          const inOverride = permOverrides.includes(perm);
                          const checked = fromRole || inOverride;
                          return (
                            <label key={perm} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-colors ${fromRole ? "bg-green-900/10 border border-green-800/30" : inOverride ? "bg-accent/10 border border-accent/30" : "bg-background border border-border hover:bg-card-hover"}`}>
                              <input type="checkbox" checked={checked} disabled={fromRole} onChange={() => !fromRole && toggleOverridePerm(perm)} className="mt-0.5 shrink-0 accent-purple-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium leading-snug">{meta?.label ?? perm}</p>
                                <p className="text-[10px] text-muted leading-snug">{meta?.thai}</p>
                                {fromRole && <p className="text-[9px] text-green-400 mt-0.5">✓ จาก Role</p>}
                                {!fromRole && inOverride && <p className="text-[9px] text-accent mt-0.5">✓ สิทธิ์พิเศษ</p>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
                <div>
                  <p className="text-xs text-muted">สิทธิ์พิเศษ: <span className="text-accent font-medium">{permOverrides.filter(p => !rolePerms.has(p)).length} รายการ</span></p>
                  <p className="text-[10px] text-muted/60 mt-0.5">* มีผลเมื่อ user refresh หน้าหรือ login ใหม่</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPermOverrideUser(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
                  <button onClick={savePermOverride} disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
