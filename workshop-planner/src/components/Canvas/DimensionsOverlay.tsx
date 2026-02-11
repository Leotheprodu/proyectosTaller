import React from "react";
import { Html } from "@react-three/drei";
import { useStore } from "@nanostores/react";
import { $uiStore, $activeViewItems } from "@/stores/projectStore";
import { Vector3 } from "three";
import { formatDim } from "@/lib/units";

export function DimensionsOverlay() {
  const ui = useStore($uiStore);
  const items = useStore($activeViewItems);
  const selectedIds = ui.selectedItemIds;

  if (!ui.showDimensions || selectedIds.length === 0) return null;

  // Ideally, control visibility via a toggle in UI store, assuming true for now as requested "always see measures"
  // or maybe we add a toggle later. For now, show when selected.

  const selectedItems = items.filter((i) => selectedIds.includes(i.instanceId));

  return (
    <>
      {selectedItems.map((item) => {
        // Calculate bounds/positions
        // Item is centered at x,y,z (where y=depth, z=elevation in 3D space usually, check Workpiece3D)
        // Workpiece3D: position={[item.x, item.z, item.y]}
        // item.x = X
        // item.z = Elevation (3D Y)
        // item.y = Depth (3D Z)

        const pos = new Vector3(item.x, item.z, item.y);

        // Let's show length along its axis.
        // Simplified: just show a label above the item for now.
        // For rotated items, this gets complex.

        // If we want "Virtual Tape Measure", we might want to show the length visibly.

        return (
          <group key={item.instanceId} position={pos}>
            <Html position={[0, 20, 0]} center className="pointer-events-none">
              <div className="bg-black text-white text-sm font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap border-2 border-white">
                L: {formatDim(item.currentLength, ui.unit)}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
