"use client";

import { useRef, useEffect, type ReactNode } from "react";
import {
  createProjectStore,
  loadSavedProject,
  enableIdb,
  ProjectStoreContext,
  useProject as useProjectFromStore,
  type ProjectStoreApi,
} from "@/stores/project-store";
import {
  loadProject as idbLoadProject,
  loadSetting,
  migrateFromLocalStorage,
  isAvailable as idbIsAvailable,
} from "@/lib/storage/indexed-db";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ProjectStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createProjectStore(loadSavedProject());
  }

  // On mount: migrate localStorage -> IndexedDB, then hydrate from IDB
  useEffect(() => {
    let cancelled = false;
    const store = storeRef.current;

    async function init() {
      const available = await idbIsAvailable();
      if (!available || cancelled) return;

      await migrateFromLocalStorage();
      enableIdb();

      const currentId = (await loadSetting("current-project-id")) as string | null;
      if (currentId && !cancelled) {
        const idbProject = await idbLoadProject(currentId);
        if (idbProject && !cancelled && store) {
          store.getState()._hydrateFromIdb(idbProject);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <ProjectStoreContext.Provider value={storeRef.current}>
      {children}
    </ProjectStoreContext.Provider>
  );
}

// Re-export the backward-compatible hook so existing imports keep working
export { useProjectFromStore as useProject };
