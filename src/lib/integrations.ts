import type { IntegrationSetting } from "./types";

export const TYPE_META: Record<IntegrationSetting["type"], { icon: string; label: string }> = {
  o365_sharepoint: { icon: "📘", label: "Microsoft SharePoint" },
  onedrive:        { icon: "☁️", label: "Microsoft OneDrive" },
  google_drive:    { icon: "🟢", label: "Google Drive" },
  dropbox:         { icon: "📦", label: "Dropbox" },
  other:           { icon: "📁", label: "Other" },
};

export const PLACEHOLDERS = [
  { key: "{year}",       desc: "ปี ค.ศ. 4 หลัก",          example: "2024" },
  { key: "{year_be}",    desc: "ปี พ.ศ. 4 หลัก",          example: "2567" },
  { key: "{month}",      desc: "เดือน 01-12",             example: "04" },
  { key: "{customer}",   desc: "ชื่อลูกค้า (URL-encoded)",  example: "ABC%20Co.,%20Ltd." },
  { key: "{project}",    desc: "ชื่อโปรเจค (URL-encoded)",  example: "Server%20Room" },
  { key: "{project_id}", desc: "รหัสโปรเจค",              example: "abc123" },
  { key: "{customer_id}",desc: "รหัสลูกค้า",              example: "xyz789" },
];

export type FolderContext = {
  customer_name?: string;
  customer_id?: string;
  project_name?: string;
  project_id?: string;
};

function safe(s: string): string {
  return encodeURIComponent(s.replace(/\//g, "-"));
}

export function fillTemplate(template: string, ctx: FolderContext): string {
  const d = new Date();
  return template
    .replace(/\{year\}/g, String(d.getFullYear()))
    .replace(/\{year_be\}/g, String(d.getFullYear() + 543))
    .replace(/\{month\}/g, String(d.getMonth() + 1).padStart(2, "0"))
    .replace(/\{customer\}/g, safe(ctx.customer_name || ""))
    .replace(/\{project\}/g, safe(ctx.project_name || ""))
    .replace(/\{customer_id\}/g, ctx.customer_id || "")
    .replace(/\{project_id\}/g, ctx.project_id || "");
}

// Build the project root folder URL
export function buildProjectFolderUrl(setting: IntegrationSetting, ctx: FolderContext): string {
  const path = fillTemplate(setting.folder_template, ctx);
  const base = setting.base_url.replace(/\/+$/, "");
  return `${base}/${path}`;
}

// Build URL for a specific subfolder
export function buildSubfolderUrl(setting: IntegrationSetting, ctx: FolderContext, subfolder: string): string {
  return `${buildProjectFolderUrl(setting, ctx)}/${encodeURIComponent(subfolder)}`;
}

// Default subfolder convention for SI / construction projects
export const DEFAULT_SUBFOLDERS = [
  "01-Solution-Design",
  "02-BOM-BOQ",
  "03-Drawing",
  "04-Presentation",
  "05-Contract",
  "06-Site-Photos",
  "07-Handover",
];
