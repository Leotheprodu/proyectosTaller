"use client";

import React, { useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import { useStore } from "@nanostores/react";
import {
  $uiStore,
  $workspaceItems,
  $guides,
  $measurements,
} from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { Vector3 } from "three";
import { formatDim } from "@/lib/units";

export function TapeMeasureTool() {
  const ui = useStore($uiStore);
  const items = useStore($workspaceItems);
  const { camera, raycaster, pointer, gl } = useThree();
  const [startPoint, setStartPoint] = useState<Vector3 | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vector3 | null>(null);

  // Only active when measure tool is selected
  const isActive = ui.activeTool === "measure";

  // Snapping helper - similar to SelectionGizmo logic
  const applySnapping = (point: Vector3): Vector3 => {
    const snapped = point.clone();
    let snappedX = false;
    let snappedZ = false;

    // 1. Guide snapping (highest priority)
    const guides = $guides.get();
    const guideSnapThreshold = 20;

    for (const guide of guides) {
      const dx = Math.abs(guide.x - point.x);
      const dz = Math.abs(guide.z - point.z);

      if (dx < guideSnapThreshold && dz < guideSnapThreshold) {
        snapped.x = guide.x;
        snapped.z = guide.z;
        snappedX = true;
        snappedZ = true;
        return snapped;
      }
    }

    // 2. Material edge snapping
    if (!snappedX || !snappedZ) {
      const materialSnapThreshold = 15;
      let bestSnapX = { value: point.x, distance: Infinity };
      let bestSnapZ = { value: point.z, distance: Infinity };

      for (const item of items) {
        // Simple AABB (non-rotated for simplicity)
        const halfLength = item.currentLength / 2;
        const halfThickness = item.thickness / 2;

        const edges = {
          xMin: item.x - halfLength,
          xMax: item.x + halfLength,
          zMin: item.y - halfThickness,
          zMax: item.y + halfThickness,
        };

        // Check X edges
        if (!snappedX) {
          for (const edge of [edges.xMin, edges.xMax]) {
            const dist = Math.abs(point.x - edge);
            if (dist < materialSnapThreshold && dist < bestSnapX.distance) {
              bestSnapX = { value: edge, distance: dist };
            }
          }
        }

        // Check Z edges
        if (!snappedZ) {
          for (const edge of [edges.zMin, edges.zMax]) {
            const dist = Math.abs(point.z - edge);
            if (dist < materialSnapThreshold && dist < bestSnapZ.distance) {
              bestSnapZ = { value: edge, distance: dist };
            }
          }
        }
      }

      if (bestSnapX.distance < Infinity) {
        snapped.x = bestSnapX.value;
        snappedX = true;
      }
      if (bestSnapZ.distance < Infinity) {
        snapped.z = bestSnapZ.value;
        snappedZ = true;
      }
    }

    // 3. Grid snapping (lowest priority)
    const gridSize = 2.5; // Fine grid for measurements (2.5mm increments)
    const gridSnapThreshold = 3; // Snap within 3mm

    if (!snappedX) {
      const nearestGridX = Math.round(point.x / gridSize) * gridSize;
      if (Math.abs(point.x - nearestGridX) < gridSnapThreshold) {
        snapped.x = nearestGridX;
      }
    }

    if (!snappedZ) {
      const nearestGridZ = Math.round(point.z / gridSize) * gridSize;
      if (Math.abs(point.z - nearestGridZ) < gridSnapThreshold) {
        snapped.z = nearestGridZ;
      }
    }

    return snapped;
  };

  // Track hover point every frame with snapping
  useFrame(({ scene }) => {
    if (!isActive) return;

    // Cast ray to find intersection
    raycaster.setFromCamera(pointer, camera);

    // Try to intersect with scene objects first (for 3D measurements)
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Found a 3D object intersection
      const point = intersects[0].point;
      const snappedPoint = applySnapping(point);
      setHoverPoint(snappedPoint);
    } else {
      // No object intersection, fall back to ground plane (Y=0)
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const ray = raycaster.ray;

      const denominator = planeNormal.dot(ray.direction);
      if (Math.abs(denominator) > 0.0001) {
        const t =
          planeNormal.dot(planePoint.clone().sub(ray.origin)) / denominator;
        if (t >= 0) {
          const intersect = ray.origin
            .clone()
            .add(ray.direction.clone().multiplyScalar(t));

          // Apply snapping
          const snappedPoint = applySnapping(intersect);
          setHoverPoint(snappedPoint);
        }
      }
    }
  });

  // Handle clicks
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: MouseEvent) => {
      if (!hoverPoint) return;

      // Check if there's an incomplete measurement (missing one or both guides)
      const measurements = $measurements.get();
      const guides = $guides.get();

      const incompleteMeasurement = measurements.find((m) => {
        const hasGuideA = guides.some((g) => g.id === m.guideAId);
        const hasGuideB = guides.some((g) => g.id === m.guideBId);
        return !hasGuideA || !hasGuideB;
      });

      if (incompleteMeasurement) {
        // Update the incomplete measurement
        const hasGuideA = guides.some(
          (g) => g.id === incompleteMeasurement.guideAId,
        );
        const hasGuideB = guides.some(
          (g) => g.id === incompleteMeasurement.guideBId,
        );

        if (!hasGuideA && !hasGuideB) {
          // Both guides missing - create first guide
          const newGuide = {
            id: `guide-${Date.now()}-${Math.random()}`,
            x: hoverPoint.x,
            y: hoverPoint.y,
            z: hoverPoint.z,
            label: "A",
          };
          $guides.set([...guides, newGuide]);

          // Update measurement with new pointA
          projectService.updateMeasurement(
            incompleteMeasurement.id,
            { x: hoverPoint.x, y: hoverPoint.y, z: hoverPoint.z },
            incompleteMeasurement.pointB,
            newGuide.id,
            incompleteMeasurement.guideBId,
          );
        } else if (!hasGuideA) {
          // Guide A missing - create new guide A
          const newGuide = {
            id: `guide-${Date.now()}-${Math.random()}`,
            x: hoverPoint.x,
            y: hoverPoint.y,
            z: hoverPoint.z,
            label: "A",
          };
          $guides.set([...guides, newGuide]);

          // Update measurement
          projectService.updateMeasurement(
            incompleteMeasurement.id,
            { x: hoverPoint.x, y: hoverPoint.y, z: hoverPoint.z },
            incompleteMeasurement.pointB,
            newGuide.id,
            incompleteMeasurement.guideBId,
          );
        } else {
          // Guide B missing - create new guide B
          const newGuide = {
            id: `guide-${Date.now()}-${Math.random()}`,
            x: hoverPoint.x,
            y: hoverPoint.y,
            z: hoverPoint.z,
            label: "B",
          };
          $guides.set([...guides, newGuide]);

          // Update measurement
          projectService.updateMeasurement(
            incompleteMeasurement.id,
            incompleteMeasurement.pointA,
            { x: hoverPoint.x, y: hoverPoint.y, z: hoverPoint.z },
            incompleteMeasurement.guideAId,
            newGuide.id,
          );
        }
        setStartPoint(null);
      } else {
        // No incomplete measurement - normal flow
        if (!startPoint) {
          // First click: set start point
          setStartPoint(hoverPoint.clone());
        } else {
          // Second click: create measurement
          projectService.addMeasurement(
            { x: startPoint.x, y: startPoint.y, z: startPoint.z },
            { x: hoverPoint.x, y: hoverPoint.y, z: hoverPoint.z },
          );
          setStartPoint(null);
        }
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [isActive, hoverPoint, startPoint, gl.domElement]);

  if (!isActive) return null;

  const distance =
    startPoint && hoverPoint ? startPoint.distanceTo(hoverPoint) : 0;

  return (
    <group>
      {/* Start Point Marker */}
      {startPoint && (
        <mesh position={startPoint}>
          <sphereGeometry args={[5, 16, 16]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      )}

      {/* Hover Point Marker */}
      {hoverPoint && (
        <mesh position={hoverPoint}>
          <sphereGeometry args={[3, 16, 16]} />
          <meshStandardMaterial
            color={startPoint ? "#3b82f6" : "#94a3b8"}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Measurement Line */}
      {startPoint && hoverPoint && (
        <>
          <Line
            points={[startPoint, hoverPoint]}
            color="#f59e0b"
            lineWidth={2}
          />
          <Html position={hoverPoint.clone().add(new Vector3(0, 20, 0))} center>
            <div className="bg-amber-500 text-white px-2 py-1 rounded font-bold text-sm whitespace-nowrap pointer-events-none">
              {formatDim(distance, ui.unit)}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
