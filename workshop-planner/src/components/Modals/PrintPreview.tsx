"use client";

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import {
  $workspaceItems,
  $materials,
  $uiStore,
  $activeViewItems,
  $measurements,
} from "@/stores/projectStore";
import { generateCutList, calculateStockRequirements } from "@/lib/cutlist";
import { formatDim } from "@/lib/units";
import { X, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

interface PrintPreviewProps {
  onClose: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export default function PrintPreview({
  onClose,
  canvasRef,
}: PrintPreviewProps) {
  const activeViewItems = useStore($activeViewItems);
  const materials = useStore($materials);
  const ui = useStore($uiStore);
  const measurements = useStore($measurements);
  const [isCapturing, setIsCapturing] = useState(false);
  const [canvasImage, setCanvasImage] = useState<string>("");
  const componentRef = useRef<HTMLDivElement>(null);

  const cutList = generateCutList(activeViewItems);

  // Calculate total cost
  // Calculate stats for summary
  const stats: Record<string, any> = {};
  let totalCost = 0;

  activeViewItems.forEach((item) => {
    const key = item.id;
    if (!stats[key]) {
      const mat = materials[item.id];
      stats[key] = {
        name: mat?.name || "Unknown",
        stdLen: mat?.length || 0,
        price: mat?.price || 0,
        totalLen: 0,
      };
    }
    stats[key].totalLen += item.currentLength;
  });

  Object.values(stats).forEach((stat: any) => {
    const barsNeeded = Math.ceil(stat.totalLen / stat.stdLen);
    totalCost += barsNeeded * stat.price;
  });

  // Capture canvas screenshot when modal opens
  useEffect(() => {
    const captureCanvas = async () => {
      setIsCapturing(true);
      try {
        // Wait a bit longer for canvas to fully render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Find the Three.js canvas element
        const canvas = document.querySelector("canvas") as HTMLCanvasElement;
        if (canvas) {
          try {
            // Capture the current frame
            const imageData = canvas.toDataURL("image/png", 1.0);
            if (imageData && imageData.length > 100) {
              setCanvasImage(imageData);
              console.log("Canvas captured successfully");
            } else {
              console.warn("Canvas image data is empty");
            }
          } catch (err) {
            console.error("toDataURL failed:", err);
            // Try alternative method - render to temporary canvas
            try {
              const tempCanvas = document.createElement("canvas");
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              const ctx = tempCanvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(canvas, 0, 0);
                const imageData = tempCanvas.toDataURL("image/png");
                setCanvasImage(imageData);
              }
            } catch (err2) {
              console.error("Alternative capture failed:", err2);
            }
          }
        } else {
          console.warn("Canvas element not found");
        }
      } catch (error) {
        console.error("Failed to capture canvas:", error);
      } finally {
        setIsCapturing(false);
      }
    };

    captureCanvas();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Reporte de Proyecto",
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              <h2 className="text-xl font-bold">Vista Previa de Impresión</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Printer size={18} />
                Imprimir
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div
              ref={componentRef}
              className="bg-white p-4 shadow-sm max-w-[210mm] mx-auto print-content"
            >
              {/* This content will be printed */}
              <div id="print-area" className="text-xs">
                <div className="flex gap-4">
                  {/* LEFT COLUMN: Header, Summary, 3D Image */}
                  <div className="w-[45%] flex flex-col gap-4">
                    {/* Header */}
                    <div className="border-b border-black pb-2">
                      <h1 className="text-xl font-bold text-black uppercase tracking-tight">
                        Reporte
                      </h1>
                      <p className="text-black text-[10px]">
                        {new Date().toLocaleDateString("es-CR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {/* 3D Image */}
                    {canvasImage && (
                      <div className="flex flex-col items-center border border-black p-1">
                        <img
                          src={canvasImage}
                          alt="Vista 3D"
                          className="w-full h-auto object-contain max-h-[200px]"
                        />
                      </div>
                    )}

                    {/* Project Summary */}
                    <div className="border border-black p-2">
                      <h2 className="text-xs font-bold text-black border-b border-black pb-1 mb-1 uppercase">
                        Materiales
                      </h2>
                      <div className="space-y-1">
                        {Object.values(stats).map((stat: any) => {
                          const barsNeeded = Math.ceil(
                            stat.totalLen / stat.stdLen,
                          );
                          const totalCostForMaterial = barsNeeded * stat.price;
                          return (
                            <div
                              key={stat.name}
                              className="flex justify-between text-[10px]"
                            >
                              <span className="font-bold text-black truncate pr-2">
                                {stat.name}
                              </span>
                              <span className="text-black whitespace-nowrap">
                                {barsNeeded}u • ₡
                                {totalCostForMaterial.toFixed(0)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="border-t border-black pt-1 mt-1 flex justify-between font-bold text-black text-[11px]">
                          <span>TOTAL MATERIALES</span>
                          <span>₡{totalCost.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Project Cost */}
                    <div className="border border-black p-2 bg-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-black text-sm">
                          TOTAL PROYECTO
                        </span>
                        <span className="font-bold text-black text-xl">
                          ₡{cutList.totalCost.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Measurement Guide */}
                    {measurements.length > 0 && (
                      <div className="border border-black p-2 mt-0">
                        <h2 className="text-xs font-bold text-black border-b border-black pb-1 mb-1 uppercase">
                          Guía de Medidas
                        </h2>
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="border border-black px-1 text-left text-black">
                                Puntos
                              </th>
                              <th className="border border-black px-1 text-right text-black">
                                Distancia
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {measurements.map((m, idx) => {
                              const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                              const startChar = letters[(idx * 2) % 26];
                              const endChar = letters[(idx * 2 + 1) % 26];

                              return (
                                <tr key={m.id}>
                                  <td className="border border-black px-1 text-black font-bold">
                                    {startChar}{" "}
                                    <span className="text-gray-500 text-[8px]">
                                      ➜
                                    </span>{" "}
                                    {endChar}
                                  </td>
                                  <td className="border border-black px-1 text-right text-black font-mono font-bold">
                                    {formatDim(m.distance, ui.unit)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Cut List */}
                  <div className="w-[55%]">
                    <h2 className="text-xs font-bold text-black border-b border-black pb-1 mb-2 uppercase">
                      Lista de Cortes
                    </h2>
                    <div className="space-y-3">
                      {cutList.groups.map((group) => {
                        const stats = calculateStockRequirements(group);

                        return (
                          <div
                            key={group.materialKey}
                            className="break-inside-avoid border border-black p-1"
                          >
                            <div className="bg-black text-white px-1 py-0.5 text-[10px] font-bold mb-1 flex justify-between items-center">
                              <span className="truncate max-w-[70%]">
                                {group.name}
                              </span>
                              <span>{stats.barsNeeded} barra(s)</span>
                            </div>

                            <table className="w-full border-collapse text-[9px]">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="border border-black px-1 text-center text-black">
                                    #
                                  </th>
                                  <th className="border border-black px-1 text-right text-black">
                                    L
                                  </th>
                                  <th className="border border-black px-1 text-center text-black">
                                    Cant
                                  </th>
                                  <th className="border border-black px-1 text-right text-black">
                                    Tot
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.cuts.map((cut, idx) => (
                                  <tr key={idx}>
                                    <td className="border border-black px-1 text-center text-black">
                                      {idx + 1}
                                    </td>
                                    <td className="border border-black px-1 text-right font-bold text-black">
                                      {formatDim(cut.length, ui.unit)}
                                    </td>
                                    <td className="border border-black px-1 text-center text-black">
                                      {cut.quantity}
                                    </td>
                                    <td className="border border-black px-1 text-right text-black">
                                      {formatDim(
                                        cut.length * cut.quantity,
                                        ui.unit,
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div className="flex justify-end gap-2 text-[9px] text-black mt-0.5 font-bold">
                              <span>
                                Desp: {stats.wastePercentage.toFixed(0)}%
                              </span>
                              <span>Costo: ₡{stats.totalCost.toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only simplified styles for react-to-print content */}
      <style jsx global>{`
        /* Minimal print styles */
        @media print {
          @page {
            size: auto;
            margin: 5mm;
          }

          body {
            margin: 0;
            padding: 0;
          }

          /* Ensure table borders print */
          table,
          th,
          td {
            border: 1px solid #000 !important;
          }

          /* Ensure backgrounds print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Columns */
          .columns-2 {
            column-count: 2;
            column-gap: 1rem;
          }

          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
