"use client";

import React, { useState, useRef } from "react";
import { useStore } from "@nanostores/react";
import { $uiStore, $materials, $activeViewItems } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { storageService } from "@/services/storageService";
import { UnitType } from "@/lib/units";
import {
  Trash2,
  Undo2,
  Redo2,
  Copy,
  Scissors,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Move as MoveIcon,
  RefreshCw,
  MousePointer2,
  Magnet,
  Ruler,
  Settings,
  Download,
  Upload,
  Printer,
  FileText,
} from "lucide-react";
import { clsx } from "clsx";
import CutDialog from "@/components/Modals/CutDialog";
import ExportDialog from "@/components/Modals/ExportDialog";
import ImportConfirmModal from "@/components/Modals/ImportConfirmModal";
import PrintPreview from "@/components/Modals/PrintPreview";

interface ToolbarProps {
  showPrecisionTools: boolean;
  setShowPrecisionTools: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Toolbar({
  showPrecisionTools,
  setShowPrecisionTools,
}: ToolbarProps) {
  const ui = useStore($uiStore);
  const items = useStore($activeViewItems);
  const [showCutDialog, setShowCutDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSelection = ui.selectedItemIds.length > 0;
  const singleSelection =
    ui.selectedItemIds.length === 1 ? ui.selectedItemIds[0] : null;

  // Check if selected items are part of a group
  const selectedItems = items.filter((item) =>
    ui.selectedItemIds.includes(item.instanceId),
  );
  const isGrouped =
    selectedItems.length > 0 && selectedItems.every((item) => item.groupId);

  const toggleTool = (tool: "select" | "move" | "rotate" | "measure") => {
    const currentTool = $uiStore.get().activeTool;

    // Save previous tool before switching to measure
    if (tool === "measure" && currentTool !== "measure") {
      $uiStore.setKey("previousTool", currentTool);
    }

    $uiStore.setKey("activeTool", tool);
  };

  const toggleSnap = () => {
    $uiStore.setKey("snappingEnabled", !ui.snappingEnabled);
  };

  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleExportConfirm = (fileName: string) => {
    try {
      storageService.exportToFile(fileName);
      setShowExportDialog(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Error al exportar el proyecto");
    }
  };

  const handleExportCancel = () => {
    setShowExportDialog(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowImportModal(true);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingFile) return;

    try {
      await storageService.importFromFile(pendingFile);
      setShowImportModal(false);
      setPendingFile(null);
    } catch (error) {
      console.error("Import failed:", error);
      alert(
        "Error al importar el archivo. Verifica que sea un archivo válido.",
      );
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setPendingFile(null);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tool Controls - Bottom Right */}
      <div className="absolute bottom-20 right-4 z-50 flex flex-col gap-2">
        <div className="bg-white/80 hover:bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col gap-2 transition-all">
          <button
            onClick={() => toggleTool("select")}
            className={clsx(
              "p-2 rounded text-slate-700 hover:bg-slate-100",
              ui.activeTool === "select" && "bg-blue-100 text-blue-600",
            )}
            title="Seleccionar (Tecla 1)"
          >
            <MousePointer2 size={20} />
          </button>
          <button
            onClick={() => toggleTool("move")}
            className={clsx(
              "p-2 rounded text-slate-700 hover:bg-slate-100",
              ui.activeTool === "move" && "bg-blue-100 text-blue-600",
            )}
            title="Mover (Tecla 2)"
          >
            <MoveIcon size={20} />
          </button>

          <button
            onClick={() => toggleTool("rotate")}
            className={clsx(
              "p-2 rounded text-slate-700 hover:bg-slate-100",
              ui.activeTool === "rotate" && "bg-blue-100 text-blue-600",
            )}
            title="Rotar (Tecla 3)"
          >
            <RefreshCw size={20} />
          </button>

          <div className="w-full h-px bg-slate-200 my-1" />

          {/* Visibility Controls */}

          <button
            onClick={() =>
              $uiStore.setKey("showMeasurementGuide", !ui.showMeasurementGuide)
            }
            className={clsx(
              "p-2 rounded text-slate-700 hover:bg-slate-100 relative group",
              ui.showMeasurementGuide && "bg-blue-100 text-blue-600",
            )}
            title="Tabla de Medidas"
          >
            <FileText size={20} />
          </button>
          <div className="w-full h-px bg-slate-200 my-1"></div>
          <button
            onClick={() => toggleTool("measure")}
            className={clsx(
              "p-2 rounded text-slate-700 hover:bg-slate-100",
              ui.activeTool === "measure" && "bg-amber-100 text-amber-600",
            )}
            title="Cinta Métrica (Tecla 4)"
          >
            <Ruler size={20} />
          </button>
          <button
            onClick={() => setShowPrecisionTools(!showPrecisionTools)}
            className={clsx(
              "p-2 rounded text-slate-700 hover:bg-slate-100",
              showPrecisionTools && "bg-purple-100 text-purple-600",
            )}
            title="Herramientas de Precisión"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Top Center Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-full px-6 py-2 flex items-center gap-4 z-40">
        {/* Save/Load Controls */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-green-50 text-green-600 rounded-full transition-colors"
            title="Exportar Proyecto"
          >
            <Download size={18} />
          </button>
          <button
            onClick={handleImportClick}
            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-full transition-colors"
            title="Importar Proyecto"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={() => setShowPrintPreview(true)}
            className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-full transition-colors"
            title="Imprimir Reporte"
          >
            <Printer size={18} />
          </button>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">
            Unit
          </span>
          {(["mm", "cm", "in"] as UnitType[]).map((u) => (
            <button
              key={u}
              onClick={() => projectService.setUnit(u)}
              className={clsx(
                "text-xs font-bold px-2 py-1 rounded transition-colors",
                ui.unit === u
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Snap Toggle */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
          <button
            onClick={toggleSnap}
            className={clsx(
              "p-1.5 rounded transition-colors",
              ui.snappingEnabled
                ? "bg-purple-100 text-purple-600"
                : "text-slate-400 hover:bg-slate-100",
            )}
            title={ui.snappingEnabled ? "Snapping ON (10mm)" : "Snapping OFF"}
          >
            <Magnet size={18} />
          </button>
        </div>

        {/* Selection Tools with transparency */}
        <div
          className={clsx(
            "flex items-center gap-2 transition-opacity",
            !hasSelection && "opacity-30 pointer-events-none",
          )}
        >
          <button
            onClick={() => projectService.undo()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-700 opacity-60 hover:opacity-100 transition-opacity"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>

          <button
            onClick={() => projectService.redo()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-700 opacity-60 hover:opacity-100 transition-opacity"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 size={20} />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button
            onClick={() => projectService.copySelection()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-700 opacity-60 hover:opacity-100 transition-opacity"
            title="Copiar Selección (Ctrl+C)"
          >
            <Copy size={20} />
          </button>

          {hasSelection && ui.selectedItemIds.length > 1 && (
            <button
              onClick={() => {
                projectService.groupItems(ui.selectedItemIds);
                projectService.clearSelection();
              }}
              className="p-2 hover:bg-blue-50 text-blue-600 rounded-full opacity-60 hover:opacity-100 transition-opacity"
              title="Agrupar Seleccionados"
            >
              <GroupIcon size={20} />
            </button>
          )}

          {hasSelection && isGrouped && (
            <button
              onClick={() => {
                projectService.ungroupItems(ui.selectedItemIds);
              }}
              className="p-2 hover:bg-orange-50 text-orange-600 rounded-full opacity-60 hover:opacity-100 transition-opacity"
              title="Desagrupar"
            >
              <UngroupIcon size={20} />
            </button>
          )}

          <button
            onClick={() => singleSelection && setShowCutDialog(true)}
            className={clsx(
              "p-2 hover:bg-blue-50 text-blue-600 rounded-full opacity-60 hover:opacity-100 transition-opacity",
              !singleSelection && "opacity-50 pointer-events-none",
            )}
            title="Corte Preciso"
          >
            <Scissors size={20} />
          </button>

          <button
            onClick={() =>
              ui.selectedItemIds.forEach((id) => projectService.deleteItem(id))
            }
            className="p-2 hover:bg-red-50 text-red-600 rounded-full ml-1 opacity-60 hover:opacity-100 transition-opacity"
            title="Eliminar (Supr)"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {showCutDialog && singleSelection && (
        <CutDialog
          itemId={singleSelection}
          onClose={() => setShowCutDialog(false)}
        />
      )}

      <ExportDialog
        isOpen={showExportDialog}
        onConfirm={handleExportConfirm}
        onCancel={handleExportCancel}
      />

      <ImportConfirmModal
        isOpen={showImportModal}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
        fileName={pendingFile?.name}
      />

      {showPrintPreview && (
        <PrintPreview onClose={() => setShowPrintPreview(false)} />
      )}
    </>
  );
}
