import { Workpiece } from "@/types";

export type ViewType = "front" | "back" | "side" | "top" | "cutlist";

interface ProjectedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number; // For rendering order
  rotation: number; // View-relative rotation
}

/**
 * Projects a 3D workpiece into 2D screen coordinates for a specific view.
 *
 * World Coordinates:
 * X+ = Right
 * Y+ = Down (Screen Y)
 * Z+ = Depth (Away from camera)
 */
export function projectItem(
  item: Workpiece,
  view: ViewType,
): ProjectedRect | null {
  // Determine Dimensions based on Axis alignment
  // Assuming standard orientation (Long axis = X, Width = Y, Thickness = Z) initially?
  // Let's simplify:
  // item.currentLength is the dimension along 'axis'.
  // item.width is the dimension perpendicular?
  // item.thickness is the third.

  // For MVP, let's assume all items are implicitly Axis-Aligned Boxes (AABB).
  // Default (axis='x'): Length=X, Width=Y, Thickness=Z.

  // Determine effective rotation for the current view
  let effectiveRotation = 0;

  if (view === "front" || view === "back") {
    effectiveRotation = item.rz;
  } else if (view === "top") {
    effectiveRotation = item.ry;
  } else if (view === "side") {
    effectiveRotation = item.rx;
  }

  // Normalize rotation to 0-360
  // Normalize rotation to 0-360
  effectiveRotation = ((effectiveRotation % 360) + 360) % 360;

  // Dimensions logic based on Axis
  // Simplification:
  // length (X) is along the item's local X axis.
  // width (Y) is along local Y.
  // thickness (Z) is along local Z.

  // NOTE: We do NOT swap dimensions based on rotation here anymore.
  // We rely on the 'rotation' property passed to the Rendering Component to handle visual orientation.

  let localX = item.currentLength;
  let localY = item.width;
  let localZ = item.thickness;

  switch (view) {
    case "front": // View Plane XY
      // Local X aligns with World X
      // Local Y aligns with World Y
      return {
        x: item.x,
        y: item.y,
        width: localX,
        height: localY,
        zIndex: -item.z,
        rotation: effectiveRotation,
      };

    case "back": // View Plane XY (Reversed Z)
      return {
        x: item.x,
        y: item.y,
        width: localX,
        height: localY,
        zIndex: item.z,
        rotation: effectiveRotation,
      };

    case "top": // View Plane XZ
      // Local X aligns with World X
      // Local Z aligns with World Z (Screen Y)
      // Top view rotates around Y axis.
      return {
        x: item.x,
        y: item.z,
        width: localX,
        height: localZ,
        zIndex: -item.y,
        rotation: effectiveRotation,
      };

    case "side": // View Plane ZY
      // Local Z aligns with World Z (Screen X)
      // Local Y aligns with World Y (Screen Y)
      // Side view rotates around X axis.
      return {
        x: item.z,
        y: item.y,
        width: localZ,
        height: localY,
        zIndex: item.x,
        rotation: effectiveRotation,
      };

    default:
      return null;
  }
}

/**
 * Inverse Projection: Convert Screen Delta (dx, dy) to World Delta (dx, dy, dz)
 */
export function unprojectDelta(
  dx: number,
  dy: number,
  view: ViewType,
): { x: number; y: number; z: number } {
  switch (view) {
    case "front":
    case "back":
      return { x: dx, y: dy, z: 0 };
    case "top":
      return { x: dx, y: 0, z: dy }; // Screen Y represents Depth Z
    case "side":
      return { x: 0, y: dy, z: dx }; // Screen X represents Depth Z
    default:
      return { x: 0, y: 0, z: 0 };
  }
}
