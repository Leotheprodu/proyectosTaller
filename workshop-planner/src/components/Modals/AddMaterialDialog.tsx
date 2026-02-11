import React, { useState, useEffect } from "react";
import { MaterialBase } from "@/types";
import { formatDim, UnitType } from "@/lib/units";
import { projectService } from "@/services/projectService";
import { useStore } from "@nanostores/react";
import { $uiStore } from "@/stores/projectStore";
import { X, Ruler, Layers } from "lucide-react";

interface AddMaterialDialogProps {
  material: MaterialBase;
  onClose: () => void;
}

export default function AddMaterialDialog({
  material,
  onClose,
}: AddMaterialDialogProps) {
  const ui = useStore($uiStore);
  const [length, setLength] = useState<number>(material.length);
  const [quantity, setQuantity] = useState<number>(1);
  const [customLengthInput, setCustomLengthInput] = useState<string>("");

  useEffect(() => {
    // Initialize input with formatted default length (stripping unit for editing if needed, but let's keep it simple number first)
    // Actually, let's just use raw numbers for input to avoid parsing complexity in this MVP step,
    // but better user experience would be unit conversion.
    // For now, let's assume input matches the project unit or is just raw mm/cm?
    // The store stores geometry in 'mm' usually? checking projectStore.ts...
    // Material length is in projected units? m1 length is 6000. standard is likely mm.
    // Let's stick to mm for internal logic, but display in UI unit.

    // Wait, let's check `formatDim`.
    setLength(material.length);
  }, [material]);

  const handleAdd = () => {
    projectService.addMaterial(material.id, length, quantity);
    onClose();
  };

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simple numeric input for now.
    // Ideally we'd handle unit conversion input, but for MVP let's assume mm or user knows.
    // Actually, let's try to be smart. If ui.unit is 'cm', input 100 means 100cm = 1000mm.
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      // Convert input unit to mm
      let mm = val;
      if (ui.unit === "cm") mm = val * 10;
      if (ui.unit === "in") mm = val * 25.4;

      setLength(mm);
    }
    setCustomLengthInput(e.target.value);
  };

  // Calculate waste/usage
  const barsNeeded = Math.ceil((length * quantity) / material.length);
  const totalLengthUsed = length * quantity;
  const totalStockLength = barsNeeded * material.length;
  const waste = totalStockLength - totalLengthUsed;
  const percentWaste = (waste / totalStockLength) * 100;

  // Initial value for input based on unit
  const getInitialDisplayValue = () => {
    if (ui.unit === "cm") return (material.length / 10).toString();
    if (ui.unit === "in") return (material.length / 25.4).toFixed(2);
    return material.length.toString();
  };

  useEffect(() => {
    setCustomLengthInput(getInitialDisplayValue());
  }, [ui.unit, material]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Agregar Material</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Material Info */}
          <div className="flex gap-4 items-start">
            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs uppercase border border-slate-200">
              {material.category.slice(0, 3)}
            </div>
            <div>
              <h4 className="font-bold text-slate-800">{material.name}</h4>
              <p className="text-sm text-slate-500">
                Stock: {formatDim(material.length, ui.unit)} | ₡{material.price}
                /un
              </p>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Ruler size={14} /> Largo ({ui.unit})
              </label>
              <input
                type="number"
                value={customLengthInput}
                onChange={handleLengthChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-lg"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Layers size={14} /> Cantidad
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-lg"
                min={1}
              />
            </div>
          </div>

          {/* Stats Preview */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Barras Requeridas:</span>
              <span className="font-bold text-slate-800">{barsNeeded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Costo Estimado:</span>
              <span className="font-bold text-green-600">
                ₡{(barsNeeded * material.price).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Desperdicio:</span>
              <span
                className={`font-bold ${percentWaste > 20 ? "text-red-500" : "text-slate-600"}`}
              >
                {formatDim(waste, ui.unit)} ({percentWaste.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
