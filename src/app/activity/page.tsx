"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activities } from "@/lib/firestore";

export default function ActivityPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await activities.add({ text: text.trim() });
      router.push("/dashboard");
    } catch (err) {
      console.error("Save failed:", err);
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">New Activity</h1>

      <div className="rounded-xl bg-card border border-border p-6">
        <textarea
          placeholder="Paste your sales notes here...&#10;Example: Visited ABC school, they want WiFi + CCTV, contact teacher Somchai 089xxxx"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mb-4 min-h-40 w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent resize-y"
        />
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
