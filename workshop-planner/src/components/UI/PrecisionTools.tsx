import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { Ruler, ArrowRight, Eye, EyeOff, Move } from "lucide-react";

export default function PrecisionTools() {
  const ui = useStore($uiStore);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0); // This will map to 3D Z (Depth)
  const [dz, setDz] = useState(0); // This will map to 3D Y (Elevation)

  if (ui.selectedItemIds.length === 0) return null;

  const handleMove = () => {
    // Map inputs to 3D world axes used by moveSelection
    // In projectStore/projectService, moveSelection takes (dx, dy, dz)
    // where dx -> x, dy -> y, dz -> z.
    // BUT! In our 3D View (Workshop3D):
    // X is Left/Right (Width)
    // Y is Up/Down (Elevation) -> stored as 'z' in Workpiece
    // Z is Forward/Back (Depth) -> stored as 'y' in Workpiece

    // So 'dx' input matches 'dx'
    // 'dy' input (Depth) matches 'y' in Workpiece? No, let's look at moveSelection.
    // moveSelection(dx, dy, dz) -> item.x += dx, item.y += dy, item.z += dz.

    // If User inputs:
    // X (Lateral) -> dx
    // Y (Depth/Fondo) -> dy
    // Z (Alto/Elevación) -> dz

    projectService.moveSelection(dx, dy, dz);
    setDx(0);
    setDy(0);
    setDz(0);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-lg p-3 z-40 flex flex-col gap-3 min-w-[300px]">
      {/* Header / Toggles */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Move size={14} /> Precisión
        </h3>

        <button
          onClick={() => $uiStore.setKey("showDimensions", !ui.showDimensions)}
          className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-bold
                ${ui.showDimensions ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100"}
            `}
          title="Toggle Dimensions"
        >
          <Ruler size={14} />
          {ui.showDimensions ? "Medidas ON" : "Medidas OFF"}
        </button>
      </div>

      {/* Move Controls */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-400 text-center uppercase tracking-wide">
          Mover Selección ({ui.unit})
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[9px] text-slate-400 font-bold mb-0.5 text-center">
              X (Ancho)
            </label>
            <input
              type="number"
              value={dx}
              onChange={(e) => setDx(parseFloat(e.target.value) || 0)}
              className="w-full text-center text-xs border border-slate-300 rounded p-1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[9px] text-slate-400 font-bold mb-0.5 text-center">
              Y (Fondo)
            </label>
            <input
              type="number"
              value={dy}
              onChange={(e) => setDy(parseFloat(e.target.value) || 0)}
              className="w-full text-center text-xs border border-slate-300 rounded p-1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[9px] text-slate-400 font-bold mb-0.5 text-center">
              Z (Alto)
            </label>
            <input
              type="number"
              value={dz}
              onChange={(e) => setDz(parseFloat(e.target.value) || 0)}
              className="w-full text-center text-xs border border-slate-300 rounded p-1"
            />
          </div>
          <button
            onClick={handleMove}
            className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700 flex items-center justify-center mt-4"
            title="Aplicar Movimiento"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
