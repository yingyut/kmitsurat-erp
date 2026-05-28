export type CsvColumn = { key: string; label: string };

export function exportToCsv(filename: string, rows: Record<string, unknown>[], columns: CsvColumn[]) {
  if (!rows.length) { alert("ไม่มีข้อมูลให้ Export"); return; }
  const esc = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" +
    columns.map(c => esc(c.label)).join(",") + "\n" +
    rows.map(r => columns.map(c => esc(r[c.key])).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  function split(line: string): string[] {
    const out: string[] = []; let buf = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i+1] === '"') { buf += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { out.push(buf); buf = ""; }
      else buf += c;
    }
    out.push(buf); return out;
  }
  const headers = split(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = split(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
    return obj;
  });
}
