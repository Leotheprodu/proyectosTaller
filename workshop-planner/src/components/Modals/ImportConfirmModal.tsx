"use client";

interface ImportConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  fileName?: string;
}

export default function ImportConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  fileName,
}: ImportConfirmModalProps) {
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
          {/* Warning Icon */}
          <div className="shrink-0">
            <svg
              className="h-10 w-10 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Importar proyecto?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Esta acción reemplazará completamente tu proyecto actual con el
              contenido de:
            </p>
            {fileName && (
              <p className="text-sm font-medium text-gray-800 bg-gray-100 px-3 py-2 rounded-lg mb-4 break-all">
                {fileName}
              </p>
            )}
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ Todos los cambios no guardados se perderán.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
