"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { presaleTools, toolBoqItems, presaleCatalog, presalePresets } from "@/lib/firestore";
import type {
  ProjectTool, CCTVDesignData, CCTVCamera, CCTVRecorder, CCTVInfraItem,
  CCTVLaborItem, ToolBOQItem, PresaleCatalogItem, CatalogItemType, PresalePreset,
} from "@/lib/firestore";
import { calcBOQSummary, BOQ_CATEGORY_LABEL } from "@/lib/boqMerge";
import { useCurrentUser } from "@/lib/UserContext";
import type { Permission } from "@/lib/rbac";

// ─── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ─── sample data ──────────────────────────────────────────────────────────────
const SAMPLE_DATA: CCTVDesignData = {
  cameras: [
    { id: uid(), location: "ล็อบบี้ชั้น 1", qty: 2, type: "dome", resolution: "4MP", outdoor: false, product_code: "DS-2CD2143G2-I", product_name: "Hikvision Dome 4MP Indoor", cost_price: 1200, selling_price: 2200 },
    { id: uid(), location: "ลานจอดรถ", qty: 4, type: "bullet", resolution: "8MP", outdoor: true, ir_distance: 50, product_code: "DS-2CD2085G1-I", product_name: "Hikvision Bullet 8MP Outdoor", cost_price: 2500, selling_price: 4500 },
    { id: uid(), location: "ทางเข้าหลัก", qty: 1, type: "ptz", resolution: "4MP", outdoor: false, product_name: "Hikvision PTZ 4MP", cost_price: 8000, selling_price: 14000 },
  ],
  recorders: [
    { id: uid(), type: "NVR", channels: 16, qty: 1, hdd_tb: 4, product_code: "DS-7616NI-K2", product_name: "Hikvision NVR 16CH", cost_price: 8000, selling_price: 14000 },
  ],
  infrastructure: [
    { id: uid(), name: "สายแลน CAT6 FTP", unit: "เมตร", qty: 300, product_code: "CAT6-FTP-300", cost_price: 8, selling_price: 15 },
    { id: uid(), name: "PoE Switch 8-port 120W", unit: "ชุด", qty: 1, cost_price: 2500, selling_price: 4500 },
    { id: uid(), name: "ท่อร้อยสาย PVC 20mm", unit: "เมตร", qty: 150, cost_price: 12, selling_price: 22 },
    { id: uid(), name: "UPS 1500VA", unit: "ชุด", qty: 1, product_code: "UPS-1500VA", cost_price: 5000, selling_price: 8500 },
  ],
  labor: [
    { id: uid(), description: "ติดตั้งกล้อง CCTV", qty: 7, unit: "ตัว", cost_price: 500, selling_price: 800 },
    { id: uid(), description: "เดินสาย + ร้อยท่อ", qty: 300, unit: "เมตร", cost_price: 30, selling_price: 50 },
    { id: uid(), description: "ติดตั้งและ Config NVR/DVR", qty: 1, unit: "ชุด", cost_price: 2000, selling_price: 3500 },
    { id: uid(), description: "ทดสอบและ Commissioning", qty: 1, unit: "ครั้ง", cost_price: 3000, selling_price: 5000 },
  ],
  storage_days: 30,
};

const INFRA_TEMPLATES = [
  { name: "สายแลน CAT6", unit: "เมตร" }, { name: "PoE Switch 8-port", unit: "ชุด" },
  { name: "PoE Switch 16-port", unit: "ชุด" }, { name: "ท่อร้อยสาย PVC 20mm", unit: "เมตร" },
  { name: "UPS 1500VA", unit: "ชุด" }, { name: "จอ Monitor 27\"", unit: "ชุด" },
  { name: "Power Supply 12V", unit: "ชุด" }, { name: "Junction Box", unit: "ชุด" },
];
const LABOR_TEMPLATES = [
  { description: "ติดตั้งกล้อง CCTV", unit: "ตัว", cost_price: 500, selling_price: 800 },
  { description: "เดินสาย + ร้อยท่อ", unit: "เมตร", cost_price: 30, selling_price: 50 },
  { description: "ติดตั้งและ Config NVR/DVR", unit: "ชุด", cost_price: 2000, selling_price: 3500 },
  { description: "ทดสอบและ Commissioning", unit: "ครั้ง", cost_price: 3000, selling_price: 5000 },
  { description: "สอนการใช้งาน (Training)", unit: "วัน", cost_price: 2000, selling_price: 3500 },
  { description: "จัดทำเอกสาร As-Built", unit: "ชุด", cost_price: 1500, selling_price: 2500 },
];

// ─── shared types ─────────────────────────────────────────────────────────────
type CatalogFormData = {
  code: string; name: string; brand: string; unit: string;
  cost_price: number; selling_price: number; notes: string;
  camera_type?: CCTVCamera["type"]; camera_resolution?: CCTVCamera["resolution"];
  recorder_type?: CCTVRecorder["type"]; recorder_channels?: number;
};

// ─── CatalogInput ──────────────────────────────────────────────────────────────
function CatalogInput({
  value, itemType, catalog, onSelect, onSaveRequest, placeholder, className,
}: {
  value: string;
  itemType: CatalogItemType;
  catalog: PresaleCatalogItem[];
  onSelect: (name: string, code: string, cost: number, sell: number, brand?: string) => void;
  onSaveRequest: (name: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  useEffect(() => { setInput(value); }, [value]);

  const matches = catalog.filter(
    (i) => i.item_type === itemType && input.length > 0 &&
      (i.name.toLowerCase().includes(input.toLowerCase()) ||
       (i.brand ?? "").toLowerCase().includes(input.toLowerCase()) ||
       i.code.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 7);

  const inCatalog = catalog.some(
    (i) => i.item_type === itemType && i.name.toLowerCase() === input.toLowerCase()
  );

  return (
    <div className={`relative flex items-center gap-1 ${className ?? ""}`}>
      <input
        className="flex-1 min-w-0 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
        placeholder={placeholder ?? "ค้นหาหรือพิมพ์ชื่อ"}
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true); onSelect(e.target.value, "", 0, 0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {input && !inCatalog && (
        <button
          title="บันทึกลงคลังสินค้า"
          className="px-1.5 py-0.5 text-[10px] bg-blue-500/15 text-blue-400 rounded hover:bg-blue-500/25 whitespace-nowrap"
          onMouseDown={(e) => { e.preventDefault(); onSaveRequest(input); }}
        >
          💾
        </button>
      )}
      {open && input.length > 0 && (
        <div className="absolute top-full left-0 z-30 w-60 bg-card border border-border/50 rounded-lg shadow-xl mt-0.5 overflow-hidden">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted/60 italic">ไม่พบในคลัง — กด 💾 เพื่อบันทึก</p>
          ) : (
            matches.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2 hover:bg-muted/10 text-xs border-b border-border/20 last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(item.name);
                  onSelect(item.name, item.code, item.cost_price, item.selling_price, item.brand);
                  setOpen(false);
                }}
              >
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-muted/60 flex justify-between mt-0.5">
                  <span className="truncate">{item.brand ?? item.code}</span>
                  <span className="text-green-400 ml-2 shrink-0">฿{item.selling_price.toLocaleString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── SaveToCatalogModal ────────────────────────────────────────────────────────

function SaveToCatalogModal({
  isOpen, itemType, initial, editItem, createdBy, onSave, onClose,
}: {
  isOpen: boolean;
  itemType: CatalogItemType;
  initial: Partial<CatalogFormData>;
  editItem?: PresaleCatalogItem;
  createdBy: string;
  onSave: (item: PresaleCatalogItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CatalogFormData>({
    code: "", name: "", brand: "", unit: "", cost_price: 0, selling_price: 0, notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        code: editItem?.code ?? initial.code ?? "",
        name: editItem?.name ?? initial.name ?? "",
        brand: editItem?.brand ?? initial.brand ?? "",
        unit: editItem?.unit ?? initial.unit ?? "",
        cost_price: editItem?.cost_price ?? initial.cost_price ?? 0,
        selling_price: editItem?.selling_price ?? initial.selling_price ?? 0,
        notes: editItem?.notes ?? initial.notes ?? "",
        camera_type: editItem?.camera_type ?? initial.camera_type,
        camera_resolution: editItem?.camera_resolution ?? initial.camera_resolution,
        recorder_type: editItem?.recorder_type ?? initial.recorder_type,
        recorder_channels: editItem?.recorder_channels ?? initial.recorder_channels,
      });
    }
  }, [isOpen, editItem, initial]);

  if (!isOpen) return null;
  const isEdit = !!editItem;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-sm space-y-3">
        <h3 className="font-bold">{isEdit ? "แก้ไขรายการในคลัง" : "บันทึกลงคลังสินค้า"}</h3>
        <p className="text-xs text-muted/60">
          {isEdit ? "แก้ไขข้อมูลสินค้าในคลัง" : "สินค้าที่บันทึกจะใช้ซ้ำในโปรเจกต์อื่นได้"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted/60 block mb-1">ชื่อสินค้า *</label>
            <input className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted/60 block mb-1">รหัสสินค้า</label>
            <input className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" placeholder="เช่น DS-2CD2143G2" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted/60 block mb-1">ยี่ห้อ / Brand</label>
            <input className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" placeholder="เช่น Hikvision" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted/60 block mb-1">หน่วย</label>
            <input className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" placeholder="ตัว / ชุด / เมตร" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted/60 block mb-1">ราคาต้นทุน (฿)</label>
            <input type="number" min={0} className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs text-muted/60 block mb-1">ราคาขาย (฿)</label>
            <input type="number" min={0} className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>

        {(itemType === "cctv_camera") && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted/60 block mb-1">ประเภทกล้อง</label>
              <select className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.camera_type ?? ""} onChange={(e) => setForm({ ...form, camera_type: e.target.value as CCTVCamera["type"] })}>
                <option value="">—</option>
                {["dome","bullet","ptz","fisheye","box"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted/60 block mb-1">ความละเอียด</label>
              <select className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.camera_resolution ?? ""} onChange={(e) => setForm({ ...form, camera_resolution: e.target.value as CCTVCamera["resolution"] })}>
                <option value="">—</option>
                {["2MP","4MP","8MP","12MP"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        )}

        {(itemType === "cctv_recorder") && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted/60 block mb-1">ประเภท</label>
              <select className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.recorder_type ?? ""} onChange={(e) => setForm({ ...form, recorder_type: e.target.value as CCTVRecorder["type"] })}>
                <option value="">—</option>
                {["NVR","DVR","Hybrid"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted/60 block mb-1">จำนวนช่อง</label>
              <select className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" value={form.recorder_channels ?? ""} onChange={(e) => setForm({ ...form, recorder_channels: parseInt(e.target.value) })}>
                <option value="">—</option>
                {[4,8,16,32,64].map((n) => <option key={n} value={n}>{n} CH</option>)}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-muted/60 block mb-1">หมายเหตุ</label>
          <input className="w-full px-2 py-1.5 bg-muted/10 border border-border/50 rounded text-sm" placeholder="ข้อมูลเพิ่มเติม (ไม่บังคับ)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        {!isEdit && <p className="text-[11px] text-muted/50">ผู้บันทึก: {createdBy}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10">ยกเลิก</button>
          <button
            onClick={() => onSave({
              ...editItem,
              ...form,
              item_type: itemType,
              created_by: editItem?.created_by ?? createdBy,
              tenant_id: "kmitsurat",
            } as PresaleCatalogItem)}
            disabled={!form.name.trim()}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isEdit ? "อัปเดต" : "บันทึกลงคลัง"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SavePresetModal ───────────────────────────────────────────────────────────

function SavePresetModal({
  isOpen, designData, createdBy, onSave, onClose,
}: {
  isOpen: boolean;
  designData: CCTVDesignData;
  createdBy: string;
  onSave: (name: string, description: string, tags: string[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (isOpen) { setName(""); setDescription(""); setTagsInput(""); }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCams = designData.cameras.reduce((s, c) => s + c.qty, 0);
  const totalSell = [
    ...designData.cameras.map((c) => c.qty * (c.selling_price ?? 0)),
    ...designData.recorders.map((r) => r.qty * (r.selling_price ?? 0)),
    ...designData.infrastructure.map((i) => i.qty * (i.selling_price ?? 0)),
    ...designData.labor.map((l) => l.qty * l.selling_price),
  ].reduce((s, v) => s + v, 0);
  const itemCount = designData.cameras.length + designData.recorders.length + designData.infrastructure.length + designData.labor.length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-md space-y-4">
        <div>
          <h3 className="font-bold text-base">บันทึกเป็น Preset</h3>
          <p className="text-xs text-muted/60 mt-0.5">บันทึกชุดรายการสินค้านี้เพื่อนำไปใช้ซ้ำในโปรเจกต์อื่น</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-300">{totalCams}</p>
            <p className="text-[11px] text-muted/60">กล้อง</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-400">฿{totalSell.toLocaleString()}</p>
            <p className="text-[11px] text-muted/60">ราคาขายรวม</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{itemCount}</p>
            <p className="text-[11px] text-muted/60">รายการ</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted/60 block mb-1">ชื่อ Preset *</label>
          <input
            autoFocus
            className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
            placeholder="เช่น ชุด CCTV สำนักงาน 8 กล้อง Standard"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted/60 block mb-1">คำอธิบาย (ไม่บังคับ)</label>
          <textarea
            className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm resize-none"
            rows={2}
            placeholder="ใช้สำหรับ..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted/60 block mb-1">แท็ก (คั่นด้วยจุลภาค)</label>
          <input
            className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
            placeholder="เช่น สำนักงาน, ขนาดเล็ก, Hikvision"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-muted/50">ผู้สร้าง: {createdBy}</p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10">ยกเลิก</button>
          <button
            disabled={!name.trim()}
            onClick={() => onSave(name.trim(), description.trim(), tagsInput.split(",").map((t) => t.trim()).filter(Boolean))}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            บันทึก Preset
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LoadPresetModal ───────────────────────────────────────────────────────────

function LoadPresetModal({
  isOpen, presets, currentUser, onLoad, onDelete, onClose,
}: {
  isOpen: boolean;
  presets: PresalePreset[];
  currentUser: { name?: string; role?: string } | null;
  onLoad: (preset: PresalePreset) => void;
  onDelete: (preset: PresalePreset) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = presets.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const canDelete = (p: PresalePreset) =>
    currentUser?.role === "admin" || p.created_by === currentUser?.name;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-base">โหลด Preset</h3>
            <p className="text-xs text-muted/60 mt-0.5">เลือก Preset เพื่อโหลดชุดรายการมาใช้งาน</p>
          </div>
          <button onClick={onClose} className="text-muted/60 hover:text-foreground px-1">✕</button>
        </div>
        <input
          className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
          placeholder="ค้นหา Preset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted/60">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">{presets.length === 0 ? "ยังไม่มี Preset — กด \"บันทึก Preset\" เพื่อสร้างอันแรก" : "ไม่พบ Preset ที่ตรงกัน"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {filtered.map((p) => {
              const data = p.design_data as CCTVDesignData;
              const totalCams = p.summary_cameras ?? (data?.cameras?.reduce((s, c) => s + c.qty, 0) ?? 0);
              return (
                <div key={p.id} className="bg-muted/5 border border-border/30 rounded-xl p-4 flex flex-col gap-2 hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{p.name}</p>
                      {p.description && <p className="text-xs text-muted/60 mt-0.5 line-clamp-2">{p.description}</p>}
                    </div>
                    {canDelete(p) && (
                      <button onClick={() => onDelete(p)} className="text-red-400/60 hover:text-red-400 text-xs shrink-0" title="ลบ Preset">🗑️</button>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted/60">
                    <span>📷 {totalCams} ตัว</span>
                    {p.summary_total_selling != null && <span className="text-green-400">฿{p.summary_total_selling.toLocaleString()}</span>}
                    {p.summary_item_count != null && <span>{p.summary_item_count} รายการ</span>}
                  </div>
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-accent/10 text-accent/70 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className="text-[10px] text-muted/40">โดย {p.created_by}</span>
                    <button onClick={() => onLoad(p)} className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:opacity-90">
                      โหลด
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted/40">* การโหลด Preset จะแทนที่ข้อมูลปัจจุบัน กรุณาบันทึกงานก่อนหากต้องการเก็บไว้</p>
      </div>
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────────
type DesignerTab = "cameras" | "equipment" | "labor" | "boq" | "catalog";

export default function ToolPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, hasPermission } = useCurrentUser();
  const canViewFinance = hasPermission("view_finance" as Permission);
  const projectId = params.id as string;
  const toolId = params.toolId as string;

  const [tool, setTool] = useState<ProjectTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingBOQ, setGeneratingBOQ] = useState(false);
  const [activeTab, setActiveTab] = useState<DesignerTab>("cameras");

  // Design state
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [recorders, setRecorders] = useState<CCTVRecorder[]>([]);
  const [infra, setInfra] = useState<CCTVInfraItem[]>([]);
  const [labor, setLabor] = useState<CCTVLaborItem[]>([]);
  const [boqPreview, setBoqPreview] = useState<ToolBOQItem[]>([]);

  // Catalog state
  const [catalog, setCatalog] = useState<PresaleCatalogItem[]>([]);
  const [catalogFilter, setCatalogFilter] = useState<CatalogItemType>("cctv_camera");
  const [saveCatalogModal, setSaveCatalogModal] = useState<{
    open: boolean; itemType: CatalogItemType; initial: Partial<CatalogFormData>; editItem?: PresaleCatalogItem;
  }>({ open: false, itemType: "cctv_camera", initial: {} });

  // Preset state
  const [presets, setPresets] = useState<PresalePreset[]>([]);
  const [savePresetModal, setSavePresetModal] = useState(false);
  const [loadPresetModal, setLoadPresetModal] = useState(false);

  const canModifyCatalog = useCallback((item: PresaleCatalogItem) =>
    currentUser?.role === "admin" || item.created_by === currentUser?.name,
  [currentUser]);

  const loadAll = useCallback(async () => {
    const [t, boq, cat, pres] = await Promise.all([
      presaleTools.get(toolId),
      toolBoqItems.listWhere("tool_id", toolId),
      presaleCatalog.list(),
      presalePresets.listWhere("tool_type", "cctv_designer"),
    ]);
    setTool(t);
    if (t?.design_data) {
      const d = t.design_data as CCTVDesignData;
      setCameras(d.cameras ?? []);
      setRecorders(d.recorders ?? []);
      setInfra(d.infrastructure ?? []);
      setLabor(d.labor ?? []);
    } else {
      // First open — load sample data
      setCameras(SAMPLE_DATA.cameras.map((c) => ({ ...c, id: uid() })));
      setRecorders(SAMPLE_DATA.recorders.map((r) => ({ ...r, id: uid() })));
      setInfra(SAMPLE_DATA.infrastructure.map((i) => ({ ...i, id: uid() })));
      setLabor(SAMPLE_DATA.labor.map((l) => ({ ...l, id: uid() })));
    }
    setBoqPreview(boq.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setCatalog(cat);
    setPresets(pres);
    setLoading(false);
  }, [toolId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const getDesignData = (): CCTVDesignData => ({ cameras, recorders, infrastructure: infra, labor });

  const handleSave = async () => {
    if (!tool) return;
    setSaving(true);
    const designData = getDesignData();
    const newStatus = tool.status === "draft" ? "designing" : tool.status;
    await presaleTools.update(toolId, {
      design_data: designData as unknown as Record<string, unknown>,
      status: newStatus,
      updated_at: new Date().toISOString().split("T")[0],
    });
    setTool({ ...tool, design_data: designData, status: newStatus });
    setSaving(false);
  };

  const handleGenerateBOQ = async () => {
    if (!tool) return;
    setGeneratingBOQ(true);
    const designData = getDesignData();
    await presaleTools.update(toolId, { design_data: designData as unknown as Record<string, unknown>, updated_at: new Date().toISOString().split("T")[0] });

    const existing = await toolBoqItems.listWhere("tool_id", toolId);
    await Promise.all(existing.map((i) => i.id && toolBoqItems.remove(i.id)));

    const items: Omit<ToolBOQItem, "id">[] = [];
    let order = 0;

    for (const cam of cameras) {
      if (cam.qty <= 0) continue;
      const uCost = cam.cost_price ?? 0, uSell = cam.selling_price ?? 0;
      items.push({
        tenant_id: "kmitsurat", presale_project_id: projectId, tool_id: toolId, tool_type: "cctv_designer",
        category: "cctv",
        product_code: cam.product_code || `CAM-${cam.type.toUpperCase()}-${cam.resolution}`,
        product_name: cam.product_name || `กล้อง ${cam.type} ${cam.resolution}`,
        unit: "ตัว", qty: cam.qty, cost_price: uCost, selling_price: uSell, discount: 0,
        total_cost: uCost * cam.qty, total_selling: uSell * cam.qty,
        margin_percent: uSell > 0 ? +((uSell - uCost) / uSell * 100).toFixed(2) : 0,
        merge_key: cam.product_code || `CAM-${cam.type}-${cam.resolution}`,
        notes: cam.location || undefined, order: order++,
      });
    }
    for (const rec of recorders) {
      if (rec.qty <= 0) continue;
      const uCost = rec.cost_price ?? 0, uSell = rec.selling_price ?? 0;
      items.push({
        tenant_id: "kmitsurat", presale_project_id: projectId, tool_id: toolId, tool_type: "cctv_designer",
        category: "cctv",
        product_code: rec.product_code || `${rec.type}-${rec.channels}CH`,
        product_name: rec.product_name || `${rec.type} ${rec.channels} ช่อง`,
        unit: "ชุด", qty: rec.qty, cost_price: uCost, selling_price: uSell, discount: 0,
        total_cost: uCost * rec.qty, total_selling: uSell * rec.qty,
        margin_percent: uSell > 0 ? +((uSell - uCost) / uSell * 100).toFixed(2) : 0,
        order: order++,
      });
    }
    for (const item of infra) {
      if (item.qty <= 0) continue;
      const uCost = item.cost_price ?? 0, uSell = item.selling_price ?? 0;
      items.push({
        tenant_id: "kmitsurat", presale_project_id: projectId, tool_id: toolId, tool_type: "cctv_designer",
        category: "network",
        product_code: item.product_code || item.name.replace(/\s+/g, "-").toUpperCase().slice(0, 20),
        product_name: item.product_name || item.name,
        unit: item.unit, qty: item.qty, cost_price: uCost, selling_price: uSell, discount: 0,
        total_cost: uCost * item.qty, total_selling: uSell * item.qty,
        margin_percent: uSell > 0 ? +((uSell - uCost) / uSell * 100).toFixed(2) : 0,
        merge_key: item.product_code || item.name.replace(/\s+/g, "-").toLowerCase(),
        notes: item.notes || undefined, order: order++,
      });
    }
    for (const item of labor) {
      if (item.qty <= 0) continue;
      const tCost = item.cost_price * item.qty, tSell = item.selling_price * item.qty;
      items.push({
        tenant_id: "kmitsurat", presale_project_id: projectId, tool_id: toolId, tool_type: "cctv_designer",
        category: "labor",
        product_code: `LABOR-${item.id.slice(0, 8).toUpperCase()}`,
        product_name: item.description,
        unit: item.unit, qty: item.qty, cost_price: item.cost_price, selling_price: item.selling_price, discount: 0,
        total_cost: tCost, total_selling: tSell,
        margin_percent: tSell > 0 ? +((tSell - tCost) / tSell * 100).toFixed(2) : 0,
        order: order++,
      });
    }

    for (const item of items) await toolBoqItems.add(item as Record<string, unknown>);
    const tCost = +items.reduce((s, i) => s + i.total_cost, 0).toFixed(2);
    const tSell = +items.reduce((s, i) => s + i.total_selling, 0).toFixed(2);
    await presaleTools.update(toolId, { status: "boq_ready", boq_total_cost: tCost, boq_total_selling: tSell, updated_at: new Date().toISOString().split("T")[0] });

    await loadAll();
    setActiveTab("boq");
    setGeneratingBOQ(false);
  };

  // Catalog handlers
  const handleSaveCatalogItem = async (item: PresaleCatalogItem) => {
    if (item.id) {
      await presaleCatalog.update(item.id, { ...item, updated_at: new Date().toISOString().split("T")[0] } as unknown as Record<string, unknown>);
    } else {
      await presaleCatalog.add(item as unknown as Record<string, unknown>);
    }
    const updated = await presaleCatalog.list();
    setCatalog(updated);
    setSaveCatalogModal({ open: false, itemType: "cctv_camera", initial: {} });
  };

  const handleDeleteCatalogItem = async (item: PresaleCatalogItem) => {
    if (!canModifyCatalog(item)) return;
    if (!confirm(`ลบ "${item.name}" ออกจากคลัง?`)) return;
    if (item.id) await presaleCatalog.remove(item.id);
    setCatalog((prev) => prev.filter((i) => i.id !== item.id));
  };

  // Preset handlers
  const handleSavePreset = async (name: string, description: string, tags: string[]) => {
    const designData = getDesignData();
    const totalCams = designData.cameras.reduce((s, c) => s + c.qty, 0);
    const totalSell = [
      ...designData.cameras.map((c) => c.qty * (c.selling_price ?? 0)),
      ...designData.recorders.map((r) => r.qty * (r.selling_price ?? 0)),
      ...designData.infrastructure.map((i) => i.qty * (i.selling_price ?? 0)),
      ...designData.labor.map((l) => l.qty * l.selling_price),
    ].reduce((s, v) => s + v, 0);
    const itemCount = designData.cameras.length + designData.recorders.length + designData.infrastructure.length + designData.labor.length;

    await presalePresets.add({
      name,
      description: description || undefined,
      tool_type: "cctv_designer",
      design_data: designData as unknown as Record<string, unknown>,
      summary_cameras: totalCams,
      summary_total_selling: Math.round(totalSell),
      summary_item_count: itemCount,
      tags: tags.length > 0 ? tags : undefined,
      created_by: currentUser?.name ?? "",
    } as Record<string, unknown>);

    const updated = await presalePresets.listWhere("tool_type", "cctv_designer");
    setPresets(updated);
    setSavePresetModal(false);
  };

  const handleLoadPreset = (preset: PresalePreset) => {
    if (!confirm(`โหลด Preset "${preset.name}"?\nข้อมูลปัจจุบันจะถูกแทนที่`)) return;
    const data = preset.design_data as CCTVDesignData;
    setCameras((data.cameras ?? []).map((c) => ({ ...c, id: uid() })));
    setRecorders((data.recorders ?? []).map((r) => ({ ...r, id: uid() })));
    setInfra((data.infrastructure ?? []).map((i) => ({ ...i, id: uid() })));
    setLabor((data.labor ?? []).map((l) => ({ ...l, id: uid() })));
    setLoadPresetModal(false);
  };

  const handleDeletePreset = async (preset: PresalePreset) => {
    if (!confirm(`ลบ Preset "${preset.name}"?`)) return;
    if (preset.id) await presalePresets.remove(preset.id);
    setPresets((prev) => prev.filter((p) => p.id !== preset.id));
  };

  // Row updaters
  const updCam = (id: string, p: Partial<CCTVCamera>) => setCameras((prev) => prev.map((c) => c.id === id ? { ...c, ...p } : c));
  const updRec = (id: string, p: Partial<CCTVRecorder>) => setRecorders((prev) => prev.map((r) => r.id === id ? { ...r, ...p } : r));
  const updInfra = (id: string, p: Partial<CCTVInfraItem>) => setInfra((prev) => prev.map((i) => i.id === id ? { ...i, ...p } : i));
  const updLabor = (id: string, p: Partial<CCTVLaborItem>) => setLabor((prev) => prev.map((l) => l.id === id ? { ...l, ...p } : l));

  const totalCameras = cameras.reduce((s, c) => s + (c.qty || 0), 0);
  const boqSummary = calcBOQSummary(boqPreview);
  const boqByCategory = boqPreview.reduce<Record<string, ToolBOQItem[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});
  const filteredCatalog = catalog.filter((i) => i.item_type === catalogFilter);

  if (loading) return <div className="p-8 text-center text-muted/60">กำลังโหลด...</div>;
  if (!tool) return <div className="p-8 text-center text-muted/60">ไม่พบ Tool</div>;
  if (tool.tool_type !== "cctv_designer") {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl mb-4">🚧</p>
        <h2 className="text-lg font-bold">{tool.name}</h2>
        <p className="text-muted/60 mt-2">Tool นี้กำลังพัฒนา (Coming Soon)</p>
        <button onClick={() => router.push(`/presale/projects/${projectId}`)} className="mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm">กลับไปโปรเจกต์</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted/60">
        <button onClick={() => router.push("/presale/projects")} className="hover:text-foreground">Presale Projects</button>
        <span>/</span>
        <button onClick={() => router.push(`/presale/projects/${projectId}`)} className="hover:text-foreground">โปรเจกต์</button>
        <span>/</span>
        <span className="text-foreground font-medium">📷 {tool.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">📷 {tool.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tool.status === "boq_ready" ? "bg-green-500/15 text-green-400" : tool.status === "designing" ? "bg-blue-500/15 text-blue-400" : "bg-gray-500/15 text-gray-400"}`}>
              {tool.status === "boq_ready" ? "BOQ พร้อม" : tool.status === "designing" ? "กำลังออกแบบ" : "Draft"}
            </span>
          </div>
          <p className="text-sm text-muted/60 mt-0.5">CCTV Designer · กล้องทั้งหมด {totalCameras} ตัว · คลังสินค้า {catalog.length} รายการ</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => setLoadPresetModal(true)} className="px-3 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10 text-muted/70">
            📥 โหลด Preset
          </button>
          <button onClick={() => setSavePresetModal(true)} className="px-3 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10 text-muted/70">
            📋 บันทึก Preset
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10 disabled:opacity-50">
            {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
          </button>
          <button onClick={handleGenerateBOQ} disabled={generatingBOQ || cameras.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {generatingBOQ ? "กำลัง Generate..." : "⚡ Generate BOQ"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 w-fit overflow-x-auto">
        {([
          ["cameras", `📷 กล้อง (${totalCameras})`],
          ["equipment", `🖥️ อุปกรณ์ (${recorders.length + infra.filter((i) => i.qty > 0).length})`],
          ["labor", `👷 แรงงาน (${labor.length})`],
          ["boq", `📋 BOQ (${boqPreview.length})`],
          ["catalog", `📦 คลัง (${catalog.length})`],
        ] as [DesignerTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ CAMERAS TAB ═══ */}
      {activeTab === "cameras" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted/60">
              💡 พิมพ์ชื่อสินค้าในช่อง "ค้นหา" เพื่อดึงข้อมูลจากคลัง หรือกด <span className="text-blue-400">💾</span> เพื่อบันทึกรายการใหม่
            </p>
            <button onClick={() => setCameras((p) => [...p, { id: uid(), location: "", qty: 1, type: "dome", resolution: "4MP", outdoor: false }])} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:opacity-90">
              + เพิ่มโซนกล้อง
            </button>
          </div>

          {cameras.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border/50 p-12 text-center text-muted/60">
              <p className="text-4xl mb-2">📷</p><p>คลิก "เพิ่มโซนกล้อง" เพื่อเริ่มออกแบบ</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted/50 bg-muted/5">
                    <th className="text-left px-3 py-2">โซน / ตำแหน่ง</th>
                    <th className="text-center px-2 py-2">ประเภท</th>
                    <th className="text-center px-2 py-2">ความละเอียด</th>
                    <th className="text-center px-2 py-2">จำนวน</th>
                    <th className="text-center px-2 py-2">นอกอาคาร</th>
                    <th className="text-left px-2 py-2 w-48">ค้นหาสินค้า / คลัง</th>
                    {canViewFinance && <th className="text-right px-2 py-2">ต้นทุน/ตัว</th>}
                    <th className="text-right px-2 py-2">ขาย/ตัว</th>
                    <th className="text-right px-2 py-2">รวมขาย</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map((cam) => (
                    <tr key={cam.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-3 py-1.5">
                        <input className="w-28 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs" placeholder="เช่น ล็อบบี้ชั้น 1" value={cam.location} onChange={(e) => updCam(cam.id, { location: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="w-20 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs" value={cam.type} onChange={(e) => updCam(cam.id, { type: e.target.value as CCTVCamera["type"] })}>
                          {["dome","bullet","ptz","fisheye","box"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="w-16 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs" value={cam.resolution} onChange={(e) => updCam(cam.id, { resolution: e.target.value as CCTVCamera["resolution"] })}>
                          {["2MP","4MP","8MP","12MP"].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={1} className="w-12 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" value={cam.qty} onChange={(e) => updCam(cam.id, { qty: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={cam.outdoor} onChange={(e) => updCam(cam.id, { outdoor: e.target.checked })} className="w-4 h-4" />
                      </td>
                      <td className="px-2 py-1.5">
                        <CatalogInput
                          value={cam.product_name ?? ""}
                          itemType="cctv_camera"
                          catalog={catalog}
                          placeholder="ค้นหาสินค้าหรือพิมพ์เอง"
                          onSelect={(name, code, cost, sell) => updCam(cam.id, { product_name: name, product_code: code || cam.product_code, cost_price: cost || cam.cost_price, selling_price: sell || cam.selling_price })}
                          onSaveRequest={(name) => setSaveCatalogModal({ open: true, itemType: "cctv_camera", initial: { name, code: cam.product_code ?? "", unit: "ตัว", cost_price: cam.cost_price, selling_price: cam.selling_price, camera_type: cam.type, camera_resolution: cam.resolution } })}
                        />
                      </td>
                      {canViewFinance && (
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" placeholder="0" value={cam.cost_price ?? ""} onChange={(e) => updCam(cam.id, { cost_price: parseFloat(e.target.value) || 0 })} />
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" placeholder="0" value={cam.selling_price ?? ""} onChange={(e) => updCam(cam.id, { selling_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-green-400">
                        {cam.qty && cam.selling_price ? `฿${(cam.qty * (cam.selling_price ?? 0)).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => setCameras((p) => p.filter((c) => c.id !== cam.id))} className="text-red-400 hover:text-red-300 px-1">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/5">
                    <td colSpan={3} className="px-3 py-2 text-xs font-medium text-muted/60">รวมทั้งหมด</td>
                    <td className="px-2 py-2 text-center text-xs font-bold text-accent">{totalCameras}</td>
                    <td colSpan={4}></td>
                    <td className="px-2 py-2 text-right text-xs font-bold text-green-400">
                      ฿{cameras.reduce((s, c) => s + c.qty * (c.selling_price ?? 0), 0).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ EQUIPMENT TAB ═══ */}
      {activeTab === "equipment" && (
        <div className="space-y-5">
          {/* Recorders */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/5">
              <h3 className="font-medium text-sm">🖥️ NVR / DVR</h3>
              <button onClick={() => setRecorders((p) => [...p, { id: uid(), type: "NVR", channels: 16, qty: 1 }])} className="px-3 py-1 bg-accent text-white rounded text-xs hover:opacity-90">+ เพิ่ม Recorder</button>
            </div>
            {recorders.length === 0 ? <p className="text-center text-muted/60 text-sm py-6">ยังไม่มี Recorder</p> : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 text-muted/50">
                    <th className="text-left px-4 py-2">ประเภท</th>
                    <th className="text-center px-3 py-2">ช่อง</th>
                    <th className="text-center px-3 py-2">HDD (TB)</th>
                    <th className="text-center px-3 py-2">จำนวน</th>
                    <th className="text-left px-3 py-2 w-48">ค้นหาสินค้า / คลัง</th>
                    <th className="text-right px-3 py-2">ต้นทุน</th>
                    <th className="text-right px-3 py-2">ราคาขาย</th>
                    <th className="text-right px-3 py-2">รวมขาย</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {recorders.map((rec) => (
                    <tr key={rec.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-1.5">
                        <select className="w-20 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs" value={rec.type} onChange={(e) => updRec(rec.id, { type: e.target.value as CCTVRecorder["type"] })}>
                          {["NVR","DVR","Hybrid"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <select className="w-16 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs" value={rec.channels} onChange={(e) => updRec(rec.id, { channels: parseInt(e.target.value) })}>
                          {[4,8,16,32,64].map((n) => <option key={n} value={n}>{n}CH</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input type="number" min={0} className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" placeholder="TB" value={rec.hdd_tb ?? ""} onChange={(e) => updRec(rec.id, { hdd_tb: parseFloat(e.target.value) || undefined })} />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input type="number" min={1} className="w-12 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" value={rec.qty} onChange={(e) => updRec(rec.id, { qty: parseInt(e.target.value) || 1 })} />
                      </td>
                      <td className="px-3 py-1.5">
                        <CatalogInput
                          value={rec.product_name ?? ""}
                          itemType="cctv_recorder"
                          catalog={catalog}
                          placeholder="ค้นหา NVR/DVR"
                          onSelect={(name, code, cost, sell) => updRec(rec.id, { product_name: name, product_code: code || rec.product_code, cost_price: cost || rec.cost_price, selling_price: sell || rec.selling_price })}
                          onSaveRequest={(name) => setSaveCatalogModal({ open: true, itemType: "cctv_recorder", initial: { name, code: rec.product_code ?? "", unit: "ชุด", cost_price: rec.cost_price, selling_price: rec.selling_price, recorder_type: rec.type, recorder_channels: rec.channels } })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" placeholder="0" value={rec.cost_price ?? ""} onChange={(e) => updRec(rec.id, { cost_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" placeholder="0" value={rec.selling_price ?? ""} onChange={(e) => updRec(rec.id, { selling_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-green-400">
                        {rec.qty && rec.selling_price ? `฿${(rec.qty * (rec.selling_price ?? 0)).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => setRecorders((p) => p.filter((r) => r.id !== rec.id))} className="text-red-400 hover:text-red-300">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Infrastructure */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">🔌 อุปกรณ์ Infrastructure</h3>
                <button onClick={() => setInfra((p) => [...p, { id: uid(), name: "", unit: "ชุด", qty: 0 }])} className="px-3 py-1 bg-accent text-white rounded text-xs hover:opacity-90">+ เพิ่มรายการ</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INFRA_TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => setInfra((p) => [...p, { id: uid(), name: t.name, unit: t.unit, qty: 0 }])} className="px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs hover:bg-muted/20 text-muted/70">
                    + {t.name}
                  </button>
                ))}
              </div>
            </div>
            {infra.length === 0 ? <p className="text-center text-muted/60 text-sm py-6">ยังไม่มีรายการ</p> : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 text-muted/50">
                    <th className="text-left px-4 py-2">รายการ</th>
                    <th className="text-center px-3 py-2">จำนวน</th>
                    <th className="text-center px-3 py-2">หน่วย</th>
                    <th className="text-left px-3 py-2 w-44">ค้นหาสินค้า / คลัง</th>
                    <th className="text-right px-3 py-2">ต้นทุน/หน่วย</th>
                    <th className="text-right px-3 py-2">ขาย/หน่วย</th>
                    <th className="text-right px-3 py-2">รวมขาย</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {infra.map((item) => (
                    <tr key={item.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-1.5">
                        <input className="w-36 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs" placeholder="ชื่อรายการ" value={item.name} onChange={(e) => updInfra(item.id, { name: e.target.value })} />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input type="number" min={0} className="w-16 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" value={item.qty} onChange={(e) => updInfra(item.id, { qty: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" value={item.unit} onChange={(e) => updInfra(item.id, { unit: e.target.value })} />
                      </td>
                      <td className="px-3 py-1.5">
                        <CatalogInput
                          value={item.product_name ?? ""}
                          itemType="cctv_infra"
                          catalog={catalog}
                          placeholder="ค้นหาหรือพิมพ์เอง"
                          onSelect={(name, code, cost, sell) => updInfra(item.id, { product_name: name, product_code: code || item.product_code, cost_price: cost || item.cost_price, selling_price: sell || item.selling_price })}
                          onSaveRequest={(name) => setSaveCatalogModal({ open: true, itemType: "cctv_infra", initial: { name, code: item.product_code ?? "", unit: item.unit, cost_price: item.cost_price, selling_price: item.selling_price } })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" placeholder="0" value={item.cost_price ?? ""} onChange={(e) => updInfra(item.id, { cost_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" placeholder="0" value={item.selling_price ?? ""} onChange={(e) => updInfra(item.id, { selling_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-green-400">
                        {item.qty && item.selling_price ? `฿${(item.qty * (item.selling_price ?? 0)).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => setInfra((p) => p.filter((i) => i.id !== item.id))} className="text-red-400 hover:text-red-300">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ LABOR TAB ═══ */}
      {activeTab === "labor" && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">👷 รายการแรงงาน</h3>
              <button onClick={() => setLabor((p) => [...p, { id: uid(), description: "", qty: 1, unit: "ชุด", cost_price: 0, selling_price: 0 }])} className="px-3 py-1 bg-accent text-white rounded text-xs hover:opacity-90">+ เพิ่มรายการ</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LABOR_TEMPLATES.map((t) => (
                <button key={t.description} onClick={() => setLabor((p) => [...p, { id: uid(), description: t.description, unit: t.unit, qty: 1, cost_price: t.cost_price, selling_price: t.selling_price }])} className="px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs hover:bg-muted/20 text-muted/70">
                  + {t.description}
                </button>
              ))}
            </div>
          </div>
          {labor.length === 0 ? <p className="text-center text-muted/60 text-sm py-6">ยังไม่มีรายการแรงงาน</p> : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20 text-muted/50">
                  <th className="text-left px-4 py-2">รายการงาน / ค้นหาคลัง</th>
                  <th className="text-center px-3 py-2">จำนวน</th>
                  <th className="text-center px-3 py-2">หน่วย</th>
                  <th className="text-right px-3 py-2">ต้นทุน/หน่วย</th>
                  <th className="text-right px-3 py-2">ขาย/หน่วย</th>
                  <th className="text-right px-3 py-2">รวมขาย</th>
                  <th className="text-right px-3 py-2">GP%</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {labor.map((item) => {
                  const tSell = item.qty * item.selling_price;
                  const tCost = item.qty * item.cost_price;
                  const gp = tSell > 0 ? (tSell - tCost) / tSell * 100 : 0;
                  return (
                    <tr key={item.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-1.5">
                        <CatalogInput
                          value={item.description}
                          itemType="cctv_labor"
                          catalog={catalog}
                          placeholder="ค้นหาหรือพิมพ์รายการงาน"
                          className="w-52"
                          onSelect={(name, _code, cost, sell) => updLabor(item.id, { description: name, cost_price: cost || item.cost_price, selling_price: sell || item.selling_price })}
                          onSaveRequest={(name) => setSaveCatalogModal({ open: true, itemType: "cctv_labor", initial: { name, unit: item.unit, cost_price: item.cost_price, selling_price: item.selling_price } })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input type="number" min={0} className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" value={item.qty} onChange={(e) => updLabor(item.id, { qty: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center" value={item.unit} onChange={(e) => updLabor(item.id, { unit: e.target.value })} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" value={item.cost_price} onChange={(e) => updLabor(item.id, { cost_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right" value={item.selling_price} onChange={(e) => updLabor(item.id, { selling_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-green-400">฿{tSell.toLocaleString()}</td>
                      <td className={`px-3 py-1.5 text-right ${gp >= 20 ? "text-green-400" : gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>{gp.toFixed(1)}%</td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => setLabor((p) => p.filter((l) => l.id !== item.id))} className="text-red-400 hover:text-red-300">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/5 font-medium">
                  <td colSpan={5} className="px-4 py-2 text-muted/60 text-xs">รวมค่าแรง</td>
                  <td className="px-3 py-2 text-right text-xs text-green-400">฿{labor.reduce((s, i) => s + i.qty * i.selling_price, 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ═══ BOQ PREVIEW TAB ═══ */}
      {activeTab === "boq" && (
        <div className="space-y-4">
          {boqPreview.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border/50 p-12 text-center text-muted/60">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">ยังไม่มี BOQ</p>
              <p className="text-sm mt-1">กรอกข้อมูลในแต่ละ Tab แล้วกด "Generate BOQ"</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[["รายการ", `${boqPreview.length}`, "text-foreground"], ["ต้นทุนรวม", `฿${boqSummary.totalCost.toLocaleString()}`, "text-foreground"], ["ราคาขายรวม", `฿${boqSummary.totalSelling.toLocaleString()}`, "text-green-400"], ["GP", `${boqSummary.gpPct.toFixed(1)}%`, boqSummary.gpPct >= 20 ? "text-green-400" : boqSummary.gpPct >= 10 ? "text-yellow-400" : "text-red-400"]].map(([label, val, cls]) => (
                  <div key={label} className="bg-card rounded-xl border border-border/50 p-4">
                    <p className="text-xs text-muted/60">{label}</p>
                    <p className={`text-xl font-bold mt-1 ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>
              {(Object.entries(boqByCategory) as [string, ToolBOQItem[]][]).map(([cat, items]) => {
                const s = calcBOQSummary(items);
                return (
                  <div key={cat} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/5 border-b border-border/30 flex justify-between">
                      <span className="font-medium text-sm">{BOQ_CATEGORY_LABEL[cat as keyof typeof BOQ_CATEGORY_LABEL] ?? cat}</span>
                      <span className="text-xs text-muted/60">฿{s.totalSelling.toLocaleString()} · GP {s.gpPct.toFixed(1)}%</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border/20 text-muted/50"><th className="text-left px-4 py-2">#</th><th className="text-left px-3 py-2">รหัส</th><th className="text-left px-3 py-2">รายการ</th><th className="text-center px-3 py-2">จำนวน</th><th className="text-center px-3 py-2">หน่วย</th>{canViewFinance && <th className="text-right px-3 py-2">ต้นทุน</th>}<th className="text-right px-3 py-2">ราคาขาย</th><th className="text-right px-3 py-2">รวม</th>{canViewFinance && <th className="text-right px-3 py-2">GP%</th>}</tr></thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id ?? idx} className="border-b border-border/10 hover:bg-muted/5">
                            <td className="px-4 py-1.5 text-muted/50">{idx + 1}</td>
                            <td className="px-3 py-1.5 text-muted/60">{item.product_code}</td>
                            <td className="px-3 py-1.5 font-medium">{item.product_name}{item.notes && <span className="text-muted/50 ml-1">({item.notes})</span>}</td>
                            <td className="px-3 py-1.5 text-center">{item.qty}</td>
                            <td className="px-3 py-1.5 text-center text-muted/60">{item.unit}</td>
                            {canViewFinance && <td className="px-3 py-1.5 text-right text-muted/70">฿{item.cost_price.toLocaleString()}</td>}
                            <td className="px-3 py-1.5 text-right">฿{item.selling_price.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-green-400">฿{item.total_selling.toLocaleString()}</td>
                            {canViewFinance && <td className={`px-3 py-1.5 text-right ${item.margin_percent >= 20 ? "text-green-400" : item.margin_percent >= 10 ? "text-yellow-400" : "text-red-400"}`}>{item.margin_percent.toFixed(1)}%</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ═══ CATALOG TAB ═══ */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted/60">คลังสินค้าที่ใช้ซ้ำได้ · ผู้สร้างและ Admin แก้ไข/ลบได้เท่านั้น</p>
            <button
              onClick={() => setSaveCatalogModal({ open: true, itemType: catalogFilter, initial: {} })}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:opacity-90"
            >
              + เพิ่มรายการใหม่
            </button>
          </div>

          {/* Filter */}
          <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 w-fit">
            {([["cctv_camera", "📷 กล้อง"], ["cctv_recorder", "🖥️ Recorder"], ["cctv_infra", "🔌 Infrastructure"], ["cctv_labor", "👷 แรงงาน"]] as [CatalogItemType, string][]).map(([type, label]) => (
              <button key={type} onClick={() => setCatalogFilter(type)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${catalogFilter === type ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"}`}>
                {label} ({catalog.filter((i) => i.item_type === type).length})
              </button>
            ))}
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border/50 p-10 text-center text-muted/60">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm">ยังไม่มีรายการในคลัง</p>
              <p className="text-xs mt-1">กด 💾 ในหน้ากล้อง/อุปกรณ์ หรือคลิก "เพิ่มรายการใหม่"</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted/50 bg-muted/5">
                    <th className="text-left px-4 py-2">รหัส</th>
                    <th className="text-left px-3 py-2">ชื่อสินค้า</th>
                    <th className="text-left px-3 py-2">ยี่ห้อ</th>
                    <th className="text-center px-3 py-2">หน่วย</th>
                    <th className="text-right px-3 py-2">ต้นทุน</th>
                    <th className="text-right px-3 py-2">ราคาขาย</th>
                    <th className="text-left px-3 py-2">ผู้เพิ่ม</th>
                    <th className="px-3 py-2">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((item) => {
                    const canEdit = canModifyCatalog(item);
                    return (
                      <tr key={item.id} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-4 py-2 text-muted/60">{item.code || "—"}</td>
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2 text-muted/70">{item.brand || "—"}</td>
                        <td className="px-3 py-2 text-center text-muted/70">{item.unit}</td>
                        <td className="px-3 py-2 text-right">฿{item.cost_price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-green-400 font-medium">฿{item.selling_price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted/60">{item.created_by}</td>
                        <td className="px-3 py-2">
                          {canEdit ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => setSaveCatalogModal({ open: true, itemType: item.item_type, initial: {}, editItem: item })}
                                className="px-2 py-1 bg-blue-500/15 text-blue-400 rounded text-[11px] hover:bg-blue-500/25"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button
                                onClick={() => handleDeleteCatalogItem(item)}
                                className="px-2 py-1 bg-red-500/15 text-red-400 rounded text-[11px] hover:bg-red-500/25"
                              >
                                🗑️ ลบ
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted/40">ไม่มีสิทธิ์</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Save to Catalog Modal */}
      <SaveToCatalogModal
        isOpen={saveCatalogModal.open}
        itemType={saveCatalogModal.itemType}
        initial={saveCatalogModal.initial}
        editItem={saveCatalogModal.editItem}
        createdBy={currentUser?.name ?? ""}
        onSave={handleSaveCatalogItem}
        onClose={() => setSaveCatalogModal({ open: false, itemType: "cctv_camera", initial: {} })}
      />

      {/* Preset Modals */}
      <SavePresetModal
        isOpen={savePresetModal}
        designData={getDesignData()}
        createdBy={currentUser?.name ?? ""}
        onSave={handleSavePreset}
        onClose={() => setSavePresetModal(false)}
      />
      <LoadPresetModal
        isOpen={loadPresetModal}
        presets={presets}
        currentUser={currentUser}
        onLoad={handleLoadPreset}
        onDelete={handleDeletePreset}
        onClose={() => setLoadPresetModal(false)}
      />
    </div>
  );
}

