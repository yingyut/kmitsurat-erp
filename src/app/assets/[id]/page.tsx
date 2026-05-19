"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Asset, ServiceTicket, ServiceContract } from "@/lib/firestore";
import { useCurrentUser } from "@/lib/UserContext";

const STATUS_LABEL: Record<string, string> = {
  active: "ใช้งาน", inactive: "ไม่ใช้งาน", maintenance: "ซ่อมบำรุง", decommissioned: "ปลดระวาง",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-900/50 text-green-400",
  inactive: "bg-gray-700 text-gray-400",
  maintenance: "bg-yellow-900/50 text-yellow-400",
  decommissioned: "bg-red-900/50 text-red-400",
};
const TICKET_STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-900/50 text-blue-400",
  in_progress: "bg-yellow-900/50 text-yellow-400",
  resolved: "bg-green-900/50 text-green-400",
  closed: "bg-gray-700 text-gray-400",
};

function warrantyDaysLeft(end?: string) {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}

function WarrantyBadge({ end }: { end?: string }) {
  if (!end) return <span className="text-muted text-xs">—</span>;
  const days = warrantyDaysLeft(end)!;
  if (days < 0) return <span className="rounded-full px-2.5 py-1 text-xs bg-red-900/50 text-red-400">หมดประกันแล้ว ({Math.abs(days)} วันที่ผ่านมา)</span>;
  if (days <= 90) return <span className="rounded-full px-2.5 py-1 text-xs bg-yellow-900/50 text-yellow-400">ประกันหมดใน {days} วัน</span>;
  return <span className="rounded-full px-2.5 py-1 text-xs bg-green-900/50 text-green-400">ประกัน OK — เหลือ {days} วัน</span>;
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""} ${value ? "" : "text-muted"}`}>{value || "—"}</p>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, hasPermission, loading: userLoading } = useCurrentUser();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const canManage = hasPermission("manage_assets");
  const canView = hasPermission("view_assets") || canManage;

  useEffect(() => {
    setMounted(true);
    (async () => {
      const fs = await import("@/lib/firestore");
      const a = await fs.assets.get(id);
      setAsset(a);
      if (a) {
        // Load tickets for this customer, then filter by km_number or asset_id
        const allTickets = await fs.serviceTickets.listWhere("customer_id", a.customer_id);
        const related = allTickets.filter(t =>
          t.asset_id === id ||
          t.km_number === a.km_number ||
          (a.serial_number && t.issue?.includes(a.serial_number)) ||
          (a.km_number && t.issue?.includes(a.km_number))
        );
        setTickets(related);
        if (a.contract_id) {
          const c = await fs.serviceContracts.get(a.contract_id);
          setContract(c);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (!mounted || userLoading || loading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!currentUser) return <div className="p-6"><p className="text-muted text-sm">กรุณาเข้าสู่ระบบ</p></div>;
  if (!canView) return <div className="p-6"><p className="text-danger text-sm">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</p></div>;
  if (!asset) return <div className="p-6"><p className="text-muted text-sm">ไม่พบ Asset นี้</p></div>;

  const wDays = warrantyDaysLeft(asset.warranty_end);

  return (
    <div className="p-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push("/assets")} className="text-muted hover:text-foreground text-sm">← กลับ</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{asset.km_number || "—"}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[asset.status] || "bg-gray-700 text-gray-400"}`}>
              {STATUS_LABEL[asset.status] ?? asset.status}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">{asset.device_model} {asset.brand ? `· ${asset.brand}` : ""} · {asset.category}</p>
        </div>
        {canManage && (
          <button onClick={() => router.push("/assets")} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">
            แก้ไข (ไปหน้ารายการ)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Info */}
        <div className="rounded-xl bg-card border border-border p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">ข้อมูลอุปกรณ์</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="KM Number" value={asset.km_number} mono />
            <Field label="Serial Number" value={asset.serial_number} mono />
            <Field label="รุ่น" value={asset.device_model} />
            <Field label="ยี่ห้อ" value={asset.brand} />
            <Field label="ประเภท" value={asset.category} />
            <Field label="ช่างติดตั้ง" value={asset.technician} />
            <Field label="วันที่ติดตั้ง" value={asset.install_date} />
            <Field label="สถานที่" value={asset.location} />
          </div>
        </div>

        {/* Customer / Project */}
        <div className="rounded-xl bg-card border border-border p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">ลูกค้า / โปรเจกต์</p>
          <div className="grid grid-cols-1 gap-3">
            <Field label="ลูกค้า" value={asset.customer_name} />
            <Field label="โปรเจกต์" value={asset.project_name} />
            {asset.notes && <Field label="หมายเหตุ" value={asset.notes} />}
          </div>
        </div>

        {/* Warranty / MA */}
        <div className="rounded-xl bg-card border border-border p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">ประกัน / MA / SLA</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="ประกันเริ่ม" value={asset.warranty_start} />
            <Field label="ประกันหมด" value={asset.warranty_end} />
            <Field label="SLA Level" value={asset.sla_level} />
            <Field label="เลขสัญญา MA" value={asset.contract_number} mono />
          </div>
          <WarrantyBadge end={asset.warranty_end} />
          {contract && (
            <div className="mt-3 rounded-lg bg-background border border-border p-3">
              <p className="text-xs font-medium">{contract.title}</p>
              <p className="text-[10px] text-muted">{contract.start_date} → {contract.end_date} · {contract.service_level ?? "—"}</p>
              <p className="text-[10px] text-muted">สถานะ: {contract.status}</p>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-xl bg-card border border-border p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">เอกสาร</p>
          {(!asset.documents || asset.documents.length === 0) ? (
            <p className="text-xs text-muted">ยังไม่มีเอกสาร</p>
          ) : (
            <div className="flex flex-col gap-2">
              {asset.documents.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-card-hover">
                  <span className="text-sm">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{d.name}</p>
                    <p className="text-[10px] text-muted">{d.type} · {d.uploaded_at}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Service History */}
      <div className="rounded-xl bg-card border border-border mt-4">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">ประวัติการซ่อม / บำรุง ({tickets.length})</p>
          {canManage && (
            <button onClick={() => router.push("/service")} className="text-xs text-accent hover:underline">ไปหน้า Service →</button>
          )}
        </div>
        {tickets.length === 0 ? (
          <p className="text-xs text-muted p-4">ยังไม่มีประวัติการซ่อม</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="px-4 py-2.5">วันที่</th>
                  <th className="px-4 py-2.5">ประเภท</th>
                  <th className="px-4 py-2.5">ปัญหา / รายละเอียด</th>
                  <th className="px-4 py-2.5">ช่าง</th>
                  <th className="px-4 py-2.5">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <tr key={t.id ?? i} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-4 py-2 text-xs text-muted whitespace-nowrap">{t.service_date || "—"}</td>
                    <td className="px-4 py-2 text-xs">{t.type}</td>
                    <td className="px-4 py-2 text-xs max-w-xs truncate" title={t.issue}>{t.issue || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted">{t.technician || "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TICKET_STATUS_COLOR[t.status] || "bg-gray-700 text-gray-400"}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
