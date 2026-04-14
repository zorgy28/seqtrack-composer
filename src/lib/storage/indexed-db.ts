// ---------------------------------------------------------------------------
// IndexedDB storage layer — async, non-blocking replacement for localStorage
// ---------------------------------------------------------------------------

import type { Project } from "@/lib/midi/types";
import type { RecordingSession, RecordingSessionMeta } from "@/lib/recording/types";

const DB_NAME = "seqtrack-composer";
const DB_VERSION = 2;

const STORE_PROJECTS = "projects";
const STORE_SETTINGS = "settings";
const STORE_RECORDING_SESSIONS = "recording-sessions";
const STORE_RECORDING_AUDIO = "recording-audio";

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

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Version 0 → 1: original stores
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      }

      // Version 1 → 2: recording stores
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_RECORDING_SESSIONS)) {
          const sessionStore = db.createObjectStore(STORE_RECORDING_SESSIONS, {
            keyPath: "id",
          });
          sessionStore.createIndex("by-project", "projectId", {
            unique: false,
          });
          sessionStore.createIndex("by-date", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_RECORDING_AUDIO)) {
          db.createObjectStore(STORE_RECORDING_AUDIO, {
            keyPath: "sessionId",
          });
        }
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

function txMulti(
  storeNames: string[],
  mode: IDBTransactionMode,
): Promise<IDBTransaction> {
  return openDB().then((db) => {
    return db.transaction(storeNames, mode);
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
// Recording session operations
// ---------------------------------------------------------------------------

/**
 * Save a recording session (metadata + MIDI events).
 * Audio blob is stored separately via saveRecordingAudio().
 */
export async function saveRecordingSession(
  session: RecordingSession,
): Promise<void> {
  const store = await tx(STORE_RECORDING_SESSIONS, "readwrite");
  await idbRequest(store.put(session));
}

/**
 * Save audio blob for a recording session (stored separately for efficiency).
 */
export async function saveRecordingAudio(
  sessionId: string,
  blob: Blob,
): Promise<void> {
  const store = await tx(STORE_RECORDING_AUDIO, "readwrite");
  await idbRequest(store.put({ sessionId, blob }));
}

/**
 * Save both session data and audio blob in a single call.
 */
export async function saveRecordingSessionWithAudio(
  session: RecordingSession,
  audioBlob: Blob | null,
): Promise<void> {
  await saveRecordingSession(session);
  if (audioBlob) {
    await saveRecordingAudio(session.id, audioBlob);
  }
}

/**
 * Load a recording session (metadata + MIDI events, no audio blob).
 */
export async function loadRecordingSession(
  id: string,
): Promise<RecordingSession | null> {
  const store = await tx(STORE_RECORDING_SESSIONS, "readonly");
  const result = await idbRequest(store.get(id));
  return (result as RecordingSession) ?? null;
}

/**
 * Load the audio blob for a recording session.
 */
export async function loadRecordingAudio(
  sessionId: string,
): Promise<Blob | null> {
  const store = await tx(STORE_RECORDING_AUDIO, "readonly");
  const result = await idbRequest(store.get(sessionId));
  return result ? (result as { sessionId: string; blob: Blob }).blob : null;
}

/**
 * List all recording sessions for a project (metadata only — no MIDI events or audio).
 * Returns sessions sorted by creation date, newest first.
 */
export async function listRecordingSessions(
  projectId?: string,
): Promise<RecordingSessionMeta[]> {
  const store = await tx(STORE_RECORDING_SESSIONS, "readonly");

  const results: RecordingSessionMeta[] = [];

  if (projectId) {
    const index = store.index("by-project");
    const all = await idbRequest(index.getAll(projectId));
    for (const record of all as RecordingSession[]) {
      results.push(sessionToMeta(record));
    }
  } else {
    const all = await idbRequest(store.getAll());
    for (const record of all as RecordingSession[]) {
      results.push(sessionToMeta(record));
    }
  }

  // Sort newest first
  results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return results;
}

/**
 * Delete a recording session and its audio blob.
 */
export async function deleteRecordingSession(id: string): Promise<void> {
  const transaction = await txMulti(
    [STORE_RECORDING_SESSIONS, STORE_RECORDING_AUDIO],
    "readwrite",
  );
  const sessionStore = transaction.objectStore(STORE_RECORDING_SESSIONS);
  const audioStore = transaction.objectStore(STORE_RECORDING_AUDIO);

  sessionStore.delete(id);
  audioStore.delete(id);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Update session metadata (name, markers, etc.) without replacing MIDI events.
 */
export async function updateRecordingSession(
  id: string,
  patch: Partial<RecordingSessionMeta>,
): Promise<void> {
  const store = await tx(STORE_RECORDING_SESSIONS, "readwrite");
  const existing = await idbRequest(store.get(id));
  if (!existing) return;
  await idbRequest(store.put({ ...existing, ...patch, id }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessionToMeta(session: RecordingSession): RecordingSessionMeta {
  return {
    id: session.id,
    projectId: session.projectId,
    name: session.name,
    createdAt: session.createdAt,
    durationMs: session.durationMs,
    bpm: session.bpm,
    midiEventCount: session.midiEventCount,
    hasAudio: session.hasAudio,
    audioFormat: session.audioFormat,
    audioBlobSize: session.audioBlobSize,
  };
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
