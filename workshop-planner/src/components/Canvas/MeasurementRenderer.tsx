"use client";

import React, { useRef, useState, useMemo } from "react";
import { Line, Text, Billboard } from "@react-three/drei";
import { useStore } from "@nanostores/react";
import { useFrame, useThree } from "@react-three/fiber";
import { $measurements, $uiStore } from "@/stores/projectStore";
import { Vector3, Raycaster, Group, Object3D } from "three";
import { formatDim } from "@/lib/units";

const getLabels = (index: number) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const startIdx = (index * 2) % 26;
  const endIdx = (index * 2 + 1) % 26;
  return [letters[startIdx], letters[endIdx]];
};

// SmartLabel component that handles occlusion
function SmartLabel({
  position,
  children,
  defaultOffset = 25,
  avoidanceOffset = 60,
}: {
  position: [number, number, number];
  children: React.ReactNode;
  defaultOffset?: number;
  avoidanceOffset?: number;
}) {
  const groupRef = useRef<Group>(null);
  const billboardRef = useRef<Group>(null);
  // We use useMemo to avoid re-creating raycaster
  const raycaster = useMemo(() => new Raycaster(), []);

  // Current vertical offset
  const [currentOffset, setCurrentOffset] = useState(defaultOffset);
  const targetOffsetRef = useRef(defaultOffset);

  // Check visibility every few frames to save performance
  useFrame((state) => {
    const { camera, scene } = state;

    if (
      !groupRef.current ||
      !billboardRef.current ||
      !camera ||
      !scene ||
      !raycaster
    )
      return;

    try {
      // Explicitly set camera to raycaster to fix "reading 'near'" error with certain objects
      raycaster.camera = camera;

      // Get world position of the current visual target (where the text is right now)
      const visualPos = new Vector3();
      billboardRef.current.getWorldPosition(visualPos);

      // Ray from camera to visual position
      const direction = new Vector3().subVectors(visualPos, camera.position);
      const distanceToTarget = direction.length();
      direction.normalize();

      raycaster.set(camera.position, direction);

      // Intersect objects - Safety check
      if (scene.children && scene.children.length > 0) {
        const hits = raycaster.intersectObjects(scene.children, true);

        if (hits.length > 0) {
          // Find the first hit that is NOT part of this label
          const firstValidHit = hits.find((hit) => {
            // Check if hit object is a child of our group or billboard
            let obj: Object3D | null = hit.object;
            while (obj) {
              if (obj === groupRef.current) return false;
              obj = obj.parent;
            }
            return true; // Use this hit
          });

          if (firstValidHit) {
            // If the hit is closer than our target (minus a small margin), we are occluded
            if (firstValidHit.distance < distanceToTarget - 5) {
              // We are occluded!
              targetOffsetRef.current = avoidanceOffset;
            } else {
              // Not occluded at current position.
              // But we should try to go back down if we are up.
              if (Math.abs(currentOffset - avoidanceOffset) < 1) {
                // Check default pos
                const basePos = groupRef.current.position.clone();
                const defaultPos = basePos.add(
                  new Vector3(0, defaultOffset, 0),
                );
                const dirDefault = new Vector3().subVectors(
                  defaultPos,
                  camera.position,
                );
                const distDefault = dirDefault.length();
                dirDefault.normalize();

                raycaster.set(camera.position, dirDefault);
                const hitsDefault = raycaster.intersectObjects(
                  scene.children,
                  true,
                );
                const hitDefault = hitsDefault.find((hit) => {
                  let obj: Object3D | null = hit.object;
                  while (obj) {
                    if (obj === groupRef.current) return false;
                    obj = obj.parent;
                  }
                  return true;
                });

                if (!hitDefault || hitDefault.distance > distDefault - 2) {
                  // Default is clear! Go down.
                  targetOffsetRef.current = defaultOffset;
                }
              } else {
                // We are at default (or moving there) and not occluded. Stay default.
                targetOffsetRef.current = defaultOffset;
              }
            }
          } else {
            // No hits at all (sky), clear.
            targetOffsetRef.current = defaultOffset;
          }
        }
      }
    } catch (e) {
      // Silently fail raycasting errors to prevent crash
      // console.warn("SmartLabel Raycast failed", e);
    }

    // Animate
    const diff = targetOffsetRef.current - currentOffset;
    if (Math.abs(diff) > 0.5) {
      // Smooth lerp
      setCurrentOffset((prev) => prev + diff * 0.1);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Visual Line connecting anchor to label if raised? Optional but nice */}
      {currentOffset > defaultOffset + 10 && (
        <Line
          points={[
            [0, 0, 0],
            [0, currentOffset, 0],
          ]}
          color="#f59e0b" // Match theme color
          opacity={0.5}
          transparent
          lineWidth={1}
        />
      )}
      <Billboard ref={billboardRef} position={[0, currentOffset, 0]}>
        {children}
      </Billboard>
    </group>
  );
}

export function MeasurementRenderer() {
  const measurements = useStore($measurements);
  const ui = useStore($uiStore);

  if (!ui.showDimensions || measurements.length === 0) return null;

  return (
    <group>
      {measurements.map((measurement, index) => {
        const [labelA, labelB] = getLabels(index);
        const pointA = new Vector3(
          measurement.pointA.x,
          measurement.pointA.y,
          measurement.pointA.z,
        );
        const pointB = new Vector3(
          measurement.pointB.x,
          measurement.pointB.y,
          measurement.pointB.z,
        );
        const midpoint = new Vector3()
          .addVectors(pointA, pointB)
          .multiplyScalar(0.5);

        return (
          <group key={measurement.id}>
            <Line
              points={[pointA, pointB]}
              color="#f59e0b"
              lineWidth={2}
              dashed={false}
            />

            {/* Distance label - Smart */}
            <SmartLabel
              position={[midpoint.x, midpoint.y, midpoint.z]}
              defaultOffset={20}
              avoidanceOffset={50}
            >
              <mesh position={[0, 0, -1]} renderOrder={998}>
                <planeGeometry args={[80, 24]} />
                <meshBasicMaterial
                  color="#f59e0b"
                  transparent
                  opacity={0.9}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
              <Text
                fontSize={14}
                color="white"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                outlineWidth={1}
                outlineColor="#b45309"
                renderOrder={999}
                depthOffset={-1}
                material-depthTest={false}
                material-depthWrite={false}
                material-toneMapped={false}
              >
                {formatDim(measurement.distance, ui.unit)}
              </Text>
            </SmartLabel>

            {/* Endpoint markers A */}
            <SmartLabel
              position={[pointA.x, pointA.y, pointA.z]}
              defaultOffset={25}
              avoidanceOffset={60}
            >
              <Text
                fontSize={16}
                color="black"
                anchorX="center"
                anchorY="middle"
                fontWeight="extra-bold"
                outlineWidth={2}
                outlineColor="white"
                renderOrder={999}
                depthOffset={-1}
                material-depthTest={false}
                material-depthWrite={false}
                material-toneMapped={false}
              >
                {labelA}
              </Text>
            </SmartLabel>

            {/* Endpoint markers B */}
            <SmartLabel
              position={[pointB.x, pointB.y, pointB.z]}
              defaultOffset={25}
              avoidanceOffset={60}
            >
              <Text
                fontSize={16}
                color="black"
                anchorX="center"
                anchorY="middle"
                fontWeight="extra-bold"
                outlineWidth={2}
                outlineColor="white"
                renderOrder={999}
                depthOffset={-1}
                material-depthTest={false}
                material-depthWrite={false}
                material-toneMapped={false}
              >
                {labelB}
              </Text>
            </SmartLabel>
          </group>
        );
      })}
    </group>
  );
}
