"use client";

import { useStore } from "@nanostores/react";
import { $saveStatus, $lastSaved } from "@/stores/projectStore";

export default function SaveIndicator() {
  const saveStatus = useStore($saveStatus);
  const lastSaved = useStore($lastSaved);

  const getStatusText = () => {
    if (saveStatus === "saving") return "Guardando...";
    if (saveStatus === "error") return "Error al guardar";
    if (lastSaved) {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

      if (diff < 60) return "Guardado hace unos segundos";
      if (diff < 3600) return `Guardado hace ${Math.floor(diff / 60)} min`;
      return `Guardado hace ${Math.floor(diff / 3600)} h`;
    }
    return "Guardado";
  };

  const getStatusIcon = () => {
    if (saveStatus === "saving") {
      return (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      );
    }
    if (saveStatus === "error") {
      return (
        <svg
          className="h-4 w-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    return (
      <svg
        className="h-4 w-4 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200">
      {getStatusIcon()}
      <span className="text-xs text-gray-600 font-medium">
        {getStatusText()}
      </span>
    </div>
  );
}
