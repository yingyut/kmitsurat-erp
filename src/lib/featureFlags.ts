/**
 * Feature flags — toggle experimental or optional UI sections.
 * Set to `false` to hide; components are preserved in code for future use.
 */

/** ซ่อน tab "Dashboard" ภายใน /sales
 *  true  = แสดง tab Dashboard ใต้ Sales page (legacy)
 *  false = ซ่อน (ใช้ /dashboard หลักของระบบแทน)
 */
export const showSalesDashboardMenu = false;

/** แสดง KPI strip 4 ช่องคงที่ด้านบน widget grid
 *  true  = แสดง hero KPI strip (4 cards: Revenue, Achievement, GP, Follow-up)
 *  false = ซ่อน (ใช้เฉพาะ widget grid แบบเดิม)
 */
export const showHeroKpiStrip = true;
