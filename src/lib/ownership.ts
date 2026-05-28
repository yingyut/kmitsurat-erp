import type { User } from "@/lib/types";

// Fields ที่ใช้ระบุเจ้าของ record (รองรับทั้ง name-based และ email-based)
export type OwnableRecord = {
  assigned_to?: string;
  user_name?: string;
  created_by?: string;
  technician?: string;
  owner_email?: string;
  assigned_to_email?: string;
};

/**
 * isOwnRecord — ตรวจสอบว่า record นี้เป็นของ currentUser หรือไม่
 * ตรวจ owner_email / assigned_to_email ก่อน (email-based) แล้ว fallback ไป name-based
 *
 * เงื่อนไข:
 *   record.owner_email === user.email  → true
 *   record.assigned_to_email === user.email  → true
 *   record.assigned_to === user.name  → true
 *   record.user_name === user.name  → true
 *   record.created_by === user.name  → true
 *   record.technician === user.name  → true
 */
export function isOwnRecord(
  record: OwnableRecord,
  user: User | null | undefined,
): boolean {
  if (!user) return false;

  const name  = user.name  ?? "";
  const email = user.email ?? "";

  // ตรวจ email-based fields ก่อน (แม่นยำกว่า)
  if (email) {
    if (record.owner_email       && record.owner_email       === email) return true;
    if (record.assigned_to_email && record.assigned_to_email === email) return true;
    // ตรวจว่า field อื่นเก็บ email ไว้หรือเปล่า (กรณีข้อมูลเก่าบางส่วน)
    if (record.assigned_to && record.assigned_to === email) return true;
    if (record.user_name   && record.user_name   === email) return true;
  }

  // Fallback: name-based
  if (name) {
    if (record.assigned_to && record.assigned_to === name) return true;
    if (record.user_name   && record.user_name   === name) return true;
    if (record.created_by  && record.created_by  === name) return true;
    if (record.technician  && record.technician  === name) return true;
  }

  return false;
}

/** Alias รักษาความเข้ากันได้กับโค้ดเก่า */
export const isOwner = isOwnRecord;

/**
 * filterOwned — กรอง array ให้เหลือเฉพาะ record ของ user นั้น
 * ถ้า record ไม่มี ownership field เลย (unassigned) ให้แสดงด้วย
 */
export function filterOwned<T extends OwnableRecord>(
  records: T[],
  user: User | null | undefined,
  ownerField: keyof OwnableRecord = "assigned_to",
): T[] {
  if (!user) return [];
  return records.filter(r => !r[ownerField] || isOwnRecord(r, user));
}

/**
 * canSeeAll — ตรวจสอบว่า user มีสิทธิ์เห็นข้อมูลทั้งหมด (ทุก role)
 * Admin และ Avenger เท่านั้นที่เห็นข้อมูลรวมทุกคนได้
 */
export function canSeeAll(user: User | null | undefined): boolean {
  const role = user?.role ?? "";
  return ["admin", "Administrator", "avenger"].includes(role);
}

/**
 * canManageQuota — ตรวจสอบว่า user สามารถสร้าง/แก้ไข/ลบ Quota ได้
 * อนุญาต: admin, Administrator, avenger และทุก role ที่มีคำว่า "Manager"
 * ห้าม: sale, Sales Executive และ role อื่น ๆ ที่ไม่ใช่ manager
 */
export function canManageQuota(user: User | null | undefined): boolean {
  const role = user?.role ?? "";
  if (["admin", "Administrator", "avenger"].includes(role)) return true;
  if (role.toLowerCase().includes("manager")) return true;
  return false;
}
