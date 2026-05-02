"use client";

import { useEffect, useState } from "react";
import { serviceTickets, type ServiceTicket } from "@/lib/firestore";

export default function ServicePage() {
  const [list, setList] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", issue: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setList(await serviceTickets.list());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form.customer_name.trim() || !form.issue.trim()) return;
    setSaving(true);
    try {
      await serviceTickets.add({
        customer_name: form.customer_name.trim(),
        issue: form.issue.trim(),
        status: "open",
      });
      setForm({ customer_name: "", issue: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: ServiceTicket["status"]) {
    await serviceTickets.update(id, { status });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ticket?")) return;
    await serviceTickets.remove(id);
    await load();
  }

  const statusColor = (s: string) => {
    if (s === "resolved") return "bg-green-900/50 text-green-400";
    if (s === "closed") return "bg-gray-800/50 text-gray-400";
    if (s === "in_progress") return "bg-yellow-900/50 text-yellow-400";
    return "bg-red-900/50 text-red-400";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Service Tickets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Service Ticket</h2>
          <div className="space-y-3 mb-4">
            <input
              placeholder="Customer Name *"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
            <textarea
              placeholder="Describe the issue *"
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
              className="w-full min-h-24 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent resize-y"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.customer_name.trim() || !form.issue.trim()}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Ticket"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-muted">No service tickets yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((ticket) => (
            <div key={ticket.id} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ticket.customer_name}</p>
                  <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{ticket.issue}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id!, e.target.value as ServiceTicket["status"])}
                    className="rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <button
                    onClick={() => handleDelete(ticket.id!)}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
