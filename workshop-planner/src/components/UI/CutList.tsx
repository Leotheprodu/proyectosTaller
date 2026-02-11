"use client";

import React from "react";
import { useStore } from "@nanostores/react";
import { $activeViewItems, $uiStore } from "@/stores/projectStore";
import { generateCutList, calculateStockRequirements } from "@/lib/cutlist";
import { formatDim } from "@/lib/units";
import { X, Scissors } from "lucide-react";

interface CutListProps {
  onClose: () => void;
}

export function CutList({ onClose }: CutListProps) {
  const items = useStore($activeViewItems);
  const ui = useStore($uiStore);

  const cutList = generateCutList(items);

  if (cutList.groups.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              <h2 className="text-xl font-bold">Lista de Cortes</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-8 text-center text-gray-500">
            No hay materiales en el taller.
            <br />
            Agrega algunos materiales para ver la lista de cortes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            <h2 className="text-xl font-bold">Lista de Cortes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cutList.groups.map((group) => {
            const stats = calculateStockRequirements(group);

            return (
              <div
                key={group.materialKey}
                className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
              >
                {/* Material Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{group.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDim(group.width, ui.unit)} x{" "}
                      {formatDim(group.thickness, ui.unit)}
                      {" • "}
                      Barra: {formatDim(group.stockLength, ui.unit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Barras necesarias
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.barsNeeded}
                    </div>
                  </div>
                </div>

                {/* Cuts Table */}
                <div className="bg-white dark:bg-gray-800 rounded border dark:border-gray-700 overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="text-left p-2">Corte</th>
                        <th className="text-right p-2">Longitud</th>
                        <th className="text-right p-2">Cantidad</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.cuts.map((cut, idx) => (
                        <tr key={idx} className="border-t dark:border-gray-700">
                          <td className="p-2">#{idx + 1}</td>
                          <td className="text-right p-2 font-mono">
                            {formatDim(cut.length, ui.unit)}
                          </td>
                          <td className="text-right p-2">{cut.quantity}</td>
                          <td className="text-right p-2 font-mono">
                            {formatDim(cut.length * cut.quantity, ui.unit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">
                      Total
                    </div>
                    <div className="font-bold">
                      {formatDim(stats.totalLength, ui.unit)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">
                      Desperdicio
                    </div>
                    <div className="font-bold">
                      {stats.wastePercentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">
                      Precio/barra
                    </div>
                    <div className="font-bold">₡{group.price.toFixed(2)}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">
                      Costo
                    </div>
                    <div className="font-bold text-green-600 dark:text-green-400">
                      ₡{stats.totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {cutList.groups.length} tipo(s) de material
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Costo Total del Proyecto
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₡{cutList.totalCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
