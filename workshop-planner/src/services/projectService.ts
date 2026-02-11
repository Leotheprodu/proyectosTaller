import {
  $workspaceItems,
  $materials,
  $uiStore,
  $history,
  $historyIndex,
  $guides,
  $measurements,
  $saveStatus,
  GuidePoint,
  Measurement,
} from "@/stores/projectStore";
import { Workpiece, UnitType } from "@/types/index";
import { unprojectDelta } from "@/lib/projection";
import { Vector3, Quaternion, Euler } from "three";
import { storageService } from "@/services/storageService";
import { debounce } from "@/lib/debounce";

// Debounced auto-save function
const debouncedSave = debounce(() => {
  $saveStatus.set("saving");
  storageService.saveToLocalStorage();
}, 500);

export const projectService = {
  setActiveView(viewId: string) {
    if ($uiStore.get().activeView !== viewId) {
      $uiStore.setKey("activeView", viewId);
      $uiStore.setKey("selectedItemIds", []); // Deselect on view change
    }
  },

  setUnit(unit: UnitType) {
    $uiStore.setKey("unit", unit);
  },

  toggleSelection(id: string, multi: boolean) {
    const items = $workspaceItems.get();
    const targetItem = items.find((i) => i.instanceId === id);
    if (!targetItem) return;

    // Resolve effective IDs (item + group members)
    const effectiveIds = targetItem.groupId
      ? items
          .filter((i) => i.groupId === targetItem.groupId)
          .map((i) => i.instanceId)
      : [id];

    const current = $uiStore.get().selectedItemIds;

    // Check if the group/item is already "fully" selected (simplification: check first id)
    const isSelected = current.includes(id);

    if (multi) {
      if (isSelected) {
        // Deselect all effective IDs
        $uiStore.setKey(
          "selectedItemIds",
          current.filter((i) => !effectiveIds.includes(i)),
        );
      } else {
        // Add all effective IDs (avoid duplicates)
        const combined = new Set([...current, ...effectiveIds]);
        $uiStore.setKey("selectedItemIds", Array.from(combined));
      }
    } else {
      // Single select: Replace with effective IDs
      $uiStore.setKey("selectedItemIds", effectiveIds);
    }
  },

  clearSelection() {
    $uiStore.setKey("selectedItemIds", []);
  },

  setSelectedItem(id: string | null) {
    if (id === null) {
      $uiStore.setKey("selectedItemIds", []);
    } else {
      const items = $workspaceItems.get();
      const targetItem = items.find((i) => i.instanceId === id);
      if (targetItem) {
        const effectiveIds = targetItem.groupId
          ? items
              .filter((i) => i.groupId === targetItem.groupId)
              .map((i) => i.instanceId)
          : [id];
        $uiStore.setKey("selectedItemIds", effectiveIds);
      }
    }
  },

  setZoom(zoom: number) {
    // Clamp zoom
    const z = Math.max(0.05, Math.min(zoom, 10));
    $uiStore.setKey("zoom", z);
  },

  addMaterial(materialId: string, length?: number, quantity: number = 1) {
    const catalog = $materials.get();
    const material = catalog[materialId];
    if (!material) return;

    const itemsToAdd: Workpiece[] = [];
    const usedLength = length || material.length;

    for (let i = 0; i < quantity; i++) {
      itemsToAdd.push({
        ...material,
        instanceId: crypto.randomUUID(),
        x: i * 50, // Stagger X slightly
        y: 0,
        z: material.thickness / 2,
        currentLength: usedLength,
        axis: "x",
        rotation: 0,
        rx: 0,
        ry: 0,
        rz: 0,
      });
    }

    $workspaceItems.set([...$workspaceItems.get(), ...itemsToAdd]);
    this.snapshot();
    debouncedSave();
  },

  moveItemDelta(id: string, dx: number, dy: number, view: string) {
    const delta = unprojectDelta(dx, dy, view as any);
    const items = $workspaceItems.get();
    const targetItem = items.find((i) => i.instanceId === id);
    if (!targetItem) return;

    const movingIds = targetItem.groupId
      ? items
          .filter((i) => i.groupId === targetItem.groupId)
          .map((i) => i.instanceId)
      : [id];

    const updated = items.map((item) =>
      movingIds.includes(item.instanceId)
        ? {
            ...item,
            x: item.x + delta.x,
            y: item.y + delta.y,
            z: item.z + delta.z,
          }
        : item,
    );
    $workspaceItems.set(updated);
    // this.snapshot(); // moveItemDelta is likely used continuously? If so, handled by caller?
    // Wait, moveItemDelta is used by 2D projections.
    // If it's used on drag end, we should snapshot.
    // Let's assume it's atomic for now or caller handles it.
    // Actually, checking usage: It is used in 2D projection logic which might be deprecated.
    // I will add snapshot just in case it is used atomically.
    this.snapshot();
    debouncedSave();
  },

  groupItems(ids: string[]) {
    const items = $workspaceItems.get();
    const groupId = crypto.randomUUID();

    const updated = items.map((item) => {
      if (ids.includes(item.instanceId)) {
        return { ...item, groupId };
      }
      return item;
    });

    $workspaceItems.set(updated);
    this.snapshot();
    debouncedSave();
    // Keep selection
  },

  ungroupItems(ids: string[]) {
    const items = $workspaceItems.get();

    const updated = items.map((item) => {
      if (ids.includes(item.instanceId)) {
        // Remove groupId to ungroup
        const { groupId, ...rest } = item;
        return rest;
      }
      return item;
    });

    $workspaceItems.set(updated);
    this.snapshot();
    debouncedSave();
    // Keep selection
  },

  updateItemPosition(id: string, x: number, y: number) {
    const items = $workspaceItems.get();
    const updated = items.map((item) =>
      item.instanceId === id ? { ...item, x, y } : item,
    );
    $workspaceItems.set(updated);
    this.snapshot();
    debouncedSave();
  },

  updateItemTransform(
    id: string,
    updates: {
      x: number;
      y: number;
      z: number;
      rx: number;
      ry: number;
      rz: number;
    },
  ) {
    const items = $workspaceItems.get();
    const updated = items.map((item) =>
      item.instanceId === id ? { ...item, ...updates } : item,
    );
    $workspaceItems.set(updated);
    this.snapshot();
    debouncedSave();
  },

  moveSelection(dx: number, dy: number, dz: number) {
    const items = $workspaceItems.get();
    const selectedIds = $uiStore.get().selectedItemIds;
    if (selectedIds.length === 0) return;

    // Resolve Groups: If an item is selected, its whole group moves
    const movingIds = new Set<string>();

    selectedIds.forEach((id) => {
      const item = items.find((i) => i.instanceId === id);
      if (!item) return;

      if (item.groupId) {
        // Add all group members
        items
          .filter((i) => i.groupId === item.groupId)
          .forEach((m) => movingIds.add(m.instanceId));
      } else {
        movingIds.add(id);
      }
    });

    const updated = items.map((item) => {
      if (!movingIds.has(item.instanceId)) return item;
      return {
        ...item,
        x: item.x + dx,
        y: item.y + dy,
        z: item.z + dz,
      };
    });

    $workspaceItems.set(updated);
    // NO SNAPSHOT here. This is used by SelectionGizmo continuously.
    // Snapshot is handled by handleDragEnd in SelectionGizmo.
  },

  copySelection() {
    const items = $workspaceItems.get();
    const selectedIds = $uiStore.get().selectedItemIds;
    if (selectedIds.length === 0) return;

    // 1. Resolve all items to copy (including group members)
    const itemsToCopy = new Set<Workpiece>();

    selectedIds.forEach((id) => {
      const item = items.find((i) => i.instanceId === id);
      if (!item) return;

      if (item.groupId) {
        items
          .filter((i) => i.groupId === item.groupId)
          .forEach((m) => itemsToCopy.add(m));
      } else {
        itemsToCopy.add(item);
      }
    });

    if (itemsToCopy.size === 0) return;

    // 2. Clone and Offset
    const newItems: Workpiece[] = [];
    const newSelection: string[] = [];
    const oldGroupToNewGroup = new Map<string, string>();

    itemsToCopy.forEach((original) => {
      // Handle Group ID mapping
      let newGroupId = undefined;
      if (original.groupId) {
        if (!oldGroupToNewGroup.has(original.groupId)) {
          oldGroupToNewGroup.set(original.groupId, crypto.randomUUID());
        }
        newGroupId = oldGroupToNewGroup.get(original.groupId);
      }

      const newId = crypto.randomUUID();
      newSelection.push(newId);

      newItems.push({
        ...original,
        instanceId: newId,
        groupId: newGroupId,
        x: original.x + 20, // Offset X
        z: original.z + 20, // Offset Y (depth) - keeping it simple for visibility
        // y: original.y, // Keep elevation? Or offset too?
        // Let's offset x and z (plan view) mostly.
      });
    });

    // 3. Update Store
    $workspaceItems.set([...items, ...newItems]);
    $uiStore.setKey("selectedItemIds", newSelection);

    this.snapshot();
    debouncedSave();
  },

  cutItem(
    id: string,
    cutPoint: number,
    kerfWidth: number = 3,
    quantity: number = 1,
  ) {
    const items = $workspaceItems.get();
    const itemIndex = items.findIndex((i) => i.instanceId === id);
    if (itemIndex === -1) return;

    const originalItem = items[itemIndex];

    if (cutPoint <= 0 || cutPoint >= originalItem.currentLength) {
      console.warn("Cut point out of bounds");
      return;
    }

    let remainingLength = originalItem.currentLength;
    const newItems: Workpiece[] = [];

    for (let i = 0; i < quantity; i++) {
      if (remainingLength < cutPoint + (i > 0 ? kerfWidth : 0)) break;

      newItems.push({
        ...originalItem,
        instanceId: crypto.randomUUID(),
        currentLength: cutPoint,
        x: originalItem.x,
        y: originalItem.y + i * 50,
        z: originalItem.z,
        axis: originalItem.axis,
      });

      remainingLength -= cutPoint + kerfWidth;
    }

    // Remainder
    if (remainingLength >= 10) {
      newItems.push({
        ...originalItem,
        instanceId: crypto.randomUUID(),
        currentLength: remainingLength,
        x: originalItem.x + cutPoint + kerfWidth + 20, // Shift X
        y: originalItem.y,
        z: originalItem.z,
        axis: originalItem.axis,
      });
    }

    const updatedList = [...items];
    updatedList.splice(itemIndex, 1, ...newItems);

    $workspaceItems.set(updatedList);

    if ($uiStore.get().selectedItemIds.includes(id)) {
      $uiStore.setKey("selectedItemIds", []);
    }
    this.snapshot();
    debouncedSave();
  },

  deleteItem(id: string) {
    const items = $workspaceItems.get();
    const updated = items.filter((i) => i.instanceId !== id);
    $workspaceItems.set(updated);
    if ($uiStore.get().selectedItemIds.includes(id)) {
      $uiStore.setKey(
        "selectedItemIds",
        $uiStore.get().selectedItemIds.filter((i) => i !== id),
      );
    }
    this.snapshot();
    debouncedSave();
  },

  rotateSelection3D(qx: number, qy: number, qz: number, qw: number) {
    const items = $workspaceItems.get();
    const selectedIds = $uiStore.get().selectedItemIds;
    if (selectedIds.length === 0) return;

    // 1. Identify moving items
    const movingItems = items.filter(
      (i) =>
        selectedIds.includes(i.instanceId) ||
        (i.groupId &&
          selectedIds.some((s) => {
            const sItem = items.find((x) => x.instanceId === s);
            return sItem?.groupId === i.groupId;
          })),
    );
    const uniqueMovingItems = Array.from(new Set(movingItems));
    if (uniqueMovingItems.length === 0) return;

    // 2. Calculate Centroid
    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    uniqueMovingItems.forEach((i) => {
      sumX += i.x;
      sumY += i.z; // 3D Y (Elevation)
      sumZ += i.y; // 3D Z (Depth)
    });
    const cx = sumX / uniqueMovingItems.length;
    const cy = sumY / uniqueMovingItems.length;
    const cz = sumZ / uniqueMovingItems.length;

    // Centroid Vector
    const centroid = new Vector3(cx, cy, cz);

    // Rotation Quaternion
    const rotation = new Quaternion(qx, qy, qz, qw);

    // 3. Apply Rotation to each item
    const updated = items.map((item) => {
      if (!uniqueMovingItems.find((i) => i.instanceId === item.instanceId))
        return item;

      // Current Position (Mapped to 3D)
      const pos = new Vector3(item.x, item.z, item.y); // X, Y(Elev), Z(Depth)

      // Relativize to Centroid
      pos.sub(centroid);

      // Apply Rotation to Position
      pos.applyQuaternion(rotation);

      // Add Centroid back
      pos.add(centroid);

      // Update Rotation (Orientation)
      // We need to convert Item Euler (rx, rz, ry) to Quaternion, Apply Rotation, Convert back.
      // Item Rotation Mapping in Workpiece3D:
      // rotX = item.rx
      // rotY = item.rz (The "Floor swivel") -> 3D Y
      // rotZ = item.ry ( The "Roll") -> 3D Z

      const euler = new Euler(
        (item.rx * Math.PI) / 180,
        (item.rz * Math.PI) / 180, // Y
        (item.ry * Math.PI) / 180, // Z
        "XYZ",
      );
      const itemQuat = new Quaternion().setFromEuler(euler);

      // Apply global rotation
      // multiply: a.multiply(b) sets a = a * b.
      // We want new = rotation * old.
      const newQuat = rotation.clone().multiply(itemQuat);

      const newEuler = new Euler().setFromQuaternion(newQuat, "XYZ");

      const r2d = (rad: number) => {
        let deg = (rad * 180) / Math.PI;
        return Math.round(deg * 100) / 100; // Round to 2 decimals to avoid jitter
      };

      return {
        ...item,
        x: pos.x,
        z: pos.y, // Map back 3D Y -> item.z
        y: pos.z, // Map back 3D Z -> item.y
        rx: r2d(newEuler.x),
        rz: r2d(newEuler.y), // Map back 3D Y -> item.rz
        ry: r2d(newEuler.z), // Map back 3D Z -> item.ry
      };
    });

    $workspaceItems.set(updated);
    // NO SNAPSHOT here. Used continuously by Gizmo rotation.
  },

  // --- Undo / Redo Logic ---
  snapshot() {
    const current = $workspaceItems.get();
    const history = $history.get();
    const index = $historyIndex.get();

    // Slice history to current index + 1 (discard future if we branched)
    const newHistory = history.slice(0, index + 1);

    // Push new state
    newHistory.push(current);

    // Limit history size (optional, e.g. 50)
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    $history.set(newHistory);
    $historyIndex.set(newHistory.length - 1);
  },

  undo() {
    const index = $historyIndex.get();
    if (index > 0) {
      const newIndex = index - 1;
      const history = $history.get();
      $workspaceItems.set(history[newIndex]);
      $historyIndex.set(newIndex);
    }
  },

  redo() {
    const index = $historyIndex.get();
    const history = $history.get();
    if (index < history.length - 1) {
      const newIndex = index + 1;
      $workspaceItems.set(history[newIndex]);
      $historyIndex.set(newIndex);
    }
  },

  // Guide management
  addGuide(x: number, z: number, y: number, label?: string) {
    const guides = $guides.get();
    const newGuide: GuidePoint = {
      id: `guide-${Date.now()}-${Math.random()}`,
      x,
      y, // elevation
      z, // depth
      label,
    };
    $guides.set([...guides, newGuide]);
    debouncedSave();
  },

  deleteGuide(id: string) {
    const guides = $guides.get();
    $guides.set(guides.filter((g) => g.id !== id));

    // Check if this guide belongs to any measurement
    const measurements = $measurements.get();
    const affectedMeasurement = measurements.find(
      (m) => m.guideAId === id || m.guideBId === id,
    );

    if (affectedMeasurement) {
      // Check if the other guide still exists
      const otherGuideId =
        affectedMeasurement.guideAId === id
          ? affectedMeasurement.guideBId
          : affectedMeasurement.guideAId;
      const otherGuideExists = guides.some((g) => g.id === otherGuideId);

      if (!otherGuideExists) {
        // Both guides deleted, remove the measurement
        $measurements.set(
          measurements.filter((m) => m.id !== affectedMeasurement.id),
        );
      }
      // If other guide still exists, measurement stays but can be updated
    }
    debouncedSave();
  },

  clearGuides() {
    $guides.set([]);
    debouncedSave();
  },

  // Measurement management
  addMeasurement(
    pointA: { x: number; y: number; z: number },
    pointB: { x: number; y: number; z: number },
  ) {
    // Calculate distance
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const dz = pointB.z - pointA.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Create guides first to get their IDs
    const guides = $guides.get();
    const guideA: GuidePoint = {
      id: `guide-${Date.now()}-${Math.random()}`,
      x: pointA.x,
      y: pointA.y, // elevation
      z: pointA.z, // depth
      label: "A",
    };
    const guideB: GuidePoint = {
      id: `guide-${Date.now() + 1}-${Math.random()}`,
      x: pointB.x,
      y: pointB.y,
      z: pointB.z,
      label: "B",
    };
    $guides.set([...guides, guideA, guideB]);

    const measurement: Measurement = {
      id: `measure-${Date.now()}-${Math.random()}`,
      pointA,
      pointB,
      distance,
      guideAId: guideA.id,
      guideBId: guideB.id,
    };

    const measurements = $measurements.get();
    $measurements.set([...measurements, measurement]);
    debouncedSave();

    // Restore previous tool after completing measurement
    const previousTool = $uiStore.get().previousTool;
    if (previousTool && previousTool !== "measure") {
      $uiStore.setKey("activeTool", previousTool);
      $uiStore.setKey("previousTool", null);
    }

    return measurement.id;
  },

  updateMeasurement(
    id: string,
    pointA: { x: number; y: number; z: number },
    pointB: { x: number; y: number; z: number },
    guideAId: string,
    guideBId: string,
  ) {
    const measurements = $measurements.get();
    const measurement = measurements.find((m) => m.id === id);
    if (!measurement) return;

    // Calculate new distance
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const dz = pointB.z - pointA.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Update the measurement
    $measurements.set(
      measurements.map((m) =>
        m.id === id
          ? { ...m, pointA, pointB, distance, guideAId, guideBId }
          : m,
      ),
    );
    debouncedSave();
  },

  deleteMeasurement(id: string) {
    const measurements = $measurements.get();
    $measurements.set(measurements.filter((m) => m.id !== id));
    debouncedSave();
  },

  clearMeasurements() {
    $measurements.set([]);
    debouncedSave();
  },
};
