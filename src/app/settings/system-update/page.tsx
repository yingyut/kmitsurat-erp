"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Commit = {
  hash: string; short: string; message: string; date: string; author: string; isCurrent: boolean;
};
type VersionInfo = {
  hash: string; short: string; message: string; date: string; author: string; newCommits: number; error?: string;
};

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso; }
}

export default function SystemUpdatePage() {
  const [version, setVersion]   = useState<VersionInfo | null>(null);
  const [commits, setCommits]   = useState<Commit[]>([]);
  const [log, setLog]           = useState<string[]>([]);
  const [busy, setBusy]         = useState(false);
  const [status, setStatus]     = useState("");
  const [polling, setPolling]   = useState(false);
  const [vLoading, setVLoading] = useState(true);
  const logRef  = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadVersion = useCallback(async () => {
    setVLoading(true);
    try {
      const r = await fetch("/api/system/version");
      if (r.ok) setVersion(await r.json());
    } catch {}
    setVLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/system/history");
      if (r.ok) { const d = await r.json(); setCommits(d.commits ?? []); }
    } catch {}
  }, []);

  const refreshLog = useCallback(async () => {
    try {
      const r = await fetch("/api/system/log");
      if (r.ok) { const d = await r.json(); setLog(d.lines ?? []); }
    } catch {}
  }, []);

  useEffect(() => { loadVersion(); loadHistory(); refreshLog(); }, [loadVersion, loadHistory, refreshLog]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function startPolling() {
    setPolling(true);
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      try {
        const r = await fetch("/api/system/log");
        if (r.ok) {
          const d = await r.json();
          const lines: string[] = d.lines ?? [];
          setLog(lines);
          const last = lines[lines.length - 1] ?? "";
          if (last.includes("=== Deploy finished") || last.includes("=== Rollback finished")) {
            clearInterval(pollRef.current!);
            setPolling(false);
            setBusy(false);
            setStatus("✓ เสร็จแล้ว! Server กำลัง restart...");
            setTimeout(() => { loadVersion(); loadHistory(); }, 12000);
            return;
          }
        }
      } catch {}
      if (count > 90) {
        clearInterval(pollRef.current!);
        setPolling(false);
        setBusy(false);
        setStatus("Timeout — กรุณาตรวจสอบ server โดยตรง");
      }
    }, 2000);
  }

  async function handleUpdate() {
    if (!confirm("อัปเดตระบบเป็น version ล่าสุดจาก GitHub?\n\nServer จะ restart ประมาณ 2 นาที")) return;
    setBusy(true);
    setStatus("กำลัง trigger update...");
    setLog([]);
    try {
      const r = await fetch("/api/system/update", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setStatus("Started! กำลังดู deploy log...");
      startPolling();
    } catch (e: unknown) {
      setStatus("Error: " + String(e));
      setBusy(false);
    }
  }

  async function handleRollback(c: Commit) {
    if (!confirm(`Rollback ไปที่ commit ${c.short}?\n\n"${c.message}"\n\nServer จะ restart ประมาณ 2 นาที`)) return;
    setBusy(true);
    setStatus(`กำลัง rollback ไปที่ ${c.short}...`);
    setLog([]);
    try {
      const r = await fetch("/api/system/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: c.hash }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setStatus(`Rollback to ${c.short} started! กำลังดู log...`);
      startPolling();
    } catch (e: unknown) {
      setStatus("Error: " + String(e));
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">🔄 System Update / Version Control</h1>
          <p className="text-xs text-muted">อัปเดตระบบจาก GitHub หรือย้อนกลับ version เดิมได้ทันที</p>
        </div>
        <Link href="/settings" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Settings</Link>
      </div>

      {/* Current version card */}
      <div className="rounded-xl bg-card border border-border p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Current Version</p>
            {vLoading ? (
              <p className="text-sm text-muted animate-pulse">กำลังโหลด...</p>
            ) : version?.error ? (
              <p className="text-sm text-danger">ไม่สามารถอ่าน git info: {version.error}</p>
            ) : version ? (
              <>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <code className="text-sm font-mono bg-muted/10 px-2.5 py-0.5 rounded-lg">{version.short}</code>
                  {version.newCommits > 0 ? (
                    <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                      ⬆ {version.newCommits} commit{version.newCommits > 1 ? "s" : ""} ใหม่รอ update
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">✓ เป็น version ล่าสุด</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate mb-1">{version.message}</p>
                <p className="text-xs text-muted">{fmtDate(version.date)} · {version.author}</p>
              </>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={handleUpdate} disabled={busy}
              className="rounded-xl bg-accent text-white px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              {busy ? "⏳ กำลังดำเนินการ..." : "🔄 Update Now"}
            </button>
            <button onClick={() => { loadVersion(); loadHistory(); }} disabled={busy}
              className="rounded-xl border border-border px-5 py-2 text-xs text-muted hover:bg-card-hover transition-colors whitespace-nowrap">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Status bar */}
        {status && (
          <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-mono ${status.startsWith("Error") ? "border-danger/40 bg-danger/5 text-danger" : status.startsWith("✓") ? "border-success/40 bg-success/5 text-success" : "border-border bg-muted/5 text-muted"}`}>
            {polling && <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse mr-2" />}
            {status}
          </div>
        )}
      </div>

      {/* Version history + rollback */}
      <div className="rounded-xl bg-card border border-border mb-5">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">📜 Version History</h2>
            <p className="text-[10px] text-muted">กด Rollback เพื่อย้อนกลับ version ที่ต้องการ</p>
          </div>
          <button onClick={loadHistory} className="text-xs text-muted hover:text-accent transition-colors">↻ Refresh</button>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {commits.length === 0 ? (
            <p className="p-5 text-sm text-muted text-center">กำลังโหลด history...</p>
          ) : (
            commits.map((c, i) => (
              <div key={c.hash}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${c.isCurrent ? "bg-success/5" : i % 2 === 0 ? "" : "bg-card-hover/40"}`}>
                {/* indicator */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${c.isCurrent ? "bg-success ring-2 ring-success/30" : "bg-border"}`} />
                {/* hash */}
                <code className="text-[11px] font-mono text-muted w-14 shrink-0">{c.short}</code>
                {/* message + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{c.message}</p>
                  <p className="text-[10px] text-muted">{fmtDate(c.date)} · {c.author}</p>
                </div>
                {/* action */}
                {c.isCurrent ? (
                  <span className="text-[10px] font-bold text-success px-2.5 py-1 rounded-full bg-success/10 whitespace-nowrap shrink-0">
                    ● Current
                  </span>
                ) : (
                  <button onClick={() => handleRollback(c)} disabled={busy}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-warning/50 text-warning hover:bg-warning/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0">
                    ↩ Rollback
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deploy log */}
      <div className="rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">📋 Deploy Log</h2>
            <p className="text-[10px] text-muted">บันทึกการ deploy / rollback ล่าสุด</p>
          </div>
          <div className="flex items-center gap-3">
            {polling && (
              <span className="text-[10px] font-semibold text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" /> Live
              </span>
            )}
            <button onClick={refreshLog} className="text-xs text-muted hover:text-accent transition-colors">↻ Refresh</button>
          </div>
        </div>
        <div ref={logRef} className="h-72 overflow-y-auto p-4 rounded-b-xl" style={{ fontFamily: "monospace", fontSize: "11px", background: "var(--card-hover)" }}>
          {log.length === 0 ? (
            <p className="text-muted/50">Log จะแสดงเมื่อมีการ deploy หรือ rollback...</p>
          ) : (
            log.map((line, i) => {
              const cls =
                line.includes("[ERROR]") || line.includes("ERROR") ? "text-danger" :
                line.includes("=== Deploy finished") || line.includes("=== Rollback finished") ? "text-success font-bold" :
                line.includes("===") ? "text-accent font-bold" :
                line.includes("[OK]") || line.includes("✓") ? "text-success" :
                line.includes("npm warn") || line.includes("WARN") ? "text-warning" :
                "text-muted";
              return (
                <div key={i} className={`leading-5 ${cls}`}>{line}</div>
              );
            })
          )}
        </div>
      </div>

      {/* Info panel */}
      <div className="mt-5 rounded-xl border border-border bg-muted/5 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted">
        <div>
          <p className="font-semibold text-foreground mb-1">🔄 Update</p>
          <p>ดึงโค้ดล่าสุดจาก GitHub → build → restart อัตโนมัติ ใช้เวลา ~2 นาที</p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">↩ Rollback</p>
          <p>ย้อนกลับไป commit ที่เลือก → build → restart หากมีปัญหากับ version ล่าสุด</p>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">⚠️ หมายเหตุ</p>
          <p>ระหว่าง build server จะไม่ตอบสนอง ~1-2 นาที — แนะนำทำนอกเวลางาน</p>
        </div>
      </div>
    </div>
  );
}
