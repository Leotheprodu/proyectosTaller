import {
  $workspaceItems,
  $materials,
  $uiStore,
  $guides,
  $measurements,
  $lastSaved,
  $saveStatus,
  GuidePoint,
  Measurement,
} from "@/stores/projectStore";
import { Workpiece, UnitType, MaterialBase } from "@/types/index";

const STORAGE_KEY = "workshop-planner-project";
const STORAGE_VERSION = "1.0.0";

export interface ProjectData {
  version: string;
  timestamp: string;
  workspaceItems: Workpiece[];
  materials: Record<string, MaterialBase>;
  guides: GuidePoint[];
  measurements: Measurement[];
  uiSettings: {
    unit: UnitType;
    zoom: number;
    pan: { x: number; y: number };
    snappingEnabled: boolean;
    activeView: string;
    showDimensions: boolean;
  };
}

export const storageService = {
  /**
   * Saves the current project state to local storage
   */
  saveToLocalStorage(): void {
    try {
      const projectData: ProjectData = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        workspaceItems: $workspaceItems.get(),
        materials: $materials.get(),
        guides: $guides.get(),
        measurements: $measurements.get(),
        uiSettings: {
          unit: $uiStore.get().unit,
          zoom: $uiStore.get().zoom,
          pan: $uiStore.get().pan,
          snappingEnabled: $uiStore.get().snappingEnabled,
          activeView: $uiStore.get().activeView,
          showDimensions: $uiStore.get().showDimensions,
        },
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
      $lastSaved.set(new Date());
      $saveStatus.set("saved");
    } catch (error) {
      console.error("Error saving to local storage:", error);
      $saveStatus.set("error");
    }
  },

  /**
   * Loads the project state from local storage
   */
  loadFromLocalStorage(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return false;

      const projectData: ProjectData = JSON.parse(data);

      // Validate version (future-proofing for migrations)
      if (!projectData.version) {
        console.warn("Project data has no version, skipping load");
        return false;
      }

      // Restore state
      $workspaceItems.set(projectData.workspaceItems || []);
      $materials.set(projectData.materials || {});
      $guides.set(projectData.guides || []);
      $measurements.set(projectData.measurements || []);

      if (projectData.uiSettings) {
        $uiStore.setKey("unit", projectData.uiSettings.unit);
        $uiStore.setKey("zoom", projectData.uiSettings.zoom);
        $uiStore.setKey("pan", projectData.uiSettings.pan);
        $uiStore.setKey(
          "snappingEnabled",
          projectData.uiSettings.snappingEnabled,
        );
        $uiStore.setKey("activeView", projectData.uiSettings.activeView);
        $uiStore.setKey(
          "showDimensions",
          projectData.uiSettings.showDimensions,
        );
      }

      $lastSaved.set(new Date(projectData.timestamp));
      $saveStatus.set("saved");

      return true;
    } catch (error) {
      console.error("Error loading from local storage:", error);
      return false;
    }
  },

  /**
   * Exports the current project as a downloadable JSON file
   */
  exportToFile(fileName?: string): void {
    try {
      const projectData: ProjectData = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        workspaceItems: $workspaceItems.get(),
        materials: $materials.get(),
        guides: $guides.get(),
        measurements: $measurements.get(),
        uiSettings: {
          unit: $uiStore.get().unit,
          zoom: $uiStore.get().zoom,
          pan: $uiStore.get().pan,
          snappingEnabled: $uiStore.get().snappingEnabled,
          activeView: $uiStore.get().activeView,
          showDimensions: $uiStore.get().showDimensions,
        },
      };

      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName
        ? `${fileName}.json`
        : `workshop-project-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to file:", error);
      throw error;
    }
  },

  /**
   * Imports a project from a JSON file
   */
  async importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const projectData: ProjectData = JSON.parse(content);

          // Validate data structure
          if (!projectData.version) {
            throw new Error("Invalid project file: missing version");
          }

          if (
            !projectData.workspaceItems ||
            !Array.isArray(projectData.workspaceItems)
          ) {
            throw new Error("Invalid project file: invalid workspace items");
          }

          // Restore state
          $workspaceItems.set(projectData.workspaceItems);
          $materials.set(projectData.materials || {});
          $guides.set(projectData.guides || []);
          $measurements.set(projectData.measurements || []);

          if (projectData.uiSettings) {
            $uiStore.setKey("unit", projectData.uiSettings.unit);
            $uiStore.setKey("zoom", projectData.uiSettings.zoom);
            $uiStore.setKey("pan", projectData.uiSettings.pan);
            $uiStore.setKey(
              "snappingEnabled",
              projectData.uiSettings.snappingEnabled,
            );
            $uiStore.setKey("activeView", projectData.uiSettings.activeView);
            $uiStore.setKey(
              "showDimensions",
              projectData.uiSettings.showDimensions,
            );
          }

          // Save to local storage
          this.saveToLocalStorage();

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  },

  /**
   * Clears all data from local storage
   */
  clearLocalStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
    $lastSaved.set(null);
    $saveStatus.set("saved");
  },

  /**
   * Checks if there's saved data in local storage
   */
  hasSavedData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },
};
