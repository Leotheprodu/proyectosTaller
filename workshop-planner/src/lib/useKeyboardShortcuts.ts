"use client";

import { useEffect } from "react";
import { $uiStore } from "@/stores/projectStore";
import { projectService } from "@/services/projectService";

/**
 * Custom hook to handle keyboard shortcuts for tool selection and actions
 * 1 = Select
 * 2 = Move
 * 3 = Rotate
 * 4 = Measure
 * Ctrl+C = Copy selection
 * Delete/Supr = Delete selection
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const currentTool = $uiStore.get().activeTool;
      const selectedIds = $uiStore.get().selectedItemIds;

      // Handle Ctrl+Z (Undo)
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        projectService.undo();
        return;
      }

      // Handle Ctrl+Y (Redo)
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        projectService.redo();
        return;
      }

      // Handle Ctrl+C (Copy)
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        if (selectedIds.length > 0) {
          projectService.copySelection();
        }
        return;
      }

      // Handle Delete key
      if (e.key === "Delete") {
        e.preventDefault();
        if (selectedIds.length > 0) {
          selectedIds.forEach((id) => projectService.deleteItem(id));
        }
        return;
      }

      // Handle number keys for tool selection
      let newTool: typeof currentTool | null = null;

      switch (e.key) {
        case "1":
          newTool = "select";
          break;
        case "2":
          newTool = "move";
          break;
        case "3":
          newTool = "rotate";
          break;
        case "4":
          newTool = "measure";
          break;
        default:
          return;
      }

      if (newTool && newTool !== currentTool) {
        // Save previous tool before switching to measure
        if (newTool === "measure" && currentTool !== "measure") {
          $uiStore.setKey("previousTool", currentTool);
        }
        $uiStore.setKey("activeTool", newTool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
