import { ViewType } from "./projection";

export interface CanvasCapture {
  captureView: (view: ViewType) => Promise<string>;
}

/**
 * Utility to capture the 3D canvas from different views
 * Returns base64 encoded PNG images
 */
export const createCanvasCapture = (
  gl: any,
  controlsRef: any,
): CanvasCapture => {
  return {
    captureView: async (view: ViewType): Promise<string> => {
      return new Promise((resolve) => {
        // Small delay to ensure view has switched
        setTimeout(() => {
          try {
            const canvas = gl.domElement;
            const imageData = canvas.toDataURL("image/png");
            resolve(imageData);
          } catch (error) {
            console.error("Failed to capture canvas:", error);
            resolve("");
          }
        }, 300); // Wait for view transition
      });
    },
  };
};
