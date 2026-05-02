"use client";
import { useState } from "react";

const reports = [
  { name: "Sales Activities Report", desc: "All sales activities with filters by date, user, customer" },
  { name: "Quotation Summary", desc: "Quotation list with total selling, GP%, status breakdown" },
  { name: "Service Tickets Report", desc: "Service history by customer, technician, type" },
  { name: "Product Price List", desc: "Current product catalog with cost and selling prices" },
  { name: "Customer Summary", desc: "Customer list with project count and total revenue" },
  { name: "Project Pipeline", desc: "Projects by status with value summary" },
];

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useState(() => { setMounted(true); });

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-5" title="รายงาน / ส่งออกข้อมูล">Reports / Export</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <div key={r.name} className="rounded-xl bg-card border border-border p-5">
            <p className="text-sm font-medium mb-1">{r.name}</p>
            <p className="text-xs text-muted mb-3">{r.desc}</p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">Export CSV</button>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">Export Excel</button>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-card-hover">Export PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
