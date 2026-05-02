"use client";

import { useEffect, useState } from "react";

export default function ActivityPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setSuccess(false);
    setError("");
    try {
      const { activities } = await import("@/lib/firestore");
      await activities.add({ text: text.trim(), tenant_id: "kmitsurat", status: "new" });
      setText("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return <div className="p-8"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">New Activity</h1>
      <div className="rounded-xl bg-card border border-border p-6">
        {success && <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-sm text-green-400">Activity saved successfully!</div>}
        {error && <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>}
        <textarea
          placeholder={"Paste your sales notes here...\nExample: Visited ABC school, they want WiFi + CCTV, contact teacher Somchai 089xxxx"}
          value={text}
          onChange={(e) => { setText(e.target.value); if (success) setSuccess(false); if (error) setError(""); }}
          className="mb-4 min-h-40 w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent resize-y"
        />
        <button onClick={handleSave} disabled={saving || !text.trim()} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
