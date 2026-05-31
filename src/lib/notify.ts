"use client";
import type { PresaleRequest, NotificationWorkflow, NotificationChannel, User, InAppNotification } from "./types";

const TENANT = "kmitsurat";

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || "");
}

function resolveRecipientEmails(
  workflow: NotificationWorkflow,
  users: User[],
  extraEmails: string[] = []
): string[] {
  const emails = new Set<string>([...workflow.recipient_emails, ...extraEmails]);
  for (const u of users) {
    if (u.email && workflow.recipient_roles.includes(u.role)) emails.add(u.email);
    if (u.email && u.name && workflow.recipient_users.includes(u.name)) emails.add(u.email);
  }
  return [...emails].filter(Boolean);
}

function resolveRecipientNames(
  workflow: NotificationWorkflow,
  users: User[],
  extraNames: string[] = []
): string[] {
  const names = new Set<string>([...extraNames]);
  for (const u of users) {
    if (u.name && workflow.recipient_roles.includes(u.role)) names.add(u.name);
    if (u.name && workflow.recipient_users.includes(u.name)) names.add(u.name);
  }
  return [...names].filter(Boolean);
}

export interface PresaleNotifyOptions {
  task: PresaleRequest;
  newStatus: string;
  oldStatus: string;
  actor: string;
  users: User[];
  workflows: NotificationWorkflow[];
  channels: NotificationChannel[];
}

const statusLabelTh: Record<string, string> = {
  new: "ใหม่", pending: "ยังไม่เริ่ม", assigned: "มอบหมายแล้ว", in_progress: "กำลังทำ",
  waiting_info: "รอข้อมูล", waiting_approval: "รออนุมัติ", completed: "เสร็จแล้ว", cancelled: "ยกเลิก",
};
const typeLabelTh: Record<string, string> = {
  solution_design: "ออกแบบระบบ", requirement_summary: "สรุปความต้องการ", boq: "จัดทำ BOQ",
  technical_proposal: "เขียน Proposal", site_survey: "สำรวจหน้างาน", project_planning: "วางแผนโครงการ",
};

export async function sendPresaleStatusNotification(opts: PresaleNotifyOptions): Promise<void> {
  const { task, newStatus, oldStatus, actor, users, workflows, channels } = opts;

  const activeWorkflows = workflows.filter(
    w => w.active && w.module === "presale" && w.trigger === "presale_status_changed"
  );
  if (activeWorkflows.length === 0) return;

  const vars: Record<string, string> = {
    customer_name: task.customer_name || "—",
    project_name: task.project_name || "—",
    task_type: typeLabelTh[task.type] || task.type,
    old_status: statusLabelTh[oldStatus] || oldStatus,
    new_status: statusLabelTh[newStatus] || newStatus,
    assigned_to: task.assigned_to || "—",
    actor,
    due_date: task.due_date || "—",
    requirement: task.requirement?.slice(0, 100) || "—",
  };

  const channelMap = Object.fromEntries(channels.map(c => [c.id!, c]));

  for (const workflow of activeWorkflows) {
    const subject = fillTemplate(workflow.subject_template || "📋 Presale: {customer_name} — สถานะเปลี่ยนเป็น {new_status}", vars);
    const body = fillTemplate(
      workflow.body_template ||
      "ลูกค้า: {customer_name}\nโปรเจค: {project_name}\nประเภทงาน: {task_type}\nสถานะเดิม: {old_status} → {new_status}\nผู้รับผิดชอบ: {assigned_to}\nแก้ไขโดย: {actor}\nกำหนดส่ง: {due_date}",
      vars
    );

    // 1. Save in-app notification
    const recipientNames = resolveRecipientNames(workflow, users, task.assigned_to ? [task.assigned_to] : []);
    if (recipientNames.length > 0) {
      try {
        const { inAppNotifications } = await import("./firestore");
        const note: Omit<InAppNotification, "id" | "created_at"> = {
          tenant_id: TENANT,
          module: "presale",
          trigger: "presale_status_changed",
          title: subject,
          body,
          link: "/presale",
          metadata: { task_id: task.id, new_status: newStatus, old_status: oldStatus },
          recipients: recipientNames,
          read_by: [],
        };
        await inAppNotifications.add(note as Record<string, unknown>);
      } catch (e) { console.warn("[notify] in-app save failed", e); }
    }

    // 2. Send via each configured channel
    const toEmails = resolveRecipientEmails(workflow, users, []);
    for (const chId of workflow.channel_ids) {
      const ch = channelMap[chId];
      if (!ch || !ch.active) continue;
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: ch, to_emails: toEmails, subject, body }),
        });
      } catch (e) { console.warn(`[notify] channel ${ch.type} failed`, e); }
    }
  }
}
