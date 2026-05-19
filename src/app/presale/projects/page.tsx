"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { presaleMultiProjects, customers } from "@/lib/firestore";
import type { PresaleMultiProject, PresaleProjectStatus, Customer } from "@/lib/firestore";
import { useCurrentUser } from "@/lib/UserContext";

const STATUS_LABEL: Record<PresaleProjectStatus, string> = {
  draft: "Draft",
  in_progress: "กำลังออกแบบ",
  ready: "BOQ พร้อม",
  completed: "เสร็จสิ้น",
};
const STATUS_COLOR: Record<PresaleProjectStatus, string> = {
  draft: "bg-gray-500/15 text-gray-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  ready: "bg-green-500/15 text-green-400",
  completed: "bg-purple-500/15 text-purple-400",
};

const EMPTY: Omit<PresaleMultiProject, "id" | "tenant_id" | "created_at"> = {
  name: "",
  customer_id: "",
  customer_name: "",
  assigned_to: "",
  status: "draft",
  notes: "",
  created_by: "",
};

export default function PresaleProjectsPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const [projects, setProjects] = useState<PresaleMultiProject[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([presaleMultiProjects.list(), customers.list()]).then(([p, c]) => {
      setProjects(p);
      setCustomerList(c);
      setLoading(false);
    });
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name.trim() || !form.customer_id) return;
    setSaving(true);
    await presaleMultiProjects.add({
      ...form,
      created_by: currentUser?.name ?? "",
      status: "draft",
    } as Record<string, unknown>);
    const updated = await presaleMultiProjects.list();
    setProjects(updated);
    setShowModal(false);
    setForm({ ...EMPTY });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบโปรเจกต์นี้?")) return;
    await presaleMultiProjects.remove(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const stats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === "draft").length,
    in_progress: projects.filter((p) => p.status === "in_progress").length,
    ready: projects.filter((p) => p.status === "ready").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Presale Projects</h1>
          <p className="text-sm text-muted/60 mt-0.5">โปรเจกต์ออกแบบ Multi-Tool BOQ</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + สร้างโปรเจกต์ใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {([
          ["ทั้งหมด", stats.total, "text-foreground"],
          ["Draft", stats.draft, "text-gray-400"],
          ["กำลังออกแบบ", stats.in_progress, "text-blue-400"],
          ["BOQ พร้อม", stats.ready, "text-green-400"],
          ["เสร็จสิ้น", stats.completed, "text-purple-400"],
        ] as [string, number, string][]).map(([label, count, cls]) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-xs text-muted/60">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${cls}`}>{count}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="ค้นหาโปรเจกต์ หรือ ลูกค้า..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 bg-card border border-border/50 rounded-lg text-sm"
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted/60">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted/60">
          <p className="text-4xl mb-3">🔧</p>
          <p className="font-medium">ยังไม่มีโปรเจกต์</p>
          <p className="text-sm mt-1">คลิก "สร้างโปรเจกต์ใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted/60 text-xs">
                <th className="text-left px-4 py-3 font-medium">ชื่อโปรเจกต์</th>
                <th className="text-left px-4 py-3 font-medium">ลูกค้า</th>
                <th className="text-left px-4 py-3 font-medium">ผู้รับผิดชอบ</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                <th className="text-right px-4 py-3 font-medium">ราคาขาย</th>
                <th className="text-right px-4 py-3 font-medium">GP%</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/30 hover:bg-muted/5 cursor-pointer transition-colors"
                  onClick={() => router.push(`/presale/projects/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted/80">{p.customer_name}</td>
                  <td className="px-4 py-3 text-muted/80">{p.assigned_to || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.total_selling ? `฿${p.total_selling.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.gp_percent != null ? `${p.gp_percent.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/presale/projects/${p.id}`)}
                      className="px-3 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 mr-2"
                    >
                      เปิด
                    </button>
                    <button
                      onClick={() => p.id && handleDelete(p.id)}
                      className="px-3 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-lg">สร้างโปรเจกต์ใหม่</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted/60 mb-1 block">ชื่อโปรเจกต์ *</label>
                <input
                  className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
                  placeholder="เช่น ออกแบบระบบ CCTV อาคาร A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted/60 mb-1 block">ลูกค้า *</label>
                <select
                  className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
                  value={form.customer_id}
                  onChange={(e) => {
                    const c = customerList.find((x) => x.id === e.target.value);
                    setForm({ ...form, customer_id: e.target.value, customer_name: c?.company_name ?? "" });
                  }}
                >
                  <option value="">-- เลือกลูกค้า --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted/60 mb-1 block">ผู้รับผิดชอบ</label>
                <input
                  className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
                  placeholder="ชื่อ Presale ที่ดูแลโปรเจกต์"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted/60 mb-1 block">หมายเหตุ</label>
                <textarea
                  className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowModal(false); setForm({ ...EMPTY }); }}
                className="flex-1 px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim() || !form.customer_id}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "กำลังสร้าง..." : "สร้างโปรเจกต์"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
