"use client";

import React, { useRef, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Workpiece } from "@/types";
import { useStore } from "@nanostores/react";
import { $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { Html, TransformControls } from "@react-three/drei";
import * as THREE from "three";

interface Workpiece3DProps {
  item: Workpiece;
  isSelected: boolean;
}

const CATEGORY_COLORS = {
  wood: "#b45309", // amber-700
  metal: "#94a3b8", // slate-400
  pvc: "#cbd5e1", // slate-300
};

export function Workpiece3D({ item, isSelected }: Workpiece3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const ui = useStore($uiStore);

  // Convert rotation to radians
  // Coordinate mapping:
  // 2D X -> 3D X
  // 2D Y -> 3D Z (Floor Plane)
  // 2D Z -> 3D Y (Elevation)

  // Pivot Adjustment:
  // In 2D, x/y is Top-Left (usually).
  // If Konva was Top-Left, we need to shift.
  // Workpiece definition in services/projectService seems to center items now?
  // Let's assume x/y is center for now, or consistent.

  const px = item.x;
  const py = item.z; // Sit ON floor? Or is Z center?
  // If item.z is "elevation from floor", and box geometry is centered...
  // BoxGeometry is centered at local 0,0,0.
  // So if we want bottom at item.z, we need y = item.z + height/2.
  // item.thickness is the dimension in Z usually (or Y in 3D).
  // Let's assume item.z is "bottom elevation".
  // Actually, let's keep it simple: item.z is center Z.
  // But user wants "on the plane".
  // Let's assume item.z is just Y position.

  // For standard "floor" feel, we might want objects to sit on y=0 if z=0.
  // But let's stick to direct mapping first.

  const pz = item.y;

  // Rotation Mapping
  // 2D Rotation (Z-axis) -> 3D Rotation (Y-axis)
  // Actually, item.rotation is usually the 2D rotation.
  // Let's use item.rz as the Y-axis rotation equivalent?
  // Or just map:
  // rx -> x
  // ry -> z
  // rz -> y

  // Let's go with:
  // item.rx -> 3D X rotation
  // item.ry -> 3D Z rotation
  // item.rz -> 3D Y rotation (The main "swivel" on floor)

  const r3dX = (item.rx * Math.PI) / 180;
  const r3dY = (item.rz * Math.PI) / 180;
  const r3dZ = (item.ry * Math.PI) / 180;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    projectService.toggleSelection(item.instanceId, e.shiftKey);
  };

  const handleTransformEnd = () => {
    if (!groupRef.current) return;

    const { position, rotation } = groupRef.current;

    // Map back
    // 3D X -> item.x
    // 3D Y -> item.z (Elevation - Thickness/2 ?)
    // 3D Z -> item.y

    const newX = position.x;
    const newY = position.z; // 3D Z is 2D Y
    const newZ = position.y; // 3D Y is 2D Z

    const r2d = (rad: number) => Math.round((rad * 180) / Math.PI) % 360;

    // Euler Order XYZ?
    const newRx = r2d(rotation.x);
    const newRz = r2d(rotation.y); // 3D Y -> item.rz
    const newRy = r2d(rotation.z); // 3D Z -> item.ry

    projectService.updateItemTransform(item.instanceId, {
      x: newX,
      y: newY,
      z: newZ,
      rx: newRx,
      ry: newRy,
      rz: newRz,
    });
  };

  return (
    <>
      <group
        ref={groupRef}
        position={[px, py, pz]}
        rotation={[r3dX, r3dY, r3dZ]}
      >
        {/* The Mesh */}
        <mesh
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
          }}
          onPointerOut={() => setHover(false)}
        >
          {/* Note: BoxGeometry centers at 0,0,0. 
              If we want "Rest on floor", we might offset the mesh relative to group? 
              But let's keep it centered for now. */}
          <boxGeometry
            args={[item.currentLength, item.width, item.thickness]}
          />
          <meshStandardMaterial
            color={
              isSelected
                ? "#2563eb"
                : hovered
                  ? "#60a5fa"
                  : CATEGORY_COLORS[item.category] || "#ccc"
            }
          />

          {/* Selection Outline (Wireframe) */}
          {isSelected && (
            <lineSegments>
              <edgesGeometry
                args={[
                  new THREE.BoxGeometry(
                    item.currentLength,
                    item.width,
                    item.thickness,
                  ),
                ]}
              />
              <lineBasicMaterial color="white" />
            </lineSegments>
          )}
        </mesh>

        {/* Label (billboard) */}
        {hovered && (
          <Html position={[0, item.width / 2 + 20, 0]} center>
            <div className="bg-black/75 text-white text-xs p-1 rounded whitespace-nowrap pointer-events-none">
              {item.name}
              <br />
              {item.currentLength.toFixed(0)} x {item.width.toFixed(0)} x{" "}
              {item.thickness.toFixed(0)}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
