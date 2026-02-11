import { Workpiece } from "@/types";

export interface CutGroup {
  materialKey: string; // Unique key for grouping
  category: string;
  name: string;
  width: number;
  thickness: number;
  stockLength: number;
  price: number;
  cuts: CutItem[];
}

export interface CutItem {
  length: number;
  quantity: number;
}

export interface CutListSummary {
  groups: CutGroup[];
  totalCost: number;
}

/**
 * Groups workspace items by material type and cross-section
 */
export function groupItemsByMaterial(items: Workpiece[]): CutGroup[] {
  const grouped = new Map<string, CutGroup>();

  for (const item of items) {
    // Create unique key: category_width_thickness
    const key = `${item.category}_${item.width}_${item.thickness}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        materialKey: key,
        category: item.category,
        name: item.name,
        width: item.width,
        thickness: item.thickness,
        stockLength: item.length, // Original stock length
        price: item.price,
        cuts: [],
      });
    }

    const group = grouped.get(key)!;

    // Find if this cut length already exists
    const existingCut = group.cuts.find((c) => c.length === item.currentLength);

    if (existingCut) {
      existingCut.quantity++;
    } else {
      group.cuts.push({
        length: item.currentLength,
        quantity: 1,
      });
    }
  }

  // Sort cuts within each group by length descending
  for (const group of grouped.values()) {
    group.cuts.sort((a, b) => b.length - a.length);
  }

  return Array.from(grouped.values());
}

/**
 * Calculate total length and required stock bars for a cut group
 */
export function calculateStockRequirements(group: CutGroup) {
  const totalLength = group.cuts.reduce(
    (sum, cut) => sum + cut.length * cut.quantity,
    0,
  );

  const barsNeeded = Math.ceil(totalLength / group.stockLength);
  const waste = barsNeeded * group.stockLength - totalLength;
  const wastePercentage = (waste / (barsNeeded * group.stockLength)) * 100;

  return {
    totalLength,
    barsNeeded,
    waste,
    wastePercentage,
    totalCost: barsNeeded * group.price,
  };
}

/**
 * Generate complete cut list summary
 */
export function generateCutList(items: Workpiece[]): CutListSummary {
  const groups = groupItemsByMaterial(items);

  let totalCost = 0;
  for (const group of groups) {
    const { totalCost: groupCost } = calculateStockRequirements(group);
    totalCost += groupCost;
  }

  return { groups, totalCost };
}
