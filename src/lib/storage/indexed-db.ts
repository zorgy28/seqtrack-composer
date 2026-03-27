// ---------------------------------------------------------------------------
// IndexedDB storage layer — async, non-blocking replacement for localStorage
// ---------------------------------------------------------------------------

import type { Project } from "@/lib/midi/types";

const DB_NAME = "seqtrack-composer";
const DB_VERSION = 1;

const STORE_PROJECTS = "projects";
const STORE_SETTINGS = "settings";

// ---------------------------------------------------------------------------
// Database lifecycle
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function tx(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Project operations
// ---------------------------------------------------------------------------

export async function saveProject(project: Project): Promise<void> {
  const store = await tx(STORE_PROJECTS, "readwrite");
  await idbRequest(store.put(project));
}

export async function loadProject(id: string): Promise<Project | null> {
  const store = await tx(STORE_PROJECTS, "readonly");
  const result = await idbRequest(store.get(id));
  return (result as Project) ?? null;
}

export async function loadAllProjects(): Promise<Project[]> {
  const store = await tx(STORE_PROJECTS, "readonly");
  const result = await idbRequest(store.getAll());
  return result as Project[];
}

export async function deleteProject(id: string): Promise<void> {
  const store = await tx(STORE_PROJECTS, "readwrite");
  await idbRequest(store.delete(id));
}

// ---------------------------------------------------------------------------
// Settings operations (key-value)
// ---------------------------------------------------------------------------

export async function saveSetting(
  key: string,
  value: unknown,
): Promise<void> {
  const store = await tx(STORE_SETTINGS, "readwrite");
  await idbRequest(store.put({ key, value }));
}

export async function loadSetting(key: string): Promise<unknown | null> {
  const store = await tx(STORE_SETTINGS, "readonly");
  const result = await idbRequest(store.get(key));
  return result ? (result as { key: string; value: unknown }).value : null;
}

export async function deleteSetting(key: string): Promise<void> {
  const store = await tx(STORE_SETTINGS, "readwrite");
  await idbRequest(store.delete(key));
}

// ---------------------------------------------------------------------------
// Migration: one-time copy from localStorage → IndexedDB
// ---------------------------------------------------------------------------

const MIGRATION_FLAG = "seqtrack-idb-migrated";

export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  // Already migrated
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  try {
    await openDB();

    // Migrate current project
    const currentProject = localStorage.getItem("seqtrack-current-project");
    if (currentProject) {
      const parsed = JSON.parse(currentProject) as Project;
      if (parsed?.id && parsed?.tracks) {
        await saveProject(parsed);
        // Also save under the special "current" setting key
        await saveSetting("current-project-id", parsed.id);
      }
    }

    // Migrate saved projects
    const savedProjects = localStorage.getItem("seqtrack-projects");
    if (savedProjects) {
      const projects = JSON.parse(savedProjects) as Record<string, Project>;
      for (const project of Object.values(projects)) {
        if (project?.id) {
          await saveProject(project);
        }
      }
    }

    // Migrate settings
    const settings = localStorage.getItem("seqtrack-settings");
    if (settings) {
      await saveSetting("seqtrack-settings", JSON.parse(settings));
    }

    // Mark migration complete
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // Migration failed — will retry next load
  }
}

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

export async function isAvailable(): Promise<boolean> {
  try {
    await openDB();
    return true;
  } catch {
    return false;
  }
}
