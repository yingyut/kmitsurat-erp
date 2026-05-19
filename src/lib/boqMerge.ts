import type { ToolBOQItem, ProjectBOQItem, BOQCategory } from "./types";

const CATEGORY_ORDER: BOQCategory[] = [
  "cctv", "wifi", "access_control", "network", "server", "labor", "miscellaneous",
];

export function mergeToolBOQs(
  items: ToolBOQItem[],
  projectId: string,
  tenantId: string
): Omit<ProjectBOQItem, "id">[] {
  const grouped = new Map<string, ToolBOQItem[]>();

  for (const item of items) {
    const key = `${item.category}::${item.merge_key ?? item.product_code}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    const catA = a.split("::")[0] as BOQCategory;
    const catB = b.split("::")[0] as BOQCategory;
    return CATEGORY_ORDER.indexOf(catA) - CATEGORY_ORDER.indexOf(catB);
  });

  return sortedKeys.map((key, order) => {
    const group = grouped.get(key)!;
    const first = group[0];
    const totalQty = group.reduce((s, i) => s + i.qty, 0);
    const totalCost = group.reduce((s, i) => s + i.total_cost, 0);
    const totalSelling = group.reduce((s, i) => s + i.total_selling, 0);
    const marginPct = totalSelling > 0 ? ((totalSelling - totalCost) / totalSelling) * 100 : 0;
    const sourceTools = [...new Set(group.map((i) => i.tool_id))];

    return {
      tenant_id: tenantId,
      presale_project_id: projectId,
      category: first.category,
      product_code: first.product_code,
      product_name: first.product_name,
      brand: first.brand,
      unit: first.unit,
      qty: totalQty,
      cost_price: totalQty > 0 ? parseFloat((totalCost / totalQty).toFixed(2)) : first.cost_price,
      selling_price: totalQty > 0 ? parseFloat((totalSelling / totalQty).toFixed(2)) : first.selling_price,
      discount: first.discount,
      total_cost: parseFloat(totalCost.toFixed(2)),
      total_selling: parseFloat(totalSelling.toFixed(2)),
      margin_percent: parseFloat(marginPct.toFixed(2)),
      source_tools: sourceTools,
      is_merged: group.length > 1,
      notes: group.map((i) => i.notes).filter(Boolean).join("; ") || undefined,
      order,
    };
  });
}

export function calcBOQSummary(items: Pick<ProjectBOQItem | ToolBOQItem, "total_cost" | "total_selling">[]) {
  const totalCost = items.reduce((s, i) => s + i.total_cost, 0);
  const totalSelling = items.reduce((s, i) => s + i.total_selling, 0);
  const gpAmt = totalSelling - totalCost;
  const gpPct = totalSelling > 0 ? (gpAmt / totalSelling) * 100 : 0;
  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalSelling: parseFloat(totalSelling.toFixed(2)),
    gpAmt: parseFloat(gpAmt.toFixed(2)),
    gpPct: parseFloat(gpPct.toFixed(2)),
  };
}

export const BOQ_CATEGORY_LABEL: Record<BOQCategory, string> = {
  cctv: "CCTV",
  wifi: "WiFi",
  access_control: "Access Control",
  network: "Network / Infrastructure",
  server: "Server / IT",
  labor: "แรงงาน",
  miscellaneous: "อื่น ๆ",
};

export const BOQ_CATEGORY_COLOR: Record<BOQCategory, string> = {
  cctv: "bg-blue-500/10 text-blue-400",
  wifi: "bg-green-500/10 text-green-400",
  access_control: "bg-purple-500/10 text-purple-400",
  network: "bg-orange-500/10 text-orange-400",
  server: "bg-red-500/10 text-red-400",
  labor: "bg-yellow-500/10 text-yellow-400",
  miscellaneous: "bg-gray-500/10 text-gray-400",
};
