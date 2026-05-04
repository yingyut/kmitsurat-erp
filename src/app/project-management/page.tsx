"use client";
import { useEffect, useMemo, useState } from "react";
import type { Project, ProjectTask, User } from "@/lib/types";

const statuses = ["pending", "in_progress", "completed", "blocked"] as const;
const statusLabels: Record<string, string> = {
  pending: "ยังไม่เริ่ม",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จแล้ว",
  blocked: "ติดปัญหา",
};
const statusColor: Record<string, string> = {
  pending: "bg-gray-700 text-gray-300",
  in_progress: "bg-blue-900/50 text-blue-400",
  completed: "bg-green-900/50 text-green-400",
  blocked: "bg-red-900/50 text-red-400",
};
const statusDot: Record<string, string> = {
  pending: "bg-gray-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  blocked: "bg-red-500",
};

const PHASES = ["เสนอขาย", "เซ็นสัญญา", "เตรียมงาน", "ติดตั้ง", "ส่งมอบ", "หลังการขาย"] as const;

type TaskSeed = Omit<ProjectTask, "id" | "tenant_id" | "project_id" | "project_name" | "order">;

// Templates: ใส่ข้อมูลพร้อมใช้สำหรับงาน SI ทั่วไป
const TEMPLATES: Record<string, { label: string; tasks: TaskSeed[] }> = {
  server_room: {
    label: "Server Room (ห้อง Server)",
    tasks: [
      // เสนอขาย
      { phase: "เสนอขาย", title: "Site Survey & รับฟัง requirement", description: "เข้าพบลูกค้า สำรวจพื้นที่จริง เก็บข้อมูลขนาดห้อง โหลดไฟ ระบบเดิม", assigned_to: "", start_date: "", due_date: "", status: "completed", progress: 100, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "สรุป Requirement และ Solution Concept", description: "วิเคราะห์ความต้องการ จัดทำเอกสาร Solution Concept", assigned_to: "", start_date: "", due_date: "", status: "in_progress", progress: 60, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "ออกแบบ Layout (Floor plan, Rack, Cooling)", description: "ออกแบบ Floor plan, Rack layout, Cable tray, ระบบ Cooling", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "คำนวณ BOQ และจัดทำใบเสนอราคา", description: "คำนวณรายการอุปกรณ์ทั้งหมด ราคา และค่าแรง", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "นำเสนอ Solution กับลูกค้า", description: "Present Solution + Quotation ให้ลูกค้า", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      // เซ็นสัญญา
      { phase: "เซ็นสัญญา", title: "เจรจาต่อรอง / ปรับแก้", description: "ปรับแก้ Spec / ราคา ตามที่ลูกค้าต้องการ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เซ็นสัญญา", title: "รับ PO / Sign Contract", description: "รับใบสั่งซื้อหรือเซ็นสัญญา", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      // เตรียมงาน
      { phase: "เตรียมงาน", title: "สั่งซื้ออุปกรณ์ (Rack, UPS, Cooling, PDU)", description: "ออก PO ให้ Vendor ทุกราย ติดตามวันส่ง", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เตรียมงาน", title: "ประสานงานก่อสร้าง (พื้น Raised Floor, ฝ้า, ไฟ)", description: "ประสานผู้รับเหมา / ลูกค้า เพื่อเตรียมพื้นที่", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เตรียมงาน", title: "ตรวจรับอุปกรณ์ที่หน้างาน", description: "ตรวจสอบจำนวน / Spec ก่อนเริ่มติดตั้ง", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      // ติดตั้ง
      { phase: "ติดตั้ง", title: "ติดตั้ง Raised Floor / Cable Tray", description: "งานโครงสร้างพื้น Raised Floor และทาง Cable Tray", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้งระบบไฟฟ้าและ UPS", description: "เดินไฟ ติดตั้ง UPS และ PDU", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้ง Cooling / PAC", description: "ติดตั้งและทดสอบ Precision Air Conditioning", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้ง Rack / PDU", description: "ตั้ง Rack และเดิน PDU ในตู้", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "เดินสาย Network / Patch Panel", description: "เดินสาย UTP / Fiber ทำ Patch Panel + Label", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้ง Server / Storage", description: "Mount Server, Storage และเชื่อมต่อระบบ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ทดสอบระบบ Burn-in / Load test", description: "ทดสอบโหลด UPS, อุณหภูมิ, ระบบไฟ Backup", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      // ส่งมอบ
      { phase: "ส่งมอบ", title: "Training ผู้ใช้งาน", description: "อบรมการใช้งานเบื้องต้นและการดูแล", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "จัดทำเอกสาร As-built / Manual", description: "ทำเอกสาร As-built drawing, IP plan, Manual", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "ส่งมอบงาน / รับใบตรวจรับ", description: "ส่งมอบงานทั้งหมด รับใบตรวจรับและวางบิล", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      // หลังการขาย
      { phase: "หลังการขาย", title: "Warranty / MA Phase 1", description: "เริ่มประกัน 1 ปี / MA ตามสัญญา", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "หลังการขาย", title: "PM Quarterly Check", description: "Preventive Maintenance ทุก 3 เดือน", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
    ],
  },
  wifi: {
    label: "WiFi Solution",
    tasks: [
      { phase: "เสนอขาย", title: "Site Survey + Predictive Heatmap", description: "สำรวจพื้นที่และทำ Predictive Heatmap", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "ออกแบบ AP Coverage", description: "วาง AP ตามจำนวน User และพื้นที่", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "BOQ + Quotation", description: "จัดทำ BOQ และใบเสนอราคา", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เซ็นสัญญา", title: "รับ PO / Contract", description: "รับใบสั่งซื้อ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เตรียมงาน", title: "สั่งซื้ออุปกรณ์ AP / Controller / Switch", description: "ออก PO ให้ Vendor", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "เดินสาย LAN + PoE Switch", description: "เดินสายและติดตั้ง Switch", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้ง AP", description: "ติดตั้ง Access Point ตามจุดที่ออกแบบ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "Configuration SSID / VLAN / Authentication", description: "Setup Controller, SSID, VLAN, Radius/Captive Portal", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "Heatmap จริง + ปรับ AP", description: "ทำ Heatmap หลังติดตั้ง ปรับตำแหน่ง AP / Power", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ทดสอบ Roaming / Performance", description: "ทดสอบการเชื่อมต่อ Roaming Speed", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "Training Admin", description: "อบรม Admin การใช้งาน Controller", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "ส่งมอบงาน", description: "ส่งมอบและรับใบตรวจรับ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "หลังการขาย", title: "MA / Warranty", description: "เริ่มประกัน / MA", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
    ],
  },
  cctv: {
    label: "CCTV Solution",
    tasks: [
      { phase: "เสนอขาย", title: "Survey จุดติดตั้งกล้อง", description: "สำรวจตำแหน่งติดตั้งและมุมมองที่ต้องการ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "ออกแบบ Camera Layout", description: "เลือกชนิดกล้อง / Lens / NVR / Storage", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "BOQ + Quotation", description: "จัดทำ BOQ และใบเสนอราคา", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เซ็นสัญญา", title: "รับ PO", description: "รับใบสั่งซื้อ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เตรียมงาน", title: "สั่งซื้ออุปกรณ์ (Camera, NVR, Storage, Switch)", description: "ออก PO Vendor", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "เดินสาย Cabling / PoE", description: "เดินสาย UTP จากกล้องไป NVR/Switch", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้งกล้อง CCTV", description: "ติดตั้งกล้องตามตำแหน่งที่ออกแบบ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้ง NVR / Storage", description: "ติดตั้งและ Format Storage", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "Setup Recording / User Access", description: "ตั้ง Schedule การบันทึก / Account User", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ทดสอบระบบ + ปรับมุมกล้อง", description: "ทดสอบภาพ Day/Night ปรับมุมและโฟกัส", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "Training", description: "อบรมการดูภาพและ Playback", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "ส่งมอบงาน", description: "ส่งมอบและรับใบตรวจรับ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "หลังการขาย", title: "MA / Warranty", description: "เริ่มประกัน / MA", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
    ],
  },
  general: {
    label: "Generic SI Project",
    tasks: [
      { phase: "เสนอขาย", title: "เก็บ Requirement", description: "พบลูกค้าและเก็บความต้องการ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "ออกแบบ Solution / BOQ", description: "ออกแบบและจัดทำ BOQ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เสนอขาย", title: "เสนอราคา", description: "ส่งใบเสนอราคา", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เซ็นสัญญา", title: "รับ PO", description: "รับใบสั่งซื้อ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "เตรียมงาน", title: "สั่งซื้ออุปกรณ์", description: "ออก PO Vendor", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ติดตั้งและ Configure", description: "งานติดตั้งหน้างาน", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ติดตั้ง", title: "ทดสอบระบบ", description: "Test ทั้งระบบ", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "ส่งมอบ", title: "Training + ส่งมอบ", description: "อบรมและส่งมอบงาน", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
      { phase: "หลังการขาย", title: "MA / Warranty", description: "ประกันและบำรุงรักษา", assigned_to: "", start_date: "", due_date: "", status: "pending", progress: 0, notes: "", completed_at: "" },
    ],
  },
};

const emptyForm: TaskSeed = {
  phase: "เสนอขาย",
  title: "",
  description: "",
  assigned_to: "",
  start_date: "",
  due_date: "",
  status: "pending",
  progress: 0,
  notes: "",
  completed_at: "",
};

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskSeed>(emptyForm);

  // Drag-and-drop
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"phase" | "none">("phase");

  async function load() {
    const fs = await import("@/lib/firestore");
    try {
      const [p, t, u] = await Promise.all([fs.projects.list(), fs.projectTasks.list(), fs.users.list()]);
      setProjects(p);
      setTasks(t);
      setUsers(u.filter(x => x.active));
      if (!selectedProjectId && p.length > 0) setSelectedProjectId(p[0].id!);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { setMounted(true); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const projectTasks = useMemo(() => {
    return tasks
      .filter(t => t.project_id === selectedProjectId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return projectTasks;
    return projectTasks.filter(t => t.status === statusFilter);
  }, [projectTasks, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = projectTasks.length;
    const done = projectTasks.filter(t => t.status === "completed").length;
    const inProgress = projectTasks.filter(t => t.status === "in_progress").length;
    const blocked = projectTasks.filter(t => t.status === "blocked").length;
    const pending = projectTasks.filter(t => t.status === "pending").length;
    const avgProgress = total > 0 ? Math.round(projectTasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;
    const overall = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, blocked, pending, avgProgress, overall };
  }, [projectTasks]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(t: ProjectTask) {
    setEditId(t.id!);
    setForm({
      phase: t.phase || "เสนอขาย",
      title: t.title,
      description: t.description,
      assigned_to: t.assigned_to,
      start_date: t.start_date || "",
      due_date: t.due_date || "",
      status: t.status,
      progress: t.progress || 0,
      notes: t.notes || "",
      completed_at: t.completed_at || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !selectedProject) return;
    setSaving(true);
    const fs = await import("@/lib/firestore");
    try {
      const payload = {
        ...form,
        project_id: selectedProject.id!,
        project_name: selectedProject.name,
        completed_at: form.status === "completed" && !form.completed_at ? new Date().toISOString().slice(0, 10) : form.completed_at,
        progress: form.status === "completed" ? 100 : form.progress,
      };
      if (editId) {
        await fs.projectTasks.update(editId, payload as unknown as Record<string, unknown>);
      } else {
        const maxOrder = projectTasks.reduce((m, t) => Math.max(m, t.order || 0), 0);
        await fs.projectTasks.add({ ...payload, order: maxOrder + 1 } as unknown as Record<string, unknown>);
      }
      setForm(emptyForm); setShowForm(false); setEditId(null);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`ลบงาน "${title}" ?`)) return;
    const fs = await import("@/lib/firestore");
    await fs.projectTasks.remove(id);
    await load();
  }

  async function quickStatusChange(t: ProjectTask, newStatus: ProjectTask["status"]) {
    const fs = await import("@/lib/firestore");
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      update.progress = 100;
      update.completed_at = new Date().toISOString().slice(0, 10);
    } else if (newStatus === "pending") {
      update.progress = 0;
    }
    await fs.projectTasks.update(t.id!, update);
    await load();
  }

  async function quickProgressChange(t: ProjectTask, progress: number) {
    const fs = await import("@/lib/firestore");
    const update: Record<string, unknown> = { progress };
    if (progress >= 100) {
      update.status = "completed";
      update.completed_at = new Date().toISOString().slice(0, 10);
    } else if (progress > 0 && t.status === "pending") {
      update.status = "in_progress";
    }
    await fs.projectTasks.update(t.id!, update);
    await load();
  }

  // Move up / down within current sorted list
  async function moveTask(t: ProjectTask, dir: -1 | 1) {
    const idx = projectTasks.findIndex(x => x.id === t.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= projectTasks.length) return;
    const other = projectTasks[swapIdx];
    const fs = await import("@/lib/firestore");
    await Promise.all([
      fs.projectTasks.update(t.id!, { order: other.order }),
      fs.projectTasks.update(other.id!, { order: t.order }),
    ]);
    await load();
  }

  // Drag-and-drop reorder
  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return; }
    const dragged = projectTasks.find(t => t.id === draggingId);
    const target = projectTasks.find(t => t.id === targetId);
    if (!dragged || !target) { setDraggingId(null); return; }

    // Reassign orders so dragged sits where target was
    const reordered = projectTasks.filter(t => t.id !== draggingId);
    const targetIdx = reordered.findIndex(t => t.id === targetId);
    reordered.splice(targetIdx, 0, dragged);

    const fs = await import("@/lib/firestore");
    await Promise.all(
      reordered.map((t, i) => fs.projectTasks.update(t.id!, { order: i + 1 }))
    );
    setDraggingId(null);
    await load();
  }

  async function applyTemplate(key: string) {
    if (!selectedProject) return;
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    if (projectTasks.length > 0) {
      if (!confirm(`โปรเจคนี้มีงานอยู่แล้ว ${projectTasks.length} รายการ ต้องการเพิ่ม Template "${tpl.label}" ต่อท้ายหรือไม่?`)) return;
    }
    setSaving(true);
    const fs = await import("@/lib/firestore");
    const startOrder = projectTasks.reduce((m, t) => Math.max(m, t.order || 0), 0);
    try {
      // Sequential to preserve order
      for (let i = 0; i < tpl.tasks.length; i++) {
        const seed = tpl.tasks[i];
        await fs.projectTasks.add({
          ...seed,
          project_id: selectedProject.id!,
          project_name: selectedProject.name,
          order: startOrder + i + 1,
        } as unknown as Record<string, unknown>);
      }
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  // Group filteredTasks by phase preserving order
  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ phase: "ทั้งหมด", items: filteredTasks }];
    const map = new Map<string, ProjectTask[]>();
    PHASES.forEach(p => map.set(p, []));
    filteredTasks.forEach(t => {
      const p = t.phase || "อื่นๆ";
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(t);
    });
    return [...map.entries()].filter(([, items]) => items.length > 0).map(([phase, items]) => ({ phase, items }));
  }, [filteredTasks, groupBy]);

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="บริหารโปรเจกต์ / Action Plan">Project Management</h1>
          <p className="text-xs text-muted">วาง Action Plan ติดตามสถานะ และ Monitor ความคืบหน้าแต่ละโปรเจค</p>
        </div>
        <button onClick={openAdd} disabled={!selectedProject} title="เพิ่ม Action ใหม่" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">+ เพิ่ม Action</button>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (
      <>
        {/* Project selector + summary */}
        <div className="rounded-xl bg-card border border-border p-4 mb-4">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="text-xs text-muted">เลือกโปรเจค</label>
            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="flex-1 min-w-[260px] rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent">
              <option value="">-- เลือกโปรเจค --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.customer_name} ({p.status})</option>
              ))}
            </select>
            {selectedProject && (
              <div className="text-xs text-muted">
                ลูกค้า: <span className="text-foreground">{selectedProject.customer_name}</span> · ประเภท: <span className="text-foreground">{selectedProject.type}</span> · มูลค่า: <span className="text-foreground">{(selectedProject.value || 0).toLocaleString()} THB</span>
              </div>
            )}
          </div>

          {selectedProject && (
            <>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted">ความคืบหน้าโดยรวม (จากสถานะ)</span>
                  <span className="font-semibold text-accent">{stats.overall}% — {stats.done}/{stats.total} งานเสร็จ</span>
                </div>
                <div className="h-2 rounded-full bg-background overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${stats.overall}%` }} />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <button onClick={() => setStatusFilter("all")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "all" ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                  <p className="text-base font-bold">{stats.total}</p>
                  <p className="text-[10px] text-muted">ทั้งหมด</p>
                </button>
                <button onClick={() => setStatusFilter("pending")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "pending" ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                  <p className="text-base font-bold text-gray-300">{stats.pending}</p>
                  <p className="text-[10px] text-muted">ยังไม่เริ่ม</p>
                </button>
                <button onClick={() => setStatusFilter("in_progress")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "in_progress" ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                  <p className="text-base font-bold text-blue-400">{stats.inProgress}</p>
                  <p className="text-[10px] text-muted">กำลังดำเนินการ</p>
                </button>
                <button onClick={() => setStatusFilter("completed")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "completed" ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                  <p className="text-base font-bold text-green-400">{stats.done}</p>
                  <p className="text-[10px] text-muted">เสร็จแล้ว</p>
                </button>
                <button onClick={() => setStatusFilter("blocked")} className={`rounded-lg border p-2.5 text-center transition-colors ${statusFilter === "blocked" ? "border-accent bg-accent/10" : "border-border bg-background hover:bg-card-hover"}`}>
                  <p className="text-base font-bold text-red-400">{stats.blocked}</p>
                  <p className="text-[10px] text-muted">ติดปัญหา</p>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Templates */}
        {selectedProject && (
          <div className="rounded-xl bg-card border border-border p-3 mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted shrink-0">📋 โหลด Template สำเร็จรูป:</span>
            {Object.entries(TEMPLATES).map(([key, tpl]) => (
              <button key={key} onClick={() => applyTemplate(key)} disabled={saving} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover hover:border-accent disabled:opacity-50">
                + {tpl.label}
              </button>
            ))}
            <span className="text-[10px] text-muted ml-auto">เพิ่มต่อท้ายงานเดิม / ลาก-วางเพื่อจัดเรียงใหม่ได้</span>
          </div>
        )}

        {/* View toggle */}
        {selectedProject && projectTasks.length > 0 && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="text-muted">มุมมอง:</span>
            <button onClick={() => setGroupBy("phase")} className={`rounded-md px-2.5 py-1 ${groupBy === "phase" ? "bg-accent text-white" : "border border-border text-muted hover:bg-card-hover"}`}>จัดกลุ่มตาม Phase</button>
            <button onClick={() => setGroupBy("none")} className={`rounded-md px-2.5 py-1 ${groupBy === "none" ? "bg-accent text-white" : "border border-border text-muted hover:bg-card-hover"}`}>เรียงตามลำดับ</button>
          </div>
        )}

        {/* Form */}
        {showForm && selectedProject && (
          <div className="rounded-xl bg-card border border-border p-5 mb-4">
            <h2 className="text-base font-semibold mb-3">{editId ? "แก้ไข Action" : "เพิ่ม Action ใหม่"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-muted">ชื่องาน *</label>
                <input placeholder="เช่น Site Survey, ออกแบบ Layout" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted">Phase</label>
                <select value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted">ผู้รับผิดชอบ</label>
                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  <option value="">-- เลือก --</option>
                  {users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted">วันเริ่ม</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted">กำหนดเสร็จ</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted">สถานะ</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectTask["status"] })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent mt-1">
                  {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-[10px] text-muted">ความคืบหน้า: {form.progress}%</label>
                <input type="range" min={0} max={100} step={5} value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="w-full mt-1 accent-accent" />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-[10px] text-muted">รายละเอียด</label>
                <textarea placeholder="รายละเอียดของงาน" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-16 resize-y mt-1" />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-[10px] text-muted">บันทึก / อัปเดตล่าสุด</label>
                <textarea placeholder="เช่น เจอ vendor delay 2 สัปดาห์, ลูกค้าขอเพิ่ม spec X" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-12 resize-y mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่ม"}</button>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Empty states */}
        {!selectedProject && projects.length === 0 && (
          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <p className="text-muted text-sm">ยังไม่มีโปรเจค กรุณาสร้างโปรเจคในเมนู <b>Projects</b> ก่อน</p>
          </div>
        )}

        {selectedProject && projectTasks.length === 0 && !showForm && (
          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <p className="text-muted text-sm mb-3">โปรเจคนี้ยังไม่มี Action Plan</p>
            <p className="text-[11px] text-muted">เลือก Template ด้านบน หรือกด <b>+ เพิ่ม Action</b> เพื่อเริ่มต้น</p>
          </div>
        )}

        {/* Task list */}
        {selectedProject && filteredTasks.length > 0 && (
          <div className="space-y-4">
            {grouped.map(({ phase, items }) => (
              <div key={phase}>
                {groupBy === "phase" && (
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-accent">{phase}</h3>
                    <span className="text-[10px] text-muted">
                      {items.filter(t => t.status === "completed").length}/{items.length} เสร็จ
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((t) => {
                    const idxInAll = projectTasks.findIndex(x => x.id === t.id);
                    const overdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== "completed";
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDraggingId(t.id!)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDrop(t.id!)}
                        onDragEnd={() => setDraggingId(null)}
                        className={`rounded-xl bg-card border p-3 transition-all ${draggingId === t.id ? "opacity-50 border-accent" : "border-border hover:border-accent/50"}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag handle + reorder */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
                            <span className="cursor-move text-muted text-base leading-none select-none" title="ลากเพื่อจัดเรียง">⋮⋮</span>
                            <button onClick={() => moveTask(t, -1)} disabled={idxInAll === 0} title="เลื่อนขึ้น" className="text-muted hover:text-accent text-xs disabled:opacity-30 leading-none">▲</button>
                            <button onClick={() => moveTask(t, 1)} disabled={idxInAll === projectTasks.length - 1} title="เลื่อนลง" className="text-muted hover:text-accent text-xs disabled:opacity-30 leading-none">▼</button>
                          </div>

                          {/* Status dot */}
                          <span className={`mt-1.5 shrink-0 h-2.5 w-2.5 rounded-full ${statusDot[t.status]}`} title={statusLabels[t.status]} />

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] text-muted">#{idxInAll + 1}</span>
                              <p className={`font-medium text-sm ${t.status === "completed" ? "line-through text-muted" : ""}`}>{t.title}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[t.status]}`}>{statusLabels[t.status]}</span>
                              {groupBy === "none" && t.phase && <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">{t.phase}</span>}
                              {overdue && <span className="shrink-0 rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">⚠ เลยกำหนด</span>}
                            </div>
                            {t.description && <p className="text-xs text-muted mb-1.5">{t.description}</p>}

                            {/* Progress bar */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={t.progress || 0}
                                onChange={e => quickProgressChange(t, Number(e.target.value))}
                                className="flex-1 h-1 accent-accent cursor-pointer"
                                title="ปรับความคืบหน้า"
                              />
                              <span className="text-[10px] text-muted w-8 text-right">{t.progress || 0}%</span>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted">
                              {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                              {t.due_date && <span className={overdue ? "text-red-400" : ""}>📅 {t.due_date}</span>}
                              {t.completed_at && <span className="text-green-400">✓ เสร็จเมื่อ {t.completed_at}</span>}
                              {t.notes && <span title={t.notes}>📝 {t.notes.slice(0, 50)}{t.notes.length > 50 ? "..." : ""}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <select value={t.status} onChange={e => quickStatusChange(t, e.target.value as ProjectTask["status"])} className="text-xs rounded border border-border bg-background px-1.5 py-0.5 focus:outline-none focus:border-accent">
                              {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                            </select>
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => openEdit(t)} className="text-[10px] text-accent hover:underline">แก้ไข</button>
                              <button onClick={() => handleDelete(t.id!, t.title)} className="text-[10px] text-danger hover:underline">ลบ</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedProject && projectTasks.length > 0 && filteredTasks.length === 0 && (
          <p className="text-muted text-sm text-center py-4">ไม่พบงานตามตัวกรอง</p>
        )}
      </>
      )}
    </div>
  );
}
