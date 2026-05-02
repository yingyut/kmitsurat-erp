"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Activity {
  id?: string;
  text: string;
  status: string;
  createdAt?: { toDate: () => Date };
}

export default function DashboardPage() {
  const [recent, setRecent] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const { db } = await import("@/lib/firebase");
        const { collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
        const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));

        unsubscribe = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Activity[];
          setRecent(list.slice(0, 10));
          setLoading(false);
        }, (err) => {
          console.error("Realtime error:", err);
          setError(err.message || "Failed to load");
          setLoading(false);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!mounted) return <div className="p-8"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Realtime
          </span>
          <Link href="/activity" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">+ New Activity</Link>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>}
      <div className="rounded-xl bg-card border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : recent.length === 0 ? (
          <p className="text-muted text-sm">No activities yet. <Link href="/activity" className="text-accent hover:underline">Create one</Link></p>
        ) : (
          <div className="space-y-3">
            {recent.map((act) => (
              <div key={act.id} className="rounded-lg bg-background p-4 border border-border">
                <p className="text-sm whitespace-pre-wrap">{act.text}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="rounded-full bg-blue-900/50 px-2.5 py-0.5 text-xs font-medium text-blue-400">{act.status}</span>
                  {act.createdAt && <span className="text-xs text-muted">{act.createdAt.toDate().toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
