"use client";
import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import type { Customer, Project, Quotation, ServiceTicket, User } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import CsvImportExport from "@/components/CsvImportExport";

const CUST_COLS = [
  { key: "company_name", label: "ชื่อบริษัท/องค์กร" },
  { key: "contact_name", label: "ผู้ติดต่อ" },
  { key: "phone",        label: "โทรศัพท์" },
  { key: "email",        label: "อีเมล" },
  { key: "address",      label: "ที่อยู่" },
  { key: "province",     label: "จังหวัด" },
  { key: "org_type",     label: "ประเภท" },
  { key: "assigned_to",  label: "เจ้าของ" },
  { key: "notes",        label: "หมายเหตุ" },
];

const ThailandMap = lazy(() => import("@/components/ThailandMap"));

const orgTypes = ["government", "private", "education", "hospital", "hotel", "other"] as const;
const orgLabels: Record<string, string> = { government: "หน่วยงานราชการ", private: "เอกชน", education: "สถานศึกษา", hospital: "โรงพยาบาล", hotel: "โรงแรม", other: "อื่นๆ" };
const orgColor: Record<string, string> = { government: "bg-blue-900/50 text-blue-400", private: "bg-emerald-900/50 text-emerald-400", education: "bg-purple-900/50 text-purple-400", hospital: "bg-rose-900/50 text-rose-400", hotel: "bg-amber-900/50 text-amber-400", other: "bg-gray-700 text-gray-400" };

const provinces = ["กรุงเทพ","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];

const emptyForm = {
  company_name: "", contact_name: "", phone: "", phone2: "", email: "",
  address: "", province: "สุราษฎร์ธานี",
  org_type: "private" as Customer["org_type"],
  tax_id: "", line_id: "", facebook: "", website: "",
  notes: "",
  assigned_to: "",
  co_owners: [] as string[],
};

export default function CustomersPage() {
  const { currentUser, hasPermission } = useCurrentUser();
  const [list, setList]                 = useState<Customer[]>([]);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [quotations, setQuotations]     = useState<Quotation[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [users, setUsers]               = useState<User[]>([]);
  const [loading, setLoading]           = useState(true);
  const [mounted, setMounted]           = useState(false);
  const [search, setSearch]             = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [orgFilter, setOrgFilter]       = useState("all");
  const [sortBy, setSortBy]             = useState<"newest"|"oldest"|"name_asc"|"name_desc"|"province"|"org_type">("newest");
  const [ownerFilter, setOwnerFilter]   = useState<"mine"|"team"|"all">("mine");
  const [saving, setSaving]             = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(emptyForm);

  // Hover popup
  const [hoverCust, setHoverCust] = useState<Customer | null>(null);
  const [hoverPos, setHoverPos]   = useState({ x: 0, y: 0 });

  // no-op — ข้อมูลอัปเดตอัตโนมัติผ่าน onSnapshot subscriptions
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function load() {}

  useEffect(() => {
    setMounted(true);
    const unsubs: Array<() => void> = [];
    let firstSnap = true;
    (async () => {
      const fs = await import("@/lib/firestore");
      unsubs.push(
        fs.customers.subscribe(data => {
          setList(data);
          if (firstSnap) { setLoading(false); firstSnap = false; }
        }),
        fs.projects.subscribe(data => setProjects(data)),
        fs.quotations.subscribe(data => setQuotations(data)),
        fs.serviceTickets.subscribe(data => setServiceTickets(data)),
        fs.users.subscribe(data => setUsers(data.filter(x => x.active !== false))),
      );
    })();
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Permission flags ──────────────────────────────────────────────────────
  // Legacy admin/avenger = full access. New roles checked via permission matrix.
  // Legacy sale/presale/service are treated as Sales Executive (own-only by default).
  const isLegacyAdmin = ["admin", "avenger"].includes(currentUser?.role ?? "");
  const canViewAll  = isLegacyAdmin || (isNewRole(currentUser?.role ?? "") && hasPermission("view_all_customers"));
  const canViewTeam = canViewAll ||
    (isNewRole(currentUser?.role ?? "") && hasPermission("view_all_projects")) ||
    ["sale", "presale", "service"].includes(currentUser?.role ?? ""); // legacy sales see team view
  const canAssign   = canViewAll; // only managers/admins may reassign owners

  // CRM team (sales + presales) — for owner dropdown + team filter
  const crmRoles = ["sale","avenger","Sales Executive","Sales Manager","Branch Manager","Presales Manager","Presales Engineer"];
  const crmTeam = users.filter(u =>
    u.active !== false &&
    (crmRoles.includes(u.role) || (u.extra_roles ?? []).some(r => crmRoles.includes(r)))
  );
  const crmTeamNames = new Set(crmTeam.map(u => u.name));

  // Clamp ownerFilter to what the current user is permitted to see
  const effectiveFilter: "mine"|"team"|"all" =
    canViewAll  ? ownerFilter :
    canViewTeam ? (ownerFilter === "all" ? "team" : ownerFilter) :
    "mine";

  // ── Ownership helpers ────────────────────────────────────────────────────
  function isMine(c: Customer): boolean {
    const me = currentUser?.name ?? "";
    if (!me) return false;
    if (c.assigned_to === me) return true;
    if (c.created_by === me) return true;
    if ((c.co_owners ?? []).includes(me)) return true;
    // Cross-sale: project assigned to me for this customer
    return projects.some(p => (p.customer_id === c.id || p.customer_name === c.company_name) && p.assigned_to === me);
  }

  function isTeam(c: Customer): boolean {
    if (!c.assigned_to) {
      return projects.some(p => (p.customer_id === c.id || p.customer_name === c.company_name) && crmTeamNames.has(p.assigned_to ?? ""));
    }
    return crmTeamNames.has(c.assigned_to) || (c.co_owners ?? []).some(co => crmTeamNames.has(co));
  }

  function getOwnerName(c: Customer): string {
    if (c.assigned_to) return c.assigned_to;
    return projects.find(p => p.customer_id === c.id || p.customer_name === c.company_name)?.assigned_to ?? "";
  }

  // Ownership-based base list
  const mineCount = list.filter(isMine).length;
  const teamCount = list.filter(isTeam).length;
  const allCount  = list.length;

  const baseList = (() => {
    if (effectiveFilter === "mine") return list.filter(isMine);
    if (effectiveFilter === "team") return list.filter(isTeam);
    return list;
  })();

  // ── Secondary filters ─────────────────────────────────────────────────────
  const filtered = baseList.filter(c => {
    const matchSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.contact_name.toLowerCase().includes(search.toLowerCase()) || (c.province ?? "").includes(search);
    const matchProv   = provinceFilter === "all" || c.province === provinceFilter;
    const matchOrg    = orgFilter === "all" || c.org_type === orgFilter;
    return matchSearch && matchProv && matchOrg;
  });

  function getCreatedTime(c: Customer): number {
    const ts = (c as unknown as { created_at?: { toMillis?: () => number; seconds?: number } }).created_at;
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return 0;
  }
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "newest":   return getCreatedTime(b) - getCreatedTime(a);
      case "oldest":   return getCreatedTime(a) - getCreatedTime(b);
      case "name_asc": return (a.company_name ?? "").localeCompare(b.company_name ?? "", "th");
      case "name_desc":return (b.company_name ?? "").localeCompare(a.company_name ?? "", "th");
      case "province": return (a.province ?? "").localeCompare(b.province ?? "", "th");
      case "org_type": return (orgLabels[a.org_type] ?? a.org_type ?? "").localeCompare(orgLabels[b.org_type] ?? b.org_type ?? "", "th");
      default: return 0;
    }
  });

  const usedProvinces = [...new Set(baseList.map(c => c.province).filter(Boolean))].sort() as string[];
  const provinceCount: Record<string, number> = {};
  baseList.forEach(c => { if (c.province) provinceCount[c.province] = (provinceCount[c.province] || 0) + 1; });

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, assigned_to: canViewAll ? "" : (currentUser?.name ?? "") });
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id!);
    setForm({
      company_name: c.company_name, contact_name: c.contact_name,
      phone: c.phone, phone2: c.phone2 || "", email: c.email, address: c.address,
      province: c.province || "", org_type: c.org_type || "other",
      tax_id: c.tax_id || "", line_id: c.line_id || "",
      facebook: c.facebook || "", website: c.website || "",
      notes: c.notes,
      assigned_to: c.assigned_to || "",
      co_owners: c.co_owners || [],
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.company_name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const saveData: Record<string, unknown> = {
        company_name: form.company_name, contact_name: form.contact_name,
        phone: form.phone, phone2: form.phone2, email: form.email, address: form.address,
        province: form.province, org_type: form.org_type, notes: form.notes,
        tax_id: form.tax_id, line_id: form.line_id,
        facebook: form.facebook, website: form.website,
        assigned_to: form.assigned_to || (!canViewAll ? (currentUser?.name ?? "") : ""),
        co_owners: form.co_owners.filter(Boolean),
      };
      if (!editId) saveData.created_by = currentUser?.name ?? "";
      if (editId) {
        await fs.customers.update(editId, saveData);
      } else {
        const docRef = await fs.customers.add(saveData);
        try {
          const { logActivity } = await import("@/lib/firestore");
          await logActivity({ user_name: currentUser?.name ?? "", user_role: currentUser?.role ?? "", action: "create", module: "customers", resource_id: (docRef as { id?: string }).id, resource_name: form.company_name, details: `สร้างลูกค้า: ${form.company_name}` });
        } catch {}
      }
      setForm(emptyForm); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบลูกค้า "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.customers.remove(id); await load();
  }

  // ── Hover popup data ──────────────────────────────────────────────────────
  function getCustomerSummary(c: Customer) {
    const custProjects = projects.filter(p => p.customer_id === c.id || p.customer_name === c.company_name);
    const custQuots    = quotations.filter(q => q.customer_id === c.id || q.customer_name === c.company_name);
    const custService  = serviceTickets.filter(s => s.customer_id === c.id || s.customer_name === c.company_name);
    const totalValue   = custProjects.reduce((s, p) => s + (p.value || 0), 0);
    const quotValue    = custQuots.reduce((s, q) => s + (q.total_selling || 0), 0);
    const pmJobs       = custService.filter(s => s.type === "pm_service").length;
    const openJobs     = custService.filter(s => !["resolved","closed"].includes(s.status)).length;
    return { projects: custProjects.length, totalValue, quotations: custQuots.length, quotValue, serviceTotal: custService.length, pmJobs, openJobs };
  }

  function handleMouseEnter(e: React.MouseEvent, c: Customer) {
    setHoverCust(c); setHoverPos({ x: e.clientX, y: e.clientY });
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  // Show "Owner" column to anyone who can see team/all, or in any view if there are co_owners
  const showOwnerCol = canViewTeam || canViewAll;

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-xs text-muted">จัดการข้อมูลลูกค้าทั้งหมด</p>
        </div>
        <button onClick={openAdd} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มลูกค้า</button>
      </div>

      {/* ── Ownership tabs ── */}
      <div className="flex gap-1 mb-4 rounded-xl bg-card border border-border p-1 w-fit">
        <button onClick={() => setOwnerFilter("mine")}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${effectiveFilter==="mine" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
          👤 ของฉัน ({mineCount})
        </button>
        {(canViewTeam || canViewAll) && (
          <button onClick={() => setOwnerFilter("team")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${effectiveFilter==="team" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            👥 ทีม ({teamCount})
          </button>
        )}
        {canViewAll && (
          <button onClick={() => setOwnerFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${effectiveFilter==="all" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            🌐 ทั้งหมด ({allCount})
          </button>
        )}
      </div>

      {/* ── Secondary filters ── */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input placeholder="ค้นหาลูกค้า..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกจังหวัด</option>
          {usedProvinces.map(p => <option key={p} value={p}>{p} ({provinceCount[p]})</option>)}
        </select>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกประเภท</option>
          {orgTypes.map(t => <option key={t} value={t}>{orgLabels[t]}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="newest">เรียง: ใหม่ที่สุด</option>
          <option value="oldest">เรียง: เก่าที่สุด</option>
          <option value="name_asc">ชื่อ A → Z (ก-ฮ)</option>
          <option value="name_desc">ชื่อ Z → A (ฮ-ก)</option>
          <option value="province">จังหวัด ก-ฮ</option>
          <option value="org_type">ประเภทหน่วยงาน</option>
        </select>
        <CsvImportExport
          filename={`customers-${new Date().toISOString().slice(0,10)}`}
          columns={CUST_COLS}
          getData={() => list as unknown as Record<string, unknown>[]}
          onImport={async (rows) => {
            const fs = await import("@/lib/firestore");
            const labelToKey = Object.fromEntries(CUST_COLS.map(c => [c.label, c.key]));
            for (const row of rows) {
              const obj: Record<string, unknown> = {};
              for (const [h, v] of Object.entries(row)) { obj[labelToKey[h] ?? h] = v; }
              if (!obj.company_name) continue;
              await fs.customers.add(obj);
            }
            await load();
          }}
        />
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <input placeholder="ชื่อบริษัท / หน่วยงาน *" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="ชื่อผู้ติดต่อ" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เบอร์โทร" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เบอร์สำรอง" value={form.phone2} onChange={e => setForm({...form, phone2: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="อีเมล" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เลขที่ผู้เสียภาษี" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="LINE ID" value={form.line_id} onChange={e => setForm({...form, line_id: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Facebook (URL หรือชื่อ page)" value={form.facebook} onChange={e => setForm({...form, facebook: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เว็บไซต์" value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.province} onChange={e => setForm({...form, province: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- จังหวัด --</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.org_type} onChange={e => setForm({...form, org_type: e.target.value as Customer["org_type"]})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              {orgTypes.map(t => <option key={t} value={t}>{orgLabels[t]}</option>)}
            </select>

            {/* ── Owner assignment ── */}
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-muted uppercase tracking-wide">เจ้าของลูกค้า (Owner)</p>
              {canAssign ? (
                <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="">— ไม่ระบุ —</option>
                  {crmTeam.map(u => (
                    <option key={u.id ?? u.name} value={u.name}>{u.nickname || u.name} · {u.role}</option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg bg-background/50 border border-border/50 px-3 py-2 text-sm text-muted flex items-center justify-between">
                  <span>{form.assigned_to || currentUser?.name || "—"}</span>
                  <span className="text-[10px] text-muted/50">(ถูกกำหนดให้คุณ)</span>
                </div>
              )}
            </div>

            {/* ── Co-owners (shared CRM) — managers only ── */}
            {canAssign && crmTeam.length > 1 && (
              <div className="col-span-full">
                <p className="text-[10px] text-muted uppercase tracking-wide mb-1.5">ทีมร่วมดูแล (Co-owners)</p>
                <div className="flex flex-wrap gap-1.5">
                  {crmTeam.filter(u => u.name !== form.assigned_to).map(u => {
                    const on = form.co_owners.includes(u.name);
                    return (
                      <button key={u.id ?? u.name} type="button"
                        onClick={() => setForm(f => ({...f, co_owners: on ? f.co_owners.filter(n => n !== u.name) : [...f.co_owners, u.name]}))}
                        className={`rounded-full px-2.5 py-1 text-[11px] border transition-all ${on ? "bg-accent/20 border-accent/40 text-accent" : "border-border text-muted hover:border-accent/30 hover:text-foreground"}`}>
                        {on ? "✓ " : ""}{u.nickname || u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <input placeholder="ที่อยู่" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full" />
            <textarea placeholder="หมายเหตุ" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.company_name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "บันทึก"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* ── Customer Table ── */}
      <div className="rounded-xl bg-card border border-border overflow-hidden mb-5">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">รายชื่อลูกค้า ({sorted.length})</p>
            {effectiveFilter === "mine" && <span className="text-[10px] border border-accent/30 text-accent rounded-full px-2 py-0.5">👤 ของฉัน</span>}
            {effectiveFilter === "team" && <span className="text-[10px] border border-border text-muted rounded-full px-2 py-0.5">👥 ทีม</span>}
          </div>
          <p className="text-[10px] text-muted">เรียงโดย: {({"newest":"ใหม่ที่สุด","oldest":"เก่าที่สุด","name_asc":"ชื่อ ก-ฮ","name_desc":"ชื่อ ฮ-ก","province":"จังหวัด","org_type":"ประเภท"} as Record<string,string>)[sortBy]}</p>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted text-sm">ไม่พบลูกค้า</p>
            {effectiveFilter === "mine" && <p className="text-xs text-muted/60 mt-1">ลองเปลี่ยนไปดูแบบ "ทีม" หรือ "ทั้งหมด"</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th className="px-4 py-2.5 cursor-pointer hover:text-accent" onClick={() => setSortBy(sortBy==="name_asc"?"name_desc":"name_asc")}>
                  Company {sortBy==="name_asc"?"▲":sortBy==="name_desc"?"▼":""}
                </th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5 cursor-pointer hover:text-accent" onClick={() => setSortBy("province")}>
                  Province {sortBy==="province"?"▲":""}
                </th>
                <th className="px-4 py-2.5 cursor-pointer hover:text-accent" onClick={() => setSortBy("org_type")}>
                  Type {sortBy==="org_type"?"▲":""}
                </th>
                {showOwnerCol && <th className="px-4 py-2.5">Owner</th>}
                <th className="px-4 py-2.5 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const ownerName  = getOwnerName(c);
                const coOwners   = c.co_owners ?? [];
                const mine       = isMine(c);
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover"
                    onMouseEnter={e => handleMouseEnter(e, c)} onMouseLeave={() => setHoverCust(null)}>
                    <td className="px-4 py-2.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/customers/${c.id}`} className="hover:text-accent hover:underline">{c.company_name}</Link>
                        {mine && effectiveFilter !== "mine" && <span className="text-[9px] text-accent" title="ลูกค้าของฉัน">●</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.contact_name}</td>
                    <td className="px-4 py-2.5 text-muted">{c.phone}</td>
                    <td className="px-4 py-2.5 text-muted">{c.province || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${orgColor[c.org_type] || "bg-gray-700"}`}>{orgLabels[c.org_type] || c.org_type}</span>
                    </td>
                    {showOwnerCol && (
                      <td className="px-4 py-2.5">
                        {ownerName ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] rounded-full bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 font-medium">
                              {ownerName.split(" ")[0]}
                            </span>
                            {coOwners.length > 0 && (
                              <span className="text-[9px] text-muted" title={coOwners.join(", ")}>+{coOwners.length}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted/40">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex gap-1 items-center flex-wrap">
                        <Link href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-card-hover px-2 py-1 text-[11px] font-medium text-muted hover:text-accent hover:border-accent/40 transition-colors whitespace-nowrap">
                          📋 ประวัติ
                        </Link>
                        <button onClick={() => openEdit(c)}
                          className="inline-flex items-center rounded-md border border-border/60 bg-card-hover px-2 py-1 text-[11px] font-medium text-muted hover:text-accent hover:border-accent/40 transition-colors whitespace-nowrap">
                          ✏️ แก้ไข
                        </button>
                        {canViewAll && (
                          <button onClick={() => handleDelete(c.id!, c.company_name)}
                            className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors whitespace-nowrap">
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Hover Popup ── */}
      {hoverCust && (() => {
        const s = getCustomerSummary(hoverCust);
        const ownerName = getOwnerName(hoverCust);
        return (
          <div className="fixed z-[100] rounded-xl bg-card border border-border shadow-2xl p-4 w-72 pointer-events-none"
            style={{ left: Math.min(hoverPos.x + 15, window.innerWidth - 300), top: Math.min(hoverPos.y - 10, window.innerHeight - 270) }}>
            <p className="font-semibold text-sm mb-1">{hoverCust.company_name}</p>
            {ownerName && (
              <p className="text-[10px] text-accent mb-2">
                👤 {ownerName}
                {(hoverCust.co_owners ?? []).length > 0 && ` + ${hoverCust.co_owners!.join(", ")}`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-muted">โปรเจค</p><p className="font-semibold">{s.projects} งาน</p></div>
              <div><p className="text-muted">มูลค่ารวม</p><p className="font-semibold text-green-400">{s.totalValue.toLocaleString()} ฿</p></div>
              <div><p className="text-muted">ใบเสนอราคา</p><p className="font-semibold">{s.quotations} ใบ ({s.quotValue.toLocaleString()} ฿)</p></div>
              <div><p className="text-muted">งานบริการ</p><p className="font-semibold">{s.serviceTotal} งาน</p></div>
              <div><p className="text-muted">PM/MA</p><p className="font-semibold text-amber-400">{s.pmJobs} งาน</p></div>
              <div><p className="text-muted">งานค้าง</p><p className={`font-semibold ${s.openJobs > 0 ? "text-red-400" : "text-green-400"}`}>{s.openJobs} งาน</p></div>
            </div>
          </div>
        );
      })()}

      {/* ── Thailand Map ── */}
      <Suspense fallback={<div className="h-[500px] rounded-xl bg-card border border-border flex items-center justify-center"><p className="text-muted text-sm">Loading map...</p></div>}>
        <ThailandMap
          customers={list}
          selectedProvince={provinceFilter}
          onSelectProvince={setProvinceFilter}
          getCustomerSummary={getCustomerSummary}
        />
      </Suspense>

      </>)}
    </div>
  );
}
