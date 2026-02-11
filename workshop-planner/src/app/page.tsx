"use client";

import { useStore } from "@nanostores/react";
import { $materials, $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { storageService } from "@/services/storageService";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import WorkshopCanvas from "@/components/Canvas/WorkshopCanvas";
import Toolbar from "@/components/UI/Toolbar";
import {
  Plus,
  Hammer,
  Ruler,
  Scissors,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { formatDim } from "@/lib/units";
import AddMaterialDialog from "@/components/Modals/AddMaterialDialog";
import PrecisionTools from "@/components/UI/PrecisionTools";
import { CutList } from "@/components/UI/CutList";
import MeasurementGuide from "@/components/UI/MeasurementGuide";
import React from "react";
import { MaterialBase } from "@/types";

export default function Home() {
  const materials = useStore($materials);
  const ui = useStore($uiStore);
  const materialList = Object.values(materials);

  const [selectedMaterialForAdd, setSelectedMaterialForAdd] =
    React.useState<MaterialBase | null>(null);
  const [showCutList, setShowCutList] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [showPrecisionTools, setShowPrecisionTools] = React.useState(false);

  // Load saved data on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      storageService.loadFromLocalStorage();
    }
  }, []);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <main className="flex min-h-screen flex-row font-sans relative">
      <Toolbar
        showPrecisionTools={showPrecisionTools}
        setShowPrecisionTools={setShowPrecisionTools}
      />

      {/* Sidebar Toggle Button (when hidden) */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-50 bg-slate-900 text-white p-3 rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
          title="Mostrar sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      {/* Sidebar / Ferretería */}
      {showSidebar && (
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-screen z-40">
          <header className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Hammer size={20} />
                WorkshopPlanner
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Corte y Planificación
              </p>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              title="Ocultar sidebar"
            >
              <PanelLeftClose size={20} />
            </button>
          </header>

          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Catálogo de Materiales
            </h2>

            <div className="space-y-3">
              {materialList.map((mat) => (
                <div
                  key={mat.id}
                  className="group border border-slate-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-slate-50"
                  onClick={() => setSelectedMaterialForAdd(mat)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide
                        ${mat.category === "wood" ? "bg-amber-100 text-amber-800" : ""}
                        ${mat.category === "metal" ? "bg-slate-200 text-slate-800" : ""}
                        ${mat.category === "pvc" ? "bg-blue-100 text-blue-800" : ""}
                    `}
                    >
                      {mat.category}
                    </span>
                    <span className="text-slate-900 font-bold">
                      ₡{mat.price}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-800">{mat.name}</h3>
                  <div className="mt-2 flex items-center text-xs text-slate-500 gap-2">
                    <Ruler size={14} />
                    <span>{formatDim(mat.length, ui.unit)}</span>
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400">
                    {formatDim(mat.width, ui.unit)} x{" "}
                    {formatDim(mat.thickness, ui.unit)}
                  </div>

                  <button className="w-full mt-3 bg-white border border-slate-300 text-slate-700 text-sm py-1.5 rounded flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => setShowCutList(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Scissors size={18} />
              Ver Lista de Cortes
            </button>
            <p className="mt-2 text-xs text-center text-slate-500">
              Calcula los cortes necesarios
            </p>
          </div>
        </aside>
      )}

      {/* Measurement Table (Floating) */}
      <MeasurementGuide />

      {/* Main Content Area */}
      <WorkshopCanvas />

      {showPrecisionTools && <PrecisionTools />}

      {/* Add Material Modal */}
      {selectedMaterialForAdd && (
        <AddMaterialDialog
          material={selectedMaterialForAdd}
          onClose={() => setSelectedMaterialForAdd(null)}
        />
      )}

      {/* Cut List Modal */}
      {showCutList && <CutList onClose={() => setShowCutList(false)} />}
    </main>
  );
}
