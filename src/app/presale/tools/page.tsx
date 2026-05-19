"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { presaleMultiProjects, presaleTools } from "@/lib/firestore";
import { useCurrentUser } from "@/lib/UserContext";

const today = () => {
  const d = new Date();
  return `${d.getDate()} ${["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][d.getMonth()]} ${d.getFullYear() + 543}`;
};

const TOOLS = [
  {
    type: "cctv_designer",
    icon: "📷",
    label: "CCTV Designer",
    desc: "ออกแบบระบบกล้องวงจรปิด วางตำแหน่งกล้อง คำนวณ NVR/DVR และสร้าง BOQ",
    color: "from-blue-600/20 to-blue-500/5 border-blue-500/30",
    badge: "พร้อมใช้งาน",
    badgeColor: "bg-green-500/15 text-green-400",
    available: true,
    features: ["Camera Zone Designer", "NVR/DVR Planner", "Infrastructure BOQ", "Labor Costing"],
  },
  {
    type: "wifi_designer",
    icon: "📶",
    label: "WiFi Designer",
    desc: "วางแผน Access Point ออกแบบ Wireless LAN Coverage และสร้าง BOQ",
    color: "from-green-600/20 to-green-500/5 border-green-500/30",
    badge: "กำลังพัฒนา",
    badgeColor: "bg-yellow-500/15 text-yellow-400",
    available: false,
    features: ["AP Placement", "Coverage Map", "Controller Planning", "Network BOQ"],
  },
  {
    type: "access_control",
    icon: "🔐",
    label: "Access Control Designer",
    desc: "ออกแบบระบบควบคุมการเข้าออก ประตู Reader และระบบ Intercom",
    color: "from-purple-600/20 to-purple-500/5 border-purple-500/30",
    badge: "กำลังพัฒนา",
    badgeColor: "bg-yellow-500/15 text-yellow-400",
    available: false,
    features: ["Door Controller", "Card Reader", "Intercom", "Server Integration"],
  },
  {
    type: "network_rack",
    icon: "🖥️",
    label: "Network Rack Planner",
    desc: "วางแผน Rack Layout อุปกรณ์ Network สาย Patch และ Power",
    color: "from-orange-600/20 to-orange-500/5 border-orange-500/30",
    badge: "กำลังพัฒนา",
    badgeColor: "bg-yellow-500/15 text-yellow-400",
    available: false,
    features: ["Rack Layout", "Switch Stacking", "Patch Panel", "Power Budget"],
  },
  {
    type: "server_room",
    icon: "🏢",
    label: "Server Room BOQ",
    desc: "BOQ ครบชุดสำหรับห้อง Server ไฟฟ้า ระบายอากาศ และความปลอดภัย",
    color: "from-red-600/20 to-red-500/5 border-red-500/30",
    badge: "กำลังพัฒนา",
    badgeColor: "bg-yellow-500/15 text-yellow-400",
    available: false,
    features: ["Server Spec", "UPS Planning", "Cooling", "Fire Suppression"],
  },
  {
    type: "custom_boq",
    icon: "📋",
    label: "Custom BOQ",
    desc: "สร้าง BOQ แบบอิสระสำหรับงานที่ไม่มี Template สำเร็จรูป",
    color: "from-gray-600/20 to-gray-500/5 border-gray-500/30",
    badge: "กำลังพัฒนา",
    badgeColor: "bg-yellow-500/15 text-yellow-400",
    available: false,
    features: ["Free-form Items", "Category Groups", "Custom Pricing", "Export BOQ"],
  },
];

export default function PresaleToolsPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [launching, setLaunching] = useState<string | null>(null);

  const handleLaunch = async (toolType: string) => {
    if (launching) return;
    setLaunching(toolType);
    const tool = TOOLS.find((t) => t.type === toolType);
    if (!tool) return;

    // Auto-create a standalone project + tool
    const projectRef = await presaleMultiProjects.add({
      name: `Quick Session — ${today()}`,
      customer_id: "",
      customer_name: "ยังไม่ระบุลูกค้า",
      assigned_to: currentUser?.name ?? "",
      status: "draft",
      notes: "สร้างจาก Tool Launcher — สามารถแก้ไขข้อมูลโปรเจกต์ได้ภายหลัง",
      created_by: currentUser?.name ?? "",
    } as Record<string, unknown>);

    const toolRef = await presaleTools.add({
      presale_project_id: projectRef.id,
      tool_type: toolType,
      name: tool.label,
      status: "draft",
      order: 0,
    } as Record<string, unknown>);

    router.push(`/presale/projects/${projectRef.id}/tools/${toolRef.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Pre-sale Tools</h1>
        <p className="text-sm text-muted/60 mt-1">
          เลือกเครื่องมือที่ต้องการใช้งาน — ไม่จำเป็นต้องสร้างโปรเจกต์ก่อน สามารถผูกกับโปรเจกต์ภายหลังได้
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300 flex items-start gap-3">
        <span className="text-lg mt-0.5">💡</span>
        <div>
          <p className="font-medium">เริ่มใช้งานได้ทันที</p>
          <p className="text-blue-400/70 text-xs mt-0.5">
            กดปุ่มเครื่องมือเพื่อเข้าใช้งานเลย ระบบจะสร้าง Session ให้อัตโนมัติ
            หากต้องการผูกกับโปรเจกต์ สามารถกลับไปแก้ไขใน <span className="underline cursor-pointer" onClick={() => router.push("/presale/projects")}>Presale Projects</span> ได้ภายหลัง
          </p>
        </div>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <div
            key={tool.type}
            className={`bg-gradient-to-br ${tool.color} border rounded-2xl p-5 flex flex-col gap-3 transition-all ${tool.available ? "hover:scale-[1.01]" : "opacity-60"}`}
          >
            {/* Tool Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-3xl">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base">{tool.label}</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted/70 leading-relaxed">{tool.desc}</p>

            {/* Features */}
            <div className="flex flex-wrap gap-1.5">
              {tool.features.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-white/5 rounded text-[11px] text-muted/60">
                  {f}
                </span>
              ))}
            </div>

            {/* Action */}
            <div className="mt-auto pt-1">
              {tool.available ? (
                <button
                  onClick={() => handleLaunch(tool.type)}
                  disabled={!!launching}
                  className="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                >
                  {launching === tool.type ? (
                    <>
                      <span className="animate-spin">⏳</span> กำลังเปิด...
                    </>
                  ) : (
                    <>🚀 เริ่มใช้งาน</>
                  )}
                </button>
              ) : (
                <div className="w-full py-2.5 bg-muted/10 text-muted/40 rounded-xl text-sm text-center">
                  Coming Soon
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Link to Projects */}
      <div className="flex items-center justify-between bg-card border border-border/50 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium">มีโปรเจกต์อยู่แล้ว?</p>
          <p className="text-xs text-muted/60">เปิด Presale Projects เพื่อดู Session และโปรเจกต์ทั้งหมด</p>
        </div>
        <button
          onClick={() => router.push("/presale/projects")}
          className="px-4 py-2 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20"
        >
          ไปหน้า Projects →
        </button>
      </div>
    </div>
  );
}
