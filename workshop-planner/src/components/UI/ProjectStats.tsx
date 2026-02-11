"use client";

import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { $workspaceItems, $materials } from "@/stores/projectStore";
import { Calculator, PieChart, ChevronDown, ChevronUp } from "lucide-react";

export default function ProjectStats() {
  const items = useStore($workspaceItems);
  const [isMinimized, setIsMinimized] = useState(false);

  // Calculate Stats
  // 1. Total Cost: Currently we don't track "which stock" a piece came from in a persistent way
  //    that links back to "inventory purchased".
  //    BUT, for this MVP, we can assume:
  //    We started with X full bars.
  //    Wait, we add "New Material" as a full bar.
  //    When we "Cut" we split it.
  //    So the SUM of all pieces + deleted pieces? No.
  //
  //    Simplified approach for MVP:
  //    We track "Total Stock Added".
  //    Actually, `addMaterial` adds a piece. That piece IS the stock.
  //    So if I add 3 bars of 6m, I have 3 items.
  //    If I cut one, I have 2 items (A and B).
  //    The "Cost" is implied by the volume/length of material present?
  //
  //    Better approach:
  //    When we cut, we preserve the "Original Material ID".
  //    We can sum up the theoretical "purchased" amount?
  //
  //    Let's go with:
  //    Total Active Material Length vs Waste?
  //    Actually, the user wants "How much money am I spending".
  //    If I have 10 pieces on board, did I buy 10 bars? Or 1 bar cut into 10?
  //
  //    Ah, the current logic deletes original and spawns 2 active.
  //    So "Total Length On Canvas" is roughly equal to "Total Purchased" minus "Kerf Loss".
  //
  //    So: Total Cost ~= Sum of (Item Length / Original Length * Price) ?
  //    That's tricky if we don't track 'Original Length' on the workpiece.
  //
  //    Let's add 'originalLength' and 'price' (inherited from MaterialBase) to checks.
  //    Wait, Workpiece extends MaterialBase, so it HAS price and length (original).
  //
  //    So...
  //    If I have a piece: "Tube 6m" ($50).
  //    I cut it into 3m and 2.997m.
  //    The 3m piece says it is "Tube 6m" ($50).
  //    The 2.997m piece says it is "Tube 6m" ($50).
  //    If I sum them up, I get $100. WRONG.
  //
  //    Correct Logic: We need to know how many "Source Bars" we used.
  //    Since we don't track parentage tree yet...
  //    Let's approximate:
  //    Total Material Volume = Sum(CurrentLength).
  //    But price is per bar.
  //
  //    For this specific feature request "Cuanto dinero vamos gastando",
  //    we probably need a separate store for "Purchased Stock" that links to the pieces.
  //
  //    For now, I will display "Total Linear Meters" and "Estimated Cost" based on
  //    (Total Length / Standard Length) * Price. It's an approximation but works if you use full efficiency.
  //
  //    Let's group by Material ID.

  const stats = items.reduce(
    (acc, item) => {
      if (!acc[item.id]) {
        acc[item.id] = {
          name: item.name,
          totalLen: 0,
          stdLen: item.length,
          price: item.price,
          count: 0,
        };
      }
      acc[item.id].totalLen += item.currentLength;
      acc[item.id].count++;
      return acc;
    },
    {} as Record<string, any>,
  );

  let totalCost = 0;

  return (
    <div className="absolute top-4 right-4 z-40 bg-white/70 hover:bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-lg overflow-hidden w-64 max-h-[80vh] transition-all">
      {/* Header with minimize button */}
      <div className="flex items-center justify-between p-4 pb-3 bg-white/50">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <PieChart size={16} /> Resumen del Proyecto
        </h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
          title={isMinimized ? "Expandir" : "Minimizar"}
        >
          {isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <>
          <div
            className="space-y-4 p-4 pt-0 overflow-y-auto"
            style={{ maxHeight: "calc(80vh - 60px)" }}
          >
            {Object.values(stats).map((stat: any) => {
              const barsNeeded = Math.ceil(stat.totalLen / stat.stdLen);
              const totalCostForMaterial = barsNeeded * stat.price;
              totalCost += totalCostForMaterial;

              const totalStockLen = barsNeeded * stat.stdLen;
              const waste = totalStockLen - stat.totalLen;
              const wastePercent = (waste / totalStockLen) * 100;

              return (
                <div
                  key={stat.name}
                  className="border-b border-slate-100 pb-2 last:border-0"
                >
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {stat.name}
                  </p>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Uso: {(stat.totalLen / 1000).toFixed(2)}m</span>
                    <span>₡{totalCostForMaterial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] mt-0.5">
                    <span className="text-blue-600 font-bold">
                      {barsNeeded} barra(s)
                    </span>
                    <span className="text-slate-400">
                      Desp: {wastePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 px-4 pb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">
                Total Est.
              </span>
              <span className="text-lg font-bold text-green-600 flex items-center gap-0.5">
                <span>₡</span>
                {totalCost.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">
              *Costo basado en compra de barras enteras.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
