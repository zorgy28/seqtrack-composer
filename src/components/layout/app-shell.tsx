"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ProjectProvider } from "@/providers/project-provider";
import { MidiConnectionProvider } from "@/providers/midi-connection-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudioMonitor } from "@/components/editor/audio-monitor";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MidiConnectionProvider>
    <ProjectProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto">{children}</main>
            <AudioMonitor />
          </div>
        </div>
      </TooltipProvider>
    </ProjectProvider>
    </MidiConnectionProvider>
  );
}
