"use client";
import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import type { Customer, Project, Quotation, ServiceTicket } from "@/lib/types";

const ThailandMap = lazy(() => import("@/components/ThailandMap"));

const orgTypes = ["government", "private", "education", "hospital", "hotel", "other"] as const;
const orgLabels: Record<string, string> = { government: "หน่วยงานราชการ", private: "เอกชน", education: "สถานศึกษา", hospital: "โรงพยาบาล", hotel: "โรงแรม", other: "อื่นๆ" };
const orgColor: Record<string, string> = { government: "bg-blue-900/50 text-blue-400", private: "bg-emerald-900/50 text-emerald-400", education: "bg-purple-900/50 text-purple-400", hospital: "bg-rose-900/50 text-rose-400", hotel: "bg-amber-900/50 text-amber-400", other: "bg-gray-700 text-gray-400" };

const provinces = ["กรุงเทพ","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];


const emptyForm = { company_name: "", contact_name: "", phone: "", email: "", address: "", province: "สุราษฎร์ธานี", org_type: "private" as Customer["org_type"], notes: "" };

export default function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "province" | "org_type">("newest");
  const [saving, setSaving] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Hover popup
  const [hoverCust, setHoverCust] = useState<Customer | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [c, p, q, s] = await Promise.all([fs.customers.list(), fs.projects.list(), fs.quotations.list(), fs.serviceTickets.list()]);
      setList(c); setProjects(p); setQuotations(q); setServiceTickets(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  // Filters
  const filtered = list.filter(c => {
    const matchSearch = search ? (c.company_name.toLowerCase().includes(search.toLowerCase()) || c.contact_name.toLowerCase().includes(search.toLowerCase()) || (c.province || "").includes(search)) : true;
    const matchProv = provinceFilter === "all" ? true : c.province === provinceFilter;
    const matchOrg = orgFilter === "all" ? true : c.org_type === orgFilter;
    return matchSearch && matchProv && matchOrg;
  });

  // Sort
  function getCreatedTime(c: Customer): number {
    const ts = (c as unknown as { created_at?: { toMillis?: () => number; seconds?: number } }).created_at;
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return 0;
  }
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "newest": return getCreatedTime(b) - getCreatedTime(a);
      case "oldest": return getCreatedTime(a) - getCreatedTime(b);
      case "name_asc": return (a.company_name || "").localeCompare(b.company_name || "", "th");
      case "name_desc": return (b.company_name || "").localeCompare(a.company_name || "", "th");
      case "province": return (a.province || "").localeCompare(b.province || "", "th");
      case "org_type": return (orgLabels[a.org_type] || a.org_type || "").localeCompare(orgLabels[b.org_type] || b.org_type || "", "th");
      default: return 0;
    }
  });

  // Provinces that have customers
  const usedProvinces = [...new Set(list.map(c => c.province).filter(Boolean))].sort();

  // Province count for filter dropdown
  const provinceCount: Record<string, number> = {};
  list.forEach(c => { if (c.province) provinceCount[c.province] = (provinceCount[c.province] || 0) + 1; });

  // CRUD
  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(c: Customer) {
    setEditId(c.id!);
    setForm({ company_name: c.company_name, contact_name: c.contact_name, phone: c.phone, email: c.email, address: c.address, province: c.province || "", org_type: c.org_type || "other", notes: c.notes });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.company_name.trim()) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      if (editId) { await fs.customers.update(editId, form as unknown as Record<string, unknown>); }
      else { await fs.customers.add(form as unknown as Record<string, unknown>); }
      setForm(emptyForm); setShowForm(false); setEditId(null); await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบลูกค้า "${name}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.customers.remove(id); await load();
  }

  // Hover popup data
  function getCustomerSummary(c: Customer) {
    const custProjects = projects.filter(p => p.customer_id === c.id || p.customer_name === c.company_name);
    const custQuots = quotations.filter(q => q.customer_id === c.id || q.customer_name === c.company_name);
    const custService = serviceTickets.filter(s => s.customer_id === c.id || s.customer_name === c.company_name);
    const totalValue = custProjects.reduce((s, p) => s + (p.value || 0), 0);
    const quotValue = custQuots.reduce((s, q) => s + (q.total_selling || 0), 0);
    const pmJobs = custService.filter(s => s.type === "pm_service").length;
    const openJobs = custService.filter(s => !["resolved", "closed"].includes(s.status)).length;
    return { projects: custProjects.length, totalValue, quotations: custQuots.length, quotValue, serviceTotal: custService.length, pmJobs, openJobs };
  }

  function handleMouseEnter(e: React.MouseEvent, c: Customer) {
    setHoverCust(c);
    setHoverPos({ x: e.clientX, y: e.clientY });
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="รายชื่อลูกค้า">Customers</h1>
          <p className="text-xs text-muted">จัดการข้อมูลลูกค้าทั้งหมด</p>
        </div>
        <button onClick={openAdd} title="เพิ่มลูกค้าใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ เพิ่มลูกค้า</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input placeholder="ค้นหาลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px] rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)} title="กรองตามจังหวัด" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกจังหวัด</option>
          {usedProvinces.map(p => <option key={p} value={p}>{p} ({provinceCount[p]})</option>)}
        </select>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} title="กรองตามประเภทหน่วยงาน" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="all">ทุกประเภท</option>
          {orgTypes.map(t => <option key={t} value={t}>{orgLabels[t]}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} title="จัดเรียง" className="rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="newest">เรียง: ใหม่ที่สุด</option>
          <option value="oldest">เรียง: เก่าที่สุด</option>
          <option value="name_asc">ชื่อ A → Z (ก-ฮ)</option>
          <option value="name_desc">ชื่อ Z → A (ฮ-ก)</option>
          <option value="province">จังหวัด ก-ฮ</option>
          <option value="org_type">ประเภทหน่วยงาน</option>
        </select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-4">
          <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <input placeholder="ชื่อบริษัท / หน่วยงาน *" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="ชื่อผู้ติดต่อ" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="เบอร์โทร" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <input placeholder="อีเมล" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- จังหวัด --</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.org_type} onChange={e => setForm({ ...form, org_type: e.target.value as Customer["org_type"] })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              {orgTypes.map(t => <option key={t} value={t}>{orgLabels[t]}</option>)}
            </select>
            <input placeholder="ที่อยู่" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full" />
            <textarea placeholder="หมายเหตุ" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent col-span-full min-h-16 resize-y" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.company_name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>

      {/* Customer Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden mb-5">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">รายชื่อลูกค้า ({sorted.length})</p>
          <p className="text-[10px] text-muted">เรียงโดย: {({newest:"ใหม่ที่สุด",oldest:"เก่าที่สุด",name_asc:"ชื่อ ก-ฮ",name_desc:"ชื่อ ฮ-ก",province:"จังหวัด",org_type:"ประเภท"} as Record<string,string>)[sortBy]}</p>
        </div>
        {sorted.length === 0 ? <p className="text-muted text-sm p-4">ไม่พบลูกค้า</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-2.5 cursor-pointer hover:text-accent" title="คลิกเพื่อเรียงตามชื่อ" onClick={() => setSortBy(sortBy === "name_asc" ? "name_desc" : "name_asc")}>
                Company {sortBy === "name_asc" ? "▲" : sortBy === "name_desc" ? "▼" : ""}
              </th>
              <th className="px-4 py-2.5" title="ผู้ติดต่อ">Contact</th>
              <th className="px-4 py-2.5" title="เบอร์โทร">Phone</th>
              <th className="px-4 py-2.5 cursor-pointer hover:text-accent" title="คลิกเพื่อเรียงตามจังหวัด" onClick={() => setSortBy("province")}>
                Province {sortBy === "province" ? "▲" : ""}
              </th>
              <th className="px-4 py-2.5 cursor-pointer hover:text-accent" title="คลิกเพื่อเรียงตามประเภท" onClick={() => setSortBy("org_type")}>
                Type {sortBy === "org_type" ? "▲" : ""}
              </th>
              <th className="px-4 py-2.5 w-28" title="จัดการ">Actions</th>
            </tr></thead>
            <tbody>{sorted.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card-hover relative"
                onMouseEnter={e => handleMouseEnter(e, c)} onMouseLeave={() => setHoverCust(null)}>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/customers/${c.id}`} className="hover:text-accent hover:underline">{c.company_name}</Link>
                </td>
                <td className="px-4 py-2.5 text-muted">{c.contact_name}</td>
                <td className="px-4 py-2.5 text-muted">{c.phone}</td>
                <td className="px-4 py-2.5 text-muted">{c.province || "-"}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${orgColor[c.org_type] || "bg-gray-700"}`}>{orgLabels[c.org_type] || c.org_type}</span></td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <Link href={`/customers/${c.id}`} title="ดูประวัติทั้งหมด — QT / Project / Service" className="text-xs text-blue-400 hover:underline">📋 ประวัติ</Link>
                    <button onClick={() => openEdit(c)} title="แก้ไข" className="text-xs text-accent hover:underline">แก้ไข</button>
                    <button onClick={() => handleDelete(c.id!, c.company_name)} title="ลบ" className="text-xs text-danger hover:underline">ลบ</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Hover Popup */}
      {hoverCust && (() => {
        const s = getCustomerSummary(hoverCust);
        return (
          <div className="fixed z-[100] rounded-xl bg-card border border-border shadow-2xl p-4 w-72 pointer-events-none"
            style={{ left: Math.min(hoverPos.x + 15, window.innerWidth - 300), top: Math.min(hoverPos.y - 10, window.innerHeight - 250) }}>
            <p className="font-semibold text-sm mb-2">{hoverCust.company_name}</p>
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

      {/* Thailand Map */}
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

