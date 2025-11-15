import { useState, useCallback, useEffect, useRef } from "react";
import {
  createWindow,
  applyWindowCutouts,
  updateWindowAnimation,
  toggleWindow,
} from "../utils/createWindow";

export const useWindows = (scene, wallsMesh) => {
  const [windows, setWindows] = useState([]);
  const windowObjectsRef = useRef(new Map());
  const windowsRef = useRef(windows);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  const addWindow = useCallback(
    (position, direction) => {
      if (!scene || !wallsMesh) return null;

      const windowId = `window_${Date.now()}`;
      const windowData = { position, direction, id: windowId };
      const winObj = createWindow(windowData);
      if (!winObj) return null;
      // Register simple validator to avoid overlapping windows
      if (typeof winObj.setValidator === "function") {
        winObj.setValidator((entity, ctx) => {
          if (typeof entity.validatePosition === "function") {
            const okLocal = entity.validatePosition(
              ctx.world,
              ctx.basePosition
            );
            if (!okLocal) return false;
          }
          const others = (windowsRef.current || []).filter(
            (w) => w.id !== entity.userData.id
          );
          for (const ow of others) {
            const dx = ow.position.x - (ctx.basePosition.x || 0);
            const dz = ow.position.z - (ctx.basePosition.z || 0);
            if (Math.hypot(dx, dz) < 2.0) return false;
          }
          return true;
        });
      }
      scene.add(winObj);
      windowObjectsRef.current.set(windowId, winObj);
      setWindows((prev) => [...prev, windowData]);
      return winObj;
    },
    [scene, wallsMesh]
  );

  const removeWindow = useCallback(
    (windowId) => {
      if (!scene) return;
      const winObj = scene.children.find(
        (c) => c.userData.type === "window" && c.userData.id === windowId
      );
      if (winObj) {
        try {
          if (typeof winObj.dispose === "function") winObj.dispose();
        } catch (e) {}
        scene.remove(winObj);
      }
      if (windowObjectsRef.current.has(windowId))
        windowObjectsRef.current.delete(windowId);
      setWindows((prev) => prev.filter((w) => w.id !== windowId));
    },
    [scene]
  );

  const toggleWindowState = useCallback(
    (windowId) => {
      const winObj =
        windowObjectsRef.current.get(windowId) ||
        scene.children.find(
          (c) => c.userData.type === "window" && c.userData.id === windowId
        );
      if (winObj) {
        if (typeof winObj.toggle === "function") {
          try {
            winObj.toggle(false);
          } catch (e) {
            toggleWindow(winObj);
          }
        } else {
          toggleWindow(winObj);
        }
      }
    },
    [scene]
  );

  const updateAnimations = useCallback(() => {
    for (const winObj of windowObjectsRef.current.values()) {
      try {
        if (typeof winObj.updateAnimation === "function")
          winObj.updateAnimation();
        else updateWindowAnimation(winObj);
      } catch (e) {
        console.warn("useWindows: animation error", e);
      }
    }
  }, []);

  const rebuildWalls = useCallback(() => {
    if (!scene || !wallsMesh) return wallsMesh;
    const newWalls = applyWindowCutouts(wallsMesh, windows);
    scene.remove(wallsMesh);
    scene.add(newWalls);
    return newWalls;
  }, [scene, wallsMesh, windows]);

  const clearAllWindows = useCallback(() => {
    if (!scene) return;
    windowObjectsRef.current.forEach((w) => {
      try {
        if (typeof w.dispose === "function") w.dispose();
        scene.remove(w);
      } catch (e) {}
    });
    windowObjectsRef.current.clear();
    setWindows([]);
  }, [scene]);

  // Movement preview and commit for windows (drag UX)
  const previewMoveWindow = useCallback(
    (windowId, newPos) => {
      const winObj =
        windowObjectsRef.current.get(windowId) ||
        scene.children.find(
          (c) => c.userData.type === "window" && c.userData.id === windowId
        );
      if (!winObj) return false;
      try {
        const ok =
          typeof winObj.moveTo === "function"
            ? winObj.moveTo(newPos, {
                validate: false,
                snap: true,
                instant: true,
              })
            : false;
        if (ok) {
          const p = winObj.toInfo().position;
          setWindows((prev) =>
            prev.map((w) => (w.id === windowId ? { ...w, position: p } : w))
          );
        }
        return ok;
      } catch (e) {
        return false;
      }
    },
    [scene]
  );

  const commitMoveWindow = useCallback(
    (windowId, finalPos) => {
      const winObj =
        windowObjectsRef.current.get(windowId) ||
        scene.children.find(
          (c) => c.userData.type === "window" && c.userData.id === windowId
        );
      if (!winObj) return false;
      try {
        const ok =
          typeof winObj.moveTo === "function"
            ? winObj.moveTo(finalPos, {
                validate: true,
                world: { windows: windowsRef.current },
              })
            : false;
        if (ok) {
          const p = winObj.toInfo().position;
          setWindows((prev) =>
            prev.map((w) => (w.id === windowId ? { ...w, position: p } : w))
          );
        } else {
          if (typeof winObj.revertPosition === "function")
            winObj.revertPosition();
        }
        return ok;
      } catch (e) {
        try {
          if (typeof winObj.revertPosition === "function")
            winObj.revertPosition();
        } catch (e) {}
        return false;
      }
    },
    [scene]
  );

  useEffect(() => {
    let id;
    const loop = () => {
      updateAnimations();
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, [updateAnimations]);

  return {
    windows,
    addWindow,
    removeWindow,
    toggleWindowState,
    updateWindowPositionInState: (id, pos) =>
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, position: pos } : w))
      ),
    previewMoveWindow,
    commitMoveWindow,
    rebuildWalls,
    clearAllWindows,
  };
};
