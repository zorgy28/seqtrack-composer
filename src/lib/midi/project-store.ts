import type { Project } from "./types";

const STORAGE_KEY = "seqtrack-projects";

interface ProjectListItem {
  id: string;
  name: string;
  bpm: number;
  updatedAt: string;
}

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

export function saveProject(project: Project): void {
  const data = getStorage();
  data[project.id] = { ...project, updatedAt: new Date().toISOString() };
  setStorage(data);
}

export function loadProject(id: string): Project | null {
  const data = getStorage();
  return data[id] ?? null;
}

export function listProjects(): ProjectListItem[] {
  const data = getStorage();
  return Object.values(data)
    .map((p) => ({
      id: p.id,
      name: p.name,
      bpm: p.bpm,
      updatedAt: p.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteProject(id: string): void {
  const data = getStorage();
  delete data[id];
  setStorage(data);
}

export function duplicateProject(id: string, newName?: string): Project | null {
  const original = loadProject(id);
  if (!original) return null;

  const duplicate: Project = {
    ...structuredClone(original),
    id: crypto.randomUUID(),
    name: newName ?? `${original.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProject(duplicate);
  return duplicate;
}
