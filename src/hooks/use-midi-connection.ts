"use client";

// Re-export from the shared context provider so all callers get a single
// MIDI connection instance instead of independent per-component state atoms.
export { useMidiConnection } from "@/providers/midi-connection-provider";
