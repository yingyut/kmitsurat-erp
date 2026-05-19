"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  presaleMultiProjects, presaleTools, toolBoqItems, projectBoqItems,
} from "@/lib/firestore";
import type {
  PresaleMultiProject, ProjectTool, PresaleToolType, PresaleToolStatus,
  ToolBOQItem, ProjectBOQItem,
} from "@/lib/firestore";
import { mergeToolBOQs, calcBOQSummary, BOQ_CATEGORY_LABEL, BOQ_CATEGORY_COLOR } from "@/lib/boqMerge";
import type { BOQCategory } from "@/lib/types";
import { useCurrentUser } from "@/lib/UserContext";

const TOOL_META: Record<PresaleToolType, { label: string; icon: string; desc: string; available: boolean }> = {
  cctv_designer: { label: "CCTV Designer", icon: "📷", desc: "ออกแบบระบบกล้องวงจรปิด", available: true },
  wifi_designer: { label: "WiFi Designer", icon: "📶", desc: "ออกแบบระบบ Wireless LAN", available: false },
  access_control: { label: "Access Control", icon: "🔐", desc: "ระบบควบคุมการเข้าออก", available: false },
  network_rack: { label: "Network Rack Planner", icon: "🖥️", desc: "วางแผน Rack & Network", available: false },
  server_room: { label: "Server Room BOQ", icon: "🏢", desc: "BOQ ห้อง Server", available: false },
  custom_boq: { label: "Custom BOQ", icon: "📋", desc: "BOQ แบบกำหนดเอง", available: false },
};

const TOOL_STATUS_LABEL: Record<PresaleToolStatus, string> = {
  draft: "Draft",
  designing: "กำลังออกแบบ",
  boq_ready: "BOQ พร้อม",
  sent_to_quotation: "ส่ง Quotation แล้ว",
};
const TOOL_STATUS_COLOR: Record<PresaleToolStatus, string> = {
  draft: "bg-gray-500/15 text-gray-400",
  designing: "bg-blue-500/15 text-blue-400",
  boq_ready: "bg-green-500/15 text-green-400",
  sent_to_quotation: "bg-purple-500/15 text-purple-400",
};

const PROJECT_STATUS_FROM_TOOLS = (tools: ProjectTool[]): PresaleMultiProject["status"] => {
  if (tools.length === 0) return "draft";
  if (tools.every((t) => t.status === "sent_to_quotation")) return "completed";
  if (tools.every((t) => t.status === "boq_ready" || t.status === "sent_to_quotation")) return "ready";
  if (tools.some((t) => t.status !== "draft")) return "in_progress";
  return "draft";
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const projectId = params.id as string;

  const [project, setProject] = useState<PresaleMultiProject | null>(null);
  const [tools, setTools] = useState<ProjectTool[]>([]);
  const [boqItems, setBoqItems] = useState<ProjectBOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tools" | "boq">("tools");
  const [showAddTool, setShowAddTool] = useState(false);
  const [newToolType, setNewToolType] = useState<PresaleToolType | "">("");
  const [newToolName, setNewToolName] = useState("");
  const [addingTool, setAddingTool] = useState(false);
  const [generatingBOQ, setGeneratingBOQ] = useState(false);

  const loadData = useCallback(async () => {
    const [p, t, b] = await Promise.all([
      presaleMultiProjects.get(projectId),
      presaleTools.listWhere("presale_project_id", projectId),
      projectBoqItems.listWhere("presale_project_id", projectId),
    ]);
    setProject(p);
    setTools(t.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setBoqItems(b.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddTool = async () => {
    if (!newToolType) return;
    setAddingTool(true);
    const meta = TOOL_META[newToolType];
    await presaleTools.add({
      presale_project_id: projectId,
      tool_type: newToolType,
      name: newToolName.trim() || meta.label,
      status: "draft",
      order: tools.length,
    } as Record<string, unknown>);
    const updated = await presaleTools.listWhere("presale_project_id", projectId);
    setTools(updated.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setShowAddTool(false);
    setNewToolType("");
    setNewToolName("");
    setAddingTool(false);
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm("ลบ Tool นี้? BOQ ของ Tool จะถูกลบด้วย")) return;
    // Delete tool BOQ items first
    const items = await toolBoqItems.listWhere("tool_id", toolId);
    await Promise.all(items.map((i) => i.id && toolBoqItems.remove(i.id)));
    await presaleTools.remove(toolId);
    setTools((prev) => prev.filter((t) => t.id !== toolId));
  };

  const handleGenerateProjectBOQ = async () => {
    setGeneratingBOQ(true);
    // Collect all tool BOQ items
    const allItems: ToolBOQItem[] = [];
    for (const tool of tools) {
      if (tool.id) {
        const items = await toolBoqItems.listWhere("tool_id", tool.id);
        allItems.push(...items);
      }
    }

    // Delete existing project BOQ
    const existing = await projectBoqItems.listWhere("presale_project_id", projectId);
    await Promise.all(existing.map((i) => i.id && projectBoqItems.remove(i.id)));

    // Merge and save
    const merged = mergeToolBOQs(allItems, projectId, "kmitsurat");
    for (const item of merged) {
      await projectBoqItems.add(item as Record<string, unknown>);
    }

    // Update project totals
    const summary = calcBOQSummary(merged);
    const newStatus = PROJECT_STATUS_FROM_TOOLS(tools);
    await presaleMultiProjects.update(projectId, {
      total_cost: summary.totalCost,
      total_selling: summary.totalSelling,
      gp_percent: summary.gpPct,
      status: newStatus,
    });

    await loadData();
    setActiveTab("boq");
    setGeneratingBOQ(false);
  };

  const boqByCategory = boqItems.reduce<Record<string, ProjectBOQItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const boqSummary = calcBOQSummary(boqItems);
  const readyTools = tools.filter((t) => t.status === "boq_ready" || t.status === "sent_to_quotation");

  if (loading) {
    return <div className="p-8 text-center text-muted/60">กำลังโหลด...</div>;
  }
  if (!project) {
    return <div className="p-8 text-center text-muted/60">ไม่พบโปรเจกต์</div>;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted/60">
        <button onClick={() => router.push("/presale/projects")} className="hover:text-foreground">
          Presale Projects
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted/60 mt-1">
              {project.customer_name}
              {project.assigned_to && ` · ผู้รับผิดชอบ: ${project.assigned_to}`}
            </p>
            {project.notes && <p className="text-sm text-muted/50 mt-1">{project.notes}</p>}
          </div>
          <div className="text-right space-y-2">
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
              project.status === "completed" ? "bg-purple-500/15 text-purple-400" :
              project.status === "ready" ? "bg-green-500/15 text-green-400" :
              project.status === "in_progress" ? "bg-blue-500/15 text-blue-400" :
              "bg-gray-500/15 text-gray-400"
            }`}>
              {project.status === "completed" ? "เสร็จสิ้น" :
               project.status === "ready" ? "BOQ พร้อม" :
               project.status === "in_progress" ? "กำลังออกแบบ" : "Draft"}
            </div>
            {project.total_selling != null && (
              <p className="text-sm font-medium">฿{project.total_selling.toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          {readyTools.length > 0 && (
            <button
              onClick={handleGenerateProjectBOQ}
              disabled={generatingBOQ}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {generatingBOQ ? "กำลังรวม BOQ..." : "🔄 Generate Project BOQ"}
            </button>
          )}
          {boqItems.length > 0 && (
            <button
              onClick={() => setActiveTab("boq")}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30"
            >
              ดู BOQ รวม ({boqItems.length} รายการ)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 w-fit">
        {(["tools", "boq"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-accent text-white" : "text-muted/60 hover:text-foreground"
            }`}
          >
            {tab === "tools" ? `🔧 Tool Modules (${tools.length})` : `📋 BOQ รวม (${boqItems.length})`}
          </button>
        ))}
      </div>

      {/* Tools Tab */}
      {activeTab === "tools" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted/60">เครื่องมือออกแบบในโปรเจกต์นี้</p>
            <button
              onClick={() => setShowAddTool(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              + Add Tool
            </button>
          </div>

          {tools.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/50 border-dashed p-12 text-center text-muted/60">
              <p className="text-4xl mb-3">🔧</p>
              <p className="font-medium">ยังไม่มี Tool</p>
              <p className="text-sm mt-1">คลิก "Add Tool" เพื่อเพิ่มเครื่องมือออกแบบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {tools.map((tool) => {
                const meta = TOOL_META[tool.tool_type];
                return (
                  <div key={tool.id} className="bg-card rounded-xl border border-border/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-xl">
                          {meta.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{tool.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${TOOL_STATUS_COLOR[tool.status]}`}>
                              {TOOL_STATUS_LABEL[tool.status]}
                            </span>
                          </div>
                          <p className="text-xs text-muted/60">{meta.label} · {meta.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {tool.boq_total_selling != null && (
                          <div className="text-right">
                            <p className="text-xs text-muted/60">ราคาขาย</p>
                            <p className="text-sm font-medium">฿{tool.boq_total_selling.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/presale/projects/${projectId}/tools/${tool.id}`)}
                            className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20"
                          >
                            Open Tool
                          </button>
                          <button
                            onClick={() => tool.id && handleDeleteTool(tool.id)}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BOQ Tab */}
      {activeTab === "boq" && (
        <div className="space-y-4">
          {boqItems.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/50 border-dashed p-12 text-center text-muted/60">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">ยังไม่มี BOQ</p>
              <p className="text-sm mt-1">Generate BOQ ของแต่ละ Tool ก่อน แล้วกด "Generate Project BOQ"</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">ราคาต้นทุนรวม</p>
                  <p className="text-xl font-bold mt-1">฿{boqSummary.totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">ราคาขายรวม</p>
                  <p className="text-xl font-bold mt-1 text-green-400">฿{boqSummary.totalSelling.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted/60">GP</p>
                  <p className="text-xl font-bold mt-1 text-blue-400">{boqSummary.gpPct.toFixed(1)}%</p>
                  <p className="text-xs text-muted/60">฿{boqSummary.gpAmt.toLocaleString()}</p>
                </div>
              </div>

              {/* BOQ by Category */}
              {(Object.entries(boqByCategory) as [BOQCategory, ProjectBOQItem[]][]).map(([cat, items]) => {
                const catSummary = calcBOQSummary(items);
                return (
                  <div key={cat} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                    <div className={`px-4 py-2.5 flex items-center justify-between border-b border-border/30 ${BOQ_CATEGORY_COLOR[cat]}`}>
                      <span className="font-medium text-sm">{BOQ_CATEGORY_LABEL[cat]}</span>
                      <span className="text-xs">฿{catSummary.totalSelling.toLocaleString()} · GP {catSummary.gpPct.toFixed(1)}%</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/20 text-muted/50">
                          <th className="text-left px-4 py-2 font-medium">รหัส</th>
                          <th className="text-left px-4 py-2 font-medium">รายการ</th>
                          <th className="text-center px-3 py-2 font-medium">จำนวน</th>
                          <th className="text-center px-3 py-2 font-medium">หน่วย</th>
                          <th className="text-right px-3 py-2 font-medium">ราคา/หน่วย</th>
                          <th className="text-right px-3 py-2 font-medium">รวม</th>
                          <th className="text-right px-3 py-2 font-medium">GP%</th>
                          {items.some((i) => i.is_merged) && (
                            <th className="text-center px-3 py-2 font-medium">รวมจาก</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-b border-border/10 hover:bg-muted/5">
                            <td className="px-4 py-2 text-muted/60">{item.product_code}</td>
                            <td className="px-4 py-2 font-medium">{item.product_name}</td>
                            <td className="px-3 py-2 text-center">{item.qty}</td>
                            <td className="px-3 py-2 text-center text-muted/60">{item.unit}</td>
                            <td className="px-3 py-2 text-right">฿{item.selling_price.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-medium">฿{item.total_selling.toLocaleString()}</td>
                            <td className={`px-3 py-2 text-right ${item.margin_percent >= 20 ? "text-green-400" : item.margin_percent >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                              {item.margin_percent.toFixed(1)}%
                            </td>
                            {items.some((i) => i.is_merged) && (
                              <td className="px-3 py-2 text-center">
                                {item.is_merged && (
                                  <span className="px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded text-[10px]">
                                    รวม {item.source_tools.length} Tool
                                  </span>
                                )}
                              </td>
                            )}
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

      {/* Add Tool Modal */}
      {showAddTool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-lg space-y-4">
            <h2 className="font-bold text-lg">เพิ่ม Tool Module</h2>

            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(TOOL_META) as [PresaleToolType, typeof TOOL_META[PresaleToolType]][]).map(([type, meta]) => (
                <button
                  key={type}
                  onClick={() => meta.available && setNewToolType(type)}
                  disabled={!meta.available}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    newToolType === type
                      ? "border-accent bg-accent/10"
                      : meta.available
                      ? "border-border/50 hover:border-accent/50 hover:bg-muted/5"
                      : "border-border/20 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div className="text-2xl mb-1">{meta.icon}</div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted/60">{meta.desc}</p>
                  {!meta.available && <p className="text-xs text-muted/40 mt-1">Coming Soon</p>}
                </button>
              ))}
            </div>

            {newToolType && (
              <div>
                <label className="text-xs text-muted/60 mb-1 block">ชื่อ Tool (ไม่บังคับ)</label>
                <input
                  className="w-full px-3 py-2 bg-muted/10 border border-border/50 rounded-lg text-sm"
                  placeholder={`เช่น ${TOOL_META[newToolType].label} - อาคาร A`}
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowAddTool(false); setNewToolType(""); setNewToolName(""); }}
                className="flex-1 px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddTool}
                disabled={!newToolType || addingTool}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {addingTool ? "กำลังเพิ่ม..." : "เพิ่ม Tool"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
