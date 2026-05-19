"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { presaleTools, toolBoqItems } from "@/lib/firestore";
import type {
  ProjectTool, CCTVDesignData, CCTVCamera, CCTVRecorder, CCTVInfraItem, CCTVLaborItem, ToolBOQItem,
} from "@/lib/firestore";
import { calcBOQSummary, BOQ_CATEGORY_LABEL } from "@/lib/boqMerge";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const EMPTY_CAMERA = (): CCTVCamera => ({
  id: uid(), location: "", qty: 1, type: "dome", resolution: "4MP", outdoor: false,
});
const EMPTY_RECORDER = (): CCTVRecorder => ({
  id: uid(), type: "NVR", channels: 16, qty: 1,
});
const EMPTY_INFRA = (name: string, unit: string): CCTVInfraItem => ({
  id: uid(), name, unit, qty: 0,
});
const EMPTY_LABOR = (): CCTVLaborItem => ({
  id: uid(), description: "", qty: 1, unit: "ชุด", cost_price: 0, selling_price: 0,
});

const INFRA_TEMPLATES: { name: string; unit: string }[] = [
  { name: "สายแลน CAT6", unit: "เมตร" },
  { name: "PoE Switch 8-port", unit: "ชุด" },
  { name: "PoE Switch 16-port", unit: "ชุด" },
  { name: "ท่อร้อยสาย PVC 20mm", unit: "เมตร" },
  { name: "UPS 1500VA", unit: "ชุด" },
  { name: "จอ Monitor 27\"", unit: "ชุด" },
  { name: "Power Supply 12V", unit: "ชุด" },
  { name: "สาย Power Cable", unit: "เมตร" },
  { name: "Junction Box", unit: "ชุด" },
];
const LABOR_TEMPLATES: { description: string; unit: string; cost: number; sell: number }[] = [
  { description: "ติดตั้งกล้อง CCTV", unit: "ตัว", cost: 500, sell: 800 },
  { description: "เดินสาย + ร้อยท่อ", unit: "เมตร", cost: 30, sell: 50 },
  { description: "ติดตั้งและ Config NVR/DVR", unit: "ชุด", cost: 2000, sell: 3500 },
  { description: "ทดสอบและ Commissioning", unit: "ครั้ง", cost: 3000, sell: 5000 },
  { description: "สอนการใช้งาน (Training)", unit: "วัน", cost: 2000, sell: 3500 },
  { description: "จัดทำเอกสาร As-Built", unit: "ชุด", cost: 1500, sell: 2500 },
];

type DesignerTab = "cameras" | "equipment" | "labor" | "boq";

export default function ToolPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const toolId = params.toolId as string;

  const [tool, setTool] = useState<ProjectTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingBOQ, setGeneratingBOQ] = useState(false);
  const [activeTab, setActiveTab] = useState<DesignerTab>("cameras");

  // Design data
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [recorders, setRecorders] = useState<CCTVRecorder[]>([]);
  const [infra, setInfra] = useState<CCTVInfraItem[]>([]);
  const [labor, setLabor] = useState<CCTVLaborItem[]>([]);

  // BOQ preview
  const [boqPreview, setBoqPreview] = useState<ToolBOQItem[]>([]);

  const loadTool = useCallback(async () => {
    const t = await presaleTools.get(toolId);
    setTool(t);
    if (t?.design_data) {
      const d = t.design_data as CCTVDesignData;
      setCameras(d.cameras ?? []);
      setRecorders(d.recorders ?? []);
      setInfra(d.infrastructure ?? []);
      setLabor(d.labor ?? []);
    }
    const boq = await toolBoqItems.listWhere("tool_id", toolId);
    setBoqPreview(boq.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setLoading(false);
  }, [toolId]);

  useEffect(() => { loadTool(); }, [loadTool]);

  const getDesignData = (): CCTVDesignData => ({
    cameras,
    recorders,
    infrastructure: infra,
    labor,
  });

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

    // Save design first
    const designData = getDesignData();
    await presaleTools.update(toolId, {
      design_data: designData as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString().split("T")[0],
    });

    // Remove existing BOQ items for this tool
    const existing = await toolBoqItems.listWhere("tool_id", toolId);
    await Promise.all(existing.map((i) => i.id && toolBoqItems.remove(i.id)));

    const items: Omit<ToolBOQItem, "id">[] = [];
    let order = 0;

    // Cameras
    for (const cam of cameras) {
      if (cam.qty <= 0) continue;
      const unitCost = cam.cost_price ?? 0;
      const unitSell = cam.selling_price ?? 0;
      const totalCost = unitCost * cam.qty;
      const totalSell = unitSell * cam.qty;
      items.push({
        tenant_id: "kmitsurat",
        presale_project_id: projectId,
        tool_id: toolId,
        tool_type: "cctv_designer",
        category: "cctv",
        product_code: cam.product_code || `CAM-${cam.type.toUpperCase()}-${cam.resolution}`,
        product_name: cam.product_name || `กล้อง ${cam.type === "dome" ? "Dome" : cam.type === "bullet" ? "Bullet" : cam.type === "ptz" ? "PTZ" : cam.type === "fisheye" ? "Fisheye" : "Box"} ${cam.resolution}`,
        unit: "ตัว",
        qty: cam.qty,
        cost_price: unitCost,
        selling_price: unitSell,
        discount: 0,
        total_cost: totalCost,
        total_selling: totalSell,
        margin_percent: totalSell > 0 ? parseFloat(((totalSell - totalCost) / totalSell * 100).toFixed(2)) : 0,
        merge_key: cam.product_code || `CAM-${cam.type}-${cam.resolution}`,
        notes: cam.location || undefined,
        order: order++,
      });
    }

    // Recorders
    for (const rec of recorders) {
      if (rec.qty <= 0) continue;
      const unitCost = rec.cost_price ?? 0;
      const unitSell = rec.selling_price ?? 0;
      items.push({
        tenant_id: "kmitsurat",
        presale_project_id: projectId,
        tool_id: toolId,
        tool_type: "cctv_designer",
        category: "cctv",
        product_code: rec.product_code || `${rec.type}-${rec.channels}CH`,
        product_name: rec.product_name || `${rec.type} ${rec.channels} ช่อง`,
        unit: "ชุด",
        qty: rec.qty,
        cost_price: unitCost,
        selling_price: unitSell,
        discount: 0,
        total_cost: unitCost * rec.qty,
        total_selling: unitSell * rec.qty,
        margin_percent: unitSell > 0 ? parseFloat(((unitSell - unitCost) / unitSell * 100).toFixed(2)) : 0,
        order: order++,
      });
      // HDD
      if (rec.hdd_tb && rec.hdd_tb > 0) {
        items.push({
          tenant_id: "kmitsurat",
          presale_project_id: projectId,
          tool_id: toolId,
          tool_type: "cctv_designer",
          category: "cctv",
          product_code: `HDD-${rec.hdd_tb}TB`,
          product_name: `HDD ${rec.hdd_tb}TB (สำหรับ ${rec.type})`,
          unit: "ลูก",
          qty: rec.qty,
          cost_price: 0,
          selling_price: 0,
          discount: 0,
          total_cost: 0,
          total_selling: 0,
          margin_percent: 0,
          notes: `${rec.hdd_tb}TB per unit`,
          order: order++,
        });
      }
    }

    // Infrastructure
    for (const item of infra) {
      if (item.qty <= 0) continue;
      const unitCost = item.cost_price ?? 0;
      const unitSell = item.selling_price ?? 0;
      items.push({
        tenant_id: "kmitsurat",
        presale_project_id: projectId,
        tool_id: toolId,
        tool_type: "cctv_designer",
        category: "network",
        product_code: item.product_code || item.name.replace(/\s+/g, "-").toUpperCase().slice(0, 20),
        product_name: item.product_name || item.name,
        unit: item.unit,
        qty: item.qty,
        cost_price: unitCost,
        selling_price: unitSell,
        discount: 0,
        total_cost: unitCost * item.qty,
        total_selling: unitSell * item.qty,
        margin_percent: unitSell > 0 ? parseFloat(((unitSell - unitCost) / unitSell * 100).toFixed(2)) : 0,
        merge_key: item.product_code || item.name.replace(/\s+/g, "-").toLowerCase(),
        notes: item.notes || undefined,
        order: order++,
      });
    }

    // Labor
    for (const item of labor) {
      if (item.qty <= 0) continue;
      const totalCost = item.cost_price * item.qty;
      const totalSell = item.selling_price * item.qty;
      items.push({
        tenant_id: "kmitsurat",
        presale_project_id: projectId,
        tool_id: toolId,
        tool_type: "cctv_designer",
        category: "labor",
        product_code: `LABOR-${item.id.slice(0, 8).toUpperCase()}`,
        product_name: item.description,
        unit: item.unit,
        qty: item.qty,
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        discount: 0,
        total_cost: totalCost,
        total_selling: totalSell,
        margin_percent: totalSell > 0 ? parseFloat(((totalSell - totalCost) / totalSell * 100).toFixed(2)) : 0,
        order: order++,
      });
    }

    // Save BOQ items
    for (const item of items) {
      await toolBoqItems.add(item as Record<string, unknown>);
    }

    // Update tool status & totals
    const totalCost = items.reduce((s, i) => s + i.total_cost, 0);
    const totalSelling = items.reduce((s, i) => s + i.total_selling, 0);
    await presaleTools.update(toolId, {
      status: "boq_ready",
      boq_total_cost: parseFloat(totalCost.toFixed(2)),
      boq_total_selling: parseFloat(totalSelling.toFixed(2)),
      updated_at: new Date().toISOString().split("T")[0],
    });

    // Reload
    await loadTool();
    setActiveTab("boq");
    setGeneratingBOQ(false);
  };

  // Camera helpers
  const updateCamera = (id: string, patch: Partial<CCTVCamera>) =>
    setCameras((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCamera = (id: string) => setCameras((prev) => prev.filter((c) => c.id !== id));

  // Recorder helpers
  const updateRecorder = (id: string, patch: Partial<CCTVRecorder>) =>
    setRecorders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRecorder = (id: string) => setRecorders((prev) => prev.filter((r) => r.id !== id));

  // Infra helpers
  const updateInfra = (id: string, patch: Partial<CCTVInfraItem>) =>
    setInfra((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeInfra = (id: string) => setInfra((prev) => prev.filter((i) => i.id !== id));

  // Labor helpers
  const updateLabor = (id: string, patch: Partial<CCTVLaborItem>) =>
    setLabor((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLabor = (id: string) => setLabor((prev) => prev.filter((l) => l.id !== id));

  const totalCameras = cameras.reduce((s, c) => s + (c.qty || 0), 0);
  const boqSummary = calcBOQSummary(boqPreview);
  const boqByCategory = boqPreview.reduce<Record<string, ToolBOQItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center text-muted/60">กำลังโหลด...</div>;
  if (!tool) return <div className="p-8 text-center text-muted/60">ไม่พบ Tool</div>;

  if (tool.tool_type !== "cctv_designer") {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl mb-4">🚧</p>
        <h2 className="text-lg font-bold">{tool.name}</h2>
        <p className="text-muted/60 mt-2">Tool นี้กำลังพัฒนา (Coming Soon)</p>
        <button onClick={() => router.push(`/presale/projects/${projectId}`)} className="mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm">
          กลับไปโปรเจกต์
        </button>
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              tool.status === "boq_ready" ? "bg-green-500/15 text-green-400" :
              tool.status === "designing" ? "bg-blue-500/15 text-blue-400" :
              "bg-gray-500/15 text-gray-400"
            }`}>
              {tool.status === "boq_ready" ? "BOQ พร้อม" : tool.status === "designing" ? "กำลังออกแบบ" : "Draft"}
            </span>
          </div>
          <p className="text-sm text-muted/60 mt-0.5">CCTV Designer · กล้องทั้งหมด {totalCameras} ตัว</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
          </button>
          <button
            onClick={handleGenerateBOQ}
            disabled={generatingBOQ || cameras.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {generatingBOQ ? "กำลัง Generate..." : "⚡ Generate BOQ"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 w-fit">
        {([
          ["cameras", `📷 กล้อง (${totalCameras} ตัว)`],
          ["equipment", `🖥️ อุปกรณ์หลัก (${recorders.length + infra.filter((i) => i.qty > 0).length})`],
          ["labor", `👷 แรงงาน (${labor.length})`],
          ["boq", `📋 BOQ Preview (${boqPreview.length})`],
        ] as [DesignerTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== CAMERAS TAB ===== */}
      {activeTab === "cameras" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted/60">เพิ่มโซน/ตำแหน่งติดตั้งกล้อง</p>
            <button
              onClick={() => setCameras((prev) => [...prev, EMPTY_CAMERA()])}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:opacity-90"
            >
              + เพิ่มโซนกล้อง
            </button>
          </div>

          {cameras.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border/50 p-12 text-center text-muted/60">
              <p className="text-4xl mb-2">📷</p>
              <p>คลิก "เพิ่มโซนกล้อง" เพื่อเริ่มออกแบบ</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted/50 bg-muted/5">
                    <th className="text-left px-3 py-2">โซน / ตำแหน่ง</th>
                    <th className="text-center px-2 py-2">ประเภท</th>
                    <th className="text-center px-2 py-2">ความละเอียด</th>
                    <th className="text-center px-2 py-2">จำนวน</th>
                    <th className="text-center px-2 py-2">ภายนอก</th>
                    <th className="text-left px-2 py-2">รหัสสินค้า</th>
                    <th className="text-right px-2 py-2">ต้นทุน/ตัว</th>
                    <th className="text-right px-2 py-2">ขาย/ตัว</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map((cam) => (
                    <tr key={cam.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-3 py-1.5">
                        <input
                          className="w-28 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          placeholder="เช่น ล็อบบี้ชั้น 1"
                          value={cam.location}
                          onChange={(e) => updateCamera(cam.id, { location: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="w-24 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          value={cam.type}
                          onChange={(e) => updateCamera(cam.id, { type: e.target.value as CCTVCamera["type"] })}
                        >
                          <option value="dome">Dome</option>
                          <option value="bullet">Bullet</option>
                          <option value="ptz">PTZ</option>
                          <option value="fisheye">Fisheye</option>
                          <option value="box">Box</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="w-20 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          value={cam.resolution}
                          onChange={(e) => updateCamera(cam.id, { resolution: e.target.value as CCTVCamera["resolution"] })}
                        >
                          <option value="2MP">2MP</option>
                          <option value="4MP">4MP</option>
                          <option value="8MP">8MP</option>
                          <option value="12MP">12MP</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={1}
                          className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          value={cam.qty}
                          onChange={(e) => updateCamera(cam.id, { qty: parseInt(e.target.value) || 1 })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={cam.outdoor}
                          onChange={(e) => updateCamera(cam.id, { outdoor: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-28 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          placeholder="รหัสสินค้า (ไม่บังคับ)"
                          value={cam.product_code ?? ""}
                          onChange={(e) => updateCamera(cam.id, { product_code: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          placeholder="0"
                          value={cam.cost_price ?? ""}
                          onChange={(e) => updateCamera(cam.id, { cost_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          placeholder="0"
                          value={cam.selling_price ?? ""}
                          onChange={(e) => updateCamera(cam.id, { selling_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removeCamera(cam.id)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/5 text-muted/60">
                    <td colSpan={3} className="px-3 py-2 font-medium text-foreground">รวมกล้องทั้งหมด</td>
                    <td className="px-2 py-2 text-center font-bold text-accent">{totalCameras} ตัว</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Camera summary by type */}
          {totalCameras > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {(["dome", "bullet", "ptz", "fisheye", "box"] as CCTVCamera["type"][]).map((type) => {
                const count = cameras.filter((c) => c.type === type).reduce((s, c) => s + c.qty, 0);
                if (count === 0) return null;
                return (
                  <div key={type} className="bg-card rounded-xl border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold text-accent">{count}</p>
                    <p className="text-xs text-muted/60 capitalize mt-0.5">{type}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== EQUIPMENT TAB ===== */}
      {activeTab === "equipment" && (
        <div className="space-y-5">
          {/* Recorders */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/5">
              <h3 className="font-medium text-sm">🖥️ NVR / DVR</h3>
              <button
                onClick={() => setRecorders((prev) => [...prev, EMPTY_RECORDER()])}
                className="px-3 py-1 bg-accent text-white rounded text-xs hover:opacity-90"
              >
                + เพิ่ม Recorder
              </button>
            </div>
            {recorders.length === 0 ? (
              <p className="text-center text-muted/60 text-sm py-6">ยังไม่มี Recorder</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 text-muted/50">
                    <th className="text-left px-4 py-2">ประเภท</th>
                    <th className="text-center px-3 py-2">ช่อง (CH)</th>
                    <th className="text-center px-3 py-2">HDD (TB)</th>
                    <th className="text-center px-3 py-2">จำนวน</th>
                    <th className="text-left px-3 py-2">รหัสสินค้า</th>
                    <th className="text-right px-3 py-2">ต้นทุน</th>
                    <th className="text-right px-3 py-2">ราคาขาย</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {recorders.map((rec) => (
                    <tr key={rec.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-1.5">
                        <select
                          className="w-20 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          value={rec.type}
                          onChange={(e) => updateRecorder(rec.id, { type: e.target.value as CCTVRecorder["type"] })}
                        >
                          <option value="NVR">NVR</option>
                          <option value="DVR">DVR</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <select
                          className="w-16 px-1.5 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          value={rec.channels}
                          onChange={(e) => updateRecorder(rec.id, { channels: parseInt(e.target.value) })}
                        >
                          {[4, 8, 16, 32, 64].map((n) => <option key={n} value={n}>{n} CH</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number" min={0}
                          className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          placeholder="TB"
                          value={rec.hdd_tb ?? ""}
                          onChange={(e) => updateRecorder(rec.id, { hdd_tb: parseFloat(e.target.value) || undefined })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number" min={1}
                          className="w-12 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          value={rec.qty}
                          onChange={(e) => updateRecorder(rec.id, { qty: parseInt(e.target.value) || 1 })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-28 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          placeholder="รหัสสินค้า"
                          value={rec.product_code ?? ""}
                          onChange={(e) => updateRecorder(rec.id, { product_code: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number" min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          placeholder="0"
                          value={rec.cost_price ?? ""}
                          onChange={(e) => updateRecorder(rec.id, { cost_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number" min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          placeholder="0"
                          value={rec.selling_price ?? ""}
                          onChange={(e) => updateRecorder(rec.id, { selling_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removeRecorder(rec.id)} className="text-red-400 hover:text-red-300 px-1">✕</button>
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
                <button
                  onClick={() => setInfra((prev) => [...prev, EMPTY_INFRA("", "ชุด")])}
                  className="px-3 py-1 bg-accent text-white rounded text-xs hover:opacity-90"
                >
                  + เพิ่มรายการ
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INFRA_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setInfra((prev) => [...prev, EMPTY_INFRA(t.name, t.unit)])}
                    className="px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs hover:bg-muted/20 text-muted/70"
                  >
                    + {t.name}
                  </button>
                ))}
              </div>
            </div>
            {infra.length === 0 ? (
              <p className="text-center text-muted/60 text-sm py-6">ยังไม่มีรายการ — เลือกจาก Template ด้านบน</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 text-muted/50">
                    <th className="text-left px-4 py-2">รายการ</th>
                    <th className="text-center px-3 py-2">จำนวน</th>
                    <th className="text-center px-3 py-2">หน่วย</th>
                    <th className="text-left px-3 py-2">รหัสสินค้า</th>
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
                        <input
                          className="w-40 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          placeholder="ชื่อรายการ"
                          value={item.name}
                          onChange={(e) => updateInfra(item.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number" min={0}
                          className="w-16 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          value={item.qty}
                          onChange={(e) => updateInfra(item.id, { qty: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          className="w-16 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          value={item.unit}
                          onChange={(e) => updateInfra(item.id, { unit: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-24 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          placeholder="รหัส (ไม่บังคับ)"
                          value={item.product_code ?? ""}
                          onChange={(e) => updateInfra(item.id, { product_code: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number" min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          placeholder="0"
                          value={item.cost_price ?? ""}
                          onChange={(e) => updateInfra(item.id, { cost_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number" min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          placeholder="0"
                          value={item.selling_price ?? ""}
                          onChange={(e) => updateInfra(item.id, { selling_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {item.qty && item.selling_price
                          ? `฿${(item.qty * (item.selling_price ?? 0)).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removeInfra(item.id)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== LABOR TAB ===== */}
      {activeTab === "labor" && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">👷 รายการแรงงาน</h3>
              <button
                onClick={() => setLabor((prev) => [...prev, EMPTY_LABOR()])}
                className="px-3 py-1 bg-accent text-white rounded text-xs hover:opacity-90"
              >
                + เพิ่มรายการ
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LABOR_TEMPLATES.map((t) => (
                <button
                  key={t.description}
                  onClick={() =>
                    setLabor((prev) => [
                      ...prev,
                      { id: uid(), description: t.description, unit: t.unit, qty: 1, cost_price: t.cost, selling_price: t.sell },
                    ])
                  }
                  className="px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs hover:bg-muted/20 text-muted/70"
                >
                  + {t.description}
                </button>
              ))}
            </div>
          </div>
          {labor.length === 0 ? (
            <p className="text-center text-muted/60 text-sm py-6">ยังไม่มีรายการแรงงาน</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20 text-muted/50">
                  <th className="text-left px-4 py-2">รายการงาน</th>
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
                  const totalSell = item.qty * item.selling_price;
                  const totalCost = item.qty * item.cost_price;
                  const gp = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100) : 0;
                  return (
                    <tr key={item.id} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-1.5">
                        <input
                          className="w-48 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs"
                          placeholder="รายการงาน"
                          value={item.description}
                          onChange={(e) => updateLabor(item.id, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number" min={0}
                          className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          value={item.qty}
                          onChange={(e) => updateLabor(item.id, { qty: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          className="w-14 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-center"
                          value={item.unit}
                          onChange={(e) => updateLabor(item.id, { unit: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number" min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          value={item.cost_price}
                          onChange={(e) => updateLabor(item.id, { cost_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number" min={0}
                          className="w-20 px-2 py-1 bg-muted/10 border border-border/30 rounded text-xs text-right"
                          value={item.selling_price}
                          onChange={(e) => updateLabor(item.id, { selling_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">฿{totalSell.toLocaleString()}</td>
                      <td className={`px-3 py-1.5 text-right ${gp >= 20 ? "text-green-400" : gp >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                        {gp.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removeLabor(item.id)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/5 font-medium">
                  <td colSpan={5} className="px-4 py-2 text-muted/60">รวมค่าแรงทั้งหมด</td>
                  <td className="px-3 py-2 text-right text-green-400">
                    ฿{labor.reduce((s, i) => s + i.qty * i.selling_price, 0).toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ===== BOQ PREVIEW TAB ===== */}
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
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">จำนวนรายการ</p>
                  <p className="text-xl font-bold mt-1">{boqPreview.length}</p>
                </div>
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">ต้นทุนรวม</p>
                  <p className="text-xl font-bold mt-1">฿{boqSummary.totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">ราคาขายรวม</p>
                  <p className="text-xl font-bold mt-1 text-green-400">฿{boqSummary.totalSelling.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">GP</p>
                  <p className={`text-xl font-bold mt-1 ${boqSummary.gpPct >= 20 ? "text-green-400" : boqSummary.gpPct >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                    {boqSummary.gpPct.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* BOQ by Category */}
              {(Object.entries(boqByCategory) as [string, ToolBOQItem[]][]).map(([cat, items]) => {
                const catSummary = calcBOQSummary(items);
                return (
                  <div key={cat} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/5 border-b border-border/30 flex justify-between items-center">
                      <span className="font-medium text-sm">{BOQ_CATEGORY_LABEL[cat as keyof typeof BOQ_CATEGORY_LABEL] ?? cat}</span>
                      <span className="text-xs text-muted/60">฿{catSummary.totalSelling.toLocaleString()} · GP {catSummary.gpPct.toFixed(1)}%</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/20 text-muted/50">
                          <th className="text-left px-4 py-2">#</th>
                          <th className="text-left px-3 py-2">รหัส</th>
                          <th className="text-left px-3 py-2">รายการ</th>
                          <th className="text-center px-3 py-2">จำนวน</th>
                          <th className="text-center px-3 py-2">หน่วย</th>
                          <th className="text-right px-3 py-2">ต้นทุน</th>
                          <th className="text-right px-3 py-2">ราคาขาย</th>
                          <th className="text-right px-3 py-2">รวมขาย</th>
                          <th className="text-right px-3 py-2">GP%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id ?? idx} className="border-b border-border/10 hover:bg-muted/5">
                            <td className="px-4 py-1.5 text-muted/50">{idx + 1}</td>
                            <td className="px-3 py-1.5 text-muted/60">{item.product_code}</td>
                            <td className="px-3 py-1.5 font-medium">
                              {item.product_name}
                              {item.notes && <span className="text-muted/50 ml-1">({item.notes})</span>}
                            </td>
                            <td className="px-3 py-1.5 text-center">{item.qty}</td>
                            <td className="px-3 py-1.5 text-center text-muted/60">{item.unit}</td>
                            <td className="px-3 py-1.5 text-right text-muted/70">฿{item.cost_price.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right">฿{item.selling_price.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right font-medium">฿{item.total_selling.toLocaleString()}</td>
                            <td className={`px-3 py-1.5 text-right ${item.margin_percent >= 20 ? "text-green-400" : item.margin_percent >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                              {item.margin_percent.toFixed(1)}%
                            </td>
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
    </div>
  );
}
