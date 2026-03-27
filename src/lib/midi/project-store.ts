import type { Project } from "./types";
import {
  saveProject as idbSave,
  loadProject as idbLoad,
  loadAllProjects as idbLoadAll,
  deleteProject as idbDelete,
  isAvailable as idbIsAvailable,
} from "@/lib/storage/indexed-db";

const STORAGE_KEY = "seqtrack-projects";

// ---------------------------------------------------------------------------
// localStorage fallback (sync)
// ---------------------------------------------------------------------------

function getStorage(): Record<string, Project> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStorage(data: Record<string, Project>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Public API — async, IndexedDB-first with localStorage fallback
// ---------------------------------------------------------------------------

export interface ProjectListItem {
  id: string;
  name: string;
  bpm: number;
  updatedAt: string;
}

export async function saveProject(project: Project): Promise<void> {
  const stamped = { ...project, updatedAt: new Date().toISOString() };
  if (await idbIsAvailable()) {
    await idbSave(stamped);
  } else {
    const data = getStorage();
    data[project.id] = stamped;
    setStorage(data);
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  if (await idbIsAvailable()) {
    return idbLoad(id);
  }
  const data = getStorage();
  return data[id] ?? null;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  if (await idbIsAvailable()) {
    const all = await idbLoadAll();
    return all
      .map((p) => ({ id: p.id, name: p.name, bpm: p.bpm, updatedAt: p.updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const data = getStorage();
  return Object.values(data)
    .map((p) => ({ id: p.id, name: p.name, bpm: p.bpm, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(id: string): Promise<void> {
  if (await idbIsAvailable()) {
    await idbDelete(id);
  } else {
    const data = getStorage();
    delete data[id];
    setStorage(data);
  }
}

export async function duplicateProject(id: string, newName?: string): Promise<Project | null> {
  const original = await loadProject(id);
  if (!original) return null;

  const duplicate: Project = {
    ...structuredClone(original),
    id: crypto.randomUUID(),
    name: newName ?? `${original.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveProject(duplicate);
  return duplicate;
}
