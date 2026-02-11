export type UnitType = "mm" | "cm" | "in" | "m";

export const UNITS: Record<
  UnitType,
  { label: string; multiplier: number; precision: number }
> = {
  mm: { label: "mm", multiplier: 1, precision: 0 },
  cm: { label: "cm", multiplier: 10, precision: 1 },
  in: { label: "in", multiplier: 25.4, precision: 2 },
  m: { label: "m", multiplier: 1000, precision: 2 },
};

/**
 * Converts a value from a specific unit TO millimeters (Internal Base)
 */
export function toMM(value: number, fromUnit: UnitType): number {
  return value * UNITS[fromUnit].multiplier;
}

/**
 * Converts a value FROM millimeters TO a specific unit
 */
export function fromMM(value: number, toUnit: UnitType): number {
  return value / UNITS[toUnit].multiplier;
}

/**
 * Formats a MM value into a display string with the target unit appended
 */
export function formatDim(
  mmValue: number,
  toUnit: UnitType,
  showSuffix = true,
): string {
  const converted = fromMM(mmValue, toUnit);
  const precision = UNITS[toUnit].precision;

  // Use simple rounding logic or toFixed to avoid long decimals
  const displayVal = Number(converted.toFixed(precision));

  return showSuffix ? `${displayVal} ${UNITS[toUnit].label}` : `${displayVal}`;
}
