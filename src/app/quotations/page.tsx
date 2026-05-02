"use client";

import { useEffect, useState } from "react";
import { quotations, type Quotation } from "@/lib/firestore";

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

const emptyItem: LineItem = { description: "", qty: 1, unit_price: 0 };

export default function QuotationsPage() {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setList(await quotations.list());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalPrice = items.reduce((sum, i) => sum + i.qty * i.unit_price, 0);

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!customerName.trim() || items.length === 0) return;
    setSaving(true);
    try {
      await quotations.add({
        customer_name: customerName.trim(),
        items: items.filter((i) => i.description.trim()),
        total_price: totalPrice,
        status: "draft",
      });
      setCustomerName("");
      setItems([{ ...emptyItem }]);
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: Quotation["status"]) {
    await quotations.update(id, { status });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this quotation?")) return;
    await quotations.remove(id);
    await load();
  }

  const statusColor = (s: string) => {
    if (s === "accepted") return "bg-green-900/50 text-green-400";
    if (s === "sent") return "bg-blue-900/50 text-blue-400";
    if (s === "rejected") return "bg-red-900/50 text-red-400";
    return "bg-gray-800/50 text-gray-400";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quotations</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {showForm ? "Cancel" : "+ New Quotation"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Quotation</h2>
          <input
            placeholder="Customer Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mb-4 w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
          />

          <p className="text-sm font-medium mb-2">Line Items</p>
          <div className="space-y-2 mb-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                  className="w-20 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unit_price}
                  onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                  className="w-28 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
                />
                <span className="w-24 text-right text-sm text-muted">
                  {(item.qty * item.unit_price).toLocaleString()}
                </span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-danger text-sm">
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addItem} className="text-sm text-accent hover:underline mb-4 block">
            + Add item
          </button>

          <div className="flex items-center justify-between">
            <p className="font-semibold">Total: {totalPrice.toLocaleString()} THB</p>
            <button
              onClick={handleSave}
              disabled={saving || !customerName.trim()}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Quotation"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-muted">No quotations yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((q) => (
            <div key={q.id} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{q.customer_name}</p>
                  <p className="text-xs text-muted mt-1">
                    {q.items.length} item{q.items.length !== 1 ? "s" : ""} &middot;{" "}
                    Total: {q.total_price.toLocaleString()} THB
                  </p>
                  <div className="mt-2 space-y-1">
                    {q.items.map((item, i) => (
                      <p key={i} className="text-xs text-muted">
                        {item.description} &times; {item.qty} @ {item.unit_price.toLocaleString()}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={q.status}
                    onChange={(e) => handleStatusChange(q.id!, e.target.value as Quotation["status"])}
                    className="rounded bg-background border border-border px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(q.status)}`}>
                    {q.status}
                  </span>
                  <button
                    onClick={() => handleDelete(q.id!)}
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
