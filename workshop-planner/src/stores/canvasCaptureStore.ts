import { atom } from "nanostores";

export interface CanvasCaptureStore {
  captureCanvas: ((hideGrid?: boolean) => Promise<string>) | null;
}

export const $canvasCapture = atom<CanvasCaptureStore>({
  captureCanvas: null,
});

export const setCanvasCaptureFunction = (
  fn: ((hideGrid?: boolean) => Promise<string>) | null,
) => {
  $canvasCapture.set({ captureCanvas: fn });
};
