"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project, SalesActivity, PresaleRequest, ServiceTicket } from "@/lib/types";

type WorkItem = {
  id: string;
  title: string;
  subtitle: string;
  type: "sales" | "presale" | "service" | "project";
  status: string;
  value?: number;
  href: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Counts
  const [newRequests, setNewRequests] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  // Work items list
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [filter, setFilter] = useState<"all" | "sales" | "presale" | "service" | "project">("all");

  async function load() {
    try {
      const fs = await import("@/lib/firestore");
      const [projects, sales, presale, service] = await Promise.all([
        fs.projects.list(),
        fs.salesActivities.list(),
        fs.presaleRequests.list(),
        fs.serviceTickets.list(),
      ]);

      // Build work items
      const items: WorkItem[] = [];

      projects.forEach((p: Project) => {
        items.push({
          id: p.id!,
          title: p.name,
          subtitle: `${p.customer_name} · ${p.type || "Project"}`,
          type: "project",
          status: p.status,
          value: p.value,
          href: "/projects",
        });
      });

      sales.forEach((s: SalesActivity) => {
        items.push({
          id: s.id!,
          title: s.description,
          subtitle: `${s.customer_name} · ${s.project_name || "No project"}`,
          type: "sales",
          status: s.status,
          href: "/sales",
        });
      });

      presale.forEach((r: PresaleRequest) => {
        items.push({
          id: r.id!,
          title: r.requirement,
          subtitle: `${r.customer_name} · ${r.project_name || "No project"}`,
          type: "presale",
          status: r.status,
          href: "/presale",
        });
      });

      service.forEach((t: ServiceTicket) => {
        items.push({
          id: t.id!,
          title: t.issue,
          subtitle: `${t.customer_name} · ${t.technician || "Unassigned"}`,
          type: "service",
          status: t.status,
          href: "/service",
        });
      });

      setWorkItems(items);

      // Counts
      const newStatuses = ["new", "pending", "open", "lead"];
      const progressStatuses = ["in_progress", "opportunity", "proposal", "negotiation"];
      const doneStatuses = ["done", "completed", "resolved", "closed", "won"];

      setNewRequests(items.filter((i) => newStatuses.includes(i.status)).length);
      setInProgress(items.filter((i) => progressStatuses.includes(i.status)).length);
      setCompleted(items.filter((i) => doneStatuses.includes(i.status)).length);
      setTotalValue(projects.reduce((s: number, p: Project) => s + (p.value || 0), 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setMounted(true); load(); }, []);

  async function updateStatus(item: WorkItem, newStatus: string) {
    try {
      const fs = await import("@/lib/firestore");
      const colMap = { sales: fs.salesActivities, presale: fs.presaleRequests, service: fs.serviceTickets, project: fs.projects };
      await colMap[item.type].update(item.id, { status: newStatus });
      await load();
    } catch (e) { console.error(e); }
  }

  const statusOptions: Record<string, string[]> = {
    sales: ["new", "in_progress", "done"],
    presale: ["pending", "in_progress", "completed"],
    service: ["open", "in_progress", "resolved", "closed"],
    project: ["lead", "opportunity", "proposal", "negotiation", "won", "lost"],
  };

  const statusColor = (s: string) => {
    if (["done", "completed", "resolved", "closed", "won"].includes(s)) return "bg-green-900/50 text-green-400";
    if (["in_progress", "opportunity", "proposal", "negotiation"].includes(s)) return "bg-yellow-900/50 text-yellow-400";
    if (["lost"].includes(s)) return "bg-red-900/50 text-red-400";
    return "bg-blue-900/50 text-blue-400";
  };

  const typeColor = (t: string) => {
    if (t === "sales") return "bg-emerald-900/50 text-emerald-400";
    if (t === "presale") return "bg-purple-900/50 text-purple-400";
    if (t === "service") return "bg-rose-900/50 text-rose-400";
    return "bg-indigo-900/50 text-indigo-400";
  };

  const filtered = filter === "all" ? workItems : workItems.filter((i) => i.type === filter);

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" title="แดชบอร์ด - ภาพรวมงานทั้งหมด">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />Online</span>
          <Link href="/sales" title="สร้างกิจกรรมใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ New Activity</Link>
        </div>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted mb-1" title="งานใหม่ที่เข้ามา">New Requests</p>
            <p className="text-3xl font-bold text-blue-400">{newRequests}</p>
            <div className="mt-2 h-1 w-10 rounded bg-blue-600" />
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted mb-1" title="งานที่กำลังดำเนินการ">In Progress</p>
            <p className="text-3xl font-bold text-yellow-400">{inProgress}</p>
            <div className="mt-2 h-1 w-10 rounded bg-yellow-600" />
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted mb-1" title="งานที่เสร็จแล้ว">Completed</p>
            <p className="text-3xl font-bold text-green-400">{completed}</p>
            <div className="mt-2 h-1 w-10 rounded bg-green-600" />
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted mb-1" title="มูลค่ารวมทั้งหมด">Total Value</p>
            <p className="text-2xl font-bold">{totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted">THB</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["all", "sales", "presale", "service", "project"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-accent text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
              {f === "all" ? `All (${workItems.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${workItems.filter((i) => i.type === f).length})`}
            </button>
          ))}
        </div>

        {/* Work Items List */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold" title="รายการงานทั้งหมด">Work Items ({filtered.length})</h2>
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted text-sm p-4">No items found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item) => (
                <div key={`${item.type}-${item.id}`} className="px-4 py-3 hover:bg-card-hover transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={item.href} className="flex-1 min-w-0 group">
                      <p className="text-sm font-medium group-hover:text-accent truncate">{item.title}</p>
                      <p className="text-xs text-muted mt-0.5">{item.subtitle}</p>
                      {item.value != null && item.value > 0 && (
                        <p className="text-xs text-green-400 mt-0.5">{item.value.toLocaleString()} THB</p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor(item.type)}`}>{item.type}</span>
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item, e.target.value)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none ${statusColor(item.status)}`}
                      >
                        {statusOptions[item.type].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}
