"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/providers/project-provider";
import { saveProject, listProjects, loadProject, deleteProject, type ProjectListItem } from "@/lib/midi/project-store";
import { createEmptyProject } from "@/lib/midi/pattern-generators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ProjectsPage() {
  const { project, setProject } = useProject();
  const [savedProjects, setSavedProjects] = useState<ProjectListItem[]>([]);

  const refreshList = useCallback(async () => {
    setSavedProjects(await listProjects());
  }, []);

  useEffect(() => { refreshList(); }, [refreshList]);

  const handleSave = async () => {
    await saveProject(project);
    await refreshList();
  };

  const handleLoad = async (id: string) => {
    const loaded = await loadProject(id);
    if (loaded) setProject(loaded);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    await refreshList();
  };

  const handleNew = () => {
    setProject(createEmptyProject());
  };

  const handleExportMidi = async () => {
    const { downloadMidi } = await import("@/lib/midi/midi-export");
    downloadMidi(project);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* Current Project */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Current Project</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} title="Save current project">Save</Button>
                <Button size="sm" variant="outline" onClick={handleNew} title="Create a new blank project">New</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={project.name}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                className="bg-background border border-input rounded px-2 py-1 text-sm font-medium flex-1"
              />
              <Badge variant="outline" className="font-mono">{project.bpm} BPM</Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                {project.scaleRoot} {project.scaleName}
              </Badge>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportMidi} title="Download as MIDI file">
                Export .mid
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportJson} title="Export full project backup as JSON">
                Export .json
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {savedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved projects yet. Click Save above.</p>
            ) : (
              <div className="space-y-2">
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div>
                      <span className="text-sm font-medium">{p.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {p.bpm} BPM
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleLoad(p.id)}
                        title="Load this project"
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        onClick={() => handleDelete(p.id)}
                        title="Delete this project"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
