"use client";

import React from "react";
import { useStore } from "@nanostores/react";
import { $measurements, $uiStore } from "@/stores/projectStore";
import { formatDim } from "@/lib/units";
import { X, FileText } from "lucide-react";

export default function MeasurementGuide() {
  const measurements = useStore($measurements);
  const ui = useStore($uiStore);

  if (!ui.showMeasurementGuide || measurements.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 max-h-[300px] overflow-y-auto pointer-events-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <FileText size={16} /> Guía de Medidas
        </h3>
        <button
          onClick={() => $uiStore.setKey("showMeasurementGuide", false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Puntos</th>
            <th className="px-2 py-1 text-right font-medium">Distancia</th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((m, idx) => {
            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const startChar = letters[(idx * 2) % 26];
            const endChar = letters[(idx * 2 + 1) % 26];

            return (
              <tr
                key={m.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="px-2 py-1.5 font-semibold text-gray-700">
                  {startChar} <span className="text-gray-400 text-xs">➜</span>{" "}
                  {endChar}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-900">
                  {formatDim(m.distance, ui.unit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
