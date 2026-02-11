"use client";

import { useStore } from "@nanostores/react";
import { $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { LayoutTemplate, Box, FileText, Layers } from "lucide-react";
import clsx from "clsx";

const VIEWS = [
  { id: "front", label: "Frontal", icon: LayoutTemplate },
  { id: "back", label: "Trasera", icon: LayoutTemplate },
  { id: "top", label: "Planta (Top)", icon: Layers },
  { id: "side", label: "Lateral", icon: Box },
  { id: "cutlist", label: "Lista Corte", icon: FileText },
];

export default function ViewSwitcher() {
  const ui = useStore($uiStore);

  return (
    <div className="absolute top-4 left-4 z-40 bg-white shadow-md border border-slate-200 rounded-lg flex flex-col overflow-hidden">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => projectService.setActiveView(view.id)}
          className={clsx(
            "p-3 flex items-center gap-3 text-sm font-medium transition-colors hover:bg-slate-50 relative group", // Combined new static classes with original static classes
            ui.activeView === view.id
              ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
              : "text-slate-600 border-l-4 border-transparent",
          )}
          title={view.label}
        >
          <view.icon size={18} />
          <span className="hidden md:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
}
