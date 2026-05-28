"use client";
import { useRef, useState } from "react";
import { exportToCsv, parseCsv, type CsvColumn } from "@/lib/csv";

interface Props {
  filename: string;
  columns: CsvColumn[];
  getData: () => Record<string, unknown>[];
  onImport?: (rows: Record<string, string>[]) => Promise<void>;
  importLabel?: string;
}

export default function CsvImportExport({ filename, columns, getData, onImport, importLabel }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) { alert("ไม่พบข้อมูลในไฟล์"); return; }
    if (!confirm(`พบ ${rows.length} แถว — นำเข้าทั้งหมด?`)) return;
    setImporting(true);
    try { await onImport(rows); alert(`นำเข้า ${rows.length} รายการสำเร็จ`); }
    catch (err) { alert("เกิดข้อผิดพลาด: " + String(err)); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => exportToCsv(filename, getData(), columns)}
        className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors"
        title="ดาวน์โหลดข้อมูลเป็น CSV">
        ⬇ Export
      </button>
      {onImport && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors disabled:opacity-50"
            title={importLabel || "นำเข้าข้อมูลจาก CSV"}>
            {importing ? "..." : "⬆ Import"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}
