import type { NumberingSetting } from "./types";

// Map of placeholders → human description (for settings UI)
export const PLACEHOLDERS: Array<{ key: string; desc: string; example: string }> = [
  { key: "{prefix}",        desc: "Prefix ที่ตั้ง",                  example: "QON" },
  { key: "{user_code}",     desc: "รหัสเซลล์ (sales_code)",          example: "SPLC" },
  { key: "{customer_code}", desc: "รหัสลูกค้า (ถ้ามี)",                example: "ACME" },
  { key: "{year_ce_4}",     desc: "ค.ศ. 4 หลัก",                     example: "2024" },
  { key: "{year_ce_2}",     desc: "ค.ศ. 2 หลัก",                     example: "24" },
  { key: "{year_be_4}",     desc: "พ.ศ. 4 หลัก",                     example: "2567" },
  { key: "{year_be_2}",     desc: "พ.ศ. 2 หลัก",                     example: "67" },
  { key: "{month}",         desc: "เดือน 01-12",                     example: "04" },
  { key: "{day}",           desc: "วัน 01-31",                       example: "15" },
  { key: "{seq}",           desc: "เลขลำดับ (ไม่ pad)",                example: "56" },
  { key: "{seq3}",          desc: "เลขลำดับ 3 หลัก",                  example: "056" },
  { key: "{seq4}",          desc: "เลขลำดับ 4 หลัก",                  example: "0056" },
  { key: "{seq5}",          desc: "เลขลำดับ 5 หลัก",                  example: "00056" },
];

export function currentPeriod(cycle: NumberingSetting["reset_cycle"]): string {
  const d = new Date();
  if (cycle === "monthly") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (cycle === "yearly") return String(d.getFullYear());
  return ""; // never
}

export type RenderOpts = {
  prefix?: string;
  user_code?: string;
  customer_code?: string;
  seq: number;
  date?: Date;
};

export function renderTemplate(template: string, opts: RenderOpts): string {
  const d = opts.date || new Date();
  const yearCe = d.getFullYear();
  const yearBe = yearCe + 543;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = opts.seq;
  return template
    .replace(/\{prefix\}/g, opts.prefix || "")
    .replace(/\{user_code\}/g, opts.user_code || "")
    .replace(/\{customer_code\}/g, opts.customer_code || "")
    .replace(/\{year_ce_4\}/g, String(yearCe))
    .replace(/\{year_ce_2\}/g, String(yearCe).slice(-2))
    .replace(/\{year_be_4\}/g, String(yearBe))
    .replace(/\{year_be_2\}/g, String(yearBe).slice(-2))
    .replace(/\{month\}/g, month)
    .replace(/\{day\}/g, day)
    .replace(/\{seq\}/g, String(seq))
    .replace(/\{seq3\}/g, String(seq).padStart(3, "0"))
    .replace(/\{seq4\}/g, String(seq).padStart(4, "0"))
    .replace(/\{seq5\}/g, String(seq).padStart(5, "0"));
}

// Compute the *next* number that would be issued (without writing).
// Used for live preview in settings UI.
export function previewNext(setting: NumberingSetting, opts: Omit<RenderOpts, "seq"> = {}): string {
  const period = currentPeriod(setting.reset_cycle);
  let seq = (setting.current_seq || 0) + 1;
  if (period && setting.last_reset_period !== period) seq = 1;
  return renderTemplate(setting.template, { ...opts, seq });
}

// Read setting, increment seq (with reset cycle), update Firestore, return new number string.
// Returns null if no active setting exists for this doc type — caller should fall back.
export async function generateNumber(
  docType: NumberingSetting["doc_type"],
  opts: Omit<RenderOpts, "seq" | "date"> = {},
): Promise<string | null> {
  const fs = await import("./firestore");
  const all = await fs.numberingSettings.list();
  const setting = all.find(s => s.doc_type === docType && s.active !== false);
  if (!setting) return null;

  let nextSeq = (setting.current_seq || 0) + 1;
  let lastResetPeriod = setting.last_reset_period;
  if (setting.reset_cycle !== "never") {
    const period = currentPeriod(setting.reset_cycle);
    if (setting.last_reset_period !== period) {
      nextSeq = 1;
      lastResetPeriod = period;
    }
  }
  const number = renderTemplate(setting.template, {
    prefix: setting.prefix,
    user_code: opts.user_code,
    customer_code: opts.customer_code,
    seq: nextSeq,
  });
  await fs.numberingSettings.update(setting.id!, {
    current_seq: nextSeq,
    last_reset_period: lastResetPeriod,
  });
  return number;
}
