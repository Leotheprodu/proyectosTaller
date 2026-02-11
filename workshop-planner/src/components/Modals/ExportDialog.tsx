"use client";

interface ExportDialogProps {
  isOpen: boolean;
  onConfirm: (fileName: string) => void;
  onCancel: () => void;
}

export default function ExportDialog({
  isOpen,
  onConfirm,
  onCancel,
}: ExportDialogProps) {
  const [fileName, setFileName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Set default name with current date
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
      setFileName(`proyecto-taller-${dateStr}`);

      // Focus input after a small delay
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileName.trim()) {
      onConfirm(fileName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="shrink-0">
            <svg
              className="h-10 w-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Exportar Proyecto
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Ingresa un nombre para tu archivo de proyecto:
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="nombre-del-proyecto"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se guardará como:{" "}
                  <span className="font-mono font-medium">
                    {fileName || "archivo"}.json
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!fileName.trim()}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Exportar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add React import at the top
import React from "react";
