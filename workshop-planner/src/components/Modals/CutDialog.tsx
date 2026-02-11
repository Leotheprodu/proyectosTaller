"use client";

import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";
import { UNITS, toMM } from "@/lib/units";
import { Scissors } from "lucide-react";

export default function CutDialog({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const ui = useStore($uiStore);
  const [val, setVal] = useState<string>("");
  const [qty, setQty] = useState<string>("1");

  // Default kerf is 3mm
  const KERF = 3;

  const handleCut = () => {
    const numVal = parseFloat(val);
    const numQty = parseInt(qty);

    if (isNaN(numVal) || numVal <= 0) return;
    if (isNaN(numQty) || numQty <= 0) return;

    // Convert input (User Unit) -> mm (System Unit)
    const cutPointMM = toMM(numVal, ui.unit);

    projectService.cutItem(itemId, cutPointMM, KERF, numQty);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-80">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Scissors size={18} /> Corte Preciso
        </h3>

        <div className="mb-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Distancia desde el inicio ({UNITS[ui.unit].label})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-lg font-mono focus:border-blue-500 focus:outline-none"
                placeholder="Ej. 120"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Cantidad de Piezas
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 text-lg font-mono focus:border-blue-500 focus:outline-none"
              placeholder="1"
            />
            <p className="text-xs text-slate-400 mt-1">
              Se cortarán {qty} piezas idénticas secuencialmente.
            </p>
          </div>

          <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
            Info: Se perderán ~3mm por corte (Kerf).
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleCut}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Scissors size={16} />
            Cortar
          </button>
        </div>
      </div>
    </div>
  );
}
