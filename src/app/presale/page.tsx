"use client";

import { useEffect, useState } from "react";
import { presaleRequests, type PresaleRequest } from "@/lib/firestore";

export default function PresalePage() {
  const [list, setList] = useState<PresaleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    requirement: "",
    assigned_to: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setList(await presaleRequests.list());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form.customer_name.trim() || !form.requirement.trim()) return;
    setSaving(true);
    try {
      await presaleRequests.add({
        customer_name: form.customer_name.trim(),
        requirement: form.requirement.trim(),
        assigned_to: form.assigned_to.trim(),
        status: "pending",
      });
      setForm({ customer_name: "", requirement: "", assigned_to: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: PresaleRequest["status"]) {
    await presaleRequests.update(id, { status });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this request?")) return;
    await presaleRequests.remove(id);
    await load();
  }

  const statusColor = (s: string) => {
    if (s === "completed") return "bg-green-900/50 text-green-400";
    if (s === "in_progress") return "bg-yellow-900/50 text-yellow-400";
    return "bg-blue-900/50 text-blue-400";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Presale Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {showForm ? "Cancel" : "+ New Request"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Presale Request</h2>
          <div className="space-y-3 mb-4">
            <input
              placeholder="Customer Name *"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
            <textarea
              placeholder="Requirement details *"
              value={form.requirement}
              onChange={(e) => setForm({ ...form, requirement: e.target.value })}
              className="w-full min-h-24 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent resize-y"
            />
            <input
              placeholder="Assigned to"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.customer_name.trim() || !form.requirement.trim()}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Request"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-muted">No presale requests yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((req) => (
            <div key={req.id} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{req.customer_name}</p>
                  <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{req.requirement}</p>
                  {req.assigned_to && (
                    <p className="text-xs text-muted mt-2">Assigned: {req.assigned_to}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={req.status}
                    onChange={(e) => handleStatusChange(req.id!, e.target.value as PresaleRequest["status"])}
                    className="rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(req.status)}`}>
                    {req.status}
                  </span>
                  <button
                    onClick={() => handleDelete(req.id!)}
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
