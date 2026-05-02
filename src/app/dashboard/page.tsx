"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Counts { customers: number; projects: number; sales: number; presale: number; service: number; quotations: number; products: number; }
const cards: { key: keyof Counts; label: string; href: string; color: string }[] = [
  { key: "customers", label: "Customers", href: "/customers", color: "bg-blue-600" },
  { key: "projects", label: "Projects", href: "/projects", color: "bg-indigo-600" },
  { key: "sales", label: "Sales Activities", href: "/sales", color: "bg-emerald-600" },
  { key: "presale", label: "Presale Requests", href: "/presale", color: "bg-purple-600" },
  { key: "service", label: "Service Tickets", href: "/service", color: "bg-rose-600" },
  { key: "quotations", label: "Quotations", href: "/quotations", color: "bg-amber-600" },
  { key: "products", label: "Products", href: "/products", color: "bg-cyan-600" },
];

interface RecentActivity { id?: string; description: string; type: string; customer_name: string; status: string; }

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts>({ customers: 0, projects: 0, sales: 0, presale: 0, service: 0, quotations: 0, products: 0 });
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const fs = await import("@/lib/firestore");
        const [c, p, s, pr, sv, q, pd] = await Promise.all([
          fs.customers.list(), fs.projects.list(), fs.salesActivities.list(),
          fs.presaleRequests.list(), fs.serviceTickets.list(), fs.quotations.list(), fs.products.list(),
        ]);
        setCounts({ customers: c.length, projects: p.length, sales: s.length, presale: pr.length, service: sv.length, quotations: q.length, products: pd.length });
        setRecent(s.slice(0, 5) as RecentActivity[]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />Online</span>
          <Link href="/sales" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ New Activity</Link>
        </div>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
          {cards.map((c) => (
            <Link key={c.key} href={c.href} className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-colors">
              <p className="text-xs text-muted mb-1">{c.label}</p>
              <p className="text-2xl font-bold">{counts[c.key]}</p>
              <div className={`mt-2 h-1 w-10 rounded ${c.color}`} />
            </Link>
          ))}
        </div>

        <div className="rounded-xl bg-card border border-border p-5">
          <h2 className="text-base font-semibold mb-3">Recent Sales Activities</h2>
          {recent.length === 0 ? <p className="text-muted text-sm">No activities yet. <Link href="/sales" className="text-accent hover:underline">Create one</Link></p> : (
            <div className="space-y-2">{recent.map((a) => (
              <div key={a.id} className="rounded-lg bg-background p-3 border border-border">
                <p className="text-sm">{a.description}</p>
                <p className="text-xs text-muted mt-1">{a.type} &middot; {a.customer_name} &middot; <span className={a.status === "done" ? "text-green-400" : "text-blue-400"}>{a.status}</span></p>
              </div>
            ))}</div>
          )}
        </div>
      </>)}
    </div>
  );
}
