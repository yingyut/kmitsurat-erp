"use client";
import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import type { Customer, Project, Quotation, ServiceTicket, User } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";
import { isNewRole } from "@/lib/rbac";
import CsvImportExport from "@/components/CsvImportExport";
import { DISTRICTS, SUBDISTRICTS } from "@/lib/thailand-geo";
import type { CustomerIndustry } from "@/lib/types";

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

// ── Sector (ภาคส่วน) — fixed 4 options ──────────────────────────────────────
const ORG_SECTORS = [
  { value: "private",    label: "เอกชน",          color: "bg-emerald-900/50 text-emerald-400" },
  { value: "government", label: "ราชการ/รัฐบาล",   color: "bg-blue-900/50 text-blue-400" },
  { value: "ngo",        label: "NGO/มูลนิธิ",     color: "bg-purple-900/50 text-purple-400" },
  { value: "other",      label: "อื่นๆ",           color: "bg-gray-700 text-gray-400" },
] as const;
const SECTOR_LABEL: Record<string, string> = Object.fromEntries(ORG_SECTORS.map(s => [s.value, s.label]));
const SECTOR_COLOR: Record<string, string> = Object.fromEntries(ORG_SECTORS.map(s => [s.value, s.color]));

// ── Default industries seeded to Firestore on first use ──────────────────────
const DEFAULT_INDUSTRIES: Omit<CustomerIndustry, "id" | "tenant_id">[] = [
  { label: "โรงงาน/อุตสาหกรรม",    sector: "private",    color: "bg-orange-900/50 text-orange-400",  order: 1 },
  { label: "โรงแรม/รีสอร์ท",        sector: "private",    color: "bg-amber-900/50 text-amber-400",    order: 2 },
  { label: "ก่อสร้าง/รับเหมา",      sector: "private",    color: "bg-yellow-900/50 text-yellow-400",  order: 3 },
  { label: "ค้าปลีก/ค้าส่ง",        sector: "private",    color: "bg-cyan-900/50 text-cyan-400",      order: 4 },
  { label: "อสังหาริมทรัพย์",        sector: "private",    color: "bg-lime-900/50 text-lime-400",      order: 5 },
  { label: "ขนส่ง/โลจิสติกส์",      sector: "private",    color: "bg-sky-900/50 text-sky-400",        order: 6 },
  { label: "อาหาร/เครื่องดื่ม",     sector: "private",    color: "bg-rose-900/50 text-rose-400",      order: 7 },
  { label: "เทคโนโลยี/IT",          sector: "private",    color: "bg-indigo-900/50 text-indigo-400",  order: 8 },
  { label: "โรงพยาบาลเอกชน",        sector: "private",    color: "bg-pink-900/50 text-pink-400",      order: 9 },
  { label: "สถานศึกษาเอกชน",        sector: "private",    color: "bg-violet-900/50 text-violet-400",  order: 10 },
  { label: "โรงพยาบาล/สาธารณสุข",   sector: "government", color: "bg-pink-900/50 text-pink-400",      order: 20 },
  { label: "เทศบาล/อบต.",            sector: "government", color: "bg-blue-900/50 text-blue-400",      order: 21 },
  { label: "โรงเรียน/มหาวิทยาลัย",  sector: "government", color: "bg-violet-900/50 text-violet-400",  order: 22 },
  { label: "หน่วยงานรัฐ/กรม/กระทรวง",sector:"government", color: "bg-sky-900/50 text-sky-400",        order: 23 },
  { label: "รัฐวิสาหกิจ",            sector: "government", color: "bg-teal-900/50 text-teal-400",      order: 24 },
  { label: "ทหาร/ตำรวจ",            sector: "government", color: "bg-slate-700 text-slate-300",       order: 25 },
  { label: "NGO/มูลนิธิ",           sector: "ngo",        color: "bg-purple-900/50 text-purple-400",  order: 30 },
];

function getOrgColor(t: string, industries: CustomerIndustry[]): string {
  return industries.find(i => i.label === t)?.color ?? SECTOR_COLOR[t] ?? "bg-gray-700 text-gray-400";
}

const provinces = ["กรุงเทพ","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];

const emptyForm = {
  company_name: "", contact_name: "", phone: "", phone2: "", email: "",
  address: "", province: "สุราษฎร์ธานี", district: "", subdistrict: "",
  org_sector: "private" as string,
  org_type: "" as string,
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
  const [industries, setIndustries]     = useState<CustomerIndustry[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(emptyForm);

  // Company name autocomplete
  const [nameSearch, setNameSearch] = useState("");
  const [nameDropOpen, setNameDropOpen] = useState(false);
  const [dupMatch, setDupMatch] = useState<Customer | null>(null); // exact duplicate found

  // Industry management (Firestore)
  const [newIndustryLabel, setNewIndustryLabel] = useState("");
  async function addIndustry(label: string) {
    const t = label.trim();
    if (!t || industries.some(i => i.label === t)) return;
    const fs = await import("@/lib/firestore");
    await fs.customerIndustries.add({ label: t, sector: form.org_sector || "all", order: 99, active: true } as Record<string, unknown>);
    setForm(f => ({ ...f, org_type: t }));
    setNewIndustryLabel("");
  }
  async function deleteIndustry(id: string) {
    const fs = await import("@/lib/firestore");
    await fs.customerIndustries.remove(id);
  }

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
        fs.customerIndustries.subscribe(data => {
          const sorted = data.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
          setIndustries(sorted);
          // Seed defaults if collection is empty
          if (sorted.length === 0) {
            DEFAULT_INDUSTRIES.forEach(ind => fs.customerIndustries.add(ind as Record<string, unknown>));
          }
        }),
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
      case "org_type": return (a.org_sector ?? "").localeCompare(b.org_sector ?? "", "th") || (a.org_type ?? "").localeCompare(b.org_type ?? "", "th");
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
    setNameSearch(""); setNameDropOpen(false); setDupMatch(null);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id!);
    setForm({
      company_name: c.company_name, contact_name: c.contact_name,
      phone: c.phone, phone2: c.phone2 || "", email: c.email, address: c.address,
      province: c.province || "", district: c.district || "", subdistrict: c.subdistrict || "",
      org_sector: c.org_sector || "private",
      org_type: c.org_type || "",
      tax_id: c.tax_id || "", line_id: c.line_id || "",
      facebook: c.facebook || "", website: c.website || "",
      notes: c.notes,
      assigned_to: c.assigned_to || "",
      co_owners: c.co_owners || [],
    });
    setNameSearch(""); setNameDropOpen(false); setDupMatch(null);
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
        province: form.province, district: form.district, subdistrict: form.subdistrict,
        org_sector: form.org_sector, org_type: form.org_type, notes: form.notes,
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
      setForm(emptyForm); setShowForm(false); setEditId(null); setDupMatch(null); setNameSearch(""); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบลูกค้า "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.customers.remove(id); await load();
  }

  // ── Hover popup data ──────────────────────────────────────────────────────
  function tsToMs(obj: unknown): number | null {
    const ts = (obj as { created_at?: { toMillis?: () => number; seconds?: number } }).created_at;
    if (!ts) return null;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return null;
  }
  function getCustomerSummary(c: Customer) {
    const custProjects = projects.filter(p => p.customer_id === c.id || p.customer_name === c.company_name);
    const custQuots    = quotations.filter(q => q.customer_id === c.id || q.customer_name === c.company_name);
    const custService  = serviceTickets.filter(s => s.customer_id === c.id || s.customer_name === c.company_name);
    const totalValue   = custProjects.reduce((s, p) => s + (p.value || 0), 0);
    const quotValue    = custQuots.reduce((s, q) => s + (q.total_selling || 0), 0);
    const pmJobs       = custService.filter(s => s.type === "pm_service").length;
    const openJobs     = custService.filter(s => !["resolved","closed"].includes(s.status)).length;
    // last contact = most recent quotation or service ticket creation date
    const dates = [...custQuots.map(tsToMs), ...custService.map(tsToMs)].filter((d): d is number => d !== null);
    const lastContactDays = dates.length > 0
      ? Math.floor((Date.now() - Math.max(...dates)) / 86400000)
      : null;
    return { projects: custProjects.length, totalValue, quotations: custQuots.length, quotValue, serviceTotal: custService.length, pmJobs, openJobs, lastContactDays };
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
          {ORG_SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          <optgroup label="กลุ่มธุรกิจ">
            {industries.map(i => <option key={i.id} value={i.label}>{i.label}</option>)}
          </optgroup>
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
          {/* Autocomplete helpers */}
          {(() => {
            const q = nameSearch.toLowerCase();
            return q.length >= 1 ? list.filter(c =>
              (c.id !== editId) && (
                c.company_name.toLowerCase().includes(q) ||
                (c.tax_id ?? "").includes(q)
              )
            ).slice(0, 8) : [];
          })().length > 0 && nameDropOpen && (
            <div className="absolute z-50 mt-[-8px] ml-0 w-80 rounded-xl bg-card border border-border shadow-xl overflow-hidden">
              {(() => {
                const q = nameSearch.toLowerCase();
                return list.filter(c =>
                  (c.id !== editId) && (
                    c.company_name.toLowerCase().includes(q) ||
                    (c.tax_id ?? "").includes(q)
                  )
                ).slice(0, 8).map(c => (
                  <button key={c.id} type="button"
                    onMouseDown={() => {
                      setDupMatch(c);
                      setForm(f => ({ ...f, company_name: c.company_name }));
                      setNameSearch(c.company_name);
                      setNameDropOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-card-hover border-b border-border/30 last:border-0">
                    <p className="font-medium">{c.company_name}</p>
                    <p className="text-[10px] text-muted">{c.province}{c.district ? ` · ${c.district}` : ""}{c.tax_id ? ` · 🪪 ${c.tax_id}` : ""}{c.assigned_to ? ` · 👤 ${c.assigned_to}` : ""}</p>
                  </button>
                ));
              })()}
            </div>
          )}

          {dupMatch && !editId && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm flex items-start gap-3">
              <span className="text-amber-400 mt-0.5">⚠</span>
              <div className="flex-1">
                <p className="font-medium text-amber-300">มีลูกค้าชื่อนี้อยู่แล้ว</p>
                <p className="text-[11px] text-muted mt-0.5">เจ้าของ: {dupMatch.assigned_to || "ไม่ระบุ"} · {dupMatch.province}{dupMatch.district ? ` ${dupMatch.district}` : ""}</p>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => {
                    setForm(f => ({ ...f, company_name: f.company_name + " (สาขา)" }));
                    setDupMatch(null);
                  }} className="rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1 text-xs hover:bg-amber-500/30">
                    + เพิ่มเป็นสาขา
                  </button>
                  <button type="button" onClick={() => setDupMatch(null)} className="rounded-md border border-border text-muted px-2.5 py-1 text-xs hover:bg-card-hover">
                    เพิ่มต่อไป (ชื่อซ้ำ)
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">

            {/* ── Section 1: หน่วยงาน ─────────────────────────── */}
            <div className="col-span-full flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">🏢 ข้อมูลหน่วยงาน</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Company name with autocomplete */}
            <div className="relative">
              <input placeholder="ชื่อบริษัท / หน่วยงาน *"
                value={form.company_name}
                onChange={e => {
                  setForm({...form, company_name: e.target.value});
                  setNameSearch(e.target.value);
                  setNameDropOpen(true);
                  if (dupMatch && e.target.value !== dupMatch.company_name) setDupMatch(null);
                }}
                onFocus={() => { setNameSearch(form.company_name); setNameDropOpen(true); }}
                onBlur={() => setTimeout(() => setNameDropOpen(false), 150)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              {nameDropOpen && nameSearch.length >= 1 && (() => {
                const q = nameSearch.toLowerCase();
                const hits = list.filter(c => (c.id !== editId) && (c.company_name.toLowerCase().includes(q) || (c.tax_id ?? "").includes(q))).slice(0, 8);
                if (!hits.length) return null;
                return (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-card border border-border shadow-xl overflow-hidden">
                    {hits.map(c => (
                      <button key={c.id} type="button"
                        onMouseDown={() => { setDupMatch(c); setForm(f => ({...f, company_name: c.company_name})); setNameSearch(c.company_name); setNameDropOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-card-hover border-b border-border/30 last:border-0">
                        <p className="font-medium truncate">{c.company_name}</p>
                        <p className="text-[10px] text-muted">{c.province}{c.district ? ` · ${c.district}` : ""}{c.tax_id ? ` · 🪪 ${c.tax_id}` : ""}{c.assigned_to ? ` · 👤 ${c.assigned_to}` : ""}</p>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Sector */}
            <select value={form.org_sector} onChange={e => setForm({...form, org_sector: e.target.value, org_type: ""})}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              {ORG_SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Industry (from Firestore) */}
            <div className="space-y-1.5">
              <select value={form.org_type}
                onChange={e => { if (e.target.value !== "__add__") setForm({...form, org_type: e.target.value}); else setNewIndustryLabel(""); }}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="">-- กลุ่มธุรกิจ --</option>
                {industries.filter(i => !i.sector || i.sector === "all" || i.sector === form.org_sector)
                  .map(i => <option key={i.id} value={i.label}>{i.label}</option>)}
                <option value="__add__">+ เพิ่มกลุ่มธุรกิจใหม่…</option>
              </select>
              {(form.org_type === "__add__" || (form.org_type === "" && newIndustryLabel !== "")) && (
                <div className="flex gap-1">
                  <input value={newIndustryLabel} onChange={e => setNewIndustryLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addIndustry(newIndustryLabel); }}}
                    placeholder="ชื่อกลุ่มธุรกิจใหม่…"
                    autoFocus
                    className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => addIndustry(newIndustryLabel)}
                    disabled={!newIndustryLabel.trim()}
                    className="px-3 rounded-lg bg-accent text-white text-sm disabled:opacity-40 hover:bg-accent-hover">+</button>
                </div>
              )}
            </div>
            <input placeholder="เลขที่ผู้เสียภาษี" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เว็บไซต์" value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />

            {/* ── Section 2: ผู้ติดต่อ ─────────────────────────── */}
            <div className="col-span-full flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">👤 ผู้ติดต่อ</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <input placeholder="ชื่อผู้ติดต่อ" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เบอร์โทรหลัก" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เบอร์สำรอง" value={form.phone2} onChange={e => setForm({...form, phone2: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="อีเมล" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="LINE ID" value={form.line_id} onChange={e => setForm({...form, line_id: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="Facebook (URL หรือชื่อ page)" value={form.facebook} onChange={e => setForm({...form, facebook: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />

            {/* ── Section 3: ที่ตั้ง ───────────────────────────── */}
            <div className="col-span-full flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">📍 ที่ตั้ง</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <select value={form.province} onChange={e => setForm({...form, province: e.target.value, district: "", subdistrict: ""})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- จังหวัด --</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.district} onChange={e => setForm({...form, district: e.target.value, subdistrict: ""})}
              className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
              disabled={!form.province || !(DISTRICTS[form.province]?.length)}>
              <option value="">-- อำเภอ --</option>
              {(DISTRICTS[form.province] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {(SUBDISTRICTS[form.district] ?? []).length > 0 ? (
              <select value={form.subdistrict} onChange={e => setForm({...form, subdistrict: e.target.value})}
                className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="">-- ตำบล --</option>
                {(SUBDISTRICTS[form.district] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input placeholder="ตำบล (พิมเอง)" value={form.subdistrict} onChange={e => setForm({...form, subdistrict: e.target.value})}
                disabled={!form.district}
                className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-40" />
            )}
            <input placeholder="ที่อยู่ (บ้านเลขที่ ถนน ฯลฯ)" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full" />

            {/* ── Section 4: CRM ───────────────────────────────── */}
            <div className="col-span-full flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">⚙️ CRM</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {canAssign ? (
              <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="">— เจ้าของลูกค้า —</option>
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

            {canAssign && crmTeam.length > 1 && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted mb-1.5">ทีมร่วมดูแล (Co-owners)</p>
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

            <textarea placeholder="หมายเหตุ" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y mt-1" />
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
                      {c.org_sector && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SECTOR_COLOR[c.org_sector] ?? "bg-gray-700 text-gray-400"}`}>{SECTOR_LABEL[c.org_sector] ?? c.org_sector}</span>}
                      {c.org_type && c.org_type !== c.org_sector && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrgColor(c.org_type, industries)}`}>{c.org_type}</span>}
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
          myCustomers={list.filter(isMine)}
          selectedProvince={provinceFilter}
          onSelectProvince={setProvinceFilter}
          getCustomerSummary={getCustomerSummary}
        />
      </Suspense>

      </>)}
    </div>
  );
}
