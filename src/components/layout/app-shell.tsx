"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ProjectProvider } from "@/providers/project-provider";
import { MidiConnectionProvider } from "@/providers/midi-connection-provider";
import { DeviceProvider } from "@/providers/device-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudioMonitor } from "@/components/editor/audio-monitor";
import { TransportProvider } from "@/providers/transport-provider";
import { TransportBar } from "./transport-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DeviceProvider>
    <MidiConnectionProvider>
    <ProjectProvider>
      <TransportProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto">{children}</main>
            <TransportBar />
            <AudioMonitor />
          </div>
        </div>
      </TooltipProvider>
      </TransportProvider>
    </ProjectProvider>
    </MidiConnectionProvider>
    </DeviceProvider>
  );
}
