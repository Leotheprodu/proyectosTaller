"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useStore } from "@nanostores/react";
import { $uiStore, $activeViewItems, $guides } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { Vector3, Quaternion, Euler, Matrix4, Group } from "three";

export function SelectionGizmo() {
  const ui = useStore($uiStore);
  const items = useStore($activeViewItems);
  const transformRef = useRef<any>(null);
  const objRef = useRef<Group>(null);

  // Track dragging state to prevent conflict between customized movement and dragging
  const isDragging = useRef(false);
  const lastPos = useRef<Vector3>(new Vector3());
  const lastQuat = useRef<Quaternion>(new Quaternion());

  // Filter selected items
  const selectedItems = useMemo(() => {
    return items.filter((i) => ui.selectedItemIds.includes(i.instanceId));
  }, [items, ui.selectedItemIds]);

  // Calculate Centroid
  const centroid = useMemo(() => {
    if (selectedItems.length === 0) return null;
    let sumX = 0,
      sumY = 0,
      sumZ = 0;

    // Remember mapping: X->X, Y->Z(depth), Z->Y(up)
    // Workpiece3D: px=item.x, py=item.z, pz=item.y
    selectedItems.forEach((item) => {
      sumX += item.x;
      sumY += item.z; // 3D Y is Elevation (item.z)
      sumZ += item.y; // 3D Z is Depth (item.y) -- FIXED: Removed negative sign
    });

    return new Vector3(
      sumX / selectedItems.length,
      sumY / selectedItems.length,
      sumZ / selectedItems.length,
    );
  }, [selectedItems]);

  const { camera } = useThree();

  // Floating Gizmo Logic
  useFrame(() => {
    if (!objRef.current || !centroid || isDragging.current) return;

    // If rotating, always stick to centroid (user request/limitation)
    if (mode === "rotate") {
      objRef.current.position.copy(centroid);
      return;
    }

    // Project centroid to Normalized Device Coordinates (NDC) [-1, 1]
    const screenPos = centroid.clone().project(camera);

    const padding = 0.85; // Keep gizmo within this range (1.0 is edge)
    let isOffScreen = false;

    // Check bounds
    if (
      screenPos.x > padding ||
      screenPos.x < -padding ||
      screenPos.y > padding ||
      screenPos.y < -padding
    ) {
      isOffScreen = true;
    }

    // Also check if behind camera
    // In Three.js, after project(), z is depth. If z > 1, it's beyond far plane (or behind?).
    // Actually if point is behind camera, project() behaves specially.
    // Simple check: distance or dot product or just trust NDC z?
    // Let's rely on simple clamping for X/Y.

    if (isOffScreen) {
      // Clamp X/Y
      const cx = Math.max(-padding, Math.min(padding, screenPos.x));
      const cy = Math.max(-padding, Math.min(padding, screenPos.y));

      // We want to unproject this clamped position back to 3D.
      // We keep the original 'z' (depth) to try to stay at similar distance?
      screenPos.set(cx, cy, screenPos.z);
      screenPos.unproject(camera);

      objRef.current.position.copy(screenPos);
    } else {
      // Visible, stick to centroid
      objRef.current.position.copy(centroid);
    }

    // Reset rotation/scale just in case
    objRef.current.rotation.set(0, 0, 0);
    objRef.current.scale.set(1, 1, 1);
  });

  if (selectedItems.length === 0 || !centroid) return null;

  const showGizmo = ui.activeTool === "move" || ui.activeTool === "rotate";
  const mode = ui.activeTool === "rotate" ? "rotate" : "translate";
  const translationSnap = ui.snappingEnabled ? 10 : null;
  const rotationSnap = ui.snappingEnabled ? Math.PI / 4 : null;
  // Note: TransformControls handles rotationSnap internally for visual feedback.
  // Our manual delta calculation uses objRef.quaternion, which should be snapped by TransformControls.

  const handleDragStart = () => {
    isDragging.current = true;
    if (objRef.current) {
      lastPos.current.copy(objRef.current.position);
      lastQuat.current.copy(objRef.current.quaternion);
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;

    // Apply snapping at the end of drag
    if (ui.snappingEnabled && mode === "translate") {
      const items = $activeViewItems.get();
      const selectedIds = ui.selectedItemIds;

      if (selectedIds.length > 0) {
        const selectedItems = items.filter((i) =>
          selectedIds.includes(i.instanceId),
        );

        // Helper: Calculate axis-aligned bounding box for a potentially rotated item
        const getAABB = (workpiece: (typeof selectedItems)[0]) => {
          // Dimensions in local space
          const halfLength = workpiece.currentLength / 2;
          const halfWidth = workpiece.width / 2;
          const halfThickness = workpiece.thickness / 2;

          // 8 vertices of the box in local space
          const vertices = [
            new Vector3(-halfLength, -halfWidth, -halfThickness),
            new Vector3(halfLength, -halfWidth, -halfThickness),
            new Vector3(-halfLength, halfWidth, -halfThickness),
            new Vector3(halfLength, halfWidth, -halfThickness),
            new Vector3(-halfLength, -halfWidth, halfThickness),
            new Vector3(halfLength, -halfWidth, halfThickness),
            new Vector3(-halfLength, halfWidth, halfThickness),
            new Vector3(halfLength, halfWidth, halfThickness),
          ];

          // Apply rotation
          const euler = new Euler(
            (workpiece.rx * Math.PI) / 180,
            (workpiece.rz * Math.PI) / 180,
            (workpiece.ry * Math.PI) / 180,
            "XYZ",
          );
          const rotationMatrix = new Matrix4().makeRotationFromEuler(euler);

          // Transform vertices and find min/max
          let minX = Infinity,
            maxX = -Infinity;
          let minZ = Infinity,
            maxZ = -Infinity;

          for (const vertex of vertices) {
            vertex.applyMatrix4(rotationMatrix);

            // Add world position (item.x, item.z, item.y)
            const worldX = vertex.x + workpiece.x;
            const worldZ = vertex.z + workpiece.y; // vertex.z + item.y (both 3D Z)

            minX = Math.min(minX, worldX);
            maxX = Math.max(maxX, worldX);
            minZ = Math.min(minZ, worldZ);
            maxZ = Math.max(maxZ, worldZ);
          }

          return { xMin: minX, xMax: maxX, zMin: minZ, zMax: maxZ };
        };

        // Calculate combined AABB for all selected items (works for single or multiple)
        let combinedAABB = {
          xMin: Infinity,
          xMax: -Infinity,
          zMin: Infinity,
          zMax: -Infinity,
        };

        for (const item of selectedItems) {
          const itemAABB = getAABB(item);
          combinedAABB.xMin = Math.min(combinedAABB.xMin, itemAABB.xMin);
          combinedAABB.xMax = Math.max(combinedAABB.xMax, itemAABB.xMax);
          combinedAABB.zMin = Math.min(combinedAABB.zMin, itemAABB.zMin);
          combinedAABB.zMax = Math.max(combinedAABB.zMax, itemAABB.zMax);
        }

        // Use centroid of selection for guide snapping
        const centroidX = (combinedAABB.xMin + combinedAABB.xMax) / 2;
        const centroidZ = (combinedAABB.zMin + combinedAABB.zMax) / 2;

        let snapDeltaX = 0;
        let snapDeltaZ = 0;
        let snappedX = false;
        let snappedZ = false;

        // 1. Try snapping to guides first (measurement points - highest priority)
        const guides = $guides.get();
        const guideSnapThreshold = 40;

        for (const guide of guides) {
          const dx = Math.abs(guide.x - centroidX);
          const dz = Math.abs(guide.z - centroidZ);

          if (dx < guideSnapThreshold && dz < guideSnapThreshold) {
            snapDeltaX = guide.x - centroidX;
            snapDeltaZ = guide.z - centroidZ;
            snappedX = true;
            snappedZ = true;
            break;
          }
        }

        // 2. Material edge snapping (only for axes not yet snapped)
        if (!snappedX || !snappedZ) {
          const unselectedItems = items.filter(
            (i) => !selectedIds.includes(i.instanceId),
          );
          const materialSnapThreshold = 15;

          let bestSnapX = { delta: 0, distance: Infinity };
          let bestSnapZ = { delta: 0, distance: Infinity };

          for (const other of unselectedItems) {
            const otherAABB = getAABB(other);

            // Check X edge pairs (only if X not snapped yet)
            if (!snappedX) {
              const xPairs = [
                [combinedAABB.xMin, otherAABB.xMin],
                [combinedAABB.xMin, otherAABB.xMax],
                [combinedAABB.xMax, otherAABB.xMin],
                [combinedAABB.xMax, otherAABB.xMax],
              ];

              for (const [myEdge, otherEdge] of xPairs) {
                const dist = Math.abs(myEdge - otherEdge);
                if (dist < materialSnapThreshold && dist < bestSnapX.distance) {
                  bestSnapX = { delta: otherEdge - myEdge, distance: dist };
                }
              }
            }

            // Check Z edge pairs (only if Z not snapped yet)
            if (!snappedZ) {
              const zPairs = [
                [combinedAABB.zMin, otherAABB.zMin],
                [combinedAABB.zMin, otherAABB.zMax],
                [combinedAABB.zMax, otherAABB.zMin],
                [combinedAABB.zMax, otherAABB.zMax],
              ];

              for (const [myEdge, otherEdge] of zPairs) {
                const dist = Math.abs(myEdge - otherEdge);
                if (dist < materialSnapThreshold && dist < bestSnapZ.distance) {
                  bestSnapZ = { delta: otherEdge - myEdge, distance: dist };
                }
              }
            }
          }

          // Apply material snap if found
          if (!snappedX && bestSnapX.distance < Infinity) {
            snapDeltaX = bestSnapX.delta;
            snappedX = true;
          }
          if (!snappedZ && bestSnapZ.distance < Infinity) {
            snapDeltaZ = bestSnapZ.delta;
            snappedZ = true;
          }
        }

        // 3. Grid edge snapping (for any axis not yet snapped)
        if (!snappedX || !snappedZ) {
          const gridSize = 100;
          const gridSnapThreshold = 25;

          // Check X edges against grid (only if X not snapped yet)
          if (!snappedX) {
            let bestSnapX = { delta: 0, distance: Infinity };

            for (const edge of [combinedAABB.xMin, combinedAABB.xMax]) {
              const nearestGrid = Math.round(edge / gridSize) * gridSize;
              const dist = Math.abs(edge - nearestGrid);

              if (dist < gridSnapThreshold && dist < bestSnapX.distance) {
                bestSnapX = { delta: nearestGrid - edge, distance: dist };
              }
            }

            if (bestSnapX.distance < Infinity) {
              snapDeltaX = bestSnapX.delta;
              snappedX = true;
            }
          }

          // Check Z edges against grid (only if Z not snapped yet)
          if (!snappedZ) {
            let bestSnapZ = { delta: 0, distance: Infinity };

            for (const edge of [combinedAABB.zMin, combinedAABB.zMax]) {
              const nearestGrid = Math.round(edge / gridSize) * gridSize;
              const dist = Math.abs(edge - nearestGrid);

              if (dist < gridSnapThreshold && dist < bestSnapZ.distance) {
                bestSnapZ = { delta: nearestGrid - edge, distance: dist };
              }
            }

            if (bestSnapZ.distance < Infinity) {
              snapDeltaZ = bestSnapZ.delta;
              snappedZ = true;
            }
          }
        }

        // 4. Vertical material surface snapping (prevent floating in air)
        // Check if there are materials below that we should snap to
        let snapDeltaY = 0;
        const verticalSnapThreshold = 20; // mm threshold for vertical snapping

        if (selectedItems.length === 1) {
          const item = selectedItems[0];
          const unselectedItems = items.filter(
            (i) => !selectedIds.includes(i.instanceId),
          );

          // Find the highest surface below this item that is within threshold
          let bestSurfaceZ = -Infinity;
          let bestDistance = Infinity;

          for (const other of unselectedItems) {
            // Calculate the top surface of the other material
            const otherTopZ = other.z + other.thickness / 2;

            // Calculate where this item's bottom would be
            const itemBottomZ = item.z - item.thickness / 2;

            // Distance from bottom of current item to top of other item
            const distanceToSurface = itemBottomZ - otherTopZ;

            // Check if items overlap in X and Y (horizontal plane)
            const itemAABB = getAABB(item);
            const otherAABB = getAABB(other);

            const overlapX = !(
              itemAABB.xMax < otherAABB.xMin || itemAABB.xMin > otherAABB.xMax
            );
            const overlapZ = !(
              itemAABB.zMax < otherAABB.zMin || itemAABB.zMin > otherAABB.zMax
            );

            // If there's horizontal overlap and vertical distance is reasonable
            if (
              overlapX &&
              overlapZ &&
              distanceToSurface >= 0 &&
              distanceToSurface < verticalSnapThreshold
            ) {
              if (distanceToSurface < bestDistance) {
                bestDistance = distanceToSurface;
                bestSurfaceZ = otherTopZ;
              }
            }
          }

          // If found a surface to snap to, calculate the snap
          if (bestSurfaceZ > -Infinity) {
            // Position item so its bottom rests on the surface
            const targetZ = bestSurfaceZ + item.thickness / 2;
            snapDeltaY = targetZ - item.z;
          } else {
            // 5. Ground plane snapping (only if no material surface found)
            const groundSnapThreshold = 15;
            const correctGroundZ = item.thickness / 2;
            const distanceFromGround = Math.abs(item.z - correctGroundZ);

            if (distanceFromGround < groundSnapThreshold) {
              snapDeltaY = correctGroundZ - item.z;
            }
          }
        }

        // Apply snap (including vertical snap)
        if (
          (snappedX || snappedZ || snapDeltaY !== 0) &&
          (Math.abs(snapDeltaX) > 0.01 ||
            Math.abs(snapDeltaZ) > 0.01 ||
            Math.abs(snapDeltaY) > 0.01)
        ) {
          projectService.moveSelection(snapDeltaX, snapDeltaZ, snapDeltaY);
        }
      }
    }

    projectService.snapshot();
  };

  const handleChange = () => {
    if (!isDragging.current || !objRef.current) return;

    if (mode === "translate") {
      const currentPos = objRef.current.position;
      const dx = currentPos.x - lastPos.current.x;
      const dy = currentPos.y - lastPos.current.y;
      const dz = currentPos.z - lastPos.current.z;

      if (
        Math.abs(dx) > 0.001 ||
        Math.abs(dy) > 0.001 ||
        Math.abs(dz) > 0.001
      ) {
        // Map 3D Delta to Item Delta
        projectService.moveSelection(dx, dz, dy);

        lastPos.current.copy(currentPos);
      }
    } else if (mode === "rotate") {
      const currentQuat = objRef.current.quaternion;

      // Calculate Delta Quaternion: del = current * inverse(last)
      const diff = currentQuat
        .clone()
        .multiply(lastQuat.current.clone().invert());

      // If there is significant rotation
      if (diff.angleTo(new Quaternion()) > 0.001) {
        // Pass components of Quaternion or Euler? passing Quaternion components is safest.
        projectService.rotateSelection3D(diff.x, diff.y, diff.z, diff.w);
        lastQuat.current.copy(currentQuat);
      }
    }
  };

  return (
    <>
      <group ref={objRef} position={centroid} />
      {showGizmo && (
        <TransformControls
          ref={transformRef}
          object={objRef as any}
          mode={mode}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onObjectChange={handleChange}
          space="world"
          translationSnap={translationSnap}
          rotationSnap={rotationSnap}
        />
      )}
    </>
  );
}
