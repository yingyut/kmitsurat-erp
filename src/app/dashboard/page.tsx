"use client";

import { useEffect, useState } from "react";
import {
  customers,
  activities,
  presaleRequests,
  quotations,
  serviceTickets,
  type Activity,
} from "@/lib/firestore";
import Link from "next/link";

interface Counts {
  customers: number;
  activities: number;
  presale: number;
  quotations: number;
  tickets: number;
}

const cards = [
  { key: "customers" as const, label: "Customers", href: "/customers", color: "bg-blue-600" },
  { key: "activities" as const, label: "Activities", href: "/activity", color: "bg-emerald-600" },
  { key: "presale" as const, label: "Presale Requests", href: "/presale", color: "bg-purple-600" },
  { key: "quotations" as const, label: "Quotations", href: "/quotations", color: "bg-amber-600" },
  { key: "tickets" as const, label: "Service Tickets", href: "/service", color: "bg-rose-600" },
];

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts>({
    customers: 0,
    activities: 0,
    presale: 0,
    quotations: 0,
    tickets: 0,
  });
  const [recent, setRecent] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [c, a, p, q, t, recentAct] = await Promise.all([
          customers.count(),
          activities.count(),
          presaleRequests.count(),
          quotations.count(),
          serviceTickets.count(),
          activities.list(),
        ]);
        setCounts({ customers: c, activities: a, presale: p, quotations: q, tickets: t });
        setRecent(recentAct.slice(0, 5));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {cards.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                className="rounded-xl bg-card border border-border p-5 hover:bg-card-hover transition-colors"
              >
                <p className="text-sm text-muted mb-1">{card.label}</p>
                <p className="text-3xl font-bold">{counts[card.key]}</p>
                <div className={`mt-3 h-1 w-12 rounded ${card.color}`} />
              </Link>
            ))}
          </div>

          <div className="rounded-xl bg-card border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
            {recent.length === 0 ? (
              <p className="text-muted text-sm">
                No activities yet.{" "}
                <Link href="/activity" className="text-accent hover:underline">
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recent.map((act) => (
                  <div
                    key={act.id}
                    className="rounded-lg bg-background p-4 border border-border"
                  >
                    <p className="text-sm whitespace-pre-wrap">{act.text}</p>
                    {act.createdAt && (
                      <p className="text-xs text-muted mt-2">
                        {act.createdAt.toDate().toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
