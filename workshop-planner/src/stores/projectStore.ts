import { map, atom, deepMap, computed } from "nanostores";
import { MaterialBase, Workpiece, UnitType } from "../types";

// --- UI / App State ---
export const $uiStore = deepMap<{
  unit: UnitType;
  zoom: number;
  pan: { x: number; y: number };
  snappingEnabled: boolean;
  activeTool: "select" | "cut" | "measure" | "move" | "rotate";
  previousTool: "select" | "cut" | "measure" | "move" | "rotate" | null;
  selectedItemIds: string[];
  activeView: string; // 'front', 'top', 'side', 'cutlist'
  showDimensions: boolean;
  showMeasurementGuide: boolean;
}>({
  unit: "cm", // Default to cm as requested "30cm" example
  zoom: 0.2,
  pan: { x: 50, y: 50 },
  snappingEnabled: true,
  activeTool: "select",
  previousTool: null,
  selectedItemIds: [],
  activeView: "front",
  showDimensions: true,
  showMeasurementGuide: false,
});
// los valores del catalogo son dados en milímetros
const mmToUnit = (mm: number, unit: UnitType) => {
  if (unit === "cm") return mm * 10;
  if (unit === "in") return mm * 25.4;
  if (unit === "m") return mm * 1000;
  if (unit === "mm") return mm;
  return mm;
};
// --- Default Data / Catalog ---
export const $materials = map<Record<string, MaterialBase>>({
  m1: {
    id: "m1",
    category: "metal",
    name: "Caja HG 3/4 X 3/4 X 1.5",
    length: 6000,
    width: mmToUnit(1, "in"),
    thickness: mmToUnit(1, "in"),
    price: 3600,
  },
  m2: {
    id: "m2",
    category: "metal",
    name: "Caja HG 1 X 2 X 1.5",
    length: 6000,
    width: mmToUnit(1, "in"),
    thickness: mmToUnit(2, "in"),
    price: 6950,
  },
  m3: {
    id: "m3",
    category: "wood",
    name: 'Viga de Pino 2x4"',
    length: 2440,
    width: 89,
    thickness: 38,
    price: 30,
  },
  m4: {
    id: "m4",
    category: "pvc",
    name: 'Tubo PVC 4"',
    length: 3000,
    width: 100,
    thickness: 100,
    price: 15,
  },
});

// --- Workspace State ---
export interface GuidePoint {
  id: string;
  x: number;
  y: number; // Elevation
  z: number; // Depth
  label?: string;
}

export interface Measurement {
  id: string;
  pointA: { x: number; y: number; z: number };
  pointB: { x: number; y: number; z: number };
  distance: number;
  guideAId: string;
  guideBId: string;
}

export const $workspaceItems = atom<Workpiece[]>([]);
export const $guides = atom<GuidePoint[]>([]);
export const $measurements = atom<Measurement[]>([]);

// --- History State ---
export const $history = atom<Workpiece[][]>([[]]); // Initial state is empty array
export const $historyIndex = atom<number>(0);

// --- Save State ---
export const $saveStatus = atom<"saved" | "saving" | "error">("saved");
export const $lastSaved = atom<Date | null>(null);

// --- Selectors ---
export const $activeViewItems = computed($workspaceItems, (items) => items);
