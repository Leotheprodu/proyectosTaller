"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { useStore } from "@nanostores/react";
import { $activeViewItems, $uiStore } from "@/stores/projectStore";
import { Workpiece3D } from "./Workpiece3D";
import { SelectionGizmo } from "./SelectionGizmo";
import { DimensionsOverlay } from "./DimensionsOverlay";
import { TapeMeasureTool } from "./TapeMeasureTool";
import { GuideRenderer } from "./GuideRenderer";
import { MeasurementRenderer } from "./MeasurementRenderer";
import { Workpiece } from "@/types";
import { projectService } from "@/services/projectService";
import ProjectStats from "@/components/UI/ProjectStats";

export default function Workshop3D() {
  const items = useStore($activeViewItems);
  const ui = useStore($uiStore);

  // We can use this to focus the camera or handle other scene-level logic
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Reset target to 0,0,0 (or center of scene eventually)
    // For now assume near origin.
    controls.target.set(100, -100, 0); // Roughly center of workspace?

    switch (ui.activeView) {
      case "front":
        controls.object.position.set(100, -100, 1000);
        controls.object.up.set(0, 1, 0);
        break;
      case "back":
        controls.object.position.set(100, -100, -1000);
        controls.object.up.set(0, 1, 0);
        break;
      case "top":
        // Top view looks down Y.
        // We want X and Z to be visible.
        controls.object.position.set(100, 1000, 0);
        controls.object.up.set(0, 0, -1); // Rotate to align?
        break;
      case "side":
        // Side View (Right?)
        // Z and Y visible.
        controls.object.position.set(1000, -100, 0);
        controls.object.up.set(0, 1, 0);
        break;
      default:
        // Free view / Perspective default
        // Don't force reset if just switching to free mode?
        // But "activeView" stores the last clicked button.
        break;
    }
    controls.update();
  }, [ui.activeView]);

  return (
    <div className="flex-1 relative bg-slate-900 overflow-hidden">
      {/* Darker background for 3D usually looks better */}

      <ProjectStats />

      {/* Camera default: isometric-ish looking at center. Far clipping set to 50m (50000mm) */}
      <Canvas
        camera={{ position: [500, 500, 500], fov: 50, far: 50000 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 200, 100]} intensity={1} castShadow />
        <pointLight position={[-100, 100, -100]} intensity={0.5} />

        {/* Controls */}
        <OrbitControls ref={controlsRef} makeDefault />

        {/* Helpers */}
        {/* Grid on XZ plane (default) - 50m x 50m */}
        <Grid
          position={[0, 0, 0]}
          args={[50000, 50000]}
          cellSize={100} // 10cm lines
          cellThickness={0.5}
          cellColor="#64748b"
          sectionSize={1000} // 1m sections
          sectionThickness={1}
          sectionColor="#94a3b8"
          fadeDistance={30000}
        />
        <axesHelper args={[100]} />

        {/* 3D Orientation Cube - Bottom Left */}
        <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="white"
          />
        </GizmoHelper>

        {/* Content */}
        <SelectionGizmo />
        <group>
          {items.map((item) => (
            <Workpiece3D
              key={item.instanceId}
              item={item}
              isSelected={ui.selectedItemIds.includes(item.instanceId)}
            />
          ))}
        </group>
        <DimensionsOverlay />
        <GuideRenderer />
        <MeasurementRenderer />
        <TapeMeasureTool />
      </Canvas>

      {/* Overlay Instructions */}
      <div className="absolute bottom-4 left-4 text-slate-400 text-xs pointer-events-none">
        <p>Left Click: Select/Rotate | Right Click: Pan | Scroll: Zoom</p>
      </div>
    </div>
  );
}
