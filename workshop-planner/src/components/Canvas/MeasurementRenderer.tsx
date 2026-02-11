"use client";

import React from "react";
import { Line, Text, Billboard } from "@react-three/drei";
import { useStore } from "@nanostores/react";
import { $measurements, $uiStore } from "@/stores/projectStore";
import { Vector3 } from "three";
import { formatDim } from "@/lib/units";

const getLabels = (index: number) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const startIdx = (index * 2) % 26;
  const endIdx = (index * 2 + 1) % 26;
  const prefix =
    Math.floor((index * 2) / 26) > 0 ? Math.floor((index * 2) / 26) : "";
  // Simple handling for now, A-Z then repeat A-Z (confusing but unlikely to exceed 26 pairs in normal use)
  return [letters[startIdx], letters[endIdx]];
};

export function MeasurementRenderer() {
  const measurements = useStore($measurements);
  const ui = useStore($uiStore);

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

        // Midpoint for label
        const midpoint = new Vector3()
          .addVectors(pointA, pointB)
          .multiplyScalar(0.5);
        // midpoint.y += 20; // Offset above the line - now handled by Billboard position

        return (
          <group key={measurement.id}>
            {/* Yellow line between points */}
            <Line points={[pointA, pointB]} color="#f59e0b" lineWidth={2} />

            {/* Distance label (Text in 3D) */}
            <Billboard position={[midpoint.x, midpoint.y + 20, midpoint.z]}>
              <mesh position={[0, 0, -1]} renderOrder={998}>
                {/* Reduced width from 120 to 80 for tighter padding */}
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
                fontSize={14} // Slightly smaller font
                color="white"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                outlineWidth={1}
                outlineColor="#b45309"
                renderOrder={999} // Ensure text is on top of bg
                depthOffset={-1} // Ensures text renders on top of plane and other objects
              >
                {formatDim(measurement.distance, ui.unit)}
              </Text>
            </Billboard>

            {/* Endpoint markers A */}
            {/* Removed red sphere, just text over guide cone */}
            <Billboard position={[pointA.x, pointA.y + 25, pointA.z]}>
              <Text
                fontSize={16}
                color="black"
                anchorX="center"
                anchorY="middle"
                fontWeight="extra-bold"
                outlineWidth={2}
                outlineColor="white"
                renderOrder={999}
                depthOffset={-1} // Keeps pulling text to front
                material-depthTest={false} // Force disable depth test
                material-depthWrite={false} // Force disable depth write
                material-toneMapped={false} // Ignore lighting
              >
                {labelA}
              </Text>
            </Billboard>

            {/* Endpoint markers B */}
            {/* Removed red sphere, just text over guide cone */}
            <Billboard position={[pointB.x, pointB.y + 25, pointB.z]}>
              <Text
                fontSize={16}
                color="black"
                anchorX="center"
                anchorY="middle"
                fontWeight="extra-bold"
                outlineWidth={2}
                outlineColor="white"
                renderOrder={999}
                depthOffset={-1} // Keeps pulling text to front
                material-depthTest={false} // Force disable depth test
                material-depthWrite={false} // Force disable depth write
                material-toneMapped={false} // Ignore lighting
              >
                {labelB}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
