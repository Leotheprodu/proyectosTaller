export type MaterialCategory = "wood" | "metal" | "pvc";
export type UnitType = "mm" | "cm" | "in" | "m";

export interface MaterialBase {
  id: string;
  category: MaterialCategory;
  name: string;
  length: number; // mm
  width: number; // mm (Standard profile height/width)
  thickness: number; // mm
  price: number;
}

export interface Workpiece extends MaterialBase {
  instanceId: string;
  // 3D Coordinates (World Space)
  x: number; // Width axis
  y: number; // Height axis
  z: number; // Depth axis

  // Dimensions
  currentLength: number; // Usually "X" dimension in local space (or Y/Z depending on rotation)
  // Inherited: width, thickness (mapped to Y/Z usually)

  // Orientation
  // Legacy: axis, rotation
  axis: "x" | "y" | "z";
  rotation: number;

  // New Euler Angles (Degrees)
  rx: number; // Rotation around X axis
  ry: number; // Rotation around Y axis
  rz: number; // Rotation around Z axis

  // Grouping
  groupId?: string;
}
