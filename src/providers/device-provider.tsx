"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { DeviceProfile, DeviceId } from "@/lib/devices/types";
import { getDeviceProfile, detectDeviceProfile } from "@/lib/devices/registry";

interface DeviceContextValue {
  /** The active device profile */
  profile: DeviceProfile;
  /** Set the active profile by DeviceId */
  setProfileById: (id: DeviceId) => void;
  /** Auto-detect profile from a MIDI port name */
  autoDetectFromPort: (portName: string) => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  // Default to SEQTRAK for backward compatibility
  const [profile, setProfile] = useState<DeviceProfile>(
    () => getDeviceProfile("seqtrak"),
  );

  const setProfileById = useCallback((id: DeviceId) => {
    setProfile(getDeviceProfile(id));
  }, []);

  const autoDetectFromPort = useCallback((portName: string) => {
    setProfile(detectDeviceProfile(portName));
  }, []);

  return (
    <DeviceContext.Provider value={{ profile, setProfileById, autoDetectFromPort }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDeviceProfile(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDeviceProfile must be used within DeviceProvider");
  return ctx;
}
