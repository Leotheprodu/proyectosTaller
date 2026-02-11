"use client";

import React from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import { useStore } from "@nanostores/react";
import { Workpiece as WorkpieceType } from "@/types";
import { $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { formatDim } from "@/lib/units";

interface WorkpieceProps {
  item: WorkpieceType;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    rotation: number;
  };
  isSelected: boolean;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const CATEGORY_COLORS = {
  wood: "#b45309", // amber-700
  metal: "#94a3b8", // slate-400
  pvc: "#f8fafc", // slate-50
};

export const Workpiece: React.FC<WorkpieceProps> = ({
  item,
  layout,
  isSelected,
  onDragEnd,
}) => {
  const ui = useStore($uiStore);
  const shapeRef = React.useRef<any>(null);
  const trRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (e: any) => {
    onDragEnd(item.instanceId, e.target.x(), e.target.y());
  };

  const handleSelect = (e: any) => {
    // Stop propagation to avoid clicking "stage" and deselecting
    e.cancelBubble = true;
    projectService.toggleSelection(item.instanceId, e.evt.shiftKey);
  };

  // Dimensions string
  const labelText = `${item.name}\n${formatDim(layout.width, ui.unit)} x ${formatDim(layout.height, ui.unit)}`;

  return (
    <>
      <Group
        ref={shapeRef}
        x={layout.x + layout.width / 2} // Move to center
        y={layout.y + layout.height / 2}
        width={layout.width}
        height={layout.height}
        offsetX={layout.width / 2} // Rotate around center
        offsetY={layout.height / 2}
        rotation={layout.rotation}
        draggable
        onDragEnd={handleDragEnd}
        onClick={handleSelect}
        onTap={handleSelect}
      >
        {/* Label Dimensions (Rotating with the object can be tricky for readability, 
            but for physical accuracy it should rotate) */}
        {/* Label Dimensions */}
        <Text
          text={labelText}
          y={-30}
          fontSize={14}
          fill="black"
          align="center"
          width={layout.width} // Center text over the piece
        />

        {/* Material Render */}
        <Rect
          width={layout.width}
          height={layout.height}
          fill={CATEGORY_COLORS[item.category] || "#ccc"}
          stroke={isSelected ? "#2563eb" : "black"} // Highlight blue if selected
          strokeWidth={isSelected ? 2 : 1}
          shadowBlur={isSelected ? 10 : 0}
          shadowColor="#2563eb"
          cornerRadius={2}
        />

        {/* Center Pivot Helper for Debug (Optional) */}
        {/* <Circle radius={3} fill="red" /> */}
      </Group>

      {/* Transformer for Selection Visuals (optional, usually for resizing, 
            but here helps show selection interaction clearly) */}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false} // We handle rotation via toolbar for "precise degrees"
          resizeEnabled={false} // Cutting changes size, not stretching
          borderStroke="#2563eb"
          borderDash={[5, 5]}
        />
      )}
    </>
  );
};
