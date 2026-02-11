"use client";
import { Html } from "@react-three/drei";
import { useStore } from "@nanostores/react";
import { $guides } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";

import { useState, useRef, useEffect } from "react";

function GuideItem({ guide }: { guide: any }) {
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHovered(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHovered(false);
    }, 150); // Small delay to allow moving to the button
  };

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <group position={[guide.x, guide.y, guide.z]}>
      {/* Guide Marker - Yellow Cone */}
      <mesh
        rotation={[Math.PI, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation(); // Prevent bubbling to other objects
          handleEnter();
        }}
        onPointerOut={handleLeave}
      >
        <coneGeometry args={[8, 20, 8]} />
        <meshStandardMaterial
          color="#eab308"
          emissive="#eab308"
          emissiveIntensity={hovered ? 0.8 : 0.3} // Highlight on hover
        />
      </mesh>

      {/* Delete Button - Only visible on hover */}
      {hovered && (
        <Html position={[0, 15, 0]} center zIndexRange={[100, 0]}>
          <div
            className="bg-yellow-500 text-black px-1 py-0.5 rounded-full text-[10px] font-bold shadow-sm cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-5 h-5"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <button
              onClick={() => projectService.deleteGuide(guide.id)}
              className="flex items-center justify-center w-full h-full"
              title="Eliminar Guía"
            >
              ✕
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

export function GuideRenderer() {
  const guides = useStore($guides);

  if (guides.length === 0) return null;

  return (
    <group>
      {guides.map((guide) => (
        <GuideItem key={guide.id} guide={guide} />
      ))}
    </group>
  );
}
